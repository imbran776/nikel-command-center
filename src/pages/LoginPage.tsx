import {
  Eye,
  EyeOff,
  Lock,
  Mountain,
  Radio,
  Shield,
  UserRound,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { PublicAuthUser } from '../data/authUsers';
import Button from '../components/ui/Button';

function ExcavatorMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M3 18h12v2H3v-2Zm2-6h7l1.5 4H4.5L5 12Zm9.5-1 3-5h2l-2 5h3l1 2h-7l0-2Z"
        fill="currentColor"
      />
      <path d="M14 11c2.5-1 5-4 6.5-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="7" cy="19" r="1.3" fill="currentColor" opacity="0.5" />
      <circle cx="13" cy="19" r="1.3" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

const ROLE_TONE: Record<string, string> = {
  admin: '#F6A214',
  ops_lead: '#1ADBDE',
  dispatcher: '#3AC7A3',
  maintenance: '#F6A214',
  analyst: '#1ADBDE',
};

export default function LoginPage() {
  const { login, loginAsDemo, demoUsers } = useAuth();
  const [email, setEmail] = useState('imbran@mineops.local');
  const [password, setPassword] = useState('admin123');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    // brief delay for industrial “auth handshake” feel
    window.setTimeout(() => {
      const res = login(email, password);
      setLoading(false);
      if (!res.ok) setError(res.error);
    }, 420);
  };

  const pickDemo = (u: PublicAuthUser) => {
    setEmail(u.email);
    const full = demoUsers.find((d) => d.id === u.id);
    // passwords not on public user — map known demo ids
    const pwMap: Record<string, string> = {
      'u-admin': 'admin123',
      'u-ops': 'ops123',
      'u-disp': 'dispatch123',
      'u-maint': 'maint123',
      'u-analyst': 'analyst123',
    };
    setPassword(pwMap[u.id] ?? '');
    setError('');
    if (full) {
      setLoading(true);
      window.setTimeout(() => {
        loginAsDemo(u.id);
        setLoading(false);
      }, 280);
    }
  };

  return (
    <div className="relative flex min-h-screen w-screen overflow-hidden bg-[#0D1116] text-[#E8ECEF]">
      {/* Ambient industrial backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-[420px] w-[420px] rounded-full bg-[#F6A214]/[0.06] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[480px] w-[480px] rounded-full bg-[#1ADBDE]/[0.07] blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(42,48,54,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(42,48,54,0.35) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 lg:flex-row lg:items-center lg:gap-12 lg:px-8">
        {/* Brand panel */}
        <section className="flex-1">
          <div className="mb-6 inline-flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1A2026] ring-1 ring-[#2A3036]">
              <ExcavatorMark className="h-7 w-7 text-[#F6A214]" />
            </div>
            <div>
              <div className="text-[15px] font-semibold tracking-[0.12em] text-[#E8ECEF]">
                MINING COMMAND
              </div>
              <div className="text-[11px] text-[#6A737C]">Central Operations · Fleet Management System</div>
            </div>
          </div>

          <h1 className="max-w-lg text-3xl font-semibold tracking-tight text-[#E8ECEF] sm:text-4xl">
            Secure access for{' '}
            <span className="text-[#1ADBDE]">dispatch</span>,{' '}
            <span className="text-[#F6A214]">maintenance</span> & production control.
          </h1>
          <p className="mt-4 max-w-md text-[13px] leading-relaxed text-[#8A949C]">
            Role-based sessions keep pit boards, work orders, and admin tools isolated by duty.
            Sign in with your site credentials or select an operational role below.
          </p>

          <ul className="mt-8 grid max-w-md gap-3 sm:grid-cols-2">
            {[
              { icon: Radio, t: 'Live operations', d: 'Dispatch & cycle board' },
              { icon: Mountain, t: 'Pit context', d: 'Mine & shift scoped' },
              { icon: Shield, t: 'RBAC enforced', d: 'Module-level access' },
              { icon: Lock, t: 'Shift sessions', d: 'Audit-ready handoff' },
            ].map(({ icon: Icon, t, d }) => (
              <li
                key={t}
                className="flex gap-2.5 rounded-lg border border-[#2A3036] bg-[#12171C]/80 px-3 py-2.5"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#1ADBDE]" />
                <div>
                  <div className="text-[12px] font-semibold text-[#E8ECEF]">{t}</div>
                  <div className="text-[10px] text-[#6A737C]">{d}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Login card */}
        <section className="w-full max-w-md shrink-0">
          <div className="rounded-2xl border border-[#2A3036] bg-[#151A1F]/95 p-6 shadow-2xl backdrop-blur-md">
            <div className="mb-5">
              <h2 className="text-[14px] font-semibold tracking-[0.1em] text-[#E8ECEF]">
                OPERATOR SIGN-IN
              </h2>
              <p className="mt-1 text-[11px] text-[#6A737C]">
                Authenticated channel · Site SSO & RBAC
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-3.5">
              <label htmlFor="login-email" className="block">
                <span className="mb-1 block text-[10px] font-semibold tracking-[0.12em] text-[#6A737C]">
                  EMAIL
                </span>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5A636C]" />
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 w-full rounded-md border border-[#2A3036] bg-[#0D1116] py-2 pl-8 pr-3 text-[13px] text-[#E8ECEF] outline-none placeholder:text-[#5A636C] focus:border-[#1ADBDE]/60"
                    placeholder="name@mineops.local"
                  />
                </div>
              </label>

              <label htmlFor="login-password" className="block">
                <span className="mb-1 block text-[10px] font-semibold tracking-[0.12em] text-[#6A737C]">
                  PASSWORD
                </span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5A636C]" />
                  <input
                    id="login-password"
                    name="password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 w-full rounded-md border border-[#2A3036] bg-[#0D1116] py-2 pl-8 pr-10 text-[13px] text-[#E8ECEF] outline-none placeholder:text-[#5A636C] focus:border-[#1ADBDE]/60"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#5A636C] hover:text-[#A8B0B7]"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              {error && (
                <div className="rounded-md border border-[#D6403E]/40 bg-[#1A1212] px-3 py-2 text-[12px] text-[#D6403E]">
                  {error}
                </div>
              )}

              <Button type="submit" variant="primary" className="h-10 w-full" loading={loading}>
                Enter command center
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#2A3036]" />
              <span className="text-[10px] tracking-wider text-[#5A636C]">OPERATIONAL ROLES</span>
              <div className="h-px flex-1 bg-[#2A3036]" />
            </div>

            <div className="grid gap-2">
              {demoUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => pickDemo(u)}
                  className="flex items-center gap-3 rounded-lg border border-[#2A3036] bg-[#12171C] px-3 py-2 text-left transition-colors hover:border-[#3A424A] hover:bg-[#1A2026]"
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-[#0D1116]"
                    style={{ backgroundColor: ROLE_TONE[u.role] ?? '#1ADBDE' }}
                  >
                    {u.avatarInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-semibold text-[#E8ECEF]">{u.name}</div>
                    <div className="truncate text-[10px] text-[#6A737C]">
                      {u.roleLabel} · {u.site}
                    </div>
                  </div>
                  <span className="text-[9px] font-semibold tracking-wide text-[#1ADBDE]">SIGN IN</span>
                </button>
              ))}
            </div>

            <p className="mt-4 text-center text-[10px] leading-relaxed text-[#4A545C]">
              Credentials: imbran@mineops.local (admin123) · aldi / dani / arsyil / putri (ops123)
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
