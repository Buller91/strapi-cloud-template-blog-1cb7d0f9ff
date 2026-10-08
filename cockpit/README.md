# Cybershark Super Intelligence (Phase 1)

Akquise-Cockpit von Cybershark.

Internes Werkzeug für einen Nutzer: Zielfirmen, Recherche mit Claude, Nachrichtenentwürfe, Pipeline, Nachfassen, Funnel-Dashboard.
**Das Werkzeug versendet nichts.** Es schreibt Entwürfe; geprüft, kopiert und verschickt wird aus dem eigenen Postfach oder LinkedIn.

Stand: **Woche 1 (Tag 1–3)** umgesetzt. Plan, Annahmen und offene Punkte: [`docs/PLAN.md`](docs/PLAN.md).

## Stack

Next.js 15 (App Router, Server Actions) · TypeScript · Tailwind 4 · Supabase (Postgres, Auth mit Magic Link + TOTP, RLS) · Anthropic API

## Lokal starten (ein Befehl)

Voraussetzungen: [Node.js 20+](https://nodejs.org) und [Docker Desktop](https://www.docker.com/products/docker-desktop/) (gestartet).

```bash
cd cockpit
npm run lokal
```

Das Skript (`scripts/lokal.mjs`) erledigt alles Weitere:

1. installiert die Abhängigkeiten (beim ersten Mal),
2. startet die lokale Datenbank (beim ersten Mal lädt Docker einige Minuten lang),
3. schreibt `.env.local` (bestehende Werte wie `ANTHROPIC_API_KEY` bleiben erhalten),
4. legt deinen Nutzer (`ALLOWED_EMAIL`) und 30 erfundene Demo-Betriebe in verschiedenen Pipeline-Stufen an,
5. startet die App und öffnet den Browser **direkt angemeldet** unter http://localhost:3000/auth/dev-login.

Beenden mit `Ctrl+C`. Die Datenbank läuft weiter (`npx supabase stop` zum Stoppen); Daten bleiben erhalten.
Ohne Beispieldaten: `npm run lokal -- --ohne-demo`. Alles zurücksetzen: `npx supabase db reset`.

Für Recherche und Entwürfe mit Claude in `.env.local` noch `ANTHROPIC_API_KEY` und die `SENDER_*`-Angaben eintragen und neu starten.

**Direktanmeldung nur lokal:** `/auth/dev-login` meldet ohne Mail und ohne Authenticator-App an (inkl. zweitem Faktor, dessen Geheimnis in `.dev-totp-secret` liegt). Die Route ist nur aktiv mit `DEV_LOGIN=1`, im Entwicklungsmodus und bei Aufruf über `localhost`; im Produktivbetrieb (`next start`, Vercel) antwortet sie mit 404.

### Manuell (ohne Skript)

```bash
npm install
npx supabase start
cp .env.example .env.local   # Werte aus «npx supabase status» eintragen
npm run dev
```

Nutzer im Supabase Studio (http://127.0.0.1:54323) anlegen, dann unter http://localhost:3000 mit Magic Link (Mail in http://127.0.0.1:54324) und Authenticator-App anmelden.

## Tests

```bash
npm test                  # Unit-Tests (Domänenlogik)
npm run typecheck
```

Datenbank-Regeln (Trigger, RLS) werden gegen ein lokales Postgres geprüft. Die Testdatenbank wird dabei **geleert**:

```bash
createdb cockpit_test
TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/cockpit_test npm test
```

### E2E (Browser)

`tests/e2e/smoke.mjs` spielt den Ablauf im Browser durch: Login mit Magic Link + TOTP, Import von 30 Firmen, erneuter Import (nur Duplikate), Entwurf → geprüft → gesendet (Firma auf «kontaktiert», Nachfassen +5 Werktage), «kein Interesse» sperrt den Kontakt, Pipeline-Wechsel, Dashboard-Zahl, Nachfassen, Sperrliste-Export und mobile Breite.

```bash
supabase db reset
npm run build && npm start -- -p 3123   # mit APP_URL=http://127.0.0.1:3123 und ALLOWED_EMAIL=max@cybershark.test
node tests/e2e/smoke.mjs http://127.0.0.1:3123 http://127.0.0.1:54321 <SERVICE_ROLE_KEY> max@cybershark.test docs/beispiel-import.csv /tmp
```

Recherche und Entwurf werden dabei nicht über Claude erzeugt (kein API-Schlüssel nötig); der Test legt Recherche und Entwurf direkt an.

Abgedeckt:

| Bereich | Unit (`tests/unit`) | Datenbank (`tests/db`) |
|---|---|---|
| Sperrlogik | Empfängerauswahl, `assertRecipientAllowed` | Insert/Prüfung/Versand an gesperrte Kontakte scheitert; Sperre nicht aufhebbar; gelöschter gesperrter Kontakt bleibt per Hash gesperrt |
| Statusfluss | Nachrichten und Pipeline-Stufen | `entwurf → geprueft → gesendet → antwort_erhalten`, kein Überspringen, gesendete Texte unveränderlich |
| Import-Duplikate | Domain-Normalisierung, Duplikate in Datei und DB, Fallback Name+Ort, Pflichtfelder, Freemail | – |
| Veröffentlichen | nur `freigegeben`, keine Platzhalter | Trigger blockiert; Freigabe verfällt bei Inhaltsänderung |
| Dashboard | Gespräche pro Woche, Herkunftskanäle, Erstnachrichten | Pipeline-Ereignisse per Trigger |
| Kein Versand | keine Versand-Bibliotheken oder -Aufrufe im Code | – |
| RLS | – | nur Eigentümer, nur mit `aal2`, Ereignisse nicht fälschbar |

## Aufbau

```
supabase/migrations/   Schema, RLS, Audit-Log, Trigger (Sperre, Statusfluss, Veröffentlichung)
src/lib/domain/        Reine Geschäftslogik (getestet): pipeline, messages, blocklist, csv-import, funnel, publish, workdays
src/lib/ai/            Claude: Recherche, Erstnachricht, Antwortvorschlag (strukturierte Ausgabe)
src/lib/web/           Abruf öffentlicher Websites (robots.txt, keine internen Adressen, max. 5 Seiten)
src/app/(app)/         Dashboard, Zielfirmen, Pipeline, Nachfassen, Datenschutz
```

Jede Regel, die nicht verletzt werden darf (gesperrte Empfänger, Statusfluss, Veröffentlichung nur bei Freigabe), steht doppelt: in `src/lib/domain` für verständliche Meldungen und als Trigger in der Datenbank als letzte Sicherung.

## Betrieb

- **Hosting:** Supabase-Projekt in der Region *Zurich (eu-central-2)*; App z. B. auf Vercel mit Function-Region `fra1` oder auf einem Schweizer Host.
- **Geheimnisse:** nur als Umgebungsvariablen auf dem Server. `NEXT_PUBLIC_*` enthält nur URL und Anon-Key (durch RLS geschützt). Zugangsdaten in der DB (Search Console, CMS, ab Woche 2) werden mit `SECRETS_KEY` (AES-256-GCM, `src/lib/crypto.ts`) verschlüsselt.
- **Claude-Fallback:** Bei einer Ablehnung durch die Sicherheitsfilter springt serverseitig ein Ersatzmodell ein (`fallbacks: "default"`). Abschalten mit `ANTHROPIC_FALLBACKS=off`, z. B. wenn ein Modell ohne diese Funktion konfiguriert wird.
- **Aufbewahrung:** Kontakte ohne Aktivität seit 24 Monaten erscheinen unter *Datenschutz* zum Löschen. `app_private.purge_old_inquiries()` löscht Anfragen nach 24 Monaten (Planung per `pg_cron` in Woche 3).

## Nächste Schritte

- Woche 2: Search-Console-Import für cybershark.ch (täglich, Service Account), Auswertungen «Chancen auf Seite 2» / «viel gesehen, wenig geklickt», Ein-Klick-`content_item`; SEO-Tabellen mit `SPEC.md` abgleichen (Datei fehlt im Repo).
- Woche 3: Blog-Pipeline-Oberfläche mit Veröffentlichung (Regel + Trigger stehen), Webhook für Formularanfragen.
