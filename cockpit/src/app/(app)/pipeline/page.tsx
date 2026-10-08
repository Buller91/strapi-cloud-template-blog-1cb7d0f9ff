import Link from "next/link";
import { StageForm } from "@/components/stage-form";
import { ChannelBadge, PageHeader, formatDate } from "@/components/ui";
import { STAGES, STAGE_LABELS, type Channel, type Stage } from "@/lib/domain/types";
import { suggestFollowUp } from "@/lib/domain/workdays";
import { createClient } from "@/lib/supabase/server";

export default async function PipelinePage({ searchParams }: { searchParams: Promise<{ alle?: string }> }) {
  const { alle } = await searchParams;
  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, ort, status, herkunftskanal, letzte_aktivitaet, activities(typ, text, datum)")
    .order("letzte_aktivitaet", { ascending: false })
    .order("datum", { referencedTable: "activities", ascending: false })
    .limit(1, { referencedTable: "activities" });

  const followUp = suggestFollowUp();
  // Abgeschlossene Stufen standardmässig eingeklappt, damit die Pipeline übersichtlich bleibt
  const visible = alle ? STAGES : STAGES.filter((s) => s !== "verloren");

  return (
    <>
      <PageHeader title="Pipeline">
        <Link href={alle ? "/pipeline" : "/pipeline?alle=1"} className="btn btn-sm">{alle ? "Verloren ausblenden" : "Verloren anzeigen"}</Link>
      </PageHeader>
      <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-4">
        {visible.map((stage) => {
          const cards = (accounts ?? []).filter((a) => a.status === stage);
          return (
            <section key={stage} className="w-[85vw] max-w-xs shrink-0 snap-start sm:w-72">
              <h2 className="mb-2 flex items-baseline justify-between">
                <span className="label text-fg">{STAGE_LABELS[stage]}</span>
                <span className={`num text-sm ${stage === "gespraech" ? "text-accent" : "text-muted"}`}>{cards.length}</span>
              </h2>
              <div className="space-y-2">
                {cards.map((a) => {
                  const last = (a.activities as { typ: string; text: string; datum: string }[])[0];
                  return (
                    <article key={a.id} className="card space-y-2 p-3">
                      <Link href={`/firmen/${a.id}`} className="block font-medium hover:text-accent">{a.name}</Link>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted">{a.ort}</span>
                        <ChannelBadge channel={a.herkunftskanal as Channel} />
                      </div>
                      <p className="line-clamp-2 text-xs text-muted">
                        {last ? `${formatDate(last.datum)}: ${last.text}` : `Zuletzt aktiv ${formatDate(a.letzte_aktivitaet)}`}
                      </p>
                      <StageForm accountId={a.id} stage={stage as Stage} followUpSuggestion={followUp} compact />
                    </article>
                  );
                })}
                {cards.length === 0 ? <p className="rounded-lg border border-dashed border-line p-4 text-center text-xs text-muted">leer</p> : null}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
