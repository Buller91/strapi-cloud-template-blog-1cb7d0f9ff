import Link from "next/link";
import { ChannelBadge, PageHeader, StageBadge, formatDate } from "@/components/ui";
import { CHANNELS, CHANNEL_LABELS, STAGES, STAGE_LABELS, type Channel, type Stage } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/server";

type SP = Promise<Record<string, string | undefined>>;

export default async function FirmenPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const supabase = await createClient();
  let q = supabase
    .from("accounts")
    .select("id, name, ort, kanton, branche, website, status, herkunftskanal, quelle, quelle_datum, letzte_aktivitaet")
    .order("letzte_aktivitaet", { ascending: false })
    .limit(500);
  if (sp.status) q = q.eq("status", sp.status);
  if (sp.kanal) q = q.eq("herkunftskanal", sp.kanal);
  if (sp.branche) q = q.ilike("branche", `%${sp.branche}%`);
  if (sp.ort) q = q.or(`ort.ilike.%${sp.ort.replace(/[,()]/g, "")}%,kanton.eq.${sp.ort.toUpperCase().slice(0, 2)}`);
  if (sp.q) q = q.ilike("name", `%${sp.q}%`);
  const { data: rows, error } = await q;

  return (
    <>
      <PageHeader title="Zielfirmen">
        <Link href="/firmen/import" className="btn">CSV-Import</Link>
        <Link href="/firmen/neu" className="btn btn-primary">Neue Firma</Link>
      </PageHeader>

      <form className="card mb-4 grid grid-cols-2 gap-2 sm:grid-cols-6" method="get">
        <input className="input col-span-2" name="q" placeholder="Name" defaultValue={sp.q} />
        <input className="input" name="branche" placeholder="Branche" defaultValue={sp.branche} />
        <input className="input" name="ort" placeholder="Ort / Kanton" defaultValue={sp.ort} />
        <select className="input" name="status" defaultValue={sp.status ?? ""}>
          <option value="">Alle Stufen</option>
          {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
        </select>
        <select className="input" name="kanal" defaultValue={sp.kanal ?? ""}>
          <option value="">Alle Kanäle</option>
          {CHANNELS.map((c) => <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>)}
        </select>
        <div className="col-span-2 flex gap-2 sm:col-span-6">
          <button className="btn btn-primary">Filtern</button>
          <Link href="/firmen" className="btn">Zurücksetzen</Link>
          <span className="label ml-auto self-center">{rows?.length ?? 0} Firmen</span>
        </div>
      </form>

      {error ? <p className="text-danger">{error.message}</p> : null}

      <div className="overflow-hidden rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="hidden bg-card text-left sm:table-header-group">
            <tr className="label">
              <th className="p-3">Firma</th><th className="p-3">Ort</th><th className="p-3">Branche</th>
              <th className="p-3">Stufe</th><th className="p-3">Kanal</th><th className="p-3">Quelle</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.id} className="block border-t border-line p-3 first:border-t-0 sm:table-row sm:p-0">
                <td className="block sm:table-cell sm:p-3">
                  <Link href={`/firmen/${r.id}`} className="font-medium hover:text-accent">{r.name}</Link>
                  {r.website ? <div className="label normal-case">{r.website.replace(/^https?:\/\//, "")}</div> : null}
                </td>
                <td className="inline sm:table-cell sm:p-3">{[r.ort, r.kanton].filter(Boolean).join(", ")}</td>
                <td className="inline pl-2 text-muted sm:table-cell sm:p-3 sm:text-fg">{r.branche}</td>
                <td className="mt-1 block sm:table-cell sm:p-3"><StageBadge stage={r.status as Stage} /></td>
                <td className="hidden sm:table-cell sm:p-3"><ChannelBadge channel={r.herkunftskanal as Channel} /></td>
                <td className="hidden text-xs text-muted sm:table-cell sm:p-3">{r.quelle}<br />{formatDate(r.quelle_datum)}</td>
              </tr>
            ))}
            {rows?.length === 0 ? (
              <tr><td className="p-6 text-center text-muted" colSpan={6}>Keine Firmen. Import oder neue Firma anlegen.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
