export interface Sender {
  name: string;
  firma: string;
  adresse: string;
  email: string;
  web: string;
}

export const OPT_OUT_LINE =
  "Falls Sie keine weiteren Nachrichten von mir wünschen, antworten Sie kurz mit «Nein danke» – dann melde ich mich nicht mehr.";

const OPT_OUT_PATTERN = /(keine weiteren nachrichten|nicht mehr (melden|kontaktieren)|abmelden|nein danke)/i;

export function signature(s: Sender): string {
  return [s.name, s.firma, s.adresse, s.email, s.web].filter(Boolean).join("\n");
}

/** Schweizer Rechtschreibung: kein ß. */
export function swissSpelling(text: string): string {
  return text.replace(/ß/g, "ss");
}

/**
 * Stellt sicher, dass jeder Entwurf Absenderangaben und einen Ablehnungshinweis enthält.
 * Fehlt etwas, wird es angehängt – unabhängig davon, was das Modell geliefert hat.
 */
export function finalizeDraft(body: string, sender: Sender, kanal: "email" | "linkedin" | "telefon"): string {
  let text = swissSpelling(body.trim());
  if (kanal === "telefon") return text;
  if (!OPT_OUT_PATTERN.test(text)) text += `\n\n${OPT_OUT_LINE}`;
  if (!hasSender(text, sender)) text += `\n\n${signature(sender)}`;
  return text;
}

function hasSender(text: string, s: Sender): boolean {
  const t = text.toLowerCase();
  return t.includes(s.name.toLowerCase()) && t.includes(s.email.toLowerCase());
}

/** Prüft einen (ggf. von mir bearbeiteten) Text vor «geprüft». Leere Liste = in Ordnung. */
export function checkDraft(text: string, sender: Sender, kanal: "email" | "linkedin" | "telefon"): string[] {
  const issues: string[] = [];
  if (!text.trim()) issues.push("Text ist leer.");
  if (text.includes("ß")) issues.push("Enthält «ß» (Schweizer Rechtschreibung: «ss»).");
  if (kanal !== "telefon") {
    if (!OPT_OUT_PATTERN.test(text)) issues.push("Hinweis zum Ablehnen weiterer Nachrichten fehlt.");
    if (!hasSender(text, sender)) issues.push("Absenderangaben (Name und E-Mail) fehlen.");
  }
  if (/\{\{|\[\[|\[(NAME|FIRMA|TODO)/i.test(text)) issues.push("Enthält noch Platzhalter.");
  return issues;
}
