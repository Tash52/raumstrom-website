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
    'Die Kamera im Raumplaner lässt sich drehen.',
    'Ein Ansprechpartner für Ihre gesamte Renovierung.',
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
  ])('verbietet: %s', (t, rule) => expect(rules(t)).toContain(rule));

  it('meldet Zeile und Spalte', () => {
    expect(scanText('ok\nunser Meisterbetrieb')[0]).toMatchObject({ line: 2, column: 7, match: 'Meisterbetrieb' });
  });

  it('das Repo ist sauber', () => {
    expect(scanProject()).toEqual([]);
  });
});
