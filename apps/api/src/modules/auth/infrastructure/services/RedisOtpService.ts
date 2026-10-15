import crypto from 'crypto';
import { Redis as RedisClient } from 'ioredis';
import { getRedisClient } from '../../../../config/redis';
import {
  InvalidOtpError,
  OtpExpiredError,
  MaxOtpAttemptsExceededError,
  OtpCooldownError,
} from '../../domain/errors/AuthErrors';
import { RateLimitExceededError } from '../../../../common/errors/AppError';

export class RedisOtpService {
  constructor(private readonly redis: RedisClient = getRedisClient()) {}

  public async generateAndStoreOtp(email: string, ip: string): Promise<string> {
    const normalizedEmail = email.toLowerCase().trim();
    const cooldownKey = `ratelimit:otp:email:${normalizedEmail}`;
    const ipKey = `ratelimit:otp:ip:${ip}`;
    const otpKey = `auth:otp:${normalizedEmail}`;

    // 1. Check 60-second email cooldown
    const cooldownTtl = await this.redis.ttl(cooldownKey);
    if (cooldownTtl > 0) {
      throw new OtpCooldownError(cooldownTtl);
    }

    // 2. Check IP rate limit (max 10 requests / hour)
    const ipRequests = await this.redis.incr(ipKey);
    if (ipRequests === 1) {
      await this.redis.expire(ipKey, 3600);
    }
    if (ipRequests > 10) {
      throw new RateLimitExceededError('Too many verification requests from this IP. Please wait.');
    }

    // 3. Generate 6-digit numeric OTP
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');

    // 4. Store in Redis with 5-minute TTL
    await this.redis
      .multi()
      .hset(otpKey, 'hash', otpHash, 'attempts', 0)
      .expire(otpKey, 300)
      .setex(cooldownKey, 60, '1')
      .exec();

    return rawOtp;
  }

  public async verifyOtp(email: string, submittedCode: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    const otpKey = `auth:otp:${normalizedEmail}`;

    const [hash, attemptsStr] = await this.redis.hmget(otpKey, 'hash', 'attempts');

    if (!hash) {
      throw new OtpExpiredError();
    }

    const currentAttempts = parseInt(attemptsStr || '0', 10);
    if (currentAttempts >= 3) {
      await this.redis.del(otpKey);
      throw new MaxOtpAttemptsExceededError();
    }

    const submittedHash = crypto.createHash('sha256').update(submittedCode.trim()).digest('hex');

    const isMatch =
      hash.length === submittedHash.length &&
      crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(submittedHash, 'hex'));

    if (!isMatch) {
      const nextAttempts = await this.redis.hincrby(otpKey, 'attempts', 1);
      const remaining = Math.max(0, 3 - nextAttempts);

      if (remaining === 0) {
        await this.redis.del(otpKey);
        throw new MaxOtpAttemptsExceededError();
      }

      throw new InvalidOtpError('Invalid verification code', { remainingAttempts: remaining });
    }

    // Success: consume OTP immediately
    await this.redis.del(otpKey);
    return true;
  }
}
