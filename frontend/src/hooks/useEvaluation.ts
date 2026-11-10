import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Answers, Evaluation } from '../api/types';

export interface EvaluationState {
  evaluation: Evaluation | null;
  error: string | null;
}

interface Stored extends EvaluationState {
  answers: Answers | null;
}

const EMPTY: EvaluationState = { evaluation: null, error: null };

/**
 * Demande le score au serveur dès que l'écran de résultats est actif.
 * Le résultat est rattaché aux réponses qui l'ont produit : il n'est jamais
 * affiché pour d'autres réponses, même le temps d'un rendu.
 */
export function useEvaluation(answers: Answers, enabled: boolean): EvaluationState {
  const [stored, setStored] = useState<Stored>({ ...EMPTY, answers: null });

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    api
      .score(answers)
      .then((evaluation) => !cancelled && setStored({ answers, evaluation, error: null }))
      .catch((e: unknown) => {
        if (!cancelled) setStored({ answers, evaluation: null, error: e instanceof Error ? e.message : 'Calcul impossible.' });
      });
    return () => {
      cancelled = true;
    };
  }, [answers, enabled]);

  return enabled && stored.answers === answers ? { evaluation: stored.evaluation, error: stored.error } : EMPTY;
}
