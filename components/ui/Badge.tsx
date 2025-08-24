
import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

const badgeVariants = {
  default: 'bg-slate-700 text-slate-200',
  success: 'bg-green-800 text-green-200',
  warning: 'bg-yellow-800 text-yellow-200',
  danger: 'bg-red-800 text-red-200',
  info: 'bg-sky-800 text-sky-200',
};

const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeVariants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;