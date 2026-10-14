import React from 'react';

export interface BadgeProps {
  variant?: 'default' | 'accent' | 'success' | 'danger';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', children }) => {
  const getStyle = (): React.CSSProperties => {
    switch (variant) {
      case 'accent':
        return {
          backgroundColor: 'var(--accent)',
          color: 'var(--accent-ink)',
          fontWeight: 700,
        };
      case 'success':
        return {
          backgroundColor: '#142918',
          color: 'var(--success)',
          fontWeight: 600,
        };
      case 'danger':
        return {
          backgroundColor: 'var(--danger-surface)',
          color: 'var(--danger)',
          fontWeight: 600,
        };
      default:
        return {
          backgroundColor: 'var(--surface-raised)',
          color: 'var(--ink-secondary)',
          fontWeight: 500,
        };
    }
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: 'var(--radius-full)',
        fontSize: 'var(--step-small)',
        lineHeight: 1.2,
        ...getStyle(),
      }}
    >
      {children}
    </span>
  );
};
