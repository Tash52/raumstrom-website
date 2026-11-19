// motion-3d: pure parts of the hero model and the FPS check, plus static guarantees of the motion code.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { FENSTER, P_START, STUFEN, aktiveStufe, fortschrittAusScroll, heroZustand, mauerwerk, naeheZumKabel } from '../../src/islands/hero/wand.ts';
import { fpsWaechter } from '../../src/lib/motion/fps.ts';

describe('Hero-Modell „Hinter der Wand"', () => {
  it('Stufen öffnen in der Reihenfolge Farbe → Putz → Mauerwerk → Leitung → Dose', () => {
    const starts = STUFEN.map((s) => FENSTER[s][0]);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
    expect(heroZustand(0)).toEqual({ farbe: 0, putz: 0, mauerwerk: 0, leitung: 0, dose: 0 });
    expect(heroZustand(1)).toEqual({ farbe: 1, putz: 1, mauerwerk: 1, leitung: 1, dose: 1 });
  });

  it('Zustand ist monoton im Fortschritt', () => {
    let vorher = heroZustand(0);
    for (let p = 0.01; p <= 1; p += 0.01) {
      const z = heroZustand(p);
      for (const s of STUFEN) expect(z[s]).toBeGreaterThanOrEqual(vorher[s]);
      vorher = z;
    }
  });

  it('Scroll 0 entspricht dem Poster-Zustand, Ende = Dose an', () => {
    expect(fortschrittAusScroll(0)).toBe(P_START);
    expect(fortschrittAusScroll(-5)).toBe(P_START);
    expect(fortschrittAusScroll(1)).toBe(1);
    expect(heroZustand(P_START).leitung).toBeGreaterThan(0); // the poster already shows live cable
    expect(heroZustand(P_START).dose).toBe(0);
    expect(STUFEN[aktiveStufe(1)]).toBe('dose');
  });

  it('Mauerwerk: Schlitz nur entlang der Leitung, Rest bleibt stehen', () => {
    for (const dichte of ['voll', 'leicht'] as const) {
      const steine = mauerwerk(dichte);
      const schlitz = steine.filter((s) => s.schlitz);
      expect(schlitz.length).toBeGreaterThan(5);
      expect(schlitz.length).toBeLessThan(steine.length * 0.4);
      for (const s of schlitz) expect(s.reihenfolge).toBeGreaterThanOrEqual(0);
    }
    expect(mauerwerk('leicht').length).toBeLessThan(mauerwerk('voll').length);
    expect(naeheZumKabel(-0.65, 0).d).toBeCloseTo(0, 5);
  });
});

describe('FPS-Prüfung', () => {
  const lauf = (msProFrame: number, frames = 400) => {
    const w = fpsWaechter({ aufwaermen: 5, fenster: 30 });
    const urteile: string[] = [];
    for (let i = 0, t = 0; i < frames; i++, t += msProFrame) {
      const u = w.frame(t);
      if (u) urteile.push(u);
    }
    return urteile;
  };
  it('60 fps: gut', () => expect(lauf(16.7)).toEqual(['gut']));
  it('15 fps: erst Auflösung senken, dann aufgeben', () => expect(lauf(66)).toEqual(['aufloesung-senken', 'aufgeben']));
  it('30 fps: senken, danach akzeptiert', () => expect(lauf(33)).toEqual(['aufloesung-senken', 'gut']));
  it('Pausen (> 250 ms) zählen nicht als Renderzeit', () => {
    const w = fpsWaechter({ aufwaermen: 2, fenster: 10 });
    const u: (string | null)[] = [];
    let t = 0;
    for (let i = 0; i < 40; i++) {
      t += i % 5 === 0 ? 2000 : 16;
      u.push(w.frame(t));
    }
    expect(u.filter(Boolean)).toEqual(['gut']);
  });
});

function dateien(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? dateien(p) : [p];
  });
}

describe('Motion-Code: CSP- und Asset-Regeln', () => {
  const quellen = [...dateien('src/lib/motion'), ...dateien('src/islands/hero'), ...dateien('src/islands/journey')].filter((f) =>
    /\.(ts|tsx|css)$/.test(f),
  );

  it('keine Fremd-URLs, keine Daten-URIs, kein eval, kein setAttribute("style")', () => {
    for (const f of quellen) {
      const s = readFileSync(f, 'utf8');
      expect(s, f).not.toMatch(/https?:\/\//);
      expect(s, f).not.toMatch(/data:(image|font|application)/);
      expect(s, f).not.toMatch(/\beval\(|new Function\(/);
      expect(s, f).not.toMatch(/setAttribute\(\s*['"]style/);
    }
  });

  it('kein drei-Paket mit CDN-Presets (drei Environment preset, Decoder-URLs) im Einsatz', () => {
    for (const f of quellen) expect(readFileSync(f, 'utf8'), f).not.toMatch(/@react-three\/drei|preset=|gstatic/);
  });

  it('Poster-Standbilder vorhanden und im erwarteten Format', async () => {
    const hero = await sharp('src/islands/hero/poster/hero-start.png').metadata();
    const komplett = await sharp('src/islands/hero/poster/hero-komplett.png').metadata();
    expect(hero.width! / hero.height!).toBeCloseTo(4 / 3, 1);
    expect(komplett.width).toBe(hero.width);
    expect(hero.width).toBeGreaterThanOrEqual(1152);
    for (const i of [0, 1, 2]) {
      const j = await sharp(`src/islands/journey/poster/journey-${i}.png`).metadata();
      expect(j.width).toBe(j.height);
      expect(j.width).toBeGreaterThanOrEqual(960);
    }
  });
});
