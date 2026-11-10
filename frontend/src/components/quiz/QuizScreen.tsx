import { useEffect, useRef } from 'react';
import type { Questionnaire } from '../../api/types';
import {
  answeredCount, currentDomainIndex, isDomainComplete, isStepComplete, stepCount, visibleQuestions,
  type AssessmentState,
} from '../../state/assessment';
import { PentaProgress } from './PentaProgress';
import { QuestionBlock } from './QuestionBlock';
import './quiz.css';

interface QuizScreenProps {
  state: AssessmentState;
  questionnaire: Questionnaire;
  onAnswer: (questionId: string, value: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export function QuizScreen({ state, questionnaire, onAnswer, onNext, onBack }: QuizScreenProps) {
  const total = stepCount(state.mode, questionnaire);
  const domainIndex = currentDomainIndex(state, questionnaire);
  const domain = questionnaire.domains[domainIndex];
  const questions = visibleQuestions(state, questionnaire);
  const canContinue = isStepComplete(state, questionnaire);
  const isLast = state.step === total - 1;
  const questionTotal = questionnaire.domains.reduce((n, d) => n + d.questions.length, 0);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // À chaque étape, le focus revient sur le titre : un lecteur d'écran annonce le nouvel écran.
  useEffect(() => {
    titleRef.current?.focus();
  }, [state.step, state.mode]);

  const counter = state.mode === 'section'
    ? `Domaine ${state.step + 1} sur ${total}`
    : `Question ${state.step + 1} sur ${total}`;
  const nextLabel = isLast ? 'Voir mes résultats' : state.mode === 'section' ? 'Domaine suivant' : 'Question suivante';
  const missingHint = state.mode === 'section'
    ? 'Répondez aux questions de ce domaine pour continuer.'
    : 'Choisissez une réponse pour continuer.';

  return (
    <section className="page quiz" aria-labelledby="quiz-title">
      <aside className="quiz-nav">
        <PentaProgress
          domainNames={questionnaire.domains.map((d) => d.name)}
          currentIndex={domainIndex}
          completed={questionnaire.domains.map((_, i) => isDomainComplete(state, questionnaire, i))}
        />
        <div className="quiz-answered data">
          {answeredCount(state)}/{questionTotal} réponses
        </div>
      </aside>

      <div className="quiz-main">
        <header className="quiz-head">
          <span className="quiz-counter data">{counter}</span>
          <h2 id="quiz-title" ref={titleRef} tabIndex={-1}>
            {domain?.name}
          </h2>
          <p className="quiz-intro">{domain?.intro}</p>
        </header>

        <div className="question-list">
          {questions.map((question) => (
            <QuestionBlock
              key={question.id}
              question={question}
              value={state.answers[question.id]}
              isLarge={state.mode === 'question'}
              onAnswer={(value) => onAnswer(question.id, value)}
            />
          ))}
        </div>

        <div className="quiz-actions">
          <button type="button" className="btn-primary" disabled={!canContinue} onClick={onNext}>
            {nextLabel}
          </button>
          <button type="button" className="btn-link" onClick={onBack}>
            {state.step === 0 ? 'Revenir à la préparation' : 'Précédent'}
          </button>
        </div>
        {!canContinue && <p className="quiz-hint">{missingHint}</p>}
      </div>
    </section>
  );
}
