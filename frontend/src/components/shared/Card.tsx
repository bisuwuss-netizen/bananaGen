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
        'bg-white rounded-lg border-2 border-gray-900',
        hoverable && 'hover:bg-gray-50 transition-all duration-150 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
