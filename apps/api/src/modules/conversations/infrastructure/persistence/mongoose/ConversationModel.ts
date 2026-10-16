import mongoose, { Schema } from 'mongoose';

export interface ConversationDocument {
  _id: string;
  participant_ids: string[];
  last_call_match_id?: string;
  last_interaction_at: Date;
  last_message_text?: string;
  last_message_sender_id?: string;
  hidden_by_user_ids: string[];
  video_call_enabled_by_user_ids: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<ConversationDocument>(
  {
    _id: {
      type: String,
      required: true,
    },
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
    last_message_text: {
      type: String,
      default: '',
    },
    last_message_sender_id: {
      type: String,
      default: '',
    },
    hidden_by_user_ids: {
      type: [String],
      default: [],
    },
    video_call_enabled_by_user_ids: {
      type: [String],
      default: [],
    },
  },
  {
    _id: false,
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
