import { ArrowLeft, BookOpen, CheckCircle2, Layers3, RefreshCw, Sun } from 'lucide-react';
import { ar } from '../lib/tracker';

/**
 * A short, always-reachable explanation of how the app thinks.
 * The daily order (yesterday → near → far → new) is the core rule that is
 * otherwise only implied by the task list, so it leads the guide.
 */
export const DAILY_ORDER = [
  { label: 'تسميع الأمس', hint: 'بلا نظر إلى المصحف' },
  { label: 'المراجعة القريبة', hint: 'آخر حزبين' },
  { label: 'المراجعة البعيدة', hint: 'دورة محسوبة' },
  { label: 'الحفظ الجديد', hint: 'بعد المراجعة' },
];

const LAYERS = [
  { icon: Sun, title: 'تسميع الأمس', body: 'أول خطوة في اليوم: ثمن الأمس من الذاكرة. خطأ أو اثنان لا يمنعان الإتمام، وأكثر من ذلك يعيد التسميع.' },
  { icon: Layers3, title: 'المراجعة القريبة', body: 'الحزب السابق كاملًا مع ما حفظته من الحالي. اضغط كل ثمن بعد تسميعه، وعلّم الضعيف ليعود غدًا.' },
  { icon: RefreshCw, title: 'المراجعة البعيدة', body: 'الأحزاب المستقرة، بالدورة التي اخترتها. افتح المصحف عند التوقف فقط، وسجّل مواضعك الضعيفة.' },
  { icon: BookOpen, title: 'الحفظ الجديد', body: 'ثمن واحد جديد بعد إتمام المراجعة: اقرأه قراءات مركّزة، احفظه، ثم سمّعه مرتين — واحدة قبل النوم.' },
];

export function Guide() {
  return (
    <div className="guide">
      <section className="guide-block">
        <h3>ترتيب يومك ثابت</h3>
        <p>المراجعة قبل الجديد دائمًا. لا يُفتح ثمن جديد وفي ذمتك مراجعة لم تُقضَ.</p>
        <ol className="guide-order">
          {DAILY_ORDER.map((step, index) => (
            <li key={step.label}>
              <span className="guide-step-num">{ar(index + 1)}</span>
              <span className="guide-step-text"><strong>{step.label}</strong><small>{step.hint}</small></span>
              {index < DAILY_ORDER.length - 1 && <ArrowLeft className="guide-step-arrow" size={14} aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </section>

      <section className="guide-block">
        <h3>ثلاث طبقات</h3>
        <ul className="guide-layers">
          {LAYERS.map(layer => (
            <li key={layer.title}>
              <span className="guide-layer-icon"><layer.icon size={17} strokeWidth={1.6} /></span>
              <div><strong>{layer.title}</strong><p>{layer.body}</p></div>
            </li>
          ))}
        </ul>
      </section>

      <section className="guide-block">
        <h3>الطريق والمعيار</h3>
        <ul className="guide-facts">
          <li><CheckCircle2 size={15} /> نحفظ من سورة الناس رجوعًا إلى الفاتحة: الحزب ٦٠ أولًا، وفي كل حزب ثمانية أثمان.</li>
          <li><CheckCircle2 size={15} /> الحدّ الأدنى ليومك: نصف صفحة من الحفظ الجديد مع مراجعتك، ويُحتسب اليوم.</li>
          <li><CheckCircle2 size={15} /> حفظك وملاحظاتك تبقى على جهازك، ويمكنك تصدير نسخة من الإعدادات.</li>
        </ul>
      </section>
    </div>
  );
}
