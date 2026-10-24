import { REMINDER_ANCHORS, memorizedFull } from '../lib/tracker';
import { useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft, BookOpen, Bookmark, CalendarDays, Check, CheckCheck, ChevronLeft, ChevronRight,
  CircleHelp, Download, Flower2, Heart, History, Layers3, Leaf, Pencil, Plus, RefreshCw,
  Search, Settings2, ShieldCheck, Sparkles, Sprout, Sun, Trash2, Upload,
} from 'lucide-react';
import {
  ar, addDays, calculatePlan, dateKey, dueMistakes, formatDate, fromKey,
  isDayComplete, normalizeArabic, ordinal, rhythmLast7, totalUnits, MISTAKE_KINDS, WEEKDAYS,
  type Mistake, type MistakeKind, type Settings, type ThemeName, type TrackerState,
} from '../lib/tracker';
import { RULES, SURAHS_BY_PATH, hizbLabel, toAr } from '../data/quran';
import { EmptyState } from './Shared';
import { PathMap, ReadingStats } from './SessionExtras';
import { DAILY_ORDER } from './Guide';
import { BUILD } from '../lib/version';

export function PlanPage({ state, today, onEdit, onFarChange }: {
  state: TrackerState; today: string; onEdit: () => void; onFarChange: (amount: 0.5 | 1 | 2) => void;
}) {
  const plan = calculatePlan(state, today);
  const units = totalUnits(state);
  const hizbs = Math.floor(units / 8);
  const eighths = units >= 480 ? 8 : units % 8;
  const cycle = Math.max(1, Math.ceil(plan.stableHizbs / state.settings.dailyFar));
  return (
    <div className="subpage plan-page">
      <div className="page-heading"><div><span className="eyebrow">خطتك، على قدر استطاعتك</span><h1>ثلاث طبقات، وحفظٌ راسخ.</h1><p>القليل المتقن خير من الكثير المتفلّت. خطتك تنمو معك.</p></div><button className="button button-outline" onClick={onEdit}><Settings2 size={17} /> تخصيص الخطة</button></div>
      <section className="plan-progress-section">
        <div><span className="section-kicker"><Sprout size={17} /> هنا وصلت بفضل الله</span><h2>{ar(hizbs)} أحزاب <span>{eighths && units < 480 ? `و${ar(eighths)} من الأثمان` : 'من الحفظ'}</span></h2><p>{units >= 480 ? 'أتممت حفظ القرآن. الآن رحلة الإتقان والمداومة.' : `أنت الآن في الحزب ${ordinal(60 - hizbs)}. كل ثمن يُتمّ خطوة.`}</p></div>
        <div className="plan-eighths"><div className="between"><span>الحزب {units >= 480 ? ordinal(1) : ordinal(60 - hizbs)}</span><span>{ar(eighths)} / ٨ أثمان</span></div><div className="eighths-track">{Array.from({ length: 8 }, (_, i) => <span key={i} className={i < eighths ? 'filled' : ''} />)}</div><small>تُضاف الأثمان تلقائيًا عند إتمام الحفظ الجديد.</small></div>
      </section>

      <div className="section-heading"><h2>أساس يومك</h2><span>ترتيب ثابت كل يوم</span></div>
      <ol className="guide-order plan-order" aria-label="ترتيب وردك اليومي">
        {DAILY_ORDER.map((step, index) => (
          <li key={step.label}>
            <span className="guide-step-num">{ar(index + 1)}</span>
            <span className="guide-step-text"><strong>{step.label}</strong></span>
            {index < DAILY_ORDER.length - 1 && <ArrowLeft className="guide-step-arrow" size={14} aria-hidden="true" />}
          </li>
        ))}
      </ol>
      <div className="plan-layers">
        <div className="plan-layer"><span className="layer-number">٠١</span><div className="layer-copy"><span className="section-kicker terracotta-text"><BookOpen size={17} /> الحفظ الجديد</span><h3>ثمن واحد، بإتقان.</h3><p>ابدأ بتسميع ثمن الأمس بلا خطأ. اقرأ الجديد ٣ إلى ٥ مرات، ثم احفظه وسمّعه مرتين في اليوم نفسه.</p></div><span className="layer-amount">نحو صفحة وربع<small>كل يوم عدا {WEEKDAYS[state.settings.restDay]}</small></span></div>
        <div className="plan-layer"><span className="layer-number">٠٢</span><div className="layer-copy"><span className="section-kicker"><Layers3 size={17} /> المراجعة القريبة</span><h3>الجديد يحتاج جذورًا.</h3><p>الحزب {ordinal(plan.previousHizb)} كاملًا، وكل ما حفظته من الحزب {ordinal(plan.currentHizb)}. عند إتمام الحزب، تنتقل الطبقات تلقائيًا في الورد التالي.</p></div><span className="layer-amount">آخر حزبين تقريبًا<small>مراجعة يومية للتثبيت</small></span></div>
        <div className="plan-layer"><span className="layer-number">٠٣</span><div className="layer-copy"><span className="section-kicker ochre-text"><RefreshCw size={17} /> المراجعة البعيدة</span><h3>ليظلّ القديم حاضرًا.</h3><p>{plan.stableHizbs ? `الأحزاب من ${ar(60)} إلى ${ar(61 - plan.stableHizbs)}، بالتناوب ومن الذاكرة. ` : 'تبدأ بعد استقرار أول حزبين. '}افتح المصحف عند التوقف فقط، وسجّل مواضع التعثر لتعيدها في اليوم التالي.</p></div><span className="layer-amount">دورة كل {ar(cycle)} أيام<small>الدورة تتقدم بالإنجاز، لا بالغياب</small></span></div>
      </div>

      <section className="far-settings-section"><div><span className="eyebrow">خفّف المقدار، ولا تقطع الوصل</span><h2>كم تراجع من القديم يوميًا؟</h2><p>ثبّت المقدار ودع الدورة تتسع مع نمو محفوظك.</p></div><div className="segmented-control" aria-label="مقدار المراجعة البعيدة">{([{ amount: 0.5, label: 'نصف حزب' }, { amount: 1, label: 'حزب واحد' }, { amount: 2, label: 'جزء كامل' }] as const).map(option => <button key={option.amount} aria-pressed={state.settings.dailyFar === option.amount} className={state.settings.dailyFar === option.amount ? 'selected' : ''} onClick={() => onFarChange(option.amount)}>{option.label}{state.settings.dailyFar === option.amount && <Check size={15} />}</button>)}</div></section>
      {cycle > 14 && <div className="notice notice-warm"><CircleHelp size={20} /><p>دورتك الآن {ar(cycle)} يومًا. يُفضّل ألا تتجاوز أسبوعين؛ جرّب زيادة المقدار لتبقى المراجعة قوية.</p></div>}

      <section className="weekly-section"><span className="weekly-icon"><CalendarDays size={25} strokeWidth={1.5} /></span><div><span className="eyebrow">يوم للرسوخ، لا للزيادة</span><h2>{WEEKDAYS[state.settings.restDay]} للتثبيت</h2><p>بلا حفظ جديد. اسرد {state.settings.restScope === 'all' ? 'كل محفوظك المستقر' : 'نصف محفوظك المستقر'}، واربط بدايات الأثمان، وسمّع لغيرك أو راجع تسجيلًا لصوتك.</p></div><button className="text-button" onClick={onEdit}>تغيير اليوم <ArrowLeft size={16} /></button></section>

      <section className="principles-section"><div className="section-heading"><h2>وصايا تحفظ الطريق</h2><Heart size={19} /></div><div className="principles">{RULES.map(rule => <p key={rule.n}><span>{ar(rule.n)}</span><strong>{rule.title}.</strong> {rule.body}</p>)}</div><div className="quiet-note"><Leaf size={16} /><span>وِرد أداة للتنظيم، لا يفرض عليك تقسيمًا. رتّب أوقاتك بالطريقة التي تناسبك.</span></div></section>

      <section className="evolution-section">
        <div className="section-heading"><h2>كيف تتطور خطتك؟</h2><span>تلقائيًا مع كل يوم</span></div>
        <div className="evolution-grid">
          <div className="evolution-item"><strong>عند إتمام الحزب</strong><p>تنتقل طبقة القريبة إلى الحزب الجديد تلقائيًا في الورد التالي.</p></div>
          <div className="evolution-item"><strong>الأخطاء تُضاف للقريبة</strong><p>كل ثمن ضعيف اليوم يعود وردًا إضافيًا غدًا.</p></div>
          <div className="evolution-item"><strong>الإتقان يفتح الحفظ</strong><p>تسميع الأمس + القريبة والبعيدة قبل فتح ثمن جديد.</p></div>
          <div className="evolution-item"><strong>الدورة تتسع بنموك</strong><p>كلما زاد محفوظك المستقر، قصرت دورة البعيدة.</p></div>
        </div>
      </section>

      <PathMap plan={plan} />
    </div>
  );
}

export function HistoryPage({ state, today, onOpenDate, onExport }: { state: TrackerState; today: string; onOpenDate: (date: string) => void; onExport: () => void }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const todayDate = fromKey(today);
  const month = new Date(todayDate.getFullYear(), todayDate.getMonth() + monthOffset, 1, 12);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leading = (month.getDay() + 1) % 7;
  const entries = Object.entries(state.records).filter(([, record]) => record.completed.length > 0).sort(([a], [b]) => b.localeCompare(a));
  const completeDays = entries.filter(([, record]) => isDayComplete(record)).length;
  const memorized = entries.filter(([, record]) => memorizedFull(record)).length;
  const monthEntries = entries.filter(([date]) => date.startsWith(dateKey(month).slice(0, 7)));
  const rhythm = rhythmLast7(state, today);

  return <div className="subpage history-page">
    <div className="page-heading"><div><span className="eyebrow">كل خطوة تترك أثرًا</span><h1>سجلّ رحلتك</h1><p>{completeDays ? `أتممت وردك في ${ar(completeDays)} أيام، وأضفت ${ar(memorized)} من الأثمان إلى محفوظك.` : 'هنا ترى أثر المداومة، يومًا بعد يوم.'}</p></div><button className="button button-outline" onClick={onExport}><Download size={17} /> حفظ نسخة</button></div>
    <ReadingStats state={state} />
    <section className="rhythm-section" aria-label="إيقاع آخر سبعة أيام">
      <div className="section-heading"><h2>إيقاع أسبوعك</h2><span>آخر ٧ أيام</span></div>
      <div className="rhythm-chart">
        {rhythm.map(day => (
          <button key={day.date} type="button" className={`rhythm-bar ${day.complete ? 'complete' : day.partial ? 'partial' : ''}`} onClick={() => onOpenDate(day.date)} aria-label={`${formatDate(day.date)} — ${ar(day.percent)}٪`}>
            <strong>{ar(day.percent)}٪</strong>
            <span className="rhythm-fill" style={{ height: `${Math.max(6, day.percent)}%` }} />
            <small>{WEEKDAYS[fromKey(day.date).getDay()].slice(0, 3)}</small>
          </button>
        ))}
      </div>
    </section>
    <section className="calendar-section"><div className="calendar-heading"><h2>{month.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}</h2><div className="calendar-controls"><button className="icon-button" onClick={() => setMonthOffset(value => value - 1)} aria-label="الشهر السابق"><ChevronRight size={19} /></button><button className="text-button" onClick={() => setMonthOffset(0)}>هذا الشهر</button><button className="icon-button" onClick={() => setMonthOffset(value => value + 1)} disabled={monthOffset >= 0} aria-label="الشهر التالي"><ChevronLeft size={19} /></button></div></div>
      <div className="month-grid">{[6, 0, 1, 2, 3, 4, 5].map(day => <span className="calendar-weekday" key={`weekday-${day}`}>{WEEKDAYS[day]}</span>)}{Array.from({ length: leading }, (_, i) => <div key={`empty-${i}`} className="calendar-empty" />)}{Array.from({ length: days }, (_, i) => {
        const date = dateKey(new Date(month.getFullYear(), month.getMonth(), i + 1, 12));
        const record = state.records[date];
        const complete = isDayComplete(record);
        const partial = !!record?.completed.length;
        return <button key={date} disabled={date > today} onClick={() => onOpenDate(date)} className={`calendar-day ${date === today ? 'is-today' : ''} ${complete ? 'is-complete' : partial ? 'is-partial' : ''}`} aria-label={`${formatDate(date)}، ${complete ? 'ورد مكتمل' : partial ? 'ورد جزئي' : 'لم يسجل إنجاز'} — اضغط للتعديل`}><span>{ar(i + 1)}</span>{complete ? <Check size={15} /> : partial ? <span className="calendar-dot" /> : <span className="calendar-dot empty" />}</button>;
      })}</div><div className="calendar-legend"><span><i className="legend-dot complete" /> ورد مكتمل</span><span><i className="legend-dot partial" /> خطوات منجزة</span><span>اضغط أي يوم لعرضه وتعديله</span></div>
    </section>
    <div className="section-heading"><h2>أثر أيامك</h2><span>{ar(monthEntries.length)} أيام مسجّلة هذا الشهر</span></div>
    {monthEntries.length ? <div className="history-list">{monthEntries.map(([date, record]) => <button className="history-row" key={date} onClick={() => onOpenDate(date)}><span className={`history-status-icon ${isDayComplete(record) ? 'complete' : ''}`}>{isDayComplete(record) ? <CheckCheck size={22} /> : <BookOpen size={22} />}</span><div><h3>{date === today ? 'اليوم' : formatDate(date)}</h3><p>{ar(record.completed.length)} من {ar(record.plan.tasks.length)} خطوات مكتملة{record.seconds >= 60 ? ` · ${ar(Math.floor(record.seconds / 60))} دقيقة تفرّغ` : ''}</p></div><span className={`history-status ${isDayComplete(record) ? 'complete' : ''}`}>{isDayComplete(record) ? 'اكتمل الورد' : 'سعي مبارك'}</span><ArrowLeft size={18} /></button>)}</div> : <EmptyState icon={<History size={31} strokeWidth={1.3} />} title="لكل رحلة أول خطوة" description="أتمّ أول خطوة من وردك، وسيظهر أثرها هنا. لا تحتاج إلى بداية مثالية، فقط ابدأ." ><button className="button button-primary" onClick={() => onOpenDate(today)}>إلى ورد اليوم <ArrowLeft size={17} /></button></EmptyState>}
  </div>;
}

export function MistakesPage({ state, today, onAdd, onEdit, onResolve, onReview, onRepeat, onDelete }: {
  state: TrackerState; today: string; onAdd: () => void; onEdit: (mistake: Mistake) => void;
  onResolve: (id: string) => void; onReview: (id: string) => void; onRepeat: (id: string) => void; onDelete: (id: string) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'due' | 'resolved'>('all');
  const [kindFilter, setKindFilter] = useState<MistakeKind | 'all'>('all');
  const [search, setSearch] = useState('');
  const due = dueMistakes(state, today);
  const shown = state.mistakes.filter(mistake => {
    const matchesTab = filter === 'resolved' ? mistake.resolved : filter === 'due' ? due.some(item => item.id === mistake.id) : !mistake.resolved;
    const matchesKind = kindFilter === 'all' || (mistake.kind || 'stop') === kindFilter;
    const term = normalizeArabic(search);
    const haystack = normalizeArabic(`${mistake.surah} ${mistake.location} ${mistake.note}`);
    return matchesTab && matchesKind && (!term || haystack.includes(term));
  }).sort((a, b) => b.repeats - a.repeats);
  return <div className="subpage mistakes-page">
    <div className="page-heading"><div><span className="eyebrow">موضع التعثر، بداية الإتقان</span><h1>مواضع التثبيت</h1><p>سجّل نوع التعثر وموضعه، نعيده مع مراجعتك حتى يرسخ.</p></div><button className="button button-primary" onClick={onAdd}><Plus size={18} /> أضف موضعًا</button></div>
    <div className="mistakes-toolbar"><div className="filter-tabs" aria-label="تصفية مواضع التثبيت">{([{ id: 'all', label: 'قيد التثبيت' }, { id: 'due', label: `مراجعة اليوم${due.length ? ` (${ar(due.length)})` : ''}` }, { id: 'resolved', label: 'تم إتقانها' }] as const).map(tab => <button className={filter === tab.id ? 'active' : ''} aria-pressed={filter === tab.id} key={tab.id} onClick={() => setFilter(tab.id)}>{tab.label}</button>)}</div><label className="search-field"><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="ابحث عن سورة أو موضع" aria-label="البحث في مواضع التثبيت" /></label></div>
    <div className="kind-tabs" role="tablist" aria-label="نوع التعثر"><button className={kindFilter === 'all' ? 'active' : ''} aria-pressed={kindFilter === 'all'} onClick={() => setKindFilter('all')}>الكل</button>{MISTAKE_KINDS.map(kind => <button key={kind.id} className={kindFilter === kind.id ? 'active' : ''} aria-pressed={kindFilter === kind.id} onClick={() => setKindFilter(kind.id)} title={kind.hint}>{kind.label}</button>)}</div>
    {shown.length ? <div className="mistake-list">{shown.map(mistake => <article className={`mistake-item ${mistake.resolved ? 'resolved' : ''}`} key={mistake.id}><div className="mistake-top"><span className="mistake-bookmark"><Bookmark size={21} strokeWidth={1.5} /></span><div className="mistake-title"><h3>{mistake.surah} <span className="kind-chip">{MISTAKE_KINDS.find(item => item.id === (mistake.kind || 'stop'))?.label}</span></h3><span>{mistake.location}{mistake.hizb ? ` · الحزب ${ar(mistake.hizb)}` : ''}</span></div><div className="mistake-edit-actions"><button className="icon-button" onClick={() => onEdit(mistake)} aria-label={`تعديل موضع ${mistake.surah}`}><Pencil size={16} /></button><button className="icon-button" onClick={() => onDelete(mistake.id)} aria-label={`حذف موضع ${mistake.surah}`}><Trash2 size={16} /></button></div></div>{mistake.note && <p className="mistake-note">{mistake.note}</p>}<div className="mistake-meta"><span>{mistake.resolved ? <><CheckCheck size={15} /> تم تثبيت هذا الموضع</> : mistake.reviewedAt === today ? <><Check size={15} /> راجعته اليوم</> : mistake.dueAt > today ? <><CalendarDays size={15} /> في مراجعة {mistake.dueAt === addDays(today, 1) ? 'الغد' : formatDate(mistake.dueAt, true)}</> : <><RefreshCw size={15} /> يحتاج مراجعتك اليوم</>}</span><span>{mistake.repeats > 1 ? `تكرر التعثر ${ar(mistake.repeats)} مرات` : 'للمراجعة والتثبيت'}</span></div><div className="mistake-actions"><button className="button button-soft button-small" onClick={() => onResolve(mistake.id)}>{mistake.resolved ? <RefreshCw size={15} /> : <CheckCheck size={16} />}{mistake.resolved ? 'أعده للمراجعة' : 'أتقنت هذا الموضع'}</button>{!mistake.resolved && <><button className="text-button" disabled={mistake.reviewedAt === today} onClick={() => onReview(mistake.id)}>{mistake.reviewedAt === today ? 'تمت مراجعته اليوم' : 'راجعته اليوم'}</button><button className="text-button muted-button" onClick={() => onRepeat(mistake.id)}>تكرر التعثر</button></>}</div></article>)}</div> : <EmptyState icon={filter === 'resolved' ? <Flower2 size={34} strokeWidth={1.3} /> : <Bookmark size={31} strokeWidth={1.3} />} title={search ? 'لم نجد موضعًا بهذا البحث' : filter === 'resolved' ? 'هنا يزهر أثر التكرار' : filter === 'due' ? 'لا مواضع إضافية اليوم' : 'كل تعثّر، فرصة للرسوخ'} description={search ? 'جرّب اسم السورة أو رقم الآية.' : filter === 'resolved' ? 'عندما تتقن موضعًا، انقله إلى هنا لتشهد أثر سعيك.' : filter === 'due' ? 'ما تسجّله اليوم يرافق مراجعة الغد. واصل وردك بهدوء.' : 'أضف آية أو بداية ثمن تتعثر فيها. ستجدها في مراجعة الغد مرة إضافية.'}>{filter === 'all' && !search && <button className="button button-primary" onClick={onAdd}><Plus size={17} /> سجّل أول موضع</button>}</EmptyState>}
    <div className="quiet-note"><Leaf size={17} /><span>ليس المطلوب ألّا تخطئ، بل أن تعرف موضع الخطأ وتعود إليه.</span></div>
  </div>;
}

export function MistakeForm({ existing, defaultHizb, onSave, onCancel }: {
  existing: Mistake | null;
  defaultHizb: number;
  onSave: (values: { surah: string; location: string; note: string; repeated: boolean; kind: MistakeKind; hizb: number }) => void;
  onCancel: () => void;
}) {
  const [surah, setSurah] = useState(existing?.surah || '');
  const [location, setLocation] = useState(existing?.location || '');
  const [note, setNote] = useState(existing?.note || '');
  const [repeated, setRepeated] = useState((existing?.repeats || 0) > 1);
  const [kind, setKind] = useState<MistakeKind>(existing?.kind || 'stop');
  const [hizb, setHizb] = useState(existing?.hizb || defaultHizb);
  const [error, setError] = useState('');
  // اقتراحات السور بترتيب الحفظ (من الناس إلى الفاتحة)، لا بترتيب المصحف.
  const surahSuggestions = SURAHS_BY_PATH.map(item => item.name);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!surah.trim() || !location.trim()) { setError('اكتب اسم السورة والموضع ليكون الرجوع إليه سهلًا.'); return; }
    onSave({ surah: surah.trim(), location: location.trim(), note: note.trim(), repeated, kind, hizb });
  }
  function applyShortcut(prefix: string) {
    if (!location.trim()) setLocation(prefix);
    else if (!location.startsWith(prefix)) setLocation(`${prefix} ${location}`);
  }
  return <form onSubmit={submit} className="modal-form">
    <p className="modal-intro mistake-intro">ليس خطأً يُحسب عليك، بل موضع يستحق عنايتك. سيُضاف إلى مراجعة الغد.</p>
    <div className="form-grid">
      <label className="field-label">السورة<input required maxLength={70} value={surah} onChange={event => setSurah(event.target.value)} placeholder="مثلًا: البقرة" list="surah-suggestions" autoComplete="off" /><datalist id="surah-suggestions">{surahSuggestions.map(name => <option key={name} value={name} />)}</datalist></label>
      <label className="field-label">الحزب (من ٦٠ إلى ١ — ترتيب ورش)<select value={hizb} onChange={event => setHizb(Number(event.target.value))}>{Array.from({ length: 60 }, (_, i) => 60 - i).map(n => <option key={n} value={n}>الحزب {ar(n)} · {hizbLabel(n).split(' ')[0]}</option>)}</select></label>
    </div>
    <label className="field-label">الآية أو بداية المقطع<input required maxLength={180} value={location} onChange={event => setLocation(event.target.value)} placeholder="رقم الآية أو كلمات التوقف" /></label>
    <div className="location-shortcuts" aria-label="اختصارات الموقع">
      {['الآية', 'بداية الثمن', 'موضع انتقال', 'متشابه'].map(shortcut => <button type="button" key={shortcut} onClick={() => applyShortcut(shortcut)}>{shortcut}</button>)}
    </div>
    <fieldset className="field-label kind-fieldset"><legend>نوع التعثر</legend><div className="segmented-control kind-segmented">{MISTAKE_KINDS.map(item => <button type="button" key={item.id} title={item.hint} aria-pressed={kind === item.id} className={kind === item.id ? 'selected' : ''} onClick={() => setKind(item.id)}>{item.label}</button>)}</div></fieldset>
    <label className="field-label">ما الذي يحتاج انتباهًا؟ <span className="optional">اختياري</span><textarea rows={3} maxLength={500} value={note} onChange={event => setNote(event.target.value)} placeholder="كلمة تتشابه، بداية ثمن، أو موضع انتقال..." /></label>
    <label className="native-check"><input type="checkbox" checked={repeated} onChange={event => setRepeated(event.target.checked)} /><span>تكرر التعثر في هذا الموضع أكثر من مرة</span></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="notice"><RefreshCw size={18} /><p>سيُضاف الموضع إلى مراجعة الغد. يبقى قريبًا منك حتى تختار «أتقنته».</p></div>
    <div className="modal-footer"><button className="button button-primary" type="submit"><Check size={17} /> {existing ? 'حفظ التعديل' : 'أضف للتثبيت'}</button><button className="button button-ghost" type="button" onClick={onCancel}>إلغاء</button></div>
  </form>;
}

export function SettingsForm({ state, onSave, onExport, onImport, onReset }: {
  state: TrackerState; onSave: (settings: Settings) => void; onExport: () => void; onImport: (file: File) => void; onReset: () => void;
}) {
  const [draft, setDraft] = useState<Settings>({ ...state.settings });
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setDraft(previous => ({ ...previous, [key]: value }));
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!Number.isInteger(draft.baseHizbs) || draft.baseHizbs < 0 || draft.baseHizbs > 59) return;
    onSave(draft);
  }
  return <form onSubmit={submit} className="modal-form settings-form">
    <div className="form-section-title"><Sparkles size={18} /><h3>عرّفنا بنفسك</h3></div><label className="field-label">اسمك <span className="optional">اختياري</span><input maxLength={30} value={draft.name} onChange={event => set('name', event.target.value)} placeholder="اسمك الأول" autoComplete="given-name" /></label>
    <div className="form-section-title"><Sprout size={18} /><h3>نقطة البداية</h3></div><p className="form-help">محفوظك عند بدء الخطة — تبدأ من الحزب ٦٠ نحو الفاتحة. يُضاف إليه الحفظ الذي تسجّله تلقائيًا.</p><div className="form-grid"><label className="field-label">الأحزاب المكتملة من ٦٠<input type="number" min={0} max={59} required value={draft.baseHizbs} onChange={event => set('baseHizbs', Number(event.target.value))} /></label><label className="field-label">أثمان الحزب الحالي<select value={draft.baseEighths} onChange={event => set('baseEighths', Number(event.target.value))}>{Array.from({ length: 8 }, (_, i) => <option key={i} value={i}>{i === 0 ? 'لم أبدأ بعد' : `${ar(i)} من ٨ أثمان`}</option>)}</select></label></div>
    <div className="form-section-title"><RefreshCw size={18} /><h3>إيقاع المراجعة</h3></div><label className="field-label">المراجعة البعيدة يوميًا<select value={draft.dailyFar} onChange={event => set('dailyFar', Number(event.target.value) as 0.5 | 1 | 2)}><option value={0.5}>نصف حزب</option><option value={1}>حزب واحد</option><option value={2}>جزء كامل (حزبان)</option></select></label><div className="form-grid"><label className="field-label">يوم بلا حفظ جديد<select value={draft.restDay} onChange={event => set('restDay', Number(event.target.value))}>{WEEKDAYS.map((day, i) => <option value={i} key={day}>{day}</option>)}</select></label><label className="field-label">السرد في يوم التثبيت<select value={draft.restScope} onChange={event => set('restScope', event.target.value as 'half' | 'all')}><option value="half">نصف المحفوظ المستقر</option><option value="all">كل المحفوظ المستقر</option></select></label></div><p className="form-help">الورد الذي بدأتَه يبقى كما هو؛ تُطبّق التغييرات على الأوراد التالية.</p>
    <div className="form-section-title"><CalendarDays size={18} /><h3>موعد لطيف للعودة</h3></div><div className="reminder-setting"><div><strong>تذكير يومي بالورد</strong><small>التذكير يعمل عندما يكون التطبيق مفتوحًا.</small></div><button type="button" className={`switch ${draft.reminderEnabled ? 'on' : ''}`} role="switch" aria-checked={draft.reminderEnabled} aria-label="تفعيل التذكير اليومي" onClick={() => set('reminderEnabled', !draft.reminderEnabled)}><span /></button></div>{draft.reminderEnabled && <><div className="anchor-chips" role="radiogroup" aria-label="اربط التذكير بروتينك">{REMINDER_ANCHORS.map(anchor => <button key={anchor.id} type="button" role="radio" aria-checked={draft.reminderAnchor === anchor.id} className={`anchor-chip ${draft.reminderAnchor === anchor.id ? 'active' : ''}`} onClick={() => { set('reminderAnchor', anchor.id); if (anchor.time) set('reminderTime', anchor.time); }}>{anchor.label}</button>)}</div><label className="field-label">وقت التذكير<input type="time" required value={draft.reminderTime} onChange={event => set('reminderTime', event.target.value)} /></label><small className="form-help">عدّل الوقت ليناسب موعد صلاتك، فالتطبيق لا يعرف مواقيت الصلاة في موقعك.</small></>}
    <div className="form-section-title"><Sun size={18} /><h3>المظهر</h3></div><div className="segmented-control theme-control" aria-label="مظهر التطبيق">{([{ id: 'light', label: 'فاتح' }, { id: 'dark', label: 'داكن' }] as { id: ThemeName; label: string }[]).map(option => <button key={option.id} type="button" aria-pressed={draft.theme === option.id} className={draft.theme === option.id ? 'selected' : ''} onClick={() => set('theme', option.id)}>{option.label}{draft.theme === option.id && <Check size={15} />}</button>)}</div>
    <div className="modal-footer settings-save"><button className="button button-primary" type="submit"><Check size={18} /> حفظ الإعدادات</button></div>
    <div className="data-section"><div className="form-section-title"><ShieldCheck size={18} /><h3>بياناتك، لك وحدك</h3></div><p className="form-help">تُحفظ على هذا المتصفح فقط، دون حساب. احتفظ بنسخة قبل تغيير الجهاز أو مسح بيانات المتصفح.</p><div className="backup-actions"><button type="button" className="button button-outline button-small" onClick={onExport}><Download size={15} /> تصدير نسخة</button><button type="button" className="button button-outline button-small" onClick={() => fileRef.current?.click()}><Upload size={15} /> استعادة نسخة</button><button type="button" className="text-button danger-text" onClick={onReset}>بدء رحلة جديدة</button><input type="file" accept="application/json,.json" ref={fileRef} hidden onChange={event => { const file = event.target.files?.[0]; if (file) onImport(file); event.target.value = ''; }} /></div><p className="build-stamp">إصدار التطبيق <span dir="ltr">{BUILD.sha}</span> · {toAr(BUILD.date)} — إن لم يتغيّر بعد التحديث، فأعد تحميل الصفحة لتجاوز النسخة المحفوظة.</p></div>
  </form>;
}