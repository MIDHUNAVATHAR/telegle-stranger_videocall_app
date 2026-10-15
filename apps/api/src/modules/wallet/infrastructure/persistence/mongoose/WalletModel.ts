import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IWalletDocument extends Document {
  user_id: Types.ObjectId;
  purchased_coins_balance: number;
  withdrawable_earnings_paise: number;
  total_coins_spent: number;
  total_earnings_withdrawn_paise: number;
  version: number;
  created_at: Date;
  updated_at: Date;
}

export interface IWalletTransactionDocument extends Document {
  wallet_id: Types.ObjectId;
  user_id: Types.ObjectId;
  type: string;
  coins_amount: number;
  currency_amount_paise: number;
  idempotency_key: string;
  reference_type: string;
  reference_id: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  balance_after: {
    purchased_coins: number;
    withdrawable_paise: number;
  };
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

const WalletSchema = new Schema<IWalletDocument>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    purchased_coins_balance: { type: Number, required: true, default: 0, min: 0 },
    withdrawable_earnings_paise: { type: Number, required: true, default: 0, min: 0 },
    total_coins_spent: { type: Number, required: true, default: 0, min: 0 },
    total_earnings_withdrawn_paise: { type: Number, required: true, default: 0, min: 0 },
    version: { type: Number, required: true, default: 1 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

const WalletTransactionSchema = new Schema<IWalletTransactionDocument>(
  {
    wallet_id: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        'COIN_PURCHASE',
        'GENDER_FILTER_DEBIT',
        'DIRECT_CALL_DEBIT',
        'GIFT_SENT_DEBIT',
        'GIFT_RECEIVED_CREDIT',
        'REFUND_CREDIT',
      ],
    },
    coins_amount: { type: Number, required: true, default: 0 },
    currency_amount_paise: { type: Number, required: true, default: 0 },
    idempotency_key: { type: String, required: true, unique: true, index: true },
    reference_type: { type: String, required: true, index: true },
    reference_id: { type: String, required: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'COMPLETED', 'FAILED'],
      default: 'COMPLETED',
    },
    balance_after: {
      purchased_coins: { type: Number, required: true },
      withdrawable_paise: { type: Number, required: true },
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

WalletTransactionSchema.index({ user_id: 1, created_at: -1 });
WalletTransactionSchema.index({ reference_type: 1, reference_id: 1 });

export const WalletModel = mongoose.models.Wallet || mongoose.model<IWalletDocument>('Wallet', WalletSchema);
export const WalletTransactionModel =
  mongoose.models.WalletTransaction ||
  mongoose.model<IWalletTransactionDocument>('WalletTransaction', WalletTransactionSchema);
