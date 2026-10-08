import type { MessageStatus } from "./types";

// Spiegelt app_private.messages_guard() in der Datenbank.
const FLOW: Record<MessageStatus, readonly MessageStatus[]> = {
  entwurf: ["geprueft"],
  geprueft: ["entwurf", "gesendet"],
  gesendet: ["antwort_erhalten"],
  antwort_erhalten: [],
};

export class MessageFlowError extends Error {}

export function canChangeStatus(from: MessageStatus, to: MessageStatus): boolean {
  return FLOW[from].includes(to);
}

export function nextStatus(
  current: { status: MessageStatus; final: string | null },
  to: MessageStatus,
): MessageStatus {
  if (!canChangeStatus(current.status, to)) {
    throw new MessageFlowError(`Statuswechsel ${current.status} → ${to} ist nicht erlaubt.`);
  }
  if (to === "geprueft" && !current.final?.trim()) {
    throw new MessageFlowError("Vor dem Prüfen braucht die Nachricht einen finalen Text.");
  }
  return to;
}

/** Text darf nur im Entwurf bearbeitet werden; geprüfte Texte gehen dafür zurück auf Entwurf. */
export function canEditText(status: MessageStatus): boolean {
  return status === "entwurf" || status === "geprueft";
}

export function statusAfterEdit(status: MessageStatus): MessageStatus {
  if (!canEditText(status)) throw new MessageFlowError("Gesendete Nachrichten können nicht mehr geändert werden.");
  return "entwurf";
}
