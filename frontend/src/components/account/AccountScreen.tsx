import { useState, type CSSProperties, type FormEvent } from 'react';
import { Eye, EyeOff, History, LoaderCircle, ShieldCheck, TrendingUp } from 'lucide-react';
import { api } from '../../api/client';
import { ICON_STROKE } from '../common/DomainIcon';
import type { Account } from '../../api/types';
import { SECTORS } from '../start/StartScreen';
import './account.css';

type Tab = 'login' | 'register';

interface AccountScreenProps {
  defaultOrganization: string;
  defaultSector: string;
  onAuthenticated: (account: Account) => void;
  onCancel: () => void;
}

const MIN_PASSWORD = 8;

const BENEFITS = [
  { icon: History, text: 'Chaque évaluation enregistrée, datée et comparable.' },
  { icon: TrendingUp, text: 'Votre progression domaine par domaine, d’une évaluation à l’autre.' },
  { icon: ShieldCheck, text: 'Vos données supprimables à tout moment, en un clic (loi 09-08).' },
];

export function AccountScreen({ defaultOrganization, defaultSector, onAuthenticated, onCancel }: AccountScreenProps) {
  const [tab, setTab] = useState<Tab>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organization, setOrganization] = useState(defaultOrganization);
  const [sector, setSector] = useState(defaultSector);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setBusy] = useState(false);
  const [isPasswordVisible, setPasswordVisible] = useState(false);

  const isRegister = tab === 'register';
  const canSubmit = email.length > 0 && password.length >= MIN_PASSWORD && (!isRegister || (consent && organization.trim().length >= 2));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const account = isRegister
        ? await api.register({ email, password, organization, sector: sector || null, consent })
        : await api.login(email, password);
      onAuthenticated(account);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page account" aria-labelledby="account-title">
      <div className="account-intro surface-grid">
        <div className="eyebrow reveal">Mon espace</div>
        <h1 id="account-title" className="reveal" style={{ '--i': 1 } as CSSProperties}>
          Suivre votre maturité dans le temps.
        </h1>
        <p className="lede reveal" style={{ '--i': 2 } as CSSProperties}>
          Un compte permet d’enregistrer vos évaluations et de mesurer votre progression. Il est facultatif : le
          questionnaire, le score et le rapport PDF restent accessibles sans compte.
        </p>
        <ul className="account-benefits">
          {BENEFITS.map(({ icon: Icon, text }, i) => (
            <li key={text} className="reveal" style={{ '--i': i + 3 } as CSSProperties}>
              <span className="benefit-icon" aria-hidden="true">
                <Icon size={18} strokeWidth={ICON_STROKE} />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>

      <form className="account-form reveal" style={{ '--i': 2 } as CSSProperties} onSubmit={handleSubmit} noValidate>
        <div className="account-tabs" role="tablist" data-tab={tab}>
          <button type="button" role="tab" aria-selected={isRegister} onClick={() => setTab('register')}>
            Créer un compte
          </button>
          <button type="button" role="tab" aria-selected={!isRegister} onClick={() => setTab('login')}>
            Se connecter
          </button>
        </div>

        <label className="field">
          <span className="label">Email professionnel</span>
          <input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <div className="field field-password">
          <label className="label" htmlFor="account-password">
            Mot de passe ({MIN_PASSWORD} caractères minimum)
          </label>
          <input
            id="account-password"
            type={isPasswordVisible ? 'text' : 'password'}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
            minLength={MIN_PASSWORD}
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="password-toggle"
            aria-pressed={isPasswordVisible}
            title={isPasswordVisible ? 'Masquer les caractères' : 'Afficher les caractères'}
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            {isPasswordVisible
              ? <EyeOff size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />
              : <Eye size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />}
            <span className="visually-hidden">{isPasswordVisible ? 'Masquer les caractères' : 'Afficher les caractères'}</span>
          </button>
          {isRegister && (
            <span className="password-meter" aria-hidden="true">
              <i style={{ transform: `scaleX(${Math.min(1, password.length / (MIN_PASSWORD * 2))})` }} />
            </span>
          )}
        </div>

        {isRegister && (
          <>
            <label className="field">
              <span className="label">Organisation</span>
              <input type="text" required maxLength={120} value={organization} onChange={(e) => setOrganization(e.target.value)} />
            </label>
            <label className="field">
              <span className="label">Secteur d’activité</span>
              <select value={sector} onChange={(e) => setSector(e.target.value)}>
                <option value="">Non précisé</option>
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="consent">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>
                J’accepte que Pentascore conserve mon email, le nom et le secteur de mon organisation ainsi que mes
                réponses, dans le seul but de constituer mon historique d’évaluations (loi 09-08 relative à la
                protection des données à caractère personnel). Je peux supprimer mon compte et toutes ces données à
                tout moment depuis mon espace.
              </span>
            </label>
          </>
        )}

        {error && <p className="alert" role="alert">{error}</p>}

        <div className="account-actions">
          <button type="submit" className="btn-primary btn-icon" disabled={!canSubmit || isBusy}>
            {isBusy && <LoaderCircle size={18} strokeWidth={ICON_STROKE} className="icon-spin" aria-hidden="true" />}
            {isBusy ? 'Patientez…' : isRegister ? 'Créer mon compte' : 'Se connecter'}
          </button>
          <button type="button" className="btn-link" onClick={onCancel}>
            Retour
          </button>
        </div>
      </form>
    </section>
  );
}
