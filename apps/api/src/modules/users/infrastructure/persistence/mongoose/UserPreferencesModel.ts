import mongoose, { Schema, Document, Model } from 'mongoose';

export interface UserPreferencesDocument extends Document {
  userId: string;
  preferredGender: 'ANY' | 'MALE' | 'FEMALE';
  allowIncomingCalls: boolean;
  soundEnabled: boolean;
  updatedAt: Date;
}

const userPreferencesSchema = new Schema<UserPreferencesDocument>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    preferredGender: {
      type: String,
      enum: ['ANY', 'MALE', 'FEMALE'],
      default: 'ANY',
    },
    allowIncomingCalls: { type: Boolean, default: true },
    soundEnabled: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

export const UserPreferencesModel: Model<UserPreferencesDocument> =
  mongoose.models.UserPreferences ||
  mongoose.model<UserPreferencesDocument>('UserPreferences', userPreferencesSchema);
