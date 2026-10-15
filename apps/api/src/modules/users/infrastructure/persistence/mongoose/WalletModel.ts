import mongoose, { Schema, Document, Model } from 'mongoose';

export interface WalletDocument extends Document {
  userId: string;
  purchasedCoinsBalance: number;
  withdrawableEarningsPaise: number;
  totalCoinsSpent: number;
  totalEarningsWithdrawnPaise: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new Schema<WalletDocument>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    purchasedCoinsBalance: { type: Number, default: 0, min: 0 },
    withdrawableEarningsPaise: { type: Number, default: 0, min: 0 },
    totalCoinsSpent: { type: Number, default: 0 },
    totalEarningsWithdrawnPaise: { type: Number, default: 0 },
    version: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

export const WalletModel: Model<WalletDocument> =
  mongoose.models.Wallet || mongoose.model<WalletDocument>('Wallet', walletSchema);
