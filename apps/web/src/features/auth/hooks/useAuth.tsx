'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, UserProfile } from '../apis/authApi';

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

  // Check active session on initial mount
  const checkSession = useCallback(async () => {
    try {
      setIsLoading(true);
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

  const sendOtp = async (email: string) => {
    await authApi.sendOtp(email);
  };

  const verifyOtp = async (email: string, code: string) => {
    const response = await authApi.verifyOtp(email, code);
    setUser(response.user);
    setIsAuthModalOpen(false);
    return { is_new_user: response.is_new_user };
  };

  const loginWithGoogle = async (idToken: string) => {
    const response = await authApi.googleAuth(idToken);
    setUser(response.user);
    setIsAuthModalOpen(false);
    return { is_new_user: response.is_new_user };
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
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
