import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  active?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  active = false,
  style,
  className = '',
  ...props
}) => {
  return (
    <div
      style={{
        backgroundColor: active ? 'var(--surface-hover)' : 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-16)',
        transition: 'background-color var(--t-quick) ease',
        ...style,
      }}
      className={`dp-card ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
