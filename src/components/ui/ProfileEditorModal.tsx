import { Camera, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { PublicAuthUser } from '../../data/authUsers';
import type { ProfilePatch } from '../../contexts/AuthContext';
import ModalShell, { GhostBtn, PrimaryBtn } from './ModalShell';
import UserAvatar from './UserAvatar';

interface ProfileEditorModalProps {
  user: PublicAuthUser;
  title?: string;
  onClose: () => void;
  onSave: (patch: ProfilePatch) => void;
}

const MAX_BYTES = 800_000; // ~0.8MB after base64

export default function ProfileEditorModal({
  user,
  title = 'Edit profile',
  onClose,
  onSave,
}: ProfileEditorModalProps) {
  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState<string | null | undefined>(user.avatarUrl);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(user.name);
    setAvatarUrl(user.avatarUrl);
  }, [user]);

  const onFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (PNG, JPG, WebP).');
      return;
    }
    if (file.size > 2_500_000) {
      setError('Image too large. Use a photo under 2.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      if (result.length > MAX_BYTES) {
        setError('Photo is too large after encoding. Try a smaller crop.');
        return;
      }
      setAvatarUrl(result);
      setError('');
    };
    reader.onerror = () => setError('Could not read that file.');
    reader.readAsDataURL(file);
  };

  return (
    <ModalShell
      title={title}
      subtitle={`${user.email} · ${user.roleLabel}`}
      onClose={onClose}
      widthClass="max-w-md"
      footer={
        <>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn
            tone="cyan"
            onClick={() => {
              if (!name.trim()) {
                setError('Display name is required.');
                return;
              }
              onSave({
                name: name.trim(),
                avatarUrl: avatarUrl ?? null,
              });
            }}
          >
            Save profile
          </PrimaryBtn>
        </>
      }
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <UserAvatar
            name={name}
            initials={user.avatarInitials}
            src={avatarUrl}
            size="xl"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-[#2A3036] bg-[#1ADBDE] text-[#0D1116] shadow-lg hover:bg-[#4AE5E8]"
            title="Upload photo"
          >
            <Camera className="h-4 w-4" />
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-md border border-[#2A3036] px-2.5 py-1 text-[11px] font-medium text-[#C8D0D6] hover:border-[#1ADBDE]/50"
          >
            Upload photo
          </button>
          {avatarUrl && (
            <button
              type="button"
              onClick={() => setAvatarUrl(null)}
              className="inline-flex items-center gap-1 rounded-md border border-[#2A3036] px-2.5 py-1 text-[11px] font-medium text-[#D6403E] hover:bg-[#2A1A1A]"
            >
              <Trash2 className="h-3 w-3" /> Remove
            </button>
          )}
        </div>

        <label className="w-full">
          <span className="mb-1 block text-[10px] font-semibold tracking-wider text-[#6A737C]">
            DISPLAY NAME
          </span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            className="w-full rounded-md border border-[#2A3036] bg-[#0D1116] px-3 py-2 text-[13px] text-[#E8ECEF] outline-none focus:border-[#1ADBDE]"
            placeholder="Full name"
            autoFocus
          />
        </label>

        <div className="w-full rounded-md border border-[#2A3036] bg-[#12171C] px-3 py-2 text-[11px] text-[#7A848C]">
          <div>
            Role: <span className="text-[#C8D0D6]">{user.roleLabel}</span>
          </div>
          <div className="mt-0.5">
            Site: <span className="text-[#C8D0D6]">{user.site}</span>
          </div>
        </div>

        {error && (
          <p className="w-full rounded-md border border-[#D6403E]/40 bg-[#2A1515] px-2.5 py-1.5 text-[11px] text-[#F0A0A0]">
            {error}
          </p>
        )}
      </div>
    </ModalShell>
  );
}
