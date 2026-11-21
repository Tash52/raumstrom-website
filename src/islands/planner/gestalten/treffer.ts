// Hit of a click/tap in the 3D view or the 2D plan, independent of three.js (shared by both views).
import type { Punkt, Seite } from '../../../lib/geometry/index.ts';

export type Treffer =
  | { art: 'wand'; wandId: string; seite: Seite | null; raumId: string | null; plan: Punkt; hoehe?: number }
  | { art: 'boden' | 'decke'; raumId: string; plan: Punkt }
  | { art: 'tuer' | 'fenster'; id: string; wandId: string; plan: Punkt }
  | { art: 'elektro'; id: string; plan: Punkt }
  | { art: 'moebel'; id: string; plan: Punkt }
  | { art: 'leer'; plan: Punkt };
