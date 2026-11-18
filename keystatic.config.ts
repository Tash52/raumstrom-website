// Keystatic admin (local mode, dev only: npm run dev -> http://localhost:4321/keystatic).
// Field names mirror the zod schemas in src/lib/schemas (checked by tests/unit/keystatic.test.ts).
// The schemas stay authoritative: Astro validates every file at build time.
import { collection, config, fields, singleton } from '@keystatic/core';

const PH = 'Fehlt der Wert noch, steht hier [[PLATZHALTER: …]].';
const text = (label: string, description = PH, multiline = false) => fields.text({ label, description, multiline });
const draft = fields.checkbox({ label: 'Entwurf', description: 'Entwürfe werden nicht veröffentlicht.', defaultValue: true });
const order = fields.integer({ label: 'Reihenfolge', defaultValue: 0 });
const ids = (label: string, description: string) =>
  fields.array(fields.text({ label: 'ID' }), { label, description, itemLabel: (p) => p.value });
const metaTitle = fields.text({ label: 'SEO-Titel', description: 'höchstens 60 Zeichen', validation: { length: { min: 1, max: 60 } } });
const metaDescription = fields.text({ label: 'SEO-Beschreibung', description: 'höchstens 155 Zeichen', multiline: true, validation: { length: { min: 1, max: 155 } } });
const saeule = fields.select({
  label: 'Säule',
  options: [
    { label: 'Modernisieren', value: 'modernisieren' },
    { label: 'Elektrifizieren', value: 'elektrifizieren' },
    { label: 'Sicher betreiben', value: 'sicher-betreiben' },
  ],
  defaultValue: 'modernisieren',
});
const markdown = (label = 'Inhalt', description?: string) => fields.markdoc({ label, description, extension: 'md' });
const farbe = fields.object({ name: fields.text({ label: 'Name (neutral, keine Markennamen)' }), hex: fields.text({ label: 'Hex (#RRGGBB)' }) });

export default config({
  storage: { kind: 'local' },
  ui: { brand: { name: 'RAUMSTROM' } },
  singletons: {
    firma: singleton({
      label: 'Firmendaten',
      path: 'src/content/settings/firma',
      format: { data: 'yaml' },
      schema: {
        name: fields.text({ label: 'Markenname' }),
        rechtsform: fields.select({
          label: 'Rechtsform',
          options: ['GbR', 'e.K.', 'GmbH', 'UG (haftungsbeschränkt)', 'Einzelunternehmen'].map((v) => ({ label: v, value: v })),
          defaultValue: 'GbR',
        }),
        firmierung: text('Name der Gesellschaft (Impressum)'),
        claim: fields.text({ label: 'Claim' }),
        gesellschafter: fields.array(
          fields.object({
            name: text('Vollständiger Name'),
            vertretungsberechtigt: fields.checkbox({ label: 'vertretungsberechtigt', defaultValue: true }),
          }),
          { label: 'Gesellschafter', itemLabel: (p) => p.fields.name.value },
        ),
        adresse: fields.object(
          { strasse: text('Straße und Hausnummer'), plz: text('PLZ'), ort: text('Ort'), land: fields.text({ label: 'Land', defaultValue: 'Deutschland' }) },
          { label: 'Anschrift (ladungsfähig, kein Postfach)' },
        ),
        kontakt: fields.object(
          {
            telefon: text('Telefon (+49…)'),
            telefon_anzeige: text('Telefon zur Anzeige'),
            email: text('E-Mail'),
            anfragen_empfaenger: text('Empfänger für Anfragen'),
          },
          { label: 'Kontakt' },
        ),
        register: fields.object(
          { art: text('Registerart (leer = nicht eingetragen)'), gericht: text('Registergericht'), nummer: text('Registernummer') },
          { label: 'Registereintrag (z. B. eingetragene GbR)' },
        ),
        steuer: fields.object({ ust_idnr: text('USt-IdNr. (leer = keine)'), w_idnr: text('W-IdNr. (leer = keine)') }, { label: 'Steuer' }),
        handwerk: fields.object(
          {
            kammer: fields.text({ label: 'Kammer' }),
            kammer_anschrift: text('Anschrift der Kammer'),
            eintragung: text('Eintragung (leer = keine)'),
            berufsbezeichnung: text('Berufsbezeichnung'),
            staat_verleihung: fields.text({ label: 'Staat der Verleihung' }),
            berufsrecht_url: fields.url({ label: 'Berufsrechtliche Regelungen (Link)' }),
          },
          { label: 'Handwerk' },
        ),
        versicherung: fields.object(
          { art: fields.text({ label: 'Art' }), versicherer: text('Versicherer'), anschrift: text('Anschrift'), geltungsraum: text('Geltungsraum') },
          { label: 'Berufs-/Betriebshaftpflicht' },
        ),
        redaktion: fields.object({ name: text('Name'), anschrift: text('Anschrift') }, { label: 'Verantwortlich nach § 18 Abs. 2 MStV' }),
        einzugsgebiet: fields.object(
          {
            beschreibung: text('Beschreibung'),
            orte: fields.array(
              fields.object({
                name: fields.text({ label: 'Ort' }),
                slug: fields.text({ label: 'URL-Kürzel (klein, mit Bindestrich)' }),
                landkreis: fields.text({ label: 'Landkreis' }),
                bestaetigt: fields.checkbox({ label: 'Ort wird tatsächlich bedient', defaultValue: false }),
              }),
              { label: 'Orte', itemLabel: (p) => p.fields.name.value },
            ),
          },
          { label: 'Einzugsgebiet' },
        ),
        erreichbarkeit: fields.array(fields.object({ tage: fields.text({ label: 'Tage' }), zeiten: text('Zeiten') }), {
          label: 'Erreichbarkeit',
          itemLabel: (p) => p.fields.tage.value,
        }),
        social: fields.array(fields.object({ plattform: fields.text({ label: 'Plattform' }), url: fields.url({ label: 'Link (https)' }) }), {
          label: 'Social Media',
          itemLabel: (p) => p.fields.plattform.value,
        }),
        domain: fields.text({ label: 'Domain (ohne https://)' }),
      },
    }),
    features: singleton({
      label: 'Funktionen (Feature-Flags)',
      path: 'src/content/settings/features',
      format: { data: 'yaml' },
      schema: {
        floorplan_ai: fields.checkbox({ label: 'KI-Grundrissanalyse (Modus B)' }),
        bewertungen_anzeigen: fields.checkbox({ label: 'Bewertungen anzeigen' }),
        referenzen_anzeigen: fields.checkbox({ label: 'Referenzen anzeigen' }),
        ratgeber_anzeigen: fields.checkbox({ label: 'Ratgeber anzeigen' }),
        consent_manager: fields.checkbox({ label: 'Consent-Manager aktiv' }),
      },
    }),
    gewerke: singleton({
      label: 'Gewerke-Matrix',
      path: 'src/content/settings/gewerke',
      format: { data: 'yaml' },
      schema: {
        gewerke: fields.array(
          fields.object({
            id: fields.text({ label: 'ID (nicht ändern, wird von Leistungen referenziert)' }),
            name: fields.text({ label: 'Name' }),
            ausfuehrung: fields.select({
              label: 'Ausführung',
              description: '„partner" zeigt an der Leistung: Ausführung durch unseren Meister-Partnerbetrieb',
              options: [
                { label: 'eigen', value: 'eigen' },
                { label: 'partner', value: 'partner' },
              ],
              defaultValue: 'partner',
            }),
            hinweis_hwk_geprueft: fields.checkbox({ label: 'Formulierung von der HWK geprüft', defaultValue: false }),
          }),
          { label: 'Gewerke', itemLabel: (p) => `${p.fields.name.value} (${p.fields.ausfuehrung.value})` },
        ),
      },
    }),
  },
  collections: {
    pages: collection({
      label: 'Seitentexte',
      path: 'src/content/pages/*',
      slugField: 'titel',
      format: { contentField: 'inhalt' },
      schema: {
        titel: fields.slug({ name: { label: 'Titel' } }),
        meta_title: metaTitle,
        meta_description: metaDescription,
        abschnitte: fields.array(
          fields.object({
            id: fields.text({ label: 'ID' }),
            label: fields.text({ label: 'Mono-Label (optional)' }),
            titel: fields.text({ label: 'Überschrift' }),
            text: fields.text({ label: 'Text', multiline: true }),
          }),
          { label: 'Abschnitte', itemLabel: (p) => p.fields.titel.value },
        ),
        entwurf: draft,
        inhalt: markdown(),
      },
    }),
    leistungen: collection({
      label: 'Leistungen',
      path: 'src/content/leistungen/*',
      slugField: 'titel',
      format: { contentField: 'inhalt' },
      schema: {
        titel: fields.slug({ name: { label: 'Titel' } }),
        meta_title: metaTitle,
        meta_description: metaDescription,
        kurzbeschreibung: fields.text({ label: 'Kurzbeschreibung', multiline: true }),
        saeule,
        zielgruppen: fields.multiselect({
          label: 'Zielgruppen',
          options: [
            { label: 'Für Zuhause', value: 'zuhause' },
            { label: 'Für Unternehmen & Verwaltungen', value: 'unternehmen' },
          ],
          defaultValue: ['zuhause'],
        }),
        gewerke: ids('Gewerke', 'IDs aus der Gewerke-Matrix, z. B. elektroinstallation'),
        ablauf: fields.array(fields.object({ titel: fields.text({ label: 'Schritt' }), text: fields.text({ label: 'Text', multiline: true }) }), {
          label: 'Ablauf',
          itemLabel: (p) => p.fields.titel.value,
        }),
        faq: fields.array(fields.relationship({ label: 'FAQ', collection: 'faq' }), { label: 'FAQ', itemLabel: (p) => p.value ?? '' }),
        reihenfolge: order,
        entwurf: draft,
        inhalt: markdown(),
      },
    }),
    faq: collection({
      label: 'FAQ',
      path: 'src/content/faq/*',
      slugField: 'frage',
      format: { data: 'yaml' },
      schema: {
        frage: fields.slug({ name: { label: 'Frage' } }),
        antwort: fields.text({ label: 'Antwort (Kernaussage zuerst)', multiline: true }),
        leistungen: ids('Leistungen', 'IDs der Leistungen; leer = allgemein'),
        reihenfolge: order,
      },
    }),
    ratgeber: collection({
      label: 'Ratgeber',
      path: 'src/content/ratgeber/*',
      slugField: 'titel',
      format: { contentField: 'inhalt' },
      schema: {
        titel: fields.slug({ name: { label: 'Titel' } }),
        meta_title: metaTitle,
        meta_description: metaDescription,
        autor: fields.relationship({ label: 'Autor', collection: 'team' }),
        veroeffentlicht: fields.date({ label: 'Veröffentlicht am' }),
        aktualisiert: fields.date({ label: 'Aktualisiert am' }),
        leistungen: ids('Leistungen', 'IDs verwandter Leistungen'),
        quellen: fields.array(fields.object({ titel: fields.text({ label: 'Titel' }), url: fields.url({ label: 'Link (https)' }) }), {
          label: 'Quellen',
          itemLabel: (p) => p.fields.titel.value,
        }),
        entwurf: draft,
        inhalt: markdown(),
      },
    }),
    referenzen: collection({
      label: 'Referenzen',
      path: 'src/content/referenzen/*',
      slugField: 'titel',
      format: { contentField: 'inhalt' },
      schema: {
        titel: fields.slug({ name: { label: 'Titel' } }),
        ort: fields.text({ label: 'Ort' }),
        jahr: fields.integer({ label: 'Jahr' }),
        leistungen: ids('Leistungen', 'IDs der Leistungen'),
        kurzbeschreibung: fields.text({ label: 'Kurzbeschreibung', multiline: true }),
        bilder: fields.array(
          fields.object({
            src: fields.image({ label: 'Bild', directory: 'src/assets/referenzen', publicPath: '../../assets/referenzen/' }),
            alt: fields.text({ label: 'Alternativtext' }),
          }),
          { label: 'Bilder (nur eigene Fotos echter Projekte)', itemLabel: (p) => p.fields.alt.value },
        ),
        illustrativ: fields.checkbox({ label: 'Illustrativer Platzhalter (wird als solcher gekennzeichnet)', defaultValue: true }),
        entwurf: draft,
        inhalt: markdown(),
      },
    }),
    regionen: collection({
      label: 'Regionen',
      path: 'src/content/regionen/*',
      slugField: 'ort',
      format: { contentField: 'inhalt' },
      schema: {
        ort: fields.slug({ name: { label: 'Ort' } }),
        meta_title: metaTitle,
        meta_description: metaDescription,
        besonderheiten: fields.text({ label: 'Besonderheiten (Bausubstanz, Anfahrt, Referenzen vor Ort)', multiline: true }),
        anfahrt: fields.text({ label: 'Anfahrt', multiline: true }),
        referenzen: fields.array(fields.relationship({ label: 'Referenz', collection: 'referenzen' }), { label: 'Referenzen', itemLabel: (p) => p.value ?? '' }),
        entwurf: draft,
        inhalt: markdown('Individueller Inhalt'),
      },
    }),
    team: collection({
      label: 'Team',
      path: 'src/content/team/*',
      slugField: 'name',
      format: { data: 'yaml' },
      schema: {
        name: fields.slug({ name: { label: 'Name' } }),
        rolle: fields.text({ label: 'Rolle' }),
        kurztext: fields.text({ label: 'Kurztext', multiline: true }),
        foto: fields.image({ label: 'Foto (optional)', directory: 'src/assets/team', publicPath: '../../assets/team/' }),
        foto_alt: fields.text({ label: 'Alternativtext zum Foto' }),
        reihenfolge: order,
      },
    }),
    trends: collection({
      label: 'Stilpakete (Trends)',
      path: 'src/content/trends/*',
      slugField: 'name',
      format: { data: 'json' },
      schema: {
        name: fields.slug({ name: { label: 'Name' } }),
        beschreibung: fields.text({ label: 'Beschreibung', multiline: true }),
        gueltig_ab: fields.date({ label: 'Gültig ab', validation: { isRequired: true } }),
        saison: fields.text({ label: 'Saison (z. B. 2026/27)' }),
        trend_quelle_notiz: fields.text({ label: 'Quellen-Notiz (intern)', multiline: true }),
        aktiv: fields.checkbox({ label: 'aktiv', defaultValue: false }),
        wandfarben: fields.array(farbe, { label: 'Wandfarben', itemLabel: (p) => p.fields.name.value }),
        putz_tapete: fields.object({
          art: fields.select({
            label: 'Art',
            options: ['putz', 'tapete', 'farbe'].map((v) => ({ label: v, value: v })),
            defaultValue: 'farbe',
          }),
          beschreibung: fields.text({ label: 'Beschreibung' }),
        }),
        boden: fields.object({
          material: fields.select({
            label: 'Material',
            options: ['vinyl', 'laminat', 'parkett', 'fliese', 'teppich'].map((v) => ({ label: v, value: v })),
            defaultValue: 'vinyl',
          }),
          farbton: farbe,
          verlegemuster: fields.text({ label: 'Verlegemuster' }),
        }),
        fliesen: fields.object({
          format: fields.text({ label: 'Format' }),
          farbe,
          verlegemuster: fields.text({ label: 'Verlegemuster' }),
          fuge: fields.text({ label: 'Fugenfarbe (#RRGGBB)' }),
        }),
        deckenlicht: fields.object({
          art: fields.text({ label: 'Art' }),
          farbtemperatur_k: fields.integer({ label: 'Farbtemperatur (Kelvin)', defaultValue: 3000 }),
        }),
        elektro_vorschlag: fields.object({
          paket: fields.text({ label: 'Paket' }),
          punkte: fields.array(fields.text({ label: 'Punkt' }), { label: 'Punkte', itemLabel: (p) => p.value }),
        }),
      },
    }),
    legal: collection({
      label: 'Rechtstexte (nur lesen, im Texteditor ändern)',
      path: 'src/content/legal/*',
      slugField: 'titel',
      format: { contentField: 'inhalt' },
      schema: {
        titel: fields.slug({ name: { label: 'Titel' } }),
        seite: fields.select({
          label: 'Seite',
          options: ['impressum', 'datenschutz', 'agb', 'widerruf', 'cookie-einstellungen', 'barrierefreiheit'].map((v) => ({ label: v, value: v })),
          defaultValue: 'impressum',
        }),
        stand: fields.date({ label: 'Stand', validation: { isRequired: true } }),
        entwurf: fields.checkbox({ label: 'Entwurf (vor Veröffentlichung prüfen lassen)', defaultValue: true }),
        inhalt: markdown('Inhalt', 'Nicht hier bearbeiten: Keystatic schreibt Tabellen beim Speichern in eine Syntax um, die die Website nicht darstellt, und entfernt Escape-Zeichen. Rechtstexte im Texteditor ändern (Anleitung: docs/ANLEITUNG-BEARBEITEN.md).'),
      },
    }),
  },
});
