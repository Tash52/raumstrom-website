// POST /api/contact (multipart/form-data). Contract: src/components/forms/kontakt-schnittstelle.ts.
// fetch with Accept: application/json -> JSON (KontaktAntwort); native form POST without JS -> 303 to
// /kontakt/danke/ or /kontakt/fehler/. Processing: src/lib/security/kontakt-ablauf.ts.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getFirma } from '../../lib/content/index.ts';
import { sende } from '../../lib/mail/transport.ts';
import { socketAdresse } from '../../lib/security/anfrage.ts';
import { apiKontext, json, KEIN_CACHE, methodeNichtErlaubt, protokolliere, willJson } from '../../lib/security/api.ts';
import { verarbeiteKontakt, type KontaktErgebnis } from '../../lib/security/kontakt-ablauf.ts';

export const prerender = false;

let anliegenCache: Map<string, string> | undefined;
async function anliegen(): Promise<Map<string, string>> {
  // All Leistungen incl. drafts: the form offers the visible ones (build-time decision), the server only
  // needs to know that the id exists. The title is used in the mail subject. Content is fixed per build.
  anliegenCache ??= new Map((await getCollection('leistungen')).map((l) => [l.id, l.data.titel]));
  return anliegenCache;
}

function antwort(request: Request, e: KontaktErgebnis): Response {
  if (!willJson(request)) {
    return new Response(null, { status: 303, headers: { Location: e.ok ? '/kontakt/danke/' : '/kontakt/fehler/', ...KEIN_CACHE } });
  }
  if (e.ok) return json(200, { ok: true });
  const body = { ok: false, ...(e.fehler ? { fehler: e.fehler } : {}), ...(e.nachricht ? { nachricht: e.nachricht } : {}) };
  return json(e.status, body, e.retryNachS ? { 'Retry-After': String(e.retryNachS) } : {});
}

export const POST: APIRoute = async (context) => {
  try {
    const kontext = apiKontext();
    const ergebnis = await verarbeiteKontakt(context.request, {
      kontext,
      firma: await getFirma(),
      anliegen: await anliegen(),
      sende: (mail) => sende(kontext.env, mail),
      socketAdresse: socketAdresse(context),
    });
    return antwort(context.request, ergebnis);
  } catch {
    protokolliere('kontakt: interner fehler');
    return antwort(context.request, { status: 500, ok: false, nachricht: 'Ihre Anfrage konnte nicht verarbeitet werden. Bitte versuchen Sie es später erneut.' });
  }
};

export const ALL: APIRoute = () => methodeNichtErlaubt('POST');
