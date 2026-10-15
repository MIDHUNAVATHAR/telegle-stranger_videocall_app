import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { InMemoryUserRepository } from '../mocks/InMemoryUserRepository';
import { JwtTokenService } from '../../src/modules/auth/infrastructure/services/JwtTokenService';
import { PresenceService } from '../../src/modules/matching/infrastructure/services/PresenceService';
import { MatchmakingService } from '../../src/modules/matching/infrastructure/services/MatchmakingService';
import { User } from '../../src/modules/users/domain/entities/User';
import { getRedisClient } from '../../src/config/redis';

describe('Phase 4: Online Presence and Matchmaking Module', () => {
  let repository: InMemoryUserRepository;
  let tokenService: JwtTokenService;
  let presenceService: PresenceService;
  let matchmakingService: MatchmakingService;
  let app: ReturnType<typeof createApp>;
  let userA: User;
  let userB: User;
  let tokenA: string;
  let tokenB: string;

  beforeEach(async () => {
    const redis = getRedisClient();
    await redis.flushall();

    repository = new InMemoryUserRepository();
    tokenService = new JwtTokenService();
    presenceService = new PresenceService(redis);
    matchmakingService = new MatchmakingService(redis);

    app = createApp({
      userRepository: repository,
      tokenService,
      presenceService,
      matchmakingService,
    });

    userA = User.create({
      email: 'userA@donkeyplay.com',
      username: 'user_a',
      displayName: 'User A',
      age: 20,
      gender: 'MALE',
    });
    userB = User.create({
      email: 'userB@donkeyplay.com',
      username: 'user_b',
      displayName: 'User B',
      age: 21,
      gender: 'FEMALE',
    });

    await repository.save(userA);
    await repository.save(userB);

    tokenA = tokenService.generateTokens(userA).accessToken;
    tokenB = tokenService.generateTokens(userB).accessToken;
  });

  describe('GET /api/v1/matching/presence', () => {
    it('returns exact online users count based on Redis presence cardinality', async () => {
      // 1. Initial count is 0
      const res1 = await request(app).get('/api/v1/matching/presence');
      expect(res1.status).toBe(200);
      expect(res1.body.success).toBe(true);
      expect(res1.body.data.online_count).toBe(0);

      // 2. Record heartbeats for userA and userB
      await presenceService.recordHeartbeat(userA.id);
      await presenceService.recordHeartbeat(userB.id);

      const res2 = await request(app).get('/api/v1/matching/presence');
      expect(res2.status).toBe(200);
      expect(res2.body.data.online_count).toBe(2);

      // 3. User A disconnects
      await presenceService.removeHeartbeat(userA.id);

      const res3 = await request(app).get('/api/v1/matching/presence');
      expect(res3.status).toBe(200);
      expect(res3.body.data.online_count).toBe(1);
    });
  });

  describe('POST /api/v1/matching/queue/join & leave', () => {
    it('allows authenticated user to join and leave the matchmaking queue', async () => {
      // Join free queue
      const joinRes = await request(app)
        .post('/api/v1/matching/queue/join')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ filter: 'ANY' });

      expect(joinRes.status).toBe(200);
      expect(joinRes.body.success).toBe(true);
      expect(joinRes.body.data.status).toBe('SEARCHING');
      expect(joinRes.body.data.queue).toBe('match:queue:any');

      // Attempting to join again triggers 409 ALREADY_IN_QUEUE
      const duplicateRes = await request(app)
        .post('/api/v1/matching/queue/join')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ filter: 'ANY' });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.error.code).toBe('ALREADY_IN_QUEUE');

      // Leave queue
      const leaveRes = await request(app)
        .post('/api/v1/matching/queue/leave')
        .set('Authorization', `Bearer ${tokenA}`)
        .send();

      expect(leaveRes.status).toBe(200);
      expect(leaveRes.body.success).toBe(true);

      // Verify user can re-join after leaving
      const reJoinRes = await request(app)
        .post('/api/v1/matching/queue/join')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ filter: 'ANY' });

      expect(reJoinRes.status).toBe(200);
      expect(reJoinRes.body.data.status).toBe('SEARCHING');
    });
  });

  describe('Matchmaking Pairing & 5-Second Duration Lock', () => {
    it('automatically pairs two compatible users and creates a session with 5s lock', async () => {
      // User A joins queue
      const resA = await request(app)
        .post('/api/v1/matching/queue/join')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ filter: 'ANY' });

      expect(resA.status).toBe(200);
      expect(resA.body.data.status).toBe('SEARCHING');

      // User B joins queue -> Instant pairing triggers!
      const resB = await request(app)
        .post('/api/v1/matching/queue/join')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ filter: 'ANY' });

      expect(resB.status).toBe(200);
      expect(resB.body.data.status).toBe('PAIRED');
      expect(resB.body.data.sessionId).toBeDefined();
      expect(resB.body.data.partnerId).toBe(userA.id);

      const sessionId = resB.body.data.sessionId;

      // Inspect call session info
      const getSessionRes = await request(app)
        .get(`/api/v1/calls/${sessionId}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(getSessionRes.status).toBe(200);
      expect(getSessionRes.body.data.userA).toBe(userB.id);
      expect(getSessionRes.body.data.userB).toBe(userA.id);

      // Attempting to end call immediately must fail with MIN_DURATION_NOT_MET
      const instantEndRes = await request(app)
        .post(`/api/v1/calls/${sessionId}/end`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ emergencyReport: false });

      expect(instantEndRes.status).toBe(400);
      expect(instantEndRes.body.error.code).toBe('MIN_DURATION_NOT_MET');

      // Emergency report bypasses the 5-second minimum duration lock
      const emergencyEndRes = await request(app)
        .post(`/api/v1/calls/${sessionId}/end`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ emergencyReport: true });

      expect(emergencyEndRes.status).toBe(200);
      expect(emergencyEndRes.body.success).toBe(true);
      expect(emergencyEndRes.body.data.sessionId).toBe(sessionId);
    });
  });
});
