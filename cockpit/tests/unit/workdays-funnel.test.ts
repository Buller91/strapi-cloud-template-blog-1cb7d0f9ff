import { describe, expect, it } from "vitest";
import { computeFunnel } from "@/lib/domain/funnel";
import { addWorkdays, weekStart, zurichDate } from "@/lib/domain/workdays";

describe("Werktage", () => {
  it("Donnerstag + 5 Werktage = Donnerstag nächste Woche", () => {
    expect(addWorkdays("2026-10-08", 5)).toBe("2026-10-15");
  });
  it("Freitag + 1 Werktag = Montag", () => {
    expect(addWorkdays("2026-10-09", 1)).toBe("2026-10-12");
  });
  it("Samstag + 5 Werktage = Freitag", () => {
    expect(addWorkdays("2026-10-10", 5)).toBe("2026-10-16");
  });
  it("Wochenbeginn ist Montag", () => {
    expect(weekStart("2026-10-11")).toBe("2026-10-05");
    expect(weekStart("2026-10-05")).toBe("2026-10-05");
  });
  it("rechnet in Zürcher Zeit", () => {
    expect(zurichDate(new Date("2026-10-08T22:30:00Z"))).toBe("2026-10-09");
  });
});

describe("Funnel-Dashboard", () => {
  const now = new Date("2026-10-08T10:00:00Z"); // Donnerstag
  const input = {
    accounts: [
      { id: "a1", herkunftskanal: "ausgehend" as const, erstellt_am: "2026-10-05T08:00:00Z" },
      { id: "a2", herkunftskanal: "seo" as const, erstellt_am: "2026-10-01T08:00:00Z" },
      { id: "a3", herkunftskanal: "empfehlung" as const, erstellt_am: "2026-09-20T08:00:00Z" },
    ],
    events: [
      { account_id: "a1", nach: "gespraech" as const, zeitpunkt: "2026-10-06T09:00:00Z" },
      { account_id: "a1", nach: "antwort" as const, zeitpunkt: "2026-10-06T10:00:00Z" },
      { account_id: "a1", nach: "gespraech" as const, zeitpunkt: "2026-10-07T09:00:00Z" }, // doppelt
      { account_id: "a2", nach: "gespraech" as const, zeitpunkt: "2026-10-02T09:00:00Z" }, // Vorwoche
      { account_id: "a3", nach: "gespraech" as const, zeitpunkt: "2026-10-08T09:00:00Z" },
      { account_id: "a3", nach: "gewonnen" as const, zeitpunkt: "2026-10-08T09:30:00Z" },
    ],
    sent: [
      { contact_id: "c1", account_id: "a1", gesendet_am: "2026-10-05T09:00:00Z" },
      { contact_id: "c1", account_id: "a1", gesendet_am: "2026-10-07T09:00:00Z" }, // Nachfassen, keine Erstnachricht
      { contact_id: "c2", account_id: "a2", gesendet_am: "2026-09-30T09:00:00Z" },
    ],
    inquiries: [{ datum: "2026-10-06T12:00:00Z" }],
  };
  const f = computeFunnel(input, now);

  it("zählt Gespräche pro Woche (pro Firma einmal)", () => {
    expect(f.woche.total.gespraeche).toBe(2);
    expect(f.monat.total.gespraeche).toBe(3);
  });

  it("teilt nach Herkunftskanal auf", () => {
    expect(f.woche.nachKanal.ausgehend.gespraeche).toBe(1);
    expect(f.woche.nachKanal.empfehlung.gespraeche).toBe(1);
    expect(f.woche.nachKanal.seo.gespraeche).toBe(0);
    expect(f.monat.nachKanal.seo.gespraeche).toBe(1);
    expect(f.woche.nachKanal.empfehlung.abschluesse).toBe(1);
  });

  it("zählt nur Erstnachrichten", () => {
    expect(f.woche.total.erstnachrichten).toBe(1);
    expect(f.monat.total.erstnachrichten).toBe(1);
  });

  it("zählt neue Firmen und Anfragen", () => {
    expect(f.woche.total.neue_firmen).toBe(1);
    expect(f.monat.total.neue_firmen).toBe(2);
    expect(f.woche.anfragen).toBe(1);
  });

  it("liefert den Verlauf der letzten 8 Wochen", () => {
    expect(f.gespraecheVerlauf).toHaveLength(8);
    expect(f.gespraecheVerlauf.at(-1)).toEqual({ woche: "2026-10-05", anzahl: 2 });
    expect(f.gespraecheVerlauf.at(-2)).toEqual({ woche: "2026-09-28", anzahl: 1 });
  });
});
