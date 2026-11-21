// Side panel of the design modes: tile selection with previews, options, target, scope, pipette,
// style packages, electro (types, heights, zones, bill of materials), doors and windows, furniture, view.
import { useEffect, useMemo, useState } from 'react';
import {
  type MaterialRef,
  type Oeffnung,
  type OeffnungGestaltung,
  aendereElektro,
  formatLaenge,
  inZentimeter,
  parseLaenge,
  wandAbschnitte,
} from '../../../lib/geometry/index.ts';
import {
  ELEKTRO_TYPEN,
  KATEGORIEN,
  STANDARDHOEHEN,
  type HoehenGruppe,
  alleZonen,
  elektroGesamt,
  elektroStueckliste,
  elektroTypVon,
  inZone,
  ZONEN_NAME,
  type ZonenArt,
} from '../../../lib/electro/index.ts';
import {
  FENSTER_STILE,
  FORMATE,
  FUGENFARBEN,
  GLAESER,
  HOLZTOENE,
  type Kategorie,
  MOEBEL,
  MUSTER,
  NUR_VISUALISIERUNG,
  OEFFNUNG_FARBEN,
  PALETTEN,
  TAPETEN,
  TUER_STILE,
  ZARGEN,
  beschreibeRef,
  farbName,
  materialVon,
  materialeFuer,
  moebelVon,
  normalisiereRef,
  standardRef,
} from '../../../lib/materials/index.ts';
import { planerStore, usePlaner } from '../store.ts';
import {
  dreheMoebel,
  gueltigesZiel,
  loescheZiel,
  nimmPipette,
  verschiebeZiel,
  wendeAn,
  wendeStilpaketAn,
  zielRaum,
} from './aktionen.ts';
import { type Bereich, type Wahl, gestaltStore, useGestalt } from './store.ts';
import { Farbfeld, Kachel, Vorschau, farbRef } from './ui.tsx';

const st = () => planerStore.getState();
const cm = (m: number) => inZentimeter(m).toLocaleString('de-DE');

const WAHL_TEIL: Record<'waende' | 'boden' | 'fliesen' | 'decke', keyof Wahl> = { waende: 'wand', boden: 'boden', fliesen: 'fliesen', decke: 'decke' };
const KAT: Record<'waende' | 'boden' | 'fliesen' | 'decke', Kategorie> = { waende: 'wand', boden: 'boden', fliesen: 'fliesen', decke: 'decke' };

function ZielAnzeige() {
  const ziel = useGestalt((s) => s.ziel);
  const projekt = usePlaner((s) => s.projekt);
  const z = gueltigesZiel(projekt, ziel);
  const raumName = (id: string | null) => projekt.raeume.find((r) => r.id === id)?.name;
  let text = 'Noch nichts gewählt. Tippen Sie in der Ansicht auf eine Fläche oder wählen Sie unten einen Raum.';
  if (z?.art === 'wandseite') {
    const nr = projekt.waende.findIndex((w) => w.id === z.wandId) + 1;
    text = `Wand ${nr}, Seite ${z.raumId ? `zu ${raumName(z.raumId)}` : 'außen'}`;
  } else if (z?.art === 'boden') text = `Boden: ${raumName(z.raumId)}`;
  else if (z?.art === 'decke') text = `Decke: ${raumName(z.raumId)}`;
  else if (!z) {
    const r = zielRaum(null, projekt);
    if (r) text = `Raum: ${raumName(r)}`;
  }
  return (
    <p className="gestalt-ziel" aria-live="polite" data-gestalt-ziel={z?.art ?? 'keins'}>
      <span className="planer-klein">Ziel: </span>
      {text}
    </p>
  );
}

function BereichWahl({ nurRaum = false }: { nurRaum?: boolean }) {
  const bereich = useGestalt((s) => s.bereich);
  const optionen: Array<[Bereich, string]> = [
    ['flaeche', nurRaum ? 'Fläche' : 'Wandseite / Fläche'],
    ['raum', 'Ganzer Raum'],
    ['wohnung', 'Alle Räume'],
  ];
  return (
    <fieldset className="gestalt-segment">
      <legend>Anwenden auf</legend>
      {optionen.map(([id, name]) => (
        <label key={id}>
          <input type="radio" name="gestalt-bereich" checked={bereich === id} onChange={() => gestaltStore.getState().setze({ bereich: id })} />
          <span>{name}</span>
        </label>
      ))}
    </fieldset>
  );
}

/** Keyboard path to a wall side: walls of the selected room. */
function WandseitenWahl() {
  const projekt = usePlaner((s) => s.projekt);
  const ziel = useGestalt((s) => s.ziel);
  const raumId = zielRaum(ziel, projekt);
  if (!raumId) return null;
  const abschnitte = wandAbschnitte(projekt, raumId);
  const wert = ziel?.art === 'wandseite' ? `${ziel.wandId}:${ziel.seite}` : '';
  return (
    <div className="planer-feld">
      <label htmlFor="gestalt-wandseite">Wandseite im Raum</label>
      <select
        id="gestalt-wandseite"
        value={wert}
        onChange={(e) => {
          const [wandId, seite] = e.currentTarget.value.split(':') as [string, 'links' | 'rechts'];
          if (!wandId) return gestaltStore.getState().setze({ ziel: { art: 'boden', raumId } });
          gestaltStore.getState().setze({ ziel: { art: 'wandseite', wandId, seite, raumId } });
        }}
      >
        <option value="">Ganzer Raum (keine einzelne Wand)</option>
        {abschnitte.map((a, i) => (
          <option key={`${a.wandId}:${a.seite}`} value={`${a.wandId}:${a.seite}`}>
            Wand {i + 1} ({formatLaenge(a.laengeInnen)})
          </option>
        ))}
      </select>
    </div>
  );
}

function Stilpakete() {
  const pakete = useGestalt((s) => s.stilpakete);
  if (!pakete.length) return null;
  return (
    <details className="planer-gruppe gestalt-pakete" data-gestalt-stilpakete="">
      <summary>Ideenlos? Stilpakete {pakete[0]?.saison}</summary>
      <ul className="gestalt-paketliste" role="list">
        {pakete.map((p) => (
          <li key={p.id} className="gestalt-paket" data-stilpaket={p.id}>
            <div className="gestalt-paket-kopf">
              <strong>{p.name}</strong>
              <span className="gestalt-paket-farben" aria-hidden="true">
                {p.wandfarben.map((f) => (
                  <span key={f.hex} className="gestalt-farbpunkt" ref={farbRef(f.hex)} />
                ))}
                <span className="gestalt-farbpunkt" ref={farbRef(p.boden.farbton.hex)} />
              </span>
            </div>
            <p className="planer-klein">{p.beschreibung}</p>
            <p className="planer-klein">
              Elektro-Vorschlag „{p.elektro_vorschlag.paket}": {p.elektro_vorschlag.punkte.join(', ')}.
            </p>
            <div className="planer-knopfreihe">
              <button type="button" className="planer-knopf" onClick={() => wendeStilpaketAn(p, 'raum')}>
                Auf Raum
              </button>
              <button type="button" className="planer-knopf" onClick={() => wendeStilpaketAn(p, 'wohnung')}>
                Auf Wohnung
              </button>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Pick a tile: keep the user's colour where the new material takes free colours. */
function neueWahl(id: string, alt: MaterialRef | null, kat: Kategorie): MaterialRef {
  const basis = standardRef(id);
  const m = materialVon(id);
  const altM = materialVon(alt?.material);
  if (alt?.farbe && m?.optionen.farbe && m.optionen.farbe === altM?.optionen.farbe) basis.farbe = alt.farbe;
  if (alt?.fuge && m?.optionen.fuge) basis.fuge = alt.fuge;
  if (alt?.format && m?.optionen.formate?.includes(alt.format)) basis.format = alt.format;
  if (alt?.muster && m?.optionen.muster?.includes(alt.muster)) basis.muster = alt.muster;
  if (alt?.fliesenhoehe && m?.optionen.fliesenhoehe) basis.fliesenhoehe = alt.fliesenhoehe;
  return normalisiereRef(basis, kat)!;
}

function Optionen({ wahl, kat, onAendern }: { wahl: MaterialRef; kat: Kategorie; onAendern: (r: MaterialRef, sofort: boolean) => void }) {
  const m = materialVon(wahl.material);
  const [eigene, setEigene] = useState(wahl.farbe ?? '#f4f1ea');
  useEffect(() => setEigene(wahl.farbe ?? '#f4f1ea'), [wahl.farbe]);
  if (!m) return null;
  const o = m.optionen;
  const setze = (teil: Partial<MaterialRef>, sofort = true) => onAendern(normalisiereRef({ ...wahl, ...teil }, kat)!, sofort);
  return (
    <div className="gestalt-optionen">
      {o.farbe === 'frei' && (
        <div className="gestalt-paletten">
          {PALETTEN.map((p) => (
            <div key={p.id} role="group" aria-label={p.name} className="gestalt-palette">
              <span className="planer-klein">{p.name}</span>
              <div className="gestalt-farben">
                {p.farben.map((f) => (
                  <Farbfeld key={f.hex} hex={f.hex} name={f.name} gewaehlt={wahl.farbe === f.hex} onWahl={() => setze({ farbe: f.hex })} />
                ))}
              </div>
            </div>
          ))}
          <div className="planer-zeile">
            <div className="planer-feld">
              <label htmlFor="gestalt-farbrad">Eigene Farbe (Farbrad)</label>
              <input id="gestalt-farbrad" type="color" value={eigene} onChange={(e) => setEigene(e.currentTarget.value)} className="gestalt-farbrad" />
            </div>
            <button type="button" className="planer-knopf" onClick={() => setze({ farbe: eigene.toLowerCase() })}>
              Farbe übernehmen
            </button>
          </div>
        </div>
      )}
      {o.farbe === 'holz' && (
        <div role="group" aria-label="Holzton" className="gestalt-palette">
          <span className="planer-klein">Holzton</span>
          <div className="gestalt-farben">
            {HOLZTOENE.map((f) => (
              <Farbfeld key={f.hex} hex={f.hex} name={f.name} gewaehlt={wahl.farbe === f.hex} onWahl={() => setze({ farbe: f.hex })} />
            ))}
          </div>
        </div>
      )}
      {o.tapete && (
        <div className="planer-feld">
          <label htmlFor="gestalt-tapete">Tapetendesign</label>
          <select id="gestalt-tapete" value={wahl.muster} onChange={(e) => setze({ muster: e.currentTarget.value })}>
            {TAPETEN.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {o.formate && (
        <div className="planer-feld">
          <label htmlFor="gestalt-format">Format</label>
          <select id="gestalt-format" value={wahl.format} onChange={(e) => setze({ format: e.currentTarget.value })}>
            {FORMATE.filter((f) => o.formate!.includes(f.id)).map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {o.muster && wahl.format !== 'hexagon' && (
        <div className="planer-feld">
          <label htmlFor="gestalt-muster">Verlegemuster</label>
          <select
            id="gestalt-muster"
            value={wahl.muster}
            onChange={(e) => {
              const muster = e.currentTarget.value;
              // planks: herringbone and chevron need short parquet staves, wild bond the long plank
              const teil: Partial<MaterialRef> = { muster };
              if (kat === 'boden' && m.optionen.farbe === 'holz') teil.format = muster === 'fischgraet' || muster === 'chevron' ? 'stab' : muster === 'landhausdiele' ? 'diele-lang' : (m.standard.format ?? 'diele');
              setze(teil);
            }}
          >
            {MUSTER.filter((x) => o.muster!.includes(x.id)).map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {o.richtung && (
        <div className="planer-feld">
          <label htmlFor="gestalt-richtung">Verlegerichtung</label>
          <select id="gestalt-richtung" value={String(wahl.richtungGrad ?? 0)} onChange={(e) => setze({ richtungGrad: Number(e.currentTarget.value) })}>
            <option value="0">Längs (0°)</option>
            <option value="90">Quer (90°)</option>
            <option value="45">Schräg (45°)</option>
            <option value="135">Schräg (135°)</option>
          </select>
        </div>
      )}
      {o.fuge && wahl.fuge && (
        <div className="planer-zeile">
          <div className="planer-feld">
            <label htmlFor="gestalt-fugenfarbe">Fugenfarbe</label>
            <select id="gestalt-fugenfarbe" value={wahl.fuge.farbe} onChange={(e) => setze({ fuge: { ...wahl.fuge!, farbe: e.currentTarget.value } })}>
              {[...FUGENFARBEN, ...(FUGENFARBEN.some((f) => f.hex === wahl.fuge!.farbe) ? [] : [{ name: wahl.fuge.farbe.toUpperCase(), hex: wahl.fuge.farbe }])].map((f) => (
                <option key={f.hex} value={f.hex}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div className="planer-feld">
            <label htmlFor="gestalt-fugenbreite">Fugenbreite</label>
            <select id="gestalt-fugenbreite" value={String(wahl.fuge.breiteMm)} onChange={(e) => setze({ fuge: { ...wahl.fuge!, breiteMm: Number(e.currentTarget.value) } })}>
              {[...new Set([1, 2, 3, 5, 8, wahl.fuge.breiteMm])].sort((a, b) => a - b).map((b) => (
                <option key={b} value={String(b)}>
                  {String(b).replace('.', ',')} mm
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      {o.fliesenhoehe && kat === 'fliesen' && (
        <div className="planer-feld">
          <label htmlFor="gestalt-fliesenhoehe">Fliesenhöhe an der Wand</label>
          <select id="gestalt-fliesenhoehe" value={wahl.fliesenhoehe ?? 'halbhoch'} onChange={(e) => setze({ fliesenhoehe: e.currentTarget.value as MaterialRef['fliesenhoehe'] })}>
            <option value="raumhoch">Raumhoch</option>
            <option value="halbhoch">Halbhoch (120 cm)</option>
            <option value="spritzschutz">Spritzschutz (90–150 cm)</option>
          </select>
        </div>
      )}
      {m.hinweis && <p className="planer-klein">{m.hinweis}</p>}
    </div>
  );
}

function FlaechenPanel({ modus }: { modus: 'waende' | 'boden' | 'fliesen' | 'decke' }) {
  const teil = WAHL_TEIL[modus];
  const kat = KAT[modus];
  const wahl = useGestalt((s) => s.wahl[teil]);
  const pipette = useGestalt((s) => s.pipette);
  const ziel = useGestalt((s) => s.ziel);
  const fliesenZiel = useGestalt((s) => s.fliesenZiel);
  const projekt = usePlaner((s) => s.projekt);
  const g = gestaltStore.getState();
  const eintraege = useMemo(() => materialeFuer(kat), [kat]);
  const gruppen = [...new Set(eintraege.map((e) => e.gruppe))];
  const kannSofort = () => {
    const s = gestaltStore.getState();
    return Boolean(gueltigesZiel(st().projekt, s.ziel)) || s.bereich === 'wohnung' || Boolean(zielRaum());
  };
  const aendern = (r: MaterialRef, sofort: boolean) => {
    g.waehle(teil, r);
    if (sofort && kannSofort()) wendeAn(r);
  };
  const raumId = zielRaum(ziel, projekt);
  const sockel = raumId ? projekt.raeume.find((r) => r.id === raumId)?.gestaltung.sockelleiste : null;
  return (
    <>
      <ZielAnzeige />
      {modus === 'fliesen' && (
        <fieldset className="gestalt-segment">
          <legend>Fliesen für</legend>
          {(['wand', 'boden'] as const).map((z) => (
            <label key={z}>
              <input type="radio" name="gestalt-fliesenziel" checked={fliesenZiel === z} onChange={() => g.setze({ fliesenZiel: z })} />
              <span>{z === 'wand' ? 'Wände' : 'Boden'}</span>
            </label>
          ))}
        </fieldset>
      )}
      {(modus === 'waende' || (modus === 'fliesen' && fliesenZiel === 'wand')) && <WandseitenWahl />}
      <BereichWahl nurRaum={modus === 'boden' || modus === 'decke'} />
      <div className="planer-knopfreihe">
        <button
          type="button"
          className="planer-knopf"
          aria-pressed={pipette}
          data-gestalt-pipette=""
          onClick={() => {
            const z = gueltigesZiel(st().projekt, gestaltStore.getState().ziel);
            if (z) nimmPipette(z);
            else {
              g.setze({ pipette: !pipette });
              if (!pipette) st().melde('Pipette aktiv: Tippen Sie auf die Fläche, deren Material Sie übernehmen möchten.');
            }
          }}
        >
          Pipette
        </button>
        <button type="button" className="planer-knopf planer-knopf-primaer" disabled={!wahl} onClick={() => wahl && wendeAn(wahl)} data-gestalt-anwenden="">
          Anwenden
        </button>
        {(modus === 'fliesen' || modus === 'waende') && (
          <button type="button" className="planer-knopf" onClick={() => wendeAn(null)}>
            {modus === 'fliesen' ? 'Fliesen entfernen' : 'Zurücksetzen'}
          </button>
        )}
      </div>
      <Stilpakete />
      {gruppen.map((gr) => (
        <section key={gr} className="gestalt-gruppe" aria-label={gr}>
          <h4 className="gestalt-gruppe-titel">{gr}</h4>
          <div className="gestalt-kacheln">
            {eintraege
              .filter((e) => e.gruppe === gr)
              .map((e) => {
                const vorschau = wahl?.material === e.id ? wahl : neueWahl(e.id, wahl, kat);
                return (
                  <Kachel key={e.id} name={e.name} gewaehlt={wahl?.material === e.id} data={e.id} onWahl={() => aendern(neueWahl(e.id, wahl, kat), true)}>
                    <Vorschau wert={vorschau} />
                  </Kachel>
                );
              })}
          </div>
        </section>
      ))}
      {wahl && (
        <section className="planer-gruppe" aria-labelledby="gestalt-optionen-titel">
          <h4 id="gestalt-optionen-titel" className="planer-gruppe-titel">
            {materialVon(wahl.material)?.name}
          </h4>
          <p className="planer-klein">{beschreibeRef(wahl, farbName)}</p>
          <Optionen wahl={wahl} kat={kat} onAendern={aendern} />
        </section>
      )}
      {modus === 'boden' && (
        <div className="planer-feld">
          <label htmlFor="gestalt-sockel">Sockelleiste {raumId ? 'im gewählten Raum' : ''}</label>
          <select
            id="gestalt-sockel"
            value={sockel?.material ?? ''}
            onChange={(e) => {
              const v = e.currentTarget.value;
              const ref = v ? { ...standardRef(v), ...(v === 'sockel.holz' && wahl?.farbe ? { farbe: wahl.farbe } : {}) } : null;
              wendeAn(ref, { teil: 'sockelleiste', bereich: gestaltStore.getState().bereich === 'wohnung' ? 'wohnung' : 'raum' });
            }}
          >
            <option value="">Keine</option>
            {materialeFuer('sockelleiste').map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}

// ---------- doors and windows ----------

function OeffnungenPanel() {
  const projekt = usePlaner((s) => s.projekt);
  const ziel = useGestalt((s) => s.ziel);
  const z = gueltigesZiel(projekt, ziel);
  const o = z?.art === 'oeffnung' ? projekt.oeffnungen.find((x) => x.id === z.id) : undefined;
  const liste = projekt.oeffnungen;
  const nr = (x: Oeffnung) => liste.filter((y) => y.art === x.art).indexOf(x) + 1;
  const setze = (teil: Partial<OeffnungGestaltung>, alle = false) => {
    if (!o) return;
    const ziele = alle ? liste.filter((x) => x.art === o.art).map((x) => x.id) : [o.id];
    st().aendere(
      (p) => ({ ...p, oeffnungen: p.oeffnungen.map((x) => (ziele.includes(x.id) ? { ...x, gestaltung: { ...(x.gestaltung ?? {}), ...(alle ? (o.gestaltung ?? {}) : {}), ...teil } } : x)) }),
      alle ? `Auf alle ${o.art === 'tuer' ? 'Türen' : 'Fenster'} übertragen.` : `${o.art === 'tuer' ? 'Tür' : 'Fenster'} geändert.`,
    );
  };
  return (
    <>
      <div className="planer-feld">
        <label htmlFor="gestalt-oeffnung">Tür oder Fenster</label>
        <select id="gestalt-oeffnung" value={o?.id ?? ''} onChange={(e) => gestaltStore.getState().setze({ ziel: e.currentTarget.value ? { art: 'oeffnung', id: e.currentTarget.value } : null })}>
          <option value="">Bitte wählen (oder in der Ansicht antippen)</option>
          {liste.map((x) => (
            <option key={x.id} value={x.id}>
              {x.art === 'tuer' ? 'Tür' : 'Fenster'} {nr(x)} ({formatLaenge(x.breite)})
            </option>
          ))}
        </select>
      </div>
      {!liste.length && <p className="planer-klein">Noch keine Türen oder Fenster. Setzen Sie sie im Modus Bauen.</p>}
      {o && (
        <>
          <section className="gestalt-gruppe" aria-label={o.art === 'tuer' ? 'Türblatt-Stil' : 'Fensterrahmen'}>
            <h4 className="gestalt-gruppe-titel">{o.art === 'tuer' ? 'Türblatt-Stil' : 'Fensterrahmen'}</h4>
            <div className="gestalt-kacheln">
              {(o.art === 'tuer' ? TUER_STILE : FENSTER_STILE).map((s) => (
                <Kachel key={s.id} name={s.name} data={s.id} gewaehlt={(o.gestaltung?.stil ?? (o.art === 'tuer' ? 'tuer.glatt' : 'fenster.kunststoff')) === s.id} onWahl={() => setze({ stil: s.id, farbe: s.farbe })}>
                  <span className={`gestalt-stil gestalt-stil-${s.id.replace('.', '-')}`} ref={farbRef(s.farbe ?? '#f4f2ee')} aria-hidden="true" />
                </Kachel>
              ))}
            </div>
          </section>
          <div role="group" aria-label="Farbe" className="gestalt-palette">
            <span className="planer-klein">Farbe</span>
            <div className="gestalt-farben">
              {OEFFNUNG_FARBEN.map((f) => (
                <Farbfeld key={f.hex} hex={f.hex} name={f.name} gewaehlt={o.gestaltung?.farbe === f.hex} onWahl={() => setze({ farbe: f.hex })} />
              ))}
            </div>
          </div>
          {o.art === 'tuer' ? (
            <>
              <div className="planer-feld">
                <label htmlFor="gestalt-zarge">Zarge</label>
                <select id="gestalt-zarge" value={o.gestaltung?.zarge ?? 'zarge.umfassung'} onChange={(e) => setze({ zarge: e.currentTarget.value })}>
                  {ZARGEN.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="planer-feld">
                <label htmlFor="gestalt-glas">Glasausschnitt</label>
                <select id="gestalt-glas" value={o.gestaltung?.glas ?? 'glas.ohne'} onChange={(e) => setze({ glas: e.currentTarget.value })}>
                  {GLAESER.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </div>
              <label className="planer-schalter">
                <input type="checkbox" checked={Boolean(o.gestaltung?.schiebetuer)} onChange={(e) => setze({ schiebetuer: e.currentTarget.checked })} />
                Schiebetür (vor der Wand laufend)
              </label>
            </>
          ) : (
            <div className="planer-feld">
              <label htmlFor="gestalt-fensterbank">Fensterbank innen</label>
              <select
                id="gestalt-fensterbank"
                value={o.gestaltung?.fensterbank?.material ?? 'fensterbank.naturstein'}
                onChange={(e) => setze({ fensterbank: normalisiereRef(standardRef(e.currentTarget.value), 'fensterbank')! })}
              >
                {materialeFuer('fensterbank').map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button type="button" className="planer-knopf" onClick={() => setze({}, true)}>
            Auf alle {o.art === 'tuer' ? 'Türen' : 'Fenster'} übertragen
          </button>
        </>
      )}
    </>
  );
}

// ---------- electro ----------

function HoehenFeld({ id, label, wert, onSetze }: { id: string; label: string; wert: number; onSetze: (m: number) => void }) {
  const [text, setText] = useState(cm(wert));
  useEffect(() => setText(cm(wert)), [wert]);
  const ok = () => {
    const m = parseLaenge(text, 'cm');
    if (m === null || m < 0 || m > 6) {
      st().melde(`${label}: bitte einen Wert zwischen 0 und 600 cm eingeben.`, 'fehler');
      setText(cm(wert));
      return;
    }
    if (Math.abs(m - wert) > 0.0005) onSetze(m);
  };
  return (
    <div className="planer-feld">
      <label htmlFor={id}>{label}</label>
      <span className="planer-einheit">
        <input id={id} inputMode="decimal" value={text} onChange={(e) => setText(e.currentTarget.value)} onBlur={ok} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), ok())} />
        <span aria-hidden="true">cm</span>
      </span>
    </div>
  );
}

function Verschieben({ schritt = 0.1 }: { schritt?: number }) {
  return (
    <div className="gestalt-pfeile" role="group" aria-label="Verschieben in 10-cm-Schritten">
      <button type="button" className="planer-icon-knopf" onClick={() => verschiebeZiel(0, -schritt)} aria-label="Nach oben verschieben">
        ↑
      </button>
      <button type="button" className="planer-icon-knopf" onClick={() => verschiebeZiel(-schritt, 0)} aria-label="Nach links verschieben">
        ←
      </button>
      <button type="button" className="planer-icon-knopf" onClick={() => verschiebeZiel(schritt, 0)} aria-label="Nach rechts verschieben">
        →
      </button>
      <button type="button" className="planer-icon-knopf" onClick={() => verschiebeZiel(0, schritt)} aria-label="Nach unten verschieben">
        ↓
      </button>
    </div>
  );
}

export function Stueckliste() {
  const projekt = usePlaner((s) => s.projekt);
  const liste = useMemo(() => elektroStueckliste(projekt), [projekt]);
  const gesamt = useMemo(() => elektroGesamt(liste), [liste]);
  return (
    <details className="planer-gruppe" data-gestalt-stueckliste="" open={liste.length > 0 && liste.length < 4}>
      <summary>Elektro-Stückliste ({gesamt.reduce((s, x) => s + x.anzahl, 0)})</summary>
      {!liste.length ? (
        <p className="planer-klein">Noch keine Elektropunkte gesetzt.</p>
      ) : (
        <>
          {liste.map((r) => (
            <table key={r.raumId ?? 'aussen'} className="gestalt-tabelle">
              <caption>
                {r.raum} <span className="planer-zahl">({r.summe})</span>
              </caption>
              <thead>
                <tr>
                  <th scope="col">Funktion</th>
                  <th scope="col" className="gestalt-zahl">
                    Anzahl
                  </th>
                </tr>
              </thead>
              <tbody>
                {r.posten.map((x) => (
                  <tr key={x.typ}>
                    <td>
                      {x.name}
                      {x.ausserhalbZone > 0 && <span className="gestalt-warnung"> · {x.ausserhalbZone} außerhalb der Installationszonen</span>}
                    </td>
                    <td className="gestalt-zahl planer-zahl">{x.anzahl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
          <p className="planer-klein">Planungshilfe ohne Gewähr; die Ausführung legen wir bei der Besichtigung gemeinsam fest.</p>
        </>
      )}
    </details>
  );
}

function ElektroPanel() {
  const typ = useGestalt((s) => s.elektroTyp);
  const hoehen = useGestalt((s) => s.hoehen);
  const arbeitsplatte = useGestalt((s) => s.ueberArbeitsplatte);
  const ziel = useGestalt((s) => s.ziel);
  const projekt = usePlaner((s) => s.projekt);
  const g = gestaltStore.getState();
  const z = gueltigesZiel(projekt, ziel);
  const e = z?.art === 'elektro' ? projekt.elektro.find((x) => x.id === z.id) : undefined;
  const zonen = useMemo(() => (e ? alleZonen(projekt) : []), [projekt, e]);
  const inDerZone = e ? inZone(e, zonen) : null;
  return (
    <>
      <p className="planer-klein">Typ wählen, dann auf eine Wandseite (Steckdosen, Schalter …) oder in einen Raum (Decke, Boden) tippen. Die Installationszonen werden eingeblendet.</p>
      {KATEGORIEN.map((k) => (
        <section key={k.id} className="gestalt-gruppe" aria-label={k.name}>
          <h4 className="gestalt-gruppe-titel">{k.name}</h4>
          <div className="gestalt-kacheln gestalt-kacheln-klein">
            {ELEKTRO_TYPEN.filter((t) => t.kategorie === k.id).map((t) => (
              <Kachel key={t.id} name={t.name} gewaehlt={typ === t.id} data={t.id} onWahl={() => g.setze({ elektroTyp: t.id })}>
                <span className={`gestalt-symbol gestalt-symbol-${t.kategorie}`} aria-hidden="true">
                  {t.kurz}
                </span>
              </Kachel>
            ))}
          </div>
        </section>
      ))}
      {elektroTypVon(typ)?.kategorie === 'steckdose' && elektroTypVon(typ)?.hoehenGruppe === 'steckdose' && (
        <label className="planer-schalter">
          <input type="checkbox" checked={arbeitsplatte} onChange={(ev) => g.setze({ ueberArbeitsplatte: ev.currentTarget.checked })} />
          Küche: über der Arbeitsplatte ({cm(hoehen.arbeitsplatte ?? STANDARDHOEHEN.arbeitsplatte.hoehe)} cm)
        </label>
      )}
      {e && (
        <fieldset className="planer-gruppe" data-gestalt-elektro={e.id}>
          <legend>{elektroTypVon(e.typ)?.name ?? e.typ}</legend>
          <div className="planer-feld">
            <label htmlFor="gestalt-elektro-typ">Typ ändern</label>
            <select id="gestalt-elektro-typ" value={e.typ} onChange={(ev) => st().aendere((p) => aendereElektro(p, e.id, { typ: ev.currentTarget.value }), 'Typ geändert.')}>
              {ELEKTRO_TYPEN.filter((t) => t.orte.includes(e.ort)).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          {e.ort === 'wand' && (
            <>
              <HoehenFeld id="gestalt-elektro-hoehe" label="Höhe über Fußboden" wert={e.hoehe} onSetze={(m) => st().aendere((p) => aendereElektro(p, e.id, { hoehe: m }), `Höhe ${formatLaenge(m)}.`)} />
              <HoehenFeld id="gestalt-elektro-abstand" label="Abstand vom Wandanfang" wert={e.abstand} onSetze={(m) => st().aendere((p) => aendereElektro(p, e.id, { abstand: m }), 'Lage geändert.')} />
              <p className={inDerZone ? 'planer-klein' : 'gestalt-warnung'} data-gestalt-zone={inDerZone ? 'ja' : 'nein'}>
                {inDerZone ? 'Liegt in einer Installationszone.' : 'Liegt außerhalb der Installationszonen: Leitungsweg bitte mit uns abstimmen.'}
              </p>
            </>
          )}
          <Verschieben />
          <button type="button" className="planer-knopf planer-knopf-gefahr" onClick={() => loescheZiel()}>
            Elektropunkt löschen
          </button>
        </fieldset>
      )}
      <details className="planer-gruppe">
        <summary>Standardhöhen</summary>
        <p className="planer-klein">Gelten für neu gesetzte Punkte, Höhe jeweils Mitte Dose über fertigem Fußboden.</p>
        {(Object.keys(STANDARDHOEHEN) as HoehenGruppe[]).map((k) => (
          <HoehenFeld key={k} id={`gestalt-hoehe-${k}`} label={STANDARDHOEHEN[k].name} wert={hoehen[k] ?? STANDARDHOEHEN[k].hoehe} onSetze={(m) => g.setze({ hoehen: { ...gestaltStore.getState().hoehen, [k]: m } })} />
        ))}
      </details>
      <details className="planer-gruppe">
        <summary>Installationszonen (DIN 18015-3)</summary>
        <ul className="gestalt-legende" role="list">
          {(Object.keys(ZONEN_NAME) as ZonenArt[]).map((k) => (
            <li key={k}>
              <span className={`gestalt-zone gestalt-zone-${k.startsWith('ZW') ? 'waagerecht' : 'senkrecht'}`} aria-hidden="true" /> <strong>{k}</strong> {ZONEN_NAME[k]}
            </li>
          ))}
        </ul>
        <p className="planer-klein">Hier dürfen Leitungen in der Wand verlaufen. Vereinfachte Darstellung, Maße ab fertigen Oberflächen.</p>
      </details>
      <Stueckliste />
    </>
  );
}

// ---------- furniture ----------

function EinrichtungPanel() {
  const typ = useGestalt((s) => s.moebelTyp);
  const ziel = useGestalt((s) => s.ziel);
  const projekt = usePlaner((s) => s.projekt);
  const z = gueltigesZiel(projekt, ziel);
  const m = z?.art === 'moebel' ? projekt.einrichtung.find((x) => x.id === z.id) : undefined;
  return (
    <>
      <p className="gestalt-hinweis" data-gestalt-nur-visualisierung="">
        {NUR_VISUALISIERUNG}
      </p>
      <p className="planer-klein">Möbel wählen und auf den Boden tippen. In Wandnähe richtet es sich an der Wand aus.</p>
      <div className="gestalt-kacheln">
        {MOEBEL.map((x) => (
          <Kachel key={x.id} name={x.name} gewaehlt={typ === x.id} data={x.id} onWahl={() => gestaltStore.getState().setze({ moebelTyp: x.id })}>
            <span className={`gestalt-moebel gestalt-moebel-${x.id.split('.')[1]}`} aria-hidden="true" />
          </Kachel>
        ))}
      </div>
      {m && (
        <fieldset className="planer-gruppe" data-gestalt-moebel={m.id}>
          <legend>{moebelVon(m.typ)?.name}</legend>
          <div className="planer-knopfreihe">
            <button type="button" className="planer-knopf" onClick={() => dreheMoebel(-90)}>
              ↶ 90°
            </button>
            <button type="button" className="planer-knopf" onClick={() => dreheMoebel(90)}>
              ↷ 90°
            </button>
            <button type="button" className="planer-knopf" onClick={() => dreheMoebel(15)}>
              ↷ 15°
            </button>
          </div>
          <Verschieben />
          <button type="button" className="planer-knopf planer-knopf-gefahr" onClick={() => loescheZiel()}>
            Möbel entfernen
          </button>
        </fieldset>
      )}
    </>
  );
}

// ---------- view ----------

function AnsichtPanel({ webgl }: { webgl: boolean }) {
  const blick = useGestalt((s) => s.blick);
  const tageszeit = useGestalt((s) => s.tageszeit);
  const waende = useGestalt((s) => s.waende);
  const masse = useGestalt((s) => s.masse);
  const zonen = useGestalt((s) => s.zonen);
  const g = gestaltStore.getState();
  if (!webgl) return <p className="planer-klein">Die Ansicht-Optionen brauchen die 3D-Ansicht (WebGL 2), die in diesem Browser nicht verfügbar ist.</p>;
  const uhr = `${Math.floor(tageszeit)}:${tageszeit % 1 ? '30' : '00'} Uhr`;
  return (
    <>
      <fieldset className="gestalt-segment">
        <legend>Ansicht</legend>
        {(
          [
            ['orbit', 'Umschauen (Orbit)'],
            ['drauf', 'Draufsicht'],
            ['rundgang', 'Rundgang'],
          ] as const
        ).map(([id, name]) => (
          <label key={id}>
            <input type="radio" name="gestalt-blick" checked={blick === id} onChange={() => g.setze({ blick: id })} data-gestalt-blick={id} />
            <span>{name}</span>
          </label>
        ))}
      </fieldset>
      {blick === 'rundgang' && <p className="planer-klein">Rundgang: W/S oder Pfeil hoch/runter gehen, A/D seitwärts, Pfeil links/rechts drehen, Ziehen schaut sich um. Auf Touch-Geräten mit dem Joystick unten links.</p>}
      <div className="planer-feld">
        <label htmlFor="gestalt-tageszeit">Tageszeit und Licht: {uhr}</label>
        <input id="gestalt-tageszeit" type="range" min={6} max={22} step={0.5} value={tageszeit} onChange={(e) => g.setze({ tageszeit: Number(e.currentTarget.value) })} aria-valuetext={uhr} />
      </div>
      <fieldset className="gestalt-segment">
        <legend>Wände</legend>
        {(
          [
            ['voll', 'Ganz'],
            ['niedrig', 'Niedrig'],
            ['aus', 'Ausgeblendet'],
          ] as const
        ).map(([id, name]) => (
          <label key={id}>
            <input type="radio" name="gestalt-waende" checked={waende === id} onChange={() => g.setze({ waende: id })} />
            <span>{name}</span>
          </label>
        ))}
      </fieldset>
      <label className="planer-schalter">
        <input type="checkbox" checked={masse} onChange={(e) => g.setze({ masse: e.currentTarget.checked })} data-gestalt-masse="" />
        Maße einblenden
      </label>
      <label className="planer-schalter">
        <input type="checkbox" checked={zonen} onChange={(e) => g.setze({ zonen: e.currentTarget.checked })} />
        Installationszonen einblenden
      </label>
      <button type="button" className="planer-knopf" onClick={() => g.setze({ screenshot: gestaltStore.getState().screenshot + 1 })} data-gestalt-screenshot="">
        Bild speichern (PNG auf Ihrem Gerät)
      </button>
      <p className="planer-klein">Das Bild wird nur lokal heruntergeladen, nichts wird übertragen.</p>
    </>
  );
}

export function GestaltPanel({ webgl }: { webgl: boolean }) {
  const modus = useGestalt((s) => s.modus);
  const auswahl = usePlaner((s) => s.auswahl);
  // room chosen in the room list becomes the target (floor or ceiling) in the surface modes
  useEffect(() => {
    if (auswahl?.art !== 'raum') return;
    const g = gestaltStore.getState();
    if (['waende', 'boden', 'fliesen', 'decke'].includes(g.modus)) g.setze({ ziel: { art: g.modus === 'decke' ? 'decke' : 'boden', raumId: auswahl.id } });
  }, [auswahl]);
  const titel = { bauen: '', elektro: 'Elektro', waende: 'Wände', boden: 'Boden', fliesen: 'Fliesen', decke: 'Decke', oeffnungen: 'Türen & Fenster', einrichtung: 'Einrichtung', ansicht: 'Ansicht' }[modus];
  return (
    <section className="gestalt-panel" aria-labelledby="gestalt-panel-titel" data-gestalt-panel={modus}>
      <h3 id="gestalt-panel-titel" className="gestalt-panel-titel">
        {titel}
      </h3>
      {(modus === 'waende' || modus === 'boden' || modus === 'fliesen' || modus === 'decke') && <FlaechenPanel key={modus} modus={modus} />}
      {modus === 'oeffnungen' && <OeffnungenPanel />}
      {modus === 'elektro' && <ElektroPanel />}
      {modus === 'einrichtung' && <EinrichtungPanel />}
      {modus === 'ansicht' && <AnsichtPanel webgl={webgl} />}
    </section>
  );
}
