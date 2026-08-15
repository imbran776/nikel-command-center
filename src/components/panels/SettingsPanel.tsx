import { useEffect, useState } from 'react';
import { useOps } from '../../contexts/OpsContext';
import type { Locale, ThemeMode } from '../../lib/i18n';
import { GhostBtn, PrimaryBtn } from '../ui/ModalShell';
import { Instagram, Mail } from 'lucide-react';

export default function SettingsPanel() {
  const { settings, updateSettings, setActiveNav, t } = useOps();
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-[var(--border)] bg-[var(--panel)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div>
          <h2 className="text-[13px] font-semibold tracking-[0.1em] text-[var(--text)]">
            {t('settings.title')}
          </h2>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">{t('settings.subtitle')}</p>
        </div>
        <GhostBtn onClick={() => setActiveNav('dashboard')}>{t('settings.back')}</GhostBtn>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="grid max-w-2xl gap-4">
          <section className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] p-3">
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.12em] text-[var(--muted)]">
              {t('settings.site')}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={t('settings.siteCode')}
                value={draft.siteCode}
                onChange={(v) => setDraft((d) => ({ ...d, siteCode: v }))}
              />
              <Field
                label={t('settings.shiftCode')}
                value={draft.shiftCode}
                onChange={(v) => setDraft((d) => ({ ...d, shiftCode: v }))}
              />
            </div>
          </section>

          <section className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] p-3">
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.12em] text-[var(--muted)]">
              {t('settings.admin')}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={t('settings.opsLead')}
                value={draft.opsLead}
                onChange={(v) => setDraft((d) => ({ ...d, opsLead: v }))}
              />
              <div className="flex flex-col justify-end">
                <div className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2.5 py-2 text-[11px] text-[var(--muted)]">
                  {t('settings.role')}:{' '}
                  <span className="text-[var(--text-soft)]">{t('settings.roleValue')}</span>
                  <br />
                  {t('settings.session')}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] p-3">
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.12em] text-[var(--muted)]">
              {t('settings.appearance')}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label htmlFor="settings-locale-select" className="block">
                <span className="mb-1 block text-[10px] tracking-wider text-[var(--muted)]">
                  {t('settings.language')}
                </span>
                <select
                  id="settings-locale-select"
                  name="locale"
                  value={draft.locale}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, locale: e.target.value as Locale }))
                  }
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 text-[12px] text-[var(--text)] outline-none focus:border-[#1ADBDE]"
                >
                  <option value="en">{t('settings.languageEn')}</option>
                  <option value="id">{t('settings.languageId')}</option>
                </select>
                <span className="mt-1 block text-[10px] text-[var(--muted)]">{t('settings.langHint')}</span>
              </label>
              <label htmlFor="settings-theme-select" className="block">
                <span className="mb-1 block text-[10px] tracking-wider text-[var(--muted)]">
                  {t('settings.theme')}
                </span>
                <select
                  id="settings-theme-select"
                  name="theme"
                  value={draft.theme}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, theme: e.target.value as ThemeMode }))
                  }
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 text-[12px] text-[var(--text)] outline-none focus:border-[#1ADBDE]"
                >
                  <option value="dark">{t('settings.themeDark')}</option>
                  <option value="light">{t('settings.themeLight')}</option>
                </select>
                <span className="mt-1 block text-[10px] text-[var(--muted)]">{t('settings.themeHint')}</span>
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] p-3">
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.12em] text-[var(--muted)]">
              {t('settings.telemetry')}
            </h3>
            <div className="space-y-2">
              <Toggle
                label={t('settings.autoRefresh')}
                checked={draft.autoRefresh}
                onChange={(v) => setDraft((d) => ({ ...d, autoRefresh: v }))}
              />
              <Toggle
                label={t('settings.sound')}
                checked={draft.soundAlerts}
                onChange={(v) => setDraft((d) => ({ ...d, soundAlerts: v }))}
              />
              <Toggle
                label={t('settings.contrast')}
                checked={draft.highContrast}
                onChange={(v) => setDraft((d) => ({ ...d, highContrast: v }))}
              />
              <Toggle
                label={t('settings.metric')}
                checked={draft.unitsMetric}
                onChange={(v) => setDraft((d) => ({ ...d, unitsMetric: v }))}
              />
            </div>
          </section>

          <div className="flex gap-2">
            <PrimaryBtn tone="cyan" onClick={() => updateSettings(draft)}>
              {t('settings.save')}
            </PrimaryBtn>
            <PrimaryBtn tone="muted" onClick={() => setDraft(settings)}>
              {t('settings.reset')}
            </PrimaryBtn>
          </div>

          <section className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] p-3">
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.12em] text-[var(--muted)]">
              {t('settings.credits')}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-[var(--muted)]">
                <span className="font-semibold text-[var(--text)]">{t('settings.developedBy')}</span>
                <span className="text-[var(--accent-cyan)]">Imbran Darwis</span>
              </div>
              <a
                href="https://instagram.com/ranzxyz77"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[var(--muted)] hover:text-[var(--accent-cyan)] transition-colors"
              >
                <Instagram className="h-3.5 w-3.5 shrink-0" />
                <span className="underline">@ranzxyz77</span>
              </a>
              <a
                href="mailto:imbrandarwis8@gmail.com"
                className="flex items-center gap-1.5 text-[var(--muted)] hover:text-[var(--accent-amber)] transition-colors"
              >
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="underline truncate">imbrandarwis8@gmail.com</span>
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const fieldId = `settings-field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <label htmlFor={fieldId} className="block">
      <span className="mb-1 block text-[10px] tracking-wider text-[var(--muted)]">{label}</span>
      <input
        id={fieldId}
        name={label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 text-[12px] text-[var(--text)] outline-none focus:border-[#1ADBDE]"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left hover:bg-[var(--hover)]"
    >
      <span className="text-[12px] text-[var(--text-soft)]">{label}</span>
      <span
        className={`relative h-5 w-9 rounded-full transition-colors ${
          checked ? 'bg-[#1ADBDE]' : 'bg-[#2A323A]'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? 'left-4' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  );
}
