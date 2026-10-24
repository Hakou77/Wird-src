import { ProgressNotes } from './ProgressNotes';
import { useEffect, useState } from 'react';
import {
  ArrowLeft, BookOpen, Check, CircleHelp, Flame, Moon, Pause, Play, RefreshCw, Sparkles, Sun, X, Zap,
} from 'lucide-react';
import {
  ar, READ_GAP_MS, formatDate, farTrendErrors, hizbHealth, hizbReviewHistory, readingAnalytics,
  thumnErrorsInWindow, thumnLabelShort, totalUnits,
  type DailyPlan, type DayRecord, type Difficulty, type HizbHealth, type TrackerState, type TaskId,
} from '../lib/tracker';
import { HIZBS, SURAHS, fromThumnId, hizbLabel, hizbPageSpan, mushafHizbToPath, pathHizbToMushaf, thumnId, toAr, RIWAYAH } from '../data/quran';
import WarshReader from './WarshReader';

const DIFFICULTIES: { id: Difficulty; label: string; hint: string }[] = [
  { id: 'easy', label: 'سهل', hint: 'معروف، أتقنته' },
  { id: 'medium', label: 'متوسط', hint: 'يحتاج تثبيتًا' },
  { id: 'hard', label: 'صعب', hint: 'متشابهات أو جديد' },
];

function currentSectionId(): string {
  const hour = new Date().getHours();
  if (hour >= 3 && hour < 9) return 'الفجر';
  if (hour >= 9 && hour < 15) return 'الضحى / الظهر';
  if (hour >= 15 && hour < 20) return 'العصر / المغرب';
  if (hour >= 20 || hour < 3) return 'قبل النوم';
  return '';
}

export function TimeMark({ label }: { label: string }) {
  const isNow = label !== 'أسبوعي' && label === currentSectionId();
  return (
    <div className={`time-mark ${isNow ? 'is-now' : ''}`}>
      <span>{label}</span>
      {isNow && <em className="now-badge">الآن</em>}
    </div>
  );
}

export function ReadsCounter({
  record, required, onRead, onDifficulty, blockedHint,
}: {
  record: DayRecord;
  required: number;
  onRead: () => void;
  onDifficulty: (d: Difficulty) => void;
  blockedHint: string | null;
}) {
  const reads = record.reads;
  const quality = reads - required;
  return (
    <div className="reads-block">
      <div className="reads-header">
        <span className="reads-title"><BookOpen size={15} /> اقرأه من المصحف بتمعن</span>
        <span className="reads-progress">{ar(reads)} / {ar(required)} <small>قراءات مطلوبة</small></span>
      </div>
      <div className="reads-difficulty" role="radiogroup" aria-label="صعوبة الثمن">
        {DIFFICULTIES.map(d => (
          <button
            key={d.id}
            type="button"
            role="radio"
            aria-checked={record.difficulty === d.id}
            className={`diff-chip ${record.difficulty === d.id ? 'selected' : ''}`}
            onClick={() => onDifficulty(d.id)}
          >
            <strong>{d.label}</strong>
            <small>{d.hint}</small>
          </button>
        ))}
      </div>
      <div className="reads-counter">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            className={`read-dot ${n <= reads ? 'filled' : ''} ${n === reads + 1 ? 'next' : ''}`}
            onClick={onRead}
            disabled={n <= reads}
            aria-label={`القراءة ${ar(n)}`}
          >
            {n <= reads ? <Check size={14} /> : ar(n)}
          </button>
        ))}
      </div>
      <p className="reads-hint">
        {blockedHint
          ? blockedHint
          : reads < required
            ? 'اقرأ بتمعن وتجويد، لا نقراً سريعاً — كل قراءة تخدم التسميع الغيبي.'
            : quality <= 0
              ? 'وصلت للحد الأدنى. قراءة زائدة تشتري أمان الغد.'
              : `إتقان راسخ: زائدة ${ar(quality)} عن المطلوب.`}
      </p>
      <div className="science-note">
        <Sparkles size={14} />
        <span>٣ قراءات مركّزة + تسميع بعد الفجر + تسميع قبل النوم = ٣ تلامسات متباعدة — هذا ما يقيسه النظام.</span>
      </div>
    </div>
  );
}

export function YesterdayErrors({
  value, onPick,
}: {
  value: 0 | 1 | 2 | null;
  onPick: (errors: 0 | 1 | 2) => void;
}) {
  const options: { v: 0 | 1 | 2; label: string; danger?: boolean }[] = [
    { v: 0, label: 'بلا خطأ' },
    { v: 1, label: 'خطأ / اثنان' },
    { v: 2, label: 'أكثر', danger: true },
  ];
  return (
    <div className="error-counter">
      <div>
        <strong>كيف كان التسميع؟</strong>
        <span>عدد مرات التوقف أو الخطأ</span>
      </div>
      <div className="error-options">
        {options.map(o => (
          <button
            key={o.v}
            type="button"
            className={`${value === o.v ? 'selected' : ''} ${o.danger && value === o.v ? 'danger' : ''}`}
            onClick={() => onPick(o.v)}
            aria-pressed={value === o.v}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function NearGrid({
  plan, record, onCycle, onMarkAll,
}: {
  plan: DailyPlan;
  record: DayRecord;
  onCycle: (id: number) => void;
  onMarkAll: () => void;
}) {
  const hizbs = [...new Set(plan.nearThumns.map(id => fromThumnId(id).hizb))];
  const marked = plan.nearThumns.filter(id => record.nearMarks[id]).length;
  const allDone = plan.nearThumns.length > 0 && marked === plan.nearThumns.length;
  if (!plan.nearThumns.length) {
    return <p className="reads-hint">لا مراجعة قريبة بعد أول حزب مكتمل.</p>;
  }
  return (
    <div className="near-grid-block">
      <div className="near-grid-header">
        <div>
          <span className="reads-title"><RefreshCw size={15} /> اضغط للتسميع — ثانية لموضع ضعيف</span>
          <p>{ar(marked)} / {ar(plan.nearThumns.length)} ثمن</p>
        </div>
        <button type="button" className="text-button" onClick={onMarkAll}>
          {allDone ? 'إلغاء الكل' : 'تمّت كل الأثمان'}
        </button>
      </div>
      <div className="near-hizb-groups">
        {hizbs.map(h => (
          <div key={h} className="near-hizb-group">
            <div className="near-hizb-label">
              <strong>الحزب {ar(h)}</strong>
              <small>{hizbLabel(h)}</small>
            </div>
            <div className="near-thumns">
              {Array.from({ length: 8 }, (_, i) => i + 1).map(t => {
                const id = thumnId(h, t);
                const included = plan.nearThumns.includes(id);
                const mark = record.nearMarks[id];
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={!included}
                    onClick={() => included && onCycle(id)}
                    className={`thumn-cell ${!included ? 'off' : ''} ${mark === 'done' ? 'done' : ''} ${mark === 'weak' ? 'weak' : ''}`}
                    aria-label={`${thumnLabelShort(id)}${mark ? ` — ${mark === 'done' ? 'تم' : 'ضعيف'}` : ''}`}
                  >
                    {toAr(t)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="near-legend">
        <span><i className="dot done" /> تمّ التسميع</span>
        <span><i className="dot weak" /> موضع ضعيف — يعود غدًا في ورد إضافي</span>
      </div>
    </div>
  );
}

export function WeakExtraCard({
  plan, onClear,
}: {
  plan: DailyPlan;
  onClear: (unit: number) => void;
}) {
  if (!plan.weakExtra.length) return null;
  return (
    <section className="weak-extra-card" aria-label="ورد إضافي">
      <div className="weak-extra-head">
        <span className="weak-kicker"><Flame size={14} /> ورد إضافي</span>
        <p>المواضع التي تكررت فيها الأخطاء — مرة إضافية اليوم.</p>
      </div>
      <div className="weak-chips">
        {plan.weakExtra.map(id => (
          <button key={id} type="button" className="weak-chip" onClick={() => onClear(id)}>
            <span>{thumnLabelShort(id)}</span>
            <Check size={13} />
          </button>
        ))}
      </div>
    </section>
  );
}

export function ErrorChips({
  thumns, errors, onInc, onReset,
}: {
  thumns: number[];
  errors: Record<number, number>;
  onInc: (id: number) => void;
  onReset: (id: number) => void;
}) {
  if (!thumns.length) return null;
  const groups = new Map<number, number[]>();
  for (const id of thumns) {
    const { hizb } = fromThumnId(id);
    const list = groups.get(hizb) || [];
    list.push(id);
    groups.set(hizb, list);
  }
  const total = thumns.reduce((sum, id) => sum + (errors[id] || 0), 0);
  return (
    <div className="error-chips" aria-label="أخطاء التسميع لكل ثمن">
      <div className="error-chips-head">
        <span>أخطاء التسميع</span>
        {total > 0 ? <strong className="error-chips-total">{ar(total)}</strong> : <span>· بلا شيء</span>}
        <small>{total > 0 ? 'انقر مطوّلًا للتصفير' : 'انقر الثمن عند كل خطأ'}</small>
      </div>
      {[...groups.entries()].map(([hizb, list]) => (
        <div key={hizb} className="error-chips-row">
          {groups.size > 1 && <span className="error-chips-hizb">ح{ar(hizb)}</span>}
          <div className="error-chips-grid">
            {list.map(id => {
              const count = errors[id] || 0;
              const { thumn } = fromThumnId(id);
              let hold: number | null = null;
              return (
                <button
                  key={id}
                  type="button"
                  className={`thumn-error-chip ${count ? 'has-error' : ''}`}
                  aria-label={`${thumnLabelShort(id)}${count ? `، ${count} أخطاء` : ''}`}
                  onClick={() => onInc(id)}
                  onContextMenu={event => { event.preventDefault(); onReset(id); }}
                  onPointerDown={() => { hold = window.setTimeout(() => onReset(id), 550); }}
                  onPointerUp={() => { if (hold) window.clearTimeout(hold); }}
                  onPointerLeave={() => { if (hold) window.clearTimeout(hold); }}
                >
                  {toAr(thumn)}
                  {count > 0 && <i>{ar(count)}</i>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TaskNote({ task, value, onChange }: {
  task: TaskId;
  value: string;
  onChange: (text: string) => void;
}) {
  return (
    <label className="task-note">
      <span>ملاحظة لهذه الخطوة <em>اختياري</em></span>
      <textarea
        rows={2}
        maxLength={1500}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder="موضع يحتاج عناية، أو تذكير لغد..."
        data-task={task}
      />
    </label>
  );
}

export type CoachTip = { id: string; title: string; body: string; tone?: 'warm' | 'calm' };

export function CoachBanners({ tips, onDismiss }: { tips: CoachTip[]; onDismiss: (id: string) => void }) {
  if (!tips.length) return null;
  return (
    <div className="coach-banners">
      {tips.map(tip => (
        <article key={tip.id} className={`coach-banner ${tip.tone || 'calm'}`}>
          <div>
            <strong>{tip.title}</strong>
            <p>{tip.body}</p>
          </div>
          <button type="button" className="icon-button" aria-label="إخفاء التذكير" onClick={() => onDismiss(tip.id)}>
            <X size={15} />
          </button>
        </article>
      ))}
    </div>
  );
}

export function buildCoachTips(state: TrackerState, today: string, dueCount: number): CoachTip[] {
  const tips: CoachTip[] = [];
  const farBad = farTrendErrors(state, today);
  if (farBad !== null && farBad >= 2) {
    tips.push({
      id: `far-trend:${today}`,
      tone: 'warm',
      title: 'البعيدة تعلّمك من أين تبدأ',
      body: 'تكرّرت أخطاء في المراجعة البعيدة. خفّف المقدار يومين، وابدأ من مواضعك الضعيفة قبل الحفظ الجديد.',
    });
  }
  if (dueCount >= 3) {
    tips.push({
      id: `due:${today}`,
      title: 'مواضع كثيرة تستحق عناية',
      body: 'امنح كل موضع ثانية واحدة اليوم. التثبيت يأتي بالعودة، لا بالحفظ الجديد.',
    });
  }
  const yesterday = state.records[Object.keys(state.records).sort().filter(d => d < today).pop() || ''];
  if (yesterday && yesterday.completed.includes('far') && yesterday.errors >= 2) {
    tips.push({
      id: `redo:${today}`,
      tone: 'warm',
      title: 'أعد البعيدة بهدوء',
      body: 'أخطاء الأمس تنتظر إصلاحًا قبل الحفظ. قصّر المسافة، وأتقن القليل.',
    });
  }
  return tips.filter(tip => state.dismissed[tip.id] !== today);
}

const HEALTH_META: Record<HizbHealth, { label: string; className: string }> = {
  good: { label: 'متين', className: 'good' },
  ok: { label: 'مقبول', className: 'ok' },
  weak: { label: 'يحتاج تقوية', className: 'weak' },
  none: { label: 'لم يُحفظ بعد', className: 'none' },
};

export function MapPage({ state, today, onAddMistake }: {
  state: TrackerState;
  today: string;
  onAddMistake: () => void;
}) {
  const [openHizb, setOpenHizb] = useState<number | null>(null);
  const units = totalUnits(state);
  const completedPath = Math.floor(units / 8);
  const counts = { good: 0, ok: 0, weak: 0, none: 0 };
  for (let path = 1; path <= 60; path++) {
    const mushaf = pathHizbToMushaf(path);
    if (path > completedPath) { counts.none++; continue; }
    counts[hizbHealth(state, today, mushaf)]++;
  }
  return (
    <div className="subpage map-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">خريطة محفوظك</span>
          <h1>محفوظي</h1>
          <p>صحة كل حزب بمعايير ورش — ابدأ من الحزب ٦٠ نحو الفاتحة.</p>
        </div>
        <button className="button button-outline" onClick={onAddMistake}><Flame size={16} /> سجّل موضعًا ضعيفًا</button>
      </div>
      <ProgressNotes state={state} today={today} />
      <section className="map-health" aria-label="صحة المحفوظ">
        <div className="map-health-bar">
          {(['good', 'ok', 'weak'] as const).map(key => counts[key] ? (
            <i key={key} className={`h-${key}`} style={{ width: `${(counts[key] / Math.max(1, completedPath)) * 100}%` }} />
          ) : null)}
        </div>
        <div className="map-health-legend">
          {(['good', 'ok', 'weak', 'none'] as const).map(key => (
            <span key={key}><i className={`dot ${key}`} /> {HEALTH_META[key].label} {ar(counts[key])}</span>
          ))}
        </div>
      </section>
      <div className="map-grid" role="list">
        {Array.from({ length: 60 }, (_, i) => 60 - i).map(mushaf => {
          const path = mushafHizbToPath(mushaf);
          const memorized = path <= completedPath;
          const health = memorized ? hizbHealth(state, today, mushaf) : 'none';
          return (
            <button
              key={mushaf}
              type="button"
              role="listitem"
              className={`map-cell ${memorized ? 'memorized' : ''} h-${health}`}
              disabled={!memorized}
              onClick={() => memorized && setOpenHizb(mushaf)}
              aria-label={`الحزب ${mushaf}${memorized ? `، ${HEALTH_META[health as HizbHealth].label}` : ''}`}
            >
              <div className="map-cell-top">
                <strong>{toAr(mushaf)}</strong>
                {memorized && <i className={`health-dot ${health}`} />}
              </div>
              <span>{hizbLabel(mushaf).split(' · ')[0]}</span>
              <div className="map-eighths">
                {Array.from({ length: 8 }, (_, t) => (
                  <i key={t} className={(path - 1) * 8 + t + 1 <= units ? 'on' : ''} />
                ))}
              </div>
            </button>
          );
        })}
      </div>
      <p className="map-hint">اضغط أي حزب محفوظ لتفاصيل ثمانه وتاريخ المراجعة.</p>
      {openHizb !== null && (
        <div className="hizb-sheet-backdrop" role="presentation" onClick={() => setOpenHizb(null)}>
          <aside className="hizb-sheet" role="dialog" aria-label={`تفاصيل الحزب ${openHizb}`} onClick={event => event.stopPropagation()}>
            <header>
              <div>
                <h2>الحزب {toAr(openHizb)}</h2>
                <p>{hizbLabel(openHizb)} · ص {toAr(HIZBS[openHizb - 1].page)}</p>
              </div>
              <button className="icon-button" aria-label="إغلاق" onClick={() => setOpenHizb(null)}><X size={18} /></button>
            </header>
            <div className="hizb-health-card">
              <span>صحة الحزب</span>
              <strong className={HEALTH_META[hizbHealth(state, today, openHizb)].className}>
                {HEALTH_META[hizbHealth(state, today, openHizb)].label}
              </strong>
            </div>
            <WarshReader
              key={`mushaf-hizb-${openHizb}`}
              defaultSurah={HIZBS[openHizb - 1]?.surah ?? 1}
              title={`نص الحزب ${toAr(openHizb)} من المصحف (ورش)`}
              hint="يبدأ من سورة بداية الحزب؛ تنقّل بين السور لمتابعة بقية الحزب. تُحفظ السور بعد أول تحميل."
            />
            <HizbThumnErrors state={state} mushafHizb={openHizb} />
            <section className="hizb-history">
              <h3>آخر المراجعات</h3>
              {hizbReviewHistory(state, today, openHizb).length ? (
                <ul>
                  {hizbReviewHistory(state, today, openHizb).map((event, index) => (
                    <li key={`${event.date}-${index}`}>
                      <span>{formatDate(event.date, true)}</span>
                      <span>{event.kind}</span>
                      <span className={event.errors > 2 ? 'bad' : ''}>{event.errors ? `${ar(event.errors)} أخطاء` : 'بلا أخطاء'}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="empty-line">لا تسميع مسجّل لهذا الحزب بعد.</p>}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

function HizbThumnErrors({ state, mushafHizb }: { state: TrackerState; mushafHizb: number }) {
  const totals = thumnErrorsInWindow(state, Object.keys(state.records).sort().pop() || '', 60);
  const path = mushafHizbToPath(mushafHizb);
  const base = (path - 1) * 8;
  return (
    <section className="hizb-thumns">
      <h3>أثمان الحزب — أخطاء ٦٠ يومًا</h3>
      <div className="hizb-thumn-grid">
        {Array.from({ length: 8 }, (_, t) => {
          const id = base + t + 1;
          const count = totals[id] || 0;
          return (
            <div key={id} className={count ? 'has-error' : ''}>
              <strong>{toAr(t + 1)}</strong>
              <span>{count ? ar(count) : '—'}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function FocusFloat({
  seconds, running, taskLabel, onToggle, onReset, onClose,
}: {
  seconds: number;
  running: boolean;
  taskLabel: string;
  onToggle: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return (
    <div className="focus-float" role="status">
      <button type="button" className="focus-float-open" onClick={onToggle}>
        {running ? <Pause size={15} /> : <Play size={15} />}
        <span>{taskLabel}</span>
        <strong dir="ltr">{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</strong>
      </button>
      <button type="button" className="icon-button" aria-label="إعادة ضبط" onClick={onReset}><RefreshCw size={15} /></button>
      <button type="button" className="icon-button" aria-label="إغلاق المؤقت" onClick={onClose}><X size={15} /></button>
    </div>
  );
}

export function CycleBar({ plan }: { plan: DailyPlan }) {
  if (plan.cycleLength <= 1 && !plan.cycleWarn) return null;
  const filled = plan.cycleDay - 1;
  return (
    <div className="cycle-bar-wrap">
      <div className="cycle-bar-meta">
        <span>الدورة {ar(plan.cycleDay)} / {ar(plan.cycleLength)}</span>
        <span>{ar(plan.stableHizbs)} حزب مستقر</span>
      </div>
      <div className="cycle-bar" role="progressbar" aria-valuemin={1} aria-valuemax={plan.cycleLength} aria-valuenow={plan.cycleDay}>
        {Array.from({ length: plan.cycleLength }, (_, i) => (
          <i key={i} className={i < filled ? 'filled' : i === filled ? 'current' : ''} />
        ))}
      </div>
      {plan.cycleWarn && (
        <p className="cycle-warn"><CircleHelp size={13} /> الدورة {ar(plan.cycleLength)} يومًا — قصّرها برفع مقدار البعيدة.</p>
      )}
    </div>
  );
}

export function FirstDayCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <section className="first-day-card">
      <div className="first-day-head">
        <Sparkles size={15} />
        <strong>ترتيب مقترح ليومك</strong>
      </div>
      <ul>
        <li><Sun size={13} /> الفجر: تسميع الأمس ← حفظ الثمن ← تسميعه.</li>
        <li><Zap size={13} /> الضحى: البعيدة من الذاكرة.</li>
        <li><RefreshCw size={13} /> العصر: القريبة.</li>
        <li><Moon size={13} /> قبل النوم: تسميع أخير للثمن.</li>
      </ul>
      <p>التطبيق أداة تتبع — المعيار ثبات القديم.</p>
      <button type="button" className="text-button" onClick={onDismiss}>فهمت، ابدأ <ArrowLeft size={14} /></button>
    </section>
  );
}

export function ReadingStats({ state }: { state: TrackerState }) {
  const a = readingAnalytics(state);
  if (!a.readDays || !a.pairs || a.avgReads === null || a.retention === null) return null;
  const alwaysMin = a.readDays >= 3 && a.avgReads <= 3;
  return (
    <section className="reading-stats">
      <div className="reading-stats-main">
        <span>متوسط قراءاتك {toAr(a.avgReads)}</span>
        <em>×</em>
        <span>نسبة تثبيت اليوم التالي {toAr(a.retention)}٪</span>
      </div>
      {a.advice && <p className="reading-advice">{a.advice}</p>}
      {!a.advice && alwaysMin && (
        <p className="reading-advice muted">تثبيتك يعتمد على الحد الأدنى — راقِب مواضع الضعف المتكررة.</p>
      )}
    </section>
  );
}

export function PathMap({ plan }: { plan: DailyPlan }) {
  const units = plan.units;
  const completed = Math.floor(units / 8);
  const currentPath = Math.min(60, completed + 1);
  const current = pathHizbToMushaf(currentPath);
  const inCurrent = units >= 480 ? 8 : units % 8;
  const distant = new Set(plan.farHizbs);
  const nearHizbs = new Set(plan.nearThumns.map(id => fromThumnId(id).hizb));
  const pages = Math.round(units * 1.25);
  const ajza = (completed / 2).toFixed(1);

  function kindOf(n: number): 'distant' | 'near' | 'current' | 'done' | 'future' {
    const pathIdx = mushafHizbToPath(n);
    if (n === current && units < 480) return 'current';
    if (distant.has(n)) return 'distant';
    if (nearHizbs.has(n)) return 'near';
    if (pathIdx <= completed) return 'done';
    return 'future';
  }

  function eighthsFor(n: number): number {
    const pathIdx = mushafHizbToPath(n);
    if (n === current && units < 480) return inCurrent;
    if (pathIdx <= completed || units >= 480) return 8;
    return 0;
  }

  return (
    <section className="path-map-section">
      <div className="section-heading">
        <h2>المسار</h2>
        <span>رواية {RIWAYAH} · يبدأ من الحزب ٦٠ · ثمانية أثمان في كل حزب</span>
      </div>
      <div className="path-stats">
        <div className="path-stat"><small>محفوظ</small><strong>{ar(units)} ثمن</strong></div>
        <div className="path-stat"><small>نحو</small><strong>{ar(pages)} صفحة</strong></div>
        <div className="path-stat"><small>أجزاء</small><strong>{toAr(ajza)}</strong></div>
      </div>
      <div className="path-legend">
        <span><i className="dot distant" /> بعيدة / مستقرة</span>
        <span><i className="dot near" /> قريبة</span>
        <span><i className="dot current" /> جاري</span>
        <span><i className="dot future" /> لم يُحفظ</span>
      </div>
      <div className="path-juz-list">
        {Array.from({ length: 30 }, (_, j) => 30 - j).map(juz => {
          const a = juz * 2;
          const b = juz * 2 - 1;
          return (
            <div key={juz} className="path-juz">
              <div className="path-juz-head">
                <strong>جزء {toAr(juz)}</strong>
                <span>{SURAHS[HIZBS[b - 1].surah]}</span>
              </div>
              <div className="path-hizbs">
                <HizbCell n={a} kind={kindOf(a)} inCurrent={eighthsFor(a)} />
                <HizbCell n={b} kind={kindOf(b)} inCurrent={eighthsFor(b)} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HizbCell({ n, kind, inCurrent }: { n: number; kind: string; inCurrent: number }) {
  const h = HIZBS[n - 1];
  return (
    <div className={`hizb-cell k-${kind}`}>
      <div className="hizb-cell-top">
        <span>{toAr(n)}</span>
        <small>ص {toAr(h.page)}</small>
      </div>
      <div className="hizb-cell-label">{hizbLabel(n)}</div>
      <div className="hizb-eighths">
        {Array.from({ length: 8 }, (_, i) => {
          const filled = kind === 'current' ? i < inCurrent : kind !== 'future';
          return <i key={i} className={filled ? 'on' : ''} />;
        })}
      </div>
    </div>
  );
}

export function useReadGate(lastReadAt: number | null) {
  const [hint, setHint] = useState<string | null>(null);
  useEffect(() => {
    if (!hint) return;
    const t = window.setTimeout(() => setHint(null), 4500);
    return () => window.clearTimeout(t);
  }, [hint]);

  function tryRead(onAllowed: () => void) {
    const now = Date.now();
    if (lastReadAt && now - lastReadAt < READ_GAP_MS) {
      const secs = Math.ceil((READ_GAP_MS - (now - lastReadAt)) / 1000);
      setHint(`اقرأ بتمعن وتجويد، لا نقراً سريعاً — كل قراءة تحتاج ${ar(Math.max(1, Math.ceil(secs / 60)))} دقيقة تمهّد.`);
      return;
    }
    onAllowed();
  }

  return { hint, setHint, tryRead };
}

export function farSpanLabel(plan: DailyPlan): string {
  if (!plan.farHizbs.length) return '';
  const parts = plan.farHizbs.map(h => {
    const span = hizbPageSpan(h);
    if (plan.farHalf === 0) return `ص ${toAr(span.start)}–${toAr(span.end)}`;
    const mid = Math.round((span.start + span.end) / 2);
    return plan.farHalf === 1 ? `ص ${toAr(span.start)}–${toAr(mid)}` : `ص ${toAr(mid + 1)}–${toAr(span.end)}`;
  });
  return parts.join(' · ');
}

