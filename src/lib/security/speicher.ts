// In-memory stores with TTL and a hard size cap. Nothing is persisted; a restart forgets everything.
// Keys are opaque (hashes, nonces). Never store IP addresses or e-mail addresses in clear text here.

export interface Uhr {
  (): number;
}
const jetzt: Uhr = () => Date.now();

/** Single-use markers (CSRF token ids, ALTCHA nonces) until their expiry. */
export class EinmalSpeicher {
  readonly #eintraege = new Map<string, number>();
  readonly maxEintraege: number;
  readonly uhr: Uhr;
  constructor(maxEintraege = 50_000, uhr: Uhr = jetzt) {
    this.maxEintraege = maxEintraege;
    this.uhr = uhr;
  }

  /** true if the key was unused and is now marked; false if it was used before (replay). */
  markiere(key: string, gueltigBisMs: number): boolean {
    const now = this.uhr();
    const bis = this.#eintraege.get(key);
    if (bis !== undefined && bis > now) return false;
    this.#aufraeumen(now);
    this.#eintraege.set(key, gueltigBisMs);
    return true;
  }

  get groesse() {
    return this.#eintraege.size;
  }

  #aufraeumen(now: number) {
    if (this.#eintraege.size < this.maxEintraege) return;
    for (const [k, bis] of this.#eintraege) if (bis <= now) this.#eintraege.delete(k);
    // Still full: drop the oldest entries (Map keeps insertion order). Entries expire anyway;
    // the CSRF/ALTCHA expiry limits what an attacker gains from flooding.
    while (this.#eintraege.size >= this.maxEintraege) {
      const first = this.#eintraege.keys().next().value;
      if (first === undefined) break;
      this.#eintraege.delete(first);
    }
  }
}

export interface LimitErgebnis {
  erlaubt: boolean;
  /** Seconds until the window resets (for Retry-After). */
  retryNachS: number;
}

/** Fixed-window rate limiter per key. */
export class RateLimiter {
  readonly #fenster = new Map<string, { start: number; anzahl: number }>();
  readonly max: number;
  readonly fensterMs: number;
  readonly maxSchluessel: number;
  readonly uhr: Uhr;
  constructor(max: number, fensterMs: number, maxSchluessel = 20_000, uhr: Uhr = jetzt) {
    this.max = max;
    this.fensterMs = fensterMs;
    this.maxSchluessel = maxSchluessel;
    this.uhr = uhr;
  }

  pruefe(key: string): LimitErgebnis {
    const now = this.uhr();
    let f = this.#fenster.get(key);
    if (!f || now - f.start >= this.fensterMs) {
      this.#aufraeumen(now);
      f = { start: now, anzahl: 0 };
      this.#fenster.delete(key);
      this.#fenster.set(key, f);
    }
    f.anzahl += 1;
    const retryNachS = Math.max(1, Math.ceil((f.start + this.fensterMs - now) / 1000));
    return { erlaubt: f.anzahl <= this.max, retryNachS };
  }

  #aufraeumen(now: number) {
    if (this.#fenster.size < this.maxSchluessel) return;
    for (const [k, f] of this.#fenster) if (now - f.start >= this.fensterMs) this.#fenster.delete(k);
    while (this.#fenster.size >= this.maxSchluessel) {
      const first = this.#fenster.keys().next().value;
      if (first === undefined) break;
      this.#fenster.delete(first);
    }
  }
}

/** Limits parallel expensive work (multipart parsing, image re-encoding, SMTP). */
export class Parallelitaet {
  #laufend = 0;
  readonly max: number;
  constructor(max: number) {
    this.max = max;
  }
  belege(): (() => void) | null {
    if (this.#laufend >= this.max) return null;
    this.#laufend += 1;
    let frei = false;
    return () => {
      if (frei) return;
      frei = true;
      this.#laufend -= 1;
    };
  }
}
