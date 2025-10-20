import React, { memo } from 'react';

const LoadingSpinner = memo(function LoadingSpinner({ size = 'md', text = 'Loading...', variant = 'spinner' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  if (variant === 'skeleton') {
    return (
      <div className="animate-pulse">
        <div className="space-y-3">
          <div className="skeleton h-4 rounded w-3/4"></div>
          <div className="skeleton h-4 rounded w-full"></div>
          <div className="skeleton h-4 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div className="flex flex-col items-center justify-center p-4">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        </div>
        {text && <p className={`mt-2 ${textSizeClasses[size]} text-gray-500`}>{text}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-gray-300 border-t-blue-600`}></div>
      {text && <p className={`mt-2 ${textSizeClasses[size]} text-gray-500`}>{text}</p>}
    </div>
  );
});

export default LoadingSpinner;
