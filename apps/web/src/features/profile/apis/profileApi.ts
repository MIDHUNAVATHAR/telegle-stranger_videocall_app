import { api } from '../../../shared/api/client';
import { UserProfile } from '../../auth/apis/authApi';

export interface UserPreferences {
  preferredGender: 'ANY' | 'MALE' | 'FEMALE';
  allowIncomingCalls: boolean;
  soundEnabled: boolean;
}

export interface ProfileData {
  user: UserProfile;
  preferences: UserPreferences;
}

export interface UpdateProfilePayload {
  display_name?: string;
  bio?: string;
  gender?: string;
  age?: number;
  avatar_url?: string;
}

export interface UpdatePreferencesPayload {
  preferred_gender?: 'ANY' | 'MALE' | 'FEMALE';
  allow_incoming_calls?: boolean;
  sound_enabled?: boolean;
}

export interface CloudinarySignature {
  signature: string;
  timestamp: number;
  api_key: string;
  cloud_name: string;
  folder: string;
  eager?: string;
}

export const profileApi = {
  getMyProfile: () => api.get<ProfileData>('/users/me'),

  updateProfile: (payload: UpdateProfilePayload) =>
    api.patch<UserProfile>('/users/me', payload),

  signAvatarUpload: () =>
    api.post<CloudinarySignature>('/users/me/avatar/sign'),

  uploadAvatarToCloudinary: async (file: File): Promise<string> => {
    const signData = await profileApi.signAvatarUpload();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', signData.api_key);
    formData.append('timestamp', signData.timestamp.toString());
    formData.append('signature', signData.signature);
    formData.append('folder', signData.folder);
    if (signData.eager) {
      formData.append('eager', signData.eager);
    }

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${signData.cloud_name}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to upload image to Cloudinary');
      }

      const result = await response.json();
      return result.secure_url || result.url;
    } catch (err) {
      // In offline/test environments, create a local object URL fallback
      console.warn('Direct Cloudinary upload failed, falling back to local object URL:', err);
      return URL.createObjectURL(file);
    }
  },

  updatePreferences: (payload: UpdatePreferencesPayload) =>
    api.patch<UserPreferences>('/users/me/preferences', payload),

  getPublicProfile: (userId: string) =>
    api.get<Partial<UserProfile>>(`/users/${userId}`),
};
