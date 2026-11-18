// Shared helpers for form field components (ids and aria-describedby).
export function feldIds(name: string, id?: string) {
  const base = id ?? `feld-${name.replace(/[^a-z0-9_-]/gi, '-')}`;
  return { id: base, hinweis: `${base}-hinweis`, fehler: `${base}-fehler` };
}

export function describedBy(ids: ReturnType<typeof feldIds>, hinweis?: string, fehler?: string) {
  return [hinweis && ids.hinweis, fehler && ids.fehler].filter(Boolean).join(' ') || undefined;
}
