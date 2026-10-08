import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Akzeptanzkriterium: Es gibt keine Funktion, die Nachrichten automatisch oder in Serie versendet.
const root = path.resolve(import.meta.dirname, "../..");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

describe("Kein Versand aus dem Werkzeug", () => {
  it("hat keine Versand-Bibliotheken als Abhängigkeit", () => {
    const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    const verboten = /(nodemailer|sendgrid|mailgun|postmark|resend|@aws-sdk\/client-ses|smtp|mailjet|brevo|sendinblue|twilio|linkedin)/i;
    expect(deps.filter((d) => verboten.test(d))).toEqual([]);
  });

  it("enthält im Code keine Versand-Aufrufe", () => {
    const verboten = /(sendMail|createTransport|smtp:\/\/|api\.linkedin\.com|messages\.send\(|gmail\.users\.messages)/i;
    const treffer = files(path.join(root, "src")).filter((f) => verboten.test(readFileSync(f, "utf8")));
    expect(treffer).toEqual([]);
  });
});
