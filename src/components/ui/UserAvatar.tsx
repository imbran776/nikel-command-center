import { UserRound } from 'lucide-react';

interface UserAvatarProps {
  name?: string;
  initials?: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZES = {
  sm: 'h-7 w-7 text-[9px]',
  md: 'h-8 w-8 text-[10px]',
  lg: 'h-10 w-10 text-[12px]',
  xl: 'h-16 w-16 text-[16px]',
};

export default function UserAvatar({
  name,
  initials,
  src,
  size = 'md',
  className = '',
}: UserAvatarProps) {
  const label =
    initials ||
    (name
      ? name
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((p) => p[0])
          .join('')
          .toUpperCase()
      : '');

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#3A424A] bg-gradient-to-br from-[#5A6570] to-[#2A323A] ${SIZES[size]} ${className}`}
      title={name}
    >
      {src ? (
        <img src={src} alt={name ?? 'User'} className="h-full w-full object-cover" />
      ) : label ? (
        <span className="font-semibold tracking-wide text-[#E8ECEF]">{label}</span>
      ) : (
        <UserRound className="h-[55%] w-[55%] text-[#C8D0D6]" />
      )}
    </div>
  );
}
