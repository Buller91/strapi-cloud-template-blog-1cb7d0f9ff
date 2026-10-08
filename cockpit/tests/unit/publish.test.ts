import { describe, expect, it } from "vitest";
import { canPublish, findPlaceholders } from "@/lib/domain/publish";

describe("Veröffentlichen nur bei Freigabe", () => {
  const fertig = { titel: "Wie Elektriker in Bern gefunden werden", inhalt: "Ein fertiger Text." };

  it("erlaubt freigegebene Beiträge ohne Platzhalter", () => {
    expect(canPublish({ ...fertig, status: "freigegeben" })).toEqual({ ok: true });
  });

  it.each(["entwurf", "ueberarbeitet", "publiziert"] as const)("blockiert Status %s", (status) => {
    const r = canPublish({ ...fertig, status });
    expect(r.ok).toBe(false);
  });

  it.each([
    "Hallo {{vorname}}",
    "Siehe [[Link einfügen]]",
    "[TODO: Zahlen ergänzen]",
    "Abschnitt TODO",
    "Lorem ipsum dolor",
    "Preis: XXX Franken",
  ])("blockiert Platzhalter in «%s»", (inhalt) => {
    const r = canPublish({ titel: "T", inhalt, status: "freigegeben" });
    expect(r.ok).toBe(false);
  });

  it("findet keine Platzhalter in normalem Text", () => {
    expect(findPlaceholders("Todos los días – Methode, Fixierung, Box")).toEqual([]);
  });
});
