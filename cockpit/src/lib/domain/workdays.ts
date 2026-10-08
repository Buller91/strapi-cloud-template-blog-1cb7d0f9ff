export const TIMEZONE = "Europe/Zurich";

/** Kalenderdatum (YYYY-MM-DD) in Zürcher Zeit. */
export function zurichDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function parse(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}
function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Addiert Werktage (Mo–Fr). Feiertage werden in Phase 1 nicht berücksichtigt. */
export function addWorkdays(date: string, n: number): string {
  const d = parse(date);
  let left = n;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return fmt(d);
}

export function addDays(date: string, n: number): string {
  const d = parse(date);
  d.setUTCDate(d.getUTCDate() + n);
  return fmt(d);
}

/** Montag der Woche (ISO) zum Datum. */
export function weekStart(date: string): string {
  const d = parse(date);
  const wd = (d.getUTCDay() + 6) % 7; // Mo=0
  d.setUTCDate(d.getUTCDate() - wd);
  return fmt(d);
}

export function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export const FOLLOW_UP_WORKDAYS = 5;

export function suggestFollowUp(today: string = zurichDate()): string {
  return addWorkdays(today, FOLLOW_UP_WORKDAYS);
}
