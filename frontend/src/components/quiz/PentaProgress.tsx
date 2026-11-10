import { pentagon, radarVertices, toPoints, vertex } from '../../lib/pentagon';

interface PentaProgressProps {
  domainNames: string[];
  currentIndex: number;
  completed: boolean[];
  /** Part des questions répondues par domaine (0-1) : le pentagone se remplit au fil des réponses. */
  fractions?: number[];
}

const CX = 70;
const CY = 66;
const RADIUS = 46;

/** Indicateur de progression : les 5 domaines sont les 5 sommets du pentagone. */
export function PentaProgress({ domainNames, currentIndex, completed, fractions }: PentaProgressProps) {
  const vertices = domainNames.map((_, i) => vertex(CX, CY, RADIUS, i));
  const fill = fractions ? radarVertices(fractions.map((f) => f * 100), CX, CY, 9, RADIUS) : null;
  const path = toPoints(vertices.slice(0, currentIndex + 1));

  return (
    <div className="penta-progress">
      <svg viewBox="0 0 140 136" aria-hidden="true">
        <polygon points={pentagon(CX, CY, RADIUS)} className="progress-outline" />
        <polygon points={pentagon(CX, CY, RADIUS / 2)} className="progress-outline progress-outline--inner" />
        {fill && <polygon points={toPoints(fill)} className="progress-fill" />}
        <polyline points={path} className="progress-path" />
        {vertices.map((p, i) => (
          <circle
            key={domainNames[i]}
            cx={p.x}
            cy={p.y}
            r={i === currentIndex ? 7 : 5}
            className={`progress-dot${completed[i] ? ' is-done' : ''}${i === currentIndex ? ' is-current' : ''}`}
          />
        ))}
      </svg>
      <ol className="progress-labels">
        {domainNames.map((name, i) => (
          <li key={name} aria-current={i === currentIndex ? 'step' : undefined}>
            {name}
            {completed[i] && <span className="visually-hidden"> (complété)</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
