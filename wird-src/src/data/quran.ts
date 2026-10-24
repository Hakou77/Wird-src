export const SURAHS = [
  "",
  "الفاتحة",
  "البقرة",
  "آل عمران",
  "النساء",
  "المائدة",
  "الأنعام",
  "الأعراف",
  "الأنفال",
  "التوبة",
  "يونس",
  "هود",
  "يوسف",
  "الرعد",
  "إبراهيم",
  "الحجر",
  "النحل",
  "الإسراء",
  "الكهف",
  "مريم",
  "طه",
  "الأنبياء",
  "الحج",
  "المؤمنون",
  "النور",
  "الفرقان",
  "الشعراء",
  "النمل",
  "القصص",
  "العنكبوت",
  "الروم",
  "لقمان",
  "السجدة",
  "الأحزاب",
  "سبأ",
  "فاطر",
  "يس",
  "الصافات",
  "ص",
  "الزمر",
  "غافر",
  "فصلت",
  "الشورى",
  "الزخرف",
  "الدخان",
  "الجاثية",
  "الأحقاف",
  "محمد",
  "الفتح",
  "الحجرات",
  "ق",
  "الذاريات",
  "الطور",
  "النجم",
  "القمر",
  "الرحمن",
  "الواقعة",
  "الحديد",
  "المجادلة",
  "الحشر",
  "الممتحنة",
  "الصف",
  "الجمعة",
  "المنافقون",
  "التغابن",
  "الطلاق",
  "التحريم",
  "الملك",
  "القلم",
  "الحاقة",
  "المعارج",
  "نوح",
  "الجن",
  "المزمل",
  "المدثر",
  "القيامة",
  "الإنسان",
  "المرسلات",
  "النبأ",
  "النازعات",
  "عبس",
  "التكوير",
  "الانفطار",
  "المطففين",
  "الانشقاق",
  "البروج",
  "الطارق",
  "الأعلى",
  "الغاشية",
  "الفجر",
  "البلد",
  "الشمس",
  "الليل",
  "الضحى",
  "الشرح",
  "التين",
  "العلق",
  "القدر",
  "البينة",
  "الزلزلة",
  "العاديات",
  "القارعة",
  "التكاثر",
  "العصر",
  "الهمزة",
  "الفيل",
  "قريش",
  "الماعون",
  "الكوثر",
  "الكافرون",
  "النصر",
  "المسد",
  "الإخلاص",
  "الفلق",
  "الناس",
];

import { SURAH_AYATS, THUMN_ENDS, type ThumnEnd } from './thumns';
import { HIZB_END_POINTS, THUMN_END_POINTS, THUMN_START_POINTS, WARSH_MUSHAF_PAGES } from './warsh-pages';

export type Hizb = {
  n: number;
  surah: number;
  ayah: number;
  juz: number;
  /** صفحة مطالع الحزب في مصحف ورش، وصفحة آخر آية فيه — من جدولٍ مولَّد لا من استيفاء. */
  page: number;
  endPage: number;
};

export const RIWAYAH = 'ورش عن نافع';

export const THUMNS_PER_HIZB = 8;
export const TOTAL_HIZBS = 60;
export const TOTAL_SURAHS = 114;
export const TOTAL_THUMNS = 480;

/**
 * حدود الأثمان والأحزاب كلها تُقرأ من جدول ورش (THUMN_ENDS) وحده: نهاية كل ثمن
 * منقَّحة، وبدايتها ما يلي نهاية الثمن الذي قبلها. فلا تخطو الخطة خطوةً لا يعرفها
 * المصحف، ولا يختلف عنوانُ المهمة عن نصِّها.
 *
 * أرقام الصفحات كلها من `src/data/warsh-pages.ts`: قائمة صفحات مصحف ورش — طباعة مجمع
 * الملك فهد، ٦٠٤ صفحة — مُحوَّلةً إلى ترقيم آيات ورش قبل تحديد الصفحة، فلا صفحة تُبنى
 * بخطوة ثابتة بين مطالع الأحزاب ولا يُقارَب فيها ترقيمُ المدينة. يُعاد توليده بـ
 * `node scripts/build-warsh-pages.mjs`، ويحرس اتساقَه `npm run check:thumns`.
 */

/** الآية التالية في المصحف: تاليةُها في السورة، أو أول آية من السورة التالية عند تمامها. */
export function nextAyah([surah, ayah]: ThumnEnd): ThumnEnd {
  const last = SURAH_AYATS[surah - 1];
  if (ayah < last) return [surah, ayah + 1];
  for (let next = surah + 1; next <= TOTAL_SURAHS; next++) {
    if (SURAH_AYATS[next - 1] > 0) return [next, 1];
  }
  return [surah, ayah]; // بعد آخر آية في الناس لا تالية
}

/** بداية كل ثمن = ما يلي نهاية الثمن الذي قبله مباشرة؛ وبداية الحزب ١ = الفاتحة ١. */
function buildThumnStarts(): ThumnEnd[][] {
  const starts: ThumnEnd[][] = [];
  let cursor: ThumnEnd = [1, 1];
  for (let hizb = 0; hizb < TOTAL_HIZBS; hizb++) {
    const row: ThumnEnd[] = [];
    for (let thumn = 0; thumn < THUMNS_PER_HIZB; thumn++) {
      row.push(cursor);
      cursor = nextAyah(THUMN_ENDS[hizb][thumn]);
    }
    starts.push(row);
  }
  return starts;
}

/** ٦٠ × ٨ بدايات، مشتقّة من الجدول — المرجع الوحيد لبدايات الأثمان والأحزاب. */
export const THUMN_STARTS: readonly (readonly ThumnEnd[])[] = buildThumnStarts();

/** بداية الحزب n = نهاية الثمن ٨ من الحزب n−١ + آية واحدة. */
export const HIZB_STARTS: readonly ThumnEnd[] = THUMN_STARTS.map(row => row[0]);

export const HIZBS: Hizb[] = HIZB_STARTS.map(([surah, ayah], index) => ({
  n: index + 1,
  surah,
  ayah,
  juz: Math.ceil((index + 1) / 2),
  page: THUMN_START_POINTS[index][0][0],
  endPage: HIZB_END_POINTS[index][0],
}));

/** عدد صفحات مصحف ورش (المدينة، طبعة مجمع الملك فهد) — للعرض «من ٦٠٤». */
export const LAST_WARSH_PAGE = WARSH_MUSHAF_PAGES;

/** صفحةُ بداية الحزب وصفحةُ نهايته، كما تُطبعان في مصحف ورش. */
export function hizbPages(hizb: number): { page: number; endPage: number } {
  const h = Math.min(TOTAL_HIZBS, Math.max(1, Math.round(hizb) || 1));
  return { page: THUMN_START_POINTS[h - 1][0][0], endPage: HIZB_END_POINTS[h - 1][0] };
}

/** «ص ٥٤٥» إذا اتّفقت الصفحتان، و«ص ٥٤٤–٥٤٥» إذا امتدّ الورْد بينهما. */
export function pageSpanLabel(from: number, to: number): string {
  return from === to ? `ص ${toAr(from)}` : `ص ${toAr(from)}–${toAr(to)}`;
}

export function hizbPagesLabel(hizb: number): string {
  const { page, endPage } = hizbPages(hizb);
  return pageSpanLabel(page, endPage);
}

/**
 * أين يقع الثمن بالضبط: من السورة والآية إلى السورة والآية.
 *
 * القراءة كلها من جدول ورش المحقَّق (THUMN_ENDS وTHUMN_STARTS) لا من معادلة تقسيم،
 * فيطابق النصُّ عنوانَ المهمة تمامًا — في أوّل الحزب وفي منتصفه.
 */
export type ThumnPosition = {
  hizb: number;
  thumn: number;
  startSurah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
  /** صفحتا البداية والنهاية في مصحف ورش. */
  startPage: number;
  endPage: number;
  /** الترقيم المطبوع في مصحف ورش للآيتين نفسهما — قد يختلف عن ترقيم الجدول. */
  warshStartSurah: number;
  warshStartAyah: number;
  warshEndSurah: number;
  warshEndAyah: number;
};

export function thumnPosition(unit: number): ThumnPosition {
  const safe = Math.min(TOTAL_THUMNS, Math.max(1, Math.round(unit) || 1));
  const { hizb, thumn } = fromThumnId(safe);
  const [startSurah, startAyah] = THUMN_STARTS[hizb - 1][thumn - 1];
  const [endSurah, endAyah] = THUMN_ENDS[hizb - 1][thumn - 1];
  const [startPage, warshStartSurah, warshStartAyah] = THUMN_START_POINTS[hizb - 1][thumn - 1];
  const [endPage, warshEndSurah, warshEndAyah] = THUMN_END_POINTS[hizb - 1][thumn - 1];
  return {
    hizb, thumn, startSurah, startAyah, endSurah, endAyah,
    startPage, endPage, warshStartSurah, warshStartAyah, warshEndSurah, warshEndAyah,
  };
}

/**
 * حدود أثمان متتابعة في حزب واحد — تُستعمل للمراجعة البعيدة (حزب كامل أو نصفه)،
 * فترى الخطةُ والمصحفُ الحدود نفسها التي يراها جدول الأثمان.
 */
export function thumnRange(hizb: number, fromThumn = 1, toThumn = THUMNS_PER_HIZB): Omit<ThumnPosition, 'hizb' | 'thumn'> {
  const from = Math.min(THUMNS_PER_HIZB, Math.max(1, fromThumn));
  const to = Math.min(THUMNS_PER_HIZB, Math.max(from, toThumn));
  const [startSurah, startAyah] = THUMN_STARTS[hizb - 1][from - 1];
  const [endSurah, endAyah] = THUMN_ENDS[hizb - 1][to - 1];
  const [startPage, warshStartSurah, warshStartAyah] = THUMN_START_POINTS[hizb - 1][from - 1];
  const [endPage, warshEndSurah, warshEndAyah] = THUMN_END_POINTS[hizb - 1][to - 1];
  return {
    startSurah, startAyah, endSurah, endAyah,
    startPage, endPage, warshStartSurah, warshStartAyah, warshEndSurah, warshEndAyah,
  };
}

/** "البقرة ٢٥٣ – آل عمران ٤" — بداية الحزب ونهايته كما في جدول ورش. */
export function hizbRangeLabel(hizb: number): string {
  const { startSurah, startAyah, endSurah, endAyah } = thumnRange(hizb);
  return rangeLabel(startSurah, startAyah, endSurah, endAyah);
}

export type ReaderFocus = {
  surah: number;
  ayah: number;
  endSurah?: number;
  endAyah?: number;
  /**
   * رقما الآيتين كما يُطبعان في مصحف ورش. يعتمد العارضُ ترقيمَ النصّ الواصل أولًا،
   * فإن لم يجيء (عملٌ بلا شبكةٍ أو سورةٌ قديمة في الكاش) رجع إلى هذين لا إلى رقم الجدول.
   */
  warshAyah?: number;
  warshEndAyah?: number;
  page?: number;
  endPage?: number;
};

/** بؤرةُ العارض من موضعٍ في جدول الأثمان (ثمنٌ واحد أو مدىً منها). */
export function focusFromPosition(position: Omit<ThumnPosition, 'hizb' | 'thumn'>): ReaderFocus {
  return {
    surah: position.startSurah,
    ayah: position.startAyah,
    endSurah: position.endSurah,
    endAyah: position.endAyah,
    warshAyah: position.warshStartSurah === position.startSurah ? position.warshStartAyah : undefined,
    warshEndAyah: position.warshEndSurah === position.endSurah ? position.warshEndAyah : undefined,
    page: position.startPage,
    endPage: position.endPage,
  };
}

/** بؤرةُ ثمنٍ بعينه، فيطابق نصُّ المصحف عنوانَ المهمة آيةً وصفحةً. */
export function thumnFocus(unit: number): ReaderFocus {
  return focusFromPosition(thumnPosition(unit));
}

/** موضع الحزب كاملًا لعارض المصحف: من أول آية في ثمنه الأول إلى آخر آية في ثمنه الثامن. */
export function hizbFocus(hizb: number): ReaderFocus {
  return focusFromPosition(thumnRange(hizb));
}

/** وسْمُ مدى بين نقطتين: "الحشر ٣–١٠"، أو "البقرة ٢٥٣ – آل عمران ٤" إذا امتدّ بين سورتين. */
export function rangeLabel(startSurah: number, startAyah: number, endSurah: number, endAyah: number): string {
  if (startSurah === endSurah) return `${SURAHS[startSurah]} ${toAr(startAyah)}–${toAr(endAyah)}`;
  return `${SURAHS[startSurah]} ${toAr(startAyah)} – ${SURAHS[endSurah]} ${toAr(endAyah)}`;
}

/** "الرحمن ٤١–٧٨" أو "البقرة ٢٨٣ – آل عمران ٤" حين يمتد الثمن بين سورتين. */
export function thumnRangeLabel(unit: number): string {
  const { startSurah, startAyah, endSurah, endAyah } = thumnPosition(unit);
  return rangeLabel(startSurah, startAyah, endSurah, endAyah);
}

/** صفحةُ الثمن في مصحف ورش: "ص ٥٤٥" أو "ص ٥٤٤–٥٤٥". */
export function thumnPageLabel(unit: number): string {
  const { startPage, endPage } = thumnPosition(unit);
  return pageSpanLabel(startPage, endPage);
}

export function thumnSurah(unit: number): number {
  return thumnPosition(unit).startSurah;
}

export function pathHizbToMushaf(pathHizb: number): number {
  return TOTAL_HIZBS + 1 - pathHizb;
}

export function mushafHizbToPath(mushafHizb: number): number {
  return TOTAL_HIZBS + 1 - mushafHizb;
}

/**
 * رقم الثمن في مسار الحفظ: الحزب ٦٠ أولًا (ثمنه الأول = الثمن ١)، ثم ٥٩ … حتى الفاتحة.
 * الثمن في المسار = (الحزب في المصحف مقلوبًا − ١) × ٨ + رقم الثمن من جدول ورش،
 * فالتقسيم كله جدولٌ واحد لا تقسيمَان.
 */
export function thumnId(hizb: number, thumn: number): number {
  const pathHizb = mushafHizbToPath(hizb);
  return (pathHizb - 1) * THUMNS_PER_HIZB + thumn;
}

export function fromThumnId(id: number): { hizb: number; thumn: number } {
  const pathHizb = Math.ceil(id / THUMNS_PER_HIZB);
  const thumn = ((id - 1) % THUMNS_PER_HIZB) + 1;
  return { hizb: pathHizbToMushaf(pathHizb), thumn };
}

/**
 * ترتيب الحفظ في رواية ورش: من سورة الناس (١١٤) نزولًا إلى الفاتحة (١).
 * تُعرض السور في القوائم بهذا الترتيب ليطابق اتجاه الورد، لا ترتيب المصحف.
 */
export const SURAHS_BY_PATH: { number: number; name: string }[] = SURAHS
  .map((name, number) => ({ name, number }))
  .filter(item => item.number >= 1)
  .reverse();

/** موضع السورة في رحلة الحفظ: الفاتحة آخرًا (١١٤)، والناس أولًا (١). */
export function surahPathIndex(surah: number): number {
  return TOTAL_SURAHS + 1 - surah;
}

export function hizbLabel(hizb: number): string {
  const h = HIZBS[hizb - 1];
  return `${SURAHS[h.surah]} ${toAr(h.ayah)}`;
}

export function thumnLabel(id: number): string {
  const { hizb, thumn } = fromThumnId(id);
  return `الحزب ${toAr(hizb)} · الثمن ${toAr(thumn)}`;
}

const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

export function toAr(n: number | string): string {
  return String(n).replace(/\d/g, (d) => AR_DIGITS[Number(d)]);
}

export const RULES = [
  {
    n: 1,
    title: "يوم بلا حفظ جديد",
    body: "أسبوعياً — الجمعة مثلاً — تسرد فيه محفوظك المستقر كله أو نصفه، وتعوّض ما فاتك.",
  },
  {
    n: 2,
    title: "إذا فاتت المراجعة فلا حفظ جديد",
    body: "الأولوية للقديم دائماً. لا تفتح ثمناً جديداً وفي ذمتك مراجعة لم تُقضَ.",
  },
  {
    n: 3,
    title: "اربط أوائل الأثمان والسور",
    body: "مرة أسبوعياً اقرأ بدايات الأثمان فقط متتابعة؛ أكثر الأخطاء تكون في مواضع الانتقال.",
  },
  {
    n: 4,
    title: "سمّع لغيرك",
    body: "مرة في الأسبوع على الأقل: شيخ، صاحب، أو سجّل صوتك واستمع له.",
  },
  {
    n: 5,
    title: "الزم مصحفًا واحداً",
    body: "طبعة واحدة لثبات الصورة البصرية. لا تبدّل المصاحف.",
  },
];
