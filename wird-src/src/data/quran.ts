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

export type Hizb = {
  n: number;
  surah: number;
  ayah: number;
  page: number;
  juz: number;
};

export const RIWAYAH = 'ورش عن نافع';

export const HIZBS: Hizb[] = [
  { n: 1, surah: 1, ayah: 1, page: 1, juz: 1 },
  { n: 2, surah: 2, ayah: 75, page: 11, juz: 1 },
  { n: 3, surah: 2, ayah: 141, page: 22, juz: 2 },
  { n: 4, surah: 2, ayah: 201, page: 32, juz: 2 },
  { n: 5, surah: 2, ayah: 251, page: 42, juz: 3 },
  { n: 6, surah: 3, ayah: 15, page: 51, juz: 3 },
  { n: 7, surah: 3, ayah: 91, page: 62, juz: 4 },
  { n: 8, surah: 3, ayah: 171, page: 72, juz: 4 },
  { n: 9, surah: 4, ayah: 24, page: 82, juz: 5 },
  { n: 10, surah: 4, ayah: 86, page: 92, juz: 5 },
  { n: 11, surah: 4, ayah: 147, page: 102, juz: 6 },
  { n: 12, surah: 5, ayah: 25, page: 111, juz: 6 },
  { n: 13, surah: 5, ayah: 84, page: 121, juz: 7 },
  { n: 14, surah: 6, ayah: 37, page: 132, juz: 7 },
  { n: 15, surah: 6, ayah: 112, page: 142, juz: 8 },
  { n: 16, surah: 7, ayah: 1, page: 151, juz: 8 },
  { n: 17, surah: 7, ayah: 87, page: 162, juz: 9 },
  { n: 18, surah: 7, ayah: 171, page: 173, juz: 9 },
  { n: 19, surah: 8, ayah: 41, page: 182, juz: 10 },
  { n: 20, surah: 9, ayah: 34, page: 192, juz: 10 },
  { n: 21, surah: 9, ayah: 94, page: 201, juz: 11 },
  { n: 22, surah: 10, ayah: 26, page: 212, juz: 11 },
  { n: 23, surah: 11, ayah: 6, page: 222, juz: 12 },
  { n: 24, surah: 11, ayah: 83, page: 231, juz: 12 },
  { n: 25, surah: 12, ayah: 53, page: 242, juz: 13 },
  { n: 26, surah: 13, ayah: 21, page: 252, juz: 13 },
  { n: 27, surah: 15, ayah: 1, page: 262, juz: 14 },
  { n: 28, surah: 16, ayah: 51, page: 272, juz: 14 },
  { n: 29, surah: 17, ayah: 1, page: 282, juz: 15 },
  { n: 30, surah: 17, ayah: 99, page: 292, juz: 15 },
  { n: 31, surah: 18, ayah: 74, page: 302, juz: 16 },
  { n: 32, surah: 20, ayah: 1, page: 312, juz: 16 },
  { n: 33, surah: 21, ayah: 1, page: 322, juz: 17 },
  { n: 34, surah: 22, ayah: 1, page: 332, juz: 17 },
  { n: 35, surah: 23, ayah: 1, page: 342, juz: 18 },
  { n: 36, surah: 24, ayah: 21, page: 352, juz: 18 },
  { n: 37, surah: 25, ayah: 21, page: 362, juz: 19 },
  { n: 38, surah: 26, ayah: 111, page: 371, juz: 19 },
  { n: 39, surah: 27, ayah: 58, page: 382, juz: 20 },
  { n: 40, surah: 28, ayah: 51, page: 392, juz: 20 },
  { n: 41, surah: 29, ayah: 46, page: 402, juz: 21 },
  { n: 42, surah: 31, ayah: 21, page: 413, juz: 21 },
  { n: 43, surah: 33, ayah: 31, page: 422, juz: 22 },
  { n: 44, surah: 34, ayah: 24, page: 431, juz: 22 },
  { n: 45, surah: 36, ayah: 27, page: 442, juz: 23 },
  { n: 46, surah: 37, ayah: 145, page: 451, juz: 23 },
  { n: 47, surah: 39, ayah: 31, page: 462, juz: 24 },
  { n: 48, surah: 40, ayah: 41, page: 472, juz: 24 },
  { n: 49, surah: 41, ayah: 46, page: 482, juz: 25 },
  { n: 50, surah: 43, ayah: 23, page: 491, juz: 25 },
  { n: 51, surah: 46, ayah: 1, page: 502, juz: 26 },
  { n: 52, surah: 48, ayah: 18, page: 513, juz: 26 },
  { n: 53, surah: 51, ayah: 31, page: 522, juz: 27 },
  { n: 54, surah: 55, ayah: 1, page: 531, juz: 27 },
  { n: 55, surah: 58, ayah: 1, page: 542, juz: 28 },
  { n: 56, surah: 62, ayah: 1, page: 553, juz: 28 },
  { n: 57, surah: 67, ayah: 1, page: 562, juz: 29 },
  { n: 58, surah: 72, ayah: 1, page: 572, juz: 29 },
  { n: 59, surah: 78, ayah: 1, page: 582, juz: 30 },
  { n: 60, surah: 87, ayah: 1, page: 591, juz: 30 },
];

export const THUMNS_PER_HIZB = 8;
export const TOTAL_HIZBS = 60;
export const TOTAL_THUMNS = 480;
export const LAST_PAGE = 604;

export function hizbPageSpan(hizb: number): { start: number; end: number; pages: number } {
  const start = HIZBS[hizb - 1].page;
  const end = hizb === 60 ? LAST_PAGE : HIZBS[hizb].page - 1;
  return { start, end, pages: end - start + 1 };
}

export function pathHizbToMushaf(pathHizb: number): number {
  return TOTAL_HIZBS + 1 - pathHizb;
}

export function mushafHizbToPath(mushafHizb: number): number {
  return TOTAL_HIZBS + 1 - mushafHizb;
}

export function thumnId(hizb: number, thumn: number): number {
  const pathHizb = mushafHizbToPath(hizb);
  return (pathHizb - 1) * THUMNS_PER_HIZB + thumn;
}

export function fromThumnId(id: number): { hizb: number; thumn: number } {
  const pathHizb = Math.ceil(id / THUMNS_PER_HIZB);
  const thumn = ((id - 1) % THUMNS_PER_HIZB) + 1;
  return { hizb: pathHizbToMushaf(pathHizb), thumn };
}

export function thumnPage(id: number): number {
  const { hizb, thumn } = fromThumnId(id);
  const { start, pages } = hizbPageSpan(hizb);
  const offset = Math.round(((thumn - 1) * pages) / THUMNS_PER_HIZB);
  return Math.min(start + offset, LAST_PAGE);
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
