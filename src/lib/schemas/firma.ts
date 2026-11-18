import { z } from 'zod';
import { httpsUrl, orPlaceholder, slug } from './shared.ts';

const text = z.string().min(1);
const optionalText = z.string().optional();

export const gesellschafterSchema = z.object({
  name: orPlaceholder(text),
  vertretungsberechtigt: z.boolean(),
});

export const ortSchema = z.object({
  name: text,
  slug,
  landkreis: optionalText,
  /** Operator has confirmed that this place is actually served. */
  bestaetigt: z.boolean().default(false),
});

export const firmaSchema = z.object({
  /** Brand name as shown on the website. */
  name: text,
  /** Assumption until confirmed: GbR. */
  rechtsform: z.enum(['GbR', 'e.K.', 'GmbH', 'UG (haftungsbeschränkt)', 'Einzelunternehmen']),
  /** Full legal name of the company (Impressum). */
  firmierung: orPlaceholder(text),
  claim: text,
  gesellschafter: z.array(gesellschafterSchema).min(1),
  adresse: z.object({
    strasse: orPlaceholder(text),
    plz: orPlaceholder(z.string().regex(/^\d{5}$/, 'PLZ: fünf Ziffern')),
    ort: orPlaceholder(text),
    land: text,
  }),
  kontakt: z.object({
    /** E.164, e.g. +4997211234567 (for tel: links and Schema.org). */
    telefon: orPlaceholder(z.string().regex(/^\+\d{6,15}$/, 'Telefon im Format +49…')),
    /** Human-readable, e.g. 09721 123 45 67. */
    telefon_anzeige: orPlaceholder(text),
    email: orPlaceholder(z.email()),
    /** Recipient for contact and planner requests (server side only). */
    anfragen_empfaenger: orPlaceholder(z.email()),
  }),
  steuer: z.object({
    /** Empty string = not available, the Impressum omits the line. */
    ust_idnr: orPlaceholder(z.string().regex(/^(DE\d{9})?$/, 'USt-IdNr.: DE + 9 Ziffern oder leer')),
    w_idnr: orPlaceholder(z.string().regex(/^(DE\d{9}(-\d{5})?)?$/, 'W-IdNr.: DE + 9 Ziffern (+ -5 Ziffern) oder leer')),
  }),
  handwerk: z.object({
    kammer: text,
    kammer_anschrift: orPlaceholder(text),
    /** Entry in Handwerksrolle / Verzeichnis, empty if none. */
    eintragung: orPlaceholder(z.string()),
    berufsbezeichnung: orPlaceholder(text),
    staat_verleihung: text,
    berufsrecht_url: httpsUrl,
  }),
  versicherung: z.object({
    art: text,
    versicherer: orPlaceholder(text),
    anschrift: orPlaceholder(text),
    geltungsraum: orPlaceholder(text),
  }),
  /** § 18 Abs. 2 MStV */
  redaktion: z.object({
    name: orPlaceholder(text),
    anschrift: orPlaceholder(text),
  }),
  einzugsgebiet: z.object({
    beschreibung: orPlaceholder(text),
    orte: z.array(ortSchema).min(1),
  }),
  erreichbarkeit: z.array(z.object({ tage: text, zeiten: orPlaceholder(text) })),
  social: z.array(z.object({ plattform: text, url: httpsUrl })).default([]),
  /** Without protocol, e.g. raumstrom.de */
  domain: z.string().regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/),
});

export type Firma = z.infer<typeof firmaSchema>;
