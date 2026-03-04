import React from 'react';
import { cn } from '@/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-white/90 rounded-card shadow-md border border-slate-200/80 backdrop-blur-sm',
        hoverable && 'hover:shadow-lift hover:-translate-y-1 hover:border-banana-300 transition-all duration-200 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
