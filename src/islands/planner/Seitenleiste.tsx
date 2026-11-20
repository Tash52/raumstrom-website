// Side panel: tool settings, properties of the selection (numeric editing), room list.
import { useEffect, useState } from 'react';
import {
  WANDDICKE,
  WANDDICKEN,
  aendereOeffnung,
  aendereWand,
  entferneOeffnung,
  entferneWand,
  formatFlaeche,
  formatLaenge,
  inZentimeter,
  parseLaenge,
  platziereOeffnung,
  raumHoehe,
  setzeWandLaenge,
  wandLaenge,
} from '../../lib/geometry/index.ts';
import { knotenVon, planerStore, usePlaner } from './store.ts';

const cm = (m: number) => inZentimeter(m).toLocaleString('de-DE');
const dickeText = (d: number) => `${cm(d)} cm`;

/** Number field in cm that commits on Enter or blur. */
function MassFeld({ id, label, wert, onSetze, min = 1, max = 5000 }: { id: string; label: string; wert: number; onSetze: (m: number) => void; min?: number; max?: number }) {
  const [text, setText] = useState(cm(wert));
  useEffect(() => setText(cm(wert)), [wert]);
  const uebernehmen = () => {
    const m = parseLaenge(text, 'cm');
    if (m === null || m * 100 < min || m * 100 > max) {
      planerStore.getState().melde(`${label}: bitte einen Wert zwischen ${min} und ${max} cm eingeben.`, 'fehler');
      setText(cm(wert));
      return;
    }
    if (Math.abs(m - wert) > 0.0005) onSetze(m);
  };
  return (
    <div className="planer-feld">
      <label htmlFor={id}>{label}</label>
      <span className="planer-einheit">
        <input
          id={id}
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          onBlur={uebernehmen}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              uebernehmen();
            }
          }}
        />
        <span aria-hidden="true">cm</span>
      </span>
    </div>
  );
}

function Wandeinstellungen() {
  const wandArt = usePlaner((s) => s.wandArt);
  const wandDicke = usePlaner((s) => s.wandDicke);
  const winkelFang = usePlaner((s) => s.winkelFang);
  const rasterFang = usePlaner((s) => s.rasterFang);
  const st = planerStore.getState();
  return (
    <fieldset className="planer-gruppe">
      <legend>Neue Wände</legend>
      <div className="planer-feld">
        <label htmlFor="planer-wandart">Art</label>
        <select
          id="planer-wandart"
          value={wandArt}
          onChange={(e) => {
            const art = e.currentTarget.value as 'innen' | 'aussen';
            st.setze({ wandArt: art, wandDicke: WANDDICKE[art] });
          }}
        >
          <option value="aussen">Außenwand</option>
          <option value="innen">Innenwand</option>
        </select>
      </div>
      <div className="planer-feld">
        <label htmlFor="planer-wanddicke">Wandstärke</label>
        <select id="planer-wanddicke" value={wandDicke} onChange={(e) => st.setze({ wandDicke: Number(e.currentTarget.value) })}>
          {WANDDICKEN.map((d) => (
            <option key={d} value={d}>
              {dickeText(d)}
            </option>
          ))}
        </select>
      </div>
      <label className="planer-schalter">
        <input type="checkbox" checked={winkelFang} onChange={(e) => st.setze({ winkelFang: e.currentTarget.checked })} />
        Einrasten bei 90° und 45°
      </label>
      <label className="planer-schalter">
        <input type="checkbox" checked={rasterFang} onChange={(e) => st.setze({ rasterFang: e.currentTarget.checked })} />
        Raster 5 cm
      </label>
    </fieldset>
  );
}

function GrundrissEinstellungen() {
  const g = usePlaner((s) => s.projekt.grundriss);
  const sichtbar = usePlaner((s) => s.hintergrundSichtbar);
  const bild = usePlaner((s) => s.hintergrund);
  const werkzeug = usePlaner((s) => s.werkzeug);
  const punkte = usePlaner((s) => s.kalibrierPunkte);
  const [laenge, setLaenge] = useState('');
  const st = planerStore.getState();
  if (!g) return null;
  return (
    <fieldset className="planer-gruppe" data-planer-kalibrierung="">
      <legend>Grundriss</legend>
      {!bild && <p className="planer-klein">Das Bild ist nach dem Neuladen nicht mehr vorhanden. Bitte erneut hochladen.</p>}
      {werkzeug === 'massstab' ? (
        <div className="planer-kalibrier">
          <p className="planer-klein">
            Klicken Sie zwei Punkte einer bekannten Strecke an, zum Beispiel eine Maßkette oder eine Türbreite (oft 88,5 cm). Tastatur: Pfeiltasten und Eingabetaste.
          </p>
          <p className="planer-klein" aria-live="polite">
            Punkte gesetzt: {punkte.length} von 2
          </p>
          <form
            className="planer-zeile"
            onSubmit={(e) => {
              e.preventDefault();
              const m = parseLaenge(laenge, 'cm');
              if (!m) {
                st.melde('Bitte die Länge in Zentimetern eingeben, z. B. 88,5.', 'fehler');
                return;
              }
              if (punkte.length < 2) {
                st.melde('Bitte zuerst zwei Punkte auf dem Grundriss setzen.', 'fehler');
                return;
              }
              if (st.kalibriere(m)) setLaenge('');
            }}
          >
            <div className="planer-feld">
              <label htmlFor="planer-kalibrier-laenge">Tatsächliche Länge</label>
              <span className="planer-einheit">
                <input id="planer-kalibrier-laenge" inputMode="decimal" value={laenge} onChange={(e) => setLaenge(e.currentTarget.value)} placeholder="88,5" />
                <span aria-hidden="true">cm</span>
              </span>
            </div>
            <button type="submit" className="planer-knopf planer-knopf-primaer" disabled={punkte.length < 2}>
              Übernehmen
            </button>
          </form>
          <button type="button" className="planer-link" onClick={() => st.setze({ werkzeug: 'wand', kalibrierPunkte: [] })}>
            Überspringen und ohne Maßstab zeichnen
          </button>
        </div>
      ) : (
        <p className="planer-klein">
          {g.kalibriert ? `Maßstab festgelegt (${g.kalibrierung ? formatLaenge(g.kalibrierung.laenge) : ''}).` : 'Maßstab noch nicht festgelegt, Maße sind geschätzt.'}{' '}
          <button type="button" className="planer-link" onClick={() => st.setze({ werkzeug: 'massstab', kalibrierPunkte: [] })}>
            {g.kalibriert ? 'Neu festlegen' : 'Jetzt festlegen'}
          </button>
        </p>
      )}
      {bild && (
        <>
          <label className="planer-schalter">
            <input type="checkbox" checked={sichtbar} onChange={(e) => st.setze({ hintergrundSichtbar: e.currentTarget.checked })} />
            Grundriss anzeigen
          </label>
          <div className="planer-feld">
            <label htmlFor="planer-deckkraft">Deckkraft</label>
            <input
              id="planer-deckkraft"
              type="range"
              min={10}
              max={100}
              step={5}
              value={Math.round(g.deckkraft * 100)}
              onChange={(e) => {
                const d = Number(e.currentTarget.value) / 100;
                st.ersetze({ ...st.projekt, grundriss: { ...g, deckkraft: d } });
              }}
            />
          </div>
        </>
      )}
    </fieldset>
  );
}

function AuswahlDetails() {
  const auswahl = usePlaner((s) => s.auswahl);
  const projekt = usePlaner((s) => s.projekt);
  const st = planerStore.getState();
  if (!auswahl) return null;

  if (auswahl.art === 'wand') {
    const w = projekt.waende.find((x) => x.id === auswahl.id);
    if (!w) return null;
    const l = wandLaenge(projekt, w, knotenVon(projekt));
    const nr = projekt.waende.indexOf(w) + 1;
    const einsetzen = (art: 'tuer' | 'fenster') => {
      const k = knotenVon(projekt);
      const a = k.get(w.von)!;
      const b = k.get(w.bis)!;
      const r = platziereOeffnung(projekt, art, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, 0.01);
      if (!r.ok) return st.melde(r.fehler, 'fehler');
      st.aendere(() => r.projekt, art === 'tuer' ? 'Tür in der Wandmitte eingesetzt.' : 'Fenster in der Wandmitte eingesetzt.');
      st.setze({ auswahl: { art: 'oeffnung', id: r.id } });
    };
    return (
      <fieldset className="planer-gruppe" data-planer-auswahl="wand">
        <legend>Wand {nr}</legend>
        <MassFeld id="planer-wandlaenge" label="Länge" wert={l} min={5} onSetze={(m) => st.aendere((p) => setzeWandLaenge(p, w.id, m), `Wandlänge ${formatLaenge(m)}.`)} />
        <div className="planer-feld">
          <label htmlFor="planer-auswahl-dicke">Wandstärke</label>
          <select id="planer-auswahl-dicke" value={w.dicke} onChange={(e) => st.aendere((p) => aendereWand(p, w.id, { dicke: Number(e.currentTarget.value) }), 'Wandstärke geändert.')}>
            {[...new Set([...WANDDICKEN, w.dicke])].sort((a, b) => a - b).map((d) => (
              <option key={d} value={d}>
                {dickeText(d)}
              </option>
            ))}
          </select>
        </div>
        <div className="planer-feld">
          <label htmlFor="planer-auswahl-art">Art</label>
          <select id="planer-auswahl-art" value={w.art} onChange={(e) => st.aendere((p) => aendereWand(p, w.id, { art: e.currentTarget.value as 'innen' | 'aussen' }), 'Wandart geändert.')}>
            <option value="aussen">Außenwand</option>
            <option value="innen">Innenwand</option>
          </select>
        </div>
        <div className="planer-knopfreihe">
          <button type="button" className="planer-knopf" onClick={() => einsetzen('tuer')}>
            Tür einsetzen
          </button>
          <button type="button" className="planer-knopf" onClick={() => einsetzen('fenster')}>
            Fenster einsetzen
          </button>
          <button type="button" className="planer-knopf planer-knopf-gefahr" onClick={() => st.aendere((p) => entferneWand(p, w.id), 'Wand gelöscht.')}>
            Wand löschen
          </button>
        </div>
      </fieldset>
    );
  }

  if (auswahl.art === 'oeffnung') {
    const o = projekt.oeffnungen.find((x) => x.id === auswahl.id);
    if (!o) return null;
    const name = o.art === 'tuer' ? 'Tür' : 'Fenster';
    const setze = (a: Parameters<typeof aendereOeffnung>[2]) => st.aendere((p) => aendereOeffnung(p, o.id, a), `${name} geändert.`);
    return (
      <fieldset className="planer-gruppe" data-planer-auswahl="oeffnung">
        <legend>{name}</legend>
        <MassFeld id="planer-oeffnung-breite" label="Breite" wert={o.breite} min={20} max={600} onSetze={(m) => setze({ breite: m })} />
        <MassFeld id="planer-oeffnung-hoehe" label="Höhe" wert={o.hoehe} min={20} max={400} onSetze={(m) => setze({ hoehe: m })} />
        {o.art === 'fenster' && <MassFeld id="planer-oeffnung-bruestung" label="Brüstungshöhe" wert={o.bruestung} min={0} max={300} onSetze={(m) => setze({ bruestung: m })} />}
        <MassFeld id="planer-oeffnung-abstand" label="Abstand Mitte zum Wandanfang" wert={o.abstand} onSetze={(m) => setze({ abstand: m })} />
        {o.art === 'tuer' && (
          <div className="planer-knopfreihe">
            <button type="button" className="planer-knopf" onClick={() => setze({ anschlag: o.anschlag === 'links' ? 'rechts' : 'links' })}>
              Anschlag wechseln
            </button>
            <button type="button" className="planer-knopf" onClick={() => setze({ aufschlag: o.aufschlag === 'links' ? 'rechts' : 'links' })}>
              Aufschlagrichtung wechseln
            </button>
          </div>
        )}
        <p className="planer-klein">Verschieben: ziehen oder Pfeiltasten im Plan.</p>
        <button type="button" className="planer-knopf planer-knopf-gefahr" onClick={() => st.aendere((p) => entferneOeffnung(p, o.id), `${name} gelöscht.`)}>
          {name} löschen
        </button>
      </fieldset>
    );
  }

  if (auswahl.art === 'raum') {
    const r = projekt.raeume.find((x) => x.id === auswahl.id);
    if (!r) return null;
    return (
      <fieldset className="planer-gruppe" data-planer-auswahl="raum">
        <legend>Raum</legend>
        <div className="planer-feld">
          <label htmlFor="planer-raum-name">Name</label>
          <input
            id="planer-raum-name"
            key={r.id}
            defaultValue={r.name}
            maxLength={60}
            onBlur={(e) => {
              const name = e.currentTarget.value.trim();
              if (name && name !== r.name) st.aendere((p) => ({ ...p, raeume: p.raeume.map((x) => (x.id === r.id ? { ...x, name } : x)) }), `Raum heißt jetzt ${name}.`);
            }}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
        </div>
        <MassFeld
          id="planer-raum-hoehe"
          label="Raumhöhe"
          wert={raumHoehe(projekt, r)}
          min={180}
          max={600}
          onSetze={(m) => st.aendere((p) => ({ ...p, raeume: p.raeume.map((x) => (x.id === r.id ? { ...x, hoehe: m } : x)) }), `Raumhöhe ${formatLaenge(m)}.`)}
        />
        <p>
          Fläche (lichtes Maß): <strong>ca. {formatFlaeche(r.flaeche)}</strong>
        </p>
      </fieldset>
    );
  }

  const k = projekt.knoten.find((x) => x.id === auswahl.id);
  if (!k) return null;
  return (
    <fieldset className="planer-gruppe" data-planer-auswahl="knoten">
      <legend>Eckpunkt</legend>
      <p className="planer-klein">Ziehen oder mit den Pfeiltasten verschieben (Umschalt: 1 m, Alt: 1 cm). Entf löscht den Eckpunkt mit seinen Wänden.</p>
    </fieldset>
  );
}

function Raumliste() {
  const raeume = usePlaner((s) => s.projekt.raeume);
  const auswahl = usePlaner((s) => s.auswahl);
  const summe = raeume.reduce((s, r) => s + r.flaeche, 0);
  return (
    <section className="planer-gruppe" aria-labelledby="planer-raeume-titel" data-planer-raeume="">
      <h3 id="planer-raeume-titel" className="planer-gruppe-titel">
        Räume ({raeume.length})
      </h3>
      {raeume.length === 0 ? (
        <p className="planer-klein">Noch kein geschlossener Raum. Räume werden automatisch erkannt, sobald Wände einen Bereich umschließen.</p>
      ) : (
        <>
          <ul className="planer-raumliste" role="list">
            {raeume.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className={`planer-raum-knopf${auswahl?.art === 'raum' && auswahl.id === r.id ? ' ist-ausgewaehlt' : ''}`}
                  aria-pressed={auswahl?.art === 'raum' && auswahl.id === r.id}
                  onClick={() => planerStore.getState().setze({ auswahl: { art: 'raum', id: r.id }, werkzeug: 'auswahl' })}
                >
                  <span>{r.name}</span>
                  <span className="planer-zahl">{formatFlaeche(r.flaeche)}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="planer-summe">
            <span>Summe</span> <span className="planer-zahl">ca. {formatFlaeche(summe)}</span>
          </p>
        </>
      )}
    </section>
  );
}

function Wandliste() {
  const projekt = usePlaner((s) => s.projekt);
  if (!projekt.waende.length) return null;
  const km = knotenVon(projekt);
  return (
    <details className="planer-gruppe planer-wandliste">
      <summary>Wände ({projekt.waende.length})</summary>
      <ul role="list">
        {projekt.waende.map((w, i) => (
          <li key={w.id}>
            <button type="button" className="planer-link" onClick={() => planerStore.getState().setze({ auswahl: { art: 'wand', id: w.id }, werkzeug: 'auswahl' })}>
              Wand {i + 1}: {formatLaenge(wandLaenge(projekt, w, km))}, {w.art === 'aussen' ? 'außen' : 'innen'} {dickeText(w.dicke)}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function Seitenleiste() {
  const werkzeug = usePlaner((s) => s.werkzeug);
  const ansicht = usePlaner((s) => s.ansicht);
  return (
    <aside className="planer-seite" aria-label="Eigenschaften">
      {ansicht === '2d' && <GrundrissEinstellungen />}
      <AuswahlDetails />
      {ansicht === '2d' && (werkzeug === 'wand' || werkzeug === 'auswahl') && <Wandeinstellungen />}
      <Raumliste />
      <Wandliste />
    </aside>
  );
}
