// Mails for a contact request. Plain text only (no HTML, so no markup injection in mail clients).
// Header fields never contain unchecked input: From is always MAIL_FROM (own domain), the customer
// appears only as Reply-To (validated address, display name without control characters), the subject
// is fixed text plus the title of a known Leistung.
// The confirmation to the sender contains no user input at all, so the form cannot be abused to send
// arbitrary text to third parties.
import type { SendMailOptions } from 'nodemailer';
import type { Firma } from '../schemas/index.ts';
import { isPlaceholder } from '../schemas/shared.ts';
import type { KontaktDaten } from '../security/kontakt-validierung.ts';
import type { NeuesBild } from '../uploads/bild.ts';

const zeigbar = (v: string | undefined) => Boolean(v) && !isPlaceholder(v);

/** Display name for Reply-To: printable, no quotes/angle brackets/commas, so the address cannot change. */
export function anzeigeName(name: string): string {
  return name.replace(/[\p{Cc}"<>,;:\\@]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
}

export interface AnfrageKontext {
  firma: Firma;
  mailFrom: string;
  empfaenger: string;
  anliegenTitel: string | null;
  eingang: Date;
}

export function anfrageMail(daten: KontaktDaten, bilder: NeuesBild[], k: AnfrageKontext): SendMailOptions {
  const zeit = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin' }).format(k.eingang);
  const zeilen = [
    `Neue Anfrage über das Kontaktformular (${zeit} Uhr)`,
    '',
    `Name: ${daten.name}`,
    `E-Mail: ${daten.email}`,
    `Telefon: ${daten.telefon || '–'}`,
    `Ort des Projekts: ${daten.ort || '–'}`,
    `Anliegen: ${k.anliegenTitel ?? '–'}`,
    '',
    'Nachricht:',
    daten.nachricht,
    '',
    bilder.length ? `Fotos: ${bilder.length} im Anhang (vom Server neu kodiert, Metadaten entfernt).` : 'Fotos: keine',
    'Einwilligung in die Verarbeitung laut Datenschutzerklärung: ja',
    '',
    'Antworten Sie direkt auf diese E-Mail, um der anfragenden Person zu schreiben.',
    'Bitte löschen Sie die Anfrage, sobald sie erledigt ist und keine Aufbewahrungspflicht besteht.',
  ];
  return {
    from: { name: `${k.firma.name} Website`, address: k.mailFrom },
    to: k.empfaenger,
    replyTo: { name: anzeigeName(daten.name), address: daten.email },
    subject: k.anliegenTitel ? `Neue Anfrage: ${k.anliegenTitel}` : 'Neue Anfrage über die Website',
    text: zeilen.join('\n'),
    attachments: bilder.map((b) => ({ filename: b.dateiname, content: b.inhalt, contentType: b.typ })),
    headers: { 'X-Auto-Response-Suppress': 'All' },
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}

export function bestaetigungMail(an: string, k: Pick<AnfrageKontext, 'firma' | 'mailFrom'>): SendMailOptions {
  const { firma } = k;
  const kontakt = [
    zeigbar(firma.kontakt.telefon_anzeige) ? `Telefon: ${firma.kontakt.telefon_anzeige}` : null,
    zeigbar(firma.kontakt.email) ? `E-Mail: ${firma.kontakt.email}` : null,
    `Web: https://${firma.domain}/`,
  ].filter(Boolean);
  const text = [
    'Guten Tag,',
    '',
    `vielen Dank für Ihre Anfrage über die Website von ${firma.name}. Wir haben sie erhalten und melden uns bei Ihnen.`,
    '',
    'Diese Nachricht wurde automatisch versendet und enthält bewusst keine Angaben aus Ihrer Anfrage.',
    'Falls Sie keine Anfrage gestellt haben, können Sie diese E-Mail ignorieren.',
    '',
    'Freundliche Grüße',
    firma.name,
    ...kontakt,
    '',
    `Datenschutz: https://${firma.domain}/datenschutz/`,
  ].join('\n');
  return {
    from: { name: firma.name, address: k.mailFrom },
    to: an,
    ...(zeigbar(firma.kontakt.email) ? { replyTo: firma.kontakt.email } : {}),
    subject: `Ihre Anfrage bei ${firma.name}`,
    text,
    headers: { 'Auto-Submitted': 'auto-replied', 'X-Auto-Response-Suppress': 'All' },
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}
