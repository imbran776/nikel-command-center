import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import Button from './Button';

interface ModalShellProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  widthClass?: string;
}

export default function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
  widthClass = 'max-w-md',
}: ModalShellProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#0D1116]/75 backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${widthClass} overflow-hidden rounded-xl border border-[#2A3036] bg-[#151A1F] shadow-2xl`}
      >
        <div className="flex items-start justify-between border-b border-[#2A3036] px-4 py-3">
          <div>
            <h2 className="text-[13px] font-semibold tracking-wide text-[#E8ECEF]">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[11px] text-[#7A848C]">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[#6A737C] hover:bg-[#252B31] hover:text-[#C8D0D6]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-4 py-3">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-[#2A3036] bg-[#12171C] px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function PrimaryBtn({
  children,
  onClick,
  tone = 'cyan',
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: 'cyan' | 'amber' | 'danger' | 'muted';
  disabled?: boolean;
}) {
  const map = {
    cyan: 'primary' as const,
    amber: 'warning' as const,
    danger: 'danger' as const,
    muted: 'secondary' as const,
  };
  return (
    <Button variant={map[tone]} disabled={disabled} onClick={onClick}>
      {children}
    </Button>
  );
}

export function GhostBtn({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Button variant="ghost" onClick={onClick}>
      {children}
    </Button>
  );
}
