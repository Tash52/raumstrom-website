// Progressive enhancement of the contact form: accessible validation messages and fetch submit.
// Without this script the form still works with native validation and a plain POST.
import { FELD, type KontaktAntwort } from './kontakt-schnittstelle.ts';
import type { AltchaElement } from './altcha-widget.ts';

const form = document.getElementById('kontakt-formular') as HTMLFormElement | null;

if (form) {
  const summary = document.getElementById('kontakt-fehler') as HTMLElement;
  const summaryTitel = document.getElementById('kontakt-fehler-titel') as HTMLElement;
  const summaryListe = document.getElementById('kontakt-fehler-liste') as HTMLElement;
  const status = document.getElementById('kontakt-status') as HTMLElement;
  const erfolg = document.getElementById('kontakt-erfolg') as HTMLElement;
  const senden = document.getElementById('kontakt-senden') as HTMLButtonElement;

  const maxDateien = Number(form.dataset.maxDateien);
  const maxDateiBytes = Number(form.dataset.maxDateiBytes);
  const maxGesamtBytes = Number(form.dataset.maxGesamtBytes);
  const typen = (form.dataset.dateiTypen ?? '').split(',');
  const nachrichtMin = Number(form.dataset.nachrichtMin);
  const mb = (b: number) => `${Math.round(b / 1024 / 1024)} MB`;

  // ?anliegen=<leistung> (links from the Leistungen pages) preselects the topic
  const vorwahl = new URLSearchParams(location.search).get('anliegen');
  const auswahl = form.elements.namedItem(FELD.anliegen) as HTMLSelectElement | null;
  if (vorwahl && auswahl && [...auswahl.options].some((o) => o.value === vorwahl)) auswahl.value = vorwahl;

  form.noValidate = true; // our messages replace the browser bubbles

  // ALTCHA spam protection (backend-api): loaded on demand into [data-altcha-platz], writes the field "altcha".
  let altcha: AltchaElement | null = null;
  const altchaPlatz = form.querySelector<HTMLElement>('[data-altcha-platz]');
  const altchaLaden = altchaPlatz
    ? import('./altcha-widget.ts')
        .then((m) => (altcha = m.bindeAltchaEin(altchaPlatz, FELD.altcha)))
        .catch(() => null)
    : Promise.resolve(null);

  async function altchaPayload(): Promise<boolean> {
    const w = await altchaLaden;
    if (!w) return false;
    if (w.getState() === 'verified' && feld(FELD.altcha)?.value) return true;
    status.textContent = 'Der Spam-Schutz wird geprüft.';
    const r = await w.verify().catch(() => null);
    return Boolean(r?.payload);
  }

  const feld = (name: string) => form.elements.namedItem(name) as HTMLInputElement | null;
  const fehlerEl = (name: string) => document.getElementById(`feld-${name}-fehler`);

  function labelText(el: HTMLElement): string {
    const l = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
    return (l?.firstChild?.textContent ?? el.getAttribute('name') ?? '').trim();
  }

  function setFehler(name: string, text: string) {
    const el = feld(name);
    const p = fehlerEl(name);
    if (!el || !p) return;
    p.textContent = text;
    el.setAttribute('aria-invalid', 'true');
    const ids = new Set((el.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean));
    ids.add(p.id);
    el.setAttribute('aria-describedby', [...ids].join(' '));
  }

  function loescheFehler(name: string) {
    const el = feld(name);
    const p = fehlerEl(name);
    if (!el || !p) return;
    p.textContent = '';
    el.removeAttribute('aria-invalid');
    const ids = (el.getAttribute('aria-describedby') ?? '').split(' ').filter((i) => i && i !== p.id);
    if (ids.length) el.setAttribute('aria-describedby', ids.join(' '));
    else el.removeAttribute('aria-describedby');
  }

  function alleLoeschen() {
    for (const name of Object.values(FELD)) loescheFehler(name);
    summary.hidden = true;
    summaryListe.replaceChildren();
    summaryTitel.textContent = '';
  }

  function zeigeZusammenfassung(titel: string, fehler: Record<string, string>) {
    summaryTitel.textContent = titel;
    summaryListe.replaceChildren();
    for (const [name, text] of Object.entries(fehler)) {
      const el = feld(name);
      const li = document.createElement('li');
      if (el?.id) {
        const a = document.createElement('a');
        a.href = `#${el.id}`;
        a.textContent = `${labelText(el)}: ${text}`;
        a.addEventListener('click', (e) => {
          e.preventDefault();
          el.focus();
        });
        li.append(a);
      } else {
        li.textContent = text;
      }
      summaryListe.append(li);
    }
    summary.hidden = false;
    summary.focus();
  }

  function pruefe(): Record<string, string> {
    const f: Record<string, string> = {};
    const name = feld(FELD.name)!.value.trim();
    if (name.length < 2) f[FELD.name] = 'Bitte geben Sie Ihren Namen ein.';
    const email = feld(FELD.email)!.value.trim();
    if (!email) f[FELD.email] = 'Bitte geben Sie Ihre E-Mail-Adresse ein.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) f[FELD.email] = 'Bitte prüfen Sie das Format, zum Beispiel name@beispiel.de.';
    const nachricht = feld(FELD.nachricht)!.value.trim();
    if (!nachricht) f[FELD.nachricht] = 'Bitte beschreiben Sie kurz Ihr Vorhaben.';
    else if (nachricht.length < nachrichtMin) f[FELD.nachricht] = `Bitte schreiben Sie mindestens ${nachrichtMin} Zeichen.`;
    const dateien = [...(feld(FELD.fotos)!.files ?? [])];
    if (dateien.length > maxDateien) f[FELD.fotos] = `Bitte wählen Sie höchstens ${maxDateien} Fotos aus.`;
    else if (dateien.some((d) => d.size > maxDateiBytes)) f[FELD.fotos] = `Ein Foto ist größer als ${mb(maxDateiBytes)}. Bitte wählen Sie kleinere Dateien.`;
    else if (dateien.reduce((s, d) => s + d.size, 0) > maxGesamtBytes) f[FELD.fotos] = `Alle Fotos zusammen dürfen höchstens ${mb(maxGesamtBytes)} groß sein.`;
    else if (dateien.some((d) => d.type && !typen.includes(d.type))) f[FELD.fotos] = 'Bitte wählen Sie nur Bilder im Format JPG, PNG, WebP oder HEIC aus.';
    if (!feld(FELD.einwilligung)!.checked) f[FELD.einwilligung] = 'Bitte stimmen Sie der Verarbeitung Ihrer Angaben zu, damit wir Ihre Anfrage bearbeiten können.';
    return f;
  }

  for (const name of Object.values(FELD)) {
    const el = feld(name);
    el?.addEventListener(el.type === 'checkbox' || el.type === 'file' || el.tagName === 'SELECT' ? 'change' : 'input', () => loescheFehler(name));
  }

  async function holeCsrf() {
    const url = form!.dataset.csrfUrl;
    if (!url) return;
    try {
      const res = await fetch(url, { credentials: 'same-origin', headers: { accept: 'application/json' } });
      const json = (await res.json()) as { token?: string };
      if (res.ok && json.token) feld(FELD.csrf)!.value = json.token;
    } catch {
      /* the server answers the POST with a clear message */
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alleLoeschen();
    const fehler = pruefe();
    if (Object.keys(fehler).length) {
      for (const [n, t] of Object.entries(fehler)) setFehler(n, t);
      const n = Object.keys(fehler).length;
      zeigeZusammenfassung(n === 1 ? 'Bitte prüfen Sie eine Angabe' : `Bitte prüfen Sie ${n} Angaben`, fehler);
      return;
    }
    senden.setAttribute('aria-disabled', 'true');
    senden.disabled = true;
    status.textContent = 'Ihre Anfrage wird gesendet.';
    try {
      if (!(await altchaPayload())) {
        zeigeZusammenfassung('Der Spam-Schutz konnte nicht geprüft werden. Bitte laden Sie die Seite neu oder schreiben Sie uns direkt per E-Mail.', {});
        return;
      }
      status.textContent = 'Ihre Anfrage wird gesendet.';
      await holeCsrf();
      const daten = new FormData(form);
      const fotos = daten.getAll(FELD.fotos).filter((d) => d instanceof File && d.size > 0);
      daten.delete(FELD.fotos);
      for (const d of fotos) daten.append(FELD.fotos, d);
      if (!daten.get(FELD.altcha)) daten.delete(FELD.altcha);
      const res = await fetch(form.action, { method: 'POST', body: daten, headers: { accept: 'application/json' }, signal: AbortSignal.timeout(60_000) });
      const antwort = (await res.json().catch(() => null)) as KontaktAntwort | null;
      if (res.ok && antwort?.ok) {
        form.hidden = true;
        status.textContent = '';
        erfolg.hidden = false;
        erfolg.focus();
        return;
      }
      // The proof of work is single-use; solve a fresh one for the next attempt.
      altcha?.reset();
      const fe: Record<string, string> = {};
      if (antwort && !antwort.ok && antwort.fehler) {
        for (const [n, t] of Object.entries(antwort.fehler)) if (t && feld(n)) fe[n] = t;
      }
      for (const [n, t] of Object.entries(fe)) setFehler(n, t);
      const allgemein = (antwort && !antwort.ok && antwort.nachricht) || 'Ihre Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es später erneut oder schreiben Sie uns direkt per E-Mail.';
      zeigeZusammenfassung(Object.keys(fe).length ? 'Bitte prüfen Sie Ihre Angaben' : allgemein, fe);
    } catch {
      zeigeZusammenfassung('Die Verbindung ist fehlgeschlagen. Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.', {});
    } finally {
      senden.removeAttribute('aria-disabled');
      senden.disabled = false;
      status.textContent = '';
    }
  });
}
