import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  isLoading = false,
  className = '',
  ...props
}: ButtonProps) {
  const baseClasses = 'font-medium rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 inline-flex items-center justify-center';
  
  const sizeClasses = {
    sm: 'text-sm px-4 py-2',
    md: 'text-base px-5 py-3',
    lg: 'text-lg px-6 py-3.5',
  }[size];
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-primary to-accent text-white hover:opacity-90 focus:ring-primary',
    secondary: 'bg-surface hover:bg-surface-light text-white focus:ring-primary-light',
    outline: 'border border-primary text-white hover:bg-primary/10 focus:ring-primary-light',
  }[variant];
  
  const widthClass = fullWidth ? 'w-full' : '';
  
  return (
    <button 
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${widthClass} ${className}`}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
} 