'use client';

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { EmailStep } from './EmailStep';
import { OtpStep } from './OtpStep';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { sendOtp, verifyOtp, loginWithGoogle } = useAuth();
  const [step, setStep] = useState<'EMAIL' | 'OTP'>('EMAIL');
  const [targetEmail, setTargetEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleOtpSent = (email: string) => {
    setTargetEmail(email);
    setStep('OTP');
  };

  const handleRequestOtp = async (email: string) => {
    setIsLoading(true);
    try {
      await sendOtp(email);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    setIsLoading(true);
    try {
      await verifyOtp(targetEmail, code);
      if (onClose) onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      // In web app, we can use Google Identity Services SDK or test token fallback
      await loginWithGoogle('mock_google_id_token_demo.user@example.com');
      if (onClose) onClose();
    } catch {
      // Handled in auth provider
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(12, 14, 18, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#0c0e12',
          border: '1px solid #1e2230',
          borderRadius: '20px',
          padding: '28px 24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          position: 'relative',
        }}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              color: '#717786',
              fontSize: '20px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}

        {step === 'EMAIL' ? (
          <EmailStep
            onOtpSent={handleOtpSent}
            onGoogleLogin={handleGoogleLogin}
            onRequestOtp={handleRequestOtp}
            isLoading={isLoading}
          />
        ) : (
          <OtpStep
            email={targetEmail}
            onVerify={handleVerifyOtp}
            onResend={() => handleRequestOtp(targetEmail)}
            onBack={() => setStep('EMAIL')}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};
