# Phase 2a · content-writer

Branch: worktree-agent-a9eeb6bcbe986ee22

## Erstellt (nur src/content/, plus PLATZHALTER.md per Skript)
- pages: start, fuer-zuhause, fuer-unternehmen, leistungen, raumplaner, referenzen, ueber-uns, partner, kontakt, 404 (entwurf: false, damit page-builder rendern kann; enthalten Platzhalter)
- leistungen: 11 (Gewerke-IDs aus gewerke.yaml, 3-4 FAQ je Leistung), alle entwurf: false
- faq: 5 allgemeine (reihenfolge 1-5) plus je Leistung 3-4
- team: christian-maul, jernar-kassimov (Platzhalter für Kurztext, Foto-Alt, Abschlussbezeichnung)
- referenzen: 2 illustrative Platzhalter, entwurf: true
- regionen: 9 Entwürfe (entwurf: true); bergrheinfeld ohne belegte Besonderheiten (nur Platzhalter, bleibt gesperrt)

## Quellen (Recherche 2026-11-18, auch als HTML-Kommentare in den Dateien)
- NAV § 19 Abs. 2 (Mitteilung Ladeeinrichtung, Zustimmung über 12 kVA): https://www.gesetze-im-internet.de/nav/__19.html (im Wortlaut gelesen, belegt)
- Schweinfurt: de.wikivoyage.org/wiki/Schweinfurt; en.wikipedia.org/wiki/U.S._Army_Garrison_Schweinfurt (Sekundärquellen)
- Gochsheim: en.wikipedia.org/wiki/Gochsheim; sonntagsblatt.de (Friedensfest 1649). Kirchenburg nicht belegt, nicht verwendet.
- Grafenrheinfeld: bundesregierung.de (Abschaltung Juni 2015), en.wikipedia.org/wiki/Grafenrheinfeld_nuclear_power_plant, Landkreis Schweinfurt, GvW 2018 (Rückbaugenehmigung)
- Niederwerrn: en.wikipedia.org/wiki/Niederwerrn, hdbg.eu, Denkmalliste Bayern
- Werneck: de.wikivoyage.org/wiki/Werneck, /Balthasar_Neumann
- Haßfurt: maps.adac.de, hassfurt.de Stadtrundgang und Geschichte
- Gerolzhofen: de.wikivoyage.org/wiki/Gerolzhofen, Denkmalliste Bayern, hmdb.org
- Bad Kissingen: bayern.de Pressemitteilung 24.07.2021, whc.unesco.org/en/list/1613
- DGUV V3 Fristen: Überblicksartikel (forum-verlag.com u. a.) über Websuche; Primärquelle DGUV nicht gelesen, im Text als Platzhalter markiert.

## Offen / Risiken
1. Regionaltexte stützen sich auf Sekundärquellen und sind Entwürfe. Vor entwurf:false: Primärquellen, eigene Erfahrungswerte, Anfahrt.
2. Alle Gewerke haben hinweis_hwk_geprueft: false. "Koordination aus einer Hand" nur mit Partner-Hinweis; "Modernisierung aus einer Hand" bewusst nicht als Claim benutzt. legal-compliance klärt.
3. bad-fliesen: Sanitär/Heizung ist in gewerke.yaml nicht enthalten (Platzhalter im Text). Als offen gemeldet.
4. Jernar Kassimov: "Elektriker mit Techniker-Abschluss" laut Briefing; genaue Bezeichnung als Platzhalter. Elektroinstallation wird als Partnerleistung dargestellt.
5. Wallbox-Förderung: bewusst keine Aussage (Platzhalter).
6. referenzen_anzeigen=false; Leerzustandstext liegt in pages/referenzen.
7. Pages tragen entwurf:false trotz Platzhaltern (Launch-Check listet 108 offene Punkte).

## Tests
npm ci, scan:wording, platzhalter, npm test (Unit 148, Hook 7), build:staging, check: grün.
