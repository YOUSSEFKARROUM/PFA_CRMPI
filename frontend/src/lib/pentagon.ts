/** Géométrie du motif signature : pentagone régulier, premier sommet en haut (repère SVG). */

export interface Point {
  x: number;
  y: number;
}

export const SIDES = 5;

export function vertex(cx: number, cy: number, radius: number, index: number): Point {
  const angle = ((-90 + index * (360 / SIDES)) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

export function toPoints(points: readonly Point[]): string {
  return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

export function pentagon(cx: number, cy: number, radius: number): string {
  return toPoints(Array.from({ length: SIDES }, (_, i) => vertex(cx, cy, radius, i)));
}

/** Sommets d'un radar : chaque score (0-100) place son sommet entre `inner` et `outer`. */
export function radarVertices(
  scores: readonly number[], cx: number, cy: number, inner: number, outer: number, progress = 1,
): Point[] {
  return scores.map((score, i) => {
    const clamped = Math.min(100, Math.max(0, score));
    return vertex(cx, cy, inner + (clamped / 100) * (outer - inner) * progress, i);
  });
}

/** Position d'un libellé en pourcentage du conteneur (pour un positionnement HTML absolu). */
export function percentPosition(point: Point, width: number, height: number): { left: string; top: string } {
  return { left: `${((point.x / width) * 100).toFixed(2)}%`, top: `${((point.y / height) * 100).toFixed(2)}%` };
}
