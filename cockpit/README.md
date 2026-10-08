# Cybershark Akquise-Cockpit (Phase 1)

Internes Werkzeug für einen Nutzer: Zielfirmen, Recherche mit Claude, Nachrichtenentwürfe, Pipeline, Nachfassen, Funnel-Dashboard.
**Das Werkzeug versendet nichts.** Es schreibt Entwürfe; geprüft, kopiert und verschickt wird aus dem eigenen Postfach oder LinkedIn.

Stand: **Woche 1 (Tag 1–3)** umgesetzt. Plan, Annahmen und offene Punkte: [`docs/PLAN.md`](docs/PLAN.md).

## Stack

Next.js 15 (App Router, Server Actions) · TypeScript · Tailwind 4 · Supabase (Postgres, Auth mit Magic Link + TOTP, RLS) · Anthropic API

## Lokal starten

Voraussetzungen: Node 20+, Docker, [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
cd cockpit
npm install
supabase start            # startet Postgres, Auth, Studio, Inbucket (lokale Mails)
supabase db reset         # spielt supabase/migrations ein
cp .env.example .env.local
```

In `.env.local` eintragen:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` aus `supabase status`
- `ALLOWED_EMAIL` – die eine Adresse, die sich anmelden darf
- `ANTHROPIC_API_KEY`, optional `ANTHROPIC_MODEL` (Standard `claude-opus-5-5`)
- `SENDER_*` – Absenderangaben, werden in jeden Entwurf eingesetzt
- `OFFER_TEXT` – Einstiegsangebot (Sichtbarkeits-Check)

Nutzer einmalig anlegen (Selbstregistrierung ist abgeschaltet): Studio http://127.0.0.1:54323 → Authentication → *Add user* → *Send magic link* bzw. *Create user* mit derselben Adresse wie `ALLOWED_EMAIL`.

```bash
npm run dev               # http://localhost:3000
```

Anmeldung: Adresse eingeben → Link aus Inbucket (http://127.0.0.1:54324) öffnen → beim ersten Mal QR-Code mit Authenticator-App scannen → Code eingeben. Ohne zweiten Faktor liefert die Datenbank keine Daten (RLS verlangt `aal2`).

Zum Ausprobieren: `docs/beispiel-import.csv` (30 erfundene Betriebe) unter *Zielfirmen → CSV-Import*.

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
