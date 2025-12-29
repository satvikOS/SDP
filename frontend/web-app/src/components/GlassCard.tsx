import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className, hover = false }: GlassCardProps) {
  return (
    <div
      className={cn(
        'glass-panel rounded-xl p-6',
        hover && 'hover:shadow-glass-dark transition-all duration-200',
        className
      )}
    >
      {children}
    </div>
  );
}

interface GlassButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export function GlassButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className,
  disabled = false,
  type = 'button',
}: GlassButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg';

  const variants = {
    primary: 'bg-accent-600 hover:bg-accent-700 text-white border border-accent-500',
    secondary: 'glass-panel hover:bg-dark-hover text-[var(--text-primary)]',
    ghost: 'hover:bg-dark-hover text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      type={type}
      onClick={(e) => onClick?.(e)}
      disabled={disabled}
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  );
}

interface GlassInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  rows?: number;
}

export function GlassInput({
  value,
  onChange,
  placeholder,
  className,
  multiline = false,
  rows = 3,
}: GlassInputProps) {
  const baseStyles = cn(
    'w-full glass-panel px-4 py-3 rounded-lg',
    'text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]',
    'focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent',
    'transition-all duration-200',
    className
  );

  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={cn(baseStyles, 'resize-none')}
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={baseStyles}
    />
  );
}
