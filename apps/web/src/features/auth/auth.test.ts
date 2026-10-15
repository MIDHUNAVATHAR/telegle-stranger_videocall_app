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
});
