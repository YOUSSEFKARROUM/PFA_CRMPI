import type { ScoreDriver } from '../../api/types';
import { formatPoints } from '../../lib/recommendations';

interface ScoreDriversProps {
  drivers: readonly ScoreDriver[];
}

/**
 * Replay du score : les réponses qui ont coûté le plus de points.
 * Chaque question pèse 4 points sur 100 : une réponse à 1 en coûte 4, une réponse à 4 en coûte 1.
 */
export function ScoreDrivers({ drivers }: ScoreDriversProps) {
  if (drivers.length === 0) return null;

  return (
    <details className="drivers">
      <summary>Voir ce qui a le plus pesé sur votre score</summary>
      <p className="drivers-intro">
        Chaque question compte pour 4 points sur 100 : une réponse au niveau 1 coûte 4 points, une réponse au
        niveau 4 en coûte 1. Voici les réponses qui vous ont fait perdre le plus de points.
      </p>
      <ol className="driver-list">
        {drivers.map((driver) => (
          <li key={driver.id} className="driver">
            <span className="data driver-points">{formatPoints(driver.points_lost)}</span>
            <div className="driver-body">
              <span className="data driver-meta">
                Question {driver.number} · {driver.domain_name}
              </span>
              <span className="driver-question">{driver.text}</span>
              <span className="driver-answer">Votre réponse : « {driver.answer} »</span>
            </div>
          </li>
        ))}
      </ol>
    </details>
  );
}
