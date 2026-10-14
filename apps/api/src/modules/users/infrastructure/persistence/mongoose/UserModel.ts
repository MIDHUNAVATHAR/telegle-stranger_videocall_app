import mongoose, { Schema, Document, Model } from 'mongoose';

export interface UserDocument extends Document {
  userId: string;
  username: string;
  email: string;
  bio?: string;
  karmaScore: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    bio: { type: String, default: '' },
    karmaScore: { type: Number, default: 100 },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

export const UserModel: Model<UserDocument> =
  mongoose.models.User || mongoose.model<UserDocument>('User', userSchema);
