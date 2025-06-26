import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export function LoadingSpinner({ size = 'md', text, className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center space-y-2">
        <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-400`} />
        {text && (
          <p className="text-slate-400 text-sm">{text}</p>
        )}
      </div>
    </div>
  );
}

// Inline loading component for buttons
export function ButtonSpinner({ className = '' }: { className?: string }) {
  return (
    <Loader2 className={`w-4 h-4 animate-spin ${className}`} />
  );
}

// Full page loading component
export function PageLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}