// Fix round after the Phase 5 acceptance: laying direction in descriptions (Q3), pipette in the tiles
// mode (Q2), quality level of the 3D view (B4).
import { beforeEach, describe, expect, it } from 'vitest';
import { type Projekt, gestalteRaeume } from '../../../src/lib/geometry/index.ts';
import { beschreibeRef, farbName } from '../../../src/lib/materials/index.ts';
import { nimmPipette, refAmZiel } from '../../../src/islands/planner/gestalten/aktionen.ts';
import { gestaltStore } from '../../../src/islands/planner/gestalten/store.ts';
import { planerStore } from '../../../src/islands/planner/store.ts';
import { istLeichtesGeraet } from '../../../src/islands/planner/leistung.ts';
import { AUSSEN, mitWaenden, rechteck } from '../geometry/hilfen.ts';

describe('beschreibeRef: Verlegerichtung (Q3)', () => {
  it('nennt die Richtung, wenn sie vom Standard 0° abweicht', () => {
    const ref = { material: 'boden.parkett', muster: 'fischgraet', format: 'stab', farbe: '#c9ae86' };
    expect(beschreibeRef({ ...ref, richtungGrad: 90 }, farbName)).toBe('Parkett, Fischgrät, Stab 60 × 10 cm, Eiche hell, Verlegerichtung 90°');
    expect(beschreibeRef({ ...ref, richtungGrad: 45 }, farbName)).toContain('Verlegerichtung 45°');
    expect(beschreibeRef({ ...ref, richtungGrad: 0 }, farbName)).not.toContain('Verlegerichtung');
    expect(beschreibeRef({ ...ref, richtungGrad: 360 }, farbName)).not.toContain('Verlegerichtung');
  });
  it('Fliesen: Richtung erscheint, Materialien ohne Richtung nie', () => {
    expect(beschreibeRef({ material: 'fliese.matt', format: '30x60', richtungGrad: 90 })).toContain('Verlegerichtung 90°');
    expect(beschreibeRef({ material: 'farbe.matt', richtungGrad: 90 })).not.toContain('Verlegerichtung');
  });
});

describe('Pipette im Modus Fliesen (Q2)', () => {
  const boden = { material: 'fliese.beton', format: '60x60', muster: 'kreuzfuge', farbe: '#a8a59f' };
  const wand = { material: 'fliese.glaenzend', format: '30x60', muster: 'halbverband', farbe: '#f2f0eb', fliesenhoehe: 'halbhoch' as const };
  let p: Projekt;
  let raumId: string;

  beforeEach(() => {
    const roh = mitWaenden(rechteck(0, 0, 3, 2.5), AUSSEN);
    raumId = roh.raeume[0]!.id;
    p = gestalteRaeume(roh, [raumId], { boden, fliesen: wand });
    planerStore.setState({ projekt: p });
    gestaltStore.setState({ modus: 'fliesen', wahl: { wand: null, boden: null, fliesen: null, decke: null, sockelleiste: null } });
  });

  it('refAmZiel liest bei „Wände" die Wandfliesen des Raums, bei „Boden" den Boden', () => {
    expect(refAmZiel({ art: 'boden', raumId }, 'fliesen', p, 'wand')?.material).toBe('fliese.glaenzend');
    expect(refAmZiel({ art: 'boden', raumId }, 'fliesen', p, 'boden')?.material).toBe('fliese.beton');
  });

  it('nimmPipette folgt der Auswahl „Fliesen für"', () => {
    gestaltStore.setState({ fliesenZiel: 'wand' });
    expect(nimmPipette({ art: 'boden', raumId })).toBe(true);
    expect(gestaltStore.getState().wahl.fliesen?.material).toBe('fliese.glaenzend');
    expect(gestaltStore.getState().wahl.fliesen?.fliesenhoehe).toBe('halbhoch');

    gestaltStore.setState({ fliesenZiel: 'boden' });
    expect(nimmPipette({ art: 'boden', raumId })).toBe(true);
    expect(gestaltStore.getState().wahl.fliesen?.material).toBe('fliese.beton');
  });
});

describe('Leistungsstufe der 3D-Ansicht (B4)', () => {
  const desktop = { webgl: true, softwareRenderer: false, schmal: false, nurTouch: false };
  it('4 Kerne mit genug Speicher gelten nicht mehr als leicht', () => {
    expect(istLeichtesGeraet({ ...desktop, kerne: 4, speicherGb: 8 })).toBe(false);
    expect(istLeichtesGeraet({ ...desktop, kerne: 4 })).toBe(false);
  });
  it('leicht bei fehlendem WebGL, Software-Renderer, Mobil/Touch, wenig Speicher oder höchstens 2 Kernen', () => {
    expect(istLeichtesGeraet({ ...desktop, webgl: false })).toBe(true);
    expect(istLeichtesGeraet({ ...desktop, softwareRenderer: true, kerne: 16 })).toBe(true);
    expect(istLeichtesGeraet({ ...desktop, schmal: true })).toBe(true);
    expect(istLeichtesGeraet({ ...desktop, nurTouch: true, kerne: 8 })).toBe(true);
    expect(istLeichtesGeraet({ ...desktop, kerne: 8, speicherGb: 4 })).toBe(true);
    expect(istLeichtesGeraet({ ...desktop, kerne: 2, speicherGb: 8 })).toBe(true);
  });
});
