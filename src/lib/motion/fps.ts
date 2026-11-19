// FPS check for 3D scenes: called once per rendered frame. After a warm-up it averages frame
// intervals; below the thresholds the scene first lowers its resolution, then gives up (poster).

export type FpsUrteil = 'gut' | 'aufloesung-senken' | 'aufgeben';

export interface FpsOptionen {
  /** Frames ignored at start (shader compile, first uploads). */
  aufwaermen?: number;
  /** Frames per measurement window. */
  fenster?: number;
  /** Below this average FPS: lower the pixel ratio and measure again. */
  senkenUnter?: number;
  /** Below this average FPS after lowering: give up. */
  aufgebenUnter?: number;
}

export function fpsWaechter(opt: FpsOptionen = {}) {
  const { aufwaermen = 20, fenster = 60, senkenUnter = 40, aufgebenUnter = 24 } = opt;
  let frames = 0;
  let summe = 0;
  let letzte = 0;
  let gesenkt = false;
  let fertig = false;
  let schnitt = 0;

  return {
    /** Feed with performance.now(); returns a verdict when a window completes, otherwise null. */
    frame(jetzt: number): FpsUrteil | null {
      if (fertig) return null;
      const dt = letzte ? jetzt - letzte : 0;
      letzte = jetzt;
      frames++;
      if (frames <= aufwaermen) return null;
      // Ignore huge gaps (tab hidden, scene paused or offscreen): they are not render cost.
      if (dt > 250) return null;
      summe += dt;
      if (frames < aufwaermen + fenster) return null;
      schnitt = 1000 / (summe / fenster);
      frames = aufwaermen; // next window
      summe = 0;
      if (schnitt >= senkenUnter) {
        fertig = true;
        return 'gut';
      }
      if (!gesenkt) {
        gesenkt = true;
        return 'aufloesung-senken';
      }
      fertig = true;
      return schnitt < aufgebenUnter ? 'aufgeben' : 'gut';
    },
    /** Pause gaps must not count: call when the loop resumes. */
    zuruecksetzen() {
      letzte = 0;
    },
    get schnitt() {
      return schnitt;
    },
  };
}
