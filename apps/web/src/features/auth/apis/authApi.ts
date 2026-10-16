import { api } from '../../../shared/api/client';

export interface UserProfile {
  _id: string;
  id: string;
  email: string;
  username: string;
  display_name: string;
  age: number;
  gender: string;
  avatar_url?: string;
  bio?: string;
  role: string;
  is_banned: boolean;
  banned_until?: string | null;
  created_at: string;
}

export interface AuthResponse {
  user: UserProfile;
  is_new_user: boolean;
  tokens?: {
    access_token: string;
    refresh_token?: string;
  };
}

export interface RefreshResponse {
  user: UserProfile;
  tokens: {
    access_token: string;
    refresh_token?: string;
  };
}

export const authApi = {
  sendOtp: (email: string) =>
    api.post<{ message: string; expiresIn: number }>('/auth/otp/send', { email }),

  verifyOtp: (email: string, code: string, referralCode?: string) =>
    api.post<AuthResponse>('/auth/otp/verify', { email, code, referral_code: referralCode }),

  googleAuth: (idToken: string, referralCode?: string) =>
    api.post<AuthResponse>('/auth/google', { id_token: idToken, referral_code: referralCode }),

  getMe: () => api.get<UserProfile>('/auth/me'),

  refreshToken: (refreshToken?: string) =>
    api.post<RefreshResponse>('/auth/refresh', refreshToken ? { refresh_token: refreshToken } : {}),

  logout: () => api.post<{ message: string }>('/auth/logout'),
};
