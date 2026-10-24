import { Award, CalendarCheck } from 'lucide-react';
import { addDays, ar, isDayComplete, totalUnits, type TrackerState } from '../lib/tracker';

const THUMNS_PER_JUZ = 16;

function monthStats(state: TrackerState, prefix: string) {
  let days = 0, minimal = 0, seconds = 0;
  for (const [key, record] of Object.entries(state.records)) {
    if (!key.startsWith(prefix)) continue;
    seconds += record.seconds;
    if (isDayComplete(record)) { days++; if (record.plan.newHalf) minimal++; }
  }
  return { days, minimal, minutes: Math.round(seconds / 60) };
}

function reflection(days: number) {
  if (days >= 20) return 'مداومة جميلة. ثبّتها بهدوء ولا تستعجل.';
  if (days >= 10) return 'بدأت عادة تتشكّل. استمر بخطوات صغيرة.';
  if (days >= 1) return 'كل يوم تعود فيه نجاح. في الأيام الصعبة يكفيك نصف صفحة مع المراجعة.';
  return 'شهر هادئ. ابدأ بخطوة واحدة اليوم.';
}

/** Quiet progress: juz' milestones and a gentle monthly look-back (no points or rankings). */
export function ProgressNotes({ state, today }: { state: TrackerState; today: string }) {
  const units = totalUnits(state);
  const juz = Math.floor(units / THUMNS_PER_JUZ);
  const into = units % THUMNS_PER_JUZ;
  const monthKey = today.slice(0, 7);
  const prevKey = addDays(`${monthKey}-01`, -1).slice(0, 7);
  const last = monthStats(state, prevKey);
  const showLast = Number(today.slice(8)) <= 7 && last.days > 0;
  const key = showLast ? prevKey : monthKey;
  const stats = showLast ? last : monthStats(state, monthKey);
  const month = new Date(`${key}-15T12:00:00`).toLocaleDateString('ar', { month: 'long' });
  return (
    <section className="progress-notes" aria-label="تقدّمك">
      <div className="pn-card">
        <Award size={20} />
        <div>
          <strong>{juz > 0 ? `${ar(juz)} ${juz === 1 ? 'جزء' : 'أجزاء'} في قلبك` : 'الجزء الأول في الطريق'}</strong>
          <small>{into === 0 && juz > 0 ? 'أتممت جزءًا كاملًا. هنيئًا لك.' : `بقي ${ar(THUMNS_PER_JUZ - into)} من ${ar(THUMNS_PER_JUZ)} أثمان لإتمام الجزء التالي`}</small>
          <div className="pn-bar"><i style={{ width: `${(into / THUMNS_PER_JUZ) * 100}%` }} /></div>
        </div>
      </div>
      <div className="pn-card">
        <CalendarCheck size={20} />
        <div>
          <strong>{showLast ? `حصاد ${month}` : `هذا الشهر · ${month}`}</strong>
          <small>{ar(stats.days)} يومًا مكتملًا · {ar(stats.minutes)} دقيقة{stats.minimal > 0 ? ` · ${ar(stats.minimal)} بنصف صفحة` : ''}</small>
          <p>{reflection(stats.days)}</p>
        </div>
      </div>
    </section>
  );
}
