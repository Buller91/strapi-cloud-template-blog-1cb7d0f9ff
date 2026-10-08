// End-to-End-Smoke-Test gegen lokales Supabase + laufende App (siehe README, Abschnitt «E2E»).
// Aufruf: node tests/e2e/smoke.mjs <APP_URL> <SUPABASE_URL> <SERVICE_ROLE_KEY> <ALLOWED_EMAIL> <CSV> <OUT_DIR>
// Erwartet eine frisch zurückgesetzte Datenbank (supabase db reset).
import { createHmac } from "node:crypto";
import { chromium } from "playwright";
const [, , BASE, SB_URL, SERVICE, EMAIL, CSV, OUT] = process.argv;
const admin = (path, body, method = "POST") =>
  fetch(`${SB_URL}/auth/v1/${path}`, {
    method,
    headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(JSON.stringify(j)); return j; });
const rest = (path, body, method = "POST") =>
  fetch(`${SB_URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, "content-type": "application/json", prefer: "return=representation" },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(JSON.stringify(j)); return j; });

function totp(secret) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secret.replace(/=+$/, "").toUpperCase()) bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = createHmac("sha1", key).update(counter).digest();
  const o = h[h.length - 1] & 0xf;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, "0");
}

const log = (...a) => console.log("✓", ...a);
const user = await admin("admin/users", { email: EMAIL, email_confirm: true });
log("Nutzer angelegt", user.id);
const link = await admin("admin/generate_link", { type: "magiclink", email: EMAIL });
const hashed = link.hashed_token ?? link.properties?.hashed_token;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
page.on("dialog", (d) => d.accept());
const errors = [];
page.on("pageerror", (e) => { errors.push(e.message); console.log("PAGEERROR", e.message.slice(0, 400)); });

await page.goto(`${BASE}/auth/callback?token_hash=${hashed}&type=magiclink`);
await page.waitForURL(/mfa\/einrichten/);
const secretText = await page.locator("text=Schlüssel:").textContent({ timeout: 15000 });
const secret = secretText.replace("Schlüssel:", "").trim();
await page.fill("input[autocomplete=one-time-code]", totp(secret));
await page.click("text=Bestätigen");
await page.waitForURL(`${BASE}/`);
log("Login mit Magic Link + TOTP");

// CSV-Import
await page.goto(`${BASE}/firmen/import`);
await page.fill("input[name=quelle]", "Testliste");
await page.setInputFiles("input[name=datei]", CSV);
await page.click("text=Vorschau");
await page.waitForSelector("text=Firmen importieren");
await page.click("text=30 Firmen importieren");
await page.waitForSelector("text=30 Firmen und 30 Kontakte importiert");
log("30 Firmen importiert");

// Erneuter Import → alles Duplikate
await page.goto(`${BASE}/firmen/import`);
await page.fill("input[name=quelle]", "Testliste");
await page.setInputFiles("input[name=datei]", CSV);
await page.click("text=Vorschau");
await page.waitForSelector("text=0 Firmen importieren");
log("Zweiter Import: 0 neu (Duplikate erkannt)");

await page.goto(`${BASE}/firmen?q=Brunner`);
await page.click("text=Elektro Brunner AG");
await page.waitForURL(/firmen\/[0-9a-f-]+$/);
const accountId = page.url().split("/").pop();
log("Firmenseite", accountId);

// Recherche + Entwurf direkt einfügen (ohne Anthropic-Schlüssel in der Testumgebung)
const [contact] = await rest(`contacts?account_id=eq.${accountId}&select=id,name`, null, "GET");
await rest("research_notes", { owner_id: user.id, account_id: accountId, zusammenfassung: "Leistungen:\n- Elektroinstallationen", aufhaenger: "Kein Kontaktformular auf der Website.", quellen_urls: ["https://www.elektro-brunner.example/"] });
const text = "Betreff: Anfragen über Ihre Website\n\nGrüezi Herr Brunner\n\nAuf Ihrer Website habe ich kein Kontaktformular gefunden.\n\nFalls Sie keine weiteren Nachrichten von mir wünschen, antworten Sie kurz mit «Nein danke».\n\nMax Test\nCybershark\nTeststrasse 1, 8000 Zürich\nmax@cybershark.test\nhttps://cybershark.ch";
await rest("messages", { owner_id: user.id, contact_id: contact.id, kanal: "email", entwurf: text, final: text });
await page.reload();
await page.click("text=Als geprüft markieren");
await page.waitForSelector("text=Als gesendet markieren");
log("Entwurf geprüft");
await page.click("text=Als gesendet markieren");
await page.waitForSelector("text=Firma auf «kontaktiert»");
log("Als gesendet markiert, Firma auf kontaktiert, Nachfassen eingeplant");
await page.screenshot({ path: `${OUT}/firma-mobil.png`, fullPage: true });

// Kein Interesse → sperren
await page.click("text=Antwort eintragen");
await page.fill("textarea[name=antwort]", "Danke, kein Bedarf.");
await page.check("input[name=kein_interesse]");
await page.click("button:has-text('Speichern')");
await page.waitForSelector("text=ist gesperrt und wird nicht mehr kontaktiert");
await page.reload();
const options = await page.locator("select[name=contact_id] option").allTextContents();
if (options.includes(contact.name)) throw new Error("Gesperrter Kontakt ist noch wählbar!");
log("Kein Interesse → gesperrt, nicht mehr als Empfänger wählbar");

// DB verweigert Nachricht an gesperrten Kontakt (auch mit Service-Key)
const blocked = await rest("messages", { owner_id: user.id, contact_id: contact.id, kanal: "email", entwurf: "x" }).then(() => "durchgelassen", (e) => e.message);
if (!/gesperrt/.test(blocked)) throw new Error("DB hat Nachricht an gesperrten Kontakt zugelassen: " + blocked);
log("DB-Trigger blockiert Nachricht an gesperrten Kontakt");

// Pipeline: zweite Firma auf Gespräch
await page.goto(`${BASE}/pipeline`);
await page.screenshot({ path: `${OUT}/pipeline-mobil.png`, fullPage: false });
const card = page.locator("article", { hasText: "Dach Aebi AG" });
await card.locator("select[name=status]").selectOption("gespraech");
await card.locator("button:has-text('OK')").click();
await page.locator("section", { hasText: "Gespräch" }).locator("article", { hasText: "Dach Aebi AG" }).waitFor();
log("Pipeline: Dach Aebi AG → Gespräch");

await page.goto(`${BASE}/`);
const gespraeche = await page.locator("text=Gespräche diese Woche >> xpath=following-sibling::div[1]").textContent();
if (gespraeche.trim() !== "1") throw new Error(`Dashboard Gespräche = ${gespraeche}`);
log("Dashboard: 1 Gespräch diese Woche");
await page.screenshot({ path: `${OUT}/dashboard-mobil.png`, fullPage: true });

await page.goto(`${BASE}/nachfassen`);
await page.waitForSelector("text=Elektro Brunner AG");
await page.screenshot({ path: `${OUT}/nachfassen-mobil.png`, fullPage: true });
log("Nachfassen-Liste");

await page.goto(`${BASE}/datenschutz`);
await page.waitForSelector(`text=${contact.name}`);
const csv = await page.request.get(`${BASE}/datenschutz/sperrliste.csv`);
if (!(await csv.text()).includes(contact.name)) throw new Error("Export ohne gesperrten Kontakt");
log("Datenschutz: Sperrliste + Export");

const state = await ctx.storageState();
await ctx.close();
const desk = await browser.newContext({ viewport: { width: 1400, height: 900 }, storageState: state });
const dp = await desk.newPage();
for (const [u, n] of [["/", "dashboard-desktop"], ["/pipeline", "pipeline-desktop"], ["/firmen/" + accountId, "firma-desktop"]]) {
  await dp.goto(BASE + u); await dp.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });
}
// Mobil: keine horizontale Überbreite
const mp = await (await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: state })).newPage();
for (const u of ["/", "/firmen", "/firmen/" + accountId, "/nachfassen", "/datenschutz"]) {
  await mp.goto(BASE + u);
  const w = await mp.evaluate(() => document.documentElement.scrollWidth);
  if (w > 390) throw new Error(`${u} ist auf dem Handy ${w}px breit`);
}
log("Mobil ohne horizontales Scrollen");
await browser.close();
if (errors.length) { console.log("Seitenfehler:", errors); process.exit(1); }
console.log("ALLE SCHRITTE OK");
