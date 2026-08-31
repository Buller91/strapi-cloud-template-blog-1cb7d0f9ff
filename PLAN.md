# Riviera — Plan

Digitaler VIP-Concierge für Mykonos, Ibiza und St. Tropez. Gäste stellen ihr
Programm zusammen, bevor sie anreisen.

Dieses Dokument ist die Bauanleitung: Annahmen, Architektur, Datenmodell,
Reihenfolge. Es wird noch kein Code geschrieben.

---

## 1. Annahmen

Diese acht Punkte tragen den gesamten Plan. Ändert sich einer davon, ändert
sich die Architektur — insbesondere A1, A2 und A5.

| # | Frage | Annahme für v1 |
|---|---|---|
| A1 | Was passiert beim Buchen? | Die App ist ein Anfrage-Generator, kein Buchungssystem. Am Ende entsteht eine formatierte Zusammenfassung mit Referenz, die per `mailto:` oder WhatsApp an das Concierge-Team geht. |
| A2 | Warenkorb oder Reiseplan? | Reiseplan nach Tagen, mit Uhrzeit pro Eintrag. |
| A3 | Kategorien | Beach Club, Restaurant, Yacht, Nightlife, Transfer, Villa, Wellness. |
| A4 | Inhalte | Statische JSON-Dateien im Repo, gepflegt per Commit. |
| A5 | Preise & Verfügbarkeit | Indikativ („ab X €" / „auf Anfrage"). Keine Verfügbarkeitsprüfung, keine Zahlung. |
| A6 | Accounts | Kein Login. `localStorage` pro Gerät, plus teilbarer Link mit dem Plan in der URL. |
| A7 | Sprache & Währung | Englisch, EUR. Texte zentral in einer Datei, damit Deutsch später ohne Umbau dazukommt. |
| A8 | Design & Hosting | Mobile-first, dunkle Luxus-Ästhetik, eine Akzentfarbe. Statisches Bundle auf Vercel oder GitHub Pages. |

### Nicht in v1

Bewusst ausgeschlossen, damit der Umfang hält: Zahlungen, echte
Verfügbarkeit, Login und Gästekonten, Admin-Oberfläche zum Pflegen der
Angebote, E-Mail-Versand aus der App heraus, Mehrsprachigkeit,
Partner-/Anbieterseite, Push-Benachrichtigungen.

---

## 2. Was „kein Backend" konkret bedeutet

Ohne Server verschieben sich drei Dinge, und der Plan muss das ehrlich
abbilden statt es zu kaschieren:

**Die Anfrage verlässt die App über den Gast, nicht über einen Server.**
Beim Absenden baut die App einen Text und öffnet `mailto:` oder einen
WhatsApp-Link. Der Gast drückt in seinem eigenen Mail- oder Chat-Client auf
Senden. Zusätzlich gibt es einen „Kopieren"-Button, weil `mailto:` auf
manchen Geräten unzuverlässig ist. Die App kann deshalb nie garantieren,
dass eine Anfrage angekommen ist — die Bestätigungsseite sagt das klar und
nennt die Referenznummer plus eine direkte Kontaktmöglichkeit.

**Der Plan lebt im Browser.** `localStorage` unter einem versionierten Key.
Beim Laden wird gegen ein Schema geprüft; passt es nicht (altes Format,
manipuliert, kaputt), wird verworfen statt zu crashen. Ein geleerter Browser
heißt: Plan weg. Deshalb der Teilen-Link.

**Teilen ohne Server:** der Reiseplan wird kompakt kodiert (nur IDs, Daten,
Uhrzeiten, Personenzahl) und landet im URL-Fragment (`#plan=…`). Wer den
Link öffnet, sieht denselben Plan. Das Fragment geht nicht an einen Server,
enthält aber Reisedaten — also gehören dort keine Gastdaten hinein, nur der
Plan selbst.

**Preise sind unverbindlich.** Alle Zwischensummen tragen sichtbar den
Hinweis „indikativ, Bestätigung durch das Concierge-Team".

---

## 3. Stack

Bewusst klein gehalten:

- **Vite** als Build-Tool und Dev-Server.
- **React 18**, Function Components und Hooks, in reinem JavaScript (`.jsx`).
  Kein TypeScript — bei dieser Größe kostet es mehr, als es einbringt.
  Datenformen werden per JSDoc dokumentiert.
- **Tailwind CSS v4** über das Vite-Plugin. Design-Tokens (Farben,
  Schriftgrößen, Radien) als CSS-Variablen an einer Stelle.
- **react-router-dom** mit `HashRouter` — läuft auf jedem statischen Hosting
  ohne Rewrite-Regeln.
- **State**: React Context plus `useReducer`. Keine State-Library.
- **Keine** UI-Komponenten-Bibliothek. Ein Dutzend eigene Komponenten ist
  weniger Aufwand als eine Bibliothek zu überschreiben, und das Design
  soll eigen aussehen.

Einzige Laufzeit-Abhängigkeiten: `react`, `react-dom`, `react-router-dom`.

### Ort im Repository

Das Repo enthält aktuell ein Strapi-Blog-Template, das mit Riviera nichts zu
tun hat. Die App kommt deshalb in einen eigenen Ordner `riviera/` mit
eigener `package.json`. Das Template bleibt unangetastet und kann später in
einem separaten Commit entfernt werden, wenn du das willst — das ist eine
Löschung, die du entscheidest, nicht ich.

---

## 4. Struktur

```
riviera/
  index.html
  vite.config.js
  package.json
  src/
    main.jsx
    App.jsx                  Router + Layout-Shell
    styles.css               Tailwind-Import + Design-Tokens

    data/
      destinations.json      3 Destinationen
      experiences.json       Angebote, alle Destinationen
      copy.js                alle sichtbaren Texte (i18n-Vorstufe)

    lib/
      storage.js             localStorage lesen/schreiben/validieren
      share.js               Plan <-> URL-Fragment kodieren
      request.js             Anfragetext + mailto/WhatsApp-Link + Referenz
      format.js              Preis, Datum, Uhrzeit
      schedule.js            Tagesgruppierung, Überschneidungen finden

    state/
      TripContext.jsx        Provider, Reducer, Persistenz
      tripReducer.js         reine Zustandslogik, ohne React

    components/
      ui/                    Button, Card, Chip, Field, Modal, Sheet, Price
      layout/                Header, BottomNav, Page, Footer
      experience/            ExperienceCard, ExperienceGrid, FilterBar,
                             BookingSheet
      itinerary/             DayColumn, ItineraryItem, ItinerarySummary,
                             ConflictNotice

    pages/
      Landing.jsx            /
      Destination.jsx        /d/:slug
      Experiences.jsx        /d/:slug/experiences
      ExperienceDetail.jsx   /experience/:id
      Itinerary.jsx          /itinerary
      Request.jsx            /request
      Sent.jsx               /sent/:reference
      NotFound.jsx
```

### Routen

| Route | Inhalt |
|---|---|
| `/` | Marke, drei Destinationen, Einstieg |
| `/d/:slug` | Destination: Bild, Kurztext, Kategorien, Reisedaten setzen |
| `/d/:slug/experiences` | Katalog mit Filter nach Kategorie, Preisband, Tag |
| `/experience/:id` | Detail, Bilder, Eckdaten, „Zum Reiseplan hinzufügen" |
| `/itinerary` | Der Plan nach Tagen, bearbeiten, Zwischensumme |
| `/request` | Gastdaten, Wünsche, Zusammenfassung, Absenden |
| `/sent/:reference` | Referenz, Kopie der Anfrage, Kontakt |

---

## 5. Datenmodell

**Destination**

```
{ slug, name, country, tagline, heroImage, palette, months, intro }
```

**Experience**

```
{
  id, destination, category, name, venue, summary, description,
  images: [url],
  priceFrom: number | null,       // null = auf Anfrage
  priceUnit: "person" | "group" | "day" | "minimum-spend",
  duration: { hours } | null,
  typicalStart: "20:30" | null,
  capacity: { min, max },
  tags: ["sunset", "family", "adults-only", ...],
  notes: "Dresscode, Vorlauf, Saison"
}
```

**Trip** (der gesamte App-State, das Einzige was persistiert wird)

```
{
  version: 1,
  destination: slug | null,
  dates: { arrival, departure } | null,
  party: { adults, children },
  items: [
    { itemId, experienceId, date, time, guests, note }
  ],
  guest: { name, email, phone, whatsapp, requests }   // nie im Teilen-Link
}
```

`itemId` ist eine lokal erzeugte ID, damit dasselbe Angebot mehrfach an
verschiedenen Tagen im Plan stehen kann.

**Reducer-Aktionen:** `SET_DESTINATION`, `SET_DATES`, `SET_PARTY`,
`ADD_ITEM`, `UPDATE_ITEM`, `REMOVE_ITEM`, `SET_GUEST`, `LOAD_TRIP`,
`RESET`.

---

## 6. Bau-Reihenfolge

Sieben Phasen. Jede endet in einem Zustand, den man im Browser ansehen kann
— keine Phase besteht nur aus unsichtbarer Vorarbeit.

### Phase 0 — Gerüst
Vite-Projekt in `riviera/`, Tailwind v4 eingebunden, HashRouter mit allen
sieben Routen als Platzhalterseiten, Layout-Shell (Header, Inhalt,
Bottom-Nav auf Mobile). `npm run dev` und `npm run build` laufen.
**Fertig, wenn:** man durch alle Routen klicken kann.

### Phase 1 — Design-System
Tokens als CSS-Variablen: Hintergrund, Fläche, Text, gedämpfter Text,
Akzent, Rahmen, Radien, Schriftskala. Basiskomponenten: `Button` (3
Varianten), `Card`, `Chip`, `Field`, `Price`, `Sheet` (Bottom-Sheet mobil,
Modal ab Desktop). Eine Seite mit allen Zuständen zum Ansehen.
**Fertig, wenn:** die Bausteine stehen und in beiden Breiten sauber aussehen.

### Phase 2 — Daten
`destinations.json` mit drei Einträgen, `experiences.json` mit 10–15
Angeboten pro Destination (echte Orte, plausible Preise, Platzhalterbilder).
Loader mit Filter- und Suchfunktionen, `format.js`, `copy.js`.
**Fertig, wenn:** die Daten laden und im Katalog roh gerendert werden.

### Phase 3 — Browsen
Landing mit drei Destinationskarten, Destination-Seite, Katalog mit
Kategoriefilter und Preisband, Detailseite. Alles noch ohne Reiseplan.
**Fertig, wenn:** man vom Start bis zu jedem Angebot navigieren kann und es
gut aussieht.

### Phase 4 — Reiseplan
`TripContext` mit Reducer und `localStorage`-Persistenz. Reisedaten setzen.
`BookingSheet` zum Hinzufügen (Datum, Uhrzeit, Personen, Notiz). Die
Itinerary-Seite: nach Tagen gruppiert, chronologisch, bearbeitbar,
löschbar. Überschneidungen werden als Hinweis markiert, nicht blockiert —
zwei Dinge am selben Abend können gewollt sein. Zwischensumme mit dem
Hinweis, dass sie indikativ ist. Leere Zustände für „noch nichts geplant".
**Fertig, wenn:** ein Plan einen Reload übersteht.

### Phase 5 — Anfrage
Formular für Gastdaten mit Validierung (Name, mindestens ein Kontaktweg,
Freitext). Zusammenfassung. `request.js` baut den Anfragetext, erzeugt eine
Referenz (`RIV-` plus Datum plus vier Zeichen), und stellt drei Wege bereit:
`mailto:`, WhatsApp, Zwischenablage. Danach `/sent/:reference` mit Referenz,
vollständiger Kopie und Kontaktdaten — plus dem klaren Hinweis, dass die
Anfrage erst zählt, wenn sie im Mail- oder Chat-Client tatsächlich gesendet
wurde.
**Fertig, wenn:** ein kompletter Durchlauf vom Start bis zur Referenz
funktioniert.

### Phase 6 — Schliff
Teilen-Link (`share.js`, Kodierung und Wiederherstellung inklusive
Fehlerfall bei kaputtem Link). Druck-/PDF-Ansicht des Plans über
Print-Styles. Bilder als `loading="lazy"` mit fester Größe gegen
Layout-Sprünge. Tastaturbedienung und Fokusfalle im Sheet, `aria`-Labels,
Kontrast geprüft. 404-Seite. Kein-JavaScript-Hinweis in `index.html`.
**Fertig, wenn:** die App sich auf dem Handy fertig anfühlt.

### Phase 7 — Deploy
Production-Build prüfen, Bundle-Größe ansehen, Favicon und Meta-Tags,
Open-Graph-Bild, Deploy-Konfiguration für das gewählte Hosting, kurze
README mit Anleitung zum Pflegen der Angebots-JSON.
**Fertig, wenn:** eine öffentliche URL läuft.

---

## 7. Reihenfolge-Begründung

Die Datenschicht kommt vor der Oberfläche (Phase 2 vor 3), weil sich die
Form der Angebote sonst durch fertige Komponenten zieht und jede Änderung
teuer wird. Der Reiseplan-State kommt erst, wenn das Browsen steht (Phase 4
nach 3), weil man erst dann weiß, was ein Eintrag wirklich braucht. Der
Teilen-Link kommt zuletzt, weil er das Datenformat kodiert — er sollte auf
ein stabiles Format treffen, sonst brechen geteilte Links beim nächsten
Umbau.

---

## 8. Bekannte Risiken

- **`mailto:` ist unzuverlässig** — lange URLs werden auf manchen Geräten
  abgeschnitten, manche Browser haben keinen Handler. Deshalb sind
  WhatsApp und Zwischenablage gleichwertige Wege, nicht Notlösungen.
- **`localStorage` kann fehlen oder werfen** (privater Modus, blockierte
  Site-Daten). Jeder Zugriff wird abgesichert; die App muss ohne
  gespeicherten Plan korrekt funktionieren.
- **Der Teilen-Link wird lang.** Nur IDs und Kurzfelder kodieren, keine
  Texte. Wenn er über ~2000 Zeichen geht, wird er auf manchen Plattformen
  abgeschnitten — dann greift der Kopieren-Weg.
- **Bilder dominieren die Ladezeit.** Feste Seitenverhältnisse, `lazy`,
  und für v1 externe Bild-URLs mit Größenparameter statt Originaldateien.
- **Preise veralten.** Die JSON trägt ein `updated`-Datum pro Destination,
  das auf der Seite sichtbar ist.

---

## 9. Offene Entscheidungen

Diese Punkte blockieren den Start nicht, sollten aber vor Phase 5
beziehungsweise Phase 2 geklärt sein:

1. Ziel-Adresse und WhatsApp-Nummer des Concierge-Teams (vor Phase 5).
2. Echte Angebotsliste pro Destination, oder baue ich v1 mit plausiblen
   Platzhaltern (vor Phase 2)?
3. Markenname, Logo, Schriftwahl (vor Phase 1).
4. Hosting: Vercel oder GitHub Pages (vor Phase 7).
