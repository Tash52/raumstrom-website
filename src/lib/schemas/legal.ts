import { z } from 'zod';

export const LEGAL_SEITEN = [
  'impressum',
  'datenschutz',
  'agb',
  'widerruf',
  'cookie-einstellungen',
  'barrierefreiheit',
] as const;

/** Marker the launch check looks for (in addition to `entwurf: true`). */
export const ENTWURF_VERMERK =
  '<!-- ENTWURF – vor Veröffentlichung durch Rechtstexte-Service mit Abmahnschutz oder Anwalt prüfen lassen -->';

export const legalSchema = z.object({
  titel: z.string().min(1),
  seite: z.enum(LEGAL_SEITEN),
  stand: z.coerce.date(),
  entwurf: z.boolean().default(true),
});

export type Legal = z.infer<typeof legalSchema>;
