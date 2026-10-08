import { describe, expect, it } from "vitest";
import { RecipientBlockedError, assertRecipientAllowed, blockFields, selectableRecipients } from "@/lib/domain/blocklist";

const offen = { id: "1", name: "Anna Keller", gesperrt: false };
const gesperrt = { id: "2", name: "Beat Huber", gesperrt: true };

describe("Sperrlogik", () => {
  it("bietet gesperrte Kontakte nicht als Empfänger an", () => {
    expect(selectableRecipients([offen, gesperrt]).map((c) => c.id)).toEqual(["1"]);
  });

  it("wirft bei einem gesperrten Empfänger", () => {
    expect(() => assertRecipientAllowed(gesperrt)).toThrow(RecipientBlockedError);
  });

  it("lässt einen offenen Empfänger zu", () => {
    expect(() => assertRecipientAllowed(offen)).not.toThrow();
  });

  it("wirft bei fehlendem Kontakt", () => {
    expect(() => assertRecipientAllowed(null)).toThrow(/nicht gefunden/);
  });

  it("verlangt einen Grund und setzt das Datum", () => {
    expect(() => blockFields("  ")).toThrow(/Grund/);
    const now = new Date("2026-10-08T10:00:00Z");
    expect(blockFields("kein Interesse", now)).toEqual({
      gesperrt: true,
      sperr_grund: "kein Interesse",
      sperr_datum: "2026-10-08T10:00:00.000Z",
    });
  });
});
