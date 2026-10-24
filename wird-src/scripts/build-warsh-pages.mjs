#!/usr/bin/env node
/**
 * توليد `src/data/warsh-pages.ts`: أرقام صفحات مصحف ورش لبدايات الأثمان الستّين
 * ومنتصفاتها ونهاياتها — من جدول أثماننا المحقَّق، لا من تقريبٍ ولا من استيفاء خطّي.
 *
 *   node scripts/build-warsh-pages.mjs            يولّد الملف ويكتبه
 *   node scripts/build-warsh-pages.mjs --print    يطبع الجدول بلا كتابة
 *
 * المصدر (محقَّق، مرخّص MIT): حزمة `quran-meta@7.0.0` — قائمة صفحات مصحف ورش عن نافع
 * من طريق الأزرق، طباعة مجمع الملك فهد بالمدينة («نسخة مطابقة للمطبوع»):
 *   ٦٠٤ صفحة · ٦٢١٤ آية · ١١٤ سورة.
 * وقد فُحص تطابقه مع مصحف quranpedia (المصدر الذي يجلب منه التطبيق النصَّ نفسه)
 * آيةً آية في المواضع التي قورنت: الرحمن ١٧←٥٣٢، ٤٠←٥٣٢، ٤١←٥٣٣، الحديد ٢٨←٥٤١،
 * الجن ٢٨←٥٧٣، الحشر ١←٥٤٥، الأعلى ١←٥٩١، الناس ٦←٦٠٤ — فوافق تمامًا.
 *
 * ⚠ التحويل إلزامي: جدول `src/data/thumns.ts` مكتوب بترقيم العدد الجاري (٦٢٣٦ آية،
 * ترقيم حفص/الكوفي)، ومصحف ورش يجمع أو يفصل آيات في ١٢ سورة، فـ١٢ نهاية ثمن تشير إلى
 * آية لا وجود لها في ترقيم ورش:
 *   17:111 · 20:135 · 21:112 · 22:78 · 39:75 · 44:59 · 45:37 · 55:78 · 57:29 · 73:19 · 74:56 · 75:40
 * لذا يُحوَّل كل موضع بـ `hafs.convertAyahTo(surah, ayah, 'Warsh')` (بحرف W كبيرًا)
 * قبل `warsh.findPage(...)`. والأرقام المخزَّنة في الملف الناتج هي أرقام مصحف ورش نفسها.
 */
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const PRINT_ONLY = args.has('--print');

/** تحميل thumns.ts (TypeScript) — esbuild يأتي تبَعًا لـ vite. */
async function loadThumns() {
  const esbuild = await import('esbuild').catch(() => null);
  if (!esbuild) throw new Error('لم يُعثر على esbuild؛ شغّل npm install أولًا.');
  const dir = mkdtempSync(join(tmpdir(), 'wird-pages-'));
  const file = join(dir, 'thumns.mjs');
  writeFileSync(file, esbuild.transformSync(readFileSync(resolve(root, 'src/data/thumns.ts'), 'utf8'), {
    loader: 'ts', format: 'esm', target: 'es2022',
  }).code);
  return import(pathToFileURL(file).href);
}

const { SURAH_AYATS, THUMN_ENDS } = await loadThumns();
const warsh = await import('quran-meta/warsh');
const hafs = await import('quran-meta/hafs');
const QURAN_META_VERSION = (await import('quran-meta/package.json', { with: { type: 'json' } })).default?.version
  ?? JSON.parse(readFileSync(resolve(root, 'node_modules/quran-meta/package.json'), 'utf8')).version;

const TOTAL_HIZBS = THUMN_ENDS.length;
const THUMNS_PER_HIZB = THUMN_ENDS[0].length;
const TOTAL_SURAHS = SURAH_AYATS.length;
const TOTAL_THUMNS = TOTAL_HIZBS * THUMNS_PER_HIZB;
const WARSH_PAGES = warsh.meta.numPages;

if (WARSH_PAGES !== 604) throw new Error(`توقّعتُ مصحف ورش ٦٠٤ صفحة، وكان ${WARSH_PAGES}. راجع نسخة quran-meta.`);
if (THUMNS_PER_HIZB !== 8 || TOTAL_HIZBS !== 60) throw new Error(`جدول الأثمان غير متوقّع: ${TOTAL_HIZBS}×${THUMNS_PER_HIZB}`);

/** الآية التالية في المصحف (تمامُ السورة → أول آية من تاليتها) — كما في `quran.ts`. */
function nextAyah([surah, ayah]) {
  const last = SURAH_AYATS[surah - 1];
  if (ayah < last) return [surah, ayah + 1];
  for (let next = surah + 1; next <= TOTAL_SURAHS; next++) {
    if (SURAH_AYATS[next - 1] > 0) return [next, 1];
  }
  return [surah, ayah];
}

// بدايات الأثمان من الجدول نفسه: بداية كل ثمن = ما يلي نهاية الذي قبله.
const starts = [];
let cursor = [1, 1];
for (let h = 0; h < TOTAL_HIZBS; h++) {
  const row = [];
  for (let t = 0; t < THUMNS_PER_HIZB; t++) {
    row.push(cursor);
    cursor = nextAyah(THUMN_ENDS[h][t]);
  }
  starts.push(row);
}

let converted = 0;
/** موضع في جدولنا (ترقيم حفص) ← [صفحة، سورة، آية] بترقيم مصحف ورش. */
function toWarshPoint([surah, ayah]) {
  const out = hafs.convertAyahTo(surah, ayah, 'Warsh');
  const [ws, wa] = Array.isArray(out) ? out : [out.surah, out.ayah];
  if (!warsh.isValidSurahAyah([ws, wa])) throw new Error(`تحويل غير صالح: ${surah}:${ayah} → ${ws}:${wa}`);
  if (ws !== surah || wa !== ayah) converted++;
  const page = warsh.findPage(ws, wa);
  if (!Number.isInteger(page) || page < 1 || page > WARSH_PAGES) {
    throw new Error(`صفحة غير صالحة لـ ${ws}:${wa} = ${page}`);
  }
  return [page, ws, wa];
}

const startPoints = starts.map(row => row.map(toWarshPoint));
const endPointList = [];
const endPoints = THUMN_ENDS.map(row => row.map(end => {
  const point = toWarshPoint(end);
  endPointList.push(point);
  return point;
}));
const flatStarts = startPoints.flat();
const flatEnds = endPointList;
// نهاية الحزب = نهاية ثمنه الثامن، وهي في المصحف موضعُها المطبوع لا حسابًا.
const hizbEnds = THUMN_ENDS.map(row => row[THUMNS_PER_HIZB - 1]).map(toWarshPoint);

// ---------- تحقّقات ----------
const problems = [];
const must = (ok, message) => { if (!ok) problems.push(message); };

must(flatStarts.length === TOTAL_THUMNS && flatEnds.length === TOTAL_THUMNS,
  `عدد النقاط ${flatStarts.length}/${flatEnds.length} وليس ${TOTAL_THUMNS}`);
for (let i = 0; i < TOTAL_THUMNS; i++) {
  const [sp, , sA] = flatStarts[i], [ep] = flatEnds[i];
  must(sp <= ep, `الثمن ${i + 1}: صفحة بدايته ${sp} بعد صفحة نهايته ${ep}`);
  if (i > 0) {
    must(flatStarts[i - 1][0] <= sp, `الصفحات تتراجع قبل الثمن ${i + 1}`);
    must(flatEnds[i - 1][0] <= ep, `صفحات النهايات تتراجع عند الثمن ${i + 1}`);
  }
}
for (let h = 1; h < TOTAL_HIZBS; h++) {
  // بداية الحزب تاليةٌ لنهاية سابقه آيةً، فصفحتُها صفحتُه أو ما يليها لا غير.
  const gap = startPoints[h][0][0] - hizbEnds[h - 1][0];
  must(gap === 0 || gap === 1, `الحزب ${h + 1}: فرق الصفحات عن نهاية الحزب السابق هو ${gap} (الأولى ٠ أو ١)`);
}

// شواهد مؤكَّدة من المصدرَين — بأي تغييرٍ في النسخة تُرفض الولادة.
const SPOT = [
  // [سورة، آية بترقيم الجدول (حفص)] → [سورة، آية، صفحة بترقيم ورش]
  [59, 1, 59, 1, 545],   // مطالع الحزب ٥٥ (الحشر ١)
  [59, 24, 59, 24, 548], // نهاية الثمن ٥ من الحزب ٥٥
  [55, 41, 55, 40, 532], // الرحمن: حفص ٤١ = ورش ٤٠ ← ص ٥٣٢
  [55, 78, 55, 77, 534], // آية لا توجد في ترقيم ورش (٧٨ → ٧٧)
  [17, 111, 17, 110, 293],
  [57, 29, 57, 28, 541],
  [72, 23, 72, 23, 573],
  [87, 1, 87, 1, 591],
  [114, 6, 114, 6, 604],
  [1, 1, 1, 1, 1],
];
for (const [s, a, ws, wa, page] of SPOT) {
  const point = toWarshPoint([s, a]);
  must(point[1] === ws && point[2] === wa && point[0] === page,
    `شاهد ${s}:${a} أعطى ص${point[0]} ${point[1]}:${point[2]} والأولى ص${page} ${ws}:${wa}`);
}

if (problems.length) {
  console.error('تعذّرت ولادة جدول الصفحات:');
  for (const p of problems.slice(0, 20)) console.error(`  · ${p}`);
  process.exit(1);
}

// ---------- الكتابة ----------
const rowsTable = name => {
  const lines = [];
  for (let h = 0; h < TOTAL_HIZBS; h++) {
    const body = name === 'end'
      ? endPoints[h].map(p => `[${p.join(',')}]`).join(',')
      : startPoints[h].map(p => `[${p.join(',')}]`).join(',');
    lines.push(`  /* الحزب ${String(h + 1).padStart(2, ' ')} */ [${body}],`);
  }
  return lines.join('\n');
};

const out = `/**
 * جدول صفحات مصحف ورش — مولَّد، لا يُحرَّر يدويًّا.
 *
 * المولِّد: \`node scripts/build-warsh-pages.mjs\` (يُشغَّل عند الحاجة، لا وقت البناء).
 * المصدر: مصحف ورش عن نافع من طريق الأزرق — طباعة مجمع الملك فهد (نسخة مطابقة للمطبوع)،
 * بقائمة صفحات حزمة quran-meta@${QURAN_META_VERSION} (مرخّصة MIT): ${WARSH_PAGES} صفحة.
 * التوليد: ${new Date().toISOString().slice(0, 10)} · ${TOTAL_THUMNS} ثمنًا · ${TOTAL_HIZBS} حزبًا.
 *
 * كل نقطة هي: الصفحة ثم السورة ثم الآية — بترقيم مصحف ورش (٦٢١٤ آية)، مطابقةٍ لترقيم
 * page_number الذي يجلبه التطبيق مع النصّ من quranpedia. جدول thumns.ts مكتوب بترقيم
 * العدد الجاري (٦٢٣٦)، و١٢ موضعًا منه تُحوَّل إلى ترقيم ورش قبل تحديد الصفحة؛ لذلك يعتمد
 * «قارئ المصحف» هذه الأرقام احتياطًا، ويؤثّر عليها ترقيمُ النصّ الواصل مع السورة.
 */

/** [الصفحة، السورة، الآية] — بترقيم مصحف ورش. */
export type WarshPoint = readonly [page: number, surah: number, ayah: number];

/** عدد صفحات مصحف ورش (المدينة، طبعة مجمع الملك فهد). */
export const WARSH_MUSHAF_PAGES = ${WARSH_PAGES};

/** بداية كل ثمن (${TOTAL_HIZBS} حزبًا × ${THUMNS_PER_HIZB} أثمان)، بترقيم ورش. */
export const THUMN_START_POINTS: readonly (readonly WarshPoint[])[] = [
${rowsTable('start')}
];

/** نهاية كل ثمن (آخر آية فيه كما في جدول ورش)، بالترتيب نفسه. */
export const THUMN_END_POINTS: readonly (readonly WarshPoint[])[] = [
${rowsTable('end')}
];

/** نهاية كل حزب — وهي بدايةُ الحزب التالي مطبوعةً في الصفحة نفسها أو تاليتها. */
export const HIZB_END_POINTS: readonly WarshPoint[] = [
${hizbEnds.map((p, i) => `  /* الحزب ${String(i + 1).padStart(2, ' ')} */ [${p.join(',')}]`).join(',')}
];
`;

const target = resolve(root, 'src/data/warsh-pages.ts');
if (PRINT_ONLY) {
  console.log(out);
} else {
  writeFileSync(target, out, 'utf8');
}

const usedPages = new Set([...flatStarts.map(p => p[0]), ...flatEnds.map(p => p[0])]);
console.log(`✓ وُلِّد جدول صفحات ورش: ${TOTAL_THUMNS} ثمنًا · ${TOTAL_HIZBS} حزبًا · ${WARSH_PAGES} صفحة`);
console.log(`  مواضع احتاجت تحويلًا إلى ترقيم ورش: ${converted}`);
console.log(`  صفحات المطالع: من ${flatStarts[0][0]} إلى ${flatStarts[flatStarts.length - 1][0]} · مواضع ذُكرت فيها صفحات: ${usedPages.size}`);
console.log(`  الحزب ٥٥: الثمن ٣ من ص ${startPoints[54][2][0]} إلى ص ${endPoints[54][2][0]} (${SURAHS_HINT(55, 3)})`);
console.log(`  الملف: ${PRINT_ONLY ? '(طباعة فقط)' : 'src/data/warsh-pages.ts'}`);
function SURAHS_HINT(hizb, thumn) {
  const s = startPoints[hizb - 1][thumn - 1], e = endPoints[hizb - 1][thumn - 1];
  return `${s[1]}:${s[2]} → ${e[1]}:${e[2]}`;
}
