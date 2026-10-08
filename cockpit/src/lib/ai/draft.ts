import "server-only";
import { z } from "zod/v4";
import { finalizeDraft, type Sender } from "../domain/draft-rules";
import type { MessageChannel } from "../domain/types";
import { structured } from "./client";

const DraftSchema = z.object({
  betreff: z.string().describe("Betreffzeile für E-Mail, sonst leer"),
  text: z.string().describe("Nachrichtentext ohne Signatur"),
  bezug: z.string().describe("Welcher Punkt aus der Recherche aufgegriffen wird"),
});

const TONE = `Tonalität: persönlich, direkt, kurz (E-Mail höchstens 120 Wörter, LinkedIn höchstens 70 Wörter).
Schweizer Rechtschreibung ohne ß. Keine Floskeln («Ich hoffe, es geht Ihnen gut», «Ich bin sicher …», «innovativ», «massgeschneidert»).
Sie-Form. Keine Übertreibungen, keine erfundenen Zahlen oder Kundenreferenzen.
Ein konkreter Bezug auf einen Punkt aus der Recherche ist Pflicht. Genau eine einfache Frage oder ein Vorschlag am Schluss.
Keine Signatur und keinen Abmeldehinweis schreiben – beides wird automatisch ergänzt.`;

export interface DraftInput {
  kanal: MessageChannel;
  firma: { name: string; ort: string | null; branche: string | null };
  kontakt: { name: string; funktion: string | null };
  recherche: { zusammenfassung: string; aufhaenger: string | null };
  angebot: string;
  sender: Sender;
}

export async function draftFirstMessage(input: DraftInput): Promise<{ text: string; bezug: string }> {
  const prompt = `Schreibe eine Erstnachricht per ${input.kanal === "email" ? "E-Mail" : input.kanal === "linkedin" ? "LinkedIn" : "Telefon (Gesprächsleitfaden, 5 Stichpunkte)"}.

Empfänger: ${input.kontakt.name}${input.kontakt.funktion ? `, ${input.kontakt.funktion}` : ""} bei ${input.firma.name}${input.firma.ort ? ` in ${input.firma.ort}` : ""}${input.firma.branche ? ` (${input.firma.branche})` : ""}.
Absender: ${input.sender.name}, ${input.sender.firma}.

<recherche>
${input.recherche.zusammenfassung}

Aufhänger: ${input.recherche.aufhaenger ?? "nicht gefunden"}
</recherche>

<angebot>
${input.angebot}
</angebot>

${TONE}`;

  const r = await structured({
    system: "Du schreibst Akquise-Entwürfe für einen Schweizer Einzelunternehmer. Der Entwurf wird von ihm geprüft und selbst versendet.",
    prompt,
    schema: DraftSchema,
    maxTokens: 4000,
  });
  const body = input.kanal === "email" && r.betreff.trim() ? `Betreff: ${r.betreff.trim()}\n\n${r.text}` : r.text;
  return { text: finalizeDraft(body, input.sender, input.kanal), bezug: r.bezug };
}

export async function draftReply(input: {
  kanal: MessageChannel;
  firma: { name: string };
  kontakt: { name: string };
  gesendet: string;
  antwort: string;
  recherche: string | null;
  sender: Sender;
}): Promise<{ text: string; art: string }> {
  const r = await structured({
    system: "Du schlägst Antworten auf Rückmeldungen aus der Akquise vor. Der Text wird geprüft und selbst versendet.",
    prompt: `Meine Nachricht an ${input.kontakt.name} (${input.firma.name}):
<gesendet>
${input.gesendet}
</gesendet>

Die Antwort:
<antwort>
${input.antwort}
</antwort>
${input.recherche ? `\n<recherche>\n${input.recherche}\n</recherche>\n` : ""}
Schlage eine passende Antwort vor. Wenn Interesse erkennbar ist, mache einen konkreten Terminvorschlag mit zwei Zeitfenstern (Platzhalter vermeiden, schreibe z. B. «Dienstag oder Donnerstag Vormittag»). Wenn eine Frage gestellt wird, beantworte sie knapp.
${TONE}`,
    schema: z.object({
      art: z.enum(["terminvorschlag", "antwort", "nachfrage"]),
      text: z.string(),
    }),
    maxTokens: 4000,
  });
  return { text: finalizeDraft(r.text, input.sender, input.kanal), art: r.art };
}
