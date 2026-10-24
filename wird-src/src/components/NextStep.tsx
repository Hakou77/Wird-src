import { ArrowLeft, CheckCheck } from 'lucide-react';
import { TASK_NAMES, ar, type TaskId } from '../lib/tracker';

// Reviews come first (they are non-negotiable); memorization is the last step of the day.
const ORDER: TaskId[] = ['yesterday', 'near', 'far', 'links', 'recite', 'new'];

/** The first thing on the Today screen: one clear next action. Memorization = a full thumn, or half a page at minimum. */
export function NextStepCard({ tasks, completed, description, half, onStart, onHalf }: {
  tasks: TaskId[];
  completed: TaskId[];
  description: (task: TaskId) => string;
  half: boolean;
  onStart: (task: TaskId) => void;
  onHalf: (on: boolean) => void;
}) {
  const ordered = [...tasks].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  const next = ordered.find(task => !completed.includes(task));
  const done = ordered.filter(task => completed.includes(task)).length;
  if (!next) {
    return (
      <section className="next-step done" aria-label="الخطوة التالية">
        <CheckCheck size={26} />
        <div>
          <strong>{half ? 'اكتمل حدّك الأدنى اليوم' : 'اكتمل وردك اليوم'}</strong>
          <p>بارك الله في سعيك. عُد غدًا بخطوة جديدة.</p>
        </div>
      </section>
    );
  }
  const memorizing = next === 'new';
  return (
    <section className="next-step" aria-label="الخطوة التالية">
      <span className="next-step-eyebrow">خطوتك الآن · {ar(done + 1)} من {ar(ordered.length)}</span>
      <h2>{TASK_NAMES[next]}</h2>
      <p>{description(next)}</p>
      {memorizing && <small>لا يُحتسب يومك إلا بحفظ ثمن، أو نصف صفحة على الأقل مع مراجعتك.</small>}
      <button type="button" className="button button-primary next-step-go" onClick={() => onStart(next)}>
        {memorizing ? (half ? 'ابدأ نصف الصفحة' : 'ابدأ ثمنًا كاملًا') : 'ابدأ'} <ArrowLeft size={17} />
      </button>
      {memorizing && !half && (
        <button type="button" className="text-button next-step-half" onClick={() => { onHalf(true); onStart('new'); }}>
          لا أستطيع ثمنًا اليوم؟ نصف صفحة كحدّ أدنى
        </button>
      )}
      {memorizing && half && (
        <button type="button" className="text-button next-step-half" onClick={() => onHalf(false)}>العودة إلى ثمن كامل</button>
      )}
    </section>
  );
}
