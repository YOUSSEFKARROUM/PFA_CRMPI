import { useState, type CSSProperties } from 'react';
import { ArrowRight, Calculator, ClipboardList, ListChecks } from 'lucide-react';
import type { DemoProfile, Questionnaire } from '../../api/types';
import { formatScore, levelTone } from '../../lib/maturity';
import { pentagon } from '../../lib/pentagon';
import { CountUp } from '../common/CountUp';
import { DomainIcon, ICON_STROKE } from '../common/DomainIcon';
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

const order = (i: number) => ({ '--i': i }) as CSSProperties;

/** Marque de score : pentagone dont la surface suit le score global (même règle que le badge PNG). */
function ScoreMark({ score, tone }: { score: number; tone: string }) {
  const ratio = Math.max(0.06, Math.min(score, 100) / 100);
  return (
    <svg className="score-mark" viewBox="0 0 100 100" aria-hidden="true">
      {[0.5, 1].map((ring) => (
        <polygon key={ring} points={pentagon(50, 53, 44 * ring)} className="score-mark-ring" />
      ))}
      <polygon points={pentagon(50, 53, 44 * ratio)} fill={tone} fillOpacity="0.16" stroke={tone} strokeWidth="2.5" />
    </svg>
  );
}

const HOW_ICONS = [ClipboardList, Calculator, ListChecks];

function HowIcon({ index }: { index: number }) {
  const Icon = HOW_ICONS[index];
  return (
    <span className="how-icon" aria-hidden="true">
      <Icon size={22} strokeWidth={ICON_STROKE} />
    </span>
  );
}

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
          <li className="reveal-scroll">
            <HowIcon index={0} />
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
          <li className="reveal-scroll">
            <HowIcon index={1} />
            <div className="how-step">02 / CALCULER</div>
            <h3>Score automatique</h3>
            <p>Un score par domaine et un score global, calculés selon la même formule pour toutes les organisations.</p>
            <div className="how-sample">
              Gouvernance <strong>50 — Moyen</strong>
              <br />
              Sensibilisation <strong className="tone-gold">30 — Faible</strong>
            </div>
          </li>
          <li className="reveal-scroll">
            <HowIcon index={2} />
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
  const [activeDomain, setActiveDomain] = useState<number | null>(null);
  const questionCount = questionnaire.domains.reduce((n, d) => n + d.questions.length, 0);
  const facts = [
    { value: questionCount, label: 'questions à échelle graduée, chacune accompagnée d’un texte d’aide.', source: 'Questionnaire Pentascore' },
    { value: questionnaire.domains.length, label: 'domaines alignés sur ISO/IEC 27001 et le NIST Cybersecurity Framework.', source: 'Guide CMRPI / AUSIM' },
    { value: questionnaire.recommendation_count, label: 'recommandations référencées, sélectionnées selon vos réponses.', source: 'Base de recommandations CMRPI' },
  ];

  return (
    <>
      <section className="page landing-hero surface-grid" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="eyebrow reveal" style={order(0)}>CMRPI · Espace Maroc Cyberconfiance</div>
          <h1 id="hero-title" className="reveal" style={order(1)}>
            Où en est réellement la sécurité numérique <span className="accent">de votre entreprise</span>&nbsp;?
          </h1>
          <p className="hero-lede reveal" style={order(2)}>
            {questionCount} questions, {questionnaire.domains.length} domaines. À la fin&nbsp;: un score de maturité, le
            détail domaine par domaine et deux à trois actions prioritaires. Aucun prérequis technique.
          </p>
          <div className="hero-actions reveal" style={order(3)}>
            <button type="button" className="btn-primary btn-icon btn-arrow" onClick={onStart}>
              Commencer l’évaluation
              <ArrowRight size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />
            </button>
            <a className="btn-outline" href="#demonstration">
              Voir un exemple
            </a>
          </div>
        </div>
        <div className="hero-visual">
          <PentaRadar
            scores={HERO_SCORES}
            isAnimated
            hasTicks
            labels={questionnaire.domains.map((d, i) => ({ name: d.short, value: String(HERO_SCORES[i] ?? '') }))}
            title="Exemple de radar de maturité sur cinq domaines"
          />
          <p className="hero-caption data reveal" style={order(9)}>
            Exemple · profil fictif « PME Finance » · 44/100
          </p>
        </div>
      </section>

      <section className="landing-facts" aria-label="Le questionnaire en chiffres">
        <div className="page facts-grid">
          {facts.map((fact) => (
            <div key={fact.source} className="fact reveal-scroll">
              <CountUp value={fact.value} className="fact-value" />
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
          <div className="domains-visual">
            <PentaRadar
              scores={[60, 60, 60, 60, 60]}
              rings={[0.33, 0.66, 1]}
              labels={questionnaire.domains.map((d) => ({ name: d.short }))}
              activeIndex={activeDomain}
              title="Les cinq domaines évalués"
            />
          </div>
          <ol className="domain-list" onMouseLeave={() => setActiveDomain(null)}>
            {questionnaire.domains.map((domain, i) => (
              <li
                key={domain.id}
                className={activeDomain === i ? 'reveal-scroll is-active' : 'reveal-scroll'}
                onMouseEnter={() => setActiveDomain(i)}
              >
                <span className="domain-num">
                  <DomainIcon domainId={domain.id} size={20} />
                  {String(i + 1).padStart(2, '0')}
                </span>
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
            <button key={profile.key} type="button" className="demo-card reveal-scroll" onClick={() => onDemo(profile)}>
              <ScoreMark score={profile.global_score} tone={levelTone(profile.maturity_level)} />
              <span className="demo-sector">{profile.sector}</span>
              <span className="demo-name">{profile.name}</span>
              <span className="demo-score" style={{ color: levelTone(profile.maturity_level) }}>
                {formatScore(profile.global_score)}/100
              </span>
              <span className="demo-level" style={{ color: levelTone(profile.maturity_level) }}>
                {profile.maturity_level}
              </span>
              <span className="demo-more">
                Voir le détail
                <ArrowRight size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="landing-cta" aria-labelledby="cta-title">
        <svg className="cta-pattern" viewBox="0 0 400 400" aria-hidden="true">
          {[0.25, 0.5, 0.75, 1].map((ring) => (
            <polygon key={ring} points={pentagon(200, 210, 190 * ring)} />
          ))}
        </svg>
        <div className="page cta-inner">
          <span className="eyebrow">Commencer</span>
          <h2 id="cta-title">{questionCount} questions pour savoir où vous en êtes.</h2>
          <button type="button" className="cta-button btn-icon btn-arrow" onClick={onStart}>
            Commencer l’évaluation
            <ArrowRight size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </button>
        </div>
      </section>
    </>
  );
}
