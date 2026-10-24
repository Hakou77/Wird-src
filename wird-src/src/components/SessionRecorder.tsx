import { useEffect, useRef, useState } from 'react';
import { CircleCheck, Mic, Square, TriangleAlert } from 'lucide-react';
import {
  downloadRecitation, errorMessage, recorderSupport, saveRecitation, startRecording,
  type Recitation, type RecitationPart, type SavedRecitation, type ReciteError, type ReciteTaskId,
} from '../lib/recorder';

function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * زر التسجيل المستقل عن مؤقت التفرّغ:
 * يفتح الميكروفون، ويسجّل تسميعك، وعند الإيقاف يحفظه في مكتبة الجهاز (IndexedDB).
 * لا يلمس المؤقت إطلاقًا — يمكن تشغيل أحدهما دون الآخر.
 */
export function SessionRecorder({ date, task, onSaved }: {
  date: string;
  task: ReciteTaskId;
  onSaved?: (record: Recitation) => void;
}) {
  const support = useRef(recorderSupport()).current;
  const [status, setStatus] = useState<'idle' | 'requesting' | 'recording' | 'stopping'>('idle');
  const [error, setError] = useState<ReciteError | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [lastSaved, setLastSaved] = useState<SavedRecitation | null>(null);
  const stopRef = useRef<(() => Promise<RecitationPart>) | null>(null);
  const metaRef = useRef({ date, task });
  metaRef.current = { date, task };

  useEffect(() => {
    if (status !== 'recording') return;
    const interval = window.setInterval(() => setSeconds(value => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [status]);

  useEffect(() => () => {
    // عند إغلاق الجلسة أو تبديل خطوتها: نوقف الميكروفون فورًا ونحفظ ما سُجّل.
    const stop = stopRef.current;
    stopRef.current = null;
    if (!stop) return;
    void stop()
      .then(part => (part.durationMs >= 500 ? saveRecitation(part, metaRef.current.date, metaRef.current.task) : null))
      .catch(() => undefined);
  }, []);

  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  async function begin() {
    if (status === 'requesting' || status === 'recording') return;
    setStatus('requesting');
    setError(null);
    try {
      const rec = await startRecording();
      // The session was closed while the permission prompt was open: release the microphone right away.
      if (!mountedRef.current) { void rec.stop().catch(() => undefined); return; }
      stopRef.current = rec.stop;
      setSeconds(0);
      setStatus('recording');
    } catch (err) {
      stopRef.current = null;
      setStatus('idle');
      setError((err as { recite?: ReciteError })?.recite || 'unknown');
    }
  }

  async function finish() {
    const stop = stopRef.current;
    if (!stop) { setStatus('idle'); return; }
    stopRef.current = null;
    setStatus('stopping');
    try {
      const part = await stop();
      const record = await saveRecitation(part, date, task);
      setLastSaved(record);
      onSaved?.(record);
      if (record.persisted) window.setTimeout(() => setLastSaved(null), 5000);
    } catch {
      setError('unknown');
    } finally {
      setStatus('idle');
      setSeconds(0);
    }
  }

  if (!support.supported) {
    return (
      <div className="recorder-block recorder-unsupported" role="note">
        <span className="recorder-kicker"><TriangleAlert size={14} /> تسجيل التسميع</span>
        <p>{errorMessage(support.reason || 'unsupported')}</p>
      </div>
    );
  }

  const busy = status === 'requesting' || status === 'stopping';
  const toggle = () => { if (status === 'recording') void finish(); else void begin(); };
  return (
    <div className="recorder-block" role="group" aria-label="تسجيل التسميع">
      <div className="recorder-row">
        <span className="recorder-kicker"><Mic size={14} /> تسجيل التسميع</span>
        <div className="recorder-controls">
          {status === 'recording' && <strong className="recorder-clock" dir="ltr">{formatClock(seconds)}</strong>}
          <button
            type="button"
            className={`icon-button recorder-btn ${status === 'recording' ? 'recording' : ''}`}
            disabled={busy}
            onClick={toggle}
            aria-label={status === 'recording' ? 'إيقاف التسجيل وحفظه' : 'بدء تسجيل التسميع'}
            aria-pressed={status === 'recording'}
          >
            {status === 'recording' ? <Square size={15} /> : <Mic size={15} />}
          </button>
        </div>
      </div>
      {status === 'recording' && <p className="recorder-hint">يسجّل الآن — يمكنك تشغيل مؤقت التفرّغ معه، والتوقف متى شئت.</p>}
      {status === 'requesting' && <p className="recorder-hint">جارٍ فتح الميكروفون…</p>}
      {error && (
        <p className="recorder-error" role="alert">
          {errorMessage(error)}
          <button type="button" className="text-button" onClick={() => { setError(null); void begin(); }}>أعد المحاولة</button>
        </p>
      )}
      {lastSaved && (
        <p className={lastSaved.persisted ? 'recorder-saved' : 'recorder-error'} role={lastSaved.persisted ? 'status' : 'alert'}>
          {lastSaved.persisted
            ? <><CircleCheck size={14} /> حُفظ التسجيل في مكتبة الجهاز</>
            : <>تعذّر الحفظ داخل الجهاز. نزّل نسخة الآن حتى لا يضيع التسجيل.</>}
          <button type="button" className="text-button" onClick={() => downloadRecitation(lastSaved)}>تنزيل نسخة</button>
        </p>
      )}
    </div>
  );
}
