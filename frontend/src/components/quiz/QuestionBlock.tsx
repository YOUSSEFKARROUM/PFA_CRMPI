import { useState } from 'react';
import type { Question } from '../../api/types';

interface QuestionBlockProps {
  question: Question;
  value: number | undefined;
  isLarge: boolean;
  onAnswer: (value: number) => void;
}

/**
 * Une question et ses 5 réponses. Les réponses sont de vrais boutons radio natifs
 * (masqués visuellement) : un seul arrêt de tabulation et navigation aux flèches.
 */
export function QuestionBlock({ question, value, isLarge, onAnswer }: QuestionBlockProps) {
  const [isGuidanceOpen, setGuidanceOpen] = useState(false);
  const titleId = `${question.id}-title`;
  const guidanceId = `${question.id}-guidance`;

  return (
    <div className="question" data-question={question.id}>
      <div className="question-head">
        <span className="question-num">{String(question.order).padStart(2, '0')}</span>
        <p id={titleId} className={`question-text${isLarge ? ' is-large' : ''}`}>
          {question.text}
        </p>
      </div>

      <div className="question-body">
        {question.guidance && (
          <button
            type="button"
            className="guidance-toggle"
            aria-expanded={isGuidanceOpen}
            aria-controls={guidanceId}
            onClick={() => setGuidanceOpen((open) => !open)}
          >
            {isGuidanceOpen ? 'Masquer l’aide' : 'Que faut-il comprendre ?'}
          </button>
        )}
        {isGuidanceOpen && (
          <p id={guidanceId} className="guidance">
            {question.guidance}
          </p>
        )}

        <div className="choices" role="radiogroup" aria-labelledby={titleId}>
          {question.options.map((option) => (
            <label key={option.value} className={`choice${value === option.value ? ' is-selected' : ''}`}>
              <input
                type="radio"
                className="visually-hidden"
                name={question.id}
                value={option.value}
                checked={value === option.value}
                onChange={() => onAnswer(option.value)}
              />
              <span className="choice-value">{option.value}</span>
              <span className="choice-label">{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
