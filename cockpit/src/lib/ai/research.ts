import "server-only";
import { z } from "zod/v4";
import type { SiteSnapshot } from "../web/fetch-site";
import { structured } from "./client";

export const ResearchSchema = z.object({
  leistungen: z.array(z.string()).describe("Angebotene Leistungen, wörtlich belegbar; leer wenn nicht gefunden"),
  region: z.string().describe("Einzugsgebiet/Standort oder «nicht gefunden»"),
  groesse: z.string().describe("Hinweise zur Grösse (Mitarbeitende, Team, Fahrzeuge) oder «nicht gefunden»"),
  luecken: z
    .array(z.object({ punkt: z.string(), beleg: z.string().describe("Woran es erkennbar ist") }))
    .describe("Erkennbare Lücken in Sichtbarkeit und Anfragemöglichkeiten"),
  aufhaenger: z.string().describe("Ein konkreter, belegter Punkt, an den eine Erstnachricht anknüpfen kann"),
  quellen: z.array(z.string()).describe("URLs der Seiten, auf die sich die Aussagen stützen"),
});
export type Research = z.infer<typeof ResearchSchema>;

const SYSTEM = `Du recherchierst für Cybershark (Sichtbarkeit und Webauftritt für Schweizer Bau- und Handwerksbetriebe).
Du bekommst den Text öffentlicher Seiten einer Firmenwebsite und technische Beobachtungen.
Regeln:
- Verwende ausschliesslich Informationen aus dem gelieferten Material. Erfinde nichts.
- Was nicht im Material steht, gibst du als «nicht gefunden» an.
- Lücken nur nennen, wenn sie belegbar sind (z. B. kein Kontaktformular gefunden, Copyright-Jahr 2017, keine Telefonnummer als Link). Formuliere sachlich, nicht abwertend.
- Quellen sind nur URLs aus dem Material.
- Schweizer Rechtschreibung (kein ß), kurz und sachlich.`;

export function buildResearchPrompt(firma: { name: string; ort: string | null; branche: string | null }, site: SiteSnapshot): string {
  const s = site.signals;
  const beobachtungen = [
    `HTTPS: ${s.https ? "ja" : "nein"}`,
    `Kontaktformular gefunden: ${s.kontaktformular ? "ja" : "nein"}`,
    `Telefonnummer als anklickbarer Link: ${s.telefonLink ? "ja" : "nein"}`,
    `E-Mail als Link: ${s.mailtoLink ? "ja" : "nein"}`,
    `Mobile Darstellung (viewport-Angabe): ${s.mobilViewport ? "ja" : "nein"}`,
    `Copyright-Jahre: ${s.copyrightJahre.length ? s.copyrightJahre.join(", ") : "keine gefunden"}`,
    `Untersuchte Seiten: ${site.pages.length}`,
  ].join("\n");

  const seiten = site.pages
    .map((p) => `<seite url="${p.url}" titel="${(p.title ?? "").replace(/"/g, "'")}"${p.gekuerzt ? ' gekuerzt="ja"' : ""}>\n${p.text}\n</seite>`)
    .join("\n\n");

  return `Firma: ${firma.name}${firma.ort ? `, ${firma.ort}` : ""}${firma.branche ? ` (${firma.branche})` : ""}

<technische_beobachtungen>
${beobachtungen}
</technische_beobachtungen>

${seiten}

Fasse zusammen: Leistungen, Region, Grösse, erkennbare Lücken, einen Aufhänger für eine persönliche Erstnachricht.`;
}

export async function researchCompany(
  firma: { name: string; ort: string | null; branche: string | null },
  site: SiteSnapshot,
): Promise<Research> {
  const result = await structured({ system: SYSTEM, prompt: buildResearchPrompt(firma, site), schema: ResearchSchema });
  // Nur Quellen zulassen, die wir tatsächlich abgerufen haben
  const fetched = new Set(site.pages.map((p) => p.url));
  const quellen = result.quellen.filter((q) => fetched.has(q));
  return { ...result, quellen: quellen.length ? quellen : [...fetched] };
}

export function formatResearch(r: Research): string {
  const list = (xs: string[]) => (xs.length ? xs.map((x) => `- ${x}`).join("\n") : "- nicht gefunden");
  return [
    `Leistungen:\n${list(r.leistungen)}`,
    `Region: ${r.region}`,
    `Grösse: ${r.groesse}`,
    `Erkennbare Lücken:\n${list(r.luecken.map((l) => `${l.punkt} (${l.beleg})`))}`,
  ].join("\n\n");
}
