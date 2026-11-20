import { z } from 'zod';

// Global for every bundle that uses the shared schemas (as in lib/geometry/projekt.ts): without JIT,
// zod never probes `Function('')`, which the strict CSP (no 'unsafe-eval') would report.
z.config({ jitless: true });

/**
 * Placeholder convention: every missing value is written as
 * `[[PLATZHALTER: Beschreibung]]`. The launch check lists all of them.
 */
export const PLACEHOLDER_RE = /\[\[PLATZHALTER:\s*([^\]]+?)\s*\]\]/g;
const PLACEHOLDER_EXACT = /^\[\[PLATZHALTER:\s*[^\]]+?\s*\]\]$/;

export function isPlaceholder(value: unknown): value is string {
  return typeof value === 'string' && PLACEHOLDER_EXACT.test(value.trim());
}

/** Accepts either a valid value or a placeholder string. */
export function orPlaceholder<T extends z.ZodType>(schema: T) {
  return z.union([schema, z.string().regex(PLACEHOLDER_EXACT, 'Platzhalter muss [[PLATZHALTER: …]] lauten')]);
}

export const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'nur Kleinbuchstaben, Ziffern und Bindestriche');

export const metaTitle = z.string().min(1).max(60, 'Titel höchstens 60 Zeichen');
export const metaDescription = z.string().min(1).max(155, 'Beschreibung höchstens 155 Zeichen');

/** Three pillars, always in this order. */
export const SAEULEN = ['modernisieren', 'elektrifizieren', 'sicher-betreiben'] as const;
export const saeule = z.enum(SAEULEN);

export const ZIELGRUPPEN = ['zuhause', 'unternehmen'] as const;
export const zielgruppe = z.enum(ZIELGRUPPEN);

/** https only, no credentials in URLs. */
export const httpsUrl = z.url({ protocol: /^https$/ });

/**
 * Image field. Inside Astro (`content.config.ts`) the `image()` helper is
 * passed in, so `astro:assets` can optimise the file. Outside Astro (scripts,
 * tests) a plain relative path string is accepted.
 */
export type ImageSchema = z.ZodType;
export const imagePath: ImageSchema = z.string().min(1);
