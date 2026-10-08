import type { Contact } from "./types";

export class RecipientBlockedError extends Error {
  constructor(name: string) {
    super(`${name} ist gesperrt und kann nicht als Empfänger gewählt werden.`);
  }
}

type BlockState = Pick<Contact, "name" | "gesperrt">;

/** Nur nicht gesperrte Kontakte stehen als Empfänger zur Auswahl. */
export function selectableRecipients<T extends BlockState>(contacts: readonly T[]): T[] {
  return contacts.filter((c) => !c.gesperrt);
}

/** Wirft, wenn der Kontakt gesperrt ist. Vor jedem Entwurf, jeder Prüfung und jedem Versand aufrufen. */
export function assertRecipientAllowed(contact: BlockState | null | undefined): asserts contact is BlockState {
  if (!contact) throw new Error("Kontakt nicht gefunden.");
  if (contact.gesperrt) throw new RecipientBlockedError(contact.name);
}

export function blockFields(grund: string, now = new Date()) {
  const g = grund.trim();
  if (!g) throw new Error("Für eine Sperre braucht es einen Grund.");
  return { gesperrt: true as const, sperr_grund: g, sperr_datum: now.toISOString() };
}
