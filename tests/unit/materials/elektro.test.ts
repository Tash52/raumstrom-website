// Electrical catalogue, installation zones (DIN 18015-3) and the bill of materials per room.
import { describe, expect, it } from 'vitest';
import { type Projekt, fuegeElektroHinzu, mitRaeumen, platziereOeffnung, wandAbschnitte } from '../../../src/lib/geometry/index.ts';
import {
  ELEKTRO_TYPEN,
  STANDARDHOEHEN,
  ZONEN_MASSE,
  elektroGesamt,
  elektroStueckliste,
  elektroTypVon,
  hoeheFuer,
  inZone,
  installationsZonen,
  intervallMinus,
  ortFuer,
} from '../../../src/lib/electro/index.ts';
import { scanText } from '../../../scripts/lib/wording.mjs';
import { AUSSEN, mitWaenden, rechteck } from '../geometry/hilfen.ts';

/** 5 x 4 m room (centre line), outer walls 30 cm: clear 4.7 x 3.7 m. */
function raum(name = 'Wohnzimmer'): Projekt {
  const p = mitWaenden(rechteck(0, 0, 5, 4), AUSSEN);
  return { ...p, raeume: p.raeume.map((r) => ({ ...r, name })) };
}

function setze(p: Projekt, wandIndex: number, typ: string, abstand: number, hoehe: number): Projekt {
  const r = p.raeume[0]!;
  const ab = wandAbschnitte(p, r.id)[wandIndex]!;
  const x = fuegeElektroHinzu(p, { typ, ort: 'wand', wandId: ab.wandId, seite: ab.seite, abstand, hoehe });
  return mitRaeumen(x!.projekt);
}

describe('Elektro-Katalog', () => {
  it('enthält alle Typen aus Briefing 7.2 mit eindeutigen IDs', () => {
    const ids = ELEKTRO_TYPEN.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of [
      'steckdose.1fach', 'steckdose.2fach', 'steckdose.3fach', 'steckdose.usb', 'steckdose.aussen', 'steckdose.herd', 'steckdose.waschmaschine', 'steckdose.boden',
      'schalter.aus', 'schalter.wechsel', 'schalter.kreuz', 'schalter.taster', 'schalter.dimmer', 'schalter.smart', 'schalter.bewegungsmelder',
      'daten.lan-1', 'daten.lan-2', 'daten.tv', 'daten.glasfaser', 'daten.wlan', 'daten.lautsprecher',
      'licht.decke', 'licht.spot', 'licht.wand', 'licht.led', 'licht.aussen',
      'sonst.rauchwarnmelder', 'sonst.thermostat', 'sonst.klingel', 'sonst.wallbox', 'sonst.unterverteilung',
    ])
      expect(elektroTypVon(id), id).toBeDefined();
    for (const t of ELEKTRO_TYPEN) expect(t.id).toMatch(/^[a-z0-9-]+(\.[a-z0-9-]+)*$/);
  });

  it('nennt die Klingel nur als Audio und besteht den Wording-Scan', () => {
    expect(elektroTypVon('sonst.klingel')!.funktion).toContain('nur Audio');
    const text = ELEKTRO_TYPEN.map((t) => `${t.name} ${t.funktion}`).join('\n');
    expect(scanText(text)).toEqual([]);
  });

  it('Standardhöhen: Schalter 1,05 m, Steckdosen 0,30 m, Küche über Arbeitsplatte 1,15 m, editierbar', () => {
    expect(STANDARDHOEHEN.schalter.hoehe).toBe(1.05);
    expect(STANDARDHOEHEN.steckdose.hoehe).toBe(0.3);
    expect(STANDARDHOEHEN.arbeitsplatte.hoehe).toBe(1.15);
    expect(hoeheFuer('schalter.wechsel')).toBe(1.05);
    expect(hoeheFuer('steckdose.2fach', { steckdose: 0.4 })).toBe(0.4);
    expect(hoeheFuer('unbekannt.typ')).toBe(0.3);
  });

  it('ortFuer: Wandtypen an Wänden, Deckentypen im Raum, Bodensteckdose am Boden', () => {
    expect(ortFuer('steckdose.2fach', true)).toBe('wand');
    expect(ortFuer('steckdose.2fach', false)).toBeNull();
    expect(ortFuer('licht.spot', false)).toBe('decke');
    expect(ortFuer('licht.spot', true)).toBeNull();
    expect(ortFuer('daten.lautsprecher', true)).toBe('wand');
    expect(ortFuer('daten.lautsprecher', false)).toBe('decke');
    expect(ortFuer('steckdose.boden', false)).toBe('boden');
  });
});

describe('Installationszonen (DIN 18015-3)', () => {
  it('intervallMinus schneidet Öffnungen heraus', () => {
    expect(intervallMinus([0, 4], [[1, 2]])).toEqual([[0, 1], [2, 4]]);
    expect(intervallMinus([0, 4], [[-1, 5]])).toEqual([]);
    expect(intervallMinus([0, 4], [[3.995, 5]])).toEqual([[0, 3.995]]);
  });

  it('Raum ohne Öffnungen: je Wand ZW-o und ZW-u durchgehend, zwei Eckzonen, keine ZW-m im Wohnzimmer', () => {
    const p = raum();
    const z = installationsZonen(p, p.raeume[0]!.id);
    expect(z.filter((x) => x.art === 'ZW-o')).toHaveLength(4);
    expect(z.filter((x) => x.art === 'ZW-u')).toHaveLength(4);
    expect(z.filter((x) => x.art === 'ZS-e')).toHaveLength(8);
    expect(z.some((x) => x.art === 'ZW-m')).toBe(false);
    const u = z.find((x) => x.art === 'ZW-u')!;
    expect([u.unten, u.oben]).toEqual([ZONEN_MASSE.waagerecht.abstandMin, ZONEN_MASSE.waagerecht.abstandMax]);
    const o = z.find((x) => x.art === 'ZW-o')!;
    expect(o.oben).toBeCloseTo(2.5 - 0.15, 6);
    expect(o.unten).toBeCloseTo(2.5 - 0.45, 6);
    // ZW-u spans the clear wall length (5 m centre line - 2 x 15 cm)
    const laengen = z.filter((x) => x.art === 'ZW-u').map((x) => Math.hypot(x.bis.x - x.von.x, x.bis.y - x.von.y)).sort();
    expect(laengen[0]).toBeCloseTo(3.7, 3);
    expect(laengen[3]).toBeCloseTo(4.7, 3);
  });

  it('Küche bekommt die mittlere Zone ZW-m (90–120 cm)', () => {
    const p = raum('Küche');
    const z = installationsZonen(p, p.raeume[0]!.id);
    const m = z.filter((x) => x.art === 'ZW-m');
    expect(m).toHaveLength(4);
    expect([m[0]!.unten, m[0]!.oben]).toEqual([0.9, 1.2]);
  });

  it('Tür: senkrechte Zonen beidseitig, waagerechte Zonen unten und mittig unterbrochen, oben über der Tür durchgehend', () => {
    let p = raum('Küche');
    const r = platziereOeffnung(p, 'tuer', { x: 2.5, y: 0 }, 0.3);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    p = mitRaeumen(r.projekt);
    const tuer = p.oeffnungen[0]!;
    const z = installationsZonen(p, p.raeume[0]!.id).filter((x) => x.wandId === tuer.wandId);
    expect(z.filter((x) => x.art === 'ZS-t')).toHaveLength(2);
    expect(z.filter((x) => x.art === 'ZW-u')).toHaveLength(2);
    expect(z.filter((x) => x.art === 'ZW-m')).toHaveLength(2);
    // door 2.01 m high, ZW-o starts at 2.05 m: not interrupted
    expect(z.filter((x) => x.art === 'ZW-o')).toHaveLength(1);
    const zst = z.filter((x) => x.art === 'ZS-t').map((x) => Math.hypot(x.bis.x - x.von.x, x.bis.y - x.von.y));
    for (const l of zst) expect(l).toBeCloseTo(0.2, 3);
  });

  it('Fenster mit Brüstung unterbricht ZW-u nicht', () => {
    let p = raum();
    const r = platziereOeffnung(p, 'fenster', { x: 2.5, y: 0 }, 0.3);
    if (!r.ok) throw new Error(r.fehler);
    p = mitRaeumen(r.projekt);
    const f = p.oeffnungen[0]!;
    expect(f.bruestung).toBeGreaterThan(0.45);
    const z = installationsZonen(p, p.raeume[0]!.id).filter((x) => x.wandId === f.wandId);
    expect(z.filter((x) => x.art === 'ZW-u')).toHaveLength(1);
    expect(z.filter((x) => x.art === 'ZS-f')).toHaveLength(2);
  });

  it('inZone: Steckdose auf 30 cm liegt in ZW-u, Schalter mitten in der Wand auf 1,05 m nicht, Schalter 15 cm neben der Ecke schon', () => {
    let p = raum();
    p = setze(p, 0, 'steckdose.2fach', 2.5, 0.3);
    p = setze(p, 0, 'schalter.aus', 2.5, 1.05);
    // first wall section starts at the corner; the centre-line abstand at the clear corner is 0.15 (half wall)
    p = setze(p, 1, 'schalter.aus', 0.15 + 0.15, 1.05);
    const z = installationsZonen(p, p.raeume[0]!.id);
    const [sd, mitte, ecke] = p.elektro;
    expect(inZone(sd!, z)).toBe(true);
    expect(inZone(mitte!, z)).toBe(false);
    expect(inZone(ecke!, z)).toBe(true);
  });
});

describe('Elektro-Stückliste', () => {
  it('zählt je Raum und Typ, sortiert nach Kategorie, markiert Punkte außerhalb der Zonen', () => {
    let p = raum();
    p = setze(p, 0, 'steckdose.2fach', 1, 0.3);
    p = setze(p, 0, 'steckdose.2fach', 3, 0.3);
    p = setze(p, 1, 'schalter.aus', 2, 1.05);
    p = mitRaeumen(fuegeElektroHinzu(p, { typ: 'licht.decke', ort: 'decke', x: 2.5, y: 2 })!.projekt);
    p = mitRaeumen(fuegeElektroHinzu(p, { typ: 'sonst.rauchwarnmelder', ort: 'decke', x: 2, y: 2 })!.projekt);
    const liste = elektroStueckliste(p);
    expect(liste).toHaveLength(1);
    const r = liste[0]!;
    expect(r.raum).toBe('Wohnzimmer');
    expect(r.summe).toBe(5);
    expect(r.posten.map((x) => [x.typ, x.anzahl])).toEqual([
      ['steckdose.2fach', 2],
      ['schalter.aus', 1],
      ['licht.decke', 1],
      ['sonst.rauchwarnmelder', 1],
    ]);
    expect(r.posten.find((x) => x.typ === 'schalter.aus')!.ausserhalbZone).toBe(1);
    expect(r.posten.find((x) => x.typ === 'steckdose.2fach')!.ausserhalbZone).toBe(0);
  });

  it('Punkte außerhalb aller Räume landen in „Außerhalb der Räume"; Gesamtliste summiert', () => {
    let p = raum();
    p = mitRaeumen(fuegeElektroHinzu(p, { typ: 'steckdose.boden', ort: 'boden', x: 2, y: 2 })!.projekt);
    const ab = wandAbschnitte(p, p.raeume[0]!.id)[0]!;
    const aussen = ab.seite === 'links' ? 'rechts' : 'links';
    p = mitRaeumen(fuegeElektroHinzu(p, { typ: 'licht.aussen', ort: 'wand', wandId: ab.wandId, seite: aussen, abstand: 2, hoehe: 2 })!.projekt);
    p = mitRaeumen(fuegeElektroHinzu(p, { typ: 'licht.aussen', ort: 'wand', wandId: ab.wandId, seite: aussen, abstand: 3, hoehe: 2 })!.projekt);
    const liste = elektroStueckliste(p);
    expect(liste.map((x) => x.raum)).toEqual(['Wohnzimmer', 'Außerhalb der Räume']);
    expect(liste[1]!.posten[0]).toMatchObject({ typ: 'licht.aussen', anzahl: 2, ausserhalbZone: 0 });
    const gesamt = elektroGesamt(liste);
    expect(gesamt.map((x) => x.anzahl).reduce((a, b) => a + b, 0)).toBe(3);
  });

  it('leeres Projekt: leere Liste', () => {
    expect(elektroStueckliste(raum())).toEqual([]);
  });
});
