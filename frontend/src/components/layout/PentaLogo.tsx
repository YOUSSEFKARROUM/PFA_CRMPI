import { pentagon, toPoints, vertex } from '../../lib/pentagon';

const INNER_RATIOS = [0.55, 0.85, 0.4, 0.7, 0.5];
const OUTER = pentagon(50, 52, 42);
const INNER = toPoints(INNER_RATIOS.map((ratio, i) => vertex(50, 52, 42 * ratio, i)));

interface PentaLogoProps {
  size: number;
}

export function PentaLogo({ size }: PentaLogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="penta-logo">
      <polygon points={OUTER} fill="none" stroke="var(--color-ink)" strokeWidth="5" strokeLinejoin="round" />
      <polygon points={INNER} fill="var(--color-emerald)" fillOpacity="0.85" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="wordmark">
      Penta<span className="wordmark-accent">score</span>
    </span>
  );
}
