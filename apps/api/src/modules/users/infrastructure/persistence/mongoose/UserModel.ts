import mongoose, { Schema, Document, Model } from 'mongoose';

export interface UserDocument extends Document {
  userId: string;
  username: string;
  displayName: string;
  email: string;
  googleId?: string;
  age: number;
  gender: string;
  avatarUrl: string;
  bio: string;
  role: string;
  isBanned: boolean;
  bannedUntil?: Date | null;
  karmaScore: number;
  isActive: boolean;
  tokenVersion: number;
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, required: true, default: '' },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    googleId: { type: String, sparse: true, unique: true, index: true },
    age: { type: Number, default: 18, min: 18 },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY'],
      default: 'PREFER_NOT_TO_SAY',
    },
    avatarUrl: { type: String, default: '' },
    bio: { type: String, default: '' },
    role: { type: String, enum: ['USER', 'MODERATOR', 'ADMIN'], default: 'USER' },
    isBanned: { type: Boolean, default: false, index: true },
    bannedUntil: { type: Date, default: null },
    karmaScore: { type: Number, default: 100 },
    isActive: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 1 },
    lastLoginAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export const UserModel: Model<UserDocument> =
  mongoose.models.User || mongoose.model<UserDocument>('User', userSchema);
