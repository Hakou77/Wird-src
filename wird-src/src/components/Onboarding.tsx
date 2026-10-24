import { useState } from 'react';
import { ArrowLeft, Layers3, RefreshCw, Sun, BookOpen } from 'lucide-react';
import { ar, dateKey, WEEKDAYS, type Settings, type ThemeName } from '../lib/tracker';
import { Brand } from './Shared';

const LAYERS = [
  { n: '١', t: 'الحفظ الجديد', d: 'ثمن واحد يومياً — نحو صفحة وربع، بقراءات مركّزة وسمّيعين.', icon: BookOpen },
  { n: '٢', t: 'المراجعة القريبة', d: 'آخر حزب مكتمل + ما حفظته من الحالي — شبكة أثمان بالضغط.', icon: Layers3 },
  { n: '٣', t: 'المراجعة البعيدة', d: 'الأحزاب المستقرة تسميعاً من الذاكرة، بدورة محسوبة.', icon: RefreshCw },
];

export function Onboarding({ onComplete }: { onComplete: (memorizedHizbs: number, memorizedEighths: number, settings: Partial<Settings>) => void }) {
  const [step, setStep] = useState(0);
  const [hizbs, setHizbs] = useState(0);
  const [eighth, setEighth] = useState(1);
  const [dailyFar, setDailyFar] = useState<0.5 | 1 | 2>(1);
  const [restDay, setRestDay] = useState(5);
  const [theme, setTheme] = useState<ThemeName>('light');

  return (
    <div className="onboarding" dir="rtl">
      <div className="onboarding-inner">
        <div className="onboarding-brand"><Brand /></div>
        <div className="onboarding-progress" aria-hidden="true">
          <span className="ob-dots">{[0, 1, 2].map(index => <i key={index} className={index <= step ? 'on' : ''} />)}</span>
          <span>الخطوة {ar(step + 1)} من {ar(3)}</span>
        </div>

        {step === 0 && (
          <div className="onboarding-step rise-in">
            <h1>ثلاث طبقات، وحفظٌ راسخ.</h1>
            <p className="onboarding-sub">رحلة الألف ثمن تبدأ بورد، وتزهر بالمداومة.</p>
            <div className="onboarding-layers">
              {LAYERS.map(l => (
                <div key={l.n} className="onboarding-layer">
                  <span className="ol-num">{l.n}</span>
                  <div>
                    <strong>{l.t}</strong>
                    <p>{l.d}</p>
                  </div>
                  <l.icon size={18} />
                </div>
              ))}
            </div>
            <div className="science-note onboarding-science">
              <Sun size={14} />
              <span>القراءة السلبية أضعف من التسميع الغيبي بـ٢–٣ أضعاف. المعيار: أن تُسمّع أي حزب قديم بخطأ أو اثنين لا أكثر.</span>
            </div>
            <button type="button" className="button button-primary ob-cta" onClick={() => setStep(1)}>
              ابدأ الخطة <ArrowLeft size={17} />
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="onboarding-step rise-in">
            <h2>أين وصلت؟</h2>
            <p className="onboarding-sub">نحفظ في ورش من سورة الناس رجوعًا إلى الفاتحة، فالورد يمشي في هذا الاتجاه. يمكن تعديل هذا لاحقاً من الإعدادات.</p>
            <div className="ob-card">
              <div className="ob-card-label">الأحزاب المكتملة من الحزب ٦٠</div>
              <div className="ob-stepper">
                <button type="button" onClick={() => setHizbs(n => Math.max(0, n - 1))}>−</button>
                <div><strong>{ar(hizbs)}</strong><small>حزب</small></div>
                <button type="button" onClick={() => setHizbs(n => Math.min(59, n + 1))}>+</button>
              </div>
              <p className="ob-total">يبدأ الحفظ من الحزب ٦٠ نحو الفاتحة</p>
            </div>
            {hizbs < 60 && (
              <div className="ob-card">
                <div className="ob-card-label">الثمن الذي تعمل عليه في الحزب {ar(60 - hizbs)}</div>
                <div className="ob-eighths">
                  {Array.from({ length: 8 }, (_, i) => i + 1).map(t => (
                    <button
                      key={t}
                      type="button"
                      className={t === eighth ? 'sel' : t < eighth ? 'past' : ''}
                      onClick={() => setEighth(t)}
                    >
                      {ar(t)}
                    </button>
                  ))}
                </div>
                <p className="ob-total">محفوظك الآن {ar(hizbs * 8 + eighth - 1)} ثمناً من ٤٨٠</p>
              </div>
            )}
            <div className="onboarding-nav">
              <button type="button" className="button button-ghost" onClick={() => setStep(0)}>رجوع</button>
              <button type="button" className="button button-primary" onClick={() => setStep(2)}>التالي</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step rise-in">
            <h2>إعداد الدورة</h2>
            <p className="onboarding-sub">المراجعة البعيدة ويوم الراحة.</p>
            <div className="ob-card">
              <div className="ob-card-label">مقدار المراجعة البعيدة</div>
              <div className="ob-options">
                {([['half' as const, 0.5 as const, 'نصف حزب يومياً', 'إن ثقل الورد — دورة أطول'], ['hizb' as const, 1 as const, 'حزب يومياً', 'دورة أقصر — أنسب لخمس أحزاب'], ['juz' as const, 2 as const, 'جزء يومياً', 'للمتمكن — دورة أقصر']] as const).map(([id, v, t, d]) => (
                  <button key={id} type="button" className={`ob-option ${dailyFar === v ? 'sel' : ''}`} onClick={() => setDailyFar(v)}>
                    <strong>{t}</strong>
                    <span>{d}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="ob-card">
              <div className="ob-card-label">يوم بلا حفظ جديد</div>
              <div className="ob-weekdays">
                {WEEKDAYS.map((w, i) => (
                  <button key={w} type="button" className={restDay === i ? 'sel' : ''} onClick={() => setRestDay(i)}>{w}</button>
                ))}
              </div>
            </div>
            <div className="ob-card">
              <div className="ob-card-label">المظهر</div>
              <div className="ob-theme">
                <button type="button" className={theme === 'light' ? 'sel' : ''} onClick={() => setTheme('light')}>فاتح</button>
                <button type="button" className={theme === 'dark' ? 'sel' : ''} onClick={() => setTheme('dark')}>داكن</button>
              </div>
            </div>
            <div className="onboarding-nav">
              <button type="button" className="button button-ghost" onClick={() => setStep(1)}>رجوع</button>
              <button
                type="button"
                className="button button-primary"
                onClick={() => onComplete(hizbs, hizbs >= 60 ? 0 : Math.max(0, eighth - 1), { dailyFar, restDay, theme, startedAt: dateKey() })}
              >
                افتح ورد اليوم <ArrowLeft size={17} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
