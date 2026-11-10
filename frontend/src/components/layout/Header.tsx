import type { Account } from '../../api/types';
import { PentaLogo, Wordmark } from './PentaLogo';
import './layout.css';

interface HeaderProps {
  isLanding: boolean;
  stepLabel: string;
  account: Account | null;
  onHome: () => void;
  onStart: () => void;
  onAccount: () => void;
}

export function Header({ isLanding, stepLabel, account, onHome, onStart, onAccount }: HeaderProps) {
  const accountLabel = account ? account.organization : 'Connexion';

  return (
    <header className="site-header">
      <div className="page site-header-inner">
        <button type="button" className="brand" onClick={onHome} aria-label="Pentascore — accueil">
          <PentaLogo size={26} />
          <Wordmark />
        </button>

        {isLanding ? (
          <nav className="site-nav" aria-label="Navigation principale">
            <a href="#domaines">Domaines</a>
            <a href="#methode">Méthode</a>
            <a href="#demonstration">Démonstration</a>
            <button type="button" className="nav-account" onClick={onAccount}>
              {accountLabel}
            </button>
            <button type="button" className="nav-cta" onClick={onStart}>
              Commencer
            </button>
          </nav>
        ) : (
          <div className="site-nav">
            <span className="step-label" aria-live="polite">
              {stepLabel}
            </span>
            <button type="button" className="nav-account" onClick={onAccount}>
              {accountLabel}
            </button>
            <button type="button" className="nav-quit" onClick={onHome}>
              Quitter
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
