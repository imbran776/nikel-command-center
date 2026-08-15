/** Client-side export helpers — later swap for signed Railway API downloads */

export function buildCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\r\n');
}

/**
 * Attempt a standard browser file download.
 */
export function triggerBrowserDownload(
  filename: string,
  content: string,
  mime = 'text/csv;charset=utf-8',
): boolean {
  try {
    // BOM helps Excel open UTF-8 CSV correctly
    const bom = mime.includes('csv') ? '\uFEFF' : '';
    const blob = new Blob([bom + content], { type: mime });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    // delay revoke so the browser can start the download
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1500);
    return true;
  } catch {
    return false;
  }
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = buildCsv(headers, rows);
  triggerBrowserDownload(filename, csv, 'text/csv;charset=utf-8');
  return csv;
}

export function downloadJson(filename: string, data: unknown) {
  const text = JSON.stringify(data, null, 2);
  triggerBrowserDownload(filename, text, 'application/json;charset=utf-8');
  return text;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export function stampFilename(prefix: string, ext: string) {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${prefix}_${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}_${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}Z.${ext}`;
}

/** Generate a short invite code for device onboarding (e.g., INV-ABC123) */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing chars
  let code = 'INV-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
