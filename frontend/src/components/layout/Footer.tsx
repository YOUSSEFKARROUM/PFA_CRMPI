import { PentaLogo, Wordmark } from './PentaLogo';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="page site-footer-inner">
        <div className="footer-brand">
          <PentaLogo size={20} />
          <Wordmark />
        </div>
        <span className="footer-credit">par CMRPI — Espace Maroc Cyberconfiance</span>
      </div>
    </footer>
  );
}
