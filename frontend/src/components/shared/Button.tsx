import React from 'react';
import { cn } from '@/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  disabled,
  style,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold rounded-md transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation border-2 border-gray-900';

  const variants = {
    primary: 'bg-[#f5d040] text-gray-900 hover:bg-[#f0c830]',
    secondary: 'bg-white text-gray-900 hover:bg-gray-50',
    ghost: 'bg-transparent border-transparent text-gray-700 hover:bg-gray-100',
  };

  const shadows = {
    primary: '2px 2px 0 #1a1a1a',
    secondary: '2px 2px 0 #1a1a1a',
    ghost: 'none',
  };

  const sizes = {
    sm: 'h-9 px-3.5 text-sm',
    md: 'h-10 px-6 text-[15px]',
    lg: 'h-12 px-8 text-base',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      style={{ boxShadow: (disabled || loading) ? 'none' : shadows[variant], ...style }}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {!loading && icon && <span className={children ? 'mr-2' : ''}>{icon}</span>}
      {children}
    </button>
  );
};
