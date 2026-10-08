import Link from "next/link";
import { PageHeader, formatDate, formatDateTime } from "@/components/ui";
import { FUNNEL_LABELS, FUNNEL_METRICS, computeFunnel, type FunnelInput, type FunnelPeriod } from "@/lib/domain/funnel";
import { CHANNELS, CHANNEL_LABELS } from "@/lib/domain/types";
import { addDays, monthStart, weekStart, zurichDate } from "@/lib/domain/workdays";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = zurichDate();
  // Daten ab dem früheren von Monatsbeginn und 8 Wochen zurück
  const since = [monthStart(today), addDays(weekStart(today), -49)].sort()[0]!;
  const sinceTs = `${addDays(since, -1)}T00:00:00Z`;

  const [accounts, events, sent, inquiries, followUps, termine, client] = await Promise.all([
    supabase.from("accounts").select("id, herkunftskanal, erstellt_am"),
    supabase.from("pipeline_events").select("account_id, nach, zeitpunkt").gte("zeitpunkt", sinceTs),
    supabase.from("messages").select("contact_id, gesendet_am, contacts(account_id)").not("gesendet_am", "is", null),
    supabase.from("inquiries").select("datum").gte("datum", sinceTs),
    supabase.from("follow_ups").select("id, faellig_am, grund, accounts(id, name)").eq("erledigt", false).lte("faellig_am", today).order("faellig_am"),
    supabase.from("activities").select("id, datum, text, accounts(id, name)").eq("typ", "termin")
      .gte("datum", `${addDays(today, -1)}T22:00:00Z`).lt("datum", `${addDays(today, 1)}T02:00:00Z`).order("datum"),
    ensureOwnClient(supabase),
  ]);

  const input: FunnelInput = {
    accounts: (accounts.data ?? []) as FunnelInput["accounts"],
    events: (events.data ?? []) as FunnelInput["events"],
    sent: ((sent.data ?? []) as unknown as { contact_id: string; gesendet_am: string; contacts: { account_id: string } }[]).map((m) => ({
      contact_id: m.contact_id, gesendet_am: m.gesendet_am, account_id: m.contacts.account_id,
    })),
    inquiries: inquiries.data ?? [],
  };
  const f = computeFunnel(input);
  const max = Math.max(1, ...f.gespraecheVerlauf.map((w) => w.anzahl));
  const termineHeute = ((termine.data ?? []) as unknown as { id: string; datum: string; text: string; accounts: { id: string; name: string } }[])
    .filter((t) => zurichDate(new Date(t.datum)) === today);
  const faellig = (followUps.data ?? []) as unknown as { id: string; faellig_am: string; grund: string; accounts: { id: string; name: string } }[];

  return (
    <>
      <PageHeader title="Funnel" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="card lg:col-span-1">
          <div className="label">Gespräche diese Woche</div>
          <div className="num mt-1 text-6xl font-semibold text-accent">{f.woche.total.gespraeche}</div>
          <div className="mt-4 flex h-16 items-end gap-1" aria-label="Gespräche pro Woche, letzte 8 Wochen">
            {f.gespraecheVerlauf.map((w, i) => (
              <div key={w.woche} className="flex flex-1 flex-col items-center gap-1" title={`Woche ab ${formatDate(w.woche)}: ${w.anzahl}`}>
                <div
                  className={`w-full rounded-sm ${i === f.gespraecheVerlauf.length - 1 ? "bg-accent" : "bg-line"}`}
                  style={{ height: `${Math.max(4, (w.anzahl / max) * 56)}px` }}
                />
              </div>
            ))}
          </div>
          <div className="label mt-1 flex justify-between"><span>vor 8 Wochen</span><span>jetzt</span></div>
        </section>

        <section className="card lg:col-span-2">
          <PeriodTable woche={f.woche} monat={f.monat} />
        </section>

        <section className="card lg:col-span-2">
          <h2 className="mb-3 font-semibold">Nach Herkunftskanal <span className="label ml-2">diesen Monat</span></h2>
          <ChannelTable p={f.monat} />
        </section>

        <section className="card space-y-3">
          <h2 className="font-semibold">Heute fällig</h2>
          {termineHeute.map((t) => (
            <Link key={t.id} href={`/firmen/${t.accounts.id}`} className="block text-sm hover:text-accent">
              <span className="num text-accent">{formatDateTime(t.datum).slice(-5)}</span> Termin {t.accounts.name}
              <span className="block text-xs text-muted">{t.text}</span>
            </Link>
          ))}
          {faellig.map((x) => (
            <Link key={x.id} href={`/firmen/${x.accounts.id}`} className="block text-sm hover:text-accent">
              <span className={`num ${x.faellig_am < today ? "text-danger" : "text-accent"}`}>{formatDate(x.faellig_am)}</span> {x.accounts.name}
              <span className="block text-xs text-muted">{x.grund}</span>
            </Link>
          ))}
          {!faellig.length && !termineHeute.length ? <p className="text-sm text-muted">Nichts fällig.</p> : null}
          <Link href="/nachfassen" className="link text-sm">Alle Nachfass-Termine →</Link>
        </section>

        <section className="card lg:col-span-2">
          <h2 className="font-semibold">Anfragen</h2>
          <p className="mt-2 text-sm text-muted">
            Diese Woche <span className="num text-fg">{f.woche.anfragen}</span>, diesen Monat <span className="num text-fg">{f.monat.anfragen}</span>.
            Der Formular-Webhook folgt in Woche 3.
          </p>
        </section>

        <section className="card">
          <h2 className="font-semibold">Search Console · {client?.domain ?? "cybershark.ch"}</h2>
          <p className="mt-2 text-sm text-muted">
            Noch nicht verbunden. Ab Woche 2 erscheinen hier «Chancen auf Seite 2» und «viel gesehen, wenig geklickt».
          </p>
        </section>
      </div>
    </>
  );
}

type Supa = Awaited<ReturnType<typeof createClient>>;

/** cybershark.ch ist immer der erste Eintrag unter clients. */
async function ensureOwnClient(supabase: Supa) {
  const { data } = await supabase.from("clients").select("id, domain").eq("ist_eigene_seite", true).maybeSingle();
  if (data) return data;
  const { data: created } = await supabase
    .from("clients")
    .upsert({ name: "Cybershark", domain: "cybershark.ch", ist_eigene_seite: true }, { onConflict: "owner_id,domain" })
    .select("id, domain")
    .single();
  return created;
}

function PeriodTable({ woche, monat }: { woche: FunnelPeriod; monat: FunnelPeriod }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
      {FUNNEL_METRICS.map((m) => (
        <div key={m}>
          <div className="label">{FUNNEL_LABELS[m]}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`num text-3xl ${m === "gespraeche" ? "text-accent" : ""}`}>{woche.total[m]}</span>
            <span className="label">Woche</span>
            <span className="num ml-auto text-lg text-muted">{monat.total[m]}</span>
            <span className="label">Monat</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChannelTable({ p }: { p: FunnelPeriod }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="label text-left">
            <th className="py-1 pr-3">Kanal</th>
            {FUNNEL_METRICS.map((m) => <th key={m} className="py-1 pr-3 text-right">{FUNNEL_LABELS[m]}</th>)}
          </tr>
        </thead>
        <tbody>
          {CHANNELS.map((c) => (
            <tr key={c} className="border-t border-line">
              <td className="py-2 pr-3">{CHANNEL_LABELS[c]}</td>
              {FUNNEL_METRICS.map((m) => (
                <td key={m} className={`num py-2 pr-3 text-right ${m === "gespraeche" && p.nachKanal[c][m] ? "text-accent" : ""}`}>
                  {p.nachKanal[c][m]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
