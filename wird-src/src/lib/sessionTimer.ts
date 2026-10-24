import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

export interface SessionTimer {
  running: boolean;
  getSeconds: () => number;
  subscribe: (listener: () => void) => () => void;
  toggle: () => void;
  reset: () => void;
}

/**
 * Focus timer that keeps its time outside React state, so only the components that show the clock
 * re-render each second (not the whole App). It counts from timestamps, so it stays accurate even when
 * the phone throttles timers with the screen off or the app in the background.
 */
export function useSessionTimer(): SessionTimer {
  const [running, setRunning] = useState(false);
  const accumulatedMs = useRef(0);
  const startedAt = useRef<number | null>(null);
  const listeners = useRef(new Set<() => void>());

  const emit = useCallback(() => listeners.current.forEach(listener => listener()), []);
  const subscribe = useCallback((listener: () => void) => {
    listeners.current.add(listener);
    return () => { listeners.current.delete(listener); };
  }, []);
  const getSeconds = useCallback(() => {
    const live = startedAt.current === null ? 0 : Date.now() - startedAt.current;
    return Math.floor((accumulatedMs.current + live) / 1000);
  }, []);

  const toggle = useCallback(() => {
    if (startedAt.current === null) {
      startedAt.current = Date.now();
      setRunning(true);
    } else {
      accumulatedMs.current += Date.now() - startedAt.current;
      startedAt.current = null;
      setRunning(false);
    }
    emit();
  }, [emit]);

  const reset = useCallback(() => {
    startedAt.current = null;
    accumulatedMs.current = 0;
    setRunning(false);
    emit();
  }, [emit]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(emit, 500);
    document.addEventListener('visibilitychange', emit);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', emit); };
  }, [running, emit]);

  return useMemo(() => ({ running, getSeconds, subscribe, toggle, reset }), [running, getSeconds, subscribe, toggle, reset]);
}

/** Subscribes the calling component to the timer; it re-renders only when the whole second changes. */
export function useTimerSeconds(timer: SessionTimer): number {
  return useSyncExternalStore(timer.subscribe, timer.getSeconds);
}
