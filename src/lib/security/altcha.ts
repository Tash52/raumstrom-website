// Self-hosted ALTCHA (proof of work, no third party, no cookies). altcha-lib v2 API:
// createChallenge / verifySolution with PBKDF2/SHA-256 in deterministic mode (signed key prefix).
// Replay protection: every challenge nonce is accepted once until it expires.
import { createChallenge, randomInt, verifySolution, type Challenge, type Solution } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';
import { z } from 'zod';
import { ableiten } from './schluessel.ts';
import type { EinmalSpeicher } from './speicher.ts';

export const ALTCHA_ALGORITHMUS = 'PBKDF2/SHA-256';
export const ALTCHA_GUELTIG_S = 10 * 60;
/** About 1-2 s on a phone with the widget's workers; verification costs one derivation. */
export interface AltchaKosten {
  cost: number;
  counterMin: number;
  counterMax: number;
}
export const ALTCHA_KOSTEN: Readonly<AltchaKosten> = { cost: 2_000, counterMin: 1_000, counterMax: 5_000 };
export const ALTCHA_MAX_LAENGE = 4_096;

export interface AltchaSchluessel {
  signatur: string;
  schluesselSignatur: string;
}

/** Two independent HMAC secrets derived from ALTCHA_HMAC_KEY. */
export function altchaSchluessel(hmacKey: string): AltchaSchluessel {
  return {
    signatur: ableiten(hmacKey, 'altcha-signatur').toString('hex'),
    schluesselSignatur: ableiten(hmacKey, 'altcha-schluessel').toString('hex'),
  };
}

export async function erzeugeChallenge(s: AltchaSchluessel, now = Date.now(), kosten: Readonly<AltchaKosten> = ALTCHA_KOSTEN): Promise<Challenge> {
  return createChallenge({
    algorithm: ALTCHA_ALGORITHMUS,
    cost: kosten.cost,
    counter: randomInt(kosten.counterMax, kosten.counterMin),
    deriveKey,
    hmacSignatureSecret: s.signatur,
    hmacKeySignatureSecret: s.schluesselSignatur,
    expiresAt: Math.floor(now / 1000) + ALTCHA_GUELTIG_S,
  });
}

const hex = z.string().regex(/^[0-9a-f]{1,256}$/i);
const payloadSchema = z.object({
  challenge: z.object({
    parameters: z.object({
      algorithm: z.literal(ALTCHA_ALGORITHMUS),
      nonce: hex,
      salt: hex,
      cost: z.number().int().positive().max(1_000_000),
      keyLength: z.number().int().min(16).max(64),
      keyPrefix: hex,
      keySignature: z.string().max(256).optional(),
      expiresAt: z.number().int().positive(),
      data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
    }),
    signature: z.string().min(1).max(256),
  }),
  solution: z.object({
    counter: z.number().int().min(0).max(2 ** 32 - 1),
    derivedKey: hex,
    time: z.number().optional(),
  }),
});

export type AltchaErgebnis = { ok: true } | { ok: false; grund: 'fehlt' | 'format' | 'ungueltig' | 'abgelaufen' | 'wiederholt' };

function dekodiere(payload: string): unknown {
  try {
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

/** Verifies the widget payload (base64 JSON) and consumes its nonce. */
export async function pruefeAltcha(payload: unknown, s: AltchaSchluessel, speicher: EinmalSpeicher, now = Date.now()): Promise<AltchaErgebnis> {
  if (typeof payload !== 'string' || payload.length === 0) return { ok: false, grund: 'fehlt' };
  if (payload.length > ALTCHA_MAX_LAENGE || !/^[A-Za-z0-9+/=]+$/.test(payload)) return { ok: false, grund: 'format' };
  const parsed = payloadSchema.safeParse(dekodiere(payload));
  if (!parsed.success) return { ok: false, grund: 'format' };
  const { challenge, solution } = parsed.data;
  if (challenge.parameters.expiresAt * 1000 <= now) return { ok: false, grund: 'abgelaufen' };
  let verified = false;
  try {
    const r = await verifySolution({
      challenge: challenge as Challenge,
      solution: solution as Solution,
      deriveKey,
      hmacSignatureSecret: s.signatur,
      hmacKeySignatureSecret: s.schluesselSignatur,
    });
    if (r.expired) return { ok: false, grund: 'abgelaufen' };
    verified = r.verified;
  } catch {
    verified = false;
  }
  if (!verified) return { ok: false, grund: 'ungueltig' };
  // Only after a valid signature, so forged payloads cannot fill the store.
  if (!speicher.markiere(`altcha:${challenge.parameters.nonce}`, challenge.parameters.expiresAt * 1000)) {
    return { ok: false, grund: 'wiederholt' };
  }
  return { ok: true };
}
