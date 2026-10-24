const SURAH_CACHE_PREFIX = 'wird-warsh-surah-';
const LAST_BACKUP_KEY = 'wird-last-backup';
const LAST_NUDGE_KEY = 'wird-last-nudge';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Saves progress; if the quota is full, drops the re-downloadable surah caches and retries once. */
export function saveItem(key: string, value: string): boolean {
  try { localStorage.setItem(key, value); return true; } catch { /* quota exceeded or blocked */ }
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(SURAH_CACHE_PREFIX))
      .forEach(k => localStorage.removeItem(k));
    localStorage.setItem(key, value);
    return true;
  } catch { return false; }
}

/** Asks the browser not to evict our data automatically when the device runs low on space. */
export function requestPersistentStorage(): void {
  navigator.storage?.persist?.().catch(() => undefined);
}

export function markBackupDone(): void {
  try { localStorage.setItem(LAST_BACKUP_KEY, String(Date.now())); } catch { /* ignore */ }
}

/** True at most once a day, when the last backup is over a week old and there is data worth saving. */
export function shouldNudgeBackup(hasData: boolean): boolean {
  try {
    const last = Number(localStorage.getItem(LAST_BACKUP_KEY));
    if (!last) { localStorage.setItem(LAST_BACKUP_KEY, String(Date.now())); return false; }
    if (!hasData || Date.now() - last < WEEK_MS) return false;
    const day = new Date().toDateString();
    if (localStorage.getItem(LAST_NUDGE_KEY) === day) return false;
    localStorage.setItem(LAST_NUDGE_KEY, day);
    return true;
  } catch { return false; }
}

/** Opens the phone's share sheet (WhatsApp, Drive, mail...) when available, otherwise downloads the file. */
export async function shareOrDownload(json: string, filename: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = new Blob([json], { type: 'application/json' });
  try {
    const file = new File([blob], filename, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'نسخة وِرد الاحتياطية' });
      return 'shared';
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
