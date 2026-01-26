'use client';

import { useEffect } from 'react';

/**
 * Global component to prevent number inputs from changing on scroll
 * Only blocks scroll wheel, allows clicks on arrows and keyboard input
 */
export default function PreventNumberScrollChange() {
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;

      // Check if target is a number input
      if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
        // Prevent scroll when input is focused OR not focused
        // This prevents accidental changes while typing or hovering
        e.preventDefault();
      }
    };

    // Add listener to document with passive: false to allow preventDefault
    document.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      document.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return null; // This component renders nothing
}
