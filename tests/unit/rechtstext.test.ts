import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { MarkerFehler, aufzaehlung, renderMitFirma } from '../../src/lib/content/rechtstext.ts';
import { featuresSchema, firmaSchema, type Features, type Firma } from '../../src/lib/schemas/index.ts';

const load = (n: string) => parse(readFileSync(`src/content/settings/${n}.yaml`, 'utf8'));
const realFirma = firmaSchema.parse(load('firma'));
const realFeatures = featuresSchema.parse(load('features'));

function ctx(over: (f: Firma) => void = () => {}, features: Partial<Features> = {}) {
  const firma = structuredClone(realFirma);
  firma.gesellschafter = [
    { name: 'Erika Muster', vertretungsberechtigt: true },
    { name: 'Max Beispiel', vertretungsberechtigt: false },
    { name: 'Ida <Test>', vertretungsberechtigt: true },
  ];
  firma.kontakt = { telefon: '+4997211234567', telefon_anzeige: '09721 123 45 67', email: 'info@raumstrom.de', anfragen_empfaenger: 'a@raumstrom.de' };
  firma.steuer = { ust_idnr: 'DE123456789', w_idnr: '' };
  over(firma);
  return { firma, features: { ...realFeatures, ...features } };
}

describe('renderMitFirma', () => {
  it('ersetzt Werte und escaped HTML', () => {
    expect(renderMitFirma('<p>{{firma.name}} · {{firma.adresse.land}}</p>', ctx())).toBe('<p>RAUMSTROM · Deutschland</p>');
    expect(renderMitFirma('{{firma.claim}}', ctx((f) => (f.claim = 'A & B <script>')))).toBe('A &amp; B &lt;script&gt;');
  });

  it('Listen und Vertretungsberechtigte', () => {
    expect(renderMitFirma('{{firma.gesellschafter.*.name}}', ctx(), { links: false })).toBe('Erika Muster, Max Beispiel und Ida &lt;Test&gt;');
    expect(renderMitFirma('{{firma.vertretungsberechtigte}}', ctx())).toBe('Erika Muster und Ida &lt;Test&gt;');
    expect(aufzaehlung(['A'])).toBe('A');
    expect(aufzaehlung([])).toBe('');
  });

  it('Links für E-Mail, Telefon und _url', () => {
    const c = ctx();
    expect(renderMitFirma('{{firma.kontakt.email}}', c)).toBe('<a href="mailto:info@raumstrom.de">info@raumstrom.de</a>');
    expect(renderMitFirma('{{firma.kontakt.telefon_anzeige}}', c)).toBe('<a href="tel:+4997211234567">09721 123 45 67</a>');
    expect(renderMitFirma('{{firma.handwerk.berufsrecht_url}}', c)).toBe('<a href="https://www.gesetze-im-internet.de/hwo/">https://www.gesetze-im-internet.de/hwo/</a>');
    expect(renderMitFirma('{{firma.kontakt.email}}', c, { links: false })).toBe('info@raumstrom.de');
  });

  it('Platzhalter bleiben sichtbar, ohne Link', () => {
    const out = renderMitFirma('{{firma.kontakt.email}}', ctx((f) => (f.kontakt.email = '[[PLATZHALTER: E-Mail]]')));
    expect(out).toBe('[[PLATZHALTER: E-Mail]]');
  });

  it('bedingte Blöcke nach firma und features', () => {
    const text = '<p>A</p>\n<!-- wenn firma.steuer.ust_idnr -->\n<p>USt {{firma.steuer.ust_idnr}}</p>\n<!-- /wenn -->\n<!-- wenn firma.steuer.w_idnr -->\n<p>W {{firma.steuer.w_idnr}}</p>\n<!-- /wenn -->\n<!-- wenn features.floorplan_ai -->\n<p>KI</p>\n<!-- /wenn -->';
    const aus = renderMitFirma(text, ctx());
    expect(aus).toContain('USt DE123456789');
    expect(aus).not.toContain('W ');
    expect(aus).not.toContain('KI');
    expect(renderMitFirma(text, ctx(() => {}, { floorplan_ai: true }))).toContain('KI');
    // placeholder counts as "set" (staging shows it)
    expect(renderMitFirma(text, ctx((f) => (f.steuer.w_idnr = '[[PLATZHALTER: W-IdNr.]]')))).toContain('W [[PLATZHALTER: W-IdNr.]]');
  });

  it('entfernt alle übrigen Kommentare', () => {
    expect(renderMitFirma('<!-- ENTWURF – prüfen -->\n<p>x</p><!-- Quelle: … -->', ctx())).toBe('\n<p>x</p>');
  });

  it.each([
    ['{{firma.gibtsnicht}}', /Unbekannter Pfad/],
    ['{{firma.adresse.hausnummer}}', /Unbekannter Pfad/],
    ['{{features.floorplan_ai}}', /keinen Text/],
    ['{{firma.adresse}}', /keinen Text/],
    ['{{seite.titel}}', /Marker-Bereich/],
    ['<!-- wenn features.gibtsnicht -->x<!-- /wenn -->', /Unbekannter Pfad/],
    ['<!-- wenn firma.adresse -->x<!-- /wenn -->', /weder Text/],
    ['<!-- wenn features.floorplan_ai -->a<!-- wenn features.consent_manager -->b<!-- /wenn --><!-- /wenn -->', /Verschachtelt|Gegenstück/],
    ['<!-- wenn features.floorplan_ai -->offen', /Gegenstück/],
    ['{{firma.name', /Unvollständiger Marker/],
    ['<!-- nie geschlossen', /Nicht geschlossener/],
  ])('bricht ab: %s', (text, msg) => {
    expect(() => renderMitFirma(text, ctx())).toThrow(MarkerFehler);
    expect(() => renderMitFirma(text, ctx())).toThrow(msg);
  });

  it('alle Rechtstexte im Repo lassen sich mit den echten Daten füllen', () => {
    for (const f of readdirSync('src/content/legal').filter((n) => n.endsWith('.md'))) {
      const out = renderMitFirma(readFileSync(`src/content/legal/${f}`, 'utf8'), { firma: realFirma, features: realFeatures });
      expect(out, f).not.toMatch(/\{\{|<!--/);
    }
  });
});
