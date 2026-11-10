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
}

const WIDTH = 400;
const HEIGHT = 390;
const CX = 200;
const CY = 195;
const INNER = 18;
const OUTER = 140;
const LABEL_RADIUS = 168;

/** Motif signature : radar pentagonal (5 domaines = 5 côtés). */
export function PentaRadar({ scores, labels = [], rings = [0.25, 0.5, 0.75, 1], progress = 1, title }: PentaRadarProps) {
  const shape = radarVertices(scores, CX, CY, INNER, OUTER, progress);
  const spokes = scores.map((_, i) => vertex(CX, CY, OUTER, i));

  return (
    <figure className="penta-radar" aria-label={title}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-hidden="true">
        {rings.map((ring) => (
          <polygon key={ring} points={pentagon(CX, CY, INNER + (OUTER - INNER) * ring)} className="radar-ring" />
        ))}
        {spokes.map((p, i) => (
          <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} className="radar-ring" />
        ))}
        <polygon points={toPoints(shape)} className="radar-shape" />
        {shape.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" className="radar-dot" />
        ))}
      </svg>
      {labels.map((label, i) => {
        const position = percentPosition(vertex(CX, CY, LABEL_RADIUS, i), WIDTH, HEIGHT);
        return (
          <div key={label.name} className="radar-label" style={position}>
            <span className="radar-label-name">{label.name}</span>
            {label.value !== undefined && (
              <span className="radar-label-value" style={{ color: label.tone }}>
                {label.value}
              </span>
            )}
          </div>
        );
      })}
    </figure>
  );
}
