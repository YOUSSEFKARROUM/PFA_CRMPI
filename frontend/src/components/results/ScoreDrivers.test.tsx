import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ScoreDriver } from '../../api/types';
import { ScoreDrivers } from './ScoreDrivers';

afterEach(cleanup);

const DRIVER: ScoreDriver = {
  id: 'q16', number: 16, text: 'Plan de réponse aux incidents ?', value: 1, answer: 'Non',
  domain_id: 'dom_inc', domain_name: 'Incidents & Continuité', points_lost: 4,
};

describe('ScoreDrivers', () => {
  it('renders nothing for a perfect score', () => {
    const { container } = render(<ScoreDrivers drivers={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('lists the costliest answers inside a collapsible panel', () => {
    render(<ScoreDrivers drivers={[DRIVER, { ...DRIVER, id: 'q8', number: 8, points_lost: 1 }]} />);

    expect(screen.getByText('Voir ce qui a le plus pesé sur votre score').tagName).toBe('SUMMARY');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('−4 points')).toBeTruthy();
    expect(screen.getByText('−1 point')).toBeTruthy();
    expect(screen.getByText('Question 16 · Incidents & Continuité')).toBeTruthy();
    expect(screen.getAllByText('Votre réponse : « Non »')).toHaveLength(2);
  });
});
