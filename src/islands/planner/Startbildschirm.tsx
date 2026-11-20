// Step 1: upload a floor plan, pick a template or start with an empty grid.
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { VORLAGEN, knotenMap, ladeVorlage, grenzen } from '../../lib/geometry/index.ts';
import { planerStore } from './store.ts';
import type { GrundrissBild, PdfDokument } from './upload/verarbeiten.ts';

const ANNEHMEN = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,application/pdf';

function VorlagenBild({ id }: { id: string }) {
  const daten = useMemo(() => {
    const p = ladeVorlage(id);
    if (!p) return null;
    const km = knotenMap(p);
    const { min, max } = grenzen(p.knoten);
    return { p, km, min, max };
  }, [id]);
  if (!daten) return null;
  const { p, km, min, max } = daten;
  const r = 0.6;
  return (
    <svg className="vorlage-bild" viewBox={`${min.x - r} ${min.y - r} ${max.x - min.x + 2 * r} ${max.y - min.y + 2 * r}`} aria-hidden="true">
      {p.raeume.map((x) => (
        <polygon key={x.id} className="vorlage-raum" points={x.knoten.map((k) => `${km.get(k)!.x},${km.get(k)!.y}`).join(' ')} />
      ))}
      {p.waende.map((w) => {
        const a = km.get(w.von)!;
        const b = km.get(w.bis)!;
        return <line key={w.id} className="vorlage-wand" x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={w.dicke} strokeLinecap="square" />;
      })}
    </svg>
  );
}

export function Startbildschirm() {
  const [laedt, setLaedt] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [pdf, setPdf] = useState<PdfDokument | null>(null);
  const [seite, setSeite] = useState(1);
  const [vorschau, setVorschau] = useState<GrundrissBild | null>(null);
  const [ziehen, setZiehen] = useState(false);
  const vorschauHost = useRef<HTMLDivElement>(null);
  const eingabe = useRef<HTMLInputElement>(null);

  useEffect(() => () => pdf?.schliessen(), [pdf]);

  useEffect(() => {
    const host = vorschauHost.current;
    if (!host) return;
    host.replaceChildren();
    if (vorschau) {
      vorschau.canvas.classList.add('pdf-vorschau-bild');
      vorschau.canvas.setAttribute('aria-hidden', 'true');
      host.append(vorschau.canvas);
    }
  }, [vorschau]);

  async function zeigeSeite(doc: PdfDokument, n: number) {
    setLaedt(`Seite ${n} wird dargestellt …`);
    try {
      setVorschau(await doc.rendere(n));
    } catch (e) {
      setFehler((e as Error).message || 'Die Seite konnte nicht dargestellt werden.');
    } finally {
      setLaedt(null);
    }
  }

  async function datei(f: File | undefined) {
    if (!f) return;
    setFehler(null);
    setVorschau(null);
    setPdf(null);
    setLaedt('Grundriss wird verarbeitet …');
    try {
      const { verarbeiteDatei } = await import('./upload/verarbeiten.ts');
      const r = await verarbeiteDatei(f);
      if (r.art === 'bild') {
        planerStore.getState().starteMitBild(r.bild);
        return;
      }
      if (r.pdf.seiten === 1) {
        const bild = await r.pdf.rendere(1);
        r.pdf.schliessen();
        planerStore.getState().starteMitBild(bild);
        return;
      }
      setPdf(r.pdf);
      setSeite(1);
      await zeigeSeite(r.pdf, 1);
    } catch (e) {
      setFehler((e as Error).message || 'Die Datei konnte nicht verarbeitet werden.');
    } finally {
      setLaedt(null);
      if (eingabe.current) eingabe.current.value = '';
    }
  }

  const ablegen = (e: DragEvent) => {
    e.preventDefault();
    setZiehen(false);
    void datei(e.dataTransfer.files[0]);
  };

  return (
    <div className="planer-start" data-planer-start="">
      <h2 className="planer-start-titel">Wie möchten Sie beginnen?</h2>
      <div className="planer-start-raster">
        <section className="planer-karte planer-karte-upload" aria-labelledby="planer-upload-titel">
          <h3 id="planer-upload-titel">Grundriss hochladen</h3>
          <div
            className={`planer-ablage${ziehen ? ' ist-aktiv' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setZiehen(true);
            }}
            onDragLeave={() => setZiehen(false)}
            onDrop={ablegen}
          >
            <p>Foto, Scan oder PDF Ihres Grundrisses hierher ziehen oder</p>
            <label className="planer-knopf planer-knopf-primaer">
              Datei auswählen
              <input
                ref={eingabe}
                className="visually-hidden"
                type="file"
                accept={ANNEHMEN}
                onChange={(e) => void datei(e.currentTarget.files?.[0])}
                data-planer-datei=""
              />
            </label>
            <p className="planer-klein">JPG, PNG, WebP, HEIC oder PDF, höchstens 20 MB.</p>
          </div>
          <p className="planer-klein">
            Die Datei bleibt auf Ihrem Gerät und wird nicht hochgeladen. Bildinformationen wie Aufnahmeort und -datum werden beim Einlesen entfernt.
          </p>
          {laedt && (
            <p className="planer-status" role="status">
              <span className="planer-spinner" aria-hidden="true" /> {laedt}
            </p>
          )}
          {fehler && (
            <p className="planer-fehler" role="alert">
              {fehler}
            </p>
          )}
          {pdf && (
            <div className="pdf-auswahl">
              <p>
                Das PDF hat {pdf.seiten} Seiten. Welche Seite zeigt den Grundriss?
              </p>
              <div className="planer-zeile">
                <label htmlFor="planer-pdf-seite">Seite</label>
                <select
                  id="planer-pdf-seite"
                  value={seite}
                  onChange={(e) => {
                    const n = Number(e.currentTarget.value);
                    setSeite(n);
                    void zeigeSeite(pdf, n);
                  }}
                >
                  {Array.from({ length: Math.min(pdf.seiten, 200) }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="planer-knopf planer-knopf-primaer"
                  disabled={!vorschau || Boolean(laedt)}
                  onClick={() => {
                    if (!vorschau) return;
                    vorschau.canvas.classList.remove('pdf-vorschau-bild');
                    vorschau.canvas.remove();
                    pdf.schliessen();
                    planerStore.getState().starteMitBild(vorschau);
                  }}
                >
                  Diese Seite verwenden
                </button>
              </div>
              <div ref={vorschauHost} className="pdf-vorschau" />
            </div>
          )}
        </section>

        <section className="planer-karte" aria-labelledby="planer-vorlagen-titel">
          <h3 id="planer-vorlagen-titel">Vorlage wählen</h3>
          <p className="planer-klein">Typische Grundrisse zum Anpassen, ohne Upload.</p>
          <ul className="planer-vorlagen" role="list">
            {VORLAGEN.map((v) => (
              <li key={v.id}>
                <button type="button" className="planer-vorlage" onClick={() => planerStore.getState().starteVorlage(v.id)} data-vorlage={v.id}>
                  <VorlagenBild id={v.id} />
                  <span className="planer-vorlage-titel">{v.titel}</span>
                  <span className="planer-klein">{v.beschreibung}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="planer-karte" aria-labelledby="planer-leer-titel">
          <h3 id="planer-leer-titel">Ohne Grundriss starten</h3>
          <p className="planer-klein">Leeres Raster, Wände per Klick oder Tastatur zeichnen.</p>
          <button type="button" className="planer-knopf" onClick={() => planerStore.getState().starteLeer()} data-planer-leer="">
            Leeres Raster öffnen
          </button>
        </section>
      </div>
    </div>
  );
}
