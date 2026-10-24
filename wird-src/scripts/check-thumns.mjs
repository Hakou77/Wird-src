#!/usr/bin/env node
/**
 * فحص جدول أثمان ورش وبدايات الأحزاب المشتقة منه.
 *
 *   node scripts/check-thumns.mjs            يطبع الـ ٤٨٠ ثمنًا: (الحزب، الثمن، السورة، الآية)
 *   node scripts/check-thumns.mjs --quiet    الملخّص والنتائج فقط
 *   node scripts/check-thumns.mjs --json     الجدول كاملًا JSON (للمقارنة بمصدر خارجي)
 *
 * ما يتحقق منه:
 *   ١) كل نهاية ثمن داخل سورة صحيحة وآية موجودة (على عدد الآيات في SURAH_AYATS).
 *   ٢) نهاية كل ثمن تليها بداية الثمن التالي مباشرة — بلا فجوة ولا تداخل.
 *   ٣) كل حزب يبدأ حيث انتهى الذي قبله (الحزب ١ = الفاتحة ١، والحزب ٦٠ ينتهي عند الناس ٦).
 *   ٤) thumnId / fromThumnId / thumnPosition / HIZBS كلها على التقسيم نفسه.
 *   ٥) الشاهد المطلوب: ثمنٌ في سورة الحشر ⇒ الحزب ٥٥ وأحد الأثمان ٣–٥، وعنوان المهمة
 *      ونصَّ المصحف من مصدر واحد.
 *   ٦) جدولُ صفحات ورش المولَّد (src/data/warsh-pages.ts): تتابعٌ في الصفحات، ومطابقةٌ
 *      للتقسيم، وشواهدُ مؤكَّدة من مصدرَي الصفحات — وأنَّ ترقيم الآيات حُوِّل إلى ورش.
 */
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const QUIET = args.has('--quiet');
const AS_JSON = args.has('--json');

const failures = [];
function check(ok, message) {
  if (!ok) failures.push(message);
  return ok;
}

// ---------- تحميل ملفات TypeScript (esbuild يأتي مع vite) ----------
async function loadData() {
  let esbuild = null;
  try {
    esbuild = await import('esbuild');
  } catch {
    /* سنجرّب استيرادها مباشرةً بعد قليل */
  }
  const files = {
    'thumns': 'src/data/thumns.ts', 'warsh-pages': 'src/data/warsh-pages.ts', 'quran': 'src/data/quran.ts',
  };
  if (!esbuild) {
    const local = resolve(root, 'node_modules/esbuild/package.json');
    if (existsSync(local)) {
      const dir = mkdtempSync(join(tmpdir(), 'wird-check-'));
      for (const [name, file] of Object.entries(files)) {
        writeFileSync(join(dir, `${name}.mjs`), readFileSync(resolve(root, file), 'utf8')
          .replace(/from '\.\/thumns'/g, "from './thumns.mjs'")
          .replace(/from '\.\/warsh-pages'/g, "from './warsh-pages.mjs'")
          .replace(/from '\.\/quran'/g, "from './quran.mjs'"));
      }
      return {
        ...(await import(pathToFileURL(join(dir, 'thumns.mjs')).href)),
        ...(await import(pathToFileURL(join(dir, 'quran.mjs')).href)),
      };
    }
    console.error('لم يُعثر على esbuild؛ شغّل npm install أولًا (يأتي مع vite).');
    process.exit(2);
  }
  const dir = mkdtempSync(join(tmpdir(), 'wird-check-'));
  const sources = {};
  for (const [name, file] of Object.entries(files)) {
    const code = readFileSync(resolve(root, file), 'utf8');
    sources[name] = esbuild.transformSync(code, { loader: 'ts', format: 'esm', target: 'es2022' }).code;
  }
  for (const [name, code] of Object.entries(sources)) {
    writeFileSync(join(dir, `${name}.mjs`), code
      .replace(/from\s+["']\.\/thumns["']/g, "from './thumns.mjs'")
      .replace(/from\s+["']\.\/warsh-pages["']/g, "from './warsh-pages.mjs'")
      .replace(/from\s+["']\.\/quran["']/g, "from './quran.mjs'"));
  }
  return {
    ...(await import(pathToFileURL(join(dir, 'thumns.mjs')).href)),
    ...(await import(pathToFileURL(join(dir, 'warsh-pages.mjs')).href)),
    ...(await import(pathToFileURL(join(dir, 'quran.mjs')).href)),
  };
}

const d = await loadData();
const {
  SURAH_AYATS, THUMN_ENDS, THUMN_STARTS, HIZBS, HIZB_STARTS, SURAHS, SPLIT_AYAHS,
  THUMNS_PER_HIZB, TOTAL_HIZBS, TOTAL_SURAHS, TOTAL_THUMNS,
  THUMN_START_POINTS, THUMN_END_POINTS, HIZB_END_POINTS, WARSH_MUSHAF_PAGES, LAST_WARSH_PAGE,
  fromThumnId, thumnId, thumnPosition, thumnRange, thumnRangeLabel, thumnPageLabel, thumnFocus,
  hizbPages, hizbPagesLabel, hizbFocus, pageSpanLabel, focusFromPosition, toAr,
} = d;

// ---------- فهرس مسطّح: (سورة، آية) ⇄ رقم الآية المطلق ----------
const OFFSET = [0];
for (let s = 1; s <= TOTAL_SURAHS; s++) OFFSET[s] = OFFSET[s - 1] + SURAH_AYATS[s - 1];
const TOTAL_AYATS = OFFSET[TOTAL_SURAHS];
const flat = ([surah, ayah]) => OFFSET[surah - 1] + ayah - 1;
const at = index => {
  let surah = 1;
  while (surah < TOTAL_SURAHS && index >= OFFSET[surah]) surah++;
  return [surah, index - OFFSET[surah - 1] + 1];
};
const label = ([surah, ayah]) => `${SURAHS[surah]} ${toAr(ayah)}`;

check(TOTAL_HIZBS === 60, `TOTAL_HIZBS يجب أن يكون ٦٠ (هو ${TOTAL_HIZBS})`);
check(THUMNS_PER_HIZB === 8, `THUMNS_PER_HIZB يجب أن يكون ٨`);
check(TOTAL_THUMNS === TOTAL_HIZBS * THUMNS_PER_HIZB, 'TOTAL_THUMNS ≠ الأحزاب × أثمانها');
check(SURAH_AYATS.length === TOTAL_SURAHS, `SURAH_AYATS فيها ${SURAH_AYATS.length} سورة لا ${TOTAL_SURAHS}`);
check(THUMN_ENDS.length === TOTAL_HIZBS, `جدول الأثمان فيه ${THUMN_ENDS.length} حزبًا`);
for (let h = 0; h < THUMN_ENDS.length; h++) {
  check(THUMN_ENDS[h].length === THUMNS_PER_HIZB, `الحزب ${h + 1} فيه ${THUMN_ENDS[h].length} ثمنًا`);
}

// ---------- الجدول + فحص (١) و(٢) ----------
const rows = [];
let previousEnd = -1;
for (let h = 0; h < TOTAL_HIZBS; h++) {
  for (let t = 0; t < THUMNS_PER_HIZB; t++) {
    const end = THUMN_ENDS[h][t];
    const start = THUMN_STARTS[h][t];
    const id = h * THUMNS_PER_HIZB + t + 1;
    const validSurah = end[0] >= 1 && end[0] <= TOTAL_SURAHS;
    const validAyah = validSurah && end[1] >= 1 && end[1] <= SURAH_AYATS[end[0] - 1];
    check(validAyah, `الحزب ${h + 1} ثمن ${t + 1}: نهاية خارج السورة — ${end[0]}:${end[1]}`);
    if (previousEnd >= 0) {
      check(flat(start) === previousEnd + 1,
        `فجوة/تداخل قبل الحزب ${h + 1} ثمن ${t + 1}: بدأ عند ${label(start)} والأولى ${label(at(previousEnd + 1))}`);
    }
    check(flat(start) <= flat(end), `الحزب ${h + 1} ثمن ${t + 1}: بدايته بعد نهايته`);
    check(flat(end) > previousEnd, `الحزب ${h + 1} ثمن ${t + 1} لا يتقدّم على سابقه`);
    previousEnd = flat(end);
    rows.push({
      id,
      hizb: h + 1,
      thumn: t + 1,
      startSurah: start[0], startAyah: start[1],
      endSurah: end[0], endAyah: end[1],
      startLabel: label(start), endLabel: label(end),
      splitsAyah: SPLIT_AYAHS.some(([s, a]) => s === end[0] && a === end[1]),
      ayat: previousEnd - flat(start) + 1,
    });
  }
}

// ---------- (٣) الأحزاب: كل حزب يبدأ حيث انتهى سابقه ----------
check(flat(THUMN_STARTS[0][0]) === 0, `الحزب ١ يبدأ عند ${label(THUMN_STARTS[0][0])} لا عند الفاتحة ١`);
check(rows[rows.length - 1].endSurah === 114 && rows[rows.length - 1].endAyah === SURAH_AYATS[113],
  `آخر ثمن لا ينتهي بتمام سورة الناس (${label([rows.at(-1).endSurah, rows.at(-1).endAyah])})`);
check(flat(at(TOTAL_AYATS - 1)) === TOTAL_AYATS - 1, 'فهرس الآيات غير مستوٍ');
for (let h = 0; h < TOTAL_HIZBS; h++) {
  const [surah, ayah] = HIZB_STARTS[h];
  check(surah === HIZBS[h].surah && ayah === HIZBS[h].ayah && HIZBS[h].n === h + 1,
    `HIZBS[${h + 1}] لا يطابق بداية جدول الأثمان`);
  if (h > 0) {
    const prevEnd = THUMN_ENDS[h - 1][THUMNS_PER_HIZB - 1];
    check(flat([surah, ayah]) === flat(prevEnd) + 1,
      `الحزب ${h + 1} يبدأ عند ${label([surah, ayah])} وحزبُ ${h} انتهى عند ${label(prevEnd)}`);
  }
  check(HIZBS[h].juz === Math.ceil((h + 1) / 2), `الحزب ${h + 1} منسوب إلى الجزء ${HIZBS[h].juz}`);
  const { page, endPage } = hizbPages(h + 1);
  check(HIZBS[h].page === page && HIZBS[h].endPage === endPage,
    `HIZBS[${h + 1}] لا يحمل صفحتَي جدول ورش (${HIZBS[h].page}, ${HIZBS[h].endPage})`);
  check(page >= 1 && endPage <= WARSH_MUSHAF_PAGES && page <= endPage,
    `صفحتا الحزب ${h + 1} خارج مصحف ورش: ${page}–${endPage}`);
  check(page === THUMN_START_POINTS[h][0][0] && endPage === HIZB_END_POINTS[h][0],
    `صفحتا الحزب ${h + 1} لا تطابقان جدول warsh-pages`);
  if (h > 0) {
    const gap = page - HIZBS[h - 1].endPage;
    check(gap === 0 || gap === 1, `الحزب ${h + 1} يبدأ بعد نهاية سابقه بـ ${gap} صفحة — المتوقع ٠ أو ١`);
  }
}

// ---------- (٤) المسار: thumnId / fromThumnId / thumnPosition ----------
for (let unit = 1; unit <= TOTAL_THUMNS; unit++) {
  const { hizb, thumn } = fromThumnId(unit);
  check(thumnId(hizb, thumn) === unit, `thumnId/fromThumnId غير عكوسين عند الثمن ${unit}`);
  const pos = thumnPosition(unit);
  check(pos.hizb === hizb && pos.thumn === thumn, `thumnPosition(${unit}) خالف fromThumnId`);
  const row = rows.find(r => r.hizb === hizb && r.thumn === thumn);
  check(pos.startSurah === row.startSurah && pos.startAyah === row.startAyah
    && pos.endSurah === row.endSurah && pos.endAyah === row.endAyah,
    `thumnPosition(${unit}) لا يطابق الجدول عند الحزب ${hizb} ثمن ${thumn}`);
}
check(fromThumnId(1).hizb === 60 && fromThumnId(1).thumn === 1, 'أول ثمن في المسار ليس حزب ٦٠ ثمن ١');
check(fromThumnId(TOTAL_THUMNS).hizb === 1 && fromThumnId(TOTAL_THUMNS).thumn === 8, 'آخر ثمن في المسار ليس حزب ١ ثمن ٨');

// ---------- (٥) الشاهد: سورة الحشر (٥٩) في الحزب ٥٥ ----------
const HASHR = 59;
const inHashr = rows.filter(r => r.startSurah === HASHR || r.endSurah === HASHR);
check(inHashr.length > 0, 'لا ثمنًا في جدول الأثمان يمسّ سورة الحشر!');
for (const r of inHashr) {
  check(r.hizb === 55, `ثمنٌ في الحشر خارج الحزب ٥٥: حزب ${r.hizb} ثمن ${r.thumn}`);
  check(r.thumn >= 3 && r.thumn <= 5, `ثمنٌ في الحشر خارج الأثمان ٣–٥: حزب ${r.hizb} ثمن ${r.thumn}`);
}
const witness = thumnId(55, 3); // الثمن ٣ من الحزب ٥٥ على مسار الحفظ
const witnessPos = thumnPosition(witness);
check(witnessPos.hizb === 55 && witnessPos.thumn === 3, 'ثمن الحزب ٥٥ الثالث لا يوافق من المعرّف');
check(witnessPos.endSurah === HASHR, `ثمن ٣ من الحزب ٥٥ لا ينتهي في الحشر بل ${witnessPos.endSurah}`);
const witnessTitle = `الحزب ${toAr(witnessPos.hizb)} · الثمن ${toAr(witnessPos.thumn)} · ${thumnRangeLabel(witness)} · ${thumnPageLabel(witness)}`;
check(witnessTitle.includes('الحزب ٥٥') && witnessTitle.includes('الثمن ٣') && witnessTitle.includes('الحشر'),
  `عنوان الثمن لا يحمل «الحزب ٥٥ · الثمن ٣ · الحشر»: ${witnessTitle}`);
check(witnessTitle.includes('ص ٥٤٤–٥٤٥'), `صفحةُ الثمن في العنوان لا تطابق مصحف ورش: ${witnessTitle}`);
check(typeof focusFromPosition(witnessPos).warshEndAyah === 'number', 'بؤرة العارض بلا ترقيم ورش');

// ---------- (٦) صفحات مصحف ورش: جدولُ warsh-pages مقابل التقسيم ----------
check(WARSH_MUSHAF_PAGES === 604 && LAST_WARSH_PAGE === 604,
  `عدد صفحات مصحف ورش ${WARSH_MUSHAF_PAGES} وليس ٦٠٤`);
check(THUMN_START_POINTS.length === TOTAL_HIZBS && THUMN_END_POINTS.length === TOTAL_HIZBS,
  'جدول الصفحات ليس على قدر الأحزاب');
let previousStartPage = 0;
let previousEndPage = 0;
let shifted = 0;
for (let h = 0; h < TOTAL_HIZBS; h++) {
  check(THUMN_START_POINTS[h].length === THUMNS_PER_HIZB && THUMN_END_POINTS[h].length === THUMNS_PER_HIZB,
    `جدول الصفحات: الحزب ${h + 1} فيه ${THUMN_START_POINTS[h].length} ثمنًا`);
  for (let t = 0; t < THUMNS_PER_HIZB; t++) {
    const sp = THUMN_START_POINTS[h][t];
    const ep = THUMN_END_POINTS[h][t];
    const start = THUMN_STARTS[h][t];
    const end = THUMN_ENDS[h][t];
    check(sp[1] === start[0] && ep[1] === end[0],
      `الحزب ${h + 1} ثمن ${t + 1}: السورة في جدول الصفحات غير سورة الجدول`);
    check(sp[0] <= ep[0], `الحزب ${h + 1} ثمن ${t + 1}: صفحته تبدأ بعد نهايته`);
    check(sp[2] <= ep[2] || sp[1] !== ep[1],
      `الحزب ${h + 1} ثمن ${t + 1}: آيةُ النهاية ${ep[2]} قبل آية البداية ${sp[2]} في ورش`);
    check(sp[0] >= previousStartPage && ep[0] >= previousEndPage,
      `صفحاتٌ تتراجع عند الحزب ${h + 1} ثمن ${t + 1}`);
    check(sp[1] >= 1 && sp[1] <= TOTAL_SURAHS && sp[0] >= 1 && sp[0] <= WARSH_MUSHAF_PAGES
      && ep[0] >= 1 && ep[0] <= WARSH_MUSHAF_PAGES,
      `نقطة خارج المصحف عند الحزب ${h + 1} ثمن ${t + 1}`);
    if (sp[2] !== start[1] || ep[2] !== end[1]) shifted++;
    previousStartPage = sp[0];
    previousEndPage = ep[0];
    const unit = thumnId(h + 1, t + 1);
    const pos = thumnPosition(unit);
    check(pos.startPage === sp[0] && pos.endPage === ep[0],
      `thumnPosition(${unit}) لا يحمل صفحتَي الجدول`);
    check(pos.warshStartAyah === sp[2] && pos.warshEndAyah === ep[2],
      `thumnPosition(${unit}) لا يحمل ترقيم ورش للآيتين`);
    const focus = thumnFocus(unit);
    check(focus.page === sp[0] && focus.endPage === ep[0] && focus.surah === start[0],
      `thumnFocus(${unit}) خالف جدول الصفحات`);
  }
  check(HIZB_END_POINTS[h][0] === THUMN_END_POINTS[h][THUMNS_PER_HIZB - 1][0]
    && HIZB_END_POINTS[h][1] === THUMN_END_POINTS[h][THUMNS_PER_HIZB - 1][1]
    && HIZB_END_POINTS[h][2] === THUMN_END_POINTS[h][THUMNS_PER_HIZB - 1][2],
    `نهاية الحزب ${h + 1} في جدول الصفحات غير نهاية ثمنه الثامن`);
  const hf = hizbFocus(h + 1);
  check(hf.page === HIZBS[h].page && hf.endPage === HIZBS[h].endPage,
    `hizbFocus(${h + 1}) لا يحمل صفحتَي الحزب`);
}
check(shifted > 0, 'لم يُحوَّل شيءٌ إلى ترقيم ورش — أُلغِيَ التحويل أم فسد الجدول المولَّد؟');

// شواهدُ مؤكَّدة من مصدرَي الصفحات (quran-meta مع page_number في quranpedia):
const WARSH_SPOTS = [
  // [حزب، ثمن، صفحة البداية، صفحة النهاية، سورة البداية بترقيم ورش، آيتُها]
  [1, 1, 1, 3, 1, 1],
  [55, 3, 544, 545, 58, 14],  // المجادلة ١٤ ← الحشر ٢
  [55, 8, 551, 552, 61, 1],
  [54, 8, 540, 541, 57, 21],  // الحديد: ٢٩ في جدولنا = ٢٨ في المصحف، وآخرها ص ٥٤١
  [13, 1, 121, 122, 5, 84],
  [60, 1, 591, 592, 87, 1],
  [60, 8, 602, 604, 106, 1],
];
for (const [hizb, thumn, page, endPage, surah, ayah] of WARSH_SPOTS) {
  const sp = THUMN_START_POINTS[hizb - 1][thumn - 1];
  const ep = THUMN_END_POINTS[hizb - 1][thumn - 1];
  check(sp[0] === page && ep[0] === endPage && sp[1] === surah && sp[2] === ayah,
    `شاهد الحزب ${hizb} ثمن ${thumn}: أعطى ${sp[0]}–${ep[0]} والأولى ${page}–${endPage}`);
}
check(THUMN_END_POINTS[TOTAL_HIZBS - 1][THUMNS_PER_HIZB - 1][0] === WARSH_MUSHAF_PAGES
  && THUMN_END_POINTS[TOTAL_HIZBS - 1][THUMNS_PER_HIZB - 1][1] === 114
  && THUMN_END_POINTS[TOTAL_HIZBS - 1][THUMNS_PER_HIZB - 1][2] === 6,
  'آخر الثمنين لا ينتهي عند الناس ٦ في الصفحة الأخيرة من مصحف ورش');

// ---------- الإخراج ----------
if (AS_JSON) {
  console.log(JSON.stringify({
    totals: { hizbs: TOTAL_HIZBS, thumns: rows.length, ayahs: TOTAL_AYATS, surahs: TOTAL_SURAHS },
    hizbStarts: HIZB_STARTS.map(([s, a]) => ({ surah: s, ayah: a })),
    thumns: rows,
    failures,
  }));
  process.exit(failures.length ? 1 : 0);
}

if (!QUIET) {
  console.log('الحزب  الثمن  السورة والآية (من → إلى)              آيات');
  console.log('—'.repeat(64));
  for (const r of rows) {
    const span = r.startSurah === r.endSurah
      ? `${SURAHS[r.startSurah]} ${toAr(r.startAyah)}–${toAr(r.endAyah)}`
      : `${SURAHS[r.startSurah]} ${toAr(r.startAyah)} → ${SURAHS[r.endSurah]} ${toAr(r.endAyah)}`;
    console.log(`${String(r.hizb).padStart(4)}  ${String(r.thumn).padStart(5)}  ${span.padEnd(38)}${String(r.ayat).padStart(4)}${r.splitsAyah ? '  ← فاصل منتصف آية' : ''}`);
  }
  console.log('—'.repeat(64));
}

const totalAyat = rows.reduce((sum, r) => sum + r.ayat, 0);
console.log(`الأثمان: ${toAr(rows.length)} · الأحزاب: ${toAr(TOTAL_HIZBS)} · الآيات المغطّاة: ${toAr(totalAyat)} من ${toAr(TOTAL_AYATS)}`);
console.log(`الحزب ٥٥ يبدأ عند ${label(HIZB_STARTS[54])} وينتهي عند ${label(THUMN_ENDS[54][7])}`);
console.log(`شاهد الحشر: ${witnessTitle}`);
console.log(`صفحات ورش: ${toAr(WARSH_MUSHAF_PAGES)} · مواضعُ غيّر التحويلُ ترقيمَها: ${toAr(shifted)} · ${hizbPagesLabel(55)} للحزب ٥٥`);
if (failures.length) {
  console.error(`\nالفحوص البائنة (${toAr(failures.length)}):`);
  for (const f of failures.slice(0, 40)) console.error('  ✗ ' + f);
  if (failures.length > 40) console.error(`  … و${toAr(failures.length - 40)} أخرى`);
  process.exit(1);
}
console.log('✓ التقسيم متّصل بلا فجوة ولا تداخل، وصفحاتُه من جدول ورش المحوَّل لا من تقدير.');
