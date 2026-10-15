'use client';

import React, { useState, useEffect } from 'react';

interface OtpStepProps {
  email: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
}

export const OtpStep: React.FC<OtpStepProps> = ({
  email,
  onVerify,
  onResend,
  onBack,
  isLoading,
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (code.trim().length !== 6) {
      setError('Please enter the complete 6-digit verification code');
      return;
    }

    try {
      await onVerify(code.trim());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || isResending) return;
    setIsResending(true);
    setError(null);
    try {
      await onResend();
      setSecondsLeft(60);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <button
          type="button"
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#9ea4b4',
            fontSize: '13px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0 0 12px 0',
          }}
        >
          ← Change Email
        </button>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#f5f6f8', marginBottom: '8px' }}>
          Enter Verification Code
        </h2>
        <p style={{ fontSize: '14px', color: '#9ea4b4' }}>
          We sent a 6-digit verification code to <strong style={{ color: '#f5f6f8' }}>{email}</strong>
        </p>
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

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label
            htmlFor="auth-otp-input"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#9ea4b4', marginBottom: '8px' }}
          >
            6-Digit Code
          </label>
          <input
            id="auth-otp-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="123456"
            autoFocus
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: '#151821',
              border: '1px solid #262c3e',
              borderRadius: '12px',
              color: '#ff5a1f',
              fontSize: '24px',
              fontWeight: 700,
              letterSpacing: '8px',
              textAlign: 'center',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || code.length !== 6}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: isLoading || code.length !== 6 ? '#662810' : '#ff5a1f',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '15px',
            borderRadius: '12px',
            border: 'none',
            cursor: isLoading || code.length !== 6 ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? 'Verifying...' : 'Verify & Enter'}
        </button>
      </form>

      <div style={{ textAlign: 'center', fontSize: '13px', color: '#717786' }}>
        {secondsLeft > 0 ? (
          <span>Resend code in <strong style={{ color: '#9ea4b4' }}>{secondsLeft}s</strong></span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            style={{
              color: '#ff5a1f',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {isResending ? 'Resending...' : 'Resend Code'}
          </button>
        )}
      </div>
    </div>
  );
};
