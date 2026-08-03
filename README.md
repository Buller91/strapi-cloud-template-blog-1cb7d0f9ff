# 📍 Bars, Restaurants & Clubs in der Umgebung

Zusätzlich zum Blog-Template enthält dieses Projekt einen Venue-Finder: eine Web-App, die
Bars, Restaurants und Clubs in der Umgebung anzeigt. Ein Klick auf einen Eintrag öffnet
die Detailansicht mit Bewertungen, Kontaktdaten, Social-Media-Profilen, Bildern von Essen
und Getränken sowie den Preisen.

## Starten

```
npm install
npm run develop
```

Danach die App im Browser öffnen:

```
http://localhost:1337/app
```

Beim ersten Start werden 15 Beispiel-Locations in Berlin importiert und die Rolle
`Public` bekommt Lesezugriff auf `venue`. Der Import ist idempotent – in einer bereits
eingerichteten Datenbank lässt er sich jederzeit nachholen:

```
npm run seed:venues
```

> Die Beispiel-Locations sind frei erfunden. Namen, Bewertungen und Preise gehören zu
> keinem realen Betrieb.

## Funktionen der App

- Umkreissuche über die Browser-Geolocation (`Mein Standort`) oder über die Stadtteil-Auswahl
- Filter nach Kategorie (Restaurant / Bar / Club), Umkreis (1–25 km), Volltextsuche und „Jetzt geöffnet“
- Sortierung nach Entfernung, Bewertung oder Preisniveau
- Detailansicht mit Beschreibung, Merkmalen, Kontakt (Telefon, E-Mail, Website, Karte,
  Reservierung), Social Media, Fotogalerie nach Essen/Getränken/Location, Speise- und
  Getränkekarte mit Preisen, Bewertungen und Öffnungszeiten
- Deep Links: `http://localhost:1337/app/#/venue/<slug>` öffnet eine Location direkt

## API

| Methode | Route | Beschreibung |
| --- | --- | --- |
| `GET` | `/api/venues` | Alle Locations, inkl. Komponenten und Medien |
| `GET` | `/api/venues/:documentId` | Eine Location |
| `GET` | `/api/venues/nearby` | Locations sortiert nach Entfernung, mit `distanceKm` pro Eintrag |

Parameter von `/api/venues/nearby`:

| Parameter | Pflicht | Beispiel | Bedeutung |
| --- | --- | --- | --- |
| `latitude`, `longitude` | ja | `52.52`, `13.405` | Ausgangspunkt |
| `radius` | nein | `5` | Maximale Entfernung in km |
| `kind` | nein | `bar,club` | Kategorien, kommagetrennt |
| `search` | nein | `techno` | Suche in Name, Küche, Stadtteil, Stadt, Kurzbeschreibung |
| `limit` | nein | `200` | Maximale Trefferzahl |

Beispiel:

```
curl "http://localhost:1337/api/venues/nearby?latitude=52.52&longitude=13.405&radius=5&kind=bar"
```

## Eigene Locations pflegen

Im Admin-Panel unter `Content Manager → Venue`. Fehlt bei einer Location ein Bild, zeigt
die App eine generierte Kachel mit Bildunterschrift. Sobald in `photos` bzw. `menu` ein
Bild hochgeladen (`image`) oder eine Bild-URL (`imageUrl`) hinterlegt wird, verwendet die
App dieses Bild.

Die App liegt als statische Dateien unter `public/app/` (`index.html`, `app.css`, `app.js`)
und braucht keinen Build-Schritt.

---

# 🚀 Getting started with Strapi

Strapi comes with a full featured [Command Line Interface](https://docs.strapi.io/dev-docs/cli) (CLI) which lets you scaffold and manage your project in seconds.

### `develop`

Start your Strapi application with autoReload enabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-develop)

```
npm run develop
# or
yarn develop
```

### `start`

Start your Strapi application with autoReload disabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-start)

```
npm run start
# or
yarn start
```

### `build`

Build your admin panel. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-build)

```
npm run build
# or
yarn build
```

## ⚙️ Deployment

Strapi gives you many possible deployment options for your project including [Strapi Cloud](https://cloud.strapi.io). Browse the [deployment section of the documentation](https://docs.strapi.io/dev-docs/deployment) to find the best solution for your use case.

```
yarn strapi deploy
```

## 📚 Learn more

- [Resource center](https://strapi.io/resource-center) - Strapi resource center.
- [Strapi documentation](https://docs.strapi.io) - Official Strapi documentation.
- [Strapi tutorials](https://strapi.io/tutorials) - List of tutorials made by the core team and the community.
- [Strapi blog](https://strapi.io/blog) - Official Strapi blog containing articles made by the Strapi team and the community.
- [Changelog](https://strapi.io/changelog) - Find out about the Strapi product updates, new features and general improvements.

Feel free to check out the [Strapi GitHub repository](https://github.com/strapi/strapi). Your feedback and contributions are welcome!

## ✨ Community

- [Discord](https://discord.strapi.io) - Come chat with the Strapi community including the core team.
- [Forum](https://forum.strapi.io/) - Place to discuss, ask questions and find answers, show your Strapi project and get feedback or just talk with other Community members.
- [Awesome Strapi](https://github.com/strapi/awesome-strapi) - A curated list of awesome things related to Strapi.

---

<sub>🤫 Psst! [Strapi is hiring](https://strapi.io/careers).</sub>
