import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useOps, type ToastTone } from '../../contexts/OpsContext';

const TONE: Record<
  ToastTone,
  { border: string; icon: typeof Info; iconColor: string }
> = {
  info: { border: '#1ADBDE', icon: Info, iconColor: '#1ADBDE' },
  success: { border: '#3AC7A3', icon: CheckCircle2, iconColor: '#3AC7A3' },
  warning: { border: '#F6A214', icon: AlertTriangle, iconColor: '#F6A214' },
  critical: { border: '#D6403E', icon: XCircle, iconColor: '#D6403E' },
};

/** Bottom-left toasts — never collide with copilot FAB (bottom-right) */
export default function ToastStack({ offsetRight: _offsetRight = 16 }: { offsetRight?: number }) {
  const { toasts, dismissToast, copilotOpen } = useOps();

  if (!toasts.length) return null;

  return (
    <div
      className={`pointer-events-none fixed bottom-4 z-[80] flex w-[min(320px,calc(100vw-2rem))] flex-col gap-2 ${
        copilotOpen ? 'left-4' : 'left-4'
      }`}
      style={{ maxWidth: 320 }}
    >
      {toasts.map((t) => {
        const conf = TONE[t.tone];
        const Icon = conf.icon;
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex gap-2.5 rounded-lg border border-[#2A3036] bg-[#151A1F]/98 px-3 py-2.5 shadow-2xl backdrop-blur-md"
            style={{ borderLeftWidth: 3, borderLeftColor: conf.border }}
            role="status"
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: conf.iconColor }} />
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold text-[#E8ECEF]">{t.title}</div>
              {t.message && (
                <div className="mt-0.5 text-[11px] leading-snug text-[#8A949C]">{t.message}</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="rounded p-0.5 text-[#5A636C] hover:bg-[#252B31] hover:text-[#C8D0D6]"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
