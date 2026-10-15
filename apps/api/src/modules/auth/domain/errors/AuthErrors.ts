import { AppError } from '../../../../common/errors/AppError';

export class InvalidOtpError extends AppError {
  constructor(message: string = 'Invalid verification code', details?: unknown) {
    super(message, 400, 'INVALID_OTP', details);
  }
}

export class OtpExpiredError extends AppError {
  constructor(message: string = 'Verification code has expired. Please request a new one.', details?: unknown) {
    super(message, 400, 'OTP_EXPIRED', details);
  }
}

export class MaxOtpAttemptsExceededError extends AppError {
  constructor(message: string = 'Maximum verification attempts exceeded. Please request a new code.', details?: unknown) {
    super(message, 429, 'MAX_ATTEMPTS_EXCEEDED', details);
  }
}

export class OtpCooldownError extends AppError {
  constructor(secondsRemaining: number) {
    super(
      `Please wait ${secondsRemaining} seconds before requesting another code`,
      429,
      'RATE_LIMIT_EXCEEDED',
      { secondsRemaining }
    );
  }
}

export class AccountBannedError extends AppError {
  constructor(bannedUntil?: Date | null) {
    super(
      'Your account is temporarily suspended due to community guidelines violations',
      403,
      'FORBIDDEN_BANNED',
      { bannedUntil: bannedUntil ? bannedUntil.toISOString() : null }
    );
  }
}

export class InvalidTokenError extends AppError {
  constructor(message: string = 'Invalid or expired authentication token', details?: unknown) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

export class GoogleAuthError extends AppError {
  constructor(message: string = 'Google authentication failed', details?: unknown) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}
