// Stateless, signed, single-use CSRF tokens without cookies (no cookies in v1).
// Format: v1.<expiry ms, base36>.<128-bit id, base64url>.<HMAC-SHA256, base64url>
// The primary cross-site defence is the Origin/Sec-Fetch-Site check (herkunft.ts); the token adds
// freshness and single use, so a captured form submission cannot be replayed.
import { randomBytes } from 'node:crypto';
import { gleich, hmacB64 } from './schluessel.ts';
import type { EinmalSpeicher } from './speicher.ts';

export const CSRF_GUELTIG_MS = 2 * 60 * 60 * 1000;
const FORMAT = /^v1\.([0-9a-z]{1,12})\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})$/;

export function erzeugeCsrfToken(key: Buffer, now = Date.now()): string {
  const kopf = `v1.${(now + CSRF_GUELTIG_MS).toString(36)}.${randomBytes(16).toString('base64url')}`;
  return `${kopf}.${hmacB64(key, kopf)}`;
}

export type CsrfPruefung = { ok: true; id: string; bis: number } | { ok: false; grund: 'format' | 'signatur' | 'abgelaufen' };

/** Checks format, signature and expiry. Does not consume the token (see verbraucheCsrfToken). */
export function pruefeCsrfToken(key: Buffer, token: unknown, now = Date.now()): CsrfPruefung {
  if (typeof token !== 'string' || token.length > 120) return { ok: false, grund: 'format' };
  const m = FORMAT.exec(token);
  if (!m) return { ok: false, grund: 'format' };
  const [, bis36, id, sig] = m as unknown as [string, string, string, string];
  if (!gleich(hmacB64(key, `v1.${bis36}.${id}`), sig)) return { ok: false, grund: 'signatur' };
  const bis = Number.parseInt(bis36, 36);
  if (!Number.isFinite(bis) || bis <= now || bis > now + CSRF_GUELTIG_MS + 60_000) return { ok: false, grund: 'abgelaufen' };
  return { ok: true, id, bis };
}

/** Marks a checked token as used. false = it was used before. */
export function verbraucheCsrfToken(speicher: EinmalSpeicher, pruefung: { id: string; bis: number }): boolean {
  return speicher.markiere(`csrf:${pruefung.id}`, pruefung.bis);
}
