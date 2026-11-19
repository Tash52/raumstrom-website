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

  /** Reads the state without counting (N-1: check before expensive work, count only when it is spent). */
  stand(key: string): LimitErgebnis {
    const now = this.uhr();
    const f = this.#fenster.get(key);
    if (!f || now - f.start >= this.fensterMs) return { erlaubt: true, retryNachS: 0 };
    const retryNachS = Math.max(1, Math.ceil((f.start + this.fensterMs - now) / 1000));
    return { erlaubt: f.anzahl < this.max, retryNachS };
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

/** A request body being read. leseBody (body.ts) updates `bytes` and sets `abbrechen`. */
export interface Lesevorgang {
  readonly start: number;
  bytes: number;
  /** Set when the pool displaced this reader; leseBody then stops with grund 'verdraengt'. */
  verdraengt: boolean;
  abbrechen?: () => void;
}

export interface AnnahmeOptionen {
  maxSlots: number;
  /** Sum of the reservations (declared Content-Length, else the body limit) of all readers. */
  maxBytes: number;
  /** Readers younger than this are never displaced. */
  schonfristMs: number;
  /** When the pool is full, readers with an average rate below this may be displaced (slowest first). 0 = never. */
  verdraengenUnterBytesProS: number;
  uhr?: Uhr;
}

/**
 * Admission for reading request bodies (SECURITY-REPORT N-2): bounded by slots and by reserved bytes.
 * A slot is held only while the body is read. If the pool is full, the slowest readers (below a rate
 * floor, past a grace period) are cancelled in favour of the new request instead of rejecting it, so
 * slow uploads cannot keep the form closed.
 */
export class Annahme {
  readonly #aktiv = new Map<Lesevorgang, number>();
  #reserviert = 0;
  readonly o: Required<AnnahmeOptionen>;
  constructor(o: AnnahmeOptionen) {
    this.o = { uhr: jetzt, ...o };
  }

  get laufend() {
    return this.#aktiv.size;
  }
  get reserviert() {
    return this.#reserviert;
  }

  belege(reservierung: number): { vorgang: Lesevorgang; frei: () => void } | null {
    const r = Math.max(0, Math.min(reservierung, this.o.maxBytes));
    const now = this.o.uhr();
    if (!this.#passt(r, 0, 0)) {
      // Pick victims (slowest first) only if displacing them actually makes room; otherwise touch nobody.
      const kandidaten = [...this.#aktiv]
        .map(([v, res]) => ({ v, res, dauer: now - v.start }))
        .filter((k) => k.dauer > 0 && k.dauer >= this.o.schonfristMs && (k.v.bytes * 1000) / k.dauer < this.o.verdraengenUnterBytesProS)
        .sort((a, b) => a.v.bytes / a.dauer - b.v.bytes / b.dauer);
      const opfer: Lesevorgang[] = [];
      let slots = 0;
      let bytes = 0;
      for (const k of kandidaten) {
        if (this.#passt(r, slots, bytes)) break;
        opfer.push(k.v);
        slots += 1;
        bytes += k.res;
      }
      if (!this.#passt(r, slots, bytes)) return null;
      for (const v of opfer) {
        this.#entferne(v);
        v.verdraengt = true;
        v.abbrechen?.();
      }
    }
    const vorgang: Lesevorgang = { start: now, bytes: 0, verdraengt: false };
    this.#aktiv.set(vorgang, r);
    this.#reserviert += r;
    return { vorgang, frei: () => this.#entferne(vorgang) };
  }

  #passt(r: number, freieSlots: number, freieBytes: number): boolean {
    return this.#aktiv.size - freieSlots < this.o.maxSlots && this.#reserviert - freieBytes + r <= this.o.maxBytes;
  }

  #entferne(v: Lesevorgang) {
    const r = this.#aktiv.get(v);
    if (r === undefined) return;
    this.#aktiv.delete(v);
    this.#reserviert -= r;
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
