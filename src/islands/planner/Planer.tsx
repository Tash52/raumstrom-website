// Planner root: step navigation, tool bar, 2D editor or 3D view, side panel, status messages, notice.
import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import { Editor2D, WERKZEUG_NAME } from './Editor2D.tsx';
import { Seitenleiste } from './Seitenleiste.tsx';
import { Startbildschirm } from './Startbildschirm.tsx';
import { type Werkzeug, planerStore, usePlaner } from './store.ts';
import { type AnsichtBefehl, tasteZuBefehl } from './szene/befehle.ts';

const Ansicht3D = lazy(() => import('./szene/Ansicht3D.tsx'));

export const HINWEIS = 'Visualisierung, unverbindlich, Maße ohne Gewähr, kein Angebot.';

function Symbol({ name }: { name: Werkzeug | 'zurueck' | 'vor' }) {
  const pfade: Record<string, ReactNode> = {
    auswahl: <path d="M5 3l14 7-6 2-2 6z" />,
    wand: (
      <>
        <path d="M4 20V8h6v12M10 14h10v6" />
        <path d="M4 20h16" />
      </>
    ),
    tuer: (
      <>
        <path d="M5 20h14M7 20V4h8v16" />
        <path d="M12 12h.01" />
      </>
    ),
    fenster: (
      <>
        <rect x="4" y="5" width="16" height="14" rx="1" />
        <path d="M12 5v14M4 12h16" />
      </>
    ),
    massstab: (
      <>
        <path d="M3 17L17 3l4 4L7 21z" />
        <path d="M7 13l2 2M10 10l2 2M13 7l2 2" />
      </>
    ),
    zurueck: <path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3" />,
    vor: <path d="M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3" />,
  };
  return (
    <svg className="planer-symbol" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {pfade[name]}
    </svg>
  );
}

const WERKZEUGE: Array<{ id: Werkzeug; taste: string }> = [
  { id: 'auswahl', taste: 'A' },
  { id: 'wand', taste: 'W' },
  { id: 'tuer', taste: 'T' },
  { id: 'fenster', taste: 'F' },
  { id: 'massstab', taste: 'M' },
];

const HILFE: Record<Werkzeug, string> = {
  wand: 'Klicken oder tippen Sie Punkt für Punkt. Linien rasten bei 90° und 45° ein und docken an Wandenden an. Doppelklick, Esc oder Klick auf einen bestehenden Punkt beendet den Linienzug.',
  auswahl: 'Wand, Tür, Fenster oder Raum antippen, um Maße zu ändern. Eckpunkte und Öffnungen lassen sich ziehen. Leere Fläche ziehen verschiebt den Plan.',
  tuer: 'Auf eine Wand klicken oder tippen, um eine Tür einzusetzen.',
  fenster: 'Auf eine Wand klicken oder tippen, um ein Fenster einzusetzen.',
  massstab: 'Zwei Punkte einer bekannten Strecke anklicken und die tatsächliche Länge eingeben.',
};

class Fehlergrenze extends Component<{ children: ReactNode; ersatz: ReactNode }, { fehler: boolean }> {
  state = { fehler: false };
  static getDerivedStateFromError() {
    return { fehler: true };
  }
  render() {
    return this.state.fehler ? this.props.ersatz : this.props.children;
  }
}

function OhneWebGL({ grund }: { grund: 'kein-webgl' | 'fehler' }) {
  return (
    <div className="planer-ohne-3d" data-planer-3d="fallback" data-grund={grund}>
      <h3>Die 3D-Ansicht ist in diesem Browser nicht verfügbar</h3>
      <p>
        {grund === 'kein-webgl'
          ? 'Ihr Browser oder Gerät unterstützt kein WebGL 2. Den 2D-Plan können Sie trotzdem zeichnen.'
          : 'Beim Aufbau der 3D-Ansicht ist ein Fehler aufgetreten. Ihr 2D-Plan bleibt erhalten.'}
      </p>
      <p>
        Gern besprechen wir Ihr Vorhaben auch direkt: <a href="/kontakt/">zum Kontaktformular</a>.
      </p>
    </div>
  );
}

function Bereich3D({ webgl, leicht }: { webgl: boolean; leicht: boolean }) {
  const projekt = usePlaner((s) => s.projekt);
  const [befehl, setBefehl] = useState<{ nr: number; b: AnsichtBefehl } | null>(null);
  const [bereit, setBereit] = useState(false);
  if (!webgl) return <OhneWebGL grund="kein-webgl" />;
  const sende = (b: AnsichtBefehl) => setBefehl((x) => ({ nr: (x?.nr ?? 0) + 1, b }));
  return (
    <div
      className="planer-3d"
      tabIndex={0}
      role="application"
      aria-roledescription="3D-Ansicht"
      aria-label="3D-Ansicht des Grundrisses. Pfeiltasten drehen und neigen, Plus und Minus zoomen, D zeigt die Draufsicht, 0 setzt die Ansicht zurück."
      data-planer-3d={bereit ? 'bereit' : 'laedt'}
      onKeyDown={(e) => {
        const b = tasteZuBefehl(e);
        if (b) {
          e.preventDefault();
          sende(b);
        }
      }}
    >
      <Fehlergrenze ersatz={<OhneWebGL grund="fehler" />}>
        <Suspense
          fallback={
            <p className="planer-status planer-3d-laden" role="status">
              <span className="planer-spinner" aria-hidden="true" /> 3D-Ansicht wird aufgebaut …
            </p>
          }
        >
          <Ansicht3D projekt={projekt} befehl={befehl} leicht={leicht} onBereit={() => setBereit(true)} />
        </Suspense>
      </Fehlergrenze>
      <div className="planer-3d-knoepfe" role="toolbar" aria-label="Ansicht steuern">
        <button type="button" className="planer-knopf" onClick={() => sende({ art: 'drehen', wert: -Math.PI / 8 })}>
          Nach links drehen
        </button>
        <button type="button" className="planer-knopf" onClick={() => sende({ art: 'drehen', wert: Math.PI / 8 })}>
          Nach rechts drehen
        </button>
        <button type="button" className="planer-knopf" onClick={() => sende({ art: 'zoom', wert: 0.8 })}>
          Näher
        </button>
        <button type="button" className="planer-knopf" onClick={() => sende({ art: 'zoom', wert: 1.25 })}>
          Weiter weg
        </button>
        <button type="button" className="planer-knopf" onClick={() => sende({ art: 'draufsicht' })}>
          Draufsicht
        </button>
        <button type="button" className="planer-knopf" onClick={() => sende({ art: 'schraeg' })}>
          Schrägansicht
        </button>
      </div>
    </div>
  );
}

function Meldung() {
  const meldung = usePlaner((s) => s.meldung);
  const [sichtbar, setSichtbar] = useState(false);
  useEffect(() => {
    if (!meldung) return;
    setSichtbar(true);
    const t = setTimeout(() => setSichtbar(false), meldung.art === 'fehler' ? 6000 : 3500);
    return () => clearTimeout(t);
  }, [meldung]);
  return (
    <div className={`planer-meldung${sichtbar ? ' ist-sichtbar' : ''}${meldung?.art === 'fehler' ? ' ist-fehler' : ''}`} role="status" aria-live="polite" data-planer-meldung="">
      {meldung?.text}
    </div>
  );
}

function Kurzanleitung({ onSchliessen }: { onSchliessen: () => void }) {
  return (
    <div className="planer-tour" role="dialog" aria-labelledby="planer-tour-titel" aria-modal="false">
      <h3 id="planer-tour-titel">So funktioniert der Planer</h3>
      <ol>
        <li>
          <strong>Wände zeichnen:</strong> Punkt für Punkt klicken oder tippen. Linien rasten bei 90°/45° ein und docken an Wandenden an. Länge in Zentimetern tippen und mit der Eingabetaste bestätigen.
        </li>
        <li>
          <strong>Räume:</strong> Geschlossene Bereiche werden automatisch als Raum erkannt, mit Fläche. Namen können Sie ändern.
        </li>
        <li>
          <strong>Türen und Fenster:</strong> Werkzeug wählen und auf eine Wand setzen, danach verschieben oder Maße anpassen.
        </li>
        <li>
          <strong>3D-Ansicht:</strong> Oben umschalten. Ziehen dreht, zwei Finger oder Mausrad zoomen.
        </li>
      </ol>
      <button type="button" className="planer-knopf planer-knopf-primaer" onClick={onSchliessen} autoFocus>
        Verstanden
      </button>
    </div>
  );
}

export function Planer({ webgl, leicht }: { webgl: boolean; leicht: boolean }) {
  const modus = usePlaner((s) => s.modus);
  const ansicht = usePlaner((s) => s.ansicht);
  const werkzeug = usePlaner((s) => s.werkzeug);
  const hatGrundriss = usePlaner((s) => Boolean(s.projekt.grundriss));
  const kannZurueck = usePlaner((s) => s.zurueck.length > 0);
  const kannVor = usePlaner((s) => s.vor.length > 0);
  const anzahlWaende = usePlaner((s) => s.projekt.waende.length);
  const [tour, setTour] = useState<'offen' | 'zu' | 'nie'>('nie');
  const st = planerStore.getState();

  useEffect(() => {
    if (modus === 'editor' && tour === 'nie') setTour('offen');
  }, [modus, tour]);

  const neu = () => {
    if (anzahlWaende && !window.confirm('Neu beginnen? Ihre bisherige Zeichnung wird verworfen.')) return;
    st.neuBeginnen();
  };

  return (
    <div className="planer" data-planer-modus={modus} data-planer-ansicht={ansicht} data-planer-webgl={webgl ? 'ja' : 'nein'}>
      {modus === 'start' ? (
        <Startbildschirm />
      ) : (
        <>
          <h2 className="visually-hidden">Grundriss bearbeiten</h2>
          <div className="planer-leiste">
            <div className="planer-schritte" role="group" aria-label="Ansicht wählen">
              <button type="button" className="planer-tab" onClick={neu}>
                Neu beginnen
              </button>
              <button type="button" className="planer-tab" aria-pressed={ansicht === '2d'} onClick={() => st.setze({ ansicht: '2d' })} data-planer-tab="2d">
                2D-Plan
              </button>
              <button type="button" className="planer-tab" aria-pressed={ansicht === '3d'} onClick={() => st.setze({ ansicht: '3d', auswahl: null })} data-planer-tab="3d">
                3D-Ansicht
              </button>
            </div>
            {ansicht === '2d' && (
              <div className="planer-werkzeuge" role="toolbar" aria-label="Werkzeuge">
                {WERKZEUGE.filter((w) => w.id !== 'massstab' || hatGrundriss).map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    className="planer-werkzeug"
                    aria-pressed={werkzeug === w.id}
                    aria-keyshortcuts={w.taste}
                    title={`${WERKZEUG_NAME[w.id]} (${w.taste})`}
                    onClick={() => st.setze({ werkzeug: w.id, kalibrierPunkte: [] })}
                    data-werkzeug={w.id}
                  >
                    <Symbol name={w.id} />
                    <span>{WERKZEUG_NAME[w.id]}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="planer-verlauf">
              <button type="button" className="planer-werkzeug" disabled={!kannZurueck} onClick={st.rueckgaengig} aria-keyshortcuts="Control+Z" title="Rückgängig (Strg+Z)">
                <Symbol name="zurueck" />
                <span>Rückgängig</span>
              </button>
              <button type="button" className="planer-werkzeug" disabled={!kannVor} onClick={st.wiederholen} aria-keyshortcuts="Control+Y" title="Wiederholen (Strg+Y)">
                <Symbol name="vor" />
                <span>Wiederholen</span>
              </button>
            </div>
          </div>
          <div className="planer-arbeit">
            <div className="planer-buehne">
              {/* drawing area and status message share one box, so on small screens the guide (in flow above it)
                  never covers the zoom buttons or the message */}
              <div className="planer-flaeche">
                {ansicht === '2d' ? <Editor2D /> : <Bereich3D webgl={webgl} leicht={leicht} />}
                <Meldung />
              </div>
              {ansicht === '2d' && (
                <p className="planer-hilfe" id="planer-editor-hilfe">
                  {HILFE[werkzeug]} Tastatur: Pfeiltasten bewegen den Zeiger (Umschalt 1 m, Alt 1 cm), Eingabetaste setzt, Entf löscht, Strg+Z macht rückgängig, + und − zoomen.
                </p>
              )}
              {tour === 'offen' && (
                <Kurzanleitung
                  onSchliessen={() => {
                    // keep keyboard users in place: focus moves to the drawing area, not to <body>
                    document.querySelector<HTMLElement>('[data-planer-editor], .planer-3d')?.focus({ preventScroll: true });
                    setTour('zu');
                  }}
                />
              )}
            </div>
            <Seitenleiste />
          </div>
        </>
      )}
      <p className="planer-hinweis" data-planer-hinweis="">
        {HINWEIS}
      </p>
    </div>
  );
}
