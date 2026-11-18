// Marker syntax for texts that contain company data (legal texts; defined by legal-compliance,
// docs/agent-reports/2-legal-compliance.md §2). Pure functions, no astro:content import.
//
//   {{firma.<pfad>}}                 value from firma.yaml, e.g. {{firma.kontakt.email}}
//   {{firma.gesellschafter.*.name}}  list: "A, B und C"
//   {{firma.vertretungsberechtigte}} names of all gesellschafter with vertretungsberechtigt: true
//   <!-- wenn firma.<pfad> --> … <!-- /wenn -->      kept if non-empty string (also placeholder) or true
//   <!-- wenn features.<flag> --> … <!-- /wenn -->   no nesting
// All other HTML comments are removed from the output. Unknown paths throw (= build fails).
import type { Features, Firma } from '../schemas/index.ts';
import { isPlaceholder } from '../schemas/shared.ts';

export interface MarkerKontext {
  firma: Firma;
  features: Features;
}

export interface RenderOptionen {
  /** Turn e-mail, phone and *_url values into links (default true). */
  links?: boolean;
}

export const BLOCK_RE = /<!-- wenn ([\w.]+) -->([\s\S]*?)<!-- \/wenn -->/g;
const VALUE_RE = /\{\{\s*([\w.*]+)\s*\}\}/g;
const COMMENT_RE = /<!--[\s\S]*?-->/g;

export class MarkerFehler extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MarkerFehler';
  }
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** "A", "A und B", "A, B und C" */
export function aufzaehlung(namen: string[]): string {
  if (namen.length <= 1) return namen[0] ?? '';
  return `${namen.slice(0, -1).join(', ')} und ${namen[namen.length - 1]}`;
}

function walk(root: unknown, segments: string[], marker: string): unknown {
  let cur: unknown = root;
  for (const seg of segments) {
    if (cur === null || typeof cur !== 'object' || Array.isArray(cur) || !(seg in cur)) {
      throw new MarkerFehler(`Unbekannter Pfad in Marker "${marker}"`);
    }
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

/** Resolves `firma.x.y` / `features.z` to its raw value; throws on unknown roots or paths. */
export function resolvePfad(pfad: string, ctx: MarkerKontext): unknown {
  const [root, ...rest] = pfad.split('.');
  if (root === 'firma') {
    if (rest.length === 1 && rest[0] === 'vertretungsberechtigte') {
      return aufzaehlung(ctx.firma.gesellschafter.filter((g) => g.vertretungsberechtigt).map((g) => g.name));
    }
    const star = rest.indexOf('*');
    if (star >= 0) {
      const list = walk(ctx.firma, rest.slice(0, star), pfad);
      if (!Array.isArray(list) || rest.indexOf('*', star + 1) >= 0) throw new MarkerFehler(`"*" nur nach einer Liste erlaubt: "${pfad}"`);
      return list.map((item) => {
        const v = walk(item, rest.slice(star + 1), pfad);
        if (typeof v !== 'string') throw new MarkerFehler(`Marker "${pfad}" ergibt keinen Text`);
        return v;
      });
    }
    return walk(ctx.firma, rest, pfad);
  }
  if (root === 'features' && rest.length === 1) return walk(ctx.features, rest, pfad);
  throw new MarkerFehler(`Unbekannter Marker-Bereich in "${pfad}" (erlaubt: firma.…, features.<flag>)`);
}

/** Condition of a `<!-- wenn … -->` block. */
export function bedingungErfuellt(pfad: string, ctx: MarkerKontext): boolean {
  const v = resolvePfad(pfad, ctx);
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  throw new MarkerFehler(`Bedingung "${pfad}" ist weder Text noch Ja/Nein`);
}

/**
 * Applies conditional blocks only (shared with the launch check).
 * Returns the text and the removed character ranges.
 */
export function wendeBloeckeAn(text: string, ctx: MarkerKontext): { text: string; entfernt: Array<[number, number]> } {
  const entfernt: Array<[number, number]> = [];
  const out = text.replace(BLOCK_RE, (whole, pfad: string, inner: string, offset: number) => {
    if (inner.includes('<!-- wenn ')) throw new MarkerFehler(`Verschachtelte Bedingung in "${pfad}" (nicht erlaubt)`);
    if (bedingungErfuellt(pfad, ctx)) return inner;
    entfernt.push([offset, offset + whole.length]);
    return '';
  });
  if (/<!-- \/?wenn\b/.test(out)) throw new MarkerFehler('Bedingung ohne Gegenstück (<!-- wenn … --> / <!-- /wenn -->)');
  return { text: out, entfernt };
}

function wertHtml(pfad: string, value: string, ctx: MarkerKontext, links: boolean): string {
  const text = escapeHtml(value);
  if (!links || isPlaceholder(value) || value === '') return text;
  if (pfad === 'firma.kontakt.email' && /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(value)) {
    return `<a href="mailto:${text}">${text}</a>`;
  }
  if (pfad === 'firma.kontakt.telefon_anzeige' && !isPlaceholder(ctx.firma.kontakt.telefon)) {
    return `<a href="tel:${escapeHtml(ctx.firma.kontakt.telefon)}">${text}</a>`;
  }
  if (pfad.endsWith('_url') && /^https:\/\//.test(value)) return `<a href="${text}">${text}</a>`;
  return text;
}

/**
 * Fills a legal text (rendered HTML or Markdown body) with company data.
 * Placeholder values stay visible as [[PLATZHALTER: …]]; values are HTML-escaped.
 * Throws MarkerFehler on unknown paths, non-text values, nesting and leftover `{{`.
 */
export function renderMitFirma(input: string, ctx: MarkerKontext, opts: RenderOptionen = {}): string {
  const links = opts.links ?? true;
  let out = wendeBloeckeAn(input, ctx).text;
  out = out.replace(VALUE_RE, (_m, pfad: string) => {
    const v = resolvePfad(pfad, ctx);
    if (Array.isArray(v)) return escapeHtml(aufzaehlung(v));
    if (typeof v !== 'string') throw new MarkerFehler(`Marker "{{${pfad}}}" ergibt keinen Text`);
    return wertHtml(pfad, v, ctx, links);
  });
  out = out.replace(COMMENT_RE, '');
  if (/\{\{|\}\}/.test(out)) throw new MarkerFehler('Unvollständiger Marker ({{ … }}) im Text');
  if (/<!--/.test(out)) throw new MarkerFehler('Nicht geschlossener HTML-Kommentar im Text');
  return out;
}
