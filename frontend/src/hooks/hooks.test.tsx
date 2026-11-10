import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import type { Evaluation, Questionnaire } from '../api/types';
import { downloadBlob } from '../lib/download';
import { useBootstrap } from './useBootstrap';
import { useEvaluation } from './useEvaluation';
import { useProgress } from './useProgress';

const QUESTIONNAIRE: Questionnaire = { domains: [], recommendation_count: 47 };
// Identité stable : comme dans l'app, où les réponses viennent du reducer.
const ANSWERS = { q1: 3 };
const NO_ANSWERS = {};
const EVALUATION: Evaluation = {
  global_score: 50, maturity_level: 'Moyen', domains: [], recommendations: [], job_description_available: false, consistency_checks: [], score_drivers: [],
};

function setReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: reduce }));
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useBootstrap', () => {
  it('loads questionnaire, demos and session in parallel', async () => {
    vi.spyOn(api, 'questionnaire').mockResolvedValue(QUESTIONNAIRE);
    vi.spyOn(api, 'demoProfiles').mockResolvedValue([]);
    vi.spyOn(api, 'me').mockResolvedValue(null);

    const { result } = renderHook(() => useBootstrap());

    await waitFor(() => expect(result.current.questionnaire).toEqual(QUESTIONNAIRE));
    expect(result.current.account).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('exposes the error and recovers on retry', async () => {
    const questionnaire = vi.spyOn(api, 'questionnaire')
      .mockRejectedValueOnce(new Error('Le serveur est injoignable.'))
      .mockResolvedValueOnce(QUESTIONNAIRE);
    vi.spyOn(api, 'demoProfiles').mockResolvedValue([]);
    vi.spyOn(api, 'me').mockResolvedValue(null);

    const { result } = renderHook(() => useBootstrap());
    await waitFor(() => expect(result.current.error).toBe('Le serveur est injoignable.'));

    act(() => result.current.retry());

    await waitFor(() => expect(result.current.questionnaire).toEqual(QUESTIONNAIRE));
    expect(questionnaire).toHaveBeenCalledTimes(2);
  });
});

describe('useEvaluation', () => {
  it('does not call the API while disabled', () => {
    const score = vi.spyOn(api, 'score');
    renderHook(() => useEvaluation(ANSWERS, false));
    expect(score).not.toHaveBeenCalled();
  });

  it('returns the server evaluation once enabled', async () => {
    vi.spyOn(api, 'score').mockResolvedValue(EVALUATION);
    const { result } = renderHook(() => useEvaluation(ANSWERS, true));
    await waitFor(() => expect(result.current.evaluation).toEqual(EVALUATION));
  });

  it('never returns an evaluation computed for previous answers', async () => {
    vi.spyOn(api, 'score').mockResolvedValueOnce(EVALUATION).mockReturnValueOnce(new Promise(() => undefined));
    const { result, rerender } = renderHook(({ answers }) => useEvaluation(answers, true), {
      initialProps: { answers: ANSWERS as Record<string, number> },
    });
    await waitFor(() => expect(result.current.evaluation).toEqual(EVALUATION));

    rerender({ answers: NO_ANSWERS });

    expect(result.current.evaluation).toBeNull();
  });

  it('reports a scoring error', async () => {
    vi.spyOn(api, 'score').mockRejectedValue(new Error('Réponses manquantes'));
    const { result } = renderHook(() => useEvaluation(NO_ANSWERS, true));
    await waitFor(() => expect(result.current.error).toBe('Réponses manquantes'));
  });
});

describe('useProgress', () => {
  it('jumps straight to 1 when reduced motion is requested', () => {
    setReducedMotion(true);
    const { result } = renderHook(() => useProgress('k'));
    expect(result.current).toBe(1);
  });

  it('animates from 0 to 1', async () => {
    setReducedMotion(false);
    const { result } = renderHook(() => useProgress('k', 30));
    expect(result.current).toBeLessThan(1);
    await waitFor(() => expect(result.current).toBe(1));
  });
});

describe('downloadBlob', () => {
  it('clicks a temporary link pointing to an object URL', () => {
    // jsdom n'implémente pas les object URLs : on les fournit sans remplacer l'objet URL global.
    Object.assign(URL, { createObjectURL: vi.fn().mockReturnValue('blob:pdf'), revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    downloadBlob(new Blob(['%PDF']), 'rapport.pdf');

    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a[download]')).toBeNull();
  });
});
