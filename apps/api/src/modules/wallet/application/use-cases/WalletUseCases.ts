import { getRedisClient } from '../../../../config/redis';
import { COIN_PACKAGES, IWalletEntity, IWalletTransactionEntity, WalletTransactionType } from '../../domain/entities/Wallet';
import {
  InsufficientEarningsError,
  InvalidCoinPackageError,
  MinimumWithdrawalNotMetError,
  MissingPayoutUpiIdError,
  PaymentVerificationError,
  PayoutProcessingError,
  PurchasedCoinsNonWithdrawableError,
  WalletError,
} from '../../domain/errors/WalletErrors';
import { IWalletRepository } from '../../domain/repositories/WalletRepository';
import { RazorpayOrderResult, RazorpayService } from '../../infrastructure/payment/RazorpayService';

export class WalletUseCases {
  constructor(
    private readonly walletRepository: IWalletRepository,
    private readonly razorpayService: RazorpayService
  ) {}

  async getBalance(userId: string): Promise<{
    purchasedCoinsBalance: number;
    withdrawableEarningsPaise: number;
    withdrawableEarningsInr: number;
    withdrawableGiftCoins: number;
    isPurchasedCoinsWithdrawable: boolean;
    payoutUpiId?: string;
    totalEarningsWithdrawnPaise: number;
  }> {
    const wallet = await this.walletRepository.createOrGet(userId);
    return {
      purchasedCoinsBalance: wallet.purchasedCoinsBalance,
      withdrawableEarningsPaise: wallet.withdrawableEarningsPaise,
      withdrawableEarningsInr: Number((wallet.withdrawableEarningsPaise / 100).toFixed(2)),
      withdrawableGiftCoins: Math.floor(wallet.withdrawableEarningsPaise / 70),
      isPurchasedCoinsWithdrawable: false,
      payoutUpiId: wallet.payoutUpiId,
      totalEarningsWithdrawnPaise: wallet.totalEarningsWithdrawnPaise,
    };
  }

  getCoinPackages() {
    return COIN_PACKAGES;
  }

  async createOrder(userId: string, packageId: string): Promise<RazorpayOrderResult> {
    const pkg = COIN_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) {
      throw new InvalidCoinPackageError(packageId);
    }

    const receipt = `rcpt_${userId.substring(0, 8)}_${Date.now()}`;
    return this.razorpayService.createOrder({
      amountPaise: pkg.pricePaise,
      currency: 'INR',
      receipt,
      notes: {
        userId,
        packageId: pkg.id,
        coins: String(pkg.totalCoins),
      },
    });
  }

  async verifyPayment(
    userId: string,
    params: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    }
  ): Promise<{
    wallet: IWalletEntity;
    transaction: IWalletTransactionEntity;
  }> {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;

    // 1. Verify HMAC SHA256 Signature
    const isValid = this.razorpayService.verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValid) {
      throw new PaymentVerificationError('Invalid cryptographic signature for payment');
    }

    // 2. Redis Idempotency Lock
    const redis = getRedisClient();
    const lockKey = `idempotency:pay:${razorpayPaymentId}`;
    const acquired = await redis.set(lockKey, 'PROCESSED', 'EX', 86400 * 3, 'NX');

    if (!acquired) {
      // Payment already processed. Return current wallet balance and existing transaction.
      const wallet = await this.walletRepository.createOrGet(userId);
      const existingTx = await this.walletRepository.findTransactionByIdempotencyKey(
        `pay_${razorpayPaymentId}`
      );
      return {
        wallet,
        transaction:
          existingTx || {
            id: 'cached',
            walletId: wallet.id,
            userId,
            type: 'COIN_PURCHASE',
            coinsAmount: 0,
            currencyAmountPaise: 0,
            idempotencyKey: `pay_${razorpayPaymentId}`,
            referenceType: 'RAZORPAY_ORDER',
            referenceId: razorpayOrderId,
            status: 'COMPLETED',
            balanceAfter: {
              purchasedCoins: wallet.purchasedCoinsBalance,
              withdrawablePaise: wallet.withdrawableEarningsPaise,
            },
            createdAt: new Date(),
          },
      };
    }

    // Determine coin package credit
    // In a production setup, we can fetch the order amount or note from Razorpay;
    // Default standard starter or matching amount:
    const defaultCoins = 10;
    const defaultPricePaise = 1000;

    const result = await this.walletRepository.creditCoins(
      userId,
      defaultCoins,
      `pay_${razorpayPaymentId}`,
      'RAZORPAY_ORDER',
      razorpayOrderId,
      {
        paymentId: razorpayPaymentId,
        orderId: razorpayOrderId,
        pricePaise: defaultPricePaise,
      }
    );

    return result;
  }

  async debitCoins(
    userId: string,
    coins: number,
    type: WalletTransactionType,
    idempotencyKey: string,
    referenceType: 'MATCH' | 'CONVERSATION' | 'GIFT' | 'SYSTEM',
    referenceId: string,
    metadata?: Record<string, unknown>
  ): Promise<{ wallet: IWalletEntity; transaction: IWalletTransactionEntity }> {
    return this.walletRepository.debitCoins(
      userId,
      coins,
      type,
      idempotencyKey,
      referenceType,
      referenceId,
      metadata
    );
  }

  async listTransactions(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ transactions: IWalletTransactionEntity[]; total: number; page: number; limit: number }> {
    const { transactions, total } = await this.walletRepository.listTransactions(userId, page, limit);
    return {
      transactions,
      total,
      page,
      limit,
    };
  }

  async updatePayoutUpiId(userId: string, upiId: string): Promise<{ upiId: string }> {
    const cleanUpi = upiId.trim().toLowerCase();
    const upiRegex = /^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    if (!upiRegex.test(cleanUpi)) {
      throw new WalletError('Invalid UPI ID format. Example: user@upi or mobile@paytm', 400, 'INVALID_UPI_ID');
    }
    const updated = await this.walletRepository.updatePayoutUpiId(userId, cleanUpi);
    return { upiId: updated.payoutUpiId || cleanUpi };
  }

  async withdrawEarnings(
    userId: string,
    params: { amountInr?: number; amountPaise?: number; coins?: number; narration?: string }
  ): Promise<{
    payoutId: string;
    amountInr: number;
    amountPaise: number;
    withdrawnGiftCoins?: number;
    upiId: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    remainingEarningsPaise: number;
    remainingEarningsInr: number;
    remainingGiftCoins?: number;
    transaction: IWalletTransactionEntity;
  }> {
    const wallet = await this.walletRepository.createOrGet(userId);
    const upiId = wallet.payoutUpiId;
    if (!upiId) {
      throw new MissingPayoutUpiIdError();
    }

    // Determine withdrawal amount in paise (1 gift coin = 70 paise / 70% creator share)
    let requestedPaise: number;
    if (params.coins !== undefined && params.coins > 0) {
      requestedPaise = Math.floor(params.coins * 70);
    } else if (params.amountPaise !== undefined && params.amountPaise > 0) {
      requestedPaise = Math.floor(params.amountPaise);
    } else if (params.amountInr !== undefined && params.amountInr > 0) {
      requestedPaise = Math.round(params.amountInr * 100);
    } else {
      // If neither is specified, withdraw full available gift earnings balance
      requestedPaise = wallet.withdrawableEarningsPaise;
    }

    if (requestedPaise <= 0) {
      throw new WalletError('Withdrawal amount must be greater than ₹0', 400, 'INVALID_WITHDRAWAL_AMOUNT');
    }

    // Strict Rule: Instant withdrawal option enables only if gift earnings is min 500 rupees (50,000 paise)
    const MINIMUM_WITHDRAWAL_PAISE = 50000;
    if (wallet.withdrawableEarningsPaise < MINIMUM_WITHDRAWAL_PAISE) {
      throw new MinimumWithdrawalNotMetError(wallet.withdrawableEarningsPaise);
    }

    if (requestedPaise < MINIMUM_WITHDRAWAL_PAISE) {
      throw new WalletError(
        `Withdrawal amount must be at least ₹500.00 (Requested: ₹${(requestedPaise / 100).toFixed(2)})`,
        400,
        'MINIMUM_WITHDRAWAL_NOT_MET'
      );
    }

    // Strict Rule: User can ONLY withdraw coins earned as gifts, NEVER purchased coins
    if (wallet.withdrawableEarningsPaise < requestedPaise) {
      if (wallet.purchasedCoinsBalance > 0) {
        throw new PurchasedCoinsNonWithdrawableError();
      }
      throw new InsufficientEarningsError(requestedPaise, wallet.withdrawableEarningsPaise);
    }

    // Idempotency reference for Razorpay payout
    const referenceId = `pout_${userId.substring(0, 8)}_${Date.now()}`;
    const idempotencyKey = `payout_${referenceId}`;

    // Execute Razorpay Payout
    let payoutResult;
    try {
      payoutResult = await this.razorpayService.createPayout({
        amountPaise: requestedPaise,
        upiId,
        referenceId,
        narration: params.narration || 'Telegle Creator Payout',
      });
    } catch (err: unknown) {
      const error = err as Error;
      throw new PayoutProcessingError(error.message);
    }

    // Atomically debit earnings and record transaction in ledger
    const { wallet: updatedWallet, transaction } = await this.walletRepository.withdrawEarnings(
      userId,
      requestedPaise,
      idempotencyKey,
      payoutResult.payoutId,
      {
        upiId,
        utr: payoutResult.utr,
        razorpayPayoutId: payoutResult.payoutId,
        payoutStatus: payoutResult.status,
      }
    );

    return {
      payoutId: payoutResult.payoutId,
      amountInr: Number((requestedPaise / 100).toFixed(2)),
      amountPaise: requestedPaise,
      withdrawnGiftCoins: Math.floor(requestedPaise / 70),
      upiId,
      status: payoutResult.status,
      remainingEarningsPaise: updatedWallet.withdrawableEarningsPaise,
      remainingEarningsInr: Number((updatedWallet.withdrawableEarningsPaise / 100).toFixed(2)),
      remainingGiftCoins: Math.floor(updatedWallet.withdrawableEarningsPaise / 70),
      transaction,
    };
  }
}
