import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { PageHeader, StageBadge, formatDate } from "@/components/ui";
import type { Stage } from "@/lib/domain/types";
import { zurichDate } from "@/lib/domain/workdays";
import { createClient } from "@/lib/supabase/server";
import { completeFollowUp, rescheduleFollowUp } from "./actions";

export default async function NachfassenPage() {
  const supabase = await createClient();
  const today = zurichDate();
  const { data } = await supabase
    .from("follow_ups")
    .select("id, faellig_am, grund, accounts(id, name, ort, status)")
    .eq("erledigt", false)
    .order("faellig_am");
  const rows = (data ?? []) as unknown as {
    id: string; faellig_am: string; grund: string; accounts: { id: string; name: string; ort: string | null; status: Stage };
  }[];

  const groups = [
    { title: "Überfällig", items: rows.filter((r) => r.faellig_am < today), tone: "text-danger" },
    { title: "Heute", items: rows.filter((r) => r.faellig_am === today), tone: "text-accent" },
    { title: "Demnächst", items: rows.filter((r) => r.faellig_am > today), tone: "text-muted" },
  ];

  return (
    <>
      <PageHeader title="Nachfassen" />
      <div className="space-y-6">
        {groups.map((g) => (
          <section key={g.title}>
            <h2 className={`label mb-2 ${g.tone}`}>{g.title} · {g.items.length}</h2>
            <div className="space-y-2">
              {g.items.map((f) => (
                <div key={f.id} className="card flex flex-wrap items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/firmen/${f.accounts.id}`} className="font-medium hover:text-accent">{f.accounts.name}</Link>
                    <div className="text-xs text-muted">{f.grund} · {f.accounts.ort}</div>
                  </div>
                  <StageBadge stage={f.accounts.status} />
                  <span className={`num text-sm ${g.tone}`}>{formatDate(f.faellig_am)}</span>
                  <div className="flex w-full gap-2 sm:w-auto">
                    <ActionForm action={rescheduleFollowUp} className="flex gap-1">
                      <input type="hidden" name="id" value={f.id} />
                      <input type="date" name="faellig_am" defaultValue={f.faellig_am} className="input w-auto py-1 text-xs" />
                      <SubmitButton className="btn btn-sm">Verschieben</SubmitButton>
                    </ActionForm>
                    <ActionForm action={completeFollowUp}>
                      <input type="hidden" name="id" value={f.id} />
                      <SubmitButton className="btn btn-sm btn-primary">Erledigt</SubmitButton>
                    </ActionForm>
                  </div>
                </div>
              ))}
              {g.items.length === 0 ? <p className="text-sm text-muted">Nichts.</p> : null}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
