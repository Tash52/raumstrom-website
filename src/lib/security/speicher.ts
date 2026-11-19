// In-memory stores with TTL and a hard size cap. Nothing is persisted; a restart forgets everything.
// Keys are opaque (hashes, nonces). Never store IP addresses or e-mail addresses in clear text here.
// Time-based deletion: expired entries are removed on access (at most every BEREINIGUNG_MS) and by an
// unref'd timer every BEREINIGUNG_MS even without traffic. No entry lives longer than
// MAX_AUFBEWAHRUNG_MS (24 h): expiries are capped so that expiry + one cleanup interval stays below it.

export interface Uhr {
  (): number;
}
const jetzt: Uhr = () => Date.now();

export const MAX_AUFBEWAHRUNG_MS = 24 * 60 * 60 * 1000;
export const BEREINIGUNG_MS = 5 * 60 * 1000;
/** Latest expiry an entry may have, counted from its creation. */
export const MAX_GUELTIG_MS = MAX_AUFBEWAHRUNG_MS - BEREINIGUNG_MS;

/** Periodic cleanup per store; unref'd, so it never keeps the process alive (tests, shutdown). */
function registriere(s: { raeume(): void }) {
  const timer = setInterval(() => s.raeume(), BEREINIGUNG_MS);
  timer.unref?.();
}

/** Single-use markers (CSRF token ids, ALTCHA nonces) until their expiry. */
export class EinmalSpeicher {
  readonly #eintraege = new Map<string, number>();
  readonly maxEintraege: number;
  readonly uhr: Uhr;
  #letzteBereinigung: number;
  constructor(maxEintraege = 50_000, uhr: Uhr = jetzt) {
    this.maxEintraege = maxEintraege;
    this.uhr = uhr;
    this.#letzteBereinigung = uhr();
    registriere(this);
  }

  /** true if the key was unused and is now marked; false if it was used before (replay). */
  markiere(key: string, gueltigBisMs: number): boolean {
    const now = this.uhr();
    if (now - this.#letzteBereinigung >= BEREINIGUNG_MS) this.raeume();
    const bis = this.#eintraege.get(key);
    if (bis !== undefined && bis > now) return false;
    this.#aufraeumen(now);
    this.#eintraege.set(key, Math.min(gueltigBisMs, now + MAX_GUELTIG_MS));
    return true;
  }

  /** Removes every expired entry. */
  raeume() {
    const now = this.uhr();
    this.#letzteBereinigung = now;
    for (const [k, bis] of this.#eintraege) if (bis <= now) this.#eintraege.delete(k);
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
  #letzteBereinigung: number;
  constructor(max: number, fensterMs: number, maxSchluessel = 20_000, uhr: Uhr = jetzt) {
    if (fensterMs > MAX_GUELTIG_MS) throw new Error('Rate-Limit-Fenster länger als die maximale Aufbewahrung');
    this.max = max;
    this.fensterMs = fensterMs;
    this.maxSchluessel = maxSchluessel;
    this.uhr = uhr;
    this.#letzteBereinigung = uhr();
    registriere(this);
  }

  get groesse() {
    return this.#fenster.size;
  }

  /** Removes every window that has ended. */
  raeume() {
    const now = this.uhr();
    this.#letzteBereinigung = now;
    for (const [k, f] of this.#fenster) if (now - f.start >= this.fensterMs) this.#fenster.delete(k);
  }

  pruefe(key: string): LimitErgebnis {
    const now = this.uhr();
    if (now - this.#letzteBereinigung >= BEREINIGUNG_MS) this.raeume();
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

/** Limits parallel work. `belege` answers at once; `warte` queues for a bounded time (FIFO). */
export class Parallelitaet {
  #laufend = 0;
  readonly #wartende: { weiter: (frei: (() => void) | null) => void; timer: ReturnType<typeof setTimeout> }[] = [];
  readonly max: number;
  readonly maxWartende: number;
  constructor(max: number, maxWartende = 0) {
    this.max = max;
    this.maxWartende = maxWartende;
  }

  get laufend() {
    return this.#laufend;
  }
  get wartend() {
    return this.#wartende.length;
  }

  belege(): (() => void) | null {
    if (this.#laufend >= this.max) return null;
    this.#laufend += 1;
    return this.#freigabe();
  }

  /** Waits at most `maxMs` for a slot; null if the queue is full or the time is up. */
  warte(maxMs: number): Promise<(() => void) | null> {
    const sofort = this.belege();
    if (sofort) return Promise.resolve(sofort);
    if (this.#wartende.length >= this.maxWartende) return Promise.resolve(null);
    return new Promise((resolve) => {
      const eintrag = {
        weiter: resolve,
        timer: setTimeout(() => {
          const i = this.#wartende.indexOf(eintrag);
          if (i >= 0) this.#wartende.splice(i, 1);
          resolve(null);
        }, maxMs),
      };
      eintrag.timer.unref?.();
      this.#wartende.push(eintrag);
    });
  }

  #freigabe(): () => void {
    let frei = false;
    return () => {
      if (frei) return;
      frei = true;
      const naechster = this.#wartende.shift();
      if (naechster) {
        // Hand the slot over directly; the count stays the same.
        clearTimeout(naechster.timer);
        naechster.weiter(this.#freigabe());
      } else {
        this.#laufend -= 1;
      }
    };
  }
}

/** Parallel work per key (e.g. pseudonymous client key); entries vanish when their count drops to 0. */
export class SchluesselParallelitaet {
  readonly #laufend = new Map<string, number>();
  readonly maxProSchluessel: number;
  constructor(maxProSchluessel: number) {
    this.maxProSchluessel = maxProSchluessel;
  }
  get groesse() {
    return this.#laufend.size;
  }
  belege(key: string): (() => void) | null {
    const n = this.#laufend.get(key) ?? 0;
    if (n >= this.maxProSchluessel) return null;
    this.#laufend.set(key, n + 1);
    let frei = false;
    return () => {
      if (frei) return;
      frei = true;
      const rest = (this.#laufend.get(key) ?? 1) - 1;
      if (rest <= 0) this.#laufend.delete(key);
      else this.#laufend.set(key, rest);
    };
  }
}
