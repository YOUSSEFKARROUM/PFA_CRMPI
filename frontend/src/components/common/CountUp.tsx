import { useRef } from 'react';
import { useInView } from '../../hooks/useInView';
import { useProgress } from '../../hooks/useProgress';

interface CountUpProps {
  value: number;
  className?: string;
  durationMs?: number;
}

/**
 * Nombre qui compte de 0 à `value` quand il devient visible.
 * Le texte accessible est toujours la valeur finale (pas d'annonces intermédiaires).
 */
export function CountUp({ value, className, durationMs = 1000 }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref);
  const progress = useProgress(isInView ? `in-${value}` : 'out', durationMs);
  const shown = isInView ? Math.round(value * progress) : 0;

  return (
    <span ref={ref} className={className}>
      <span className="visually-hidden">{value}</span>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}
