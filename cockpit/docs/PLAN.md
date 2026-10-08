# Plan Phase 1 – Woche 1 (Akquise-Kern)

## Annahmen (statt raten)

1. **`SPEC.md` fehlt im Repository.** Die SEO-Tabellen (`clients`, `gsc_connections`, `gsc_daily`, `content_items`, `content_versions`, `cms_connections`, `reports`) sind deshalb mit plausiblen Spalten angelegt und werden in Woche 2 an `SPEC.md` angepasst.
2. **Ort im Repo:** Das Repository ist eine Strapi-Blog-Vorlage. Das Cockpit liegt als eigenständige App in `cockpit/`; Strapi bleibt unangetastet (kann später als CMS über `cms_connections` angebunden werden).
3. **Framework:** Next.js 15 (App Router), weil stabiler und verbreiteter als TanStack Start.
4. **Akzentfarbe:** cybershark.ch war aus der Entwicklungsumgebung nicht erreichbar. Platzhalter `#2BD97C` als CSS-Variable `--accent` in `src/app/globals.css` – bitte durch das echte Grün ersetzen.
5. **Werktage:** Montag bis Freitag; Feiertage werden in Phase 1 nicht berücksichtigt.
6. **Kennzahlen:** Für «Antworten, Gespräche, Offerten, Abschlüsse pro Woche» braucht es den Zeitpunkt des Stufenwechsels. Dafür gibt es zusätzlich die Tabelle `pipeline_events` (per Trigger befüllt). Gezählt wird jeder Eintritt einer Firma in die Stufe im Zeitraum. Erstnachricht = erste gesendete Nachricht pro Kontakt.
7. **Eingehende Antworten** werden als `activities` (Typ `notiz`) gespeichert, weil `messages` kein Feld dafür hat.
8. **Sperrliste über Löschung hinaus:** Wird ein gesperrter Kontakt gelöscht, bleibt ein SHA-256-Hash von E-Mail/LinkedIn-URL in `suppressions`, damit ein erneuter Import ihn sofort sperrt. Ohne das würde die Löschfunktion die Sperre aushebeln.
9. **Freemail-Adressen** (gmail, gmx, bluewin, …) gelten als möglicherweise privat: beim CSV-Import wird die Adresse nicht übernommen (Warnung im Bericht); bei manueller Eingabe nur mit ausdrücklicher Bestätigung «geschäftliche Adresse».
10. **Duplikate ohne Website:** Fallback-Schlüssel Name + Ort (normalisiert).
11. **Login:** Magic Link nur für die in `ALLOWED_EMAIL` hinterlegte Adresse, keine Selbstregistrierung, TOTP als zweiter Faktor (Supabase MFA). RLS verlangt `aal2`, d. h. ohne zweiten Faktor liefert die Datenbank nichts.
12. **Kanban:** Stufenwechsel per Auswahlfeld auf der Karte statt Drag & Drop (funktioniert auf dem Handy zuverlässig).

## Dateien und Reihenfolge

Tag 1
- `supabase/migrations/0001_schema.sql` – Tabellen, Checks, RLS (owner + aal2), Audit-Trigger, `pipeline_events`-Trigger
- `supabase/migrations/0002_guards.sql` – Sperr-Trigger auf `messages`, Statusfluss-Trigger, Veröffentlichungs-Trigger für `content_items`
- `src/lib/supabase/*`, `src/middleware.ts`, `src/app/login`, `src/app/mfa/*` – Auth mit zweitem Faktor
- `src/lib/domain/{pipeline,csv-import,normalize}.ts` + Tests
- `src/app/(app)/firmen/*` – Liste mit Filtern, manuelle Eingabe, CSV-Import mit Vorschau
- `src/app/(app)/pipeline` – Kanban

Tag 2
- `src/lib/ai/{client,research,draft}.ts`, `src/lib/web/fetch-site.ts` (nur öffentliche Seiten, robots.txt, kein Zugriff auf interne Adressen)
- `src/lib/domain/{messages,blocklist,draft-rules}.ts` + Tests
- Firmen-Detailseite: Recherche, Kontakte, Entwürfe, Statusfluss, Sperren

Tag 3
- `src/lib/domain/{workdays,funnel}.ts` + Tests
- `src/app/(app)/nachfassen`, Dashboard `/`
- Antwort eintragen → Claude-Antwortvorschlag / «kein Interesse» sperrt sofort
- `src/app/(app)/datenschutz` – Sperrliste (Suche, CSV-Export), Auskunft (JSON), Löschen, Herkunft, 24-Monats-Hinweis

Später (Woche 2/3): Search-Console-Import, Auswertungen, Blog-Pipeline-UI, Webhook `inquiries`. Die Veröffentlichungsregel (`publish.ts` + DB-Trigger) ist bereits jetzt umgesetzt und getestet.
