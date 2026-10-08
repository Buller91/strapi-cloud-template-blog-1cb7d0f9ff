import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { PageHeader, formatDate } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { deleteContact } from "./actions";

export default async function DatenschutzPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const supabase = await createClient();
  let blockedQ = supabase
    .from("contacts")
    .select("id, name, email_geschaeftlich, sperr_grund, sperr_datum, accounts(id, name)")
    .eq("gesperrt", true)
    .order("sperr_datum", { ascending: false });
  if (q) blockedQ = blockedQ.or(`name.ilike.%${q.replace(/[,()]/g, "")}%,email_geschaeftlich.ilike.%${q.replace(/[,()]/g, "")}%`);

  const [{ data: blocked }, { count: hashCount }, { data: contacts }, { data: due }] = await Promise.all([
    blockedQ,
    supabase.from("suppressions").select("id", { count: "exact", head: true }),
    supabase.from("contacts").select("id, name, quelle, quelle_datum, erstellt_am, gesperrt, accounts(id, name, quelle, quelle_datum)").order("erstellt_am", { ascending: false }).limit(300),
    supabase.from("retention_due").select("*"),
  ]);
  type Row = { id: string; name: string; email_geschaeftlich?: string; sperr_grund?: string; sperr_datum?: string; quelle?: string; quelle_datum?: string; erstellt_am?: string; gesperrt?: boolean; accounts: { id: string; name: string; quelle?: string; quelle_datum?: string } };

  return (
    <>
      <PageHeader title="Datenschutz">
        <a href="/datenschutz/sperrliste.csv" className="btn">Sperrliste exportieren</a>
      </PageHeader>

      <div className="space-y-6">
        {(due ?? []).length ? (
          <section className="card border-warn/50">
            <h2 className="font-semibold text-warn">Aufbewahrungsfrist erreicht</h2>
            <p className="mb-3 text-sm text-muted">Diese Kontakte haben seit 24 Monaten keine Aktivität. Bitte prüfen und löschen.</p>
            <ul className="space-y-2 text-sm">
              {(due ?? []).map((d) => (
                <li key={d.contact_id} className="flex flex-wrap items-center gap-2">
                  <span>{d.name} · {d.firma}</span>
                  <span className="label">zuletzt {formatDate(d.letzte_aktivitaet)}</span>
                  <DeleteButton id={d.contact_id} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Sperrliste <span className="num ml-2 text-muted">{blocked?.length ?? 0}</span></h2>
            <span className="label">+ {hashCount ?? 0} gelöschte (nur Hash)</span>
          </div>
          <form method="get" className="flex gap-2">
            <input className="input" name="q" defaultValue={q} placeholder="Name oder E-Mail suchen" />
            <button className="btn">Suchen</button>
          </form>
          <ul className="divide-y divide-line text-sm">
            {((blocked ?? []) as unknown as Row[]).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <div>{c.name} <span className="text-muted">· <Link className="hover:text-accent" href={`/firmen/${c.accounts.id}`}>{c.accounts.name}</Link></span></div>
                  <div className="text-xs text-muted">{c.email_geschaeftlich} · {c.sperr_grund}</div>
                </div>
                <span className="label">{formatDate(c.sperr_datum)}</span>
                <a className="btn btn-sm" href={`/datenschutz/auskunft/${c.id}`}>Auskunft</a>
                <DeleteButton id={c.id} />
              </li>
            ))}
          </ul>
        </section>

        <section className="card space-y-3">
          <h2 className="font-semibold">Herkunft der Daten</h2>
          <p className="text-sm text-muted">Pro Kontakt: woher die Angaben stammen und seit wann sie gespeichert sind.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="label text-left"><th className="py-1 pr-3">Kontakt</th><th className="pr-3">Firma</th><th className="pr-3">Quelle Kontakt</th><th className="pr-3">Quelle Firma</th><th className="pr-3">Gespeichert seit</th><th /></tr></thead>
              <tbody>
                {((contacts ?? []) as unknown as Row[]).map((c) => (
                  <tr key={c.id} className="border-t border-line align-top">
                    <td className="py-2 pr-3">{c.name}{c.gesperrt ? <span className="label ml-1 text-danger">gesperrt</span> : null}</td>
                    <td className="pr-3">{c.accounts.name}</td>
                    <td className="pr-3">{c.quelle} <span className="label">{formatDate(c.quelle_datum)}</span></td>
                    <td className="pr-3">{c.accounts.quelle} <span className="label">{formatDate(c.accounts.quelle_datum)}</span></td>
                    <td className="num pr-3">{formatDate(c.erstellt_am)}</td>
                    <td className="flex gap-1 py-1">
                      <a className="btn btn-sm" href={`/datenschutz/auskunft/${c.id}`}>Auskunft</a>
                      <DeleteButton id={c.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

function DeleteButton({ id }: { id: string }) {
  return (
    <ActionForm action={deleteContact}>
      <input type="hidden" name="contact_id" value={id} />
      <SubmitButton className="btn btn-sm btn-danger" confirm="Kontakt mit allen Nachrichten endgültig löschen?">Löschen</SubmitButton>
    </ActionForm>
  );
}
