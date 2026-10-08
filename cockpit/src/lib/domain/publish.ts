// Gleiche Regel wie app_private.has_placeholder() in der Datenbank.
const PLACEHOLDER =
  /(\{\{[^}]*\}\}|\[\[[^\]]*\]\]|\[(TODO|TBD|PLATZHALTER|FIXME)[^\]]*\]|\b(TODO|FIXME|XXX)\b|lorem ipsum)/i;

export const CONTENT_STATUSES = ["entwurf", "ueberarbeitet", "freigegeben", "publiziert"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export function findPlaceholders(text: string): string[] {
  const re = new RegExp(PLACEHOLDER.source, "gi");
  return [...new Set([...text.matchAll(re)].map((m) => m[0]))];
}

export type PublishCheck = { ok: true } | { ok: false; gruende: string[] };

export function canPublish(item: { status: ContentStatus; titel: string; inhalt: string }): PublishCheck {
  const gruende: string[] = [];
  if (item.status !== "freigegeben") {
    gruende.push(`Status ist «${item.status}», veröffentlicht wird nur bei «freigegeben».`);
  }
  const ph = findPlaceholders(`${item.titel}\n${item.inhalt}`);
  if (ph.length) gruende.push(`Offene Platzhalter: ${ph.join(", ")}`);
  if (!item.inhalt.trim()) gruende.push("Der Beitrag ist leer.");
  return gruende.length ? { ok: false, gruende } : { ok: true };
}
