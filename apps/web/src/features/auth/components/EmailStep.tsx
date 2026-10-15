'use client';

import React, { useState } from 'react';

interface EmailStepProps {
  onOtpSent: (email: string) => void;
  onGoogleLogin: () => void;
  onRequestOtp: (email: string) => Promise<void>;
  isLoading: boolean;
}

export const EmailStep: React.FC<EmailStepProps> = ({
  onOtpSent,
  onGoogleLogin,
  onRequestOtp,
  isLoading,
}) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      await onRequestOtp(trimmed);
      onOtpSent(trimmed);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#f5f6f8', marginBottom: '8px' }}>
          Welcome to Donkey Play
        </h2>
        <p style={{ fontSize: '14px', color: '#9ea4b4' }}>
          Connect, chat, and meet genuine people in real-time.
        </p>
      </div>

      {/* Safety Notice Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          backgroundColor: 'rgba(255, 90, 31, 0.1)',
          border: '1px solid rgba(255, 90, 31, 0.25)',
          borderRadius: '12px',
          color: '#ff8a5c',
          fontSize: '13px',
          fontWeight: 500,
        }}
      >
        <span>🛡️</span>
        <span>Strictly No Nudity • Respect Others • 18+ Community</span>
      </div>

      {error && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#2b1418',
            border: '1px solid #ef4444',
            borderRadius: '10px',
            color: '#fca5a5',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label
            htmlFor="auth-email-input"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#9ea4b4', marginBottom: '6px' }}
          >
            Email Address
          </label>
          <input
            id="auth-email-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '14px 16px',
              backgroundColor: '#151821',
              border: '1px solid #262c3e',
              borderRadius: '12px',
              color: '#f5f6f8',
              fontSize: '15px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !email.trim()}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: isLoading || !email.trim() ? '#662810' : '#ff5a1f',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '15px',
            borderRadius: '12px',
            border: 'none',
            cursor: isLoading || !email.trim() ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {isLoading ? 'Sending Code...' : 'Continue with Email'}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#262c3e' }} />
        <span style={{ fontSize: '12px', color: '#717786', textTransform: 'uppercase' }}>or</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#262c3e' }} />
      </div>

      <button
        type="button"
        onClick={onGoogleLogin}
        disabled={isLoading}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          width: '100%',
          padding: '14px',
          backgroundColor: '#151821',
          border: '1px solid #262c3e',
          color: '#f5f6f8',
          fontWeight: 600,
          fontSize: '15px',
          borderRadius: '12px',
          cursor: 'pointer',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path
            fill="#EA4335"
            d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
          />
          <path
            fill="#4285F4"
            d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
          />
          <path
            fill="#FBBC05"
            d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.5s.7 2.8 1.9 5.2l3.7-2.9z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 17C3.7 20.7 7.5 24 12 24z"
          />
        </svg>
        Continue with Google
      </button>
    </div>
  );
};
