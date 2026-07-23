/**
 * Download packaged full project source from /public.
 *
 * ⚠️ DEVELOPER NOTICE (do not ignore at handoff):
 * Remove the "Download source code" profile menu item before production /
 * client delivery. This ships the full project zip for demo convenience only
 * and must not remain on live mine-site deployments.
 */

export const SOURCE_ZIP_PATH = '/mining-command-fms-source.zip';
export const SOURCE_ZIP_FILENAME = 'mining-command-fms-source.zip';

/**
 * Triggers browser download of the full source zip.
 * Prefer blob download (works when same-origin); falls back to direct href.
 */
export async function downloadProjectSourceZip(): Promise<void> {
  try {
    const res = await fetch(SOURCE_ZIP_PATH, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Source package not found (${res.status})`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    triggerAnchorDownload(url, SOURCE_ZIP_FILENAME);
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch {
    // Fallback: navigate/download via static URL
    triggerAnchorDownload(SOURCE_ZIP_PATH, SOURCE_ZIP_FILENAME);
  }
}

function triggerAnchorDownload(href: string, filename: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
