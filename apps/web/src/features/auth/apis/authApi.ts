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
}

export const authApi = {
  sendOtp: (email: string) =>
    api.post<{ message: string; expiresIn: number }>('/auth/otp/send', { email }),

  verifyOtp: (email: string, code: string) =>
    api.post<AuthResponse>('/auth/otp/verify', { email, code }),

  googleAuth: (idToken: string) =>
    api.post<AuthResponse>('/auth/google', { id_token: idToken }),

  getMe: () => api.get<UserProfile>('/auth/me'),

  refreshToken: () => api.post<{ user: UserProfile }>('/auth/refresh'),

  logout: () => api.post<{ message: string }>('/auth/logout'),
};
