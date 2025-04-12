import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
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
      {...props}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
} 