// Fail-secure environment check. The server refuses to start if a required
// secret is missing or still a placeholder. Values are never logged.
import { z } from 'zod';

const PLACEHOLDER_HINTS = /PLATZHALTER|change[-_]?me|example|xxx|todo/i;
const secret = (min) =>
  z
    .string({ error: 'fehlt' })
    .min(min, `mindestens ${min} Zeichen`)
    .refine((v) => !PLACEHOLDER_HINTS.test(v), 'ist noch ein Platzhalter');
const required = z
  .string({ error: 'fehlt' })
  .min(1, 'fehlt')
  .refine((v) => !PLACEHOLDER_HINTS.test(v), 'ist noch ein Platzhalter');
const port = z.coerce.number({ error: 'fehlt oder keine Zahl' }).int().min(1).max(65535);
const bool = z.enum(['true', 'false'], { error: 'true oder false' }).transform((v) => v === 'true');

export const envSchema = z.object({
  HOST: z.string().default('127.0.0.1'),
  PORT: port.default(8080),
  /** true only behind a reverse proxy that sets X-Forwarded-For. */
  TRUST_PROXY: bool.default(false),
  /** HMAC key for ALTCHA challenges (Phase 2). */
  ALTCHA_HMAC_KEY: secret(32),
  /** Secret for CSRF tokens (Phase 2). */
  CSRF_SECRET: secret(32),
  SMTP_HOST: required,
  SMTP_PORT: port,
  /** true = implicit TLS (465), false = STARTTLS (587, TLS still required). */
  SMTP_SECURE: bool.default(true),
  SMTP_USER: required,
  SMTP_PASS: secret(8),
  /** Sender, always an address of the own domain. */
  MAIL_FROM: z.email({ error: 'keine gültige E-Mail-Adresse' }),
  /** Only needed when features.floorplan_ai is true (Phase 6). */
  MISTRAL_API_KEY: z.string().optional(),
});

/** Names of variables an operator must set (used by the launch check and .env.example). */
export const REQUIRED_ENV = Object.entries(envSchema.shape)
  .filter(([, s]) => !s.safeParse(undefined).success)
  .map(([k]) => k);

/**
 * @param {Record<string, string | undefined>} source
 * @returns {{ ok: true, env: z.infer<typeof envSchema> } | { ok: false, problems: string[] }}
 */
export function parseEnv(source = process.env) {
  const result = envSchema.safeParse(source);
  if (result.success) return { ok: true, env: result.data };
  const problems = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  return { ok: false, problems };
}

let cached;
/** Validated server environment; throws if invalid (use in API routes). */
export function getServerEnv() {
  if (cached) return cached;
  const r = parseEnv();
  if (!r.ok) throw new Error('Server-Konfiguration unvollständig');
  cached = r.env;
  return cached;
}
