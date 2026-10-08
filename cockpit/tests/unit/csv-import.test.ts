import { describe, expect, it } from "vitest";
import { parseCsv, parseDate, planImport } from "@/lib/domain/csv-import";
import { dedupeKey, normalizeDomain } from "@/lib/domain/normalize";

const defaults = { quelle: "Eigene Liste", quelle_datum: "2026-10-01", herkunftskanal: "ausgehend" as const };

describe("Domain-Normalisierung", () => {
  it.each([
    ["https://www.muster-elektro.ch/kontakt", "muster-elektro.ch"],
    ["http://Muster-Elektro.CH", "muster-elektro.ch"],
    ["www.muster-elektro.ch/", "muster-elektro.ch"],
    ["muster-elektro.ch?utm=x", "muster-elektro.ch"],
    ["keine website", null],
    ["", null],
  ])("%s → %s", (input, out) => expect(normalizeDomain(input)).toBe(out));
});

describe("CSV-Import: Duplikate", () => {
  const csv = [
    "Firma;Ort;Kanton;Branche;Website;Kontakt;Funktion;E-Mail",
    "Elektro Muster AG;Bern;BE;Elektriker;https://www.muster.ch;Hans Muster;Inhaber;hans@muster.ch",
    "Muster Elektro;Bern;BE;Elektriker;muster.ch/kontakt;;;",
    "Dach Huber GmbH;Thun;BE;Dachbau;huber-dach.ch;;;",
    "Holzbau Keller;Luzern;LU;Handwerk;;;;",
    "Holzbau Keller AG;luzern;LU;Handwerk;;;;",
    "Bereits Da AG;Zürich;ZH;Elektriker;https://bereits-da.ch;;;",
  ].join("\n");

  const plan = planImport(parseCsv(csv), new Set(["bereits-da.ch"]), defaults);

  it("erkennt Duplikate innerhalb der Datei über die Domain", () => {
    expect(plan.duplikate).toContainEqual(expect.objectContaining({ zeile: 3, grund: "datei", schluessel: "muster.ch" }));
  });

  it("erkennt Duplikate gegenüber der Datenbank", () => {
    expect(plan.duplikate).toContainEqual(expect.objectContaining({ zeile: 7, grund: "datenbank" }));
  });

  it("fällt ohne Website auf Name + Ort zurück", () => {
    expect(plan.duplikate).toContainEqual(expect.objectContaining({ zeile: 6, grund: "datei" }));
    expect(plan.warnungen.some((w) => w.zeile === 5 && /Keine Website/.test(w.meldung))).toBe(true);
  });

  it("importiert die übrigen mit Quelle und Erhebungsdatum", () => {
    expect(plan.neu.map((r) => r.name)).toEqual(["Elektro Muster AG", "Dach Huber GmbH", "Holzbau Keller"]);
    for (const r of plan.neu) {
      expect(r.quelle).toBe("Eigene Liste");
      expect(r.quelle_datum).toBe("2026-10-01");
    }
    expect(plan.neu[0]!.kontakt).toEqual({
      name: "Hans Muster",
      funktion: "Inhaber",
      email_geschaeftlich: "hans@muster.ch",
      linkedin_url: null,
    });
  });

  it("erkennt 30 Firmen ohne Duplikate vollständig", () => {
    const lines = ["firma,ort,website"];
    for (let i = 1; i <= 30; i++) lines.push(`Betrieb ${i},Bern,betrieb${i}.ch`);
    const p = planImport(parseCsv(lines.join("\n")), new Set(), defaults);
    expect(p.neu).toHaveLength(30);
    expect(p.duplikate).toHaveLength(0);
  });
});

describe("CSV-Import: Pflichtfelder und Datenschutz", () => {
  it("lehnt Zeilen ohne Quelle ab, wenn keine Vorgabe gesetzt ist", () => {
    const p = planImport(parseCsv("firma,website\nA AG,a.ch"), new Set(), { ...defaults, quelle: " " });
    expect(p.neu).toHaveLength(0);
    expect(p.fehler[0]!.meldung).toMatch(/Quelle/);
  });

  it("nimmt Quelle und Datum aus der Zeile, Schweizer Datumsformat", () => {
    const p = planImport(parseCsv("firma;website;quelle;erhebungsdatum\nA AG;a.ch;Zefix;03.09.2026"), new Set(), defaults);
    expect(p.neu[0]).toMatchObject({ quelle: "Zefix", quelle_datum: "2026-09-03" });
  });

  it("meldet ungültige Daten", () => {
    const p = planImport(parseCsv("firma;website;datum\nA AG;a.ch;31.02.2026"), new Set(), defaults);
    expect(p.fehler[0]!.meldung).toMatch(/Erhebungsdatum/);
  });

  it("übernimmt keine Freemail-Adressen", () => {
    const p = planImport(parseCsv("firma;website;kontakt;email\nA AG;a.ch;Eva Meier;eva.meier@gmail.com"), new Set(), defaults);
    expect(p.neu[0]!.kontakt!.email_geschaeftlich).toBeNull();
    expect(p.warnungen.some((w) => /Freemail/.test(w.meldung))).toBe(true);
  });

  it("parseDate", () => {
    expect(parseDate("2026-10-08")).toBe("2026-10-08");
    expect(parseDate("8.10.2026")).toBe("2026-10-08");
    expect(parseDate("2026-13-01")).toBeNull();
  });

  it("dedupeKey ignoriert Rechtsform und Grossschreibung", () => {
    expect(dedupeKey({ name: "Holzbau Keller AG", ort: "Luzern" })).toBe(dedupeKey({ name: "holzbau keller", ort: "LUZERN" }));
  });
});

describe("Beispieldatei docs/beispiel-import.csv", () => {
  it("importiert 30 Firmen mit Kontakten", async () => {
    const { readFileSync } = await import("node:fs");
    const text = readFileSync(new URL("../../docs/beispiel-import.csv", import.meta.url), "utf8");
    const p = planImport(parseCsv(text), new Set(), defaults);
    expect(p.fehler).toEqual([]);
    expect(p.neu).toHaveLength(30);
    expect(p.neu.every((r) => r.kontakt?.email_geschaeftlich)).toBe(true);
  });
});
