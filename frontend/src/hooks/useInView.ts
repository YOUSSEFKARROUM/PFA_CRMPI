import { useEffect, useState, type RefObject } from 'react';

/**
 * Passe à true la première fois que l'élément entre dans le viewport (puis ne revient jamais à false).
 * Sans IntersectionObserver (vieux navigateur, jsdom), l'élément est considéré visible d'emblée.
 */
export function useInView(ref: RefObject<Element | null>, threshold = 0.35): boolean {
  const [isInView, setIsInView] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const element = ref.current;
    if (isInView || !element || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, threshold, isInView]);

  return isInView;
}
