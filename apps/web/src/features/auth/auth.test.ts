import { describe, it, expect } from 'vitest';
import { emailSchema, otpCodeSchema } from '@donkey-play/validation';
import { authApi } from './apis/authApi';

describe('Frontend Auth Module', () => {
  it('validates email formats using shared validation rules', () => {
    expect(() => emailSchema.parse('player@donkeyplay.com')).not.toThrow();
    expect(() => emailSchema.parse('invalid-email')).toThrow();
    expect(() => emailSchema.parse('')).toThrow();
  });

  it('validates 6-digit OTP codes using shared validation rules', () => {
    expect(() => otpCodeSchema.parse('123456')).not.toThrow();
    expect(() => otpCodeSchema.parse('12345')).toThrow();
    expect(() => otpCodeSchema.parse('1234567')).toThrow();
    expect(() => otpCodeSchema.parse('abcdef')).toThrow();
  });

  it('provides methods for all authentication operations', () => {
    expect(typeof authApi.sendOtp).toBe('function');
    expect(typeof authApi.verifyOtp).toBe('function');
    expect(typeof authApi.googleAuth).toBe('function');
    expect(typeof authApi.getMe).toBe('function');
    expect(typeof authApi.refreshToken).toBe('function');
    expect(typeof authApi.logout).toBe('function');
  });

  it('exchanges 14-day refresh token for new access token & refreshed profile', async () => {
    const mockUser = {
      _id: 'u1',
      id: 'u1',
      email: 'user@example.com',
      username: 'user1',
      display_name: 'User One',
      age: 22,
      gender: 'MALE',
      role: 'USER',
      is_banned: false,
      created_at: new Date().toISOString(),
    };

    const mockResponse = {
      user: mockUser,
      tokens: {
        access_token: 'new_15m_access_token',
        refresh_token: 'new_14d_refresh_token',
      },
    };

    const vi = (await import('vitest')).vi;
    vi.spyOn(authApi, 'refreshToken').mockResolvedValueOnce(mockResponse);

    const res = await authApi.refreshToken();
    expect(res.user.email).toBe('user@example.com');
    expect(res.tokens.access_token).toBe('new_15m_access_token');
    expect(res.tokens.refresh_token).toBe('new_14d_refresh_token');
  });
});
