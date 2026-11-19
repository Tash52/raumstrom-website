// Three-state slider "Vorher / Hinter der Wand / Nachher" (components/sections/WandSlider.astro).
// Works without JS: native radio group (keyboard: arrow keys), CSS shows the checked state via :has().
// JS adds dragging on the picture: the wipe follows the pointer continuously (--wpos 0..2 via CSSOM)
// and snaps to the nearest state on release (checks that radio, CSS then eases the rest).

export function initSlider(): void {
  for (const slider of document.querySelectorAll<HTMLElement>('[data-wslider]')) {
    const buehne = slider.querySelector<HTMLElement>('[data-wslider-buehne]');
    const radios = [...slider.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
    if (!buehne || radios.length !== 3) continue;
    slider.classList.add('wslider-js');

    const aktuell = () => Math.max(0, radios.findIndex((r) => r.checked));
    let start: { x: number; pos: number } | null = null;
    let pos = 0;

    const setzen = (p: number) => {
      pos = Math.min(2, Math.max(0, p));
      slider.style.setProperty('--wpos', pos.toFixed(3));
    };

    buehne.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      start = { x: e.clientX, pos: aktuell() };
      pos = start.pos;
      buehne.setPointerCapture(e.pointerId);
      slider.classList.add('wslider-zieht');
    });
    buehne.addEventListener('pointermove', (e) => {
      if (!start) return;
      // One full width of drag = one state. Dragging right reveals the next layer.
      const breite = buehne.getBoundingClientRect().width || 1;
      setzen(start.pos + (e.clientX - start.x) / breite);
    });
    const ende = (e: PointerEvent) => {
      if (!start) return;
      const bewegt = Math.abs(e.clientX - start.x) > 4;
      start = null;
      buehne.releasePointerCapture?.(e.pointerId);
      slider.classList.remove('wslider-zieht');
      // A tap without movement steps to the next state (and wraps), a drag snaps to the nearest.
      const ziel = bewegt ? Math.round(pos) : (aktuell() + 1) % 3;
      slider.style.removeProperty('--wpos');
      const r = radios[ziel]!;
      r.checked = true;
      r.dispatchEvent(new Event('change', { bubbles: true }));
    };
    buehne.addEventListener('pointerup', ende);
    buehne.addEventListener('pointercancel', ende);
  }
}
