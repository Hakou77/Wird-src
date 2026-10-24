export type ReciteError = 'unsupported' | 'insecure' | 'denied' | 'busy' | 'unknown';

export type ReciteStatus = 'idle' | 'requesting' | 'recording' | 'stopping';

export const RECITE_TASK_IDS = ['yesterday', 'new', 'near', 'far', 'links', 'recite'] as const;
export type ReciteTaskId = (typeof RECITE_TASK_IDS)[number];

export interface Recitation {
  id: string;
  date: string;
  task: ReciteTaskId;
  createdAt: number;
  durationMs: number;
  mime: string;
  blob: Blob;
}

export const RECITE_DB = 'wird-recitations';
const STORE = 'audio';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no-idb')); return; }
    const request = indexedDB.open(RECITE_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('idb-open'));
  });
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('idb-request'));
  });
}

/** هل يدعم المتصفح التسجيل الصوتي في هذا السياق؟ */
export function recorderSupport(): { supported: boolean; secure: boolean; reason?: ReciteError } {
  const secure = typeof window !== 'undefined'
    && (window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'file:');
  const hasGetUserMedia = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
  if (!secure) return { supported: false, secure, reason: 'insecure' };
  if (!hasGetUserMedia || !hasMediaRecorder) return { supported: false, secure, reason: 'unsupported' };
  return { supported: true, secure };
}

const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
];

export function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const mime of MIME_CANDIDATES) {
    try { if (MediaRecorder.isTypeSupported(mime)) return mime; } catch { /* تجربة التالية */ }
  }
  return '';
}

export function errorMessage(error: ReciteError, kind: 'notice' | 'hint' = 'notice'): string {
  if (kind === 'hint') {
    return error === 'denied' ? 'لم يُسمح بالميكروفون من المتصفح.'
      : error === 'insecure' ? 'الميكروفون يحتاج https أو فتح الملف محليًا.'
      : 'التسجيل غير متاح في هذا المتصفح.';
  }
  return error === 'denied'
    ? 'تعذّر فتح الميكروفون. اسمح له من إعدادات المتصفح ثم أعد المحاولة — أو استخدم مؤقت التفرغ وحده.'
    : error === 'insecure'
      ? 'هذا السياق لا يسمح بالميكروفون. افتح التطبيق عبر https أو محليًا، أو استعمل مؤقت التفرغ وحده.'
      : error === 'unsupported'
        ? 'متصفحك لا يدعم التسجيل الصوتي. مؤقت التفرغ يعمل وحده.'
        : 'تعذّر بدء التسجيل. أعد المحاولة بعد قليل.';
}

/** يبدأ التسجيل ويعيد وظيفة الإيقاف. يلتقط أخطاء الأذونات بوضوح. */
export async function startRecording(): Promise<{ stop: () => Promise<RecitationPart>; mimeType: string }> {
  const support = recorderSupport();
  if (!support.supported) throw Object.assign(new Error('support'), { recite: support.reason as ReciteError });
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
    });
  } catch (err) {
    const name = (err as { name?: string })?.name;
    const recite: ReciteError = name === 'NotAllowedError' || name === 'SecurityError'
      ? 'denied' : name === 'NotFoundError' ? 'unknown' : 'busy';
    throw Object.assign(new Error('getUserMedia'), { recite });
  }
  const mimeType = pickMime();
  let recorder: MediaRecorder;
  try {
    recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  } catch {
    stream.getTracks().forEach(track => track.stop());
    throw Object.assign(new Error('media-recorder'), { recite: 'unsupported' as ReciteError });
  }
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = event => { if (event.data && event.data.size) chunks.push(event.data); };
  const startedAt = Date.now();
  try { recorder.start(1000); } catch {
    stream.getTracks().forEach(track => track.stop());
    throw Object.assign(new Error('media-recorder'), { recite: 'unknown' as ReciteError });
  }
  const stopped = new Promise<void>(resolve => { recorder.onstop = () => resolve(); });
  return {
    mimeType: recorder.mimeType || mimeType || 'audio/webm',
    stop: async () => {
      if (recorder.state !== 'inactive') recorder.stop();
      await stopped;
      stream.getTracks().forEach(track => track.stop());
      const blob = new Blob(chunks, { type: (recorder.mimeType || mimeType || 'audio/webm').split(';')[0] });
      return { blob, durationMs: Date.now() - startedAt, mimeType: recorder.mimeType || mimeType };
    },
  };
}

export interface RecitationPart { blob: Blob; durationMs: number; mimeType: string }

export type SavedRecitation = Recitation & { persisted: boolean };

async function withDb<T>(fn: (db: IDBDatabase) => Promise<T>): Promise<T> {
  const db = await openDb();
  try { return await fn(db); } finally { db.close(); }
}

/** Resolves only once the transaction is committed, which is when quota errors actually surface. */
function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error || new Error('idb-abort'));
    tx.onerror = () => reject(tx.error || new Error('idb-tx'));
  });
}

export async function saveRecitation(part: RecitationPart, date: string, task: ReciteTaskId): Promise<SavedRecitation> {
  const record: Recitation = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date,
    task,
    createdAt: Date.now(),
    durationMs: part.durationMs,
    mime: part.mimeType,
    blob: part.blob,
  };
  try {
    await withDb(db => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(record);
      return transactionDone(tx);
    });
    return { ...record, persisted: true };
  } catch {
    // Storage may be blocked or full: report it so the UI can offer a download instead of claiming it was saved.
    return { ...record, persisted: false };
  }
}

export async function listRecitations(): Promise<Recitation[]> {
  try {
    const rows = await withDb(db => promisify(db.transaction(STORE, 'readonly').objectStore(STORE).getAll()));
    return (rows as Recitation[])
      .filter(row => row && typeof row.id === 'string' && row.blob instanceof Blob)
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function deleteRecitation(id: string): Promise<void> {
  try {
    await withDb(db => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      return transactionDone(tx);
    });
  } catch {
    /* nothing to delete */
  }
}

export function recitationExt(mime: string): string {
  if (mime.includes('mp4')) return 'm4a';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  return 'webm';
}

export function downloadRecitation(record: Recitation, filename?: string) {
  const name = filename || `wird-${record.date}-${record.task}-${record.id.slice(0, 6)}.${recitationExt(record.mime)}`;
  const url = URL.createObjectURL(record.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
