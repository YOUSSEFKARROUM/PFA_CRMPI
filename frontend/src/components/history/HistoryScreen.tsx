import { useEffect, useState } from 'react';
import { ApiError, api } from '../../api/client';
import type { Account, HistoryEntry } from '../../api/types';
import { formatDate, formatDelta, formatScore, levelTone } from '../../lib/maturity';
import { HistoryChart } from './HistoryChart';
import './history.css';

interface HistoryScreenProps {
  account: Account;
  canGoBackToResults: boolean;
  onBack: () => void;
  onStart: () => void;
  onLoggedOut: () => void;
  onSessionExpired: () => void;
}

type Load = { kind: 'loading' } | { kind: 'ready'; entries: HistoryEntry[] } | { kind: 'error'; message: string };

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Une erreur est survenue.');

export function HistoryScreen(props: HistoryScreenProps) {
  const { account, canGoBackToResults, onBack, onStart, onLoggedOut, onSessionExpired } = props;
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .history()
      .then((entries) => !cancelled && setLoad({ kind: 'ready', entries }))
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) onSessionExpired();
        else setLoad({ kind: 'error', message: errorMessage(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [account.id, onSessionExpired]);

  async function run(action: () => Promise<void>) {
    setActionError(null);
    try {
      await action();
      onLoggedOut();
    } catch (e) {
      setActionError(errorMessage(e));
    }
  }

  const chronological = load.kind === 'ready' ? [...load.entries].reverse() : [];
  const first = chronological[0];
  const last = chronological[chronological.length - 1];
  const title = chronological.length === 0
    ? 'Aucune évaluation enregistrée'
    : `${chronological.length} évaluation${chronological.length > 1 ? 's' : ''} depuis le ${formatDate(first.completed_at)}`;

  return (
    <section className="page history" aria-labelledby="history-title">
      <header className="history-head">
        <span className="label">Historique — {account.organization}</span>
        <h1 id="history-title">{load.kind === 'ready' ? title : 'Historique des évaluations'}</h1>
        {chronological.length > 1 && (
          <p className="lede">
            Évolution de {formatDelta(last.global_score, first.global_score)} points entre votre première et votre
            dernière évaluation.
          </p>
        )}
      </header>

      {load.kind === 'loading' && <p className="lede">Chargement…</p>}
      {load.kind === 'error' && <p className="alert" role="alert">{load.message}</p>}
      {load.kind === 'ready' && chronological.length === 0 && (
        <div className="history-empty">
          <p className="lede">Terminez une évaluation puis choisissez « Enregistrer dans mon historique ».</p>
          <button type="button" className="btn-primary" onClick={onStart}>
            Commencer une évaluation
          </button>
        </div>
      )}

      {chronological.length > 0 && (
        <>
          <HistoryChart entries={chronological} />
          <ol className="history-rows">
            {load.kind === 'ready' &&
              load.entries.map((entry, i) => (
                <li key={entry.id} className="history-row">
                  <span>{formatDate(entry.completed_at)}</span>
                  <span className="history-note">{i === 0 ? 'Dernière évaluation' : 'Évaluation archivée'}</span>
                  <span className="data history-score">{formatScore(entry.global_score)}</span>
                  <span className="history-level" style={{ color: levelTone(entry.maturity_level) }}>
                    {entry.maturity_level}
                  </span>
                  <span className="data history-delta">
                    {formatDelta(entry.global_score, load.entries[i + 1]?.global_score)}
                  </span>
                </li>
              ))}
          </ol>
        </>
      )}

      <footer className="history-footer">
        {canGoBackToResults && (
          <button type="button" className="btn-link" onClick={onBack}>
            Retour aux résultats
          </button>
        )}
        <button type="button" className="btn-link" onClick={() => run(api.logout)}>
          Se déconnecter
        </button>
        {isConfirmingDelete ? (
          <span className="delete-confirm">
            Supprimer définitivement le compte et toutes les évaluations ?
            <button type="button" className="btn-danger" onClick={() => run(api.deleteAccount)}>
              Oui, supprimer
            </button>
            <button type="button" className="btn-link" onClick={() => setConfirmingDelete(false)}>
              Annuler
            </button>
          </span>
        ) : (
          <button type="button" className="btn-link" onClick={() => setConfirmingDelete(true)}>
            Supprimer mon compte et mes données
          </button>
        )}
      </footer>
      {actionError && <p className="alert" role="alert">{actionError}</p>}
    </section>
  );
}
