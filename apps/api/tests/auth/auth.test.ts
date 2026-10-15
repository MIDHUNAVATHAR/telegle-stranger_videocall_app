import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { InMemoryUserRepository } from '../mocks/InMemoryUserRepository';
import { RedisOtpService } from '../../src/modules/auth/infrastructure/services/RedisOtpService';
import { JwtTokenService } from '../../src/modules/auth/infrastructure/services/JwtTokenService';
import { User } from '../../src/modules/users/domain/entities/User';
import { getRedisClient } from '../../src/config/redis';

describe('Phase 2: Authentication Module (Email OTP & Google Auth)', () => {
  let repository: InMemoryUserRepository;
  let redis: ReturnType<typeof getRedisClient>;
  let otpService: RedisOtpService;
  let tokenService: JwtTokenService;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    repository = new InMemoryUserRepository();
    redis = getRedisClient();
    await redis.flushall();
    otpService = new RedisOtpService(redis);
    tokenService = new JwtTokenService();

    app = createApp({
      userRepository: repository,
      otpService,
      tokenService,
    });
  });

  describe('POST /api/v1/auth/otp/send', () => {
    it('dispatches OTP for valid email and enforces 60s cooldown', async () => {
      const email = 'alex.morgan@example.com';

      // 1. Send OTP
      const res1 = await request(app)
        .post('/api/v1/auth/otp/send')
        .send({ email });

      expect(res1.status).toBe(200);
      expect(res1.body.success).toBe(true);
      expect(res1.body.data.message).toBe('Verification OTP sent to email');
      expect(res1.body.data.expires_in || res1.body.data.expiresIn).toBe(300);

      // Verify OTP hash stored in Redis
      const storedHash = await redis.hget(`auth:otp:${email}`, 'hash');
      expect(storedHash).toBeTruthy();

      // 2. Immediate second request triggers cooldown 429
      const res2 = await request(app)
        .post('/api/v1/auth/otp/send')
        .send({ email });

      expect(res2.status).toBe(429);
      expect(res2.body.success).toBe(false);
      expect(res2.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('rejects invalid email formats with 400 ValidationError', async () => {
      const res = await request(app)
        .post('/api/v1/auth/otp/send')
        .send({ email: 'not-an-email' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/otp/verify & Auto-Registration', () => {
    it('verifies code, auto-registers brand new user, sets cookies, and prevents replay', async () => {
      const email = 'new.user@example.com';

      // Seed an OTP directly in Redis
      const rawCode = await otpService.generateAndStoreOtp(email, '127.0.0.1');

      // 1. Verify valid OTP
      const verifyRes = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ email, code: rawCode });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.is_new_user).toBe(true);
      expect(verifyRes.body.data.user.email).toBe(email);
      expect(verifyRes.body.data.user.age).toBe(18);

      // Cookies check
      const cookies = verifyRes.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes('dp_access_token='))).toBe(true);
      expect(cookies.some((c) => c.includes('dp_refresh_token='))).toBe(true);

      // 2. Replay attack: reusing the same code must fail with OTP_EXPIRED
      const replayRes = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ email, code: rawCode });

      expect(replayRes.status).toBe(400);
      expect(replayRes.body.error.code).toBe('OTP_EXPIRED');

      // 3. User exists now: verify existing user login does not duplicate user
      await redis.del(`ratelimit:otp:email:${email}`);
      const secondCode = await otpService.generateAndStoreOtp(email, '127.0.0.1');

      const loginRes = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ email, code: secondCode });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.is_new_user).toBe(false);
      expect(loginRes.body.data.user.id).toBe(verifyRes.body.data.user.id);
    });

    it('rejects incorrect OTP and counts down retry attempts up to 3', async () => {
      const email = 'retry.test@example.com';
      await otpService.generateAndStoreOtp(email, '127.0.0.1');

      // Attempt 1: Wrong code
      const res1 = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ email, code: '000000' });

      expect(res1.status).toBe(400);
      expect(res1.body.error.code).toBe('INVALID_OTP');
      expect(res1.body.error.details).toEqual({ remainingAttempts: 2 });

      // Attempt 2: Wrong code
      const res2 = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ email, code: '111111' });

      expect(res2.status).toBe(400);
      expect(res2.body.error.details).toEqual({ remainingAttempts: 1 });

      // Attempt 3: Wrong code exhausts limit
      const res3 = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ email, code: '222222' });

      expect(res3.status).toBe(429);
      expect(res3.body.error.code).toBe('MAX_ATTEMPTS_EXCEEDED');
    });

    it('rejects authentication if user account is banned', async () => {
      const email = 'banned.player@example.com';
      const bannedUser = User.create({ email });
      bannedUser.applyBan(86400); // 24-hour ban
      await repository.save(bannedUser);

      const code = await otpService.generateAndStoreOtp(email, '127.0.0.1');

      const res = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ email, code });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_BANNED');
    });
  });

  describe('POST /api/v1/auth/google', () => {
    it('authenticates Google user and auto-registers if new', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ id_token: 'mock_google_id_token_google.user@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('google.user@example.com');
      expect(res.body.data.is_new_user).toBe(true);

      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies.some((c) => c.includes('dp_access_token='))).toBe(true);
    });
  });

  describe('GET /api/v1/auth/me & Protected Route Authorization', () => {
    it('returns 200 with user profile when access token is provided via cookie or header', async () => {
      const user = User.create({ email: 'authorized@example.com', username: 'auth_user' });
      await repository.save(user);

      const tokens = tokenService.generateTokens(user);

      // Authenticated via cookie
      const cookieRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', [`dp_access_token=${tokens.accessToken}`]);

      expect(cookieRes.status).toBe(200);
      expect(cookieRes.body.success).toBe(true);
      expect(cookieRes.body.data.email).toBe('authorized@example.com');

      // Authenticated via Authorization Bearer header
      const headerRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(headerRes.status).toBe(200);
      expect(headerRes.body.data.email).toBe('authorized@example.com');
    });

    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('clears authentication cookies', async () => {
      const res = await request(app).post('/api/v1/auth/logout');
      expect(res.status).toBe(200);
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies.some((c) => c.includes('dp_access_token=;'))).toBe(true);
    });
  });
});
