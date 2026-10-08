import { describe, expect, it } from "vitest";
import { MessageFlowError, canChangeStatus, nextStatus, statusAfterEdit } from "@/lib/domain/messages";
import { allowedTransitions, assertTransition, canTransition, needsFollowUp, stageAfterSend } from "@/lib/domain/pipeline";
import { STAGES } from "@/lib/domain/types";

describe("Statusfluss Nachrichten", () => {
  it("geht entwurf → geprueft → gesendet → antwort_erhalten", () => {
    let m = { status: "entwurf" as const, final: "Text" } as { status: any; final: string };
    m.status = nextStatus(m, "geprueft");
    m.status = nextStatus(m, "gesendet");
    m.status = nextStatus(m, "antwort_erhalten");
    expect(m.status).toBe("antwort_erhalten");
  });

  it("verbietet Versand ohne Prüfung", () => {
    expect(canChangeStatus("entwurf", "gesendet")).toBe(false);
    expect(() => nextStatus({ status: "entwurf", final: "x" }, "gesendet")).toThrow(MessageFlowError);
  });

  it("verlangt finalen Text zum Prüfen", () => {
    expect(() => nextStatus({ status: "entwurf", final: " " }, "geprueft")).toThrow(/finalen Text/);
  });

  it("setzt Geprüftes beim Bearbeiten auf Entwurf zurück", () => {
    expect(statusAfterEdit("geprueft")).toBe("entwurf");
    expect(() => statusAfterEdit("gesendet")).toThrow();
  });

  it("kennt keinen Weg zurück nach dem Versand", () => {
    expect(canChangeStatus("gesendet", "entwurf")).toBe(false);
    expect(canChangeStatus("gesendet", "geprueft")).toBe(false);
  });
});

describe("Statusfluss Pipeline", () => {
  it("erlaubt den normalen Weg bis gewonnen", () => {
    const weg = ["neu", "recherchiert", "kontaktiert", "antwort", "gespraech", "offerte", "gewonnen"] as const;
    for (let i = 1; i < weg.length; i++) expect(canTransition(weg[i - 1]!, weg[i]!)).toBe(true);
  });

  it("erlaubt verloren aus jeder offenen Stufe", () => {
    for (const s of STAGES.filter((s) => s !== "gewonnen" && s !== "verloren")) {
      expect(canTransition(s, "verloren")).toBe(true);
    }
  });

  it("verbietet Sprünge zu gewonnen ohne Gespräch", () => {
    expect(canTransition("neu", "gewonnen")).toBe(false);
    expect(canTransition("kontaktiert", "offerte")).toBe(false);
    expect(() => assertTransition("neu", "gewonnen")).toThrow();
  });

  it("keine Stufe führt auf sich selbst", () => {
    for (const s of STAGES) expect(allowedTransitions(s)).not.toContain(s);
  });

  it("schlägt beim Wechsel auf kontaktiert ein Nachfassen vor", () => {
    expect(needsFollowUp("kontaktiert")).toBe(true);
    expect(needsFollowUp("gespraech")).toBe(false);
  });

  it("setzt nach dem Versand auf kontaktiert, aber nicht zurück", () => {
    expect(stageAfterSend("neu")).toBe("kontaktiert");
    expect(stageAfterSend("recherchiert")).toBe("kontaktiert");
    expect(stageAfterSend("gespraech")).toBe("gespraech");
  });
});
