import { useState, useEffect, useRef, RefObject } from 'react';

interface UseIntersectionLazyLoadOptions {
  rootMargin?: string;
  threshold?: number;
}

/**
 * High-performance hook for lazy loading cards and images as they approach the viewport.
 * Disconnects immediately once the target intersects to save CPU cycles.
 */
export function useIntersectionLazyLoad<T extends HTMLElement = HTMLElement>(
  options: UseIntersectionLazyLoadOptions = {}
): [RefObject<T | null>, boolean] {
  const { rootMargin = '250px 0px 250px 0px', threshold = 0 } = options;
  const elementRef = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    if (isVisible) return;

    const el = elementRef.current;
    if (!el) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [isVisible, rootMargin, threshold]);

  return [elementRef, isVisible];
}
