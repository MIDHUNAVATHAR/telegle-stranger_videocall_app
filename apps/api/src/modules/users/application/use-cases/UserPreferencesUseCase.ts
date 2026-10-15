import mongoose from 'mongoose';
import { UserPreferencesModel } from '../../infrastructure/persistence/mongoose/UserPreferencesModel';

export interface UserPreferencesDTO {
  preferredGender: 'ANY' | 'MALE' | 'FEMALE';
  allowIncomingCalls: boolean;
  soundEnabled: boolean;
}

// In-memory fallback map for unit tests when MongoDB is not connected
const testPreferencesStore = new Map<string, UserPreferencesDTO>();

export class UserPreferencesUseCase {
  public async getPreferences(userId: string): Promise<UserPreferencesDTO> {
    if (mongoose.connection.readyState === 1) {
      const doc = await UserPreferencesModel.findOne({ userId }).exec();
      if (doc) {
        return {
          preferredGender: doc.preferredGender,
          allowIncomingCalls: doc.allowIncomingCalls,
          soundEnabled: doc.soundEnabled,
        };
      }
    }

    const cached = testPreferencesStore.get(userId);
    if (cached) return cached;

    const defaults: UserPreferencesDTO = {
      preferredGender: 'ANY',
      allowIncomingCalls: true,
      soundEnabled: true,
    };
    testPreferencesStore.set(userId, defaults);
    return defaults;
  }

  public async updatePreferences(
    userId: string,
    updates: Partial<UserPreferencesDTO>
  ): Promise<UserPreferencesDTO> {
    if (mongoose.connection.readyState === 1) {
      const updated = await UserPreferencesModel.findOneAndUpdate(
        { userId },
        { $set: updates },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).exec();

      return {
        preferredGender: updated.preferredGender,
        allowIncomingCalls: updated.allowIncomingCalls,
        soundEnabled: updated.soundEnabled,
      };
    }

    const existing = await this.getPreferences(userId);
    const updated: UserPreferencesDTO = {
      ...existing,
      ...updates,
    };
    testPreferencesStore.set(userId, updated);
    return updated;
  }
}
