// Procedural surface images (canvas): tiles and planks in their laying pattern with grout and colour
// variation, wood grain, wallpaper designs, woodchip, fleece, glass fibre, carpet, terrazzo, panels.
// Shared by the tile previews (side panel) and the 3D textures. The image covers exactly one repeat
// cell (`breite` x `hoehe` metres), so it tiles seamlessly with RepeatWrapping.
import type { MaterialRef } from '../../../lib/geometry/index.ts';
import { type Struktur, formatVon, helligkeit, materialVon, mische, musterZelle, zufall } from '../../../lib/materials/index.ts';

export interface OberflaechenBild {
  canvas: HTMLCanvasElement;
  /** Repeat cell in metres. */
  breite: number;
  hoehe: number;
  /** Rotation of the pattern itself (Diagonal, Fischgrät), degrees. */
  drehungGrad: number;
  /** Image contains relief worth using as bump map (woodchip etc.). */
  relief: boolean;
}

type Ctx = CanvasRenderingContext2D;

function leinwand(b: number, h: number): { c: HTMLCanvasElement; ctx: Ctx } {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(b));
  c.height = Math.max(2, Math.round(h));
  return { c, ctx: c.getContext('2d')! };
}

/** Repeat-safe noise: random grid, blurred with wrap-around (value noise substitute). */
function rauschen(ctx: Ctx, b: number, h: number, zelle: number, staerke: number, basis: string, seed: number) {
  const nx = Math.max(2, Math.round(b / zelle));
  const ny = Math.max(2, Math.round(h / zelle));
  ctx.fillStyle = basis;
  ctx.fillRect(0, 0, b, h);
  const sw = b / nx;
  const sh = h / ny;
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const r = zufall(i * 7919 + j * 104729, seed) - 0.5;
      ctx.fillStyle = r > 0 ? `rgba(255,255,255,${(r * staerke).toFixed(3)})` : `rgba(0,0,0,${(-r * staerke).toFixed(3)})`;
      // draw with wrap so the blur below stays seamless
      for (const dx of [-b, 0, b]) for (const dy of [-h, 0, h]) ctx.fillRect(i * sw + dx, j * sh + dy, sw + 0.5, sh + 0.5);
    }
}

function flecken(ctx: Ctx, b: number, h: number, anzahl: number, rMin: number, rMax: number, farben: string[], seed: number) {
  for (let k = 0; k < anzahl; k++) {
    const x = zufall(k, seed) * b;
    const y = zufall(k, seed + 1) * h;
    const r = rMin + zufall(k, seed + 2) * (rMax - rMin);
    ctx.fillStyle = farben[k % farben.length]!;
    for (const dx of [-b, 0, b])
      for (const dy of [-h, 0, h]) {
        if (x + dx + r < 0 || x + dx - r > b || y + dy + r < 0 || y + dy - r > h) continue;
        ctx.beginPath();
        // irregular chip: a slightly squashed, rotated ellipse
        ctx.ellipse(x + dx, y + dy, r, r * (0.55 + 0.45 * zufall(k, seed + 3)), zufall(k, seed + 4) * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
  }
}

function maserung(ctx: Ctx, punkte: Array<{ x: number; y: number }>, richtungGrad: number, farbe: string, s: number, schluessel: number) {
  ctx.save();
  ctx.beginPath();
  punkte.forEach((q, i) => (i ? ctx.lineTo(q.x * s, q.y * s) : ctx.moveTo(q.x * s, q.y * s)));
  ctx.closePath();
  ctx.clip();
  const xs = punkte.map((q) => q.x * s);
  const ys = punkte.map((q) => q.y * s);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const r = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  ctx.translate(cx, cy);
  ctx.rotate((richtungGrad * Math.PI) / 180);
  ctx.strokeStyle = helligkeit(farbe, -0.12);
  ctx.lineWidth = Math.max(0.6, s * 0.0025);
  const linien = 7;
  for (let k = 0; k < linien; k++) {
    const y0 = (zufall(schluessel, k) - 0.5) * r * 0.5;
    const welle = (0.4 + zufall(schluessel, k + 20)) * s * 0.006;
    const phase = zufall(schluessel, k + 40) * 6.28;
    ctx.globalAlpha = 0.25 + 0.35 * zufall(schluessel, k + 60);
    ctx.beginPath();
    for (let x = -r; x <= r; x += Math.max(2, s * 0.02)) {
      const y = y0 + Math.sin(x / (s * 0.12) + phase) * welle;
      if (x === -r) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function verlegt(ref: MaterialRef, pxProM: number, maxPx: number, struktur: Struktur, variation: number, mitMaserung: boolean): OberflaechenBild | null {
  const f = formatVon(ref.format);
  if (!f) return null;
  const z = musterZelle(ref.muster ?? 'kreuzfuge', f, f.laenge < 0.2 ? 0.6 : 0.3, 2.5);
  const s = Math.min(pxProM, maxPx / Math.max(z.breite, z.hoehe));
  const { c, ctx } = leinwand(z.breite * s, z.hoehe * s);
  const sx = c.width / z.breite;
  const sy = c.height / z.hoehe;
  const farbe = ref.farbe ?? '#e8e4dc';
  const fuge = ref.fuge;
  ctx.fillStyle = fuge && fuge.breiteMm > 0 ? fuge.farbe : helligkeit(farbe, -0.25);
  ctx.fillRect(0, 0, c.width, c.height);
  const fugePx = fuge ? (fuge.breiteMm / 1000) * Math.min(sx, sy) : 0;
  for (const st of z.steine) {
    const ton = helligkeit(farbe, (zufall(st.schluessel, 3) - 0.5) * 2 * variation);
    ctx.beginPath();
    st.punkte.forEach((q, i) => (i ? ctx.lineTo(q.x * sx, q.y * sy) : ctx.moveTo(q.x * sx, q.y * sy)));
    ctx.closePath();
    ctx.fillStyle = ton;
    ctx.fill();
    if (mitMaserung) maserung(ctx, st.punkte, st.richtungGrad, ton, Math.min(sx, sy), st.schluessel);
    // the grain changed the current path: rebuild the stone outline for the seam
    ctx.beginPath();
    st.punkte.forEach((q, i) => (i ? ctx.lineTo(q.x * sx, q.y * sy) : ctx.moveTo(q.x * sx, q.y * sy)));
    ctx.closePath();
    if (fugePx > 0) {
      ctx.strokeStyle = fuge!.farbe;
      ctx.lineWidth = Math.max(1, fugePx);
      ctx.stroke();
    } else {
      // planks without visible grout: a fine dark seam
      ctx.strokeStyle = helligkeit(ton, -0.3);
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  if (struktur === 'terrazzo') terrazzoChips(ctx, c.width, c.height, farbe, Math.min(sx, sy));
  return { canvas: c, breite: z.breite, hoehe: z.hoehe, drehungGrad: z.drehungGrad, relief: false };
}

function terrazzoChips(ctx: Ctx, b: number, h: number, farbe: string, s: number) {
  const dunkel = luminanzGrob(farbe) < 0.35;
  const farben = dunkel ? ['#7d7f82', '#a6a29b', '#e8e4dc', '#55575a'] : ['#8e8a83', '#b5aa98', '#6f7350', '#c9b8a2', '#5d6266', '#d7cfc3'];
  const flaeche = (b / s) * (h / s);
  flecken(ctx, b, h, Math.round(flaeche * 900), s * 0.002, s * 0.008, farben, 11);
  flecken(ctx, b, h, Math.round(flaeche * 90), s * 0.008, s * 0.016, farben, 23);
}

function luminanzGrob(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

function tapete(design: string, farbe: string, pxProM: number): OberflaechenBild {
  const m = 0.53; // roll width
  const s = pxProM;
  const { c, ctx } = leinwand(m * s, m * s);
  const b = c.width;
  const h = c.height;
  const akzent = luminanzGrob(farbe) > 0.6 ? helligkeit(farbe, -0.22) : helligkeit(farbe, 0.28);
  const fein = mische(farbe, akzent, 0.5);
  ctx.fillStyle = farbe;
  ctx.fillRect(0, 0, b, h);
  ctx.fillStyle = akzent;
  ctx.strokeStyle = akzent;
  switch (design) {
    case 'rauten': {
      ctx.lineWidth = Math.max(1, s * 0.004);
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.moveTo(k * b, h / 2);
        ctx.lineTo(k * b + b / 2, 0);
        ctx.lineTo(k * b + b, h / 2);
        ctx.lineTo(k * b + b / 2, h);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.fillStyle = fein;
      for (const [x, y] of [[b / 2, h / 2], [0, 0], [b, 0], [0, h], [b, h]] as const) {
        ctx.beginPath();
        ctx.arc(x, y, s * 0.012, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'boegen': {
      ctx.lineWidth = Math.max(1, s * 0.003);
      const r = b / 4;
      for (let reihe = 0; reihe <= 4; reihe++) {
        const y = (reihe * h) / 4;
        const versatz = reihe % 2 ? r : 0;
        for (let k = -1; k <= 4; k++) {
          const x = k * 2 * r + versatz;
          for (const rr of [r, r * 0.7, r * 0.4]) {
            ctx.beginPath();
            ctx.arc(x, y, rr, Math.PI, 0);
            ctx.stroke();
          }
        }
      }
      break;
    }
    case 'punkte': {
      const n = 6;
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
          const x = ((i + (j % 2 ? 0.5 : 0)) * b) / n;
          const y = ((j + 0.5) * h) / n;
          ctx.beginPath();
          ctx.arc(x, y, s * 0.01, 0, Math.PI * 2);
          ctx.fill();
          if (x < s * 0.01) {
            ctx.beginPath();
            ctx.arc(x + b, y, s * 0.01, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      break;
    }
    case 'blaetter': {
      const blatt = (x: number, y: number, w: number, gr: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(w);
        ctx.beginPath();
        ctx.moveTo(0, -gr);
        ctx.quadraticCurveTo(gr * 0.6, 0, 0, gr);
        ctx.quadraticCurveTo(-gr * 0.6, 0, 0, -gr);
        ctx.fill();
        ctx.restore();
      };
      ctx.fillStyle = akzent;
      for (let k = 0; k < 14; k++) {
        const x = zufall(k, 5) * b;
        const y = zufall(k, 6) * h;
        const gr = s * (0.025 + 0.02 * zufall(k, 7));
        for (const dx of [-b, 0, b]) for (const dy of [-h, 0, h]) blatt(x + dx, y + dy, zufall(k, 8) * Math.PI, gr);
      }
      break;
    }
    default: {
      // streifen
      const n = 8;
      for (let i = 0; i < n; i += 2) ctx.fillRect((i * b) / n, 0, b / n, h);
      ctx.fillStyle = fein;
      for (let i = 1; i < n; i += 2) ctx.fillRect(((i + 0.45) * b) / n, 0, b / n / 10, h);
    }
  }
  return { canvas: c, breite: m, hoehe: m, drehungGrad: 0, relief: false };
}

function struktur(art: Struktur, farbe: string, pxProM: number): OberflaechenBild | null {
  switch (art) {
    case 'raufaser':
    case 'strukturvlies': {
      const m = art === 'raufaser' ? 0.5 : 1;
      const { c, ctx } = leinwand(m * pxProM, m * pxProM);
      rauschen(ctx, c.width, c.height, art === 'raufaser' ? 3 : 10, 0.18, farbe, art === 'raufaser' ? 1 : 2);
      const hell = helligkeit(farbe, 0.12);
      const dunkel = helligkeit(farbe, -0.1);
      flecken(ctx, c.width, c.height, art === 'raufaser' ? 900 : 260, pxProM * 0.0015, pxProM * (art === 'raufaser' ? 0.004 : 0.012), [hell, dunkel], 3);
      return { canvas: c, breite: m, hoehe: m, drehungGrad: 0, relief: true };
    }
    case 'glasfaser': {
      const m = 0.25;
      const { c, ctx } = leinwand(m * pxProM, m * pxProM);
      ctx.fillStyle = farbe;
      ctx.fillRect(0, 0, c.width, c.height);
      const n = 10;
      const w = c.width / n;
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
          ctx.fillStyle = (i + j) % 2 ? helligkeit(farbe, -0.07) : helligkeit(farbe, 0.06);
          if ((i + j) % 2) ctx.fillRect(i * w, j * w + w * 0.15, w, w * 0.7);
          else ctx.fillRect(i * w + w * 0.15, j * w, w * 0.7, w);
        }
      return { canvas: c, breite: m, hoehe: m, drehungGrad: 0, relief: true };
    }
    case 'teppich': {
      const m = 0.5;
      const { c, ctx } = leinwand(m * pxProM, m * pxProM);
      rauschen(ctx, c.width, c.height, 2, 0.22, farbe, 7);
      return { canvas: c, breite: m, hoehe: m, drehungGrad: 0, relief: true };
    }
    case 'terrazzo': {
      const m = 0.5;
      const { c, ctx } = leinwand(m * pxProM, m * pxProM);
      ctx.fillStyle = farbe;
      ctx.fillRect(0, 0, c.width, c.height);
      terrazzoChips(ctx, c.width, c.height, farbe, pxProM);
      return { canvas: c, breite: m, hoehe: m, drehungGrad: 0, relief: false };
    }
    case 'akustik': {
      // 27 mm slats with 13 mm dark felt gaps
      const breite = 0.04 * 6;
      const { c, ctx } = leinwand(breite * pxProM, 1 * pxProM);
      ctx.fillStyle = '#2b2a28';
      ctx.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = helligkeit(farbe, (zufall(i, 9) - 0.5) * 0.12);
        ctx.fillRect((i * 0.04 + 0.0065) * pxProM, 0, 0.027 * pxProM, c.height);
      }
      return { canvas: c, breite, hoehe: 1, drehungGrad: 0, relief: false };
    }
    case 'paneel': {
      const b = 0.6;
      const h = 0.8;
      const { c, ctx } = leinwand(b * pxProM, h * pxProM);
      ctx.fillStyle = farbe;
      ctx.fillRect(0, 0, c.width, c.height);
      const rand = 0.08 * pxProM;
      ctx.lineWidth = Math.max(1, pxProM * 0.006);
      ctx.strokeStyle = helligkeit(farbe, -0.14);
      ctx.strokeRect(rand, rand, c.width - 2 * rand, c.height - 2 * rand);
      ctx.strokeStyle = helligkeit(farbe, 0.2);
      ctx.strokeRect(rand + ctx.lineWidth, rand + ctx.lineWidth, c.width - 2 * rand, c.height - 2 * rand);
      return { canvas: c, breite: b, hoehe: h, drehungGrad: 0, relief: false };
    }
    case 'holzleisten': {
      const n = 6;
      const b = 0.12 * n;
      const { c, ctx } = leinwand(b * pxProM, 2.5 * pxProM);
      for (let i = 0; i < n; i++) {
        const ton = helligkeit(farbe, (zufall(i, 4) - 0.5) * 0.14);
        ctx.fillStyle = ton;
        ctx.fillRect(i * 0.12 * pxProM, 0, 0.12 * pxProM, c.height);
        maserung(
          ctx,
          [
            { x: i * 0.12, y: 0 },
            { x: (i + 1) * 0.12, y: 0 },
            { x: (i + 1) * 0.12, y: 2.5 },
            { x: i * 0.12, y: 2.5 },
          ],
          90,
          ton,
          pxProM,
          i * 31,
        );
        ctx.fillStyle = helligkeit(ton, -0.35);
        ctx.fillRect(i * 0.12 * pxProM, 0, Math.max(1, pxProM * 0.003), c.height);
      }
      return { canvas: c, breite: b, hoehe: 2.5, drehungGrad: 0, relief: false };
    }
    case 'gipskarton': {
      const { c, ctx } = leinwand(1.25 * pxProM, 2.5 * pxProM);
      ctx.fillStyle = farbe;
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = helligkeit(farbe, -0.05);
      ctx.fillRect(0, 0, Math.max(1, pxProM * 0.004), c.height);
      return { canvas: c, breite: 1.25, hoehe: 2.5, drehungGrad: 0, relief: false };
    }
    default:
      return null;
  }
}

/**
 * Surface image for a material reference, or null when a plain colour is enough (paint, smooth plaster).
 * `pxProM`: resolution (desktop 256, mobile 128); `maxPx`: longest side limit.
 */
export function zeichneOberflaeche(ref: MaterialRef, pxProM = 256, maxPx = 1024): OberflaechenBild | null {
  const m = materialVon(ref.material);
  if (!m) return null;
  const d = m.darstellung;
  const farbe = ref.farbe ?? m.standard.farbe ?? '#eeeeee';
  if (ref.format && formatVon(ref.format)) return verlegt({ ...ref, farbe }, pxProM, maxPx, d.struktur, d.variation ?? 0, Boolean(d.maserung));
  if (d.struktur === 'tapete') return tapete(ref.muster ?? 'streifen', farbe, pxProM);
  return struktur(d.struktur, farbe, pxProM);
}
