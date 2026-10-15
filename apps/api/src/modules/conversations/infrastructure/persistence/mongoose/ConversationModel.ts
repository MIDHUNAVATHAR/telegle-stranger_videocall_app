import mongoose, { Schema, Document } from 'mongoose';

export interface ConversationDocument extends Document {
  participant_ids: string[];
  last_call_match_id?: string;
  last_interaction_at: Date;
  hidden_by_user_ids: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<ConversationDocument>(
  {
    participant_ids: {
      type: [String],
      required: true,
      validate: [(val: string[]) => val.length === 2, 'Conversation must have exactly 2 participants'],
    },
    last_call_match_id: {
      type: String,
      default: null,
    },
    last_interaction_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
    hidden_by_user_ids: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'conversations',
  }
);

// Indexes
ConversationSchema.index({ participant_ids: 1 }, { unique: true });
ConversationSchema.index({ participant_ids: 1, last_interaction_at: -1 });
ConversationSchema.index({ hidden_by_user_ids: 1 });

export const ConversationModel =
  mongoose.models.Conversation ||
  mongoose.model<ConversationDocument>('Conversation', ConversationSchema);
