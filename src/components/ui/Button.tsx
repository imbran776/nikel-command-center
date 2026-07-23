import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type BtnVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'ghost'
  | 'outline';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const VARIANTS: Record<BtnVariant, string> = {
  primary: 'bg-[#1ADBDE] text-[#0D1116] hover:bg-[#4AE5E8] disabled:hover:bg-[#1ADBDE]',
  secondary: 'bg-[#252B31] text-[#C8D0D6] hover:bg-[#2F363D]',
  success: 'bg-[#3AC7A3] text-[#0D1116] hover:bg-[#52D4B4]',
  warning: 'bg-[#F6A214] text-[#0D1116] hover:bg-[#FFB83A]',
  danger: 'bg-[#D6403E] text-white hover:bg-[#E05553]',
  ghost: 'bg-transparent text-[#8A949C] hover:bg-[#1A2026] hover:text-[#C8D0D6]',
  outline:
    'bg-transparent border border-[#2A3036] text-[#C8D0D6] hover:border-[#1ADBDE]/60 hover:text-white',
};

const SIZES = {
  sm: 'h-7 px-2.5 text-[11px] gap-1',
  md: 'h-8 px-3 text-[12px] gap-1.5',
  lg: 'h-9 px-4 text-[13px] gap-2',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  const { type = 'button', ...btnRest } = rest;
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-md font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1ADBDE] disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...btnRest}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}
