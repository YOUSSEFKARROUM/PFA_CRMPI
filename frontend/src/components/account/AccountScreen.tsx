import { useState, type FormEvent } from 'react';
import { api } from '../../api/client';
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

export function AccountScreen({ defaultOrganization, defaultSector, onAuthenticated, onCancel }: AccountScreenProps) {
  const [tab, setTab] = useState<Tab>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organization, setOrganization] = useState(defaultOrganization);
  const [sector, setSector] = useState(defaultSector);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setBusy] = useState(false);

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
      <div className="account-intro">
        <div className="eyebrow">Mon espace</div>
        <h1 id="account-title">Suivre votre maturité dans le temps.</h1>
        <p className="lede">
          Un compte permet d’enregistrer vos évaluations et de mesurer votre progression. Il est facultatif : le
          questionnaire, le score et le rapport PDF restent accessibles sans compte.
        </p>
      </div>

      <form className="account-form" onSubmit={handleSubmit} noValidate>
        <div className="account-tabs" role="tablist">
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
        <label className="field">
          <span className="label">Mot de passe ({MIN_PASSWORD} caractères minimum)</span>
          <input
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
            minLength={MIN_PASSWORD}
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

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
          <button type="submit" className="btn-primary" disabled={!canSubmit || isBusy}>
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
