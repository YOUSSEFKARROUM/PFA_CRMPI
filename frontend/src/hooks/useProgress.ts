import { useEffect, useState } from 'react';

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * Progression animée 0 → 1 (ease-out cubique), relancée à chaque changement de `key`.
 * Renvoie directement 1 si l'utilisateur a demandé moins d'animations.
 */
export function useProgress(key: string, durationMs = 1100): number {
  const [progress, setProgress] = useState(() => (prefersReducedMotion() ? 1 : 0));

  useEffect(() => {
    if (prefersReducedMotion()) {
      setProgress(1);
      return undefined;
    }
    let frame = 0;
    // Origine prise sur la première frame : l'horodatage de requestAnimationFrame
    // n'est pas garanti sur la même base que performance.now().
    let start: number | null = null;
    const tick = (now: number) => {
      start ??= now;
      const linear = Math.min(1, Math.max(0, (now - start) / durationMs));
      setProgress(1 - (1 - linear) ** 3);
      if (linear < 1) frame = requestAnimationFrame(tick);
    };
    setProgress(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [key, durationMs]);

  return progress;
}
