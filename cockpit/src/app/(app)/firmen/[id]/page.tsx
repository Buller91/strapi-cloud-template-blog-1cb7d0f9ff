import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/forms";
import { StageForm } from "@/components/stage-form";
import { ChannelBadge, Field, PageHeader, StageBadge, formatDate, formatDateTime } from "@/components/ui";
import { selectableRecipients } from "@/lib/domain/blocklist";
import { ACTIVITY_TYPES, type Channel, type Contact, type Stage } from "@/lib/domain/types";
import { suggestFollowUp } from "@/lib/domain/workdays";
import { createClient } from "@/lib/supabase/server";
import { addActivity, addContact, addFollowUp, blockContact, runResearch } from "../actions";
import { ContactFields } from "../contact-fields";
import { draftMessage } from "../message-actions";
import { MessageCard, type MessageView } from "./message-card";

export default async function FirmaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: a } = await supabase.from("accounts").select("*").eq("id", id).maybeSingle();
  if (!a) notFound();

  const [{ data: contacts }, { data: notes }, { data: activities }, { data: followUps }] = await Promise.all([
    supabase.from("contacts").select("*, messages(*)").eq("account_id", id).order("erstellt_am"),
    supabase.from("research_notes").select("*").eq("account_id", id).order("erstellt_am", { ascending: false }),
    supabase.from("activities").select("*").eq("account_id", id).order("datum", { ascending: false }).limit(30),
    supabase.from("follow_ups").select("*").eq("account_id", id).eq("erledigt", false).order("faellig_am"),
  ]);
  const allContacts = (contacts ?? []) as (Contact & { messages: MessageView[] })[];
  const recipients = selectableRecipients(allContacts);
  const latest = notes?.[0];

  return (
    <>
      <PageHeader title={a.name}>
        <StageBadge stage={a.status as Stage} />
        <ChannelBadge channel={a.herkunftskanal as Channel} />
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Recherche */}
          <section className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Recherche</h2>
              <ActionForm action={runResearch}>
                <input type="hidden" name="account_id" value={a.id} />
                <SubmitButton disabled={!a.website} pendingText="Lese Website …">{latest ? "Neu recherchieren" : "Recherchieren"}</SubmitButton>
              </ActionForm>
            </div>
            {!a.website ? <p className="text-sm text-muted">Keine Website hinterlegt.</p> : null}
            {latest ? (
              <div className="space-y-3 text-sm">
                <div className="rounded-md border border-accent/40 bg-accent/5 p-3">
                  <div className="label mb-1 text-accent">Aufhänger</div>
                  {latest.aufhaenger}
                </div>
                <pre className="whitespace-pre-wrap font-sans text-fg/90">{latest.zusammenfassung}</pre>
                <div className="label">Quellen ({formatDateTime(latest.erstellt_am)})</div>
                <ul className="space-y-1 text-xs">
                  {(latest.quellen_urls as string[]).map((u) => (
                    <li key={u}><a href={u} className="link break-all" target="_blank" rel="noreferrer noopener">{u}</a></li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          {/* Kontakte und Nachrichten */}
          <section className="card space-y-4">
            <h2 className="text-lg font-semibold">Kontakte und Nachrichten</h2>
            {allContacts.map((c) => (
              <div key={c.id} className={`space-y-3 rounded-md border p-3 ${c.gesperrt ? "border-danger/40" : "border-line"}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{c.name} {c.funktion ? <span className="text-muted">· {c.funktion}</span> : null}</div>
                    <div className="text-xs text-muted">
                      {[c.email_geschaeftlich, c.linkedin_url].filter(Boolean).join(" · ")}
                    </div>
                    <div className="label mt-1 normal-case">Quelle: {c.quelle}, {formatDate(c.quelle_datum)}</div>
                  </div>
                  {c.gesperrt ? (
                    <span className="label rounded border border-danger/50 px-1.5 py-0.5 text-danger" title={c.sperr_grund ?? ""}>
                      Gesperrt seit {formatDate(c.sperr_datum)}
                    </span>
                  ) : null}
                </div>
                {c.gesperrt ? <p className="text-xs text-danger">Grund: {c.sperr_grund}</p> : null}

                {c.messages
                  .sort((x, y) => x.erstellt_am.localeCompare(y.erstellt_am))
                  .map((m) => <MessageCard key={m.id} m={m} blocked={c.gesperrt} />)}

                {!c.gesperrt ? (
                  <details>
                    <summary className="label cursor-pointer">Kontakt sperren</summary>
                    <ActionForm action={blockContact} className="mt-2 flex flex-wrap gap-2">
                      <input type="hidden" name="contact_id" value={c.id} />
                      <input className="input flex-1" name="grund" placeholder="Grund, z. B. «Bitte keine Werbung»" required />
                      <SubmitButton className="btn btn-danger" confirm="Sperre ist endgültig. Fortfahren?">Sperren</SubmitButton>
                    </ActionForm>
                  </details>
                ) : null}
              </div>
            ))}

            {/* Nur nicht gesperrte Kontakte sind wählbar */}
            {recipients.length ? (
              <ActionForm action={draftMessage} className="flex flex-wrap items-end gap-2 border-t border-line pt-4">
                <Field label="Empfänger">
                  <select name="contact_id" className="input">
                    {recipients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Kanal">
                  <select name="kanal" className="input">
                    <option value="email">E-Mail</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="telefon">Telefon-Leitfaden</option>
                  </select>
                </Field>
                <SubmitButton disabled={!latest} pendingText="Claude schreibt …">Nachricht entwerfen</SubmitButton>
                {!latest ? <p className="w-full text-xs text-muted">Zuerst recherchieren.</p> : null}
              </ActionForm>
            ) : (
              <p className="text-sm text-muted">Kein wählbarer Empfänger. Kontakt hinzufügen.</p>
            )}

            <details className="border-t border-line pt-4">
              <summary className="label cursor-pointer">Kontakt hinzufügen</summary>
              <ActionForm action={addContact} className="mt-3 space-y-3" resetOnSuccess>
                <input type="hidden" name="account_id" value={a.id} />
                <ContactFields />
                <SubmitButton>Kontakt speichern</SubmitButton>
              </ActionForm>
            </details>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="card space-y-3">
            <h2 className="font-semibold">Pipeline</h2>
            <StageForm accountId={a.id} stage={a.status as Stage} followUpSuggestion={suggestFollowUp()} />
          </section>

          <section className="card space-y-2 text-sm">
            <h2 className="font-semibold">Angaben</h2>
            <Info k="Ort" v={[a.ort, a.kanton].filter(Boolean).join(", ")} />
            <Info k="Branche" v={a.branche} />
            <Info k="Grösse" v={a.groesse_ca} />
            <div className="flex justify-between gap-2">
              <span className="label">Website</span>
              {a.website ? <a href={a.website} className="link truncate" target="_blank" rel="noreferrer noopener">{a.domain}</a> : "–"}
            </div>
            <Info k="Quelle" v={`${a.quelle}, ${formatDate(a.quelle_datum)}`} />
            <Info k="Angelegt" v={formatDate(a.erstellt_am)} />
          </section>

          <section className="card space-y-3">
            <h2 className="font-semibold">Nachfassen</h2>
            {(followUps ?? []).map((f) => (
              <div key={f.id} className="text-sm"><span className="num text-accent">{formatDate(f.faellig_am)}</span> {f.grund}</div>
            ))}
            <ActionForm action={addFollowUp} className="space-y-2" resetOnSuccess>
              <input type="hidden" name="account_id" value={a.id} />
              <input type="date" name="faellig_am" className="input" defaultValue={suggestFollowUp()} required />
              <input name="grund" className="input" placeholder="Grund" />
              <SubmitButton className="btn btn-sm">Einplanen</SubmitButton>
            </ActionForm>
          </section>

          <section className="card space-y-3">
            <h2 className="font-semibold">Aktivitäten</h2>
            <ActionForm action={addActivity} className="space-y-2" resetOnSuccess>
              <input type="hidden" name="account_id" value={a.id} />
              <div className="flex gap-2">
                <select name="typ" className="input">
                  {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t[0]!.toUpperCase() + t.slice(1)}</option>)}
                </select>
                <input type="datetime-local" name="datum" className="input" />
              </div>
              <textarea name="text" className="input min-h-16" placeholder="Notiz" required />
              <SubmitButton className="btn btn-sm">Erfassen</SubmitButton>
            </ActionForm>
            <ul className="space-y-2 text-sm">
              {(activities ?? []).map((x) => (
                <li key={x.id} className="border-t border-line pt-2">
                  <span className="label">{x.typ} · {formatDateTime(x.datum)}</span>
                  <p className="whitespace-pre-wrap text-fg/90">{x.text}</p>
                </li>
              ))}
            </ul>
          </section>

          <Link href="/firmen" className="link text-sm">← Alle Zielfirmen</Link>
        </aside>
      </div>
    </>
  );
}

function Info({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="label">{k}</span>
      <span className="text-right">{v || "–"}</span>
    </div>
  );
}
