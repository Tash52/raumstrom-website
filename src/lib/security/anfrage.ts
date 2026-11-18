// Request helpers that depend on Astro's context.
import type { APIContext } from 'astro';

/** Socket peer address (Astro sets it from the Node request); undefined if unavailable. */
export function socketAdresse(context: Pick<APIContext, 'clientAddress'>): string | undefined {
  try {
    return context.clientAddress;
  } catch {
    return undefined;
  }
}
