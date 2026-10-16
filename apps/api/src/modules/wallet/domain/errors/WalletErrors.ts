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

export class InsufficientEarningsError extends WalletError {
  constructor(requiredPaise: number, availablePaise: number) {
    super(
      `Insufficient withdrawable earnings. Requested: ₹${(requiredPaise / 100).toFixed(2)}, Available: ₹${(availablePaise / 100).toFixed(2)}`,
      400,
      'INSUFFICIENT_EARNINGS'
    );
    this.name = 'InsufficientEarningsError';
  }
}

export class MissingPayoutUpiIdError extends WalletError {
  constructor() {
    super('No UPI ID configured for payout. Please save a valid UPI ID first.', 400, 'MISSING_PAYOUT_UPI');
    this.name = 'MissingPayoutUpiIdError';
  }
}

export class PayoutProcessingError extends WalletError {
  constructor(reason: string) {
    super(`Payout processing failed: ${reason}`, 502, 'PAYOUT_PROCESSING_FAILED');
    this.name = 'PayoutProcessingError';
  }
}

export class PurchasedCoinsNonWithdrawableError extends WalletError {
  constructor() {
    super(
      'Purchased coins cannot be withdrawn or converted to cash. Only gift earnings received from other users during video roulette are eligible for withdrawal.',
      400,
      'PURCHASED_COINS_NON_WITHDRAWABLE'
    );
    this.name = 'PurchasedCoinsNonWithdrawableError';
  }
}

export class MinimumWithdrawalNotMetError extends WalletError {
  constructor(currentPaise?: number) {
    const detail = currentPaise !== undefined ? ` Current gift earnings: ₹${(currentPaise / 100).toFixed(2)}` : '';
    super(
      `Instant withdrawal requires a minimum of ₹500 in gift earnings.${detail}`,
      400,
      'MINIMUM_WITHDRAWAL_NOT_MET'
    );
    this.name = 'MinimumWithdrawalNotMetError';
  }
}
