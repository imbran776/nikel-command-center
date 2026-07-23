export type Locale = 'en' | 'id';
export type ThemeMode = 'dark' | 'light';

type Dict = Record<string, string>;

const EN: Dict = {
  'settings.title': 'SYSTEM SETTINGS',
  'settings.subtitle': 'Site configuration · session preferences',
  'settings.back': 'Back to dashboard',
  'settings.site': 'SITE IDENTITY',
  'settings.siteCode': 'Site code',
  'settings.shiftCode': 'Shift code',
  'settings.admin': 'ADMINISTRATOR',
  'settings.opsLead': 'Ops lead / Administrator',
  'settings.role': 'Role',
  'settings.roleValue': 'Site Administrator',
  'settings.session': 'Session: authenticated (demo)',
  'settings.appearance': 'APPEARANCE & LANGUAGE',
  'settings.language': 'Interface language',
  'settings.languageEn': 'English',
  'settings.languageId': 'Bahasa Indonesia',
  'settings.theme': 'Color theme',
  'settings.themeDark': 'Dark (operations)',
  'settings.themeLight': 'Light',
  'settings.telemetry': 'TELEMETRY & ALERTS',
  'settings.autoRefresh': 'Auto-refresh live feeds',
  'settings.sound': 'Audible alert chime',
  'settings.contrast': 'High-contrast overlays',
  'settings.metric': 'Metric units (tonnes / km)',
  'settings.save': 'Save settings',
  'settings.reset': 'Reset draft',
  'settings.saved': 'Settings saved',
  'settings.langHint': 'Also applies to Operations Copilot replies.',
  'settings.themeHint': 'Dark is recommended for control rooms; light for office review.',
  'header.search': 'Search unit, operator, location…',
  'header.quick': 'Quick',
  'header.notifications': 'Notifications',
  'header.markAll': 'Mark all read',
  'header.openAlerts': 'Open alerts center',
  'header.profile': 'Operator profile',
  'header.settings': 'System settings',
  'header.signOut': 'Sign out',
  'header.sessionEnded': 'Session ended',
  'copilot.title': 'Ops Copilot',
  'copilot.online': 'Operations Copilot online',
  'copilot.placeholder': 'Ask about fleet, alerts, production…',
  'copilot.send': 'Send',
  'copilot.thinking': 'Thinking…',
  'copilot.welcomeBody':
    'I can navigate modules, search fleet data, explain KPIs, prioritize alerts, and draft shift actions.',
  'copilot.shortcut': '**Ctrl + Space** toggles this panel.',
};

const ID: Dict = {
  'settings.title': 'PENGATURAN SISTEM',
  'settings.subtitle': 'Konfigurasi site · preferensi sesi',
  'settings.back': 'Kembali ke dashboard',
  'settings.site': 'IDENTITAS SITE',
  'settings.siteCode': 'Kode site',
  'settings.shiftCode': 'Kode shift',
  'settings.admin': 'ADMINISTRATOR',
  'settings.opsLead': 'Ops lead / Administrator',
  'settings.role': 'Peran',
  'settings.roleValue': 'Administrator Site',
  'settings.session': 'Sesi: terautentikasi (demo)',
  'settings.appearance': 'TAMPILAN & BAHASA',
  'settings.language': 'Bahasa antarmuka',
  'settings.languageEn': 'English',
  'settings.languageId': 'Bahasa Indonesia',
  'settings.theme': 'Tema warna',
  'settings.themeDark': 'Gelap (operasi)',
  'settings.themeLight': 'Terang',
  'settings.telemetry': 'TELEMETRI & PERINGATAN',
  'settings.autoRefresh': 'Auto-refresh feed live',
  'settings.sound': 'Suara peringatan',
  'settings.contrast': 'Overlay kontras tinggi',
  'settings.metric': 'Satuan metrik (ton / km)',
  'settings.save': 'Simpan pengaturan',
  'settings.reset': 'Reset draf',
  'settings.saved': 'Pengaturan disimpan',
  'settings.langHint': 'Juga berlaku untuk jawaban Operations Copilot.',
  'settings.themeHint': 'Mode gelap disarankan di control room; terang untuk review kantor.',
  'header.search': 'Cari unit, operator, lokasi…',
  'header.quick': 'Cepat',
  'header.notifications': 'Notifikasi',
  'header.markAll': 'Tandai semua dibaca',
  'header.openAlerts': 'Buka pusat peringatan',
  'header.profile': 'Profil operator',
  'header.settings': 'Pengaturan sistem',
  'header.signOut': 'Keluar',
  'header.sessionEnded': 'Sesi berakhir',
  'copilot.title': 'Ops Copilot',
  'copilot.online': 'Operations Copilot aktif',
  'copilot.placeholder': 'Tanya tentang armada, alert, produksi…',
  'copilot.send': 'Kirim',
  'copilot.thinking': 'Memproses…',
  'copilot.welcomeBody':
    'Saya bisa membuka modul, mencari data armada, menjelaskan KPI, memprioritaskan alert, dan menyusun aksi shift.',
  'copilot.shortcut': '**Ctrl + Spasi** membuka/menutup panel ini.',
};

const TABLES: Record<Locale, Dict> = { en: EN, id: ID };

export function t(locale: Locale, key: string): string {
  return TABLES[locale][key] ?? TABLES.en[key] ?? key;
}

export function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle('theme-light', theme === 'light');
  root.classList.toggle('theme-dark', theme === 'dark');
}

const STORAGE_KEY = 'mineops_fms_prefs_v1';

export function loadPrefs(): { locale: Locale; theme: ThemeMode } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { locale: 'en', theme: 'dark' };
    const parsed = JSON.parse(raw) as { locale?: Locale; theme?: ThemeMode };
    return {
      locale: parsed.locale === 'id' ? 'id' : 'en',
      theme: parsed.theme === 'light' ? 'light' : 'dark',
    };
  } catch {
    return { locale: 'en', theme: 'dark' };
  }
}

export function savePrefs(locale: Locale, theme: ThemeMode) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ locale, theme }));
  } catch {
    /* ignore */
  }
}
