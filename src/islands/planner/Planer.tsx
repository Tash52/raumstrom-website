// Planner root: step navigation, tool bar, 2D editor or 3D view, side panel, status messages, notice.
import { Component, Suspense, lazy, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { NUR_VISUALISIERUNG, type Stilpaket } from '../../lib/materials/index.ts';
import { Editor2D, type EditorErweiterung, WERKZEUG_NAME } from './Editor2D.tsx';
import { behandleTreffer, dreheMoebel, loescheZiel, treffer2D, verschiebeZiel } from './gestalten/aktionen.ts';
import { Ebene2D } from './gestalten/Ebene2D.tsx';
import { type GestaltModus, MODI, gestaltStore, rundgangEingabe, useGestalt } from './gestalten/store.ts';
import { Werkzeugleiste, wechsleModus } from './gestalten/Werkzeugleiste.tsx';
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

/** Touch joystick for the walk-through (writes into rundgangEingabe, read by the 3D view every frame). */
function Joystick() {
  const knauf = useRef<HTMLSpanElement>(null);
  const aktiv = useRef<{ id: number; x: number; y: number } | null>(null);
  const setze = (dx: number, dy: number) => {
    const r = 40;
    const l = Math.hypot(dx, dy);
    const f = l > r ? r / l : 1;
    if (knauf.current) knauf.current.style.transform = `translate(${dx * f}px, ${dy * f}px)`;
    rundgangEingabe.vor = Math.max(-1, Math.min(1, (-dy * f) / r));
    rundgangEingabe.drehen = Math.max(-1, Math.min(1, (-dx * f) / r));
  };
  const ende = () => {
    aktiv.current = null;
    setze(0, 0);
  };
  useEffect(() => ende, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div
      className="planer-joystick"
      aria-hidden="true"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        aktiv.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      }}
      onPointerMove={(e) => {
        const a = aktiv.current;
        if (a && a.id === e.pointerId) setze(e.clientX - a.x, e.clientY - a.y);
      }}
      onPointerUp={ende}
      onPointerCancel={ende}
    >
      <span ref={knauf} className="planer-joystick-knauf" />
    </div>
  );
}

function Bereich3D({ webgl, leicht }: { webgl: boolean; leicht: boolean }) {
  const projekt = usePlaner((s) => s.projekt);
  const kamera = useGestalt((s) => s.kamera);
  const modus = useGestalt((s) => s.modus);
  const hatMoebel = projekt.einrichtung.length > 0;
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
      aria-label={
        kamera === 'rundgang'
          ? '3D-Rundgang. W und S oder Pfeil hoch und runter gehen, A und D seitwärts, Pfeil links und rechts drehen.'
          : '3D-Ansicht des Grundrisses. Pfeiltasten drehen und neigen, Plus und Minus zoomen, D zeigt die Draufsicht, 0 setzt die Ansicht zurück. Flächen wählen Sie per Tippen oder in der Seitenleiste.'
      }
      data-planer-3d={bereit ? 'bereit' : 'laedt'}
      data-planer-kamera={kamera}
      onKeyDown={(e) => {
        if (kamera === 'rundgang') return;
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
          <Ansicht3D projekt={projekt} befehl={befehl} leicht={leicht} onBereit={() => setBereit(true)} onTreffer={behandleTreffer} />
        </Suspense>
      </Fehlergrenze>
      {kamera === 'rundgang' && <Joystick />}
      {hatMoebel && (modus === 'einrichtung' || modus === 'ansicht') && (
        <p className="planer-3d-hinweis" data-planer-nur-visualisierung="">
          {NUR_VISUALISIERUNG}
        </p>
      )}
      {kamera === 'rundgang' ? (
        <div className="planer-3d-knoepfe" role="toolbar" aria-label="Ansicht steuern">
          <button type="button" className="planer-knopf" onClick={() => gestaltStore.getState().setze({ kamera: 'orbit' })}>
            Rundgang beenden
          </button>
        </div>
      ) : (
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
        <button type="button" className="planer-knopf" onClick={() => gestaltStore.getState().setze({ kamera: 'rundgang' })} data-planer-rundgang="">
          Rundgang
        </button>
      </div>
      )}
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
        <li>
          <strong>Gestalten:</strong> Modus wählen (Elektro, Wände, Boden, Fliesen …), Kachel antippen und auf eine Wand, einen Boden oder einen Raum anwenden. Rückgängig mit Strg+Z.
        </li>
      </ol>
      <button type="button" className="planer-knopf planer-knopf-primaer" onClick={onSchliessen} autoFocus>
        Verstanden
      </button>
    </div>
  );
}

const GESTALT_HILFE: Partial<Record<GestaltModus, string>> = {
  elektro: 'Elektro: Typ wählen, dann neben einer Wand klicken oder tippen (Wandpunkte) oder in einen Raum (Decke, Boden). Vorhandene Punkte antippen, um sie zu ändern.',
  waende: 'Wände: auf eine Wandseite tippen (nahe der Wand, auf der gewünschten Seite) oder in einen Raum.',
  boden: 'Boden: in einen Raum tippen.',
  fliesen: 'Fliesen: auf eine Wandseite oder in einen Raum tippen.',
  decke: 'Decke: in einen Raum tippen, das wählt seine Decke.',
  oeffnungen: 'Türen & Fenster: auf eine Tür oder ein Fenster tippen.',
  einrichtung: 'Einrichtung: Möbel wählen und in einen Raum tippen. R dreht das gewählte Möbel, Alt+Pfeil verschiebt es.',
  ansicht: 'Ansicht: Optionen in der Seitenleiste, 3D-Ansicht oben umschalten.',
};

const istEingabe = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

export function Planer({ webgl, leicht, stilpakete = [] }: { webgl: boolean; leicht: boolean; stilpakete?: Stilpaket[] }) {
  const modus = usePlaner((s) => s.modus);
  const gestaltModus = useGestalt((s) => s.modus);
  useEffect(() => gestaltStore.getState().setze({ stilpakete }), [stilpakete]);
  const erweiterung = useMemo<EditorErweiterung | undefined>(
    () =>
      gestaltModus === 'bauen'
        ? undefined
        : {
            tippen: (w, r) => behandleTreffer(treffer2D(planerStore.getState().projekt, w, r)),
            loeschen: () => loescheZiel(),
            taste: (e) => {
              if (e.key === 'Escape') {
                gestaltStore.getState().setze({ ziel: null, pipette: false });
                return false;
              }
              if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) {
                dreheMoebel(e.shiftKey ? -90 : 90);
                return true;
              }
              const pfeil: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
              const d = pfeil[e.key];
              // with selected furniture or an electrical point, Alt+arrow moves it by 10 cm
              if (d && e.altKey && verschiebeZiel(d[0] * 0.1, d[1] * 0.1)) {
                e.preventDefault();
                return true;
              }
              return false;
            },
            ebene: (ctx) => <Ebene2D px={ctx.px} zeiger={ctx.zeiger} tastatur={ctx.tastatur} />,
          },
    [gestaltModus],
  );
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

  // global shortcuts: undo/redo anywhere in the planner (the 2D editor handles its own first), modes 1 to 9
  const tasten = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.defaultPrevented || istEingabe(e.target) || modus !== 'editor') return;
    const strg = e.ctrlKey || e.metaKey;
    if (strg && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) st.wiederholen();
      else st.rueckgaengig();
      return;
    }
    if (strg && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      st.wiederholen();
      return;
    }
    if (strg || e.altKey) return;
    const m = MODI.find((x) => x.taste === e.key);
    if (m && !(e.target as HTMLElement).closest?.('[data-planer-editor]')) {
      e.preventDefault();
      wechsleModus(m.id, webgl);
      return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && gestaltModus !== 'bauen' && (e.target as HTMLElement).closest?.('.planer-3d')) {
      if (loescheZiel()) e.preventDefault();
    }
  };

  return (
    <div className="planer" data-planer-modus={modus} data-planer-ansicht={ansicht} data-planer-webgl={webgl ? 'ja' : 'nein'} data-gestalt-modus-aktiv={gestaltModus} onKeyDown={tasten}>
      {modus === 'start' ? (
        <Startbildschirm />
      ) : (
        <>
          <h2 className="visually-hidden">Grundriss bearbeiten und gestalten</h2>
          <Werkzeugleiste webgl={webgl} />
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
            {ansicht === '2d' && gestaltModus === 'bauen' && (
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
                {ansicht === '2d' ? <Editor2D erweiterung={erweiterung} /> : <Bereich3D webgl={webgl} leicht={leicht} />}
                <Meldung />
              </div>
              {ansicht === '2d' && (
                <p className="planer-hilfe" id="planer-editor-hilfe">
                  {gestaltModus === 'bauen' ? HILFE[werkzeug] : GESTALT_HILFE[gestaltModus]} Tastatur: Pfeiltasten bewegen den Zeiger (Umschalt 1 m, Alt 1 cm), Eingabetaste setzt, Entf löscht, Strg+Z macht rückgängig, + und − zoomen.
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
            <Seitenleiste webgl={webgl} />
          </div>
        </>
      )}
      <p className="planer-hinweis" data-planer-hinweis="">
        {HINWEIS}
      </p>
    </div>
  );
}
