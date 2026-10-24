import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { SURAHS, toAr } from '../data/quran';

type Ayah = { number: number; text: string };
type MushafMeta = { bismillah: string; font_file: string | null };

const API_BASE = 'https://api.quranpedia.net/v1';
const META_KEY = 'wird-warsh-meta';
const WARSH_FALLBACK_BISMILLAH = 'بِسْمِ اِ۬للَّهِ اِ۬لرَّحْمَـٰنِ اِ۬لرَّحِيمِ ';
const WARSH_FALLBACK_FONT = 'https://quranpedia.net/assets/fonts/arabic/UthmanicWarsh_V21.ttf';

let fontReady = false;
let fontLoading: Promise<void> | null = null;
let metaCache: Promise<MushafMeta> | null = null;

function surahCacheKey(surah: number) {
  return `wird-warsh-surah-${surah}`;
}

function readCachedSurah(surah: number): Ayah[] | null {
  try {
    const raw = localStorage.getItem(surahCacheKey(surah));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(item => typeof item === 'object' && item !== null && typeof (item as Ayah).text === 'string')) {
      return parsed as Ayah[];
    }
  } catch {
    /* cache is best-effort only */
  }
  return null;
}

function readCachedMeta(): MushafMeta | null {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MushafMeta>;
    if (typeof parsed.bismillah === 'string') {
      return { bismillah: parsed.bismillah, font_file: typeof parsed.font_file === 'string' ? parsed.font_file : null };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function fetchMeta(): Promise<MushafMeta> {
  if (!metaCache) {
    const cached = readCachedMeta();
    metaCache = fetch(`${API_BASE}/mushafs`)
      .then(response => {
        if (!response.ok) throw new Error('meta');
        return response.json();
      })
      .then((list: Array<{ id: number; bismillah: string; font_file: string | null }>) => {
        const found = list.find(item => item.id === 4);
        if (!found) throw new Error('meta');
        const meta: MushafMeta = { bismillah: found.bismillah, font_file: found.font_file };
        try {
          localStorage.setItem(META_KEY, JSON.stringify(meta));
        } catch {
          /* storage may be blocked */
        }
        return meta;
      })
      .catch(() => {
        if (cached) return cached;
        return { bismillah: WARSH_FALLBACK_BISMILLAH, font_file: WARSH_FALLBACK_FONT };
      });
  }
  return metaCache;
}

function ensureWarshFont(fontFile: string | null): Promise<boolean> {
  if (fontReady || !fontFile) return Promise.resolve(fontReady);
  if (!fontLoading) {
    fontLoading = (async () => {
      try {
        const font = new FontFace('WarshQuran', `url("${fontFile}")`);
        await font.load();
        document.fonts.add(font);
        fontReady = true;
      } catch {
        fontReady = false;
      } finally {
        fontLoading = null;
      }
    })();
  }
  return fontLoading.then(() => fontReady);
}

function toArabicDigits(value: number): string {
  return toAr(value);
}

export default function WarshReader({
  defaultSurah,
  title = 'نص المصحف برواية ورش',
  hint = 'يتطلب الاتصال أول مرة، ثم تُحفظ السورة على جهازك للمراجعة دون اتصال.',
  defaultOpen = false,
}: {
  defaultSurah: number;
  title?: string;
  hint?: string;
  defaultOpen?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [surahInput, setSurahInput] = useState(() => String(Math.min(114, Math.max(1, defaultSurah || 1))));
  const [ayat, setAyat] = useState<Ayah[]>([]);
  const [basmala, setBasmala] = useState<string>(WARSH_FALLBACK_BISMILLAH);
  const [status, setStatus] = useState('');
  const [loadedSurah, setLoadedSurah] = useState<number | null>(null);
  const [fontApplied, setFontApplied] = useState(fontReady);
  const requestId = useRef(0);

  const showSurah = useCallback(async (wanted: number) => {
    if (!Number.isInteger(wanted) || wanted < 1 || wanted > 114) {
      setStatus('أدخل رقم سورة من 1 إلى 114.');
      return;
    }
    const current = ++requestId.current;
    setStatus('جارٍ تحميل السورة…');
    setAyat([]);

    const cached = readCachedSurah(wanted);
    if (cached && current === requestId.current) {
      setAyat(cached);
      setLoadedSurah(wanted);
      setBasmala(readCachedMeta()?.bismillah || WARSH_FALLBACK_BISMILLAH);
      setStatus('');
    }

    try {
      const [mushaf, response] = await Promise.all([fetchMeta(), fetch(`${API_BASE}/mushafs/4/${wanted}`)]);
      if (current !== requestId.current) return;
      if (!response.ok) throw new Error('fetch');
      const data = (await response.json()) as Ayah[];
      if (!Array.isArray(data) || !data.length) throw new Error('empty');
      if (current !== requestId.current) return;

      setBasmala(mushaf.bismillah || WARSH_FALLBACK_BISMILLAH);
      setAyat(data);
      setLoadedSurah(wanted);
      try {
        localStorage.setItem(surahCacheKey(wanted), JSON.stringify(data));
      } catch {
        /* offline cache is optional */
      }

      const ok = await ensureWarshFont(mushaf.font_file || WARSH_FALLBACK_FONT);
      if (current !== requestId.current) return;
      setFontApplied(ok);
      setStatus(ok ? '' : 'عُرض النص؛ إن ظهرت علامات ناقصة، فخط ورش لم يُحمَّل بعد.');
    } catch {
      if (current !== requestId.current) return;
      if (cached) {
        setStatus('تعذّر التحديث من الشبكة؛ عُرضت النسخة المحفوظة على جهازك.');
      } else {
        setStatus('تعذر تحميل السورة؛ تحقق من الاتصال بالشبكة. (تُحفظ السور بعد أول تحميل)');
      }
    }
  }, []);

  // حمّل السورة المبدئية مرة واحدة، وأعد التحميل إذا تغيّر الثمن المستهدف.
  useEffect(() => {
    const safe = Math.min(114, Math.max(1, defaultSurah || 1));
    setSurahInput(String(safe));
    void showSurah(safe);
  }, [defaultSurah, showSurah]);

  const surahNumber = Number(surahInput);
  const surahName = surahNumber >= 1 && surahNumber <= 114 ? SURAHS[surahNumber] : '';

  const showBasmala =
    loadedSurah !== null && loadedSurah !== 9 && loadedSurah !== 1 && basmala && ayat.length > 0 && !ayat[0].text.startsWith(basmala);

  return (
    <details className="mushaf-details" open={defaultOpen}>
      <summary>
        <BookOpen size={16} />
        <span>{title}</span>
        {loadedSurah ? <em>سورة {SURAHS[loadedSurah]}</em> : null}
      </summary>
      <section id={`warsh-reader-${uid}`} dir="rtl" lang="ar" className="warsh-reader" aria-label={title}>
        <p className="warsh-hint">{hint}</p>
        <div className="warsh-controls">
          <label htmlFor={`warsh-surah-${uid}`}>رقم السورة:</label>
          <input
            id={`warsh-surah-${uid}`}
            type="number"
            min={1}
            max={114}
            value={surahInput}
            onChange={event => setSurahInput(event.target.value)}
          />
          <select
            aria-label="اختر السورة بالاسم"
            value={Number.isInteger(surahNumber) && surahNumber >= 1 && surahNumber <= 114 ? surahNumber : ''}
            onChange={event => {
              setSurahInput(event.target.value);
              const next = Number(event.target.value);
              if (Number.isInteger(next)) void showSurah(next);
            }}
          >
            <option value="" disabled>
              اختر السورة
            </option>
            {SURAHS.map((name, index) =>
              index === 0 ? null : (
                <option key={index} value={index}>
                  {index} · {name}
                </option>
              ),
            )}
          </select>
          <button id={`warsh-show-${uid}`} type="button" className="button button-outline button-small" onClick={() => void showSurah(Number(surahInput))}>
            عرض السورة
          </button>
        </div>
        {surahName && loadedSurah === surahNumber && <h4 className="warsh-surah-name">سورة {surahName}</h4>}
        <p id={`warsh-status-${uid}`} role="status" className="warsh-status">
          {status}
        </p>
        <div
          id={`warsh-ayat-${uid}`}
          className="warsh-ayat"
          style={fontApplied ? { fontFamily: '"WarshQuran", "Noto Naskh Arabic", serif' } : undefined}
        >
          {showBasmala && <p className="basmala">{basmala}</p>}
          {ayat.map(ayah => (
            <p key={ayah.number} data-ayah={`${loadedSurah}:${ayah.number}`}>
              {ayah.text}
              <span className="ayah-number"> ﴿{toArabicDigits(ayah.number)}﴾</span>
            </p>
          ))}
        </div>
      </section>
    </details>
  );
}
