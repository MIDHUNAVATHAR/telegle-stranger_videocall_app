import { AppError } from '../../../../common/errors/AppError';

export class WalletError extends AppError {
  constructor(message: string, statusCode: number = 400, code: string = 'WALLET_ERROR') {
    super(message, statusCode, code);
    this.name = 'WalletError';
  }
}

export class WalletNotFoundError extends WalletError {
  constructor(userId: string) {
    super(`Wallet not found for user: ${userId}`, 404, 'WALLET_NOT_FOUND');
    this.name = 'WalletNotFoundError';
  }
}

export class InsufficientCoinsError extends WalletError {
  constructor(required: number, available: number) {
    super(
      `Insufficient coins. Required: ${required}, Available: ${available}`,
      402,
      'INSUFFICIENT_COINS'
    );
    this.name = 'InsufficientCoinsError';
  }
}

export class InvalidCoinPackageError extends WalletError {
  constructor(packageId: string) {
    super(`Invalid coin package: ${packageId}`, 400, 'INVALID_COIN_PACKAGE');
    this.name = 'InvalidCoinPackageError';
  }
}

export class PaymentVerificationError extends WalletError {
  constructor(reason: string) {
    super(`Payment verification failed: ${reason}`, 400, 'PAYMENT_VERIFICATION_FAILED');
    this.name = 'PaymentVerificationError';
  }
}
