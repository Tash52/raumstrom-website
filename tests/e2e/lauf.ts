// E2E run isolation (QA finding B1): every Playwright run gets its own port, its own run ID and
// its own copy of the build, so parallel runs (other agents, worktrees) and a rebuild of dist/
// during the run cannot interfere. Evaluated in the runner first; the values reach the workers
// and the web server through process.env, so workers do not pick new ones.
//
// E2E_PORT     fixed port (default: a free one)
// E2E_DIST     build to serve as is, without copy (default: copy of dist/ for this run)
// E2E_LAUF_ID  set automatically; the server answers /healthz?lauf=<id> only for its own run
// Output (traces, screenshots): test-results/lauf-<id>/
import { randomUUID } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { freierPort } from '../freier-port.ts';
import { ROOT } from './mailpit/umgebung.ts';

// Inside the project so the copied server entry resolves node_modules (ignored by git).
const KOPIEN = path.join(ROOT, 'node_modules', '.cache', 'raumstrom-e2e');
const QUELLE = path.join(ROOT, 'dist');
const PFLICHT = ['client/index.html', 'client/404.html', '_headers.json'];

const ERGEBNISSE = path.join(ROOT, 'test-results');

/** Remove leftovers of earlier or aborted runs (older than 6 h). */
function aufraeumen(dir: string, praefix = '') {
  if (!existsSync(dir)) return;
  for (const d of readdirSync(dir)) {
    const p = path.join(dir, d);
    if (d.startsWith(praefix) && Date.now() - statSync(p).mtimeMs > 6 * 3600_000) rmSync(p, { recursive: true, force: true });
  }
}

function distKopieren(id: string): string {
  aufraeumen(KOPIEN);
  const ziel = path.join(KOPIEN, id, 'dist');
  mkdirSync(path.dirname(ziel), { recursive: true });
  // Keep mtimes: server/static.mjs serves .br/.gz only if they are not older than the source.
  cpSync(QUELLE, ziel, { recursive: true, preserveTimestamps: true });
  const fehlt = PFLICHT.filter((f) => !existsSync(path.join(ziel, f)));
  if (fehlt.length) {
    rmSync(path.dirname(ziel), { recursive: true, force: true });
    throw new Error(`Build unvollständig (${fehlt.join(', ')}). Läuft gerade ein Build? Zuerst npm run build:staging abschließen.`);
  }
  process.on('exit', () => rmSync(path.dirname(ziel), { recursive: true, force: true }));
  return ziel;
}

process.env.E2E_LAUF_ID ||= randomUUID();
process.env.E2E_PORT ||= String(freierPort());
// Without a build the server reports the missing dist itself (clear message).
process.env.E2E_DIST ||= existsSync(path.join(QUELLE, 'client', 'index.html')) ? distKopieren(process.env.E2E_LAUF_ID) : QUELLE;

export const PORT = Number(process.env.E2E_PORT);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error(`E2E_PORT ungültig: ${process.env.E2E_PORT}`);
export const LAUF_ID = process.env.E2E_LAUF_ID;
export const DIST = path.resolve(ROOT, process.env.E2E_DIST);
export const BASE_URL = `http://127.0.0.1:${PORT}`;
// Own output folder per run: Playwright empties its outputDir at the start, a shared one would
// delete the traces of a parallel run. Failed runs stay readable for 6 h.
export const AUSGABE = path.join(ERGEBNISSE, `lauf-${LAUF_ID.slice(0, 8)}`);
if (!process.env.E2E_AUSGABE_GEPRUEFT) {
  process.env.E2E_AUSGABE_GEPRUEFT = '1';
  aufraeumen(ERGEBNISSE, 'lauf-');
}
