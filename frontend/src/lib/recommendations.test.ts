import { describe, expect, it } from 'vitest';
import type { Recommendation } from '../api/types';
import { formatPoints, priorityReason, sourcesOf } from './recommendations';

const BASE: Recommendation = {
  id: 'rec_acc_003', text: 'Activer le MFA', severity: 'High', domain_id: 'dom_acc', domain_name: 'Accès & Identités',
  reference: 'ISO/IEC 27001:2022 A.8.5', guide_reference: null, effort: 'Moyen',
  trigger: { id: 'q8', number: 8, text: 'MFA ?', value: 1, answer: 'Non' },
};

describe('formatPoints', () => {
  it('writes points lost in French, singular below two', () => {
    expect(formatPoints(4)).toBe('−4 points');
    expect(formatPoints(1)).toBe('−1 point');
    expect(formatPoints(0.5)).toBe('−0,5 point');
    expect(formatPoints(1.5)).toBe('−1,5 point');
  });
});

describe('priority explanations', () => {
  it('quotes the answer that triggers the recommendation', () => {
    expect(priorityReason(BASE)).toBe('Parce que vous avez répondu « Non » à la question 8.');
  });

  it('labels general recommendations as maintenance practices', () => {
    expect(priorityReason({ ...BASE, trigger: null })).toMatch(/quelles que soient vos réponses/);
  });

  it('joins the guide section and the ISO control, skipping what is missing', () => {
    expect(sourcesOf(BASE)).toBe('ISO/IEC 27001:2022 A.8.5');
    expect(sourcesOf({ ...BASE, guide_reference: 'Guide AUSIM-CMRPI 2018, §3.1.4' })).toBe(
      'Guide AUSIM-CMRPI 2018, §3.1.4 · ISO/IEC 27001:2022 A.8.5',
    );
    expect(sourcesOf({ ...BASE, reference: null })).toBe('');
  });
});
