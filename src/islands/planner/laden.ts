// Small loader in the /raumplaner/ page bundle: shows progress, checks WebGL, then imports the
// planner chunk (React app, geometry). three.js/CSG load later, only when the 3D view opens.
// State for tests: [data-planer-zustand] = laedt | bereit | fehler.
import { istSoftwareRenderer, pruefeWebGL } from '../../lib/motion/umgebung.ts';

export async function ladePlaner(): Promise<void> {
  const host = document.querySelector<HTMLElement>('[data-planer-host]');
  const laden = host?.querySelector<HTMLElement>('[data-planer-laden]');
  const balken = laden?.querySelector('progress');
  if (!host || !laden) return;
  laden.hidden = false;
  const fortschritt = (wert: number, text?: string) => {
    if (balken) balken.value = wert;
    const t = laden.querySelector('[data-planer-laden-text]');
    if (text && t) t.textContent = text;
  };
  fortschritt(15);
  // planner works in 2D without WebGL; software renderers are allowed here (user asked for 3D explicitly)
  const gl = pruefeWebGL(false);
  host.dataset.planerWebgl = gl.ok ? 'ja' : 'nein';
  const leicht = !gl.ok || istSoftwareRenderer(gl.renderer) || window.matchMedia('(max-width: 40rem)').matches || (navigator.hardwareConcurrency ?? 8) <= 4;
  try {
    const modul = import('./start.tsx');
    fortschritt(55, 'Raumplaner wird gestartet …');
    const { startePlaner } = await modul;
    fortschritt(90);
    laden.remove();
    startePlaner(host, { webgl: gl.ok, leicht });
    host.dataset.planerZustand = 'bereit';
  } catch {
    host.dataset.planerZustand = 'fehler';
    laden.hidden = false;
    laden.replaceChildren();
    const p = document.createElement('p');
    p.textContent = 'Der Raumplaner konnte nicht geladen werden. Bitte laden Sie die Seite neu oder schildern Sie uns Ihr Vorhaben über das ';
    const a = document.createElement('a');
    a.href = '/kontakt/';
    a.textContent = 'Kontaktformular';
    p.append(a, '.');
    laden.append(p);
  }
}
