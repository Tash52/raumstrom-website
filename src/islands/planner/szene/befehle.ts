// View commands for the 3D view (small, in the main planner chunk; the 3D chunk loads lazily).
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

export type AnsichtBefehl = { art: 'drehen' | 'neigen' | 'zoom'; wert: number } | { art: 'draufsicht' | 'schraeg' };

/** Keyboard mapping for the 3D view (used by the wrapper in Planer.tsx). */
export function tasteZuBefehl(e: ReactKeyboardEvent): AnsichtBefehl | null {
  const s = e.shiftKey ? 3 : 1;
  switch (e.key) {
    case 'ArrowLeft':
      return { art: 'drehen', wert: -0.12 * s };
    case 'ArrowRight':
      return { art: 'drehen', wert: 0.12 * s };
    case 'ArrowUp':
      return { art: 'neigen', wert: -0.08 * s };
    case 'ArrowDown':
      return { art: 'neigen', wert: 0.08 * s };
    case '+':
    case '=':
      return { art: 'zoom', wert: 0.85 };
    case '-':
      return { art: 'zoom', wert: 1 / 0.85 };
    case 'd':
    case 'D':
      return { art: 'draufsicht' };
    case '0':
    case 'Home':
      return { art: 'schraeg' };
  }
  return null;
}
