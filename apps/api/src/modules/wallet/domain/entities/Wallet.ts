import { ICoinPackage } from '@donkey-play/shared-types';

export interface IWalletEntity {
  id: string;
  userId: string;
  purchasedCoinsBalance: number;
  withdrawableEarningsPaise: number;
  totalCoinsSpent: number;
  totalEarningsWithdrawnPaise: number;
  payoutUpiId?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export type WalletTransactionType =
  | 'COIN_PURCHASE'
  | 'GENDER_FILTER_DEBIT'
  | 'DIRECT_CALL_DEBIT'
  | 'GIFT_SENT_DEBIT'
  | 'GIFT_RECEIVED_CREDIT'
  | 'REFUND_CREDIT'
  | 'WITHDRAWAL_PAYOUT'
  | 'WITHDRAWAL_REFUND';

export interface IWalletTransactionEntity {
  id: string;
  walletId: string;
  userId: string;
  type: WalletTransactionType;
  coinsAmount: number;
  currencyAmountPaise: number;
  idempotencyKey: string;
  referenceType: 'RAZORPAY_ORDER' | 'RAZORPAY_PAYOUT' | 'MATCH' | 'CONVERSATION' | 'GIFT' | 'SYSTEM';
  referenceId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  balanceAfter: {
    purchasedCoins: number;
    withdrawablePaise: number;
  };
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export const COIN_PACKAGES: ICoinPackage[] = [
  {
    id: 'pack_starter_10',
    name: 'Starter Pack',
    baseCoins: 10,
    bonusCoins: 0,
    totalCoins: 10,
    pricePaise: 1000,
    priceInr: 10,
  },
  {
    id: 'pack_popular_50',
    name: 'Popular Pack',
    baseCoins: 50,
    bonusCoins: 5,
    totalCoins: 55,
    pricePaise: 5000,
    priceInr: 50,
  },
  {
    id: 'pack_value_100',
    name: 'Value Pack',
    baseCoins: 100,
    bonusCoins: 20,
    totalCoins: 120,
    pricePaise: 10000,
    priceInr: 100,
  },
  {
    id: 'pack_mega_500',
    name: 'Mega VIP Pack',
    baseCoins: 500,
    bonusCoins: 150,
    totalCoins: 650,
    pricePaise: 50000,
    priceInr: 500,
  },
];
