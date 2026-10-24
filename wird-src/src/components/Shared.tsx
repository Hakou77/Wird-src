import { useEffect, useId, useRef, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { X, BookOpen } from 'lucide-react';
import { ar } from '../lib/tracker';

export function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand ${small ? 'brand-small' : ''}`} aria-label="وِرد، رفيق رحلتك مع القرآن">
      <svg className="brand-mark" viewBox="0 0 54 54" fill="none" aria-hidden="true">
        <rect x="12" y="12" width="30" height="30" rx="5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="12" y="12" width="30" height="30" rx="5" transform="rotate(45 27 27)" stroke="currentColor" strokeWidth="1.5" />
        <path d="M17 23c4-2 7-1 10 2 3-3 6-4 10-2v12c-4-2-7-1-10 1-3-2-6-3-10-1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M27 25v11" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <div><span className="brand-name">وِرد</span><span className="brand-tagline">رفيق رحلتك مع القرآن</span></div>
    </div>
  );
}

export function LeafDrawing() {
  return (
    <svg viewBox="0 0 150 120" className="leaf-drawing" fill="none" aria-hidden="true">
      <path d="M52 113C72 89 86 60 103 14M75 76C66 62 50 51 34 45M90 45C94 37 109 30 121 27M65 95C50 92 37 88 23 79" stroke="currentColor" strokeWidth="1.25" />
      <path d="M94 40C85 25 92 11 105 6c6 16 0 27-11 34Zm-8 24c-6-20-14-29-26-31-1 17 7 27 26 31Zm-10 20c5-21 14-29 32-31-4 16-14 27-32 31Zm-10 9c-3-16-15-26-31-28 3 16 13 24 31 28Zm23-45c14-15 26-19 42-15-8 14-21 18-42 15ZM47 87C34 74 21 73 11 78c9 11 20 15 36 9Z" fill="currentColor" opacity=".14" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function GeometricPattern() {
  return (
    <svg viewBox="0 0 390 280" className="geometric-pattern" aria-hidden="true" fill="none">
      <defs>
        <pattern id="wird-pattern" width="90" height="90" patternUnits="userSpaceOnUse">
          <path d="M45 0 58 32 90 45 58 58 45 90 32 58 0 45 32 32Z" stroke="currentColor" strokeWidth=".8" />
          <path d="m45 15 21 9 9 21-9 21-21 9-21-9-9-21 9-21Z" stroke="currentColor" strokeWidth=".65" />
          <path d="M0 0h90v90H0Z" stroke="currentColor" strokeWidth=".4" />
        </pattern>
      </defs>
      <rect width="390" height="280" fill="url(#wird-pattern)" />
    </svg>
  );
}

export function ProgressRing({ value, complete, total }: { value: number; complete: number; total: number }) {
  const radius = 51;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="progress-ring" role="progressbar" aria-label="إنجاز ورد اليوم" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <svg viewBox="0 0 124 124" aria-hidden="true">
        <circle cx="62" cy="62" r={radius} stroke="currentColor" className="ring-track" strokeWidth="5" fill="none" />
        <motion.circle cx="62" cy="62" r={radius} className="ring-value" strokeWidth="5" strokeLinecap="round" fill="none" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: circumference * (1 - value / 100) }} transition={{ duration: 1, ease: 'easeOut' }} transform="rotate(-90 62 62)" />
        {value === 0 && <circle cx="62" cy="11" r="3.5" fill="#e5c395" />}
      </svg>
      <div className="ring-label"><strong>{ar(value)}<span>٪</span></strong><small>{ar(complete)} من {ar(total)} مكتمل</small></div>
    </div>
  );
}

export function Modal({ title, subtitle, icon, children, onClose, className = '' }: {
  title: string; subtitle?: string; icon?: ReactNode; children: ReactNode; onClose: () => void; className?: string;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timeout = window.setTimeout(() => {
      const firstInput = dialogRef.current?.querySelector<HTMLElement>('input:not([type="checkbox"]), select, [data-autofocus]');
      (firstInput || dialogRef.current)?.focus();
    }, 80);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key !== 'Tab') return;
      const elements = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]');
      if (!elements?.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timeout);
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, []);

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <motion.div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={`modal ${className}`} initial={{ opacity: 0, y: 25, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18 }} transition={{ duration: 0.22 }}>
        <div className="modal-heading">
          <div className="modal-heading-content">{icon && <span className="modal-title-icon">{icon}</span>}<div><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></div>
          <button className="icon-button close-button" onClick={onClose} aria-label="إغلاق"><X size={21} /></button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

export function EmptyState({ title, description, children, icon = <BookOpen size={30} strokeWidth={1.3} /> }: { title: string; description: string; children?: ReactNode; icon?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon">{icon}</span><h3>{title}</h3><p>{description}</p>{children}</div>;
}