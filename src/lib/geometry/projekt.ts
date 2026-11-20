// Project model of the planner (contract for planner-design and planner-export, Phase 5/6).
// Versioned, JSON-serialisable, validated with zod. Pure: no three.js, no DOM.
//
// Units: metres. Plan coordinates: x to the right, y downwards (as on the floor plan image).
// 3D mapping (szene): plan (x, y) -> three.js (x, 0, y), height along +y.
// The background image itself is NOT part of the project (stays in the browser, privacy and size);
// only its placement (`grundriss`) is stored.
import { z } from 'zod';

// No JIT: zod would probe `Function('')` otherwise, which the strict CSP (no 'unsafe-eval') reports as a violation.
z.config({ jitless: true });

export const PROJEKT_VERSION = 1 as const;
export const STANDARD_HOEHE = 2.5;
export const WANDDICKE = { aussen: 0.3, innen: 0.115 } as const;
/** Selectable wall thicknesses in metres (UI presets). */
export const WANDDICKEN = [0.1, 0.115, 0.175, 0.24, 0.3, 0.365] as const;

const id = z.string().regex(/^[a-z]+[0-9]+$/, 'ID-Format: Buchstaben + Zahl, z. B. w12');
const meter = (min: number, max: number) => z.number().min(min).max(max);
const koordinate = z.number().min(-10_000).max(10_000);
const punkt = z.object({ x: koordinate, y: koordinate });

export const knotenSchema = z.object({ id, x: koordinate, y: koordinate });

export const wandSchema = z.object({
  id,
  von: id,
  bis: id,
  dicke: meter(0.02, 1.5),
  art: z.enum(['aussen', 'innen']),
});

export const oeffnungSchema = z.object({
  id,
  wandId: id,
  art: z.enum(['tuer', 'fenster']),
  /** Distance of the opening's centre from the wall's `von` node, metres. */
  abstand: meter(0, 1000),
  breite: meter(0.2, 6),
  hoehe: meter(0.2, 4),
  /** Sill height above the floor (doors: 0). */
  bruestung: meter(0, 3),
  /** Hinge side seen from `von` to `bis` (doors only, informative for 2D symbol and 3D leaf). */
  anschlag: z.enum(['links', 'rechts']),
  /** Swing side: `links` = to the left of the direction von->bis (plan view), `rechts` = right. */
  aufschlag: z.enum(['links', 'rechts']),
});

export const raumSchema = z.object({
  id,
  name: z.string().trim().min(1).max(60),
  /** Corner nodes in order (centre-line polygon, positively oriented). */
  knoten: z.array(id).min(3).max(400),
  /** Room height in metres, null = project standard height. */
  hoehe: meter(1.8, 6).nullable(),
  /** Derived: clear floor area in m² (centre-line polygon minus half the wall thickness). Recomputed on load. */
  flaeche: z.number().min(0),
});

export const grundrissSchema = z.object({
  quelle: z.enum(['bild', 'pdf', 'heic']),
  /** Size of the re-encoded image in pixels (the image itself is not stored). */
  breitePx: z.number().int().min(1).max(20_000),
  hoehePx: z.number().int().min(1).max(20_000),
  /** Scale in metres per image pixel. */
  meterProPixel: z.number().positive().max(10),
  /** World position (metres) of the image's top-left corner. */
  ursprung: punkt,
  deckkraft: z.number().min(0).max(1),
  kalibriert: z.boolean(),
  /** Calibration line in image pixels and its real length in metres. */
  kalibrierung: z.object({ a: punkt, b: punkt, laenge: meter(0.01, 1000) }).nullable(),
  /** Selected PDF page (1-based), null for images. */
  seite: z.number().int().min(1).nullable(),
});

export const projektSchema = z.object({
  version: z.literal(PROJEKT_VERSION),
  name: z.string().trim().max(80),
  /** Template the project started from (vorlagen.ts), null for upload or empty start. */
  vorlage: z.string().max(40).nullable(),
  standardHoehe: meter(2, 6),
  knoten: z.array(knotenSchema).max(2000),
  waende: z.array(wandSchema).max(2000),
  oeffnungen: z.array(oeffnungSchema).max(500),
  raeume: z.array(raumSchema).max(200),
  grundriss: grundrissSchema.nullable(),
});

export type Knoten = z.infer<typeof knotenSchema>;
export type Wand = z.infer<typeof wandSchema>;
export type WandArt = Wand['art'];
export type Oeffnung = z.infer<typeof oeffnungSchema>;
export type OeffnungArt = Oeffnung['art'];
export type Raum = z.infer<typeof raumSchema>;
export type Grundriss = z.infer<typeof grundrissSchema>;
export type Projekt = z.infer<typeof projektSchema>;

export function leeresProjekt(name = 'Mein Projekt'): Projekt {
  return {
    version: PROJEKT_VERSION,
    name,
    vorlage: null,
    standardHoehe: STANDARD_HOEHE,
    knoten: [],
    waende: [],
    oeffnungen: [],
    raeume: [],
    grundriss: null,
  };
}

/** Next free id with the given prefix (k = Knoten, w = Wand, o = Öffnung, r = Raum). */
export function neueId(prefix: string, vorhandene: readonly { id: string }[]): string {
  let max = 0;
  for (const v of vorhandene) {
    if (v.id.startsWith(prefix)) {
      const n = Number(v.id.slice(prefix.length));
      if (Number.isInteger(n) && n > max) max = n;
    }
  }
  return `${prefix}${max + 1}`;
}

/** Referential integrity on top of the schema (unique ids, walls point to nodes …). */
export function pruefeVerweise(p: Projekt): string[] {
  const fehler: string[] = [];
  const knoten = new Set<string>();
  for (const k of p.knoten) {
    if (knoten.has(k.id)) fehler.push(`Knoten ${k.id} doppelt`);
    knoten.add(k.id);
  }
  const waende = new Set<string>();
  for (const w of p.waende) {
    if (waende.has(w.id)) fehler.push(`Wand ${w.id} doppelt`);
    waende.add(w.id);
    if (!knoten.has(w.von) || !knoten.has(w.bis)) fehler.push(`Wand ${w.id} verweist auf unbekannten Knoten`);
    if (w.von === w.bis) fehler.push(`Wand ${w.id} hat Länge 0`);
  }
  const oeff = new Set<string>();
  for (const o of p.oeffnungen) {
    if (oeff.has(o.id)) fehler.push(`Öffnung ${o.id} doppelt`);
    oeff.add(o.id);
    if (!waende.has(o.wandId)) fehler.push(`Öffnung ${o.id} verweist auf unbekannte Wand`);
  }
  const raeume = new Set<string>();
  for (const r of p.raeume) {
    if (raeume.has(r.id)) fehler.push(`Raum ${r.id} doppelt`);
    raeume.add(r.id);
    if (r.knoten.some((k) => !knoten.has(k))) fehler.push(`Raum ${r.id} verweist auf unbekannten Knoten`);
  }
  return fehler;
}

export type LadeErgebnis = { ok: true; projekt: Projekt } | { ok: false; fehler: string[] };

/**
 * Parse a project from JSON text or an object. Older versions would be migrated here
 * (there is only version 1 so far). Derived values are recomputed by the caller (raeume.ts: mitRaeumen).
 */
export function parseProjekt(eingabe: unknown): LadeErgebnis {
  let roh = eingabe;
  if (typeof eingabe === 'string') {
    try {
      roh = JSON.parse(eingabe);
    } catch {
      return { ok: false, fehler: ['Keine gültige JSON-Datei'] };
    }
  }
  const v = (roh as { version?: unknown } | null)?.version;
  if (typeof v === 'number' && v > PROJEKT_VERSION) return { ok: false, fehler: [`Projektversion ${v} ist neuer als dieser Planer (${PROJEKT_VERSION})`] };
  const r = projektSchema.safeParse(roh);
  if (!r.success) return { ok: false, fehler: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
  const verweise = pruefeVerweise(r.data);
  if (verweise.length) return { ok: false, fehler: verweise };
  return { ok: true, projekt: r.data };
}

export const serialisiere = (p: Projekt): string => JSON.stringify(p);

export const knotenMap = (p: Projekt): Map<string, Knoten> => new Map(p.knoten.map((k) => [k.id, k]));
