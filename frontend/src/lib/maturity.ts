/**
 * Présentation des niveaux renvoyés par l'API. Aucun seuil n'est recalculé ici :
 * le niveau vient toujours de src/scoring.py.
 */
import type { MaturityLevel, Severity } from '../api/types';

export const LEVEL_TONE: Record<MaturityLevel, string> = {
  Critique: 'var(--color-coral)',
  Faible: 'var(--color-gold)',
  Moyen: 'var(--color-emerald)',
  Avancé: 'var(--color-emerald)',
};

export const LEVEL_SUMMARY: Record<MaturityLevel, string> = {
  Critique:
    "Les fondamentaux ne sont pas encore en place. Les priorités ci-dessous sont le point de départ le plus utile.",
  Faible:
    "Des mesures existent mais restent partielles ou peu formalisées. Les écarts se comblent d'abord par de l'organisation.",
  Moyen: 'Le socle est en place. Les points restants sont ciblés et se traitent domaine par domaine.',
  Avancé:
    'Les pratiques déclarées sont largement formalisées. L’enjeu devient de les maintenir et de les tester régulièrement.',
};

/** Accord avec « maturité » (féminin) pour les titres. */
export const LEVEL_HEADLINE: Record<MaturityLevel, string> = {
  Critique: 'Maturité critique',
  Faible: 'Maturité faible',
  Moyen: 'Maturité moyenne',
  Avancé: 'Maturité avancée',
};

/** Plage de score de chaque niveau (seuils de src/scoring.py, affichés seulement). */
export const LEVEL_RANGE: Record<MaturityLevel, string> = {
  Critique: '0–24',
  Faible: '25–49',
  Moyen: '50–74',
  Avancé: '75–100',
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  Critical: 'Critique',
  High: 'Haute',
  Medium: 'Moyenne',
  Low: 'Basse',
};

export const SEVERITY_TONE: Record<Severity, string> = {
  Critical: 'var(--color-coral)',
  High: 'var(--color-gold)',
  Medium: 'var(--color-ink-55)',
  Low: 'var(--color-emerald)',
};

export function levelTone(level: MaturityLevel): string {
  return LEVEL_TONE[level] ?? 'var(--color-ink)';
}

export function formatScore(score: number): string {
  return String(Math.round(score));
}

const MONTH_YEAR = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const FULL_DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export function formatMonthYear(date: Date): string {
  return MONTH_YEAR.format(date);
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : FULL_DATE.format(date);
}

export function formatDelta(current: number, previous: number | undefined): string {
  if (previous === undefined) return '—';
  const delta = Math.round(current - previous);
  return delta >= 0 ? `+${delta}` : String(delta);
}
