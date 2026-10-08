import { STAGES, type Stage } from "./types";

// Erlaubte Stufenwechsel. Vorwärts darf übersprungen werden (z. B. Empfehlung
// direkt ins Gespräch), rückwärts nur eine Stufe zur Korrektur.
const TRANSITIONS: Record<Stage, readonly Stage[]> = {
  neu: ["recherchiert", "kontaktiert", "gespraech", "verloren"],
  recherchiert: ["neu", "kontaktiert", "gespraech", "verloren"],
  kontaktiert: ["recherchiert", "antwort", "gespraech", "verloren"],
  antwort: ["kontaktiert", "gespraech", "offerte", "verloren"],
  gespraech: ["antwort", "offerte", "gewonnen", "verloren"],
  offerte: ["gespraech", "gewonnen", "verloren"],
  gewonnen: ["offerte"],
  verloren: ["neu"],
};

export function isStage(v: unknown): v is Stage {
  return typeof v === "string" && (STAGES as readonly string[]).includes(v);
}

export function allowedTransitions(from: Stage): readonly Stage[] {
  return TRANSITIONS[from];
}

export function canTransition(from: Stage, to: Stage): boolean {
  return TRANSITIONS[from].includes(to);
}

export class TransitionError extends Error {}

export function assertTransition(from: Stage, to: Stage): void {
  if (!canTransition(from, to)) {
    throw new TransitionError(`Wechsel von «${from}» nach «${to}» ist nicht vorgesehen.`);
  }
}

/** Beim Wechsel auf «kontaktiert» wird ein Nachfass-Termin vorgeschlagen. */
export function needsFollowUp(to: Stage): boolean {
  return to === "kontaktiert";
}

/** Stufe nach dem Versand einer Erstnachricht. */
export function stageAfterSend(current: Stage): Stage {
  return current === "neu" || current === "recherchiert" ? "kontaktiert" : current;
}
