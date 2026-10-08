import { CHANNELS, type Channel, type Stage } from "./types";
import { monthStart, weekStart, zurichDate } from "./workdays";

export interface FunnelInput {
  accounts: { id: string; herkunftskanal: Channel; erstellt_am: string }[];
  /** Stufenwechsel aus pipeline_events */
  events: { account_id: string; nach: Stage; zeitpunkt: string }[];
  /** gesendete Nachrichten: contact_id + account_id + gesendet_am */
  sent: { contact_id: string; account_id: string; gesendet_am: string }[];
  inquiries: { datum: string }[];
}

export const FUNNEL_METRICS = [
  "neue_firmen",
  "erstnachrichten",
  "antworten",
  "gespraeche",
  "offerten",
  "abschluesse",
] as const;
export type FunnelMetric = (typeof FUNNEL_METRICS)[number];

export const FUNNEL_LABELS: Record<FunnelMetric, string> = {
  neue_firmen: "Neue Zielfirmen",
  erstnachrichten: "Erstnachrichten",
  antworten: "Antworten",
  gespraeche: "Gespräche",
  offerten: "Offerten",
  abschluesse: "Abschlüsse",
};

const STAGE_FOR: Partial<Record<FunnelMetric, Stage>> = {
  antworten: "antwort",
  gespraeche: "gespraech",
  offerten: "offerte",
  abschluesse: "gewonnen",
};

export type Counts = Record<FunnelMetric, number>;

export interface FunnelPeriod {
  von: string; // inkl.
  total: Counts;
  nachKanal: Record<Channel, Counts>;
  anfragen: number;
}

export interface Funnel {
  woche: FunnelPeriod;
  monat: FunnelPeriod;
  /** Gespräche pro Woche, die letzten 8 Wochen (älteste zuerst) */
  gespraecheVerlauf: { woche: string; anzahl: number }[];
}

const empty = (): Counts => ({
  neue_firmen: 0, erstnachrichten: 0, antworten: 0, gespraeche: 0, offerten: 0, abschluesse: 0,
});

function period(input: FunnelInput, von: string, bis: string | null, firstSends: FunnelInput["sent"]): FunnelPeriod {
  const channelOf = new Map(input.accounts.map((a) => [a.id, a.herkunftskanal]));
  const inRange = (ts: string) => {
    const d = zurichDate(new Date(ts));
    return d >= von && (bis === null || d < bis);
  };
  const total = empty();
  const nachKanal = Object.fromEntries(CHANNELS.map((c) => [c, empty()])) as Record<Channel, Counts>;
  const bump = (m: FunnelMetric, accountId: string) => {
    total[m]++;
    const ch = channelOf.get(accountId);
    if (ch) nachKanal[ch][m]++;
  };

  for (const a of input.accounts) if (inRange(a.erstellt_am)) bump("neue_firmen", a.id);
  for (const s of firstSends) if (inRange(s.gesendet_am)) bump("erstnachrichten", s.account_id);

  for (const [metric, stage] of Object.entries(STAGE_FOR) as [FunnelMetric, Stage][]) {
    // Pro Firma und Stufe nur einmal pro Zeitraum zählen (Hin- und Herschieben zählt nicht doppelt)
    const counted = new Set<string>();
    for (const e of input.events) {
      if (e.nach === stage && inRange(e.zeitpunkt) && !counted.has(e.account_id)) {
        counted.add(e.account_id);
        bump(metric, e.account_id);
      }
    }
  }

  return { von, total, nachKanal, anfragen: input.inquiries.filter((i) => inRange(i.datum)).length };
}

/** Erste gesendete Nachricht je Kontakt. */
export function firstSendsPerContact(sent: FunnelInput["sent"]): FunnelInput["sent"] {
  const first = new Map<string, FunnelInput["sent"][number]>();
  for (const s of sent) {
    const cur = first.get(s.contact_id);
    if (!cur || s.gesendet_am < cur.gesendet_am) first.set(s.contact_id, s);
  }
  return [...first.values()];
}

export function computeFunnel(input: FunnelInput, now: Date = new Date()): Funnel {
  const today = zurichDate(now);
  const firstSends = firstSendsPerContact(input.sent);
  const ws = weekStart(today);

  const verlauf: Funnel["gespraecheVerlauf"] = [];
  for (let i = 7; i >= 0; i--) {
    const von = shift(ws, -7 * i);
    const bis = shift(von, 7);
    verlauf.push({ woche: von, anzahl: period(input, von, bis, firstSends).total.gespraeche });
  }

  return {
    woche: period(input, ws, null, firstSends),
    monat: period(input, monthStart(today), null, firstSends),
    gespraecheVerlauf: verlauf,
  };
}

function shift(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
