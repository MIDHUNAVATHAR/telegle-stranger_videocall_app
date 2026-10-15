import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { getRedisClient } from '../../src/config/redis';
import { JwtTokenService } from '../../src/modules/auth/infrastructure/services/JwtTokenService';
import { User } from '../../src/modules/users/domain/entities/User';
import { InMemoryUserRepository } from '../mocks/InMemoryUserRepository';
import { MongooseModerationRepository } from '../../src/modules/moderation/infrastructure/persistence/repositories/MongooseModerationRepository';

describe('Phase 9: Moderation, Reporting & Abuse Prevention Module', () => {
  let userRepo: InMemoryUserRepository;
  let moderationRepo: MongooseModerationRepository;
  let tokenService: JwtTokenService;
  let app: ReturnType<typeof createApp>;
  let reporterUser: User;
  let targetUser: User;
  let reporterToken: string;
  let targetToken: string;

  beforeEach(async () => {
    const redis = getRedisClient();
    await redis.flushall();

    userRepo = new InMemoryUserRepository();
    moderationRepo = new MongooseModerationRepository();
    tokenService = new JwtTokenService();

    app = createApp({
      userRepository: userRepo,
      moderationRepository: moderationRepo,
      tokenService,
    });

    reporterUser = User.create({
      email: 'reporter@example.com',
      username: 'reporter_rachel',
      displayName: 'Reporter Rachel',
      age: 26,
      gender: 'FEMALE',
    });
    targetUser = User.create({
      email: 'badactor@example.com',
      username: 'bad_actor',
      displayName: 'Bad Actor',
      age: 29,
      gender: 'MALE',
    });

    await userRepo.save(reporterUser);
    await userRepo.save(targetUser);

    reporterToken = tokenService.generateTokens(reporterUser).accessToken;
    targetToken = tokenService.generateTokens(targetUser).accessToken;
  });

  describe('POST /api/v1/moderation/reports & 24h Mutual Block', () => {
    it('should reject reporting self with 400', async () => {
      const res = await request(app)
        .post('/api/v1/moderation/reports')
        .set('Authorization', `Bearer ${reporterToken}`)
        .send({
          targetUserId: reporterUser.id,
          reason: 'HARASSMENT',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_REPORT_SELF');
    });

    it('should accept report, action mutual 24h block, and return report summary', async () => {
      const res = await request(app)
        .post('/api/v1/moderation/reports')
        .set('Authorization', `Bearer ${reporterToken}`)
        .send({
          targetUserId: targetUser.id,
          reason: 'NUDITY_INAPPROPRIATE',
          details: 'User exhibited inappropriate conduct on camera',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.actionTaken).toBe('MUTUAL_BLOCK_24H');
      expect(res.body.data.autoBanned).toBe(false);

      // Verify mutual block is active
      const isBlocked = await moderationRepo.isBlocked(reporterUser.id, targetUser.id);
      expect(isBlocked).toBe(true);
    });
  });

  describe('Automated 24h Ban Rule (5 Unique Reports within Rolling 1 Hour)', () => {
    it('should automatically ban target user on 5th unique report within rolling 1h window', async () => {
      // Create 4 additional distinct reporters
      const additionalReporters: User[] = [];
      const tokens: string[] = [];

      for (let i = 1; i <= 4; i++) {
        const u = User.create({
          email: `unique_reporter_${i}@example.com`,
          username: `reporter_${i}`,
          displayName: `Reporter ${i}`,
          age: 21 + i,
          gender: 'FEMALE',
        });
        await userRepo.save(u);
        additionalReporters.push(u);
        tokens.push(tokenService.generateTokens(u).accessToken);
      }

      // First 4 reports: action is MUTUAL_BLOCK_24H, autoBanned is false
      for (const t of tokens) {
        const res = await request(app)
          .post('/api/v1/moderation/reports')
          .set('Authorization', `Bearer ${t}`)
          .send({
            targetUserId: targetUser.id,
            reason: 'HARASSMENT',
          });
        expect(res.status).toBe(201);
        expect(res.body.data.autoBanned).toBe(false);
      }

      // 5th unique report from reporterUser: threshold reached -> triggers AUTO_BAN_24H
      const finalRes = await request(app)
        .post('/api/v1/moderation/reports')
        .set('Authorization', `Bearer ${reporterToken}`)
        .send({
          targetUserId: targetUser.id,
          reason: 'HARASSMENT',
        });

      expect(finalRes.status).toBe(201);
      expect(finalRes.body.data.autoBanned).toBe(true);
      expect(finalRes.body.data.actionTaken).toBe('AUTO_BAN_24H');

      // Verify target user is banned in persistent repository
      const updatedTarget = await userRepo.findById(targetUser.id);
      expect(updatedTarget).toBeDefined();
      expect(updatedTarget?.isBanned).toBe(true);
      expect(updatedTarget?.bannedUntil).toBeDefined();
    });
  });

  describe('User-Initiated Blocks & Unblock', () => {
    it('should support blocking and unblocking a user', async () => {
      // 1. Reporter blocks target
      const blockRes = await request(app)
        .post('/api/v1/moderation/blocks')
        .set('Authorization', `Bearer ${reporterToken}`)
        .send({ targetUserId: targetUser.id });

      expect(blockRes.status).toBe(201);
      expect(blockRes.body.success).toBe(true);

      // 2. List blocks
      const listRes = await request(app)
        .get('/api/v1/moderation/blocks')
        .set('Authorization', `Bearer ${reporterToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBe(1);
      expect(listRes.body.data[0].blockedUserId).toBe(targetUser.id);

      // 3. Unblock target
      const unblockRes = await request(app)
        .delete(`/api/v1/moderation/blocks/${targetUser.id}`)
        .set('Authorization', `Bearer ${reporterToken}`);

      expect(unblockRes.status).toBe(200);
      expect(unblockRes.body.data.unblocked).toBe(true);

      // 4. Verify blocks list is now empty
      const listAfterRes = await request(app)
        .get('/api/v1/moderation/blocks')
        .set('Authorization', `Bearer ${reporterToken}`);

      expect(listAfterRes.body.data.length).toBe(0);
    });
  });
});
