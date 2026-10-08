"use client";
import { useActionState, useState } from "react";
import { ActionForm, CopyButton, FormMessage, SubmitButton } from "@/components/forms";
import { MessageStatusBadge, formatDateTime } from "@/components/ui";
import type { MessageChannel, MessageStatus } from "@/lib/domain/types";
import { recordReply, saveMessageText, setMessageStatus } from "../message-actions";

export interface MessageView {
  id: string;
  kanal: MessageChannel;
  entwurf: string;
  final: string | null;
  status: MessageStatus;
  gesendet_am: string | null;
  erstellt_am: string;
}

const KANAL: Record<MessageChannel, string> = { email: "E-Mail", linkedin: "LinkedIn", telefon: "Telefon" };

export function MessageCard({ m, blocked }: { m: MessageView; blocked: boolean }) {
  const [text, setText] = useState(m.final ?? m.entwurf);
  const editable = (m.status === "entwurf" || m.status === "geprueft") && !blocked;
  const dirty = text !== (m.final ?? m.entwurf);
  // Zustand auf Kartenebene: die Rückmeldung bleibt sichtbar, auch wenn der Knopf nach dem Wechsel verschwindet
  const [statusState, statusAction] = useActionState(setMessageStatus, null);
  const StatusButton = (p: { to: MessageStatus; label: string; primary?: boolean; confirm?: string }) => (
    <form action={statusAction}>
      <input type="hidden" name="message_id" value={m.id} />
      <input type="hidden" name="status" value={p.to} />
      <SubmitButton className={`btn btn-sm ${p.primary ? "btn-primary" : ""}`} confirm={p.confirm}>{p.label}</SubmitButton>
    </form>
  );

  return (
    <div className="rounded-md border border-line p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="label">{KANAL[m.kanal]}</span>
        <MessageStatusBadge status={m.status} />
        <span className="label ml-auto">{m.gesendet_am ? `gesendet ${formatDateTime(m.gesendet_am)}` : formatDateTime(m.erstellt_am)}</span>
      </div>

      {editable ? (
        <ActionForm action={saveMessageText} className="space-y-2">
          <input type="hidden" name="message_id" value={m.id} />
          <textarea name="final" className="input min-h-56 text-sm leading-relaxed" value={text} onChange={(e) => setText(e.target.value)} />
          {dirty ? <SubmitButton className="btn btn-sm" pendingText="Speichere …">Änderungen speichern</SubmitButton> : null}
        </ActionForm>
      ) : (
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-fg/90">{m.final ?? m.entwurf}</pre>
      )}

      {blocked && m.status !== "gesendet" && m.status !== "antwort_erhalten" ? (
        <p className="mt-2 text-xs text-danger">Kontakt gesperrt – diese Nachricht kann nicht mehr geprüft oder gesendet werden.</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-start gap-2">
        {m.status === "entwurf" && !blocked && !dirty ? (
          <StatusButton to="geprueft" label="Als geprüft markieren" primary />
        ) : null}
        {m.status === "geprueft" && !blocked ? (
          <>
            <CopyButton text={m.final ?? ""} label="Text kopieren" />
            <StatusButton to="gesendet" label="Als gesendet markieren" primary confirm="Hast du die Nachricht selbst verschickt?" />
            <StatusButton to="entwurf" label="Zurück zu Entwurf" />
          </>
        ) : null}
      </div>
      <FormMessage state={statusState} />

      {m.status === "gesendet" || m.status === "antwort_erhalten" ? (
        <details className="mt-3">
          <summary className="label cursor-pointer">Antwort eintragen</summary>
          <ActionForm action={recordReply} className="mt-2 space-y-2" resetOnSuccess>
            <input type="hidden" name="message_id" value={m.id} />
            <textarea name="antwort" className="input min-h-24 text-sm" placeholder="Antwort hier einfügen" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="kein_interesse" /> Kein Interesse – Kontakt sofort sperren
            </label>
            <SubmitButton pendingText="Verarbeite …">Speichern{blocked ? "" : " und Antwort vorschlagen"}</SubmitButton>
          </ActionForm>
        </details>
      ) : null}
    </div>
  );
}
