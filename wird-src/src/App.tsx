import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import {
  ArrowLeft, Bell, Bookmark, BookOpen, CalendarDays, ChartNoAxesCombined, Check,
  CheckCheck, ChevronLeft, ChevronRight, CircleCheck, Clock3, Flower2, Heart,
  Layers3, Leaf, Link2, LockKeyhole, Mic, Moon, Pause, Play, Plus, RefreshCw, RotateCcw,
  Route, Settings2, ShieldCheck, Sparkles, Sprout, Sun, Trash2, X,
  type LucideIcon,
} from 'lucide-react';
import {
  addDays, allNearMarked, ar, calculatePlan, dateKey, defaultState, dueMistakes, emptyRecord,
  farLabel, farThumnIds, formatDate, fromKey, getStreak, getTaskSteps, hasMissedReview, hijriDate,
  isDayComplete, isValidState, loadState, nearLabel, ordinal, requiredReads, setTaskNote, STORAGE_KEY,
  TASK_NAMES, totalUnits, unitLabel, weekStart, WEEKDAYS,
  type DayRecord, type Difficulty, type Mistake, type MistakeKind, type NearMark, type Page,
  type Settings, type TaskId, type TrackerState,
} from './lib/tracker';
import { HIZBS, fromThumnId, pathHizbToMushaf, thumnPage } from './data/quran';
import WarshReader from './components/WarshReader';
import { TodayHero } from './components/NextStep';
import { REMINDER_ANCHORS } from './lib/tracker';
import { useSessionTimer, useTimerSeconds, type SessionTimer } from './lib/sessionTimer';
import { markBackupDone, saveItem, shareOrDownload, shouldNudgeBackup } from './lib/storage';
import { SessionRecorder } from './components/SessionRecorder';
import { Brand, LeafDrawing, Modal } from './components/Shared';
import { HistoryPage, MistakeForm, MistakesPage, PlanPage, SettingsForm } from './components/Pages';
import { Onboarding } from './components/Onboarding';
import {
  CoachBanners, CycleBar, ErrorChips, FirstDayCard, FocusFloat, MapPage, NearGrid, ReadsCounter,
  TaskNote, TimeMark, WeakExtraCard, YesterdayErrors, buildCoachTips, farSpanLabel, useReadGate,
} from './components/SessionExtras';

const NAVIGATION: { id: Page; label: string; mobileLabel: string; icon: LucideIcon }[] = [
  { id: 'today', label: 'ورد اليوم', mobileLabel: 'اليوم', icon: Sun },
  { id: 'plan', label: 'خطتي', mobileLabel: 'خطتي', icon: Route },
  { id: 'map', label: 'محفوظي', mobileLabel: 'المحفوظ', icon: Layers3 },
  { id: 'history', label: 'سجلّ المراجعة', mobileLabel: 'السجلّ', icon: ChartNoAxesCombined },
  { id: 'mistakes', label: 'مواضع التثبيت', mobileLabel: 'التثبيت', icon: Bookmark },
];
const TASK_ICONS: Record<TaskId, LucideIcon> = {
  yesterday: Sun, new: BookOpen, near: Layers3, far: RefreshCw, links: Link2, recite: Mic,
};
const TASK_TIMES: Record<TaskId, string> = {
  yesterday: 'قبل الحفظ', new: 'بعد الفجر', near: 'العصر أو المغرب', far: 'الضحى أو الظهر', links: 'مرة كل أسبوع', recite: 'مرة كل أسبوع',
};
const TASK_DURATIONS: Record<TaskId, string> = {
  yesterday: 'نحو ٥ دقائق', new: '١٥ إلى ٢٠ دقيقة', near: '٢٥ إلى ٣٥ دقيقة', far: '١٥ إلى ٢٠ دقيقة', links: '١٠ دقائق بهدوء', recite: 'في الوقت الذي يناسبك',
};
const TIME_GROUPS: { label: string; tasks: TaskId[] }[] = [
  { label: 'الفجر', tasks: ['yesterday', 'new'] },
  { label: 'الضحى / الظهر', tasks: ['far'] },
  { label: 'العصر / المغرب', tasks: ['near'] },
  { label: 'قبل النوم', tasks: [] },
  { label: 'أسبوعي', tasks: ['links', 'recite'] },
];
type Confirmation = { type: 'reset' } | { type: 'delete'; id: string } | { type: 'import'; data: TrackerState };

function formatClock(seconds: number) {
  return [Math.floor(seconds / 60), seconds % 60].map(value => value.toLocaleString('ar-EG', { minimumIntegerDigits: 2 })).join(':');
}

function unique(ids: number[]) {
  return [...new Set(ids)];
}

/** Clock text: lives in its own component so the ticking only re-renders this small node. */
function TimerText({ timer }: { timer: SessionTimer }) {
  return <>{formatClock(useTimerSeconds(timer))}</>;
}

function FloatingTimer({ timer, taskLabel, onClose }: { timer: SessionTimer; taskLabel: string; onClose: () => void }) {
  const seconds = useTimerSeconds(timer);
  if (seconds <= 0) return null;
  return <FocusFloat seconds={seconds} running={timer.running} taskLabel={taskLabel} onToggle={timer.toggle} onReset={timer.reset} onClose={onClose} />;
}

export default function App() {
  const [state, setState] = useState<TrackerState>(loadState);
  const [today, setToday] = useState(dateKey);
  const [page, setPage] = useState<Page>('today');
  const [selectedDate, setSelectedDate] = useState(today);
  const [shownWeek, setShownWeek] = useState(() => weekStart(today));
  const [session, setSession] = useState<TaskId | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mistakeOpen, setMistakeOpen] = useState(false);
  const [editingMistake, setEditingMistake] = useState<Mistake | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [storageError, setStorageError] = useState(false);
  const timer = useSessionTimer();
  const [firstDayDismissed, setFirstDayDismissed] = useState(false);
  const [celebrateHizb, setCelebrateHizb] = useState<number | null>(null);
  const lastReminded = useRef('');

  const plan = useMemo(() => calculatePlan(state, selectedDate), [state, selectedDate]);
  const record = state.records[selectedDate] || emptyRecord(plan);
  const completed = plan.tasks.filter(task => record.completed.includes(task)).length;
  const currentDay = selectedDate === today;
  const missedReview = hasMissedReview(state, selectedDate);
  const hasYesterdayTask = plan.tasks.includes('yesterday');
  const yesterdayDone = !hasYesterdayTask || record.completed.includes('yesterday');
  const reviewsDone = (!plan.tasks.includes('near') || record.completed.includes('near'))
    && (!plan.tasks.includes('far') || record.completed.includes('far'));
  const farNeedsRedo = record.completed.includes('far') && record.errors >= 2;
  const newUnlocked = yesterdayDone && (!missedReview || reviewsDone) && !farNeedsRedo;
  const due = dueMistakes(state, today);
  const streak = getStreak(state, today);
  const units = totalUnits(state);
  const currentHizb = pathHizbToMushaf(Math.min(60, Math.floor(units / 8) + 1));
  const currentEighths = units >= 480 ? 8 : units % 8;
  const required = requiredReads(state, selectedDate, record.difficulty);
  const isFirstAppDay = state.settings.startedAt === selectedDate && !Object.keys(state.records).some(d => d < selectedDate);
  const coachTips = buildCoachTips(state, today, due.length);
  const sessionVisible = !!session && !mistakeOpen && !settingsOpen && !confirmation;

  const { hint: readHint, setHint: setReadHint, tryRead } = useReadGate(record.lastReadAt);

  function notify(text: string) { setToast({ id: Date.now(), text }); }

  useEffect(() => {
    setStorageError(!saveItem(STORAGE_KEY, JSON.stringify(state)));
  }, [state]);

  useEffect(() => {
    if (shouldNudgeBackup(Object.keys(state.records).length > 0)) notify('مرّ أسبوع على آخر نسخة احتياطية. صدّرها من الإعدادات لتأمين تقدمك.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme;
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
  }, [state.settings.theme]);

  useEffect(() => {
    const interval = window.setInterval(() => setToday(dateKey()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (state.onboarding) return;
    if (state.records[today]) return;
    setState(previous => {
      if (previous.onboarding || previous.records[today]) return previous;
      const frozen = calculatePlan(previous, today);
      return { ...previous, records: { ...previous.records, [today]: emptyRecord(frozen) } };
    });
  }, [state.onboarding, today, state.records]);

  useEffect(() => {
    if (!state.settings.reminderEnabled) return;
    const checkReminder = () => {
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (time !== state.settings.reminderTime || lastReminded.current === dateKey(now) || isDayComplete(state.records[dateKey(now)])) return;
      lastReminded.current = dateKey(now);
      const anchor = REMINDER_ANCHORS.find(item => item.id === state.settings.reminderAnchor);
      const lead = anchor && anchor.id !== 'custom' ? `${anchor.label}: ` : '';
      setToast({ id: Date.now(), text: `${lead}حان موعد وردك. دقائق مع القرآن، وأثر يبقى.` });
      if ('Notification' in window && Notification.permission === 'granted') {
        try { new Notification('وِرد | موعدك مع القرآن', { body: `${lead}وردك ينتظرك. ابدأ بخطوة صغيرة، على بركة الله.`, icon: '/icons/icon-192.png' }); }
        catch { /* The in-app reminder is still shown. */ }
      }
    };
    checkReminder();
    const interval = window.setInterval(checkReminder, 20_000);
    return () => window.clearInterval(interval);
  }, [state.settings.reminderEnabled, state.settings.reminderTime, state.settings.reminderAnchor, state.records]);

  function navigate(next: Page) {
    setPage(next); setNotificationsOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openDate(date: string) {
    setSelectedDate(date); setShownWeek(weekStart(date)); navigate('today');
  }

  function updateRecord(update: (current: DayRecord) => DayRecord) {
    setState(previous => {
      const daily = previous.records[selectedDate] || emptyRecord(calculatePlan(previous, selectedDate));
      return { ...previous, records: { ...previous.records, [selectedDate]: update(daily) } };
    });
  }

  /** Minimum day: half a page of new memorization (plus the reviews) is enough for the day to count. */
  function setHalfMemorization(on: boolean) {
    setState(previous => {
      const base = previous.records[today] || emptyRecord(calculatePlan(previous, today));
      return { ...previous, records: { ...previous.records, [today]: { ...base, plan: { ...base.plan, newHalf: on } } } };
    });
    if (on) notify('الحد الأدنى اليوم: نصف صفحة من الحفظ الجديد مع مراجعتك.');
  }

  function openSession(task: TaskId) {
    if (selectedDate > today) {
      notify('هذا معاينة للورد القادم. يمكنك الإنجاز عندما يحين يومه.');
      return;
    }
    let next = task;
    if (task === 'new' && !newUnlocked && !record.completed.includes('new')) {
      if (farNeedsRedo) { next = 'far'; notify('أعد المراجعة البعيدة قبل الحفظ الجديد.'); }
      else if (!yesterdayDone) { next = 'yesterday'; notify('قبل الجديد، نطمئن على ثمن الأمس.'); }
      else { next = record.completed.includes('near') ? 'far' : 'near'; notify('القديم أولًا. أتم مراجعتك لتفتح الحفظ الجديد.'); }
    }
    setSession(next); timer.reset();
  }

  function closeSession() {
    const elapsed = timer.getSeconds();
    if (elapsed > 0) updateRecord(current => ({ ...current, seconds: current.seconds + elapsed }));
    timer.reset(); setSession(null);
  }

  function dismissTip(id: string) {
    setState(previous => ({ ...previous, dismissed: { ...previous.dismissed, [id]: today } }));
  }

  function updateThumnError(id: number, reset: boolean) {
    updateRecord(current => {
      const thumnErrors = { ...current.thumnErrors };
      if (reset) delete thumnErrors[id];
      else thumnErrors[id] = Math.min(99, (thumnErrors[id] || 0) + 1);
      return { ...current, thumnErrors };
    });
  }

  function updateTaskNote(text: string) {
    if (!session) return;
    setState(previous => setTaskNote(previous, selectedDate, session, text));
  }

  const sessionMistakes = state.mistakes.filter(mistake => !mistake.resolved && (
    (mistake.dueAt <= selectedDate && mistake.reviewedAt !== selectedDate) || record.checks[`far:mistake:${mistake.id}`]
  ));
  const sessionSteps = session ? getTaskSteps(session, plan, sessionMistakes) : [];
  const sessionDone = !!session && record.completed.includes(session);
  const mushafSurah = (() => {
    // المواضع التي يُفترض فيها عرض المصحف هي نوافذ الجلسات.
    // لا نملك حدود الأثمان بدقة سورة/آية، فنبدأ من سورة بداية الحزب
    // ثم يتنقل الحافظ يدويًا داخل العارض.
    try {
      if (!session) return HIZBS[currentHizb - 1]?.surah ?? 1;
      if (session === 'new') {
        const unit = Math.min(480, Math.max(1, plan.units + 1));
        return HIZBS[fromThumnId(unit).hizb - 1]?.surah ?? 1;
      }
      if (session === 'yesterday') {
        const unit = Math.min(480, Math.max(1, plan.units));
        return HIZBS[fromThumnId(unit).hizb - 1]?.surah ?? 1;
      }
      if (session === 'near' && plan.nearThumns.length) {
        return HIZBS[fromThumnId(plan.nearThumns[0]).hizb - 1]?.surah ?? 1;
      }
      if (session === 'far' && plan.farHizbs.length) {
        return HIZBS[plan.farHizbs[0] - 1]?.surah ?? 1;
      }
      return HIZBS[currentHizb - 1]?.surah ?? 1;
    } catch {
      return 1;
    }
  })();
  const mushafTitle =
    session === 'new' ? 'نص الثمن الجديد من المصحف (ورش)'
    : session === 'yesterday' ? 'نص ثمن الأمس من المصحف (ورش)'
    : session === 'near' ? 'نص المراجعة القريبة من المصحف (ورش)'
    : session === 'far' ? 'نص المراجعة البعيدة من المصحف (ورش)'
    : session === 'links' ? 'ربط البدايات من المصحف (ورش)'
    : 'نص التسميع من المصحف (ورش)';
  const stepsChecked = sessionSteps.every(step => record.checks[step.id]);
  const allStepsChecked = (() => {
    if (!session) return false;
    if (session === 'near') return allNearMarked(plan, record);
    if (session === 'yesterday') return stepsChecked && record.yesterdayErrors !== null && record.yesterdayErrors < 2;
    if (session === 'new') return stepsChecked && record.reads >= required;
    return stepsChecked;
  })();

  /** Why the finish button is still disabled — a disabled primary action should never be a mystery. */
  const finishHint = (() => {
    if (!session || allStepsChecked) return null;
    if (selectedDate > today) return 'هذا يوم قادم — يمكنك المعاينة، ويُسجَّل الإنجاز في يومه.';
    if (session === 'near') {
      const marked = plan.nearThumns.filter(id => record.nearMarks[id]).length;
      return `بقي ${ar(Math.max(0, plan.nearThumns.length - marked))} من ${ar(plan.nearThumns.length)} ثمنًا حتى تُتمّ المراجعة.`;
    }
    if (session === 'yesterday') {
      if (record.yesterdayErrors === null) return 'اختر عدد أخطاء التسميع أعلاه أولًا.';
      if (record.yesterdayErrors >= 2) return 'أعد التسميع حتى لا يتجاوز الخطأ واحدًا.';
    }
    if (session === 'new' && record.reads < required) {
      return `أكمل ${ar(required)} قراءات مركّزة أولًا — سجّلت ${ar(record.reads)}.`;
    }
    const pending = sessionSteps.filter(step => !record.checks[step.id]).length;
    if (pending === 1) return 'بقيت خطوة واحدة لإتمام هذه الجلسة.';
    if (pending === 2) return 'بقيت خطوتان لإتمام هذه الجلسة.';
    if (pending > 2) return `بقيت ${ar(pending)} خطوات لإتمام هذه الجلسة.`;
    return null;
  })();

  function finishSession() {
    if (!session || !allStepsChecked || selectedDate > today) return;
    const task = session;
    const unitsBefore = totalUnits(state);
    const elapsed = timer.getSeconds();
    setState(previous => {
      const daily = previous.records[selectedDate] || emptyRecord(calculatePlan(previous, selectedDate));
      let nextRecord: DayRecord = { ...daily, completed: [...new Set([...daily.completed, task])], seconds: daily.seconds + elapsed };
      let weakThumns = previous.weakThumns;
      if (task === 'new') {
        const req = requiredReads(previous, selectedDate, daily.difficulty);
        const quality = daily.reads - req;
        nextRecord = { ...nextRecord, requiredReads: req, quality, fragile: quality <= 0 };
      }
      if (task === 'far' && daily.errors >= 2) {
        weakThumns = unique([...previous.weakThumns, ...farThumnIds(daily.plan)]);
      }
      const nextMistakes = task === 'far' ? previous.mistakes.map(mistake => daily.checks[`far:mistake:${mistake.id}`]
        ? { ...mistake, reviewedAt: today, dueAt: addDays(today, 1) } : mistake) : previous.mistakes;
      return { ...previous, records: { ...previous.records, [selectedDate]: nextRecord }, mistakes: nextMistakes, weakThumns };
    });
    if (task === 'new') {
      const unitsAfter = unitsBefore + 1;
      if (Math.floor(unitsAfter / 8) > Math.floor(unitsBefore / 8)) {
        setCelebrateHizb(pathHizbToMushaf(Math.min(60, Math.floor(unitsAfter / 8))));
      }
    }
    timer.reset();
    if (task === 'far' && record.errors >= 2) {
      notify('أكثر من خطأين — أُضيفت لورد الغد، وأعد البعيدة قبل الحفظ الجديد.');
      setSession(null);
    } else if (task === 'yesterday') {
      const goFar = (missedReview || farNeedsRedo) && plan.tasks.includes('far') && !record.completed.includes('far');
      setSession(goFar ? 'far' : record.completed.includes('near') || !plan.tasks.includes('near') ? (plan.tasks.includes('new') && !record.completed.includes('new') ? 'new' : null) : 'near');
      notify(goFar ? 'ثبت الأمس. الآن نعطي المراجعة حقّها.' : 'بداية طيبة. الآن إلى الثمن الجديد.');
    } else {
      setSession(null);
      notify(completed + 1 === plan.tasks.length ? 'اكتمل وردك. بارك الله في حفظك، وتقبّل سعيك.' : task === 'new' ? 'ثمن جديد في قلبك. زادك الله رسوخًا.' : 'تقبّل الله منك. خطوة أخرى نحو الإتقان.');
    }
  }

  function reopenTask() {
    if (!session) return;
    const task = session;
    updateRecord(current => ({
      ...current,
      completed: current.completed.filter(item => item !== task),
      checks: Object.fromEntries(Object.entries(current.checks).map(([key, value]) => [key, key.startsWith(`${task}:`) ? false : value])),
      ...(task === 'far' ? { errors: 0 } : {}),
    }));
    notify('أُعيد فتح الخطوة، ويمكنك إتمامها من جديد.');
  }

  function addRead() {
    tryRead(() => {
      updateRecord(current => ({
        ...current,
        reads: Math.min(5, current.reads + 1),
        lastReadAt: Date.now(),
        requiredReads: requiredReads(state, selectedDate, current.difficulty),
      }));
    });
  }

  function setDifficulty(d: Difficulty) {
    setReadHint(null);
    updateRecord(current => ({
      ...current,
      difficulty: d,
      requiredReads: requiredReads(state, selectedDate, d),
    }));
  }

  function cycleNear(id: number) {
    updateRecord(current => {
      const next = { ...current.nearMarks };
      const cur = next[id];
      if (!cur) next[id] = 'done';
      else if (cur === 'done') next[id] = 'weak';
      else delete next[id];
      return { ...current, nearMarks: next };
    });
  }

  function markNearAll() {
    updateRecord(current => {
      const next = { ...current.nearMarks };
      const already = plan.nearThumns.length > 0 && plan.nearThumns.every(t => next[t]);
      if (already) {
        for (const t of plan.nearThumns) if (next[t] === 'done') delete next[t];
      } else {
        for (const t of plan.nearThumns) if (!next[t]) next[t] = 'done';
      }
      return { ...current, nearMarks: next };
    });
  }

  function clearWeak(unit: number) {
    setState(previous => {
      const daily = previous.records[selectedDate] || emptyRecord(calculatePlan(previous, selectedDate));
      const nearMarks: Record<number, NearMark> = { ...daily.nearMarks, [unit]: 'done' };
      return {
        ...previous,
        weakThumns: previous.weakThumns.filter(id => id !== unit),
        records: { ...previous.records, [selectedDate]: { ...daily, nearMarks } },
      };
    });
    notify('ثُبت الموضع. بارك الله فيك.');
  }

  function completeOnboarding(memorizedHizbs: number, memorizedEighths: number, partial: Partial<Settings>) {
    setState(previous => ({
      ...previous,
      onboarding: false,
      settings: {
        ...previous.settings,
        ...partial,
        baseHizbs: Math.max(0, Math.min(59, memorizedHizbs)),
        baseEighths: Math.max(0, Math.min(7, memorizedEighths)),
        startedAt: partial.startedAt || dateKey(),
      },
    }));
    setSelectedDate(dateKey());
    setShownWeek(weekStart(dateKey()));
    notify('أهلًا بك في وِرد. ابدأ بخطوة صغيرة، على بركة الله.');
  }

  function addMistake(existing: Mistake | null = null) {
    setEditingMistake(existing); setMistakeOpen(true); if (timer.running) timer.toggle();
  }

  function saveMistake(values: { surah: string; location: string; note: string; repeated: boolean; kind: MistakeKind; hizb: number }) {
    setState(previous => {
      if (editingMistake) return { ...previous, mistakes: previous.mistakes.map(mistake => mistake.id === editingMistake.id ? { ...mistake, surah: values.surah, location: values.location, note: values.note, kind: values.kind, hizb: values.hizb, repeats: values.repeated ? Math.max(2, mistake.repeats) : 1 } : mistake) };
      const existing = previous.mistakes.find(mistake => mistake.surah === values.surah && mistake.location === values.location && !mistake.resolved);
      if (existing) return { ...previous, mistakes: previous.mistakes.map(mistake => mistake.id === existing.id ? { ...mistake, repeats: mistake.repeats + 1, note: values.note || mistake.note, kind: values.kind, hizb: values.hizb, dueAt: addDays(today, 1), reviewedAt: null } : mistake) };
      const mistake: Mistake = { id: globalThis.crypto?.randomUUID?.() || `m-${Date.now()}`, surah: values.surah, location: values.location, note: values.note, kind: values.kind, hizb: values.hizb, repeats: values.repeated ? 2 : 1, createdAt: today, dueAt: addDays(today, 1), reviewedAt: null, resolved: false, ayah: null };
      return { ...previous, mistakes: [...previous.mistakes, mistake] };
    });
    setMistakeOpen(false);
    notify(editingMistake ? 'حُفظ تعديل الموضع.' : 'حُفظ الموضع، وسيكون معك في مراجعة الغد.');
  }

  function updateMistake(id: string, action: 'resolve' | 'review' | 'repeat') {
    setState(previous => ({ ...previous, mistakes: previous.mistakes.map(mistake => {
      if (mistake.id !== id) return mistake;
      if (action === 'resolve') return { ...mistake, resolved: !mistake.resolved, dueAt: today, reviewedAt: null };
      if (action === 'review') return { ...mistake, reviewedAt: today, dueAt: addDays(today, 1) };
      return { ...mistake, repeats: mistake.repeats + 1, dueAt: addDays(today, 1), reviewedAt: null };
    }) }));
    notify(action === 'resolve' ? (state.mistakes.find(item => item.id === id)?.resolved ? 'عاد الموضع إلى مراجعتك.' : 'الحمد لله، موضع آخر يرسخ في قلبك.') : action === 'review' ? 'سُجّلت مراجعة الموضع اليوم.' : 'سُجّل التعثر. نعيد الموضع في مراجعة الغد.');
  }

  function changeFar(dailyFar: 0.5 | 1 | 2) {
    setState(previous => ({ ...previous, settings: { ...previous.settings, dailyFar } }));
    notify(state.records[today] ? 'حُفظ المقدار. يُطبّق على الورد التالي، ويبقى ورد اليوم كما بدأتَه.' : 'حُفظ مقدار المراجعة الجديد. خطتك على قدر استطاعتك.');
  }

  async function saveSettings(settings: Settings) {
    setState(previous => ({ ...previous, settings })); setSettingsOpen(false);
    notify('حُفظت إعداداتك. خطوة هادئة، ومداومة مباركة.');
    if (settings.reminderEnabled && 'Notification' in window && Notification.permission === 'default') {
      try { const permission = await Notification.requestPermission(); if (permission !== 'granted') notify('حُفظ الموعد. سيظهر التذكير داخل التطبيق فقط أثناء فتحه.'); }
      catch { notify('التذكير داخل التطبيق مفعّل، ما دام مفتوحًا.'); }
    }
  }

  async function exportData() {
    const result = await shareOrDownload(JSON.stringify(state, null, 2), `wird-${today}.json`);
    if (result === 'cancelled') return;
    markBackupDone();
    notify('أُعدّت نسختك للحفظ. احتفظ بها في مكان آمن.');
  }

  async function importData(file: File) {
    try {
      if (file.size > 5_000_000) throw new Error('Large file');
      const parsed: unknown = JSON.parse(await file.text());
      if (!isValidState(parsed)) throw new Error('Invalid backup');
      setSettingsOpen(false); setConfirmation({ type: 'import', data: parsed });
    } catch { notify('تعذّرت قراءة النسخة. اختر ملف JSON سبق تصديره من وِرد.'); }
  }

  function confirmAction() {
    if (!confirmation) return;
    if (confirmation.type === 'reset') { setState(defaultState()); openDate(today); notify('بدأت صفحة جديدة. بارك الله في رحلتك.'); }
    else if (confirmation.type === 'delete') {
      setState(previous => ({ ...previous, mistakes: previous.mistakes.filter(mistake => mistake.id !== confirmation.id) }));
      notify('حُذف الموضع من قائمة التثبيت.');
    } else { setState(confirmation.data); openDate(today); notify('استُعيدت رحلتك بنجاح. أهلًا بعودتك.'); }
    setConfirmation(null);
  }

  function taskDescription(task: TaskId): string {
    switch (task) {
      case 'yesterday': return unitLabel(plan.units);
      case 'new': {
        const unit = plan.units + 1;
        const { hizb, thumn } = fromThumnId(Math.min(480, unit));
        const where = `${unitLabel(unit)} · ص ${ar(thumnPage(unit))} · الحزب ${ar(hizb)} ثمن ${ar(thumn)}`;
        return plan.newHalf ? `الحد الأدنى: نصف صفحة من ${where}` : where;
      }
      case 'near': return `${nearLabel(plan)} · ${ar(plan.nearThumns.length)} أثمان`;
      case 'far': {
        const span = farSpanLabel(plan);
        return `${farLabel(plan)}${span ? ` · ${span}` : ''}`;
      }
      case 'links': return 'بدايات الأثمان والسور، متتابعة';
      case 'recite': return 'لشيخ، لصاحب، أو عبر تسجيل صوتك';
    }
  }

  function renderTask(task: TaskId) {
    const Icon = TASK_ICONS[task];
    const done = record.completed.includes(task);
    const checkedSteps = Object.keys(record.checks).filter(key => key.startsWith(`${task}:`) && record.checks[key]).length;
    const totalSteps = getTaskSteps(task, plan, sessionMistakes).length;
    const nearMarked = task === 'near' ? plan.nearThumns.filter(id => record.nearMarks[id]).length : 0;
    const inProgress = !done && (checkedSteps > 0 || nearMarked > 0 || (task === 'yesterday' && record.yesterdayErrors !== null));
    const progressRatio = task === 'near'
      ? (plan.nearThumns.length ? nearMarked / plan.nearThumns.length : 0)
      : (totalSteps ? checkedSteps / totalSteps : 0);
    // One short, honest line under the title: how far in this step you already are.
    const meta = done
      ? 'تمّ بحمد الله'
      : inProgress
        ? task === 'near'
          ? `${ar(nearMarked)} من ${ar(plan.nearThumns.length)} ثمن`
          : task === 'yesterday'
            ? 'سُجّل التسميع، أكمل الخطوات'
            : `${ar(checkedSteps)} من ${ar(totalSteps)} خطوات`
        : task === 'far' && !plan.isRest
          ? `اليوم ${ar(plan.cycleDay)} من دورة ${ar(plan.cycleLength)} أيام`
          : TASK_DURATIONS[task];
    const actionLabel = done && !farNeedsRedo
      ? 'عرض الإنجاز'
      : inProgress
        ? 'أكمل من حيث وصلت'
        : task === 'new' && !newUnlocked
        ? 'يُفتح بعد مراجعتك'
        : task === 'new'
          ? 'ابدأ الحفظ'
          : task === 'links' || task === 'recite'
            ? 'ابدأ الخطوة'
            : task === 'far' && farNeedsRedo
              ? 'أعد التسميع'
              : 'ابدأ المراجعة';
    return <motion.article layout key={task} className={`task-card task-${task} ${done ? 'task-done' : ''} ${inProgress ? 'task-started' : ''}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: task === 'near' ? 0.05 : task === 'far' ? 0.1 : 0 }}>
      <div className="task-top"><span className="task-icon"><Icon size={23} strokeWidth={1.65} /></span><div className="task-copy"><div className="task-title-line"><h3>{TASK_NAMES[task]}</h3><span className="task-time">{TASK_TIMES[task]}</span></div><p>{taskDescription(task)}</p></div><span className={`task-status ${done ? 'checked' : inProgress ? 'started' : ''}`} aria-hidden="true">{done ? <Check size={16} strokeWidth={2.5} /> : inProgress ? <span /> : null}</span></div>
      {inProgress && <div className="task-progress" aria-hidden="true"><i style={{ width: `${Math.round(progressRatio * 100)}%` }} /></div>}
      {task === 'new' && hasYesterdayTask && <button className={`prerequisite ${yesterdayDone ? 'prerequisite-done' : ''}`} onClick={() => openSession('yesterday')}><span>{yesterdayDone ? <CircleCheck size={15} /> : <Sun size={15} />} {yesterdayDone ? 'ثمن الأمس حاضر، على بركة الله' : 'قبل الجديد، سمّع ثمن الأمس'}</span>{yesterdayDone ? <Check size={14} /> : <ArrowLeft size={15} />}</button>}
      {task === 'far' && farNeedsRedo && done && <div className="notice notice-warm"><Heart size={17} /><p>أكثر من خطأين. أعد البعيدة قبل الحفظ الجديد.</p></div>}
      {task === 'far' && <CycleBar plan={plan} />}
      <div className="task-bottom"><span className="task-duration">{done ? <CheckCheck size={14} /> : inProgress ? <ChartNoAxesCombined size={14} /> : <Clock3 size={14} />} {meta}</span><button className="task-action" onClick={() => openSession(task)} aria-label={`${actionLabel} — ${TASK_NAMES[task]}`}>{actionLabel}{task === 'new' && !newUnlocked && !done ? <LockKeyhole size={14} /> : <ArrowLeft size={15} />}</button></div>
    </motion.article>;
  }

  function renderGroupedTasks() {
    const nodes: React.ReactNode[] = [];
    for (const group of TIME_GROUPS) {
      const tasks = plan.tasks.filter(task => group.tasks.includes(task));
      if (group.label === 'قبل النوم') {
        if (!plan.isRest && plan.tasks.includes('new') && record.checks['new:first'] && !record.checks['new:second']) {
          nodes.push(<TimeMark key="night-mark" label="قبل النوم" />);
          nodes.push(<motion.article layout key="night" className="task-card task-night" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="task-top"><span className="task-icon"><Moon size={23} strokeWidth={1.65} /></span><div className="task-copy"><div className="task-title-line"><h3>تسميع أخير للثمن</h3><span className="task-time">قبل النوم</span></div><p>{unitLabel(plan.units + 1)}</p></div></div>
            <div className="notice"><Sparkles size={17} /><p>سمّعه الآن من الذاكرة — التسميع قبل النوم يثبّت بالنوم.</p></div>
            <div className="task-bottom"><span className="task-duration"><Clock3 size={14} /> نحو ٥ دقائق</span><button className="task-action" onClick={() => openSession('new')}>أكمل التسميع <ArrowLeft size={15} /></button></div>
          </motion.article>);
        }
        continue;
      }
      if (!tasks.length) continue;
      nodes.push(<TimeMark key={`${group.label}-mark`} label={group.label} />);
      nodes.push(...tasks.map(renderTask));
      if (group.label === 'العصر / المغرب' && plan.weakExtra.length > 0) {
        nodes.push(<WeakExtraCard key="weak" plan={plan} onClear={clearWeak} />);
      }
    }
    return nodes;
  }

  const SessionIcon = session ? TASK_ICONS[session] : BookOpen;

  if (state.onboarding) {
    return <MotionConfig reducedMotion="user"><Onboarding onComplete={completeOnboarding} />
      <AnimatePresence>{toast && <motion.div key={toast.id} className="toast" role="status" initial={{ opacity: 0, y: 18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}><CircleCheck size={20} /><span>{toast.text}</span><button aria-label="إخفاء الرسالة" onClick={() => setToast(null)}><X size={16} /></button></motion.div>}</AnimatePresence>
    </MotionConfig>;
  }

  return <MotionConfig reducedMotion="user"><div className="app-shell" dir="rtl">
    <a className="skip-link" href="#main-content">تجاوز إلى المحتوى</a>
    <aside className="sidebar" aria-label="التنقل الرئيسي">
      <button className="brand-button" onClick={() => openDate(today)}><Brand /></button>
      <div className="sidebar-nav-label">مساحتك مع القرآن</div>
      <nav className="desktop-nav">{NAVIGATION.map(item => <button key={item.id} onClick={() => { if (item.id === 'today') openDate(today); else navigate(item.id); }} className={`nav-item ${page === item.id ? 'active' : ''}`} aria-current={page === item.id ? 'page' : undefined}><item.icon size={21} strokeWidth={1.6} /><span>{item.label}</span>{item.id === 'mistakes' && due.length > 0 && <span className="nav-count">{ar(due.length)}</span>}{page === item.id && <span className="active-nav-dot" />}</button>)}</nav>
      <div className="sidebar-verse"><LeafDrawing /><p>وَلَقَدْ يَسَّرْنَا الْقُرْآنَ<br />لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ</p><span>سورة القمر، الآية ١٧</span></div>
      <div className="sidebar-footer"><button className="nav-item" onClick={() => setSettingsOpen(true)}><Settings2 size={20} strokeWidth={1.6} /><span>الإعدادات</span></button><div className={`storage-status ${storageError ? 'storage-error' : ''}`}><span />{storageError ? 'تعذّر الحفظ على المتصفح' : 'محفوظ على جهازك، لك وحدك'}<ShieldCheck size={13} /></div></div>
    </aside>

    <div className="mobile-topbar"><button className="brand-button" onClick={() => openDate(today)}><Brand small /></button><div className="mobile-top-actions"><button className="icon-button" aria-label="تبديل المظهر" onClick={() => setState(p => ({ ...p, settings: { ...p.settings, theme: p.settings.theme === 'light' ? 'dark' : 'light' } }))}>{state.settings.theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}</button><button className="icon-button" aria-label="الإعدادات" onClick={() => setSettingsOpen(true)}><Settings2 size={20} /></button><button className="icon-button notification-button" onClick={() => setNotificationsOpen(value => !value)} aria-label="الإشعارات" aria-expanded={notificationsOpen}><Bell size={20} />{due.length > 0 && <i />}</button></div></div>

    <main className="main-content" id="main-content">
      <div className={`desktop-utility ${page === 'today' ? 'utility-today' : ''}`}><div className="date-display"><CalendarDays size={19} strokeWidth={1.5} /><div><strong>{formatDate(selectedDate)}</strong><span>{hijriDate(selectedDate)}</span></div></div><button className="icon-button" aria-label="تبديل المظهر" onClick={() => setState(p => ({ ...p, settings: { ...p.settings, theme: p.settings.theme === 'light' ? 'dark' : 'light' } }))}>{state.settings.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button><button className="icon-button notification-button" onClick={() => setNotificationsOpen(value => !value)} aria-label="الإشعارات" aria-expanded={notificationsOpen}><Bell size={20} strokeWidth={1.5} />{due.length > 0 && <i />}</button></div>
      <AnimatePresence mode="wait">
        <motion.div key={page} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.22 }}>
          {page === 'today' && <div className="today-page">
            <header className="today-heading">
              <span className="eyebrow greeting"><Sun size={16} strokeWidth={1.5} /><span className="greeting-text">{state.settings.name ? `السلام عليك، يا ${state.settings.name}` : 'السلام عليك، يا رفيق القرآن'}</span><span className="greeting-date">{formatDate(selectedDate)}</span></span>
              <h1>كل يوم، أقرب إلى الإتقان.</h1>
              <p>رحلة الألف آية تبدأ بورد، وتزهر بالمداومة.</p>
            </header>
            <TodayHero
              tasks={plan.tasks}
              completed={record.completed}
              description={taskDescription}
              half={!!plan.newHalf}
              isToday={currentDay}
              isRest={plan.isRest}
              estimatedPages={plan.estimatedPages}
              onStart={openSession}
              onHalf={setHalfMemorization}
              onBackToToday={() => openDate(today)}
              onSeeProgress={() => navigate('history')}
            />

            <section className="week-strip" aria-label="أيام الأسبوع"><div className="week-label"><span>{shownWeek === weekStart(today) ? 'هذا الأسبوع' : formatDate(shownWeek, true)}</span><div><button className="week-arrow" aria-label="الأسبوع السابق" onClick={() => setShownWeek(value => addDays(value, -7))}><ChevronRight size={16} /></button><button className="week-arrow" aria-label="الأسبوع التالي" disabled={shownWeek > weekStart(today)} onClick={() => setShownWeek(value => addDays(value, 7))}><ChevronLeft size={16} /></button></div></div><div className="week-days">{Array.from({ length: 7 }, (_, i) => {
              const date = addDays(shownWeek, i);
              const dateObj = fromKey(date);
              const done = isDayComplete(state.records[date]);
              const partial = !!state.records[date]?.completed.length;
              return <button key={date} className={`week-day ${selectedDate === date ? 'selected' : ''} ${date === today ? 'actual-today' : ''} ${done ? 'day-done' : ''}`} aria-label={`${WEEKDAYS[dateObj.getDay()]} ${ar(dateObj.getDate())}${date === today ? '، اليوم' : ''}${done ? '، مكتمل' : ''}`} aria-pressed={date === selectedDate} onClick={() => setSelectedDate(date)}><span>{date === today ? 'اليوم' : WEEKDAYS[dateObj.getDay()]}</span><strong>{ar(dateObj.getDate())}</strong>{done ? <Check size={11} /> : <i className={partial ? 'partial' : ''} />}</button>;
            })}</div></section>

            {!currentDay && <div className="date-notice"><CalendarDays size={16} /><span>{selectedDate > today ? 'معاينة يوم قادم. يتحدد الورد النهائي حسب تقدّمك الفعلي.' : 'عدّل سجلّ هذا اليوم — يُحتسب تلقائيًا في تقدّمك.'}</span><button className="text-button" onClick={() => openDate(today)}>إلى اليوم <ArrowLeft size={14} /></button></div>}

            {currentDay && isFirstAppDay && !firstDayDismissed && <FirstDayCard onDismiss={() => setFirstDayDismissed(true)} />}

            <CoachBanners tips={coachTips} onDismiss={dismissTip} />

            <div className="daily-content-grid"><section className="daily-tasks"><div className="section-heading"><h2>{currentDay ? 'وردك اليوم' : `ورد ${WEEKDAYS[fromKey(selectedDate).getDay()]}`}</h2><span>{plan.isRest ? 'يوم للتثبيت' : 'ثلاث طبقات، لحفظٍ أثبت'}</span></div>{missedReview && !reviewsDone && !plan.isRest && currentDay && <div className="review-notice"><Leaf size={17} /><p>مراجعة الأمس لم تكتمل. أتمّ القريبة والبعيدة قبل الحفظ الجديد.</p></div>}<div className="task-list">{renderGroupedTasks()}</div><p className="tasks-footnote"><Heart size={14} strokeWidth={1.6} /> {plan.isRest ? 'استرح من الزيادة، لا من صحبة القرآن.' : 'وزّع وردك على يومك. المهم أن يبقى الوصل.'}</p></section>

              <aside className="companion-column">
                <section className="journey-section">
                  <div className="section-heading"><h2>رحلة حفظك</h2><button className="text-button" onClick={() => navigate('plan')}>خطتي <ArrowLeft size={14} /></button></div>
                  <button className="journey-visual" onClick={() => navigate('plan')} aria-label="عرض خطة الحفظ وتقدم الأحزاب">
                    <div className="journey-intro"><span><Sprout size={15} /> غرسٌ ينمو كل يوم</span><h3>{ar(Math.floor(units / 8))} <span>أحزاب في قلبك</span></h3><p>{streak > 0 ? `${ar(streak)} أيام من الوصل والمداومة` : 'وما زال في الرحلة متّسع للنور'}</p></div>
                    <img src="/images/quran-study.jpg" alt="مصحف أخضر بجانب غصن زيتون في ضوء هادئ" />
                    <div className="journey-progress"><div className="between"><span>الحزب {ordinal(currentHizb)}</span><span>{ar(currentEighths)} <small>/ ٨ أثمان</small></span></div><div className="eighths-track">{Array.from({ length: 8 }, (_, i) => <span className={i < currentEighths ? 'filled' : ''} key={i} />)}</div></div>
                  </button>
                  {Object.keys(state.records).filter(d => state.records[d].completed.length > 0).length === 0 && <button className="text-button starting-point-link" onClick={() => setSettingsOpen(true)}><Settings2 size={12} /> عدّل نقطة البداية لتطابق محفوظك</button>}
                </section>
                <section className="attention-section"><div className="section-heading"><h2>مواضع التثبيت {due.length > 0 && <span className="small-count">{ar(due.length)}</span>}</h2><button className="icon-button tiny-icon-button" onClick={() => addMistake()} aria-label="إضافة موضع للتثبيت"><Plus size={18} /></button></div>{due.length ? <><div className="attention-list">{due.slice(0, 2).map(mistake => <button key={mistake.id} onClick={() => navigate('mistakes')}><Bookmark size={17} /><span><strong>{mistake.surah}</strong><small>{mistake.location}</small></span><ChevronLeft size={15} /></button>)}</div><button className="text-button attention-all" onClick={() => navigate('mistakes')}>كل المواضع <ArrowLeft size={14} /></button></> : <div className="attention-empty"><span className="bookmark-outline"><Bookmark size={22} strokeWidth={1.4} /></span><div><h3>{state.mistakes.some(mistake => !mistake.resolved) ? 'مواضعك في ورد الغد' : 'ليطمئنّ قلبك إلى حفظك'}</h3><p>{state.mistakes.some(mistake => !mistake.resolved) ? 'كل ما سجّلته محفوظ، نعود إليه في وقته.' : 'سجّل ما تعثرت فيه، نعود إليه معًا في مراجعة الغد.'}</p><button className="text-button" onClick={() => addMistake()}><Plus size={14} /> أضف موضعًا</button></div></div>}</section>
                <div className="gentle-reminder"><Leaf size={17} strokeWidth={1.4} /><p>لا تقِس رحلتك بما حفظت اليوم،<br /><strong>بل بما بقي ثابتًا في قلبك.</strong></p></div>
              </aside>
            </div>
          </div>}
          {page === 'plan' && <PlanPage state={state} today={today} onEdit={() => setSettingsOpen(true)} onFarChange={changeFar} />}
          {page === 'map' && <MapPage state={state} today={today} onAddMistake={() => addMistake()} />}
          {page === 'history' && <HistoryPage state={state} today={today} onOpenDate={openDate} onExport={exportData} />}
          {page === 'mistakes' && <MistakesPage state={state} today={today} onAdd={() => addMistake()} onEdit={addMistake} onResolve={id => updateMistake(id, 'resolve')} onReview={id => updateMistake(id, 'review')} onRepeat={id => updateMistake(id, 'repeat')} onDelete={id => setConfirmation({ type: 'delete', id })} />}
        </motion.div>
      </AnimatePresence>
      <footer className="main-footer"><Flower2 size={15} strokeWidth={1.3} /><span>اللهم اجعل القرآن ربيع قلوبنا.</span></footer>
    </main>

    <nav className="mobile-nav" aria-label="التنقل الرئيسي">{NAVIGATION.map(item => <button key={item.id} className={page === item.id ? 'active' : ''} aria-current={page === item.id ? 'page' : undefined} onClick={() => item.id === 'today' ? openDate(today) : navigate(item.id)}><item.icon size={21} strokeWidth={page === item.id ? 1.9 : 1.6} /><span>{item.mobileLabel}</span>{page === item.id && <motion.i layoutId="mobile-nav-indicator" />}</button>)}</nav>

    <AnimatePresence>{notificationsOpen && <><motion.div className="popover-dismiss" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setNotificationsOpen(false)} /><motion.div className="notifications-popover" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><div className="section-heading"><h2>رسائل لطيفة</h2><button className="icon-button tiny-icon-button" aria-label="إغلاق الإشعارات" onClick={() => setNotificationsOpen(false)}><X size={17} /></button></div><button className="notification-item" onClick={() => openDate(today)}><Sun size={22} /><div><strong>{isDayComplete(state.records[today]) ? 'وردك اكتمل، تقبّل الله منك' : 'موعدك مع الآيات ينتظرك'}</strong><p>{isDayComplete(state.records[today]) ? 'نسأل الله أن يجعل القرآن نورًا لقلبك.' : 'لا تحتاج وقتًا مثاليًا، فقط خطوة تبدأ بها.'}</p></div></button>{due.length > 0 && <button className="notification-item" onClick={() => navigate('mistakes')}><Bookmark size={21} /><div><strong>{ar(due.length)} مواضع تحتاج عناية</strong><p>مراجعة إضافية قصيرة، لحفظ أكثر رسوخًا.</p></div></button>}<div className="notification-reminder"><span>{state.settings.reminderEnabled ? `التذكير اليومي: ${state.settings.reminderTime}` : 'تذكير هادئ، في وقت تختاره'}</span><button className="text-button" onClick={() => { setNotificationsOpen(false); setSettingsOpen(true); }}>{state.settings.reminderEnabled ? 'تعديل' : 'تفعيل'} <ArrowLeft size={13} /></button></div></motion.div></>}</AnimatePresence>

    <AnimatePresence mode="wait">
      {session && !mistakeOpen && <Modal key={`session-${session}`} title={TASK_NAMES[session]} subtitle={taskDescription(session)} icon={<SessionIcon size={23} />} onClose={closeSession} className="session-modal">
        {sessionDone ? <div className="completed-session"><div className="completed-seal"><CheckCheck size={37} strokeWidth={1.4} /></div><h3>تمّ بحمد الله</h3><p>خطوة أتممتها، وأثر بقي في قلبك.</p><button className="button button-primary" onClick={closeSession}>العودة إلى وردي <ArrowLeft size={17} /></button><button className="text-button muted-button" onClick={reopenTask}><RotateCcw size={14} /> تراجُع عن إتمام هذه الخطوة</button></div> : <>
          <div className="session-timer"><div><span><Leaf size={15} /> مساحة للتفرّغ</span><small>اترك العجلة خارج هذه اللحظة.</small></div><div className="timer-controls"><strong dir="ltr" aria-live="off"><TimerText timer={timer} /></strong><button className={`icon-button timer-play ${timer.running ? 'running' : ''}`} onClick={timer.toggle} aria-label={timer.running ? 'إيقاف المؤقت مؤقتًا' : 'تشغيل مؤقت التفرغ'}>{timer.running ? <Pause size={16} /> : <Play size={16} />}</button><button className="icon-button" aria-label="إعادة ضبط المؤقت" onClick={timer.reset}><RotateCcw size={16} /></button></div></div>
          <SessionRecorder date={selectedDate} task={session} />

          {session === 'new' && <ReadsCounter record={record} required={required} onRead={addRead} onDifficulty={setDifficulty} blockedHint={readHint} />}

          {session === 'yesterday' && <YesterdayErrors value={record.yesterdayErrors} onPick={errors => updateRecord(current => ({ ...current, yesterdayErrors: errors, checks: { ...current.checks, 'yesterday:recited': errors < 2 } }))} />}
          {session === 'yesterday' && record.yesterdayErrors === 2 && <div className="notice notice-warm"><Heart size={17} /><p>أكثر من خطأين. أعد التسميع من الذاكرة قبل الإتمام.</p></div>}

          {session === 'near' && <NearGrid plan={plan} record={record} onCycle={cycleNear} onMarkAll={markNearAll} />}

          {session !== 'new' && session !== 'near' && session !== 'yesterday' && <div className="session-steps">{sessionSteps.map((step, i) => <button key={step.id} className={`session-step ${record.checks[step.id] ? 'checked' : ''}`} role="checkbox" aria-checked={!!record.checks[step.id]} onClick={() => updateRecord(current => ({ ...current, checks: { ...current.checks, [step.id]: !current.checks[step.id] } }))}><span className="step-checkbox">{record.checks[step.id] ? <Check size={16} strokeWidth={2.3} /> : <span>{ar(i + 1)}</span>}</span><span className="step-text"><strong>{step.text}</strong><small>{step.detail}</small></span></button>)}</div>}

          {session === 'new' && sessionSteps.length > 0 && <div className="session-steps">{sessionSteps.map((step, i) => {
            const gated = step.id === 'new:memorized' && record.reads < required;
            return <button key={step.id} className={`session-step ${record.checks[step.id] ? 'checked' : ''} ${gated ? 'gated' : ''}`} role="checkbox" aria-checked={!!record.checks[step.id]} disabled={gated} onClick={() => { if (gated) { notify(`أكمل ${ar(required)} قراءات مركّزة أولًا.`); return; } updateRecord(current => ({ ...current, checks: { ...current.checks, [step.id]: !current.checks[step.id] } })); }}><span className="step-checkbox">{record.checks[step.id] ? <Check size={16} strokeWidth={2.3} /> : gated ? <LockKeyhole size={13} /> : <span>{ar(i + 1)}</span>}</span><span className="step-text"><strong>{step.text}</strong><small>{gated ? `مقفل حتى تُكمل ${ar(required)} قراءات — الإتقان يقيس غدك.` : step.detail}</small></span></button>;
          })}</div>}

          {session === 'new' && record.checks['new:first'] && !record.checks['new:second'] && <div className="notice"><Sun size={17} /><p>حُفظ تقدّمك. يمكنك العودة للتسميع الثاني قبل النوم؛ تابع مراجعتك الآن.</p></div>}
          {session === 'new' && record.quality !== null && record.completed.includes('new') === false && record.reads >= required && <div className="notice"><Sparkles size={17} /><p>{record.reads - required <= 0 ? 'سيُسجَّل إتقانًا هشًّا — غدًا قد يحتاج وردًا إضافيًا.' : 'إتقان راسخ — زائدة عن الحد الأدنى.'}</p></div>}
          {session === 'far' && <div className="error-counter"><div><strong>كيف كان التسميع؟</strong><span>عدد مرات التوقف أو الخطأ</span></div><div className="error-options">{[0, 1, 2].map(count => <button key={count} onClick={() => updateRecord(current => ({ ...current, errors: count }))} aria-pressed={record.errors === count} className={`${record.errors === count ? 'selected' : ''} ${count === 2 && record.errors === count ? 'danger' : ''}`}>{count === 2 ? 'أكثر' : ar(count)}</button>)}</div></div>}
          {session === 'far' && <ErrorChips thumns={farThumnIds(plan)} errors={record.thumnErrors} onInc={id => updateThumnError(id, false)} onReset={id => updateThumnError(id, true)} />}
          {session === 'near' && <ErrorChips thumns={plan.nearThumns} errors={record.thumnErrors} onInc={id => updateThumnError(id, false)} onReset={id => updateThumnError(id, true)} />}
          {session && !sessionDone && (
            <WarshReader
              key={`mushaf-${session}-${plan.date}-${mushafSurah}`}
              defaultSurah={mushafSurah}
              title={mushafTitle}
              defaultOpen={session === 'new'}
            />
          )}
          {session && <TaskNote task={session} value={record.taskNotes[session] || ''} onChange={updateTaskNote} />}
          {session === 'far' && record.errors >= 2 && <div className="notice notice-warm"><Heart size={17} /><p>أكثر من خطأين — قصّر الدورة أو أبطئ الحفظ الجديد، وأعد البعيدة قبل فتح ثمن جديد.</p></div>}
          <button className="add-mistake-link" onClick={() => addMistake()}><Bookmark size={16} /><span>تعثّرت في موضع؟ سجّله للتثبيت</span><Plus size={17} /></button>
          <div className="session-footer"><button className="button button-primary" disabled={!allStepsChecked} onClick={finishSession}><Check size={18} /> {session === 'yesterday' ? 'تمّ التسميع، نكمل' : session === 'new' ? 'أتممت حفظ الثمن وتسميعه' : session === 'near' ? 'أتممت المراجعة القريبة' : 'أتممت هذه الخطوة'}</button>{finishHint && <p className="session-hint">{finishHint}</p>}<button className="text-button muted-button" onClick={closeSession}>أكمل لاحقًا، احفظ تقدّمي</button></div>
        </>}
      </Modal>}
      {mistakeOpen && <Modal key="mistake" title={editingMistake ? 'عناية بموضع التثبيت' : 'موضع يحتاج قليلًا من العناية'} subtitle="سجّله الآن، ليكون أقرب إلى الإتقان غدًا." icon={<Bookmark size={22} />} onClose={() => setMistakeOpen(false)}><MistakeForm existing={editingMistake} defaultHizb={currentHizb} onSave={saveMistake} onCancel={() => setMistakeOpen(false)} /></Modal>}
      {celebrateHizb !== null && <Modal key="celebrate" title={celebrateHizb <= 1 ? 'مبارك! ختمت محفوظك' : `مبارك! أتممت الحزب ${ar(celebrateHizb)}`} subtitle={celebrateHizb <= 1 ? 'اللهم اجعله حجة لك لا عليك.' : 'تنتقل الطبقات تلقائيًا ابتداءً من الغد.'} icon={<Sparkles size={22} />} onClose={() => setCelebrateHizb(null)} className="confirm-modal"><p className="confirmation-text">{celebrateHizb <= 1 ? 'وصلت إلى الفاتحة. الحمد لله — ثباتك هو الفوز.' : `حفظك ينمو. الحمد لله — انتقلت إلى الحزب ${ar(celebrateHizb - 1)} بإذن الله. أكمل بهدوء، فالثبات أهم من العجلة.`}</p><div className="modal-footer"><button className="button button-primary" onClick={() => setCelebrateHizb(null)}>الحمد لله، متابعة</button></div></Modal>}
      {settingsOpen && <Modal key="settings" title="على قدر خطاك" subtitle="خطة مرنة، وإعدادات تشبه يومك." icon={<Settings2 size={22} />} onClose={() => setSettingsOpen(false)} className="settings-modal"><SettingsForm state={state} onSave={saveSettings} onExport={exportData} onImport={importData} onReset={() => { setSettingsOpen(false); setConfirmation({ type: 'reset' }); }} /></Modal>}
      {confirmation && <Modal key="confirmation" title={confirmation.type === 'delete' ? 'هل تحذف هذا الموضع؟' : confirmation.type === 'reset' ? 'صفحة جديدة في رحلتك؟' : 'هل تستعيد هذه النسخة؟'} icon={confirmation.type === 'delete' ? <Trash2 size={22} /> : <RefreshCw size={22} />} onClose={() => setConfirmation(null)} className="confirm-modal"><p className="confirmation-text">{confirmation.type === 'delete' ? 'سيُحذف من قائمة التثبيت. لن تتأثر بقية خطتك أو إنجازاتك.' : confirmation.type === 'reset' ? 'سيُحذف سجلّ الإنجاز ومواضع التثبيت من هذا الجهاز. صدّر نسخة أولًا إن أردت الاحتفاظ بها.' : 'ستُستبدل بيانات هذا المتصفح بالخطة والسجلّ الموجودين في النسخة. يمكنك إلغاء العملية لتصدير بياناتك الحالية أولًا.'}</p><div className="modal-footer"><button className={`button ${confirmation.type === 'import' ? 'button-primary' : 'button-danger'}`} onClick={confirmAction}>{confirmation.type === 'delete' ? 'نعم، احذف الموضع' : confirmation.type === 'reset' ? 'ابدأ رحلة جديدة' : 'استعادة النسخة'}</button><button className="button button-ghost" onClick={() => setConfirmation(null)}>إلغاء</button></div></Modal>}
    </AnimatePresence>
    <AnimatePresence>{toast && <motion.div key={toast.id} className="toast" role="status" initial={{ opacity: 0, y: 18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}><CircleCheck size={20} /><span>{toast.text}</span><button aria-label="إخفاء الرسالة" onClick={() => setToast(null)}><X size={16} /></button></motion.div>}</AnimatePresence>
    {session && !sessionVisible && <FloatingTimer timer={timer} taskLabel={TASK_NAMES[session]} onClose={closeSession} />}
    {storageError && <div className="storage-warning" role="alert">التخزين غير متاح. احتفظ بنسخة من بياناتك قبل إغلاق الصفحة. <button onClick={exportData}>تصدير</button></div>}
  </div></MotionConfig>;
}
