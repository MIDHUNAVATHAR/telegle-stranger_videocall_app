import { describe, it, expect, beforeEach } from 'vitest';
import { getRedisClient } from '../../src/config/redis';
import { MatchmakingService } from '../../src/modules/matching/infrastructure/services/MatchmakingService';
import { PresenceService } from '../../src/modules/matching/infrastructure/services/PresenceService';
import { InMemoryUserRepository } from '../mocks/InMemoryUserRepository';
import { MongooseWalletRepository } from '../../src/modules/wallet/infrastructure/persistence/repositories/MongooseWalletRepository';
import { JoinQueueUseCase } from '../../src/modules/matching/application/use-cases/JoinQueueUseCase';
import { User } from '../../src/modules/users/domain/entities/User';
import {
  InsufficientCoinsError,
  AlreadyInQueueError,
  MinDurationNotMetError,
} from '../../src/modules/matching/domain/errors/MatchmakingErrors';

describe('Matchmaking Fairness, Concurrency, and State Machine Audited Tests', () => {
  let redis: ReturnType<typeof getRedisClient>;
  let userRepo: InMemoryUserRepository;
  let walletRepo: MongooseWalletRepository;
  let presenceService: PresenceService;
  let matchmakingService: MatchmakingService;
  let joinQueueUseCase: JoinQueueUseCase;

  beforeEach(async () => {
    redis = getRedisClient();
    await redis.flushall();

    userRepo = new InMemoryUserRepository();
    walletRepo = new MongooseWalletRepository();
    walletRepo.clearInMemoryStore();

    presenceService = new PresenceService(redis);
    matchmakingService = new MatchmakingService(redis, walletRepo);
    joinQueueUseCase = new JoinQueueUseCase(matchmakingService, userRepo, walletRepo);
  });

  const createTestUser = async (
    name: string,
    gender: 'MALE' | 'FEMALE' | 'OTHER',
    coins = 10
  ): Promise<User> => {
    const user = User.create({
      email: `${name.toLowerCase()}@donkeyplay.test`,
      username: name.toLowerCase(),
      displayName: name,
      age: 24,
      gender,
    });
    await userRepo.save(user);

    if (coins > 0) {
      await walletRepo.creditCoins(
        user.id,
        coins,
        `seed_${user.id}_${Date.now()}_${Math.random()}`,
        'SYSTEM',
        'INIT_BALANCE'
      );
    } else {
      await walletRepo.createOrGet(user.id);
    }

    await presenceService.recordHeartbeat(user.id);
    return user;
  };

  // 1. Male -> Female filter
  it('1. Male user with Female filter matches Female user', async () => {
    const male = await createTestUser('Male_1', 'MALE', 5);
    const female = await createTestUser('Female_1', 'FEMALE', 5);

    const resMale = await joinQueueUseCase.execute({ userId: male.id, filter: 'FEMALE' });
    expect(resMale.status).toBe('SEARCHING');

    const resFemale = await joinQueueUseCase.execute({ userId: female.id, filter: 'ANY' });
    expect(resFemale.status).toBe('PAIRED');
    expect(resFemale.partnerId).toBe(male.id);

    const session = await matchmakingService.getCallSession(resFemale.sessionId!);
    expect(session).toBeDefined();
    expect(session?.matchType).toBe('GENDER_FILTER_PAID');
    expect(session?.chargedUserId).toBe(male.id);
  });

  // 2. Female -> Male filter
  it('2. Female user with Male filter matches Male user', async () => {
    const female = await createTestUser('Female_2', 'FEMALE', 5);
    const male = await createTestUser('Male_2', 'MALE', 5);

    const resFemale = await joinQueueUseCase.execute({ userId: female.id, filter: 'MALE' });
    expect(resFemale.status).toBe('SEARCHING');

    const resMale = await joinQueueUseCase.execute({ userId: male.id, filter: 'ANY' });
    expect(resMale.status).toBe('PAIRED');
    expect(resMale.partnerId).toBe(female.id);
  });

  // 3. Male -> Male filter
  it('3. Male user with Male filter matches another Male with Male/ANY filter and excludes Female', async () => {
    const male1 = await createTestUser('Male_A', 'MALE', 5);
    const female = await createTestUser('Female_X', 'FEMALE', 5);
    const male2 = await createTestUser('Male_B', 'MALE', 5);

    await joinQueueUseCase.execute({ userId: male1.id, filter: 'MALE' });

    // Female joins with ANY filter: must NOT pair with Male 1 who specifically requested Male!
    const resFemale = await joinQueueUseCase.execute({ userId: female.id, filter: 'ANY' });
    expect(resFemale.status).toBe('SEARCHING');

    // Male 2 joins with MALE filter: must pair with Male 1!
    const resMale2 = await joinQueueUseCase.execute({ userId: male2.id, filter: 'MALE' });
    expect(resMale2.status).toBe('PAIRED');
    expect(resMale2.partnerId).toBe(male1.id);
  });

  // 4. Female -> Female filter
  it('4. Female user with Female filter matches Female user and excludes Male', async () => {
    const female1 = await createTestUser('Fem_A', 'FEMALE', 5);
    const male = await createTestUser('Male_Y', 'MALE', 5);
    const female2 = await createTestUser('Fem_B', 'FEMALE', 5);

    await joinQueueUseCase.execute({ userId: female1.id, filter: 'FEMALE' });

    // Male joins with ANY filter: must NOT pair with female1
    const resMale = await joinQueueUseCase.execute({ userId: male.id, filter: 'ANY' });
    expect(resMale.status).toBe('SEARCHING');

    // Female 2 joins with FEMALE filter: must pair with female1
    const resFem2 = await joinQueueUseCase.execute({ userId: female2.id, filter: 'FEMALE' });
    expect(resFem2.status).toBe('PAIRED');
    expect(resFem2.partnerId).toBe(female1.id);
  });

  // 5. Both users initiating requests simultaneously
  it('5. Both users initiating requests simultaneously are safely paired without duplication', async () => {
    const userA = await createTestUser('Sim_A', 'MALE', 5);
    const userB = await createTestUser('Sim_B', 'FEMALE', 5);

    const [resA, resB] = await Promise.all([
      joinQueueUseCase.execute({ userId: userA.id, filter: 'FEMALE' }),
      joinQueueUseCase.execute({ userId: userB.id, filter: 'MALE' }),
    ]);

    // One of them is SEARCHING, and the other is PAIRED, or both coordinate to the same session
    const paired = [resA, resB].filter((r) => r.status === 'PAIRED');
    expect(paired.length).toBe(1);
    expect(paired[0].sessionId).toBeDefined();

    const inQueueA = await matchmakingService.isUserInQueue(userA.id);
    const inQueueB = await matchmakingService.isUserInQueue(userB.id);
    expect(inQueueA).toBe(false);
    expect(inQueueB).toBe(false);
  });

  // 6. 1,000 male requests competing for 10 available female candidates (FIFO fairness & invariants)
  it('6. 1,000 male requests competing for 10 female candidates: exactly 10 pairs, earliest queued men served first', async () => {
    const menCount = 1000;
    const womenCount = 10;
    const men: User[] = [];

    // Create 1,000 men and enqueue them sequentially with increasing timestamps
    for (let i = 0; i < menCount; i++) {
      const male = User.create({
        email: `man_${i}@donkeyplay.test`,
        username: `man_${i}`,
        displayName: `Man ${i}`,
        age: 22,
        gender: 'MALE',
      });
      await userRepo.save(male);
      men.push(male);

      const now = 1700000000000 + i * 10;
      await redis.hmset(`match:user:${male.id}`, {
        userId: male.id,
        gender: 'MALE',
        filter: 'FEMALE',
        queueKey: 'match:queue:MALE:FEMALE',
        enqueuedAt: now.toString(),
      });
      await redis.zadd('match:queue:MALE:FEMALE', now, male.id);
      await redis.zadd('match:queue:female', now, male.id);
    }

    const initialQueueCount = await redis.zcard('match:queue:MALE:FEMALE');
    expect(initialQueueCount).toBe(menCount);

    const pairedMenIds: string[] = [];
    const sessions: string[] = [];

    // Now 10 women join sequentially
    for (let j = 0; j < womenCount; j++) {
      const woman = await createTestUser(`Woman_${j}`, 'FEMALE', 5);
      const res = await joinQueueUseCase.execute({ userId: woman.id, filter: 'ANY' });

      expect(res.status).toBe('PAIRED');
      expect(res.partnerId).toBeDefined();
      expect(res.sessionId).toBeDefined();

      pairedMenIds.push(res.partnerId!);
      sessions.push(res.sessionId!);
    }

    // Invariant 1: Exactly 10 unique sessions created
    const uniqueSessions = new Set(sessions);
    expect(uniqueSessions.size).toBe(womenCount);

    // Invariant 2: Exactly 10 unique men paired (no duplicate match)
    const uniqueMen = new Set(pairedMenIds);
    expect(uniqueMen.size).toBe(womenCount);

    // Invariant 3: STRICT FIFO ORDER! The 10 paired men MUST be the earliest queued men (men[0] through men[9])
    for (let k = 0; k < womenCount; k++) {
      expect(pairedMenIds[k]).toBe(men[k].id);
    }

    // Invariant 4: Exactly 990 men remain in the queue
    const remainingQueueCount = await redis.zcard('match:queue:MALE:FEMALE');
    expect(remainingQueueCount).toBe(menCount - womenCount);

    // Invariant 5: The first man in queue is now men[10]
    const nextCandidate = await redis.zrange('match:queue:MALE:FEMALE', 0, 0);
    expect(nextCandidate[0]).toBe(men[10].id);
  });

  // 7. Reverse scenario: 1,000 female requests competing for 10 male candidates
  it('7. Reverse scenario: 1,000 women competing for 10 men: exactly 10 pairs, earliest queued women served first', async () => {
    const womenCount = 1000;
    const menCount = 10;
    const women: User[] = [];

    for (let i = 0; i < womenCount; i++) {
      const female = User.create({
        email: `woman_${i}@donkeyplay.test`,
        username: `woman_${i}`,
        displayName: `Woman ${i}`,
        age: 23,
        gender: 'FEMALE',
      });
      await userRepo.save(female);
      women.push(female);

      const now = 1700000000000 + i * 10;
      await redis.hmset(`match:user:${female.id}`, {
        userId: female.id,
        gender: 'FEMALE',
        filter: 'MALE',
        queueKey: 'match:queue:FEMALE:MALE',
        enqueuedAt: now.toString(),
      });
      await redis.zadd('match:queue:FEMALE:MALE', now, female.id);
      await redis.zadd('match:queue:male', now, female.id);
    }

    const pairedWomenIds: string[] = [];

    for (let j = 0; j < menCount; j++) {
      const man = await createTestUser(`Man_${j}`, 'MALE', 5);
      const res = await joinQueueUseCase.execute({ userId: man.id, filter: 'FEMALE' });

      expect(res.status).toBe('PAIRED');
      pairedWomenIds.push(res.partnerId!);
    }

    expect(pairedWomenIds.length).toBe(menCount);
    for (let k = 0; k < menCount; k++) {
      expect(pairedWomenIds[k]).toBe(women[k].id);
    }

    const remainingCount = await redis.zcard('match:queue:FEMALE:MALE');
    expect(remainingCount).toBe(womenCount - menCount);
  });

  // 8. Candidate reservation concurrency (atomic Lua prevents double-booking)
  it('8. Atomic reservation prevents multiple concurrent workers from reserving the same candidate', async () => {
    const candidate = await createTestUser('TargetCandidate', 'FEMALE', 5);
    await joinQueueUseCase.execute({ userId: candidate.id, filter: 'ANY' });

    // 5 concurrent male workers try to match with the single candidate simultaneously
    const suitors = await Promise.all([
      createTestUser('Suitor_1', 'MALE', 5),
      createTestUser('Suitor_2', 'MALE', 5),
      createTestUser('Suitor_3', 'MALE', 5),
      createTestUser('Suitor_4', 'MALE', 5),
      createTestUser('Suitor_5', 'MALE', 5),
    ]);

    const results = await Promise.all(
      suitors.map((suitor) => joinQueueUseCase.execute({ userId: suitor.id, filter: 'FEMALE' }))
    );

    const paired = results.filter((r) => r.status === 'PAIRED');
    const searching = results.filter((r) => r.status === 'SEARCHING');

    // Invariant: Exactly 1 suitor matched with TargetCandidate; the other 4 remain in queue
    expect(paired.length).toBe(1);
    expect(paired[0].partnerId).toBe(candidate.id);
    expect(searching.length).toBe(4);
  });

  // 9. Duplicate requests
  it('9. Duplicate join queue requests throw AlreadyInQueueError', async () => {
    const user = await createTestUser('DupeUser', 'MALE', 5);
    await joinQueueUseCase.execute({ userId: user.id, filter: 'ANY' });

    await expect(
      joinQueueUseCase.execute({ userId: user.id, filter: 'ANY' })
    ).rejects.toThrow(AlreadyInQueueError);
  });

  // 10. User rejection & offer timeout
  it('10. Rejection and timeout clean up active locks and release coin reservation', async () => {
    const userA = await createTestUser('RejectA', 'MALE', 5);
    const userB = await createTestUser('RejectB', 'FEMALE', 5);

    await joinQueueUseCase.execute({ userId: userA.id, filter: 'FEMALE' });
    const resB = await joinQueueUseCase.execute({ userId: userB.id, filter: 'MALE' });

    const sessionId = resB.sessionId!;
    expect(sessionId).toBeDefined();

    // Verify active session locks exist
    const activeA = await redis.exists(`match:active:${userA.id}`);
    const activeB = await redis.exists(`match:active:${userB.id}`);
    expect(activeA).toBe(1);
    expect(activeB).toBe(1);

    // User B rejects
    const rejectRes = await matchmakingService.rejectMatch(sessionId, userB.id);
    expect(rejectRes.status).toBe('REJECTED');

    // Verify locks cleaned up
    const activeAfterA = await redis.exists(`match:active:${userA.id}`);
    const activeAfterB = await redis.exists(`match:active:${userB.id}`);
    expect(activeAfterA).toBe(0);
    expect(activeAfterB).toBe(0);

    // Verify coin reservation was released
    const reservedCoin = await redis.exists(`match:reserved_coin:${userA.id}`);
    expect(reservedCoin).toBe(0);
  });

  // 11. User cancellation while queued
  it('11. User cancellation while queued removes all Redis queue keys and metadata', async () => {
    const user = await createTestUser('CancelUser', 'MALE', 5);
    await joinQueueUseCase.execute({ userId: user.id, filter: 'FEMALE' });

    expect(await matchmakingService.isUserInQueue(user.id)).toBe(true);

    await matchmakingService.leaveQueue(user.id);

    expect(await matchmakingService.isUserInQueue(user.id)).toBe(false);
    expect(await redis.exists(`match:user:${user.id}`)).toBe(0);
    expect(await redis.exists(`match:reserved_coin:${user.id}`)).toBe(0);
  });

  // 12. Disconnect and reconnect
  it('12. User disconnecting and reconnecting can re-queue and match normally', async () => {
    const user = await createTestUser('ReconnectUser', 'MALE', 5);
    await joinQueueUseCase.execute({ userId: user.id, filter: 'ANY' });

    // Disconnect event
    await matchmakingService.leaveQueue(user.id);
    expect(await matchmakingService.isUserInQueue(user.id)).toBe(false);

    // Reconnect & re-queue
    const res = await joinQueueUseCase.execute({ userId: user.id, filter: 'ANY' });
    expect(res.status).toBe('SEARCHING');

    const partner = await createTestUser('PartnerAfterReconnect', 'FEMALE', 5);
    const pairRes = await joinQueueUseCase.execute({ userId: partner.id, filter: 'ANY' });
    expect(pairRes.status).toBe('PAIRED');
    expect(pairRes.partnerId).toBe(user.id);
  });

  // 13. Stale queue entry eviction
  it('13. Stale queue entries with expired metadata are pruned and skipped', async () => {
    // Inject a dead user into the queue whose metadata expired
    await redis.zadd('match:queue:FEMALE:MALE', Date.now() - 10000, 'dead_user_123');

    const validFemale = await createTestUser('ValidFemale', 'FEMALE', 5);
    await joinQueueUseCase.execute({ userId: validFemale.id, filter: 'MALE' });

    const male = await createTestUser('FreshMale', 'MALE', 5);
    const res = await joinQueueUseCase.execute({ userId: male.id, filter: 'FEMALE' });

    // Must skip dead_user_123 and match ValidFemale!
    expect(res.status).toBe('PAIRED');
    expect(res.partnerId).toBe(validFemale.id);

    // dead_user_123 must be pruned from queue
    const deadInQueue = await redis.zscore('match:queue:FEMALE:MALE', 'dead_user_123');
    expect(deadInQueue).toBeNull();
  });

  // 14. Insufficient coin balance check
  it('14. User with 0 coins is rejected when attempting gender-filtered match', async () => {
    const brokeUser = await createTestUser('BrokeUser', 'MALE', 0);

    await expect(
      joinQueueUseCase.execute({ userId: brokeUser.id, filter: 'FEMALE' })
    ).rejects.toThrow(InsufficientCoinsError);

    // Free match is still permitted with 0 coins
    const freeRes = await joinQueueUseCase.execute({ userId: brokeUser.id, filter: 'ANY' });
    expect(freeRes.status).toBe('SEARCHING');
  });

  // 15. Wallet balance and transaction ledger consistency with duplicate charge prevention
  it('15. Match acceptance debits exactly 1 coin idempotently and updates ledger', async () => {
    const male = await createTestUser('ChargedMale', 'MALE', 10);
    const female = await createTestUser('PartnerFemale', 'FEMALE', 5);

    await joinQueueUseCase.execute({ userId: male.id, filter: 'FEMALE' });
    const res = await joinQueueUseCase.execute({ userId: female.id, filter: 'MALE' });

    const sessionId = res.sessionId!;

    // Initial male balance: 10 coins
    const walletBefore = await walletRepo.findByUserId(male.id);
    expect(walletBefore?.purchasedCoinsBalance).toBe(10);

    // First acceptance by male
    await matchmakingService.acceptMatch(sessionId, male.id);

    const walletAfter = await walletRepo.findByUserId(male.id);
    expect(walletAfter?.purchasedCoinsBalance).toBe(9);

    // Duplicate acceptance call on same session must NOT debit twice
    await matchmakingService.acceptMatch(sessionId, male.id);
    const walletAfterDupe = await walletRepo.findByUserId(male.id);
    expect(walletAfterDupe?.purchasedCoinsBalance).toBe(9);

    // Verify transaction ledger
    const txs = await walletRepo.listTransactions(male.id, 1, 10);
    const debitTx = txs.transactions.find((t) => t.referenceId === sessionId);
    expect(debitTx).toBeDefined();
    expect(debitTx?.type).toBe('GENDER_FILTER_DEBIT');
    expect(Math.abs(debitTx?.coinsAmount || 0)).toBe(1);
  });

  // 16. Mutual block enforcement
  it('16. Users who blocked each other are mutually excluded from matching', async () => {
    const userA = await createTestUser('BlockedA', 'MALE', 5);
    const userB = await createTestUser('BlockedB', 'FEMALE', 5);
    const userC = await createTestUser('CleanC', 'FEMALE', 5);

    // User A blocks User B
    await redis.sadd(`block:${userA.id}`, userB.id);

    await joinQueueUseCase.execute({ userId: userB.id, filter: 'MALE' });
    await joinQueueUseCase.execute({ userId: userC.id, filter: 'MALE' });

    // User A joins: must skip blocked User B and pair with User C!
    const resA = await joinQueueUseCase.execute({ userId: userA.id, filter: 'FEMALE' });
    expect(resA.status).toBe('PAIRED');
    expect(resA.partnerId).toBe(userC.id);
  });

  // 17. 5-Second minimum duration call lock enforcement
  it('17. Enforces 5-second minimum duration lock before call termination unless emergency report', async () => {
    const userA = await createTestUser('CallA', 'MALE', 5);
    const userB = await createTestUser('CallB', 'FEMALE', 5);

    await joinQueueUseCase.execute({ userId: userA.id, filter: 'ANY' });
    const res = await joinQueueUseCase.execute({ userId: userB.id, filter: 'ANY' });
    const sessionId = res.sessionId!;

    // Immediate endCallSession without bypass throws MinDurationNotMetError
    await expect(
      matchmakingService.endCallSession(sessionId, userA.id, false)
    ).rejects.toThrow(MinDurationNotMetError);

    // Emergency report bypass terminates cleanly
    const endRes = await matchmakingService.endCallSession(sessionId, userA.id, true);
    expect(endRes.sessionId).toBe(sessionId);

    const session = await matchmakingService.getCallSession(sessionId);
    expect(session?.status).toBe('ENDED');
  });

  // 18. Match state machine full lifecycle
  it('18. State machine progresses cleanly: QUEUED -> PAIRED -> ACCEPTED -> ENDED', async () => {
    const userA = await createTestUser('LifeA', 'MALE', 5);
    const userB = await createTestUser('LifeB', 'FEMALE', 5);

    // QUEUED
    const resA = await joinQueueUseCase.execute({ userId: userA.id, filter: 'ANY' });
    expect(resA.status).toBe('SEARCHING');

    // PAIRED
    const resB = await joinQueueUseCase.execute({ userId: userB.id, filter: 'ANY' });
    expect(resB.status).toBe('PAIRED');
    const sessionId = resB.sessionId!;

    // ACCEPTED
    await matchmakingService.acceptMatch(sessionId, userA.id);
    let session = await matchmakingService.getCallSession(sessionId);
    expect(session?.status).toBe('ACCEPTED');

    // ENDED (with bypass for test speed)
    await matchmakingService.endCallSession(sessionId, userA.id, true);
    session = await matchmakingService.getCallSession(sessionId);
    expect(session?.status).toBe('ENDED');
  });

  // 19. Post-call 1-minute rematch cooldown
  it('19. Prevents rematching between same users within 1 minute after leaving call, then allows rematch after cooldown', async () => {
    const userA = await createTestUser('CoolA', 'MALE', 5);
    const userB = await createTestUser('CoolB', 'FEMALE', 5);

    // Initial match
    await joinQueueUseCase.execute({ userId: userA.id, filter: 'ANY' });
    const match1 = await joinQueueUseCase.execute({ userId: userB.id, filter: 'ANY' });
    expect(match1.status).toBe('PAIRED');
    const sessionId = match1.sessionId!;

    // Leave/end call session
    await matchmakingService.endCallSession(sessionId, userA.id, true);

    // Immediately try to match again within 1 minute
    const resA = await joinQueueUseCase.execute({ userId: userA.id, filter: 'ANY' });
    expect(resA.status).toBe('SEARCHING');

    // User B joins queue within the 1-minute cooldown window: must NOT pair with User A
    const resB = await joinQueueUseCase.execute({ userId: userB.id, filter: 'ANY' });
    expect(resB.status).toBe('SEARCHING');

    // Simulate 1 minute expiration of cooldown by removing cooldown keys
    await redis.del(`match:cooldown:${userA.id}:${userB.id}`);
    await redis.del(`match:cooldown:${userB.id}:${userA.id}`);

    // User A attempts pairing after 1 minute cooldown expired: pairing succeeds
    const rematched = await matchmakingService.attemptPairing(userA.id, 'ANY', 'MALE');
    expect(rematched).not.toBeNull();
    expect(rematched?.userB).toBe(userB.id);
  });
});
