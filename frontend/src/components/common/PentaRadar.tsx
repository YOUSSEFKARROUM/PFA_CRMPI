import type React from 'react';
import { pentagon, percentPosition, radarVertices, toPoints, vertex } from '../../lib/pentagon';
import './penta-radar.css';

export interface RadarLabel {
  name: string;
  value?: string;
  tone?: string;
}

interface PentaRadarProps {
  /** Scores 0-100, un par domaine, dans l'ordre des sommets. */
  scores: readonly number[];
  labels?: readonly RadarLabel[];
  rings?: readonly number[];
  progress?: number;
  title: string;
  /** Tracé progressif de la grille et apparition en cascade des libellés (révélation du résultat). */
  isAnimated?: boolean;
  /** Graduations d'instrument tous les 10 points sur chaque axe. */
  hasTicks?: boolean;
  /** Axe mis en évidence (survol ou focus d'un domaine associé). */
  activeIndex?: number | null;
  /** Forme de comparaison (ex. première évaluation), tracée en pointillés sous la forme principale. */
  compareScores?: readonly number[];
}

const WIDTH = 400;
const HEIGHT = 390;
const CX = 200;
const CY = 195;
const INNER = 18;
const OUTER = 140;
const LABEL_RADIUS = 168;
const TICKS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Motif signature : radar pentagonal (5 domaines = 5 côtés). */
export function PentaRadar({
  scores, labels = [], rings = [0.25, 0.5, 0.75, 1], progress = 1, title, isAnimated = false, hasTicks = false, activeIndex = null, compareScores,
}: PentaRadarProps) {
  const shape = radarVertices(scores, CX, CY, INNER, OUTER, progress);
  const spokes = scores.map((_, i) => vertex(CX, CY, OUTER, i));
  const ringClass = isAnimated ? 'radar-ring radar-ring--draw' : 'radar-ring';
  const revealClass = isAnimated ? 'reveal' : undefined;

  return (
    <figure className={isAnimated ? 'penta-radar penta-radar--animated' : 'penta-radar'} aria-label={title}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-hidden="true">
        {rings.map((ring, i) => (
          <polygon
            key={ring}
            points={pentagon(CX, CY, INNER + (OUTER - INNER) * ring)}
            pathLength={1}
            className={ring === 1 ? `${ringClass} radar-ring--outer` : ringClass}
            style={{ '--i': i } as React.CSSProperties}
          />
        ))}
        {spokes.map((p, i) => (
          <line
            key={i}
            x1={CX}
            y1={CY}
            x2={p.x}
            y2={p.y}
            pathLength={1}
            className={i === activeIndex ? `${ringClass} radar-spoke--active` : ringClass}
          />
        ))}
        {hasTicks &&
          scores.map((_, axis) =>
            TICKS.map((t) => {
              const p = vertex(CX, CY, INNER + ((OUTER - INNER) * t) / 10, axis);
              return <circle key={`${axis}-${t}`} cx={p.x} cy={p.y} r={t === 5 ? 1.6 : 0.9} className="radar-tick" />;
            }),
          )}
        {compareScores && (
          <polygon points={toPoints(radarVertices(compareScores, CX, CY, INNER, OUTER, progress))} className="radar-compare" />
        )}
        <polygon points={toPoints(shape)} className="radar-shape" />
        {shape.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === activeIndex ? 6.5 : 4} className="radar-dot" />
        ))}
      </svg>
      {labels.map((label, i) => {
        const position = percentPosition(vertex(CX, CY, LABEL_RADIUS, i), WIDTH, HEIGHT);
        return (
          <div
            key={label.name}
            className={i === activeIndex ? 'radar-label radar-label--active' : 'radar-label'}
            style={position}
          >
            <span className={revealClass} style={{ '--i': i + 6 } as React.CSSProperties}>
              <span className="radar-label-name">{label.name}</span>
              {label.value !== undefined && (
                <span className="radar-label-value" style={{ color: label.tone }}>
                  {label.value}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </figure>
  );
}
