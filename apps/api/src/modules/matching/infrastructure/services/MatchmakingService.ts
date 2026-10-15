import Redis from 'ioredis';
import { getRedisClient } from '../../../../config/redis';
import { MatchSession, MatchType } from '../../domain/entities/MatchSession';
import {
  InsufficientCoinsError,
  AlreadyInQueueError,
  MinDurationNotMetError,
  CallSessionNotFoundError,
} from '../../domain/errors/MatchmakingErrors';
import { logger } from '../../../../common/logger';

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

export class MatchmakingService {
  constructor(private readonly redis: Redis = getRedisClient()) {}

  private getQueueKey(filter: 'ANY' | 'MALE' | 'FEMALE'): string {
    if (filter === 'MALE') return 'match:queue:male';
    if (filter === 'FEMALE') return 'match:queue:female';
    return 'match:queue:any';
  }

  public async isUserInQueue(userId: string): Promise<boolean> {
    const [inAny, inMale, inFemale] = await Promise.all([
      this.redis.zscore('match:queue:any', userId),
      this.redis.zscore('match:queue:male', userId),
      this.redis.zscore('match:queue:female', userId),
    ]);
    return inAny !== null || inMale !== null || inFemale !== null;
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

    const queueKey = this.getQueueKey(filter);
    const now = Date.now();

    // Store user metadata for quick matchmaking evaluation
    await this.redis.hmset(`match:user:${userId}`, {
      userId,
      gender: userGender || 'OTHER',
      filter,
      enqueuedAt: now.toString(),
    });
    await this.redis.expire(`match:user:${userId}`, 300);

    // Enqueue user
    await this.redis.zadd(queueKey, now, userId);

    // Attempt instant pairing
    const session = await this.attemptPairing(userId, filter, userGender);
    if (session) {
      return {
        queue: queueKey,
        status: 'PAIRED',
        sessionId: session.id,
        partnerId: session.userA === userId ? session.userB : session.userA,
      };
    }

    return {
      queue: queueKey,
      status: 'SEARCHING',
    };
  }

  public async leaveQueue(userId: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.zrem('match:queue:any', userId);
    pipeline.zrem('match:queue:male', userId);
    pipeline.zrem('match:queue:female', userId);
    pipeline.del(`match:reserved_coin:${userId}`);
    pipeline.del(`match:user:${userId}`);
    await pipeline.exec();
  }

  public async attemptPairing(
    userId: string,
    filter: 'ANY' | 'MALE' | 'FEMALE',
    userGender: string
  ): Promise<MatchSession | null> {
    // Determine candidate queues to inspect
    const queuesToInspect: string[] = [];
    if (userGender === 'MALE') {
      queuesToInspect.push('match:queue:male');
    } else if (userGender === 'FEMALE') {
      queuesToInspect.push('match:queue:female');
    }
    queuesToInspect.push('match:queue:any');

    let partnerId: string | null = null;
    let partnerQueue: string | null = null;

    for (const qKey of queuesToInspect) {
      const candidates = await this.redis.zrange(qKey, 0, '10');
      for (const candidate of candidates) {
        if (candidate === userId) continue;

        // Check mutual block exclusion
        const [blockedByMe, blockedByThem] = await Promise.all([
          this.redis.sismember(`block:${userId}`, candidate),
          this.redis.sismember(`block:${candidate}`, userId),
        ]);

        if (blockedByMe === 1 || blockedByThem === 1) {
          continue;
        }

        // Check partner filter compatibility if they picked a gender filter
        if (filter !== 'ANY') {
          const partnerMeta = await this.redis.hgetall(`match:user:${candidate}`);
          if (partnerMeta && partnerMeta.gender) {
            if (partnerMeta.gender.toUpperCase() !== filter.toUpperCase()) {
              continue;
            }
          }
        }

        partnerId = candidate;
        partnerQueue = qKey;
        break;
      }

      if (partnerId) break;
    }

    if (!partnerId || !partnerQueue) {
      return null;
    }

    const myQueueKey = this.getQueueKey(filter);

    // Atomically pop both users from queues
    const pipeline = this.redis.pipeline();
    pipeline.zrem(myQueueKey, userId);
    pipeline.zrem(partnerQueue, partnerId);
    await pipeline.exec();

    // Determine match type
    const matchType: MatchType = filter !== 'ANY' ? 'GENDER_FILTER_PAID' : 'RANDOM_FREE';
    const chargedUserId = filter !== 'ANY' ? userId : undefined;

    const session = MatchSession.create(userId, partnerId, matchType, chargedUserId);

    // Write session to Redis (TTL 2 hours)
    const sessionKey = `match:session:${session.id}`;
    await this.redis.hmset(sessionKey, session.toJSON() as Record<string, string>);
    await this.redis.expire(sessionKey, 7200);

    // Set 10-second minimum call lock
    await this.redis.setex(`call:timer:${session.id}`, 10, 'LOCKED');

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

    const startedAt = new Date(sessionData.startedAt as string || Date.now());
    const durationSeconds = Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000));

    // Update session status in Redis
    await this.redis.hmset(`match:session:${sessionId}`, {
      status: 'ENDED',
      endedAt: new Date().toISOString(),
      durationSeconds: durationSeconds.toString(),
    });

    // Cleanup timer lock
    await this.redis.del(`call:timer:${sessionId}`);

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
    await this.redis.hmset(`match:session:${sessionId}`, {
      status: 'ACCEPTED',
      acceptedBy: userId,
      acceptedAt: new Date().toISOString(),
    });
    // Ensure 10-second countdown lock starts when video call begins
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
    return {
      sessionId,
      status: 'CANCELLED',
    };
  }
}
