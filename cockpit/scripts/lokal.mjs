#!/usr/bin/env node
// Lokaler Start mit einem Befehl: npm run lokal
// Startet Supabase (Docker), schreibt .env.local, legt Nutzer und Demo-Daten an,
// startet die App und öffnet den Browser direkt angemeldet.
// Optionen: --ohne-demo (keine Beispieldaten), --port=3000
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const PORT = Number(args.find((a) => a.startsWith("--port="))?.split("=")[1] ?? 3000);
const APP = `http://localhost:${PORT}`;
const SUPABASE = ["-y", "supabase@2.40.7"];
// Nicht benötigte Dienste weglassen: schnellerer Start, weniger Download
const EXCLUDE = "studio,imgproxy,storage-api,realtime,edge-runtime,logflare,vector,supavisor,postgres-meta,mailpit";

const step = (t) => console.log(`\n\x1b[32m▸\x1b[0m ${t}`);
const fail = (t) => {
  console.error(`\n\x1b[31m✗ ${t}\x1b[0m\n`);
  process.exit(1);
};
const run = (cmd, a, opts = {}) => spawnSync(cmd, a, { cwd: ROOT, shell: process.platform === "win32", ...opts });

// 1. Voraussetzungen
const [major] = process.versions.node.split(".").map(Number);
if (major < 20) fail(`Node.js 20 oder neuer nötig (installiert: ${process.versions.node}).`);
if (run("docker", ["info"], { stdio: "ignore" }).status !== 0) {
  fail("Docker läuft nicht. Bitte Docker Desktop starten (https://www.docker.com/products/docker-desktop/) und erneut versuchen.");
}
if (!existsSync(path.join(ROOT, "node_modules"))) {
  step("Installiere Abhängigkeiten …");
  if (run("npm", ["install"], { stdio: "inherit" }).status !== 0) fail("npm install fehlgeschlagen.");
}

// 2. Supabase
step("Starte Datenbank (beim ersten Mal lädt Docker einige Minuten lang Images) …");
if (run("npx", [...SUPABASE, "start", "-x", EXCLUDE], { stdio: "inherit" }).status !== 0) {
  fail("Supabase konnte nicht starten. Läuft Docker? Mit «npx supabase stop» aufräumen und erneut versuchen.");
}
const status = run("npx", [...SUPABASE, "status", "-o", "env"], { encoding: "utf8" });
const sb = Object.fromEntries(
  [...(status.stdout ?? "").matchAll(/^([A-Z_]+)="?([^"\n]*)"?$/gm)].map((m) => [m[1], m[2]]),
);
if (!sb.API_URL || !sb.ANON_KEY || !sb.SERVICE_ROLE_KEY) fail("Supabase-Zugangsdaten nicht gefunden (supabase status).");

// 3. .env.local schreiben (bestehende Werte wie ANTHROPIC_API_KEY bleiben erhalten)
step("Schreibe .env.local …");
const envFile = path.join(ROOT, ".env.local");
const current = existsSync(envFile) ? readFileSync(envFile, "utf8") : readFileSync(path.join(ROOT, ".env.example"), "utf8");
const values = Object.fromEntries([...current.matchAll(/^([A-Z_]+)=(.*)$/gm)].map((m) => [m[1], m[2]]));
const forced = {
  NEXT_PUBLIC_SUPABASE_URL: sb.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: sb.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: sb.SERVICE_ROLE_KEY,
  APP_URL: APP,
  DEV_LOGIN: "1",
};
const defaults = { ALLOWED_EMAIL: "ich@cybershark.local", SENDER_NAME: "Vorname Nachname", SENDER_ADRESSE: "Strasse 1, 8000 Zürich", SENDER_EMAIL: "ich@cybershark.local" };
let text = current;
const setVar = (k, v) => {
  text = new RegExp(`^${k}=.*$`, "m").test(text) ? text.replace(new RegExp(`^${k}=.*$`, "m"), `${k}=${v}`) : `${text.trimEnd()}\n${k}=${v}\n`;
};
for (const [k, v] of Object.entries(forced)) setVar(k, v);
for (const [k, v] of Object.entries(defaults)) if (!values[k]) setVar(k, v);
writeFileSync(envFile, text);
const email = (values.ALLOWED_EMAIL || defaults.ALLOWED_EMAIL).trim().toLowerCase();

// 4. Nutzer anlegen
const headers = { apikey: sb.SERVICE_ROLE_KEY, authorization: `Bearer ${sb.SERVICE_ROLE_KEY}`, "content-type": "application/json" };
async function api(url, method = "GET", body) {
  const r = await fetch(`${sb.API_URL}${url}`, { method, headers: { ...headers, prefer: "return=representation" }, body: body && JSON.stringify(body) });
  const t = await r.text();
  const j = t ? JSON.parse(t) : null;
  if (!r.ok) throw Object.assign(new Error(`${method} ${url}: ${t}`), { status: r.status, body: j });
  return j;
}
step(`Lege Nutzer ${email} an …`);
let userId;
try {
  userId = (await api("/auth/v1/admin/users", "POST", { email, email_confirm: true })).id;
} catch (e) {
  if (e.status !== 422) throw e;
  const list = await api("/auth/v1/admin/users?per_page=1000");
  userId = list.users.find((u) => u.email?.toLowerCase() === email)?.id;
  if (!userId) throw e;
}

// 5. Demo-Daten
const existing = await api("/rest/v1/accounts?select=id&limit=1");
if (!args.includes("--ohne-demo") && existing.length === 0) {
  step("Lege Demo-Daten an (30 erfundene Betriebe) …");
  await seed(userId);
} else if (existing.length) {
  step("Daten vorhanden, keine Demo-Daten angelegt.");
}

// 6. App starten und Browser öffnen
step(`Starte App auf ${APP} …`);
const next = spawn("npx", ["next", "dev", "-p", String(PORT)], { cwd: ROOT, stdio: "inherit", shell: process.platform === "win32" });
const stop = () => {
  next.kill();
  console.log("\nApp beendet. Die Datenbank läuft weiter; stoppen mit: npx supabase stop");
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

for (let i = 0; i < 120; i++) {
  try {
    const r = await fetch(`${APP}/login`);
    if (r.status < 500) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 1000));
}
const loginUrl = `${APP}/auth/dev-login`;
console.log(`\n\x1b[32m✓ Bereit:\x1b[0m ${loginUrl}\n  (Beenden mit Ctrl+C)\n`);
const opener = process.platform === "darwin" ? ["open", [loginUrl]] : process.platform === "win32" ? ["cmd", ["/c", "start", "", loginUrl]] : ["xdg-open", [loginUrl]];
spawn(opener[0], opener[1], { stdio: "ignore", detached: true }).on("error", () => {}).unref();

// ---------------------------------------------------------------------------

async function seed(owner) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(new Date());
  const shift = (d) => {
    const x = new Date(`${today}T12:00:00Z`);
    x.setUTCDate(x.getUTCDate() + d);
    return x.toISOString().slice(0, 10);
  };
  const csv = readFileSync(path.join(ROOT, "docs/beispiel-import.csv"), "utf8").trim().split("\n").slice(1);
  const kanaele = ["ausgehend", "ausgehend", "ausgehend", "seo", "empfehlung", "ausgehend", "social"];
  const rows = csv.map((line, i) => {
    const [name, ort, kanton, branche, groesse, website, kontakt, funktion, mail] = line.split(";");
    const domain = website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "");
    return {
      account: { owner_id: owner, name, ort, kanton, branche, groesse_ca: groesse, website, domain, dedupe_key: domain, quelle: "Demo-Daten", quelle_datum: today, herkunftskanal: kanaele[i % kanaele.length] },
      contact: { owner_id: owner, name: kontakt, funktion, email_geschaeftlich: mail, quelle: "Demo-Daten (Firmenwebsite)", quelle_datum: today },
    };
  });
  const accounts = await api("/rest/v1/accounts", "POST", rows.map((r) => r.account));
  const contacts = await api("/rest/v1/contacts", "POST", rows.map((r, i) => ({ ...r.contact, account_id: accounts[i].id })));

  const PATH = ["recherchiert", "kontaktiert", "antwort", "gespraech", "offerte", "gewonnen"];
  // Zielstufe je Firma (Index), Rest bleibt «neu»
  const ziel = { 0: "recherchiert", 1: "recherchiert", 2: "recherchiert", 3: "recherchiert", 4: "kontaktiert", 5: "kontaktiert", 6: "kontaktiert", 7: "kontaktiert", 8: "antwort", 9: "antwort", 10: "gespraech", 11: "gespraech", 12: "offerte", 13: "gewonnen", 14: "verloren" };
  for (const [i, stufe] of Object.entries(ziel)) {
    const a = accounts[i];
    const c = contacts[i];
    await api("/rest/v1/research_notes", "POST", {
      owner_id: owner, account_id: a.id,
      zusammenfassung: `Leistungen:\n- ${a.branche === "Dachbau" ? "Steildach, Flachdach, Spenglerarbeiten" : a.branche === "Elektriker" ? "Elektroinstallationen, Photovoltaik, Service" : "Neubau, Umbau, Reparaturen"}\n\nRegion: ${a.ort} und Umgebung\n\nGrösse: ${a.groesse_ca}\n\nErkennbare Lücken:\n- Kein Kontaktformular gefunden (keine Formularfelder auf Startseite und Kontaktseite)\n- Telefonnummer nicht als anklickbarer Link (Handy)\n\n(Demo-Daten)`,
      aufhaenger: "Auf der Website gibt es keine direkte Anfragemöglichkeit – wer am Handy sucht, muss die Nummer abtippen.",
      quellen_urls: [a.website],
    });
    if (stufe === "recherchiert") {
      await api(`/rest/v1/accounts?id=eq.${a.id}`, "PATCH", { status: "recherchiert" });
      continue;
    }
    // Erstnachricht über den normalen Statusfluss bis «gesendet»
    const text = `Betreff: Anfragen über ${a.domain}\n\nGrüezi ${c.name}\n\nAuf ${a.domain} habe ich kein Kontaktformular gefunden, und am Handy lässt sich die Nummer nicht antippen. Genau dort gehen oft Anfragen verloren.\n\nDarf ich Ihnen in 15 Minuten zeigen, wie Ihr Betrieb bei Google gefunden wird? Der Sichtbarkeits-Check ist kostenlos.\n\nFalls Sie keine weiteren Nachrichten von mir wünschen, antworten Sie kurz mit «Nein danke» – dann melde ich mich nicht mehr.\n\n(Demo-Daten)`;
    const [m] = await api("/rest/v1/messages", "POST", { owner_id: owner, contact_id: c.id, kanal: "email", entwurf: text, final: text });
    await api(`/rest/v1/messages?id=eq.${m.id}`, "PATCH", { status: "geprueft" });
    await api(`/rest/v1/messages?id=eq.${m.id}`, "PATCH", { status: "gesendet", gesendet_am: new Date().toISOString() });
    await api("/rest/v1/activities", "POST", { owner_id: owner, account_id: a.id, typ: "notiz", text: `E-Mail an ${c.name} gesendet.` });

    const steps = stufe === "verloren" ? ["kontaktiert", "verloren"] : PATH.slice(1, PATH.indexOf(stufe) + 1);
    for (const s of steps) await api(`/rest/v1/accounts?id=eq.${a.id}`, "PATCH", { status: s });

    if (stufe === "kontaktiert") {
      const faellig = { 4: today, 5: shift(-2), 6: shift(3), 7: shift(6) }[i];
      await api("/rest/v1/follow_ups", "POST", { owner_id: owner, account_id: a.id, faellig_am: faellig, grund: `Nachfassen ${c.name}` });
    }
    if (stufe !== "kontaktiert" && stufe !== "verloren") {
      await api(`/rest/v1/messages?id=eq.${m.id}`, "PATCH", { status: "antwort_erhalten" });
      await api("/rest/v1/activities", "POST", { owner_id: owner, account_id: a.id, typ: "notiz", text: `Antwort von ${c.name}: Gerne, rufen Sie mich an. (Demo-Daten)` });
    }
    if (stufe === "gespraech" && i === "10") {
      const termin = new Date();
      termin.setHours(16, 0, 0, 0);
      await api("/rest/v1/activities", "POST", { owner_id: owner, account_id: a.id, typ: "termin", text: "Sichtbarkeits-Check per Telefon (Demo)", datum: termin.toISOString() });
    }
    if (stufe === "offerte" || stufe === "gewonnen") {
      await api("/rest/v1/activities", "POST", { owner_id: owner, account_id: a.id, typ: "offerte", text: "Offerte Website-Paket CHF 4'800 (Demo)" });
    }
    if (stufe === "verloren") {
      await api(`/rest/v1/contacts?id=eq.${c.id}`, "PATCH", { gesperrt: true, sperr_grund: "Kein Interesse (Demo-Daten)" });
    }
  }
  const seoFirma = accounts.find((a) => a.herkunftskanal === "seo");
  await api("/rest/v1/inquiries", "POST", { owner_id: owner, quelle: "Kontaktformular cybershark.ch", account_id: seoFirma?.id ?? null, bemerkung: "Anfrage Website-Relaunch (Demo-Daten)" });
}
