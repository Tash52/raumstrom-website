import { describe, expect, it } from 'vitest';
import { scanText } from '../../scripts/lib/wording.mjs';
import { scanProject } from '../../scripts/wording-scan.mjs';

const rules = (t: string) => scanText(t).map((f) => f.rule);

describe('Wording-Scan', () => {
  it.each([
    'Ausführung durch unseren Meister-Partnerbetrieb',
    'Meisterpflichtige Gewerke übernehmen unsere festen Meister-Partnerbetriebe.',
    'Wir arbeiten mit Meister-Partnerbetrieben zusammen.',
    'Am besten rufen Sie uns an.',
    'Bestellen Sie den Prüfservice für Ihre Ladesäule.',
    'Sicher betreiben: Prüfservice nach DGUV V3',
    'Die Ansicht im Raumplaner lässt sich drehen.',
    'Am besten rufen Sie uns vorher an.',
    'Wir beraten Sie bestens und bestätigen den Termin.',
    'Gewährleistung nach BGB',
    'Ein verbindliches Angebot erhalten Sie nach der Besichtigung.',
    'Meister-Partnerbetrieb für Elektroinstallation',
    'eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt haben',
    'nach § 5 Abs. 1 Nr. 1 DDG',
    'gemäß § 36 Absatz 3 Nr. 1 VSBG und Art. 6 Nr. 1 DSGVO',
    '§ 309 Nr. 1 BGB',
    'Ein Ansprechpartner für Ihre gesamte Renovierung.',
    'Mit besten Grüßen, Ihr RAUMSTROM-Team',
    'Beste Grüße aus Schweinfurt',
  ])('erlaubt: %s', (t) => expect(rules(t)).toEqual([]));

  it.each([
    ['RAUMSTROM ist Ihr Meisterbetrieb in Schweinfurt', 'meister'],
    ['Elektromeister vor Ort', 'meister'],
    ['Unser Meister kommt vorbei', 'meister'],
    ['Wir sind Innungsbetrieb', 'innung'],
    ['zertifizierter Fachbetrieb', 'fachbetrieb'],
    ['zertifizierte Elektriker', 'zertifiziert'],
    ['Sicherheitstechnik aus einer Hand', 'sicherheitstechnik'],
    ['Wir installieren Alarmanlagen', 'alarmanlage'],
    ['Videoüberwachung und Überwachungskameras', 'kamera'],
    ['Die günstigste Renovierung', 'superlativ'],
    ['Der beste Elektriker der Region', 'superlativ'],
    ['Nr. 1 in Unterfranken', 'superlativ'],
    ['Mit Festpreis-Garantie', 'festpreisgarantie'],
    ['Festpreisgarantie', 'festpreisgarantie'],
    ['Garantierter Festpreis für Ihr Bad', 'festpreisgarantie'],
    ['Festpreis garantiert', 'festpreisgarantie'],
    ['Festpreis mit Garantie', 'festpreisgarantie'],
    ['Preisgarantie', 'festpreisgarantie'],
    ['Kamera-Installation', 'kamera'],
    ['Wir montieren Kameras', 'kamera'],
    ['Die Kamera im Raumplaner lässt sich drehen.', 'kamera'],
    ['Einbruchschutz und Sicherheitssysteme', 'sicherheitstechnik'],
    ['Alarm bei Stromausfall', 'alarmanlage'],
    ['Bester Service in Schweinfurt', 'superlativ'],
    ['beste Qualität zum fairen Preis', 'superlativ'],
    ['Unser bestes Angebot', 'superlativ'],
    ['Top 1 Anbieter', 'superlativ'],
    ['Höchste Qualität seit Jahren', 'superlativ'],
    ['unschlagbare Preise', 'superlativ'],
    ['die günstigste Lösung', 'superlativ'],
    ['günstigste Standardpreise', 'superlativ'],
    ['Wir sind Nr. 1 in Schweinfurt', 'superlativ'],
    ['Seit 2020 Nr. 1', 'superlativ'],
    ['Meister-Partnerbetrieb und Meisterqualität', 'meister'],
  ])('verbietet: %s', (t, rule) => expect(rules(t)).toContain(rule));

  it('meldet Zeile und Spalte', () => {
    expect(scanText('ok\nunser Meisterbetrieb')[0]).toMatchObject({ line: 2, column: 7, match: 'Meisterbetrieb' });
  });

  it('das Repo ist sauber', () => {
    expect(scanProject()).toEqual([]);
  });
});
