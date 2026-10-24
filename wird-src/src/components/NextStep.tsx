import { ArrowLeft, CheckCheck, Sparkles } from 'lucide-react';
import { TASK_NAMES, ar, type TaskId } from '../lib/tracker';
import { GeometricPattern, ProgressRing } from './Shared';

// Reviews come first (they are non-negotiable); memorization is the last step of the day.
const ORDER: TaskId[] = ['yesterday', 'near', 'far', 'links', 'recite', 'new'];

/**
 * The one hero of the Today screen: a single headline, the day's progress ring,
 * and exactly one next action with a single primary button.
 * Previously the page stacked a "next step" card and a summary banner — two
 * competing calls to action for the same decision.
 */
export function TodayHero({
  tasks, completed, description, half, isToday, isRest, estimatedUnits,
  onStart, onHalf, onBackToToday, onSeeProgress,
}: {
  tasks: TaskId[];
  completed: TaskId[];
  description: (task: TaskId) => string;
  half: boolean;
  isToday: boolean;
  isRest: boolean;
  /** عدد أثمان اليوم — عدٌّ من جدول الأثمان، لا تقدير بالصفحات. */
  estimatedUnits: number;
  onStart: (task: TaskId) => void;
  onHalf: (on: boolean) => void;
  onBackToToday: () => void;
  onSeeProgress: () => void;
}) {
  const ordered = [...tasks].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  const total = ordered.length;
  const done = ordered.filter(task => completed.includes(task)).length;
  const next = ordered.find(task => !completed.includes(task));
  const percent = total ? Math.round((done / total) * 100) : 0;
  const complete = !next;

  const remaining = total - done;
  const label = complete
    ? half ? 'اكتمل حدّك الأدنى اليوم' : 'اكتمل وردك اليوم'
    : remaining === 1
      ? 'بقيت خطوة واحدة'
      : remaining === 2
        ? 'بقيت خطوتان'
        : `بقيت ${ar(remaining)} خطوات`;
  const sub = complete
    ? 'بارك الله في سعيك. عُد غدًا بخطوة جديدة.'
    : isRest
      ? 'لا حفظ جديد اليوم. نعطي محفوظك حقّه من العناية.'
      : estimatedUnits > 0
        ? `${ar(estimatedUnits)} من الأثمان بين حفظ ومراجعة، على قدر استطاعتك.`
        : 'حفظٌ جديد، ومراجعة تُبقي الآيات قريبة من قلبك.';

  return (
    <section className="today-hero" aria-label="ملخص ورد اليوم">
      <GeometricPattern />
      <div className="hero-body">
        <span className="hero-eyebrow"><Sparkles size={15} /> {complete ? 'بارك الله في سعيك' : isRest ? 'مساحة للرسوخ والتثبيت' : 'على بركة الله'}</span>
        <h2>{label}</h2>
        <p>{sub}</p>

        <div className="hero-next">
          <div className="hero-next-copy">
            {complete ? (
              <>
                <span className="hero-next-label"><CheckCheck size={14} /> {ar(done)} من {ar(total)} خطوات</span>
                <strong>لا شيء متبقٍّ في ورد اليوم</strong>
                <small>يمكنك فتح أي خطوة من الأسفل لمراجعتها، أو تسجيل موضع تثبيت جديد.</small>
              </>
            ) : (
              <>
                <span className="hero-next-label">{isToday ? 'خطوتك الآن' : 'ورد هذا اليوم'} · {ar(done + 1)} من {ar(total)}</span>
                <strong>{TASK_NAMES[next!]}</strong>
                <small>{description(next!)}</small>
              </>
            )}
          </div>
          {!isToday ? (
            <button type="button" className="hero-cta" onClick={onBackToToday}>
              العودة إلى ورد اليوم <ArrowLeft size={16} />
            </button>
          ) : complete ? (
            <button type="button" className="hero-cta" onClick={onSeeProgress}>
              شاهد أثر رحلتك <ArrowLeft size={16} />
            </button>
          ) : (
            <button type="button" className="hero-cta" onClick={() => onStart(next!)}>
              {next === 'new' ? (half ? 'ابدأ نصف الثمن' : 'ابدأ الحفظ') : completed.length ? `أكمل ${TASK_NAMES[next!]}` : 'بسم الله، نبدأ'}
              <ArrowLeft size={16} />
            </button>
          )}
        </div>

        {!complete && next === 'new' && isToday && (
          half
            ? <button type="button" className="hero-link" onClick={() => onHalf(false)}>العودة إلى ثمن كامل</button>
            : <button type="button" className="hero-link" onClick={() => { onHalf(true); onStart('new'); }}>
                لا أستطيع ثمنًا اليوم؟ يكفي نصف ثمن مع مراجعتك
              </button>
        )}
      </div>
      <ProgressRing value={percent} complete={done} total={total} />
    </section>
  );
}
