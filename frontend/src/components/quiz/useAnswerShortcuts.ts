import { useEffect, useRef } from 'react';

interface AnswerShortcuts {
  isEnabled: boolean;
  optionCount: number;
  onAnswer: (value: number) => void;
  onNext: () => void;
}

/** Une touche ne déclenche rien si l'utilisateur tape dans un champ ou utilise un modificateur. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const isField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
  const isRadio = target instanceof HTMLInputElement && target.type === 'radio';
  return target.isContentEditable || (isField && !isRadio);
}

/**
 * Raccourcis du mode « question par question » : touches 1 à N pour répondre, Entrée pour continuer.
 * Les callbacks sont lus via une ref : l'écouteur n'est pas réabonné à chaque rendu.
 */
export function useAnswerShortcuts({ isEnabled, optionCount, onAnswer, onNext }: AnswerShortcuts): void {
  const handlers = useRef({ onAnswer, onNext });

  useEffect(() => {
    handlers.current = { onAnswer, onNext };
  });

  useEffect(() => {
    if (!isEnabled) return undefined;
    const handleKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isTypingTarget(event.target)) return;
      const digit = Number(event.key);
      if (Number.isInteger(digit) && digit >= 1 && digit <= optionCount) {
        event.preventDefault();
        handlers.current.onAnswer(digit);
        return;
      }
      // Entrée sur un bouton garde son comportement natif (activer ce bouton).
      if (event.key === 'Enter' && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        handlers.current.onNext();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isEnabled, optionCount]);
}
