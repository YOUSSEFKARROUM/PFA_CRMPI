import { useState, type CSSProperties } from 'react';
import { Check, CircleHelp } from 'lucide-react';
import type { Question } from '../../api/types';
import { ICON_STROKE } from '../common/DomainIcon';

interface QuestionBlockProps {
  question: Question;
  value: number | undefined;
  isLarge: boolean;
  /** Rang dans la cascade d'apparition de l'étape. */
  index?: number;
  onAnswer: (value: number) => void;
}

/**
 * Une question et ses 5 réponses. Les réponses sont de vrais boutons radio natifs
 * (masqués visuellement) : un seul arrêt de tabulation et navigation aux flèches.
 */
export function QuestionBlock({ question, value, isLarge, index = 0, onAnswer }: QuestionBlockProps) {
  const [isGuidanceOpen, setGuidanceOpen] = useState(false);
  const titleId = `${question.id}-title`;
  const guidanceId = `${question.id}-guidance`;

  return (
    <div className="question reveal" data-question={question.id} style={{ '--i': index + 2 } as CSSProperties}>
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
            <CircleHelp size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
            {isGuidanceOpen ? 'Masquer l’aide' : 'Que faut-il comprendre ?'}
          </button>
        )}
        {isGuidanceOpen && (
          <p id={guidanceId} className="guidance reveal">
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
              <span className="choice-top">
                <span className="choice-value">{option.value}</span>
                <span className="choice-scale" aria-hidden="true">
                  {question.options.map((o) => (
                    <i key={o.value} className={o.value <= option.value ? 'is-on' : undefined} />
                  ))}
                </span>
                {value === option.value && (
                  <Check size={14} strokeWidth={2.25} className="choice-check" aria-hidden="true" />
                )}
              </span>
              <span className="choice-label">{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
