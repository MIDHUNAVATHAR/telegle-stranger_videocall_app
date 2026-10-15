import { getRedisClient } from '../../../../config/redis';
import { COIN_PACKAGES, IWalletEntity, IWalletTransactionEntity, WalletTransactionType } from '../../domain/entities/Wallet';
import {
  InvalidCoinPackageError,
  PaymentVerificationError,
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
  }> {
    const wallet = await this.walletRepository.createOrGet(userId);
    return {
      purchasedCoinsBalance: wallet.purchasedCoinsBalance,
      withdrawableEarningsPaise: wallet.withdrawableEarningsPaise,
      withdrawableEarningsInr: Number((wallet.withdrawableEarningsPaise / 100).toFixed(2)),
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
}
