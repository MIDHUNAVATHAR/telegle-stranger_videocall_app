import { IWalletEntity, IWalletTransactionEntity, WalletTransactionType } from '../entities/Wallet';

export interface IWalletRepository {
  findByUserId(userId: string): Promise<IWalletEntity | null>;
  createOrGet(userId: string): Promise<IWalletEntity>;
  creditCoins(
    userId: string,
    coins: number,
    idempotencyKey: string,
    referenceType: 'RAZORPAY_ORDER' | 'SYSTEM',
    referenceId: string,
    metadata?: Record<string, unknown>
  ): Promise<{ wallet: IWalletEntity; transaction: IWalletTransactionEntity }>;
  debitCoins(
    userId: string,
    coins: number,
    type: WalletTransactionType,
    idempotencyKey: string,
    referenceType: 'MATCH' | 'CONVERSATION' | 'GIFT' | 'SYSTEM',
    referenceId: string,
    metadata?: Record<string, unknown>
  ): Promise<{ wallet: IWalletEntity; transaction: IWalletTransactionEntity }>;
  creditEarningsPaise(
    userId: string,
    earningsPaise: number,
    idempotencyKey: string,
    referenceType: 'GIFT' | 'SYSTEM',
    referenceId: string,
    metadata?: Record<string, unknown>
  ): Promise<{ wallet: IWalletEntity; transaction: IWalletTransactionEntity }>;
  listTransactions(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ transactions: IWalletTransactionEntity[]; total: number }>;
  findTransactionByIdempotencyKey(key: string): Promise<IWalletTransactionEntity | null>;
  updatePayoutUpiId(userId: string, upiId: string): Promise<IWalletEntity>;
  withdrawEarnings(
    userId: string,
    amountPaise: number,
    idempotencyKey: string,
    payoutId: string,
    metadata?: Record<string, unknown>
  ): Promise<{ wallet: IWalletEntity; transaction: IWalletTransactionEntity }>;
}
