
import React, { forwardRef } from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-lg shadow-md ${className}`}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<CardProps> = ({ children, className = '' }) => (
  <div className={`p-4 border-b border-slate-700 ${className}`}>{children}</div>
);

export const CardContent = forwardRef<HTMLDivElement, CardProps>(({ children, className = '' }, ref) => (
  <div ref={ref} className={`p-4 ${className}`}>
    {children}
  </div>
));
CardContent.displayName = 'CardContent';

export const CardFooter: React.FC<CardProps> = ({ children, className = '' }) => (
  <div className={`p-4 border-t border-slate-700 ${className}`}>{children}</div>
);

export default Card;
