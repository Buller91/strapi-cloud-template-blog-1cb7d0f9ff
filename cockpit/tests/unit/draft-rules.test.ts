import { describe, expect, it } from "vitest";
import { checkDraft, finalizeDraft } from "@/lib/domain/draft-rules";

const sender = { name: "Max Hai", firma: "Cybershark", adresse: "Bahnhofstrasse 1, 8001 Zürich", email: "max@cybershark.ch", web: "https://cybershark.ch" };

describe("Entwurfsregeln", () => {
  it("ergänzt Absender und Ablehnungshinweis", () => {
    const t = finalizeDraft("Grüezi Herr Muster\n\nIhre Seite hat kein Kontaktformular.", sender, "email");
    expect(checkDraft(t, sender, "email")).toEqual([]);
    expect(t).toContain("max@cybershark.ch");
    expect(t).toMatch(/keine weiteren Nachrichten/);
  });

  it("ersetzt ß durch ss", () => {
    expect(finalizeDraft("Grüße", sender, "email")).toContain("Grüsse");
  });

  it("meldet fehlende Angaben in bearbeitetem Text", () => {
    const issues = checkDraft("Hallo {{name}}, Grüße", sender, "linkedin");
    expect(issues.join(" ")).toMatch(/ß/);
    expect(issues.join(" ")).toMatch(/Ablehnen/);
    expect(issues.join(" ")).toMatch(/Absender/);
    expect(issues.join(" ")).toMatch(/Platzhalter/);
  });

  it("ergänzt den Hinweis nicht doppelt", () => {
    const once = finalizeDraft("Text", sender, "email");
    expect(finalizeDraft(once, sender, "email")).toBe(once);
  });
});
