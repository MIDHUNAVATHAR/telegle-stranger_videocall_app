import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  disabled,
  style,
  ...props
}) => {
  const getVariantStyle = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--accent)',
          color: 'var(--accent-ink)',
          fontWeight: 700,
        };
      case 'secondary':
        return {
          backgroundColor: 'var(--surface-raised)',
          color: 'var(--ink)',
          fontWeight: 600,
        };
      case 'danger':
        return {
          backgroundColor: 'var(--danger-surface)',
          color: 'var(--danger)',
          fontWeight: 600,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--ink-secondary)',
          fontWeight: 500,
        };
    }
  };

  const getSizeStyle = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return {
          minHeight: '36px',
          padding: '0 12px',
          fontSize: 'var(--step-small)',
          borderRadius: 'var(--radius-sm)',
        };
      case 'md':
        return {
          minHeight: '44px',
          padding: '0 18px',
          fontSize: 'var(--step-body)',
          borderRadius: 'var(--radius-md)',
        };
      case 'lg':
        return {
          minHeight: '52px',
          padding: '0 24px',
          fontSize: 'var(--step-lead)',
          borderRadius: 'var(--radius-md)',
        };
    }
  };

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    width: fullWidth ? '100%' : 'auto',
    letterSpacing: '-0.01em',
    transition: 'background-color var(--t-quick) ease, transform var(--t-press) var(--ease-spring)',
    ...getVariantStyle(),
    ...getSizeStyle(),
    ...style,
  };

  return (
    <button
      disabled={disabled}
      style={baseStyle}
      className={`dp-button dp-button-${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
