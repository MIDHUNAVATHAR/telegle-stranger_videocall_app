'use client';

import React, { useEffect, useState } from 'react';

export interface ToastProps {
  id?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message?: string;
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  type = 'error',
  title,
  message,
  duration = 4500,
  onClose,
}) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration <= 0) return;

    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration - 300);

    const closeTimer = setTimeout(() => {
      onClose();
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(closeTimer);
    };
  }, [duration, onClose]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 250);
  };

  const getBorderColor = () => {
    switch (type) {
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'success':
        return '#22c55e';
      default:
        return 'var(--accent, #ff5a1f)';
    }
  };

  const getBadgeBg = () => {
    switch (type) {
      case 'error':
        return 'rgba(239, 68, 68, 0.16)';
      case 'warning':
        return 'rgba(245, 158, 11, 0.16)';
      case 'success':
        return 'rgba(34, 197, 94, 0.16)';
      default:
        return 'rgba(255, 90, 31, 0.16)';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'error':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
      case 'warning':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 'success':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        );
      default:
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #ff5a1f)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        );
    }
  };

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: 'calc(100% - 32px)',
        maxWidth: '420px',
        backgroundColor: 'rgba(21, 24, 33, 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1.5px solid ${getBorderColor()}`,
        borderRadius: '16px',
        padding: '14px 16px',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6), 0 0 20px rgba(239, 68, 68, 0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        opacity: isExiting ? 0 : 1,
        transition: 'opacity 250ms ease, transform 250ms ease',
        animation: 'toastSlideIn 300ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <style>{`
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translate(-50%, -18px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }
      `}</style>

      {/* Icon Badge */}
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          backgroundColor: getBadgeBg(),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {getIcon()}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4
          style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h4>
        {message && (
          <p
            style={{
              margin: '3px 0 0 0',
              fontSize: '13px',
              color: 'var(--ink-secondary, #9ea4b4)',
              lineHeight: 1.4,
              fontWeight: 500,
            }}
          >
            {message}
          </p>
        )}
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Close notification"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--ink-tertiary, #717786)',
          cursor: 'pointer',
          padding: '4px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 150ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#ffffff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--ink-tertiary, #717786)';
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
};
