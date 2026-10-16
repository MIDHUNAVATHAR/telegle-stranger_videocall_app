'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, UserProfile } from '../apis/authApi';
import { setClientAccessToken } from '../../../shared/api/client';
import { socketService } from '../../matching/services/socketClient';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, code: string) => Promise<{ is_new_user: boolean }>;
  loginWithGoogle: (idToken: string) => Promise<{ is_new_user: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Check active session on initial mount:
  // When user loads the page the first time, call refresh endpoint
  // for a new 15-minute access token and a new rotated 14-day refresh token in cookie
  const checkSession = useCallback(async () => {
    try {
      setIsLoading(true);
      try {
        const refreshRes = await authApi.refreshToken();
        if (refreshRes && refreshRes.user) {
          if (refreshRes.tokens?.access_token) {
            setClientAccessToken(refreshRes.tokens.access_token);
          }
          setUser(refreshRes.user);
          return;
        }
      } catch {
        // If refresh fails (no refresh cookie or expired), fallback to getMe or set unauthenticated
      }
      const profile = await authApi.getMe();
      setUser(profile);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Capture referral code from URL query parameter on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        if (ref) {
          localStorage.setItem('dp_referral_code', ref.trim());
        }
      } catch (err) {
        console.warn('Failed to parse referral code from URL:', err);
      }
    }
  }, []);

  const getStoredReferralCode = (): string | undefined => {
    if (typeof window === 'undefined') return undefined;
    try {
      const code = localStorage.getItem('dp_referral_code');
      return code ? code.trim() : undefined;
    } catch {
      return undefined;
    }
  };

  const clearStoredReferralCode = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('dp_referral_code');
      } catch (err) {
        console.warn('Failed to clear referral code:', err);
      }
    }
  };

  const sendOtp = async (email: string) => {
    await authApi.sendOtp(email);
  };

  const verifyOtp = async (email: string, code: string) => {
    const referralCode = getStoredReferralCode();
    const response = await authApi.verifyOtp(email, code, referralCode);
    clearStoredReferralCode();
    if (response.tokens?.access_token) {
      setClientAccessToken(response.tokens.access_token);
      socketService.disconnect();
    }
    setUser(response.user);
    setIsAuthModalOpen(false);
    return { is_new_user: response.is_new_user };
  };

  const loginWithGoogle = async (idToken: string) => {
    const referralCode = getStoredReferralCode();
    const response = await authApi.googleAuth(idToken, referralCode);
    clearStoredReferralCode();
    if (response.tokens?.access_token) {
      setClientAccessToken(response.tokens.access_token);
      socketService.disconnect();
    }
    setUser(response.user);
    setIsAuthModalOpen(false);
    return { is_new_user: response.is_new_user };
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setClientAccessToken(null);
      socketService.disconnect();
      setUser(null);
      setIsAuthModalOpen(true);
    }
  };

  const refreshUser = async () => {
    await checkSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
        sendOtp,
        verifyOtp,
        loginWithGoogle,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
