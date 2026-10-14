import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  id,
  style,
  className = '',
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: 'var(--step-small)',
            fontWeight: 600,
            color: 'var(--ink-secondary)',
          }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        style={{
          width: '100%',
          minHeight: '44px',
          padding: '0 14px',
          backgroundColor: 'var(--surface-raised)',
          color: 'var(--ink)',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--step-body)',
          transition: 'background-color var(--t-quick) ease',
          ...style,
        }}
        className={`dp-input ${className}`}
        {...props}
      />
      {error && (
        <span style={{ fontSize: 'var(--step-small)', color: 'var(--danger)' }}>
          {error}
        </span>
      )}
    </div>
  );
};
