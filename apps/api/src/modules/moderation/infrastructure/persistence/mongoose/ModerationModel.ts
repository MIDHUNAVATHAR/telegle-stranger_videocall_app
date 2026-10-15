import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IReportDocument extends Document {
  reporter_id: Types.ObjectId;
  reported_user_id: Types.ObjectId;
  match_id?: Types.ObjectId;
  reason: string;
  details?: string;
  status: 'PENDING' | 'ACTIONED' | 'DISMISSED';
  action_taken: 'NONE' | 'MUTUAL_BLOCK_24H' | 'AUTO_BAN_24H' | 'PERMANENT_BAN';
  created_at: Date;
}

export interface IBlockDocument extends Document {
  user_id: Types.ObjectId;
  blocked_user_id: Types.ObjectId;
  reason: 'USER_INITIATED' | 'POST_REPORT_AUTO';
  expires_at?: Date | null;
  created_at: Date;
}

const ReportSchema = new Schema<IReportDocument>(
  {
    reporter_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reported_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    match_id: { type: Schema.Types.ObjectId, ref: 'Match' },
    reason: {
      type: String,
      required: true,
      enum: ['HARASSMENT', 'NUDITY_INAPPROPRIATE', 'UNDERAGE', 'SPAM', 'OTHER'],
    },
    details: { type: String, maxlength: 500 },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'ACTIONED', 'DISMISSED'],
      default: 'PENDING',
    },
    action_taken: {
      type: String,
      required: true,
      enum: ['NONE', 'MUTUAL_BLOCK_24H', 'AUTO_BAN_24H', 'PERMANENT_BAN'],
      default: 'MUTUAL_BLOCK_24H',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

ReportSchema.index({ reported_user_id: 1, created_at: -1 });

const BlockSchema = new Schema<IBlockDocument>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    blocked_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reason: {
      type: String,
      required: true,
      enum: ['USER_INITIATED', 'POST_REPORT_AUTO'],
      default: 'USER_INITIATED',
    },
    expires_at: { type: Date, index: { expires: 0 } }, // MongoDB TTL Index
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

BlockSchema.index({ user_id: 1, blocked_user_id: 1 }, { unique: true });

export const ReportModel = mongoose.models.Report || mongoose.model<IReportDocument>('Report', ReportSchema);
export const BlockModel = mongoose.models.Block || mongoose.model<IBlockDocument>('Block', BlockSchema);
