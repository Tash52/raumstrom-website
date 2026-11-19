// Reads a request body with a byte limit, an absolute deadline and a minimum average transfer rate,
// so slow or stalled uploads (slowloris) cannot hold a slot until the server's requestTimeout.
// The stream is cancelled as soon as a limit is hit; nothing is written to disk.

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

/** Defaults: 55 s cap (below server requestTimeout 60 s), 16 KB/s average after 10 s. */
export const BODY_GRENZEN: Omit<BodyGrenzen, 'maxBytes'> = {
  maxDauerMs: 55_000,
  minBytesProS: 16 * 1024,
  schonfristMs: 10_000,
};

export type BodyErgebnis = { ok: true; daten: Uint8Array<ArrayBuffer> } | { ok: false; grund: 'zu-gross' | 'zeit' | 'abbruch' };

export async function leseBody(request: Request, g: BodyGrenzen): Promise<BodyErgebnis> {
  const body = request.body;
  if (!body) return { ok: true, daten: new Uint8Array(0) };
  const reader = body.getReader();
  const teile: Uint8Array[] = [];
  let bytes = 0;
  let abbruch = null as 'zu-gross' | 'zeit' | null;
  const start = Date.now();

  const waechter = setInterval(() => {
    const dauer = Date.now() - start;
    const zuLangsam = dauer >= g.schonfristMs && (bytes * 1000) / dauer < g.minBytesProS;
    if (dauer >= g.maxDauerMs || zuLangsam) {
      abbruch = 'zeit';
      // Resolves the pending read() with done: true.
      reader.cancel().catch(() => {});
    }
  }, g.pruefIntervallMs ?? 1000);
  waechter.unref?.();

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (abbruch) break;
      if (done) break;
      bytes += value.byteLength;
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
