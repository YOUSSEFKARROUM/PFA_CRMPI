import { useState } from 'react';
import type { Account, Evaluation } from '../../api/types';
import { useProgress } from '../../hooks/useProgress';
import {
  LEVEL_HEADLINE, LEVEL_SUMMARY, SEVERITY_LABEL, SEVERITY_TONE, formatMonthYear, formatScore, levelTone,
} from '../../lib/maturity';
import { priorityReason, sourcesOf } from '../../lib/recommendations';
import { PentaRadar } from '../common/PentaRadar';
import { ConsistencyChecks } from './ConsistencyChecks';
import { ScoreDrivers } from './ScoreDrivers';
import './results.css';

type Status = { kind: 'idle' } | { kind: 'busy' } | { kind: 'done'; message: string } | { kind: 'error'; message: string };

interface ResultsScreenProps {
  organization: string;
  sector: string;
  isDemo: boolean;
  evaluation: Evaluation;
  domainShort: Readonly<Record<string, string>>;
  account: Account | null;
  /** Ces réponses ont déjà été enregistrées (évite les doublons). */
  isSaved: boolean;
  onExport: () => Promise<string>;
  onJobDescription: () => Promise<string>;
  /** Badge PNG partageable du résultat. */
  onBadge: () => Promise<string>;
  onSave: () => Promise<void>;
  onRequireAccount: () => void;
  onHistory: () => void;
  onRestart: () => void;
}

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Une erreur est survenue.');

export function ResultsScreen(props: ResultsScreenProps) {
  const { organization, sector, isDemo, evaluation, account, domainShort, isSaved } = props;
  const progress = useProgress(`${evaluation.global_score}-${organization}`);
  const [exportStatus, setExportStatus] = useState<Status>({ kind: 'idle' });
  const [saveStatus, setSaveStatus] = useState<Status>({ kind: 'idle' });
  const [jobStatus, setJobStatus] = useState<Status>({ kind: 'idle' });
  const [badgeStatus, setBadgeStatus] = useState<Status>({ kind: 'idle' });

  const tone = levelTone(evaluation.maturity_level);
  const saveLabel = !account
    ? 'Créer un compte pour suivre mon évolution'
    : isSaved ? 'Enregistrée dans votre historique' : 'Enregistrer dans mon historique';
  const header = [organization || 'Votre organisation', sector || 'Secteur non précisé', formatMonthYear(new Date())];

  async function handleExport() {
    setExportStatus({ kind: 'busy' });
    try {
      setExportStatus({ kind: 'done', message: await props.onExport() });
    } catch (e) {
      setExportStatus({ kind: 'error', message: errorMessage(e) });
    }
  }

  async function handleBadge() {
    setBadgeStatus({ kind: 'busy' });
    try {
      setBadgeStatus({ kind: 'done', message: await props.onBadge() });
    } catch (e) {
      setBadgeStatus({ kind: 'error', message: errorMessage(e) });
    }
  }

  async function handleJobDescription() {
    setJobStatus({ kind: 'busy' });
    try {
      setJobStatus({ kind: 'done', message: await props.onJobDescription() });
    } catch (e) {
      setJobStatus({ kind: 'error', message: errorMessage(e) });
    }
  }

  async function handleSave() {
    if (!account) {
      props.onRequireAccount();
      return;
    }
    setSaveStatus({ kind: 'busy' });
    try {
      await props.onSave();
      setSaveStatus({ kind: 'done', message: 'Évaluation enregistrée dans votre historique.' });
    } catch (e) {
      setSaveStatus({ kind: 'error', message: errorMessage(e) });
    }
  }

  return (
    <section className="page results" aria-labelledby="results-title">
      <div className="results-hero">
        <div className="results-score">
          <span className="label">{header.join(' · ')}</span>
          {isDemo && <span className="demo-flag">Profil fictif de démonstration</span>}
          <div className="score-line" aria-label={`Score global : ${formatScore(evaluation.global_score)} sur 100`}>
            <span className="score-value">{formatScore(evaluation.global_score * progress)}</span>
            <span className="score-max">/100</span>
          </div>
          <h1 id="results-title" style={{ color: tone }}>
            {LEVEL_HEADLINE[evaluation.maturity_level]}
          </h1>
          <p className="results-summary">{LEVEL_SUMMARY[evaluation.maturity_level]}</p>
          <p className="disclaimer">
            Auto-évaluation déclarative : ce score reflète vos réponses. C’est un premier repère, qui ne remplace pas
            un audit réalisé par un expert.
          </p>
        </div>
        <PentaRadar
          scores={evaluation.domains.map((d) => d.score)}
          progress={progress}
          labels={evaluation.domains.map((d) => ({
            name: domainShort[d.id] ?? d.name,
            value: formatScore(d.score),
            tone: levelTone(d.level),
          }))}
          title={`Radar des scores par domaine : ${evaluation.domains.map((d) => `${d.name} ${formatScore(d.score)}`).join(', ')}`}
        />
      </div>

      <div className="domain-rows">
        <div className="rows-head">
          <h2>Détail par domaine</h2>
          <span className="data">score · niveau</span>
        </div>
        {evaluation.domains.map((domain) => (
          <div key={domain.id} className="domain-row">
            <span>{domain.name}</span>
            <div className="bar" aria-hidden="true">
              <div className="bar-fill" style={{ transform: `scaleX(${(domain.score / 100) * progress})`, background: levelTone(domain.level) }} />
            </div>
            <span className="data row-score">{formatScore(domain.score)}</span>
            <span className="row-level" style={{ color: levelTone(domain.level) }}>
              {domain.level}
            </span>
          </div>
        ))}
      </div>

      <ScoreDrivers drivers={evaluation.score_drivers} />

      <ConsistencyChecks checks={evaluation.consistency_checks} />

      <div className="priorities">
        <div className="priorities-intro">
          <h2>Vos priorités</h2>
          <p>
            Choisies à partir de vos réponses les plus faibles, en commençant par les domaines les moins maîtrisés.
            Chaque action indique la réponse qui la justifie et ses références.
          </p>
        </div>
        <ol className="priority-list">
          {evaluation.recommendations.map((rec, i) => (
            <li key={rec.id} className="priority">
              <span className="data priority-rank">{String(i + 1).padStart(2, '0')}</span>
              <div className="priority-body">
                <p className="priority-title">{rec.text}</p>
                <p className="priority-why">{priorityReason(rec)}</p>
                <span className="data priority-meta">
                  {[rec.domain_name, rec.effort ? `effort ${rec.effort.toLowerCase()}` : null].filter(Boolean).join(' · ')}
                </span>
                {sourcesOf(rec) && <span className="data priority-sources">{sourcesOf(rec)}</span>}
              </div>
              <span className="severity" style={{ color: SEVERITY_TONE[rec.severity], borderColor: SEVERITY_TONE[rec.severity] }}>
                {SEVERITY_LABEL[rec.severity]}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {evaluation.job_description_available && (
        <aside className="resource" aria-labelledby="resource-title">
          <div className="resource-copy">
            <span className="label">Ressource · Gouvernance</span>
            <h2 id="resource-title">Désigner un responsable sécurité</h2>
            <p>
              Votre score de gouvernance est inférieur à 50. Un modèle de fiche de poste « RSSI junior » (missions,
              profil, compétences, indicateurs à 12 mois) peut vous aider à confier ce rôle à une personne identifiée.
            </p>
          </div>
          <div className="resource-action">
            <button type="button" className="btn-outline" onClick={handleJobDescription} disabled={jobStatus.kind === 'busy'}>
              {jobStatus.kind === 'busy' ? 'Génération…' : 'Télécharger le modèle de fiche de poste'}
            </button>
            {jobStatus.kind === 'done' && <span className="data feedback-ok">{jobStatus.message}</span>}
            {jobStatus.kind === 'error' && <p className="alert" role="alert">{jobStatus.message}</p>}
          </div>
        </aside>
      )}

      <div className="results-actions">
        <button type="button" className="btn-primary" onClick={handleExport} disabled={exportStatus.kind === 'busy'}>
          {exportStatus.kind === 'busy' ? 'Génération du PDF…' : 'Télécharger le rapport PDF'}
        </button>
        <button type="button" className="btn-outline" onClick={handleBadge} disabled={badgeStatus.kind === 'busy'}>
          {badgeStatus.kind === 'busy' ? 'Génération du badge…' : 'Télécharger le badge (PNG)'}
        </button>
        {!isDemo && (
          <button type="button" className="btn-outline" onClick={handleSave} disabled={saveStatus.kind === 'busy' || isSaved}>
            {saveLabel}
          </button>
        )}
        <div className="results-links">
          {account && (
            <button type="button" className="btn-link" onClick={props.onHistory}>
              Historique des évaluations
            </button>
          )}
          <button type="button" className="btn-link" onClick={props.onRestart}>
            Refaire le test
          </button>
        </div>
      </div>
      <div className="results-feedback" aria-live="polite">
        {exportStatus.kind === 'done' && <span className="data feedback-ok">{exportStatus.message}</span>}
        {badgeStatus.kind === 'done' && <span className="data feedback-ok">{badgeStatus.message}</span>}
        {badgeStatus.kind === 'error' && <p className="alert">{badgeStatus.message}</p>}
        {saveStatus.kind === 'done' && <span className="data feedback-ok">{saveStatus.message}</span>}
        {exportStatus.kind === 'error' && <p className="alert">{exportStatus.message}</p>}
        {saveStatus.kind === 'error' && <p className="alert">{saveStatus.message}</p>}
      </div>
    </section>
  );
}
