import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IGiftDocument extends Document {
  name: string;
  slug: string;
  coin_price: number;
  creator_earning_paise: number;
  platform_fee_paise: number;
  icon_url: string;
  animation_url?: string;
  is_active: boolean;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface IGiftTransferDocument extends Document {
  gift_id: Types.ObjectId | string;
  sender_id: Types.ObjectId | string;
  recipient_id: Types.ObjectId | string;
  match_id?: Types.ObjectId | string;
  coins_spent: number;
  creator_earnings_paise: number;
  platform_fee_paise: number;
  created_at: Date;
}

const GiftSchema = new Schema<IGiftDocument>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    coin_price: { type: Number, required: true, min: 1 },
    creator_earning_paise: { type: Number, required: true, min: 0 },
    platform_fee_paise: { type: Number, required: true, min: 0 },
    icon_url: { type: String, required: true },
    animation_url: { type: String },
    is_active: { type: Boolean, default: true, index: true },
    display_order: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

const GiftTransferSchema = new Schema<IGiftTransferDocument>(
  {
    gift_id: { type: Schema.Types.Mixed, required: true, index: true },
    sender_id: { type: Schema.Types.Mixed, required: true, index: true },
    recipient_id: { type: Schema.Types.Mixed, required: true, index: true },
    match_id: { type: Schema.Types.Mixed },
    coins_spent: { type: Number, required: true },
    creator_earnings_paise: { type: Number, required: true },
    platform_fee_paise: { type: Number, required: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

GiftTransferSchema.index({ sender_id: 1, created_at: -1 });
GiftTransferSchema.index({ recipient_id: 1, created_at: -1 });

export const GiftModel = mongoose.models.Gift || mongoose.model<IGiftDocument>('Gift', GiftSchema);
export const GiftTransferModel =
  mongoose.models.GiftTransfer ||
  mongoose.model<IGiftTransferDocument>('GiftTransfer', GiftTransferSchema);
