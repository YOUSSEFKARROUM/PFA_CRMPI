import type { Recommendation } from '../api/types';

/** « Parce que… » : la réponse qui déclenche la recommandation, ou sa nature générale. */
export function priorityReason(rec: Recommendation): string {
  if (!rec.trigger) return 'Bonne pratique d’entretien, recommandée quelles que soient vos réponses.';
  return `Parce que vous avez répondu « ${rec.trigger.answer} » à la question ${rec.trigger.number}.`;
}

/** « −4 points », « −1 point », « −0,5 point ». */
export function formatPoints(points: number): string {
  const value = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(points);
  return `−${value} point${points >= 2 ? 's' : ''}`;
}

export function sourcesOf(rec: Recommendation): string {
  return [rec.guide_reference, rec.reference].filter(Boolean).join(' · ');
}
