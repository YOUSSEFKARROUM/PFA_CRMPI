import { describe, expect, it } from 'vitest';
import type { DemoProfile, Domain, Questionnaire } from '../api/types';
import {
  INITIAL_STATE, answeredCount, assessmentReducer, currentDomainIndex, isComplete, isStepComplete, stepCount,
  visibleQuestions,
} from './assessment';

function domain(id: string, start: number): Domain {
  return {
    id, name: id, short: id, intro: '',
    questions: [0, 1, 2, 3, 4].map((i) => ({
      id: `q${start + i}`, order: start + i, text: `Question ${start + i}`, guidance: '',
      options: [1, 2, 3, 4, 5].map((v) => ({ value: v, label: `opt ${v}` })),
    })),
  };
}

const QUESTIONNAIRE: Questionnaire = {
  domains: ['gov', 'acc', 'infra', 'inc', 'sens'].map((id, i) => domain(id, i * 5 + 1)),
  recommendation_count: 47,
};

describe('assessmentReducer', () => {
  it('starts on the landing screen in section mode with no answers', () => {
    expect(INITIAL_STATE.screen).toBe('landing');
    expect(INITIAL_STATE.mode).toBe('section');
    expect(INITIAL_STATE.answers).toEqual({});
  });

  it('records an answer without mutating the previous state', () => {
    const before = INITIAL_STATE;
    const after = assessmentReducer(before, { type: 'answer', questionId: 'q1', value: 4 });

    expect(after.answers).toEqual({ q1: 4 });
    expect(before.answers).toEqual({});
  });

  it('switching mode resets the step to the first screen', () => {
    const moved = { ...INITIAL_STATE, step: 3 };
    expect(assessmentReducer(moved, { type: 'setMode', mode: 'question' })).toMatchObject({ mode: 'question', step: 0 });
  });

  it('start opens the questionnaire on its first step and clears demo flag', () => {
    const state = assessmentReducer({ ...INITIAL_STATE, isDemo: true }, { type: 'start' });
    expect(state).toMatchObject({ screen: 'quiz', step: 0, isDemo: false });
  });

  it('next advances, and the last step opens the results', () => {
    const quiz = { ...INITIAL_STATE, screen: 'quiz' as const, step: 3 };
    const step4 = assessmentReducer(quiz, { type: 'next', total: 5 });
    expect(step4.step).toBe(4);
    expect(assessmentReducer(step4, { type: 'next', total: 5 }).screen).toBe('results');
  });

  it('back on the first step returns to the preparation screen', () => {
    const quiz = { ...INITIAL_STATE, screen: 'quiz' as const, step: 0 };
    expect(assessmentReducer(quiz, { type: 'back' }).screen).toBe('start');
    expect(assessmentReducer({ ...quiz, step: 2 }, { type: 'back' }).step).toBe(1);
  });

  it('loading a demo profile shows its results flagged as demo', () => {
    const profile: DemoProfile = {
      key: 'k', name: 'PME Finance', sector: 'Finance', responses: { q1: 3 }, global_score: 44, maturity_level: 'Faible',
    };
    const state = assessmentReducer(INITIAL_STATE, { type: 'loadDemo', profile });

    expect(state).toMatchObject({ screen: 'results', organization: 'PME Finance', sector: 'Finance', isDemo: true });
    expect(state.answers).toEqual({ q1: 3 });
  });

  it('reset keeps the chosen mode but clears answers and identity', () => {
    const filled = { ...INITIAL_STATE, mode: 'question' as const, organization: 'X', answers: { q1: 2 }, screen: 'results' as const };
    expect(assessmentReducer(filled, { type: 'reset' })).toMatchObject({
      mode: 'question', organization: '', answers: {}, screen: 'start',
    });
  });

  it('opening the start screen after a demo begins a fresh assessment', () => {
    const demo = { ...INITIAL_STATE, screen: 'results' as const, isDemo: true, organization: 'PME Finance', answers: { q1: 3 } };
    const state = assessmentReducer(demo, { type: 'openStart', total: 25 });

    expect(state).toMatchObject({ screen: 'start', isDemo: false, organization: '', answers: {} });
  });

  it('opening the start screen after a completed assessment begins a fresh one', () => {
    const answers = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`q${i + 1}`, 3]));
    const done = { ...INITIAL_STATE, screen: 'results' as const, organization: 'Atlas', answers };

    expect(assessmentReducer(done, { type: 'openStart', total: 25 }).answers).toEqual({});
  });

  it('opening the start screen keeps an assessment in progress', () => {
    const inProgress = { ...INITIAL_STATE, screen: 'quiz' as const, organization: 'Atlas', answers: { q1: 2 } };

    expect(assessmentReducer(inProgress, { type: 'openStart', total: 25 })).toMatchObject({
      screen: 'start', organization: 'Atlas', answers: { q1: 2 },
    });
  });

  it('clear forgets everything, including the chosen mode', () => {
    const filled = { ...INITIAL_STATE, mode: 'question' as const, organization: 'X', answers: { q1: 2 }, screen: 'history' as const };
    expect(assessmentReducer(filled, { type: 'clear' })).toEqual(INITIAL_STATE);
  });

  it('isComplete is true only when every question is answered', () => {
    const answers = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`q${i + 1}`, 3]));
    expect(isComplete({ ...INITIAL_STATE, answers }, QUESTIONNAIRE)).toBe(true);
    expect(isComplete({ ...INITIAL_STATE, answers: { q1: 3 } }, QUESTIONNAIRE)).toBe(false);
  });

  it('navigate changes screen only', () => {
    const state = assessmentReducer({ ...INITIAL_STATE, answers: { q1: 1 } }, { type: 'navigate', screen: 'history' });
    expect(state).toMatchObject({ screen: 'history', answers: { q1: 1 } });
  });
});

describe('questionnaire selectors', () => {
  it('counts 5 steps in section mode and 25 in question mode', () => {
    expect(stepCount('section', QUESTIONNAIRE)).toBe(5);
    expect(stepCount('question', QUESTIONNAIRE)).toBe(25);
  });

  it('shows a whole domain per step in section mode', () => {
    const state = { ...INITIAL_STATE, mode: 'section' as const, step: 1 };
    expect(visibleQuestions(state, QUESTIONNAIRE).map((q) => q.id)).toEqual(['q6', 'q7', 'q8', 'q9', 'q10']);
    expect(currentDomainIndex(state, QUESTIONNAIRE)).toBe(1);
  });

  it('shows a single question per step in question mode, with its domain', () => {
    const state = { ...INITIAL_STATE, mode: 'question' as const, step: 12 };
    expect(visibleQuestions(state, QUESTIONNAIRE).map((q) => q.id)).toEqual(['q13']);
    expect(currentDomainIndex(state, QUESTIONNAIRE)).toBe(2);
  });

  it('a step is complete only when every visible question is answered', () => {
    const state = { ...INITIAL_STATE, step: 0, answers: { q1: 1, q2: 2, q3: 3, q4: 4 } };
    expect(isStepComplete(state, QUESTIONNAIRE)).toBe(false);
    expect(isStepComplete({ ...state, answers: { ...state.answers, q5: 5 } }, QUESTIONNAIRE)).toBe(true);
    expect(answeredCount(state)).toBe(4);
  });
});
