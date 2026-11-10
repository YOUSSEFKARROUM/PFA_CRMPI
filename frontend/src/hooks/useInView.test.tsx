import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { useRef } from 'react';
import { useInView } from './useInView';
import { CountUp } from '../components/common/CountUp';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void;

/** IntersectionObserver factice : le test décide quand l'élément devient visible. */
function stubObserver() {
  const instances: { callback: ObserverCallback; disconnect: ReturnType<typeof vi.fn> }[] = [];
  class FakeObserver {
    disconnect = vi.fn();
    constructor(public callback: ObserverCallback) {
      instances.push(this);
    }
    observe() {}
  }
  vi.stubGlobal('IntersectionObserver', FakeObserver);
  return instances;
}

function Probe() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref);
  return <div ref={ref}>{isInView ? 'visible' : 'caché'}</div>;
}

describe('useInView', () => {
  it('considère l’élément visible quand IntersectionObserver n’existe pas', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { container } = render(<Probe />);
    expect(container.textContent).toBe('visible');
  });

  it('passe à visible à la première intersection puis cesse d’observer', () => {
    const instances = stubObserver();
    const { container } = render(<Probe />);
    expect(container.textContent).toBe('caché');

    act(() => instances[0].callback([{ isIntersecting: false }]));
    expect(container.textContent).toBe('caché');

    act(() => instances[0].callback([{ isIntersecting: true }]));
    expect(container.textContent).toBe('visible');
    expect(instances[0].disconnect).toHaveBeenCalled();
  });
});

describe('CountUp', () => {
  it('expose toujours la valeur finale aux lecteurs d’écran', () => {
    stubObserver();
    const { container } = render(<CountUp value={47} />);
    expect(container.querySelector('.visually-hidden')?.textContent).toBe('47');
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe('0');
  });
});
