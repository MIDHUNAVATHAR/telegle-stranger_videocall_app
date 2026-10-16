import Redis from 'ioredis';
import { EventEmitter } from 'events';
import { getRedisClient } from '../../../../config/redis';
import { MatchSession, MatchType } from '../../domain/entities/MatchSession';
import {
  InsufficientCoinsError,
  AlreadyInQueueError,
  MinDurationNotMetError,
  CallSessionNotFoundError,
} from '../../domain/errors/MatchmakingErrors';
import { logger } from '../../../../common/logger';
import { IWalletRepository } from '../../../wallet/domain/repositories/WalletRepository';

export interface MatchPartnerProfile {
  id: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  age: number;
  gender: string;
}

export interface JoinQueueResult {
  queue: string;
  status: 'SEARCHING' | 'PAIRED';
  sessionId?: string;
  partnerId?: string;
  partner?: MatchPartnerProfile;
}

const LUA_MATCH_RESERVE = `
local candQueue = KEYS[1]
local myQueue = KEYS[2]
local candId = ARGV[1]
local myId = ARGV[2]

-- 1. Check candidate is still in queue
local candScore = redis.call('ZSCORE', candQueue, candId)
if not candScore then
    return 0
end

-- 2. Check if candidate or requester already in active session
local candActive = redis.call('EXISTS', 'match:active:' .. candId)
local myActive = redis.call('EXISTS', 'match:active:' .. myId)
if candActive == 1 or myActive == 1 then
    return -1
end

-- 3. Check mutual rematch cooldown (1 minute post-call)
local cd1 = redis.call('EXISTS', 'match:cooldown:' .. myId .. ':' .. candId)
local cd2 = redis.call('EXISTS', 'match:cooldown:' .. candId .. ':' .. myId)
if cd1 == 1 or cd2 == 1 then
    return -1
end

-- 4. Pop candidate and requester atomically from queues
redis.call('ZREM', candQueue, candId)
redis.call('ZREM', myQueue, myId)

return 1
`;

export class MatchmakingService extends EventEmitter {
  constructor(
    private readonly redis: Redis = getRedisClient(),
    private readonly walletRepository?: IWalletRepository
  ) {
    super();
  }

  public getQueueKey(filter: 'ANY' | 'MALE' | 'FEMALE'): string {
    if (filter === 'MALE') return 'match:queue:male';
    if (filter === 'FEMALE') return 'match:queue:female';
    return 'match:queue:any';
  }

  public getInternalQueueKey(userGender: string, filter: 'ANY' | 'MALE' | 'FEMALE'): string {
    const gender = (userGender || 'OTHER').toUpperCase();
    const f = (filter || 'ANY').toUpperCase();
    return `match:queue:${gender}:${f}`;
  }

  public getAllQueueKeys(): string[] {
    return [
      'match:queue:MALE:FEMALE',
      'match:queue:MALE:MALE',
      'match:queue:MALE:ANY',
      'match:queue:FEMALE:MALE',
      'match:queue:FEMALE:FEMALE',
      'match:queue:FEMALE:ANY',
      'match:queue:OTHER:MALE',
      'match:queue:OTHER:FEMALE',
      'match:queue:OTHER:ANY',
      'match:queue:any',
      'match:queue:male',
      'match:queue:female',
    ];
  }

  public getCandidateQueueKeys(userGender: string, filter: 'ANY' | 'MALE' | 'FEMALE'): string[] {
    const gender = (userGender || 'OTHER').toUpperCase();
    const f = (filter || 'ANY').toUpperCase();

    if (gender === 'MALE') {
      if (f === 'FEMALE') {
        // Looking for females: check females seeking males first, then females seeking anyone
        return ['match:queue:FEMALE:MALE', 'match:queue:FEMALE:ANY', 'match:queue:female'];
      }
      if (f === 'MALE') {
        return ['match:queue:MALE:MALE', 'match:queue:MALE:ANY'];
      }
      // ANY: prioritize females who want males / anyone, then males who want anyone
      return [
        'match:queue:FEMALE:MALE',
        'match:queue:FEMALE:ANY',
        'match:queue:MALE:MALE',
        'match:queue:MALE:ANY',
        'match:queue:OTHER:MALE',
        'match:queue:OTHER:ANY',
        'match:queue:any',
      ];
    }

    if (gender === 'FEMALE') {
      if (f === 'MALE') {
        // STRICT FIFO FAIRNESS: Men who paid/selected FEMALE filter get FIRST priority!
        return ['match:queue:MALE:FEMALE', 'match:queue:MALE:ANY', 'match:queue:male'];
      }
      if (f === 'FEMALE') {
        return ['match:queue:FEMALE:FEMALE', 'match:queue:FEMALE:ANY'];
      }
      // ANY: Men who selected FEMALE get FIRST priority, then men seeking anyone
      return [
        'match:queue:MALE:FEMALE',
        'match:queue:MALE:ANY',
        'match:queue:FEMALE:FEMALE',
        'match:queue:FEMALE:ANY',
        'match:queue:OTHER:FEMALE',
        'match:queue:OTHER:ANY',
        'match:queue:any',
      ];
    }

    // OTHER gender
    if (f === 'MALE') {
      return ['match:queue:MALE:OTHER', 'match:queue:MALE:ANY'];
    }
    if (f === 'FEMALE') {
      return ['match:queue:FEMALE:OTHER', 'match:queue:FEMALE:ANY'];
    }
    return [
      'match:queue:MALE:ANY',
      'match:queue:FEMALE:ANY',
      'match:queue:OTHER:ANY',
      'match:queue:any',
    ];
  }

  public async isUserInQueue(userId: string): Promise<boolean> {
    const meta = await this.redis.hgetall(`match:user:${userId}`);
    if (meta && meta.queueKey) {
      const score = await this.redis.zscore(meta.queueKey, userId);
      if (score !== null) return true;
    }
    const allQueues = this.getAllQueueKeys();
    for (const q of allQueues) {
      const score = await this.redis.zscore(q, userId);
      if (score !== null) return true;
    }
    return false;
  }

  public async joinQueue(
    userId: string,
    filter: 'ANY' | 'MALE' | 'FEMALE',
    userGender: string,
    coinBalance: number
  ): Promise<JoinQueueResult> {
    const alreadyQueued = await this.isUserInQueue(userId);
    if (alreadyQueued) {
      throw new AlreadyInQueueError();
    }

    // Gender filter costs 1 coin reservation
    if (filter !== 'ANY') {
      if (coinBalance < 1) {
        throw new InsufficientCoinsError('At least 1 coin is required for gender-filtered matchmaking');
      }
      // Hold temporary reservation lock for 60 seconds
      await this.redis.setex(`match:reserved_coin:${userId}`, 60, '1');
    }

    const normGender = (userGender || 'OTHER').toUpperCase();
    const normFilter = (filter || 'ANY').toUpperCase() as 'ANY' | 'MALE' | 'FEMALE';
    const legacyQueueKey = this.getQueueKey(normFilter);
    const internalQueueKey = this.getInternalQueueKey(normGender, normFilter);
    const now = Date.now();

    // Store user metadata for fast evaluation
    await this.redis.hmset(`match:user:${userId}`, {
      userId,
      gender: normGender,
      filter: normFilter,
      queueKey: internalQueueKey,
      enqueuedAt: now.toString(),
    });
    await this.redis.expire(`match:user:${userId}`, 300);

    // Enqueue user in internal queue and legacy queue
    await this.redis.zadd(internalQueueKey, now, userId);
    await this.redis.zadd(legacyQueueKey, now, userId);

    // Attempt instant pairing
    const session = await this.attemptPairing(userId, normFilter, normGender);
    if (session) {
      return {
        queue: legacyQueueKey,
        status: 'PAIRED',
        sessionId: session.id,
        partnerId: session.userA === userId ? session.userB : session.userA,
      };
    }

    return {
      queue: legacyQueueKey,
      status: 'SEARCHING',
    };
  }

  public async leaveQueue(userId: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    const allQueues = this.getAllQueueKeys();
    for (const q of allQueues) {
      pipeline.zrem(q, userId);
    }
    pipeline.del(`match:reserved_coin:${userId}`);
    pipeline.del(`match:user:${userId}`);
    pipeline.del(`match:active:${userId}`);
    await pipeline.exec();
  }

  public async attemptPairing(
    userId: string,
    filter: 'ANY' | 'MALE' | 'FEMALE',
    userGender: string
  ): Promise<MatchSession | null> {
    const normGender = (userGender || 'OTHER').toUpperCase();
    const normFilter = (filter || 'ANY').toUpperCase() as 'ANY' | 'MALE' | 'FEMALE';
    const myQueueKey = this.getInternalQueueKey(normGender, normFilter);
    const myLegacyKey = this.getQueueKey(normFilter);

    const queuesToInspect = this.getCandidateQueueKeys(normGender, normFilter);

    let partnerId: string | null = null;
    let partnerQueue: string | null = null;
    let partnerFilter: string = 'ANY';

    for (const qKey of queuesToInspect) {
      // ZRANGE returns members sorted by score ascending (lowest score = longest waiting)
      const candidates = await this.redis.zrange(qKey, 0, '49');
      for (const candidate of candidates) {
        if (candidate === userId) continue;

        // Check mutual block exclusion and 1-minute post-call rematch cooldown
        const [blockedByMe, blockedByThem, cooldownAB, cooldownBA] = await Promise.all([
          this.redis.sismember(`block:${userId}`, candidate),
          this.redis.sismember(`block:${candidate}`, userId),
          this.redis.exists(`match:cooldown:${userId}:${candidate}`),
          this.redis.exists(`match:cooldown:${candidate}:${userId}`),
        ]);

        if (blockedByMe === 1 || blockedByThem === 1 || cooldownAB === 1 || cooldownBA === 1) {
          continue;
        }

        // Check candidate metadata
        const partnerMeta = await this.redis.hgetall(`match:user:${candidate}`);
        if (!partnerMeta || Object.keys(partnerMeta).length === 0) {
          // Stale queue entry whose metadata expired: clean up from queue
          await this.redis.zrem(qKey, candidate);
          continue;
        }

        const candGender = (partnerMeta.gender || 'OTHER').toUpperCase();
        const candFilter = (partnerMeta.filter || 'ANY').toUpperCase();

        // Mutual filter compatibility check
        if (normFilter !== 'ANY' && candGender !== normFilter) {
          continue;
        }
        if (candFilter !== 'ANY' && candFilter !== normGender) {
          continue;
        }

        // Atomic Lua pop: pops candidate from qKey and requester from myQueueKey
        const popResult = await this.redis.eval(
          LUA_MATCH_RESERVE,
          2,
          qKey,
          myQueueKey,
          candidate,
          userId
        );

        if (popResult !== 1) {
          // Already popped or in active session by concurrent worker
          continue;
        }

        // Successfully and atomically paired
        partnerId = candidate;
        partnerQueue = qKey;
        partnerFilter = candFilter;
        break;
      }

      if (partnerId) break;
    }

    if (!partnerId || !partnerQueue) {
      return null;
    }

    // Also remove from legacy keys if still present
    await this.redis.zrem(myLegacyKey, userId);
    await this.redis.zrem(this.getQueueKey(partnerFilter as 'ANY' | 'MALE' | 'FEMALE'), partnerId);

    // Determine match type and charged users
    const userACharged = normFilter !== 'ANY';
    const userBCharged = partnerFilter !== 'ANY';
    const hasPaidFilter = userACharged || userBCharged;
    const matchType: MatchType = hasPaidFilter ? 'GENDER_FILTER_PAID' : 'RANDOM_FREE';
    const chargedUserId = userACharged ? userId : userBCharged ? partnerId : undefined;

    const session = MatchSession.create(userId, partnerId, matchType, chargedUserId);

    // Write session to Redis (TTL 2 hours)
    const sessionKey = `match:session:${session.id}`;
    const sessionData = session.toJSON();
    const serializedData: Record<string, string> = {
      userAFilter: normFilter,
      userBFilter: partnerFilter,
      [`charged_user_${userId}`]: userACharged ? '1' : '0',
      [`charged_user_${partnerId}`]: userBCharged ? '1' : '0',
      [`debited_user_${userId}`]: '0',
      [`debited_user_${partnerId}`]: '0',
    };
    for (const [k, v] of Object.entries(sessionData)) {
      serializedData[k] = v !== null && v !== undefined ? String(v) : '';
    }

    await this.redis.hmset(sessionKey, serializedData);
    await this.redis.expire(sessionKey, 7200);

    // Atomically clean both users from all queue sets upon successful pairing
    const allQueues = this.getAllQueueKeys();
    const cleanupPipeline = this.redis.pipeline();
    for (const q of allQueues) {
      cleanupPipeline.zrem(q, userId);
      cleanupPipeline.zrem(q, partnerId);
    }
    cleanupPipeline.del(`match:user:${userId}`);
    cleanupPipeline.del(`match:user:${partnerId}`);
    await cleanupPipeline.exec();

    // Mark both users active in this session
    await this.redis.setex(`match:active:${userId}`, 7200, session.id);
    await this.redis.setex(`match:active:${partnerId}`, 7200, session.id);

    // Set 10-second minimum call lock
    await this.redis.setex(`call:timer:${session.id}`, 10, 'LOCKED');

    // Publish match event via Redis Pub/Sub for cross-worker / WebSocket notification
    const eventPayload = JSON.stringify({
      event: 'MATCH_FOUND',
      sessionId: session.id,
      userA: userId,
      userB: partnerId,
      matchType,
      chargedUserId,
    });
    await this.redis.publish('match:events', eventPayload).catch(() => {});
    this.emit('match_found', {
      sessionId: session.id,
      userA: userId,
      userB: partnerId,
      matchType,
      chargedUserId,
    });

    logger.info(`Match created: session=${session.id} between ${userId} and ${partnerId}`);
    return session;
  }

  public async getCallSession(sessionId: string): Promise<Record<string, unknown> | null> {
    const sessionKey = `match:session:${sessionId}`;
    const data = await this.redis.hgetall(sessionKey);
    if (!data || Object.keys(data).length === 0) {
      return null;
    }
    return data;
  }

  public async createDirectCallSession(callerId: string, partnerId: string, conversationId?: string): Promise<Record<string, unknown>> {
    const sessionId = `call_direct_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sessionKey = `match:session:${sessionId}`;
    const sessionData: Record<string, string> = {
      id: sessionId,
      userA: callerId,
      userB: partnerId,
      matchType: 'DIRECT',
      status: 'RINGING',
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    if (conversationId) {
      sessionData.conversationId = conversationId;
    }
    await this.redis.hmset(sessionKey, sessionData);
    await this.redis.expire(sessionKey, 60);

    // Track ringing state for both caller and partner (60s TTL)
    await this.redis.setex(`match:direct_ringing:${callerId}`, 60, sessionId);
    await this.redis.setex(`match:direct_ringing:${partnerId}`, 60, sessionId);

    return sessionData;
  }

  public async activateDirectCallSession(sessionId: string, callerId: string, partnerId: string): Promise<void> {
    const sessionKey = `match:session:${sessionId}`;
    await this.redis.hset(sessionKey, 'status', 'ACTIVE');
    await this.redis.hset(sessionKey, 'startedAt', new Date().toISOString());
    await this.redis.expire(sessionKey, 7200);

    // Clean up ringing keys since call is now connected/active
    await this.redis.del(`match:direct_ringing:${callerId}`);
    await this.redis.del(`match:direct_ringing:${partnerId}`);

    await this.redis.setex(`match:active:${callerId}`, 7200, sessionId);
    await this.redis.setex(`match:active:${partnerId}`, 7200, sessionId);
    await this.redis.setex(`call:timer:${sessionId}`, 10, 'LOCKED');
  }

  public async cancelDirectCallSession(sessionId: string, callerId?: string, partnerId?: string): Promise<void> {
    const sessionKey = `match:session:${sessionId}`;
    await this.redis.del(sessionKey);
    if (callerId) {
      await this.redis.del(`match:active:${callerId}`);
      await this.redis.del(`match:direct_ringing:${callerId}`);
    }
    if (partnerId) {
      await this.redis.del(`match:active:${partnerId}`);
      await this.redis.del(`match:direct_ringing:${partnerId}`);
    }
  }

  public async getRingingDirectCallSession(userId: string): Promise<Record<string, unknown> | null> {
    const sessionId = await this.redis.get(`match:direct_ringing:${userId}`);
    if (!sessionId) return null;
    const session = await this.getCallSession(sessionId);
    if (!session || session.status !== 'RINGING') {
      await this.redis.del(`match:direct_ringing:${userId}`);
      return null;
    }
    return session;
  }

  public async getActiveSessionId(userId: string): Promise<string | null> {
    const sessionId = await this.redis.get(`match:active:${userId}`);
    if (!sessionId) return null;

    const session = await this.getCallSession(sessionId);
    if (!session || session.status === 'ENDED' || session.status === 'CANCELLED' || session.status === 'REJECTED') {
      await this.redis.del(`match:active:${userId}`);
      return null;
    }
    return sessionId;
  }

  public async endCallSession(
    sessionId: string,
    userId: string,
    bypassMinDuration = false
  ): Promise<{ durationSeconds: number; sessionId: string }> {
    const sessionData = await this.getCallSession(sessionId);
    if (!sessionData) {
      throw new CallSessionNotFoundError(sessionId);
    }

    // Check 5-second minimum duration lock
    if (!bypassMinDuration) {
      const isLocked = await this.redis.exists(`call:timer:${sessionId}`);
      if (isLocked === 1) {
        throw new MinDurationNotMetError();
      }
    }

    const startedAt = new Date((sessionData.startedAt as string) || Date.now());
    const durationSeconds = Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000));

    // Update session status in Redis
    await this.redis.hmset(`match:session:${sessionId}`, {
      status: 'ENDED',
      endedAt: new Date().toISOString(),
      durationSeconds: durationSeconds.toString(),
    });

    // Cleanup timer and active session locks
    await this.redis.del(`call:timer:${sessionId}`);
    if (sessionData.userA) await this.redis.del(`match:active:${sessionData.userA}`);
    if (sessionData.userB) await this.redis.del(`match:active:${sessionData.userB}`);

    // Set 1-minute (60 seconds) mutual rematch cooldown so users are not immediately rematched
    const uA = sessionData.userA ? String(sessionData.userA) : null;
    const uB = sessionData.userB ? String(sessionData.userB) : null;
    if (uA && uB) {
      await Promise.all([
        this.redis.setex(`match:cooldown:${uA}:${uB}`, 60, '1'),
        this.redis.setex(`match:cooldown:${uB}:${uA}`, 60, '1'),
      ]);
    }

    return {
      durationSeconds,
      sessionId,
    };
  }

  public async acceptMatch(
    sessionId: string,
    userId: string
  ): Promise<{ sessionId: string; status: string }> {
    const sessionData = await this.getCallSession(sessionId);
    if (!sessionData) {
      throw new CallSessionNotFoundError(sessionId);
    }

    // Debit coin for gender-filtered matchmaking for this accepting user if they had a paid filter
    const shouldDebit = sessionData[`charged_user_${userId}`] === '1' || sessionData.chargedUserId === userId;
    const isAlreadyDebited = sessionData[`debited_user_${userId}`] === '1';

    if (this.walletRepository && shouldDebit && !isAlreadyDebited) {
      const idempotencyKey = `match_coin_${sessionId}_${userId}`;
      try {
        await this.walletRepository.debitCoins(
          userId,
          1,
          'GENDER_FILTER_DEBIT',
          idempotencyKey,
          'MATCH',
          sessionId,
          { sessionId, matchType: sessionData.matchType }
        );
        await this.redis.hset(`match:session:${sessionId}`, `debited_user_${userId}`, '1');
        await this.redis.hset(`match:session:${sessionId}`, 'coinCharged', '1');
        await this.redis.del(`match:reserved_coin:${userId}`);
      } catch (err) {
        logger.error('Failed to debit coin for accepted match', { sessionId, userId, err });
      }
    }

    await this.redis.hmset(`match:session:${sessionId}`, {
      status: 'ACCEPTED',
      acceptedBy: userId,
      acceptedAt: new Date().toISOString(),
    });

    // 10-second countdown lock starts when video call begins
    await this.redis.setex(`call:timer:${sessionId}`, 10, 'LOCKED');
    return {
      sessionId,
      status: 'ACCEPTED',
    };
  }

  public async rejectMatch(
    sessionId: string,
    userId: string
  ): Promise<{ sessionId: string; status: string }> {
    const sessionData = await this.getCallSession(sessionId);
    if (!sessionData) {
      throw new CallSessionNotFoundError(sessionId);
    }
    await this.redis.hmset(`match:session:${sessionId}`, {
      status: 'REJECTED',
      rejectedBy: userId,
      rejectedAt: new Date().toISOString(),
    });
    await this.redis.del(`call:timer:${sessionId}`);

    // Release coin reservations for all participants without debit
    if (sessionData.userA) await this.redis.del(`match:reserved_coin:${sessionData.userA}`);
    if (sessionData.userB) await this.redis.del(`match:reserved_coin:${sessionData.userB}`);
    if (sessionData.chargedUserId) await this.redis.del(`match:reserved_coin:${sessionData.chargedUserId}`);

    if (sessionData.userA) await this.redis.del(`match:active:${sessionData.userA}`);
    if (sessionData.userB) await this.redis.del(`match:active:${sessionData.userB}`);

    // Ensure BOTH participants are completely cleared from all queues and metadata
    if (sessionData.userA) await this.leaveQueue(String(sessionData.userA));
    if (sessionData.userB) await this.leaveQueue(String(sessionData.userB));

    // Set 1-minute (60 seconds) mutual rematch cooldown
    const uA = sessionData.userA ? String(sessionData.userA) : null;
    const uB = sessionData.userB ? String(sessionData.userB) : null;
    if (uA && uB) {
      await Promise.all([
        this.redis.setex(`match:cooldown:${uA}:${uB}`, 60, '1'),
        this.redis.setex(`match:cooldown:${uB}:${uA}`, 60, '1'),
      ]);
    }

    return {
      sessionId,
      status: 'REJECTED',
    };
  }

  public async cancelMatch(
    sessionId: string,
    userId: string
  ): Promise<{ sessionId: string; status: string }> {
    const sessionData = await this.getCallSession(sessionId);
    if (!sessionData) {
      throw new CallSessionNotFoundError(sessionId);
    }
    await this.redis.hmset(`match:session:${sessionId}`, {
      status: 'CANCELLED',
      cancelledBy: userId,
      cancelledAt: new Date().toISOString(),
    });
    await this.redis.del(`call:timer:${sessionId}`);

    // Release coin reservations for all participants without debit
    if (sessionData.userA) await this.redis.del(`match:reserved_coin:${sessionData.userA}`);
    if (sessionData.userB) await this.redis.del(`match:reserved_coin:${sessionData.userB}`);
    if (sessionData.chargedUserId) await this.redis.del(`match:reserved_coin:${sessionData.chargedUserId}`);

    if (sessionData.userA) await this.redis.del(`match:active:${sessionData.userA}`);
    if (sessionData.userB) await this.redis.del(`match:active:${sessionData.userB}`);

    // Ensure BOTH participants are completely cleared from all queues and metadata
    if (sessionData.userA) await this.leaveQueue(String(sessionData.userA));
    if (sessionData.userB) await this.leaveQueue(String(sessionData.userB));

    // Set 1-minute (60 seconds) mutual rematch cooldown
    const uA = sessionData.userA ? String(sessionData.userA) : null;
    const uB = sessionData.userB ? String(sessionData.userB) : null;
    if (uA && uB) {
      await Promise.all([
        this.redis.setex(`match:cooldown:${uA}:${uB}`, 60, '1'),
        this.redis.setex(`match:cooldown:${uB}:${uA}`, 60, '1'),
      ]);
    }

    return {
      sessionId,
      status: 'CANCELLED',
    };
  }
}
