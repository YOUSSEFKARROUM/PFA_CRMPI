/**
 * État du parcours d'auto-évaluation : reducer pur et sélecteurs.
 * Chaque transition renvoie un nouvel objet (aucune mutation).
 */
import type { Answers, DemoProfile, Question, Questionnaire } from '../api/types';

export type Screen = 'landing' | 'start' | 'quiz' | 'results' | 'history' | 'account';
export type Mode = 'section' | 'question';

export interface AssessmentState {
  readonly screen: Screen;
  readonly mode: Mode;
  readonly step: number;
  readonly organization: string;
  readonly sector: string;
  readonly answers: Answers;
  /** Résultats d'un profil fictif : jamais enregistrés dans l'historique. */
  readonly isDemo: boolean;
}

export type AssessmentAction =
  | { type: 'navigate'; screen: Screen }
  /** Ouvre l'écran de préparation ; repart de zéro après une démo ou une évaluation terminée. */
  | { type: 'openStart'; total: number }
  | { type: 'setMode'; mode: Mode }
  | { type: 'setOrganization'; value: string }
  | { type: 'setSector'; value: string }
  | { type: 'start' }
  | { type: 'answer'; questionId: string; value: number }
  | { type: 'next'; total: number }
  | { type: 'back' }
  | { type: 'loadDemo'; profile: DemoProfile }
  | { type: 'reset' }
  /** Efface toutes les données du parcours (déconnexion, suppression du compte). */
  | { type: 'clear' };

export const INITIAL_STATE: AssessmentState = {
  screen: 'landing',
  mode: 'section',
  step: 0,
  organization: '',
  sector: '',
  answers: {},
  isDemo: false,
};

export function assessmentReducer(state: AssessmentState, action: AssessmentAction): AssessmentState {
  switch (action.type) {
    case 'navigate':
      return { ...state, screen: action.screen };
    case 'openStart': {
      const isFinished = state.isDemo || Object.keys(state.answers).length >= action.total;
      return isFinished ? { ...INITIAL_STATE, mode: state.mode, screen: 'start' } : { ...state, screen: 'start' };
    }
    case 'setMode':
      return { ...state, mode: action.mode, step: 0 };
    case 'setOrganization':
      return { ...state, organization: action.value };
    case 'setSector':
      return { ...state, sector: action.value };
    case 'start':
      return { ...state, screen: 'quiz', step: 0, isDemo: false };
    case 'answer':
      return { ...state, answers: { ...state.answers, [action.questionId]: action.value } };
    case 'next':
      return state.step >= action.total - 1 ? { ...state, screen: 'results' } : { ...state, step: state.step + 1 };
    case 'back':
      return state.step === 0 ? { ...state, screen: 'start' } : { ...state, step: state.step - 1 };
    case 'loadDemo':
      return {
        ...state,
        screen: 'results',
        organization: action.profile.name,
        sector: action.profile.sector,
        answers: { ...action.profile.responses },
        isDemo: true,
      };
    case 'reset':
      return { ...INITIAL_STATE, mode: state.mode, screen: 'start' };
    case 'clear':
      return INITIAL_STATE;
  }
}

const allQuestions = (questionnaire: Questionnaire): Question[] =>
  questionnaire.domains.flatMap((d) => d.questions);

export function stepCount(mode: Mode, questionnaire: Questionnaire): number {
  return mode === 'section' ? questionnaire.domains.length : allQuestions(questionnaire).length;
}

export function currentDomainIndex(state: AssessmentState, questionnaire: Questionnaire): number {
  if (state.mode === 'section') return state.step;
  const question = allQuestions(questionnaire)[state.step];
  return questionnaire.domains.findIndex((d) => d.questions.some((q) => q.id === question?.id));
}

export function visibleQuestions(state: AssessmentState, questionnaire: Questionnaire): Question[] {
  if (state.mode === 'section') return questionnaire.domains[state.step]?.questions ?? [];
  const question = allQuestions(questionnaire)[state.step];
  return question ? [question] : [];
}

export function isStepComplete(state: AssessmentState, questionnaire: Questionnaire): boolean {
  const questions = visibleQuestions(state, questionnaire);
  return questions.length > 0 && questions.every((q) => typeof state.answers[q.id] === 'number');
}

export function isComplete(state: AssessmentState, questionnaire: Questionnaire): boolean {
  return allQuestions(questionnaire).every((q) => typeof state.answers[q.id] === 'number');
}

export function answeredCount(state: AssessmentState): number {
  return Object.keys(state.answers).length;
}

export function isDomainComplete(state: AssessmentState, questionnaire: Questionnaire, domainIndex: number): boolean {
  const domain = questionnaire.domains[domainIndex];
  return Boolean(domain) && domain.questions.every((q) => typeof state.answers[q.id] === 'number');
}
