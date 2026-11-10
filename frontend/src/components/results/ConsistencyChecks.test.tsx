import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ConsistencyCheck } from '../../api/types';
import { ConsistencyChecks } from './ConsistencyChecks';

const CHECK: ConsistencyCheck = {
  id: 'CR-01',
  kind: 'declaration',
  title: 'MFA mentionné sur l’annuaire, absent de la question MFA',
  rationale: 'Votre réponse sur la gestion des identités inclut le MFA.',
  reference: 'ISO/IEC 27001:2022 A.8.5',
  questions: [
    { id: 'q6', number: 6, text: 'Gestion des identités ?', value: 4, answer: 'Active Directory + MFA' },
    { id: 'q8', number: 8, text: 'MFA ?', value: 1, answer: 'Non' },
  ],
};

afterEach(cleanup);

describe('ConsistencyChecks', () => {
  it('renders nothing when the answers are consistent', () => {
    const { container } = render(<ConsistencyChecks checks={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('lists each point with both answers, its rationale and its reference', () => {
    render(<ConsistencyChecks checks={[CHECK]} />);

    const section = screen.getByRole('region', { name: 'Points à revérifier' });
    expect(within(section).getByText(/Deux de vos réponses semblent incompatibles/)).toBeTruthy();
    expect(within(section).getByText('Réponses contradictoires · CR-01')).toBeTruthy();
    expect(within(section).getByText('Question 6')).toBeTruthy();
    expect(within(section).getByText('Votre réponse : « Active Directory + MFA »')).toBeTruthy();
    expect(within(section).getByText('Votre réponse : « Non »')).toBeTruthy();
    expect(within(section).getByText('Repère : ISO/IEC 27001:2022 A.8.5')).toBeTruthy();
  });

  it('counts several points and labels missing prerequisites', () => {
    const prerequisite: ConsistencyCheck = { ...CHECK, id: 'CR-12', kind: 'prerequisite' };
    render(<ConsistencyChecks checks={[CHECK, prerequisite]} />);

    expect(screen.getByText(/2 paires de réponses semblent/)).toBeTruthy();
    expect(screen.getByText('Prérequis manquant · CR-12')).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
