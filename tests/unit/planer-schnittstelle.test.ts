// backend-api: consistency of the planner submit contract (src/components/forms/planer-schnittstelle.ts).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as kontakt from '../../src/components/forms/kontakt-schnittstelle.ts';
import {
  ANHANG,
  CSRF_URL,
  DATEIFELDER,
  FELD,
  LIMITS,
  OBJEKTARTEN,
  PFLICHTFELDER,
  PLANER_ENDPOINT,
  RENDER_ANSICHTEN,
  SIGNATUR,
  TEXTFELDER,
} from '../../src/components/forms/planer-schnittstelle.ts';
import { PROJEKT_VERSION } from '../../src/lib/geometry/index.ts';

const bytes = (s: string) => [...Buffer.from(s, 'latin1')];

describe('planer-schnittstelle', () => {
  it('endpoint and CSRF URL', () => {
    expect(PLANER_ENDPOINT).toBe('/api/planner/submit');
    expect(CSRF_URL).toBe(kontakt.CSRF_URL);
  });

  it('field names equal their keys and are partitioned into text and file fields', () => {
    for (const [k, v] of Object.entries(FELD)) expect(v).toBe(k);
    const alle = [...TEXTFELDER, ...DATEIFELDER];
    expect(new Set(alle).size).toBe(alle.length);
    expect(new Set(alle)).toEqual(new Set(Object.keys(FELD)));
    for (const f of PFLICHTFELDER) expect(Object.keys(FELD)).toContain(f);
    expect(PFLICHTFELDER).not.toContain('website');
    expect(PFLICHTFELDER).not.toContain('fotos');
  });

  it('shared fields behave like the contact form', () => {
    for (const f of ['name', 'email', 'telefon', 'ort', 'altcha', 'csrf', 'website'] as const) expect(FELD[f]).toBe(kontakt.FELD[f]);
    expect(LIMITS.text.nachricht.max).toBe(kontakt.LIMITS.nachrichtMax);
    expect(LIMITS.foto.maxAnzahl).toBe(kontakt.LIMITS.maxDateien);
    expect([...LIMITS.foto.typen]).toEqual([...kontakt.LIMITS.dateiTypen]);
  });

  it('object types', () => {
    expect([...OBJEKTARTEN]).toEqual(['wohnung', 'haus', 'gewerbe']);
  });

  it('render views: four unique ids in a fixed order, attachment names unique', () => {
    expect(RENDER_ANSICHTEN.map((r) => r.id)).toEqual(['iso', 'draufsicht', 'perspektive-1', 'perspektive-2']);
    expect(LIMITS.render.anzahl).toBe(4);
    const namen = RENDER_ANSICHTEN.map((_, i) => ANHANG.render(i));
    expect(new Set(namen).size).toBe(4);
    for (const n of [...namen, ANHANG.modell, ANHANG.projekt, ANHANG.zusammenfassung, ANHANG.foto(0)]) expect(n).toMatch(/^[a-z0-9-]+\.(glb|json|pdf|webp)$/);
  });

  it('project version matches the geometry model', () => {
    expect(LIMITS.projekt.version).toBe(PROJEKT_VERSION);
  });

  it('size limits are consistent with each other and with the adapter body limit', () => {
    expect(LIMITS.maxDateienGesamtBytes).toBeLessThan(LIMITS.maxBodyBytes);
    const pflicht = LIMITS.modell.maxBytes + LIMITS.projekt.maxBytes + LIMITS.zusammenfassung.maxBytes + LIMITS.render.anzahl * LIMITS.render.maxBytes;
    expect(pflicht).toBeLessThanOrEqual(LIMITS.maxDateienGesamtBytes);
    expect(LIMITS.foto.maxBytes).toBeLessThanOrEqual(LIMITS.foto.maxGesamtBytes);
    const config = readFileSync(new URL('../../astro.config.mjs', import.meta.url), 'utf8');
    const m = /bodySizeLimit:\s*(\d+)\s*\*\s*1024\s*\*\s*1024/.exec(config);
    expect(m).not.toBeNull();
    expect(LIMITS.maxBodyBytes).toBeLessThanOrEqual(Number(m![1]) * 1024 * 1024);
  });

  it('signatures', () => {
    expect(SIGNATUR.glb.magic).toEqual(bytes('glTF'));
    expect(SIGNATUR.glb.chunkJson).toBe(Buffer.from('JSON', 'latin1').readUInt32LE(0));
    expect(SIGNATUR.glb.chunkBin).toBe(Buffer.from('BIN\0', 'latin1').readUInt32LE(0));
    expect(SIGNATUR.pdf.magic).toEqual(bytes('%PDF-'));
    expect(SIGNATUR.pdf.ende).toEqual(bytes('%%EOF'));
    expect(SIGNATUR.webp.magic).toEqual(bytes('RIFF'));
    expect(SIGNATUR.webp.magic8).toEqual(bytes('WEBP'));
    expect(SIGNATUR.json.erstesZeichen).toBe('{'.charCodeAt(0));
    for (const s of [...LIMITS.render.signaturen, ...LIMITS.foto.signaturen.filter((x) => x !== 'heic')]) expect(SIGNATUR).toHaveProperty(s);
    expect(LIMITS.render.typen.length).toBe(LIMITS.render.signaturen.length);
    // No vector or script formats anywhere.
    const typen = JSON.stringify(LIMITS);
    expect(typen).not.toMatch(/svg|html|xml/i);
  });

  it('text limits are sane', () => {
    for (const [, l] of Object.entries(LIMITS.text)) expect(l.min).toBeLessThanOrEqual(l.max);
    expect(LIMITS.text.name.min).toBeGreaterThan(0);
    expect(LIMITS.text.ort.min).toBeGreaterThan(0);
    expect(LIMITS.text.nachricht.min).toBe(0);
  });
});
