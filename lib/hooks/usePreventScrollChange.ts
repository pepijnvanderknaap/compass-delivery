import { useEffect, RefObject } from 'react';

/**
 * Hook to prevent number inputs from changing values on scroll
 * Usage:
 *   const inputRef = useRef<HTMLInputElement>(null);
 *   usePreventScrollChange(inputRef);
 */
export function usePreventScrollChange(ref: RefObject<HTMLInputElement>) {
  useEffect(() => {
    const input = ref.current;
    if (!input) return;

    const handleWheel = (e: WheelEvent) => {
      // Only prevent if the input is not focused
      if (document.activeElement !== input) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    input.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      input.removeEventListener('wheel', handleWheel);
    };
  }, [ref]);
}

/**
 * Global function to disable scroll-to-change on ALL number inputs
 * Call this once in your app layout
 */
export function disableNumberInputScroll() {
  if (typeof window === 'undefined') return;

  // Add event listener to document
  document.addEventListener('wheel', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
      // Only prevent if not focused
      if (document.activeElement !== target) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }, { passive: false });
}
