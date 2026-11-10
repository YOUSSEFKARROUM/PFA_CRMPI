import type { HistoryEntry } from '../../api/types';
import { formatDate, formatScore } from '../../lib/maturity';

interface HistoryChartProps {
  /** Entrées dans l'ordre chronologique. */
  entries: HistoryEntry[];
}

const WIDTH = 900;
const HEIGHT = 230;
const LEFT = 60;
/** Marge droite : laisse la place aux noms des zones de niveau. */
const RIGHT = 96;
const GRID = [0, 50, 100];
/** Zones de niveau (seuils de src/scoring.py, affichés seulement). */
const BANDS = [
  { from: 0, to: 25, label: 'Critique', className: 'band--critical' },
  { from: 25, to: 50, label: 'Faible', className: 'band--weak' },
  { from: 50, to: 75, label: 'Moyen', className: 'band--medium' },
  { from: 75, to: 100, label: 'Avancé', className: 'band--advanced' },
];

const yFor = (score: number) => 180 - (score / 100) * 145;

export function HistoryChart({ entries }: HistoryChartProps) {
  const step = entries.length > 1 ? (WIDTH - LEFT - RIGHT) / (entries.length - 1) : 0;
  const points = entries.map((entry, i) => ({
    entry,
    x: entries.length > 1 ? LEFT + i * step : WIDTH / 2,
    y: yFor(entry.global_score),
  }));
  const pct = (value: number, total: number) => `${((value / total) * 100).toFixed(2)}%`;

  return (
    <figure className="history-chart" aria-label={`Évolution du score global : ${entries.map((e) => formatScore(e.global_score)).join(', ')}`}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
        {BANDS.map((band) => (
          <g key={band.label} className={`band ${band.className}`}>
            <rect x={34} y={yFor(band.to)} width={WIDTH - 34} height={yFor(band.from) - yFor(band.to)} />
            <text x={WIDTH - 6} y={yFor(band.to) + 13} textAnchor="end">{band.label}</text>
          </g>
        ))}
        {points.length > 1 && (
          <polygon
            className="chart-area"
            points={[
              `${points[0].x.toFixed(1)},${yFor(0)}`,
              ...points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
              `${points[points.length - 1].x.toFixed(1)},${yFor(0)}`,
            ].join(' ')}
          />
        )}
        {GRID.map((value) => (
          <line key={value} x1={34} y1={yFor(value)} x2={WIDTH} y2={yFor(value)} className="chart-grid" />
        ))}
        {points.length > 1 && (
          <polyline
            points={points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
            pathLength={1}
            className="chart-line"
          />
        )}
        {points.map((p, i) => (
          <circle
            key={p.entry.id}
            cx={p.x}
            cy={p.y}
            r="5"
            className="chart-dot"
            style={{ animationDelay: `${300 + i * 120}ms` }}
          />
        ))}
      </svg>
      {GRID.map((value) => (
        <span key={value} className="chart-axis" style={{ top: pct(yFor(value), HEIGHT) }}>
          {value}
        </span>
      ))}
      {points.map((p) => (
        <span key={`s-${p.entry.id}`} className="chart-value" style={{ left: pct(p.x, WIDTH), top: pct(p.y - 10, HEIGHT) }}>
          {formatScore(p.entry.global_score)}
        </span>
      ))}
      {points.map((p) => (
        <span key={`d-${p.entry.id}`} className="chart-date" style={{ left: pct(p.x, WIDTH) }}>
          {formatDate(p.entry.completed_at)}
        </span>
      ))}
    </figure>
  );
}
