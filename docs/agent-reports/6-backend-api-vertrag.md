# Phase 6 · backend-api · Vertrag `POST /api/planner/submit`

Stand: Vorab-Schritt (nur Vertrag, keine Implementierung). Dateien:

- `src/components/forms/planer-schnittstelle.ts` (Vertrag, reine Konstanten/Typen, einziger Import: `CSRF_URL` aus `kontakt-schnittstelle.ts`)
- `tests/unit/planer-schnittstelle.test.ts` (9 Tests, Konsistenz)

Geprüft: `npx vitest run tests/unit/planer-schnittstelle.test.ts` grün (9/9), `npm run check` 0 Fehler.

## Entscheidungen

1. **Nur JSON, kein Redirect.** Der Planer erzeugt alle Dateien im Browser, ein nativer Formular-POST ohne JS ist nie legitim. Der Client sendet `Accept: application/json`; ohne diesen Header antwortet der Server 406 (JSON) noch vor dem Lesen des Bodys. Nebeneffekt: zusätzliche Hürde gegen Cross-Site-Formular-POSTs (diese können `Accept` nicht setzen). Weiterhin: nur POST (405), nur multipart/form-data (415), Origin-Check, CSRF-Token (einmalig, `GET /api/csrf`), ALTCHA, Honeypot `website`.
2. **`kenntnisnahme=ja`** statt `einwilligung` (Art. 6 Abs. 1 lit. b DSGVO, Hinweis, keine Einwilligung). Konstante `KENNTNISNAHME_WERT`.
3. **Renders als wiederholtes Feld `renders`**, genau 4 Teile in der Reihenfolge `RENDER_ANSICHTEN` (iso, draufsicht, perspektive-1, perspektive-2). Der Server erkennt die Ansicht nur an der Position (die Teil-Reihenfolge von multipart bleibt erhalten); Client-Dateinamen werden ignoriert (Empfehlung `<id>.webp`).
4. **Mail-Anhangsnamen vergibt der Server** (`ANHANG`): `raumplan.glb`, `raumplan-projekt.json`, `raumplan-zusammenfassung.pdf`, `render-1-iso.webp` … `render-4-perspektive-2.webp`, `foto-1.webp` … Renders und Fotos werden mit sharp nach WebP neu kodiert.
5. **Projekt-JSON nur v2** (`LIMITS.projekt.version` = `PROJEKT_VERSION`, Test prüft Gleichlauf). Server: UTF-8 ohne BOM, erstes Zeichen `{`, `JSON.parse` (Größe vorher begrenzt), dann `parseProjekt` aus `lib/geometry`. v1 wird im Versand nicht migriert, sondern abgelehnt (der Client exportiert immer v2).

## Limits (MiB = 1024² Bytes)

| Teil | Anzahl | max. je Teil | Signatur |
|---|---|---|---|
| modell (GLB) | genau 1 | 8 MiB | `glTF`, Version 2, Längenfeld = Dateigröße, Chunk 1 JSON, optional Chunk 2 BIN |
| projekt (JSON) | genau 1 | 2 MiB | `{` + parseProjekt v2 |
| zusammenfassung (PDF) | genau 1 | 4 MiB | `%PDF-` am Anfang, `%%EOF` in den letzten 1024 Bytes |
| renders (PNG/WebP) | genau 4 | 2 MiB | PNG bzw. RIFF…WEBP; Kante 320–2048 px |
| fotos (jpeg/png/webp/heic) | 0–5 | 6 MiB, zusammen 12 MiB | wie Kontakt (`lib/uploads/signatur.ts`); Client verkleinert auf 2560 px |

- Alle Dateien zusammen ≤ 24 MiB (`maxDateienGesamtBytes`), Roh-Body inkl. multipart ≤ 25 MiB (`maxBodyBytes`).
- Pflichtteile im Maximum 22 MiB; Pflichtteile plus Fotos können die 24 MiB übersteigen, dann gilt die Gesamtgrenze (Client prüft vor dem Senden und meldet „Fotos verkleinern oder weglassen").
- Texte (nach trim): name 2–100, email 3–254, telefon ≤ 40, ort 2–100 (Pflicht), zeitraum ≤ 100, nachricht ≤ 4000 (optional), objektart ∈ `OBJEKTARTEN`.
- Die JSON-Grenze 2 MiB deckt die Schema-Maxima von `projektSchema` (2000 Knoten/Wände/Elektro, 4000 Wandseiten) bei kompakter Serialisierung ab.

**bodySizeLimit:** `astro.config.mjs` setzt im Node-Adapter 25 MiB. Der Vertrag ist so geschnitten, dass das genügt (Dateien 24 MiB + 1 MiB Text/Overhead). **Keine Anhebung nötig.** Der Test liest den Wert aus `astro.config.mjs` und schlägt fehl, falls er unter `LIMITS.maxBodyBytes` sinkt. Achtung Implementierung: `MAX_BODY` in `src/lib/security/api.ts` gilt nur für den Kontakt (22 MiB); der Planer braucht eine eigene Grenze und eigene `Annahme`-Reservierung (25 MiB je Slot, Slots knapp halten, z. B. 4).

## GLB-Strukturprüfung (Server, geplant)

Header 12 Bytes (Magic, Version 2, Länge = Dateigröße), Chunk-Längen 4-Byte-ausgerichtet und innerhalb der Datei, JSON-Chunk parsebar und ≤ 1 MiB, `asset.version` = "2.0", keine `uri` in `buffers`/`images` (weder extern noch `data:`), `extensionsUsed`/`extensionsRequired` nur aus `LIMITS.modell.erweiterungen` (EXT_meshopt_compression, KHR_mesh_quantization, KHR_materials_emissive_strength, KHR_texture_transform). planner-export meldet, falls weitere Erweiterungen nötig sind. Materialien als IDs (z. B. in `extras`), keine Bildtexturen nötig.

## PDF (Risiko, offen)

Ein PDF lässt sich nicht neu kodieren. Es geht an RAUMSTROM **und laut Briefing 7.4 als Eingangsbestätigung an die vom Kunden eingegebene Adresse**. Damit könnte ein Angreifer über unsere Domain ein beliebiges PDF an Dritte schicken (Malware-/Phishing-Relay). Gegenmaßnahmen im Vertrag: Signatur, Größe, Liste verbotener PDF-Namen (`LIMITS.zusammenfassung.verboten`: /JavaScript, /JS, /OpenAction, /AA, /Launch, /EmbeddedFile, /RichMedia, /XFA, /URI, /SubmitForm, /GoToR), die der Server als Namens-Token prüft, auch in entpackten Objekt-Streams (FlateDecode mit Größen- und Zeitgrenze). Bestehende Bremsen: `bestaetigung` 2 je Empfänger/23 h, `bestaetigungGesamt` 20/h.

**Zur Entscheidung (Orchestrator):** sicherer wäre, dass die Bestätigung an den Kunden das PDF nicht anhängt, sondern nur einen Text mit der Raumliste aus dem validierten Projekt-JSON enthält, oder dass der Server das PDF selbst aus dem JSON erzeugt (eigene PDF-Bibliothek serverseitig, Lizenzprüfung). Ohne Entscheidung setzt backend-api die Token-Prüfung um und hängt das PDF an. planner-export: PDF ohne Links (/URI), Skripte, Formulare, Anhänge erzeugen.

## Statuscodes

200 `{ok:true}` · 400/422 `{ok:false, fehler:{<feld>: Meldung}}` (Dateifehler unter dem Dateifeld, z. B. `renders`) · 403 (Origin/CSRF/ALTCHA), 405, 406, 413, 415, 429, 5xx nur `nachricht`. Immer `application/json`, `Cache-Control: no-store`.

## Offen / Abstimmung

- planner-export: Bibliothek für PDF und GLB-Export wählen; Erweiterungsliste und Größen bestätigen.
- Orchestrator: PDF in der Eingangsbestätigung (siehe oben).
- architect: CLAUDE.md Abschnitt „Schnittstellen" um den Planer-Vertrag ergänzen (eine Zeile, Verweis auf `planer-schnittstelle.ts`).
