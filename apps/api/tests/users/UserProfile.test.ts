import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { InMemoryUserRepository } from '../mocks/InMemoryUserRepository';
import { JwtTokenService } from '../../src/modules/auth/infrastructure/services/JwtTokenService';
import { User } from '../../src/modules/users/domain/entities/User';
import { getRedisClient } from '../../src/config/redis';

describe('Phase 3: User Profiles & Preferences Integration Tests', () => {
  let repository: InMemoryUserRepository;
  let tokenService: JwtTokenService;
  let app: ReturnType<typeof createApp>;
  let testUser: User;
  let authToken: string;

  beforeEach(async () => {
    repository = new InMemoryUserRepository();
    const redis = getRedisClient();
    await redis.flushall();
    tokenService = new JwtTokenService();

    app = createApp({
      userRepository: repository,
      tokenService,
    });

    testUser = User.create({
      email: 'alex.rivera@example.com',
      username: 'alex_rivera',
      displayName: 'Alex Rivera',
      age: 22,
      gender: 'MALE',
    });
    await repository.save(testUser);

    const tokens = tokenService.generateTokens(testUser);
    authToken = tokens.accessToken;
  });

  describe('GET /api/v1/users/me', () => {
    it('returns 200 with current user profile and default preferences', async () => {
      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('alex.rivera@example.com');
      expect(response.body.data.user.display_name).toBe('Alex Rivera');
      expect(response.body.data.user.age).toBe(22);
      expect(response.body.data.preferences).toBeDefined();
      expect(response.body.data.preferences.preferredGender).toBe('ANY');
    });

    it('rejects unauthenticated request with 401 Unauthorized', async () => {
      const response = await request(app).get('/api/v1/users/me');
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('PATCH /api/v1/users/me', () => {
    it('updates profile details successfully', async () => {
      const response = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          display_name: 'Alex R.',
          bio: 'Music producer & gamer',
          gender: 'MALE',
          age: 23,
          avatar_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.display_name).toBe('Alex R.');
      expect(response.body.data.bio).toBe('Music producer & gamer');
      expect(response.body.data.age).toBe(23);
      expect(response.body.data.avatar_url).toBe(
        'https://res.cloudinary.com/demo/image/upload/sample.jpg'
      );
    });

    it('rejects age under 18 with 400 ValidationError', async () => {
      const response = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          age: 17,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/users/me/avatar/sign', () => {
    it('generates Cloudinary signed upload parameters for avatar upload', async () => {
      const response = await request(app)
        .post('/api/v1/users/me/avatar/sign')
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('signature');
      expect(response.body.data).toHaveProperty('apiKey');
      expect(response.body.data).toHaveProperty('cloudName');
      expect(response.body.data.folder).toBe('donkey-play/avatars');
      expect(response.body.data.publicId).toBe(`avatar_${testUser.id}`);
    });
  });

  describe('PATCH /api/v1/users/me/preferences', () => {
    it('updates user preferences successfully', async () => {
      const response = await request(app)
        .patch('/api/v1/users/me/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          preferred_gender: 'FEMALE',
          allow_incoming_calls: false,
          sound_enabled: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.preferredGender).toBe('FEMALE');
      expect(response.body.data.allowIncomingCalls).toBe(false);
      expect(response.body.data.soundEnabled).toBe(true);
    });
  });

  describe('GET /api/v1/users/:id (Public Profile)', () => {
    it('returns sanitized public profile without sensitive fields', async () => {
      const response = await request(app).get(`/api/v1/users/${testUser.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testUser.id);
      expect(response.body.data.display_name).toBe('Alex Rivera');
      expect(response.body.data.email).toBeUndefined();
      expect(response.body.data.role).toBeUndefined();
    });
  });
});
