import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Account, DemoProfile, Questionnaire } from '../api/types';

export interface Bootstrap {
  questionnaire: Questionnaire | null;
  demos: DemoProfile[];
  account: Account | null;
  error: string | null;
  setAccount: (account: Account | null) => void;
  retry: () => void;
}

/** Charge en parallèle le questionnaire, les profils de démonstration et la session courante. */
export function useBootstrap(): Bootstrap {
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [demos, setDemos] = useState<DemoProfile[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    Promise.all([api.questionnaire(), api.demoProfiles(), api.me()])
      .then(([q, d, me]) => {
        if (cancelled) return;
        setQuestionnaire(q);
        setDemos(d);
        setAccount(me);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Chargement impossible.');
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { questionnaire, demos, account, error, setAccount, retry };
}
