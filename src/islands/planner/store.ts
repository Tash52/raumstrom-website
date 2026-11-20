// Planner store (zustand). `projekt` is the versioned, serialisable project model (src/lib/geometry/projekt.ts),
// the contract for planner-design (Phase 5) and planner-export (Phase 6). Everything else here is UI state.
// All project edits go through `aendere` (undo history, room detection, valid selection).
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import {
  type Grundriss,
  type Projekt,
  type Punkt,
  type WandArt,
  WANDDICKE,
  knotenMap,
  ladeVorlage,
  leeresProjekt,
  massstabAusStrecke,
  minus,
  mitRaeumen,
  skaliereProjekt,
} from '../../lib/geometry/index.ts';
import type { GrundrissBild } from './upload/verarbeiten.ts';

export type Werkzeug = 'auswahl' | 'wand' | 'tuer' | 'fenster' | 'massstab';
export type Auswahl = { art: 'wand' | 'oeffnung' | 'raum' | 'knoten'; id: string } | null;
export type Meldung = { text: string; art: 'info' | 'fehler'; nr: number } | null;

export const MAX_VERLAUF = 100;

export interface PlanerZustand {
  projekt: Projekt;
  zurueck: Projekt[];
  vor: Projekt[];
  modus: 'start' | 'editor';
  ansicht: '2d' | '3d';
  werkzeug: Werkzeug;
  auswahl: Auswahl;
  winkelFang: boolean;
  rasterFang: boolean;
  wandArt: WandArt;
  wandDicke: number;
  /** Re-encoded floor plan image (not part of the project JSON). */
  hintergrund: GrundrissBild | null;
  hintergrundSichtbar: boolean;
  /** Calibration points in world coordinates while the tool is active. */
  kalibrierPunkte: Punkt[];
  meldung: Meldung;
  /** Counter that asks the 2D editor to fit the drawing into view. */
  einpassen: number;

  aendere(fn: (p: Projekt) => Projekt, meldung?: string): void;
  /** Replace the project without history entry (live dragging); pair with merke(). */
  ersetze(p: Projekt): void;
  /** Push a snapshot to the undo history (start of a drag). */
  merke(snapshot: Projekt): void;
  rueckgaengig(): void;
  wiederholen(): void;
  setze(teil: Partial<Omit<PlanerZustand, 'projekt' | 'zurueck' | 'vor'>>): void;
  melde(text: string, art?: 'info' | 'fehler'): void;
  starteLeer(): void;
  starteVorlage(id: string): void;
  starteMitBild(bild: GrundrissBild): void;
  kalibriere(laengeMeter: number): boolean;
  neuBeginnen(): void;
}

function auswahlGueltig(p: Projekt, a: Auswahl): Auswahl {
  if (!a) return null;
  const liste = { wand: p.waende, oeffnung: p.oeffnungen, raum: p.raeume, knoten: p.knoten }[a.art];
  return liste.some((x) => x.id === a.id) ? a : null;
}

let meldungNr = 0;

export const planerStore = createStore<PlanerZustand>()((set, get) => ({
  projekt: leeresProjekt(),
  zurueck: [],
  vor: [],
  modus: 'start',
  ansicht: '2d',
  werkzeug: 'wand',
  auswahl: null,
  winkelFang: true,
  rasterFang: true,
  wandArt: 'innen',
  wandDicke: WANDDICKE.innen,
  hintergrund: null,
  hintergrundSichtbar: true,
  kalibrierPunkte: [],
  meldung: null,
  einpassen: 0,

  aendere(fn, meldung) {
    const alt = get().projekt;
    const roh = fn(alt);
    if (roh === alt) return;
    const neu = mitRaeumen(roh, alt);
    set((s) => ({
      projekt: neu,
      zurueck: [...s.zurueck, alt].slice(-MAX_VERLAUF),
      vor: [],
      auswahl: auswahlGueltig(neu, s.auswahl),
      ...(meldung ? { meldung: { text: meldung, art: 'info' as const, nr: ++meldungNr } } : {}),
    }));
  },
  ersetze(p) {
    const neu = mitRaeumen(p, get().projekt);
    set((s) => ({ projekt: neu, auswahl: auswahlGueltig(neu, s.auswahl) }));
  },
  merke(snapshot) {
    set((s) => ({ zurueck: [...s.zurueck, snapshot].slice(-MAX_VERLAUF), vor: [] }));
  },
  rueckgaengig() {
    const { zurueck, projekt, vor } = get();
    const letzter = zurueck.at(-1);
    if (!letzter) return;
    set((s) => ({
      projekt: letzter,
      zurueck: zurueck.slice(0, -1),
      vor: [projekt, ...vor],
      auswahl: auswahlGueltig(letzter, s.auswahl),
      meldung: { text: 'Rückgängig gemacht', art: 'info', nr: ++meldungNr },
    }));
  },
  wiederholen() {
    const { zurueck, projekt, vor } = get();
    const naechster = vor[0];
    if (!naechster) return;
    set((s) => ({
      projekt: naechster,
      zurueck: [...zurueck, projekt],
      vor: vor.slice(1),
      auswahl: auswahlGueltig(naechster, s.auswahl),
      meldung: { text: 'Wiederhergestellt', art: 'info', nr: ++meldungNr },
    }));
  },
  setze(teil) {
    set(teil);
  },
  melde(text, art = 'info') {
    set({ meldung: { text, art, nr: ++meldungNr } });
  },
  starteLeer() {
    set({
      projekt: leeresProjekt(),
      zurueck: [],
      vor: [],
      modus: 'editor',
      ansicht: '2d',
      werkzeug: 'wand',
      auswahl: null,
      hintergrund: null,
      kalibrierPunkte: [],
      wandArt: 'aussen',
      wandDicke: WANDDICKE.aussen,
      einpassen: get().einpassen + 1,
      meldung: { text: 'Leeres Raster geöffnet. Zeichnen Sie die erste Wand.', art: 'info', nr: ++meldungNr },
    });
  },
  starteVorlage(id) {
    const p = ladeVorlage(id);
    if (!p) return;
    set({
      projekt: p,
      zurueck: [],
      vor: [],
      modus: 'editor',
      ansicht: '2d',
      werkzeug: 'auswahl',
      auswahl: null,
      hintergrund: null,
      kalibrierPunkte: [],
      einpassen: get().einpassen + 1,
      meldung: { text: `Vorlage „${p.name}" geladen: ${p.raeume.length} Räume.`, art: 'info', nr: ++meldungNr },
    });
  },
  starteMitBild(bild) {
    // Until calibrated, assume the image spans about 12 m (typical flat); the user calibrates next.
    const meterProPixel = 12 / Math.max(bild.breite, bild.hoehe);
    const grundriss: Grundriss = {
      quelle: bild.quelle,
      breitePx: bild.breite,
      hoehePx: bild.hoehe,
      meterProPixel,
      ursprung: { x: 0, y: 0 },
      deckkraft: 0.6,
      kalibriert: false,
      kalibrierung: null,
      seite: bild.seite,
    };
    set({
      projekt: { ...leeresProjekt(), grundriss },
      zurueck: [],
      vor: [],
      modus: 'editor',
      ansicht: '2d',
      werkzeug: 'massstab',
      auswahl: null,
      hintergrund: bild,
      hintergrundSichtbar: true,
      kalibrierPunkte: [],
      wandArt: 'aussen',
      wandDicke: WANDDICKE.aussen,
      einpassen: get().einpassen + 1,
      meldung: {
        text: 'Grundriss geladen. Legen Sie jetzt den Maßstab fest: zwei Punkte einer bekannten Strecke anklicken.',
        art: 'info',
        nr: ++meldungNr,
      },
    });
  },
  kalibriere(laengeMeter) {
    const { projekt, kalibrierPunkte } = get();
    const g = projekt.grundriss;
    const [a, b] = kalibrierPunkte;
    if (!g || !a || !b) return false;
    const px = (w: Punkt) => {
      const d = minus(w, g.ursprung);
      return { x: d.x / g.meterProPixel, y: d.y / g.meterProPixel };
    };
    const pa = px(a);
    const pb = px(b);
    const r = massstabAusStrecke(pa, pb, laengeMeter);
    if (!r.ok) {
      get().melde(r.fehler, 'fehler');
      return false;
    }
    const faktor = r.meterProPixel / g.meterProPixel;
    get().aendere((p) => {
      // walls drawn before stay on the image: scale them around the image origin
      const q = skaliereProjekt(p, faktor, g.ursprung);
      return { ...q, grundriss: { ...g, meterProPixel: r.meterProPixel, kalibriert: true, kalibrierung: { a: pa, b: pb, laenge: laengeMeter } } };
    }, 'Maßstab festgelegt. Zeichnen Sie jetzt die Wände nach.');
    set({ kalibrierPunkte: [], werkzeug: 'wand', einpassen: get().einpassen + 1 });
    return true;
  },
  neuBeginnen() {
    set({ modus: 'start', ansicht: '2d', auswahl: null, kalibrierPunkte: [], hintergrund: null });
  },
}));

export const usePlaner = <T,>(auswahl: (s: PlanerZustand) => T): T => useStore(planerStore, auswahl);

/** Knotenkarte des aktuellen Projekts (memo per project object). */
const kmCache = new WeakMap<Projekt, ReturnType<typeof knotenMap>>();
export function knotenVon(p: Projekt) {
  let km = kmCache.get(p);
  if (!km) {
    km = knotenMap(p);
    kmCache.set(p, km);
  }
  return km;
}
