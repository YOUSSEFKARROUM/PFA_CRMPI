import type { CSSProperties } from 'react';
import { ArrowRight } from 'lucide-react';
import { ICON_STROKE } from '../common/DomainIcon';
import type { DemoProfile } from '../../api/types';
import { formatScore, levelTone } from '../../lib/maturity';
import type { Mode } from '../../state/assessment';
import './start.css';

export const SECTORS = ['Finance', 'Commerce', 'Technologie', 'Industrie', 'Services', 'Santé', 'Éducation', 'Autre'];

const MODES: { mode: Mode; title: string; detail: string }[] = [
  { mode: 'section', title: 'Par domaine', detail: '5 écrans · le plus rapide' },
  { mode: 'question', title: 'Question par question', detail: '25 écrans · le plus guidé' },
];

interface StartScreenProps {
  organization: string;
  sector: string;
  mode: Mode;
  demos: DemoProfile[];
  onOrganization: (value: string) => void;
  onSector: (value: string) => void;
  onMode: (mode: Mode) => void;
  onStart: () => void;
  onDemo: (profile: DemoProfile) => void;
}

export function StartScreen(props: StartScreenProps) {
  const { organization, sector, mode, demos, onOrganization, onSector, onMode, onStart, onDemo } = props;

  return (
    <section className="page start" aria-labelledby="start-title">
      <div className="start-main">
        <div className="eyebrow reveal">Avant de commencer</div>
        <h1 id="start-title" className="reveal" style={{ '--i': 1 } as CSSProperties}>
          Deux informations, puis vous répondez.
        </h1>
        <p className="lede reveal" style={{ '--i': 2 } as CSSProperties}>
          Elles figurent sur votre rapport PDF. Sans compte, aucune réponse n’est enregistrée sur le serveur.
        </p>

        <div className="start-form reveal" style={{ '--i': 3 } as CSSProperties}>
          <label className="field">
            <span className="label">Organisation (facultatif)</span>
            <input
              type="text"
              value={organization}
              maxLength={120}
              placeholder="Nom de votre entreprise"
              onChange={(e) => onOrganization(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="label">Secteur d’activité</span>
            <select value={sector} onChange={(e) => onSector(e.target.value)}>
              <option value="">Non précisé</option>
              {SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="mode-picker">
            <legend className="label">Déroulé du questionnaire</legend>
            <div className="mode-options">
              {MODES.map((option) => (
                <label key={option.mode} className={`mode-option${mode === option.mode ? ' is-selected' : ''}`}>
                  <input
                    type="radio"
                    className="visually-hidden"
                    name="mode"
                    value={option.mode}
                    checked={mode === option.mode}
                    onChange={() => onMode(option.mode)}
                  />
                  <span className="mode-title">{option.title}</span>
                  <span className="mode-detail">{option.detail}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <button type="button" className="btn-primary btn-icon btn-arrow start-submit" onClick={onStart}>
            Commencer l’évaluation
            <ArrowRight size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </button>
        </div>
      </div>

      <aside className="start-demos reveal" style={{ '--i': 4 } as CSSProperties} aria-labelledby="demos-title">
        <span id="demos-title" className="label">
          Ou charger un profil de démonstration
        </span>
        {demos.map((profile) => (
          <button key={profile.key} type="button" className="demo-row" onClick={() => onDemo(profile)}>
            <span className="demo-row-name">{profile.name}</span>
            <span className="demo-row-score" style={{ color: levelTone(profile.maturity_level) }}>
              {formatScore(profile.global_score)}/100
            </span>
            <span className="demo-row-meta">{profile.sector} · profil fictif</span>
            <span className="demo-row-level" style={{ color: levelTone(profile.maturity_level) }}>
              {profile.maturity_level}
            </span>
          </button>
        ))}
      </aside>
    </section>
  );
}
