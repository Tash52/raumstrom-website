// UI state of the design modes (Phase 5, planner-design). Project edits never live here: they go through
// planerStore.aendere (undo/redo). This store only holds the current mode, the chosen tiles, the target
// surface and the view options of the 3D view.
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { MaterialRef, Punkt, Seite } from '../../../lib/geometry/index.ts';
import type { HoehenGruppe } from '../../../lib/electro/index.ts';
import type { Stilpaket } from '../../../lib/materials/index.ts';

export type GestaltModus = 'bauen' | 'elektro' | 'waende' | 'boden' | 'fliesen' | 'decke' | 'oeffnungen' | 'einrichtung' | 'ansicht';

export const MODI: ReadonlyArray<{ id: GestaltModus; name: string; taste: string }> = [
  { id: 'bauen', name: 'Bauen', taste: '1' },
  { id: 'elektro', name: 'Elektro', taste: '2' },
  { id: 'waende', name: 'Wände', taste: '3' },
  { id: 'boden', name: 'Boden', taste: '4' },
  { id: 'fliesen', name: 'Fliesen', taste: '5' },
  { id: 'decke', name: 'Decke', taste: '6' },
  { id: 'oeffnungen', name: 'Türen & Fenster', taste: '7' },
  { id: 'einrichtung', name: 'Einrichtung', taste: '8' },
  { id: 'ansicht', name: 'Ansicht', taste: '9' },
];

/** Where a tile is applied: the clicked surface (wall side, floor, ceiling), its room, or all rooms. */
export type Bereich = 'flaeche' | 'raum' | 'wohnung';

export type Ziel =
  | { art: 'wandseite'; wandId: string; seite: Seite; raumId: string | null }
  | { art: 'boden' | 'decke'; raumId: string }
  | { art: 'oeffnung'; id: string }
  | { art: 'elektro'; id: string }
  | { art: 'moebel'; id: string }
  | null;

export type Wahl = Record<'wand' | 'boden' | 'fliesen' | 'decke' | 'sockelleiste', MaterialRef | null>;

export type KameraModus = 'orbit' | 'drauf' | 'rundgang';
export type WandModus = 'voll' | 'niedrig' | 'aus';

export interface GestaltZustand {
  modus: GestaltModus;
  bereich: Bereich;
  ziel: Ziel;
  pipette: boolean;
  wahl: Wahl;
  /** Tiles mode: apply to walls or to the floor when the target is a room. */
  fliesenZiel: 'wand' | 'boden';
  elektroTyp: string;
  /** User-edited standard heights (metres). */
  hoehen: Partial<Record<HoehenGruppe, number>>;
  /** Sockets: place above the kitchen worktop (1.15 m by default). */
  ueberArbeitsplatte: boolean;
  moebelTyp: string;
  zonen: boolean;
  kamera: KameraModus;
  /** Hour of day for the sun (6 to 22). */
  tageszeit: number;
  waende: WandModus;
  masse: boolean;
  /** Counter: the 3D view saves a screenshot when it changes. */
  screenshot: number;
  /** Active style packages from src/content/trends/ (passed in by the page). */
  stilpakete: Stilpaket[];
  /** Plan cursor of the design layer in 2D (keyboard placement). */
  setze(teil: Partial<Omit<GestaltZustand, 'setze' | 'waehle'>>): void;
  waehle(k: keyof Wahl, ref: MaterialRef | null): void;
}

export const gestaltStore = createStore<GestaltZustand>()((set) => ({
  modus: 'bauen',
  bereich: 'flaeche',
  ziel: null,
  pipette: false,
  wahl: { wand: null, boden: null, fliesen: null, decke: null, sockelleiste: null },
  fliesenZiel: 'wand',
  elektroTyp: 'steckdose.2fach',
  hoehen: {},
  ueberArbeitsplatte: false,
  moebelTyp: 'moebel.sofa',
  zonen: false,
  kamera: 'orbit',
  tageszeit: 14,
  waende: 'voll',
  masse: false,
  screenshot: 0,
  stilpakete: [],
  setze(teil) {
    set(teil);
  },
  waehle(k, ref) {
    set((s) => ({ wahl: { ...s.wahl, [k]: ref } }));
  },
}));

export const useGestalt = <T,>(auswahl: (s: GestaltZustand) => T): T => useStore(gestaltStore, auswahl);

/** Input of the touch joystick and keys for the walk-through (read every frame by the 3D view). */
export const rundgangEingabe = { vor: 0, seit: 0, drehen: 0 };

/** Plan point helper type re-export for the 2D layer. */
export type { Punkt };
