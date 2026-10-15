import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { InMemoryUserRepository } from '../mocks/InMemoryUserRepository';
import { JwtTokenService } from '../../src/modules/auth/infrastructure/services/JwtTokenService';
import { MongooseConversationRepository } from '../../src/modules/conversations/infrastructure/persistence/repositories/MongooseConversationRepository';
import { UserPreferencesUseCase } from '../../src/modules/users/application/use-cases/UserPreferencesUseCase';
import { User } from '../../src/modules/users/domain/entities/User';
import { Conversation } from '../../src/modules/conversations/domain/entities/Conversation';
import { getRedisClient } from '../../src/config/redis';

describe('Phase 6: In-Call Chat & Messages Inbox Module', () => {
  let userRepo: InMemoryUserRepository;
  let convRepo: MongooseConversationRepository;
  let preferencesUseCase: UserPreferencesUseCase;
  let tokenService: JwtTokenService;
  let app: ReturnType<typeof createApp>;
  let userA: User;
  let userB: User;
  let tokenA: string;
  let tokenB: string;

  beforeEach(async () => {
    const redis = getRedisClient();
    await redis.flushall();

    userRepo = new InMemoryUserRepository();
    convRepo = new MongooseConversationRepository();
    preferencesUseCase = new UserPreferencesUseCase();
    tokenService = new JwtTokenService();

    app = createApp({
      userRepository: userRepo,
      conversationRepository: convRepo,
      tokenService,
    });

    userA = User.create({
      email: 'maya@example.com',
      username: 'maya_art',
      displayName: 'Maya Lin',
      age: 24,
      gender: 'FEMALE',
    });
    userB = User.create({
      email: 'david@example.com',
      username: 'david_dev',
      displayName: 'David K',
      age: 26,
      gender: 'MALE',
    });

    await userRepo.save(userA);
    await userRepo.save(userB);

    tokenA = tokenService.generateTokens(userA).accessToken;
    tokenB = tokenService.generateTokens(userB).accessToken;
  });

  describe('GET /api/v1/conversations & Per-Participant Soft Delete', () => {
    it('lists past video call partners, supports soft deletion for one user, and preserves for partner', async () => {
      // 1. Simulate a completed video call between Maya (User A) and David (User B)
      const conv = Conversation.create(userA.id, userB.id, 'match_session_101');
      await convRepo.save(conv);

      // 2. Maya queries her Messages inbox
      const resA = await request(app)
        .get('/api/v1/conversations')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(resA.status).toBe(200);
      expect(resA.body.success).toBe(true);
      expect(resA.body.data.length).toBe(1);
      expect(resA.body.data[0].partner.id).toBe(userB.id);
      expect(resA.body.data[0].partner.display_name).toBe('David K');

      // 3. David queries his Messages inbox
      const resB = await request(app)
        .get('/api/v1/conversations')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(resB.status).toBe(200);
      expect(resB.body.data[0].partner.id).toBe(userA.id);
      expect(resB.body.data[0].partner.display_name).toBe('Maya Lin');

      // 4. Maya soft-deletes the conversation from her inbox
      const deleteRes = await request(app)
        .delete(`/api/v1/conversations/${conv.id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // 5. Maya's inbox is now empty
      const resAAfterDelete = await request(app)
        .get('/api/v1/conversations')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(resAAfterDelete.body.data.length).toBe(0);

      // 6. David's inbox still retains the conversation (per-participant soft deletion invariant)
      const resBAfterDelete = await request(app)
        .get('/api/v1/conversations')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(resBAfterDelete.body.data.length).toBe(1);
      expect(resBAfterDelete.body.data[0].partner.id).toBe(userA.id);
    });
  });

  describe('POST /api/v1/conversations/:id/call (Direct Call Reconnection)', () => {
    it('initiates direct call when partner allows incoming calls', async () => {
      const conv = Conversation.create(userA.id, userB.id);
      await convRepo.save(conv);

      const res = await request(app)
        .post(`/api/v1/conversations/${conv.id}/call`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('RINGING');
      expect(res.body.data.session_id).toBeDefined();
    });

    it('rejects direct call with 403 when partner disabled incoming calls in preferences', async () => {
      const conv = Conversation.create(userA.id, userB.id);
      await convRepo.save(conv);

      // David turns off direct incoming calls in his preferences
      await preferencesUseCase.updatePreferences(userB.id, {
        allowIncomingCalls: false,
      });

      const res = await request(app)
        .post(`/api/v1/conversations/${conv.id}/call`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('DIRECT_CALL_NOT_ALLOWED');
    });
  });
});
