import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { useAnswerShortcuts } from './useAnswerShortcuts';

afterEach(cleanup);

function setup(isEnabled = true) {
  const onAnswer = vi.fn();
  const onNext = vi.fn();
  const hook = renderHook(() => useAnswerShortcuts({ isEnabled, optionCount: 5, onAnswer, onNext }));
  return { onAnswer, onNext, hook };
}

describe('useAnswerShortcuts', () => {
  it('répond avec les touches 1 à 5 et ignore les chiffres hors échelle', () => {
    const { onAnswer } = setup();

    fireEvent.keyDown(window, { key: '3' });
    fireEvent.keyDown(window, { key: '6' });
    fireEvent.keyDown(window, { key: '0' });

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(3);
  });

  it('passe à la suite avec Entrée', () => {
    const { onNext } = setup();
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('ne fait rien quand il est désactivé (mode par domaine)', () => {
    const { onAnswer, onNext } = setup(false);
    fireEvent.keyDown(window, { key: '2' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onAnswer).not.toHaveBeenCalled();
    expect(onNext).not.toHaveBeenCalled();
  });

  it('laisse les combinaisons avec modificateur et la saisie dans un champ au navigateur', () => {
    const { onAnswer } = setup();
    const { getByRole } = render(<input type="text" aria-label="champ" />);

    fireEvent.keyDown(window, { key: '2', ctrlKey: true });
    fireEvent.keyDown(getByRole('textbox'), { key: '2' });

    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('laisse Entrée activer normalement un bouton ciblé', () => {
    const { onNext } = setup();
    const { getByRole } = render(<button type="button">Précédent</button>);
    fireEvent.keyDown(getByRole('button'), { key: 'Enter' });
    expect(onNext).not.toHaveBeenCalled();
  });

  it('retire son écouteur au démontage', () => {
    const { onAnswer, hook } = setup();
    hook.unmount();
    fireEvent.keyDown(window, { key: '1' });
    expect(onAnswer).not.toHaveBeenCalled();
  });
});
