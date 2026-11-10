import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { DOMAIN_ICONS, DomainIcon } from './DomainIcon';
import { PentaRadar } from './PentaRadar';

afterEach(cleanup);

const SCORES = [50, 55, 35, 50, 30];

describe('DomainIcon', () => {
  it('donne une icône à chacun des cinq domaines du questionnaire', () => {
    expect(Object.keys(DOMAIN_ICONS).sort()).toEqual(['dom_acc', 'dom_gov', 'dom_inc', 'dom_infra', 'dom_sens']);
  });

  it('est décorative (masquée aux lecteurs d’écran) et tolère un domaine inconnu', () => {
    const { container } = render(<DomainIcon domainId="dom_inconnu" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('PentaRadar', () => {
  it('reste statique par défaut : ni tracé animé, ni graduations', () => {
    const { container } = render(<PentaRadar scores={SCORES} title="Radar" />);
    expect(container.querySelector('.penta-radar--animated')).toBeNull();
    expect(container.querySelectorAll('.radar-ring--draw')).toHaveLength(0);
    expect(container.querySelectorAll('.radar-tick')).toHaveLength(0);
  });

  it('anime la grille et ajoute 9 graduations par axe pour la révélation du résultat', () => {
    const { container } = render(<PentaRadar scores={SCORES} title="Radar" isAnimated hasTicks />);
    expect(container.querySelector('.penta-radar--animated')).toBeTruthy();
    // 4 anneaux + 5 axes tracés progressivement.
    expect(container.querySelectorAll('.radar-ring--draw')).toHaveLength(9);
    expect(container.querySelectorAll('.radar-tick')).toHaveLength(45);
  });

  it('garde son titre accessible et un sommet par domaine', () => {
    const { container } = render(<PentaRadar scores={SCORES} title="Radar des scores" />);
    expect(container.querySelector('figure')?.getAttribute('aria-label')).toBe('Radar des scores');
    expect(container.querySelectorAll('.radar-dot')).toHaveLength(5);
  });
});
