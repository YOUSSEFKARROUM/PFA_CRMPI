import type { DemoProfile, Questionnaire } from '../../api/types';
import { formatScore, levelTone } from '../../lib/maturity';
import { PentaRadar } from '../common/PentaRadar';
import './landing.css';

interface LandingProps {
  questionnaire: Questionnaire;
  demos: DemoProfile[];
  onStart: () => void;
  onDemo: (profile: DemoProfile) => void;
}

/** Forme décorative du héros : scores de domaine du profil fictif « PME Finance ». */
const HERO_SCORES = [50, 55, 35, 50, 30];

function HowItWorks({ questionnaire }: { questionnaire: Questionnaire }) {
  const sample = questionnaire.domains[1]?.questions[1];
  const sampleOption = sample?.options[3];

  return (
    <section id="methode" className="landing-how" aria-labelledby="how-title">
      <div className="page section">
        <div className="section-head">
          <div className="eyebrow">En pratique</div>
          <h2 id="how-title">Trois étapes, aucune installation</h2>
        </div>
        <ol className="how-grid">
          <li>
            <div className="how-step">01 / RÉPONDRE</div>
            <h3>Questionnaire guidé</h3>
            <p>Au choix, par domaine ou question par question. Chaque question est accompagnée d’une explication.</p>
            {sample && sampleOption && (
              <div className="how-sample">
                Q{String(sample.order).padStart(2, '0')} — {questionnaire.domains[1].name}
                <br />
                &gt; <strong>{sampleOption.value} — {sampleOption.label}</strong>
              </div>
            )}
          </li>
          <li>
            <div className="how-step">02 / CALCULER</div>
            <h3>Score automatique</h3>
            <p>Un score par domaine et un score global, calculés selon la même formule pour toutes les organisations.</p>
            <div className="how-sample">
              Gouvernance <strong>50 — Moyen</strong>
              <br />
              Sensibilisation <strong className="tone-gold">30 — Faible</strong>
            </div>
          </li>
          <li>
            <div className="how-step">03 / AGIR</div>
            <h3>Priorités ciblées</h3>
            <p>Deux à trois actions, en commençant par votre domaine le plus faible — pas une liste générique.</p>
            <div className="how-sample">
              <strong className="tone-gold">[Haute]</strong> Dispenser une formation cybersécurité annuelle à tous les
              employés
            </div>
          </li>
        </ol>
      </div>
    </section>
  );
}

export function Landing({ questionnaire, demos, onStart, onDemo }: LandingProps) {
  const questionCount = questionnaire.domains.reduce((n, d) => n + d.questions.length, 0);
  const facts = [
    { value: String(questionCount), label: 'questions à échelle graduée, chacune accompagnée d’un texte d’aide.', source: 'Questionnaire Pentascore' },
    { value: String(questionnaire.domains.length), label: 'domaines alignés sur ISO/IEC 27001 et le NIST Cybersecurity Framework.', source: 'Guide CMRPI / AUSIM' },
    { value: String(questionnaire.recommendation_count), label: 'recommandations référencées, sélectionnées selon vos réponses.', source: 'Base de recommandations CMRPI' },
  ];

  return (
    <>
      <section className="page landing-hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="eyebrow">CMRPI · Espace Maroc Cyberconfiance</div>
          <h1 id="hero-title">
            Où en est réellement la sécurité numérique <span className="accent">de votre entreprise</span>&nbsp;?
          </h1>
          <p className="hero-lede">
            {questionCount} questions, {questionnaire.domains.length} domaines. À la fin&nbsp;: un score de maturité, le
            détail domaine par domaine et deux à trois actions prioritaires. Aucun prérequis technique.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn-primary" onClick={onStart}>
              Commencer l’évaluation
            </button>
            <a className="btn-outline" href="#demonstration">
              Voir un exemple
            </a>
          </div>
        </div>
        <PentaRadar scores={HERO_SCORES} title="Exemple de radar de maturité sur cinq domaines" />
      </section>

      <section className="landing-facts" aria-label="Le questionnaire en chiffres">
        <div className="page facts-grid">
          {facts.map((fact) => (
            <div key={fact.source} className="fact">
              <div className="fact-value">{fact.value}</div>
              <p className="fact-label">{fact.label}</p>
              <div className="fact-source">{fact.source}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="domaines" className="page section" aria-labelledby="domains-title">
        <div className="section-head">
          <div className="eyebrow">La méthode</div>
          <h2 id="domains-title">Cinq domaines, alignés sur les référentiels internationaux</h2>
        </div>
        <div className="domains-grid">
          <PentaRadar
            scores={[60, 60, 60, 60, 60]}
            rings={[0.33, 0.66, 1]}
            labels={questionnaire.domains.map((d) => ({ name: d.short }))}
            title="Les cinq domaines évalués"
          />
          <ol className="domain-list">
            {questionnaire.domains.map((domain, i) => (
              <li key={domain.id}>
                <span className="domain-num">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <span className="domain-name">{domain.name}</span>
                  <p>{domain.intro}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <HowItWorks questionnaire={questionnaire} />

      <section id="demonstration" className="page section" aria-labelledby="demo-title">
        <div className="section-head">
          <div className="eyebrow">Démonstration</div>
          <h2 id="demo-title">Trois profils fictifs, trois résultats différents</h2>
        </div>
        <div className="demo-grid">
          {demos.map((profile) => (
            <button key={profile.key} type="button" className="demo-card" onClick={() => onDemo(profile)}>
              <span className="demo-sector">{profile.sector}</span>
              <span className="demo-name">{profile.name}</span>
              <span className="demo-score" style={{ color: levelTone(profile.maturity_level) }}>
                {formatScore(profile.global_score)}/100
              </span>
              <span className="demo-level" style={{ color: levelTone(profile.maturity_level) }}>
                {profile.maturity_level}
              </span>
              <span className="demo-more">Voir le détail →</span>
            </button>
          ))}
        </div>
      </section>

      <section className="landing-cta" aria-labelledby="cta-title">
        <div className="page cta-inner">
          <span className="eyebrow">Commencer</span>
          <h2 id="cta-title">{questionCount} questions pour savoir où vous en êtes.</h2>
          <button type="button" className="cta-button" onClick={onStart}>
            Commencer l’évaluation
          </button>
        </div>
      </section>
    </>
  );
}
