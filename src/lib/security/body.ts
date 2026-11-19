// Reads a request body with a byte limit, an absolute deadline and a minimum average transfer rate,
// so slow or stalled uploads (slowloris) cannot hold a slot until the server's requestTimeout.
// The stream is cancelled as soon as a limit is hit; nothing is written to disk.
import type { Lesevorgang } from './speicher.ts';

export interface BodyGrenzen {
  maxBytes: number;
  /** Absolute upper bound for reading the whole body. */
  maxDauerMs: number;
  /** After `schonfristMs`, the average rate must stay at or above this many bytes per second. */
  minBytesProS: number;
  schonfristMs: number;
  /** Watchdog interval (tests use small values). */
  pruefIntervallMs?: number;
}

/**
 * Defaults (N-2): 64 KB/s (0.5 Mbit/s) average after 5 s, at most 55 s (below server requestTimeout 60 s).
 * With a declared Content-Length the deadline shrinks to what the minimum rate needs (see leseFrist).
 */
export const BODY_GRENZEN: Omit<BodyGrenzen, 'maxBytes'> = {
  maxDauerMs: 55_000,
  minBytesProS: 64 * 1024,
  schonfristMs: 5_000,
};

/** Deadline for a body of `laenge` bytes: grace period plus the time the minimum rate needs, capped. */
export function leseFrist(laenge: number | null, g: Omit<BodyGrenzen, 'maxBytes'>): number {
  if (laenge === null || g.minBytesProS <= 0) return g.maxDauerMs;
  return Math.min(g.maxDauerMs, g.schonfristMs + Math.ceil((laenge * 1000) / g.minBytesProS));
}

export type BodyFehler = 'zu-gross' | 'zeit' | 'abbruch' | 'verdraengt';
export type BodyErgebnis = { ok: true; daten: Uint8Array<ArrayBuffer> } | { ok: false; grund: BodyFehler };

export async function leseBody(request: Request, g: BodyGrenzen, vorgang?: Lesevorgang): Promise<BodyErgebnis> {
  if (vorgang?.verdraengt) return { ok: false, grund: 'verdraengt' };
  const body = request.body;
  if (!body) return { ok: true, daten: new Uint8Array(0) };
  const reader = body.getReader();
  const teile: Uint8Array[] = [];
  let bytes = 0;
  let abbruch = null as Exclude<BodyFehler, 'abbruch'> | null;
  const start = Date.now();
  const stoppe = (grund: Exclude<BodyFehler, 'abbruch'>) => {
    abbruch ??= grund;
    // Resolves the pending read() with done: true.
    reader.cancel().catch(() => {});
  };
  if (vorgang) vorgang.abbrechen = () => stoppe('verdraengt');

  const waechter = setInterval(() => {
    const dauer = Date.now() - start;
    const zuLangsam = dauer >= g.schonfristMs && (bytes * 1000) / dauer < g.minBytesProS;
    if (dauer >= g.maxDauerMs || zuLangsam) stoppe('zeit');
  }, g.pruefIntervallMs ?? 1000);
  waechter.unref?.();

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (abbruch) break;
      if (done) break;
      bytes += value.byteLength;
      if (vorgang) vorgang.bytes = bytes;
      if (bytes > g.maxBytes) {
        abbruch = 'zu-gross';
        await reader.cancel().catch(() => {});
        break;
      }
      teile.push(value);
    }
  } catch {
    return { ok: false, grund: abbruch ?? 'abbruch' };
  } finally {
    clearInterval(waechter);
    if (vorgang) vorgang.abbrechen = undefined;
    reader.releaseLock?.();
  }
  if (abbruch) return { ok: false, grund: abbruch };

  const daten = new Uint8Array(bytes);
  let pos = 0;
  for (const t of teile) {
    daten.set(t, pos);
    pos += t.byteLength;
  }
  return { ok: true, daten };
}

/** Parses multipart/form-data from bytes already read (same parser as Request.formData()). */
export async function formDataAus(daten: Uint8Array<ArrayBuffer>, contentType: string): Promise<FormData> {
  return new Response(daten, { headers: { 'content-type': contentType } }).formData();
}
