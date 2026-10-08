import Papa from "papaparse";
import { dedupeKey, isFreemail, isValidEmail, normalizeDomain, normalizeLinkedin, normalizeWebsite } from "./normalize";
import { CHANNELS, KANTONE, type Channel } from "./types";

export interface ImportDefaults {
  quelle: string;
  quelle_datum: string; // YYYY-MM-DD
  herkunftskanal: Channel;
}

export interface ImportContact {
  name: string;
  funktion: string | null;
  email_geschaeftlich: string | null;
  linkedin_url: string | null;
}

export interface ImportRow {
  zeile: number;
  name: string;
  ort: string | null;
  kanton: string | null;
  branche: string | null;
  groesse_ca: string | null;
  website: string | null;
  domain: string | null;
  dedupe_key: string;
  quelle: string;
  quelle_datum: string;
  herkunftskanal: Channel;
  kontakt: ImportContact | null;
}

export interface ImportPlan {
  neu: ImportRow[];
  duplikate: { zeile: number; name: string; schluessel: string; grund: "datenbank" | "datei" }[];
  fehler: { zeile: number; meldung: string }[];
  warnungen: { zeile: number; meldung: string }[];
}

const ALIASES: Record<string, string> = {
  firma: "name", firmenname: "name", name: "name",
  ort: "ort", stadt: "ort", gemeinde: "ort",
  kanton: "kanton",
  branche: "branche",
  groesse: "groesse_ca", groesse_ca: "groesse_ca", mitarbeitende: "groesse_ca",
  website: "website", webseite: "website", url: "website", homepage: "website",
  quelle: "quelle",
  quelle_datum: "quelle_datum", erhebungsdatum: "quelle_datum", datum: "quelle_datum",
  herkunftskanal: "herkunftskanal", kanal: "herkunftskanal",
  kontakt_name: "kontakt_name", kontakt: "kontakt_name", ansprechperson: "kontakt_name",
  kontakt_funktion: "kontakt_funktion", funktion: "kontakt_funktion",
  kontakt_email: "kontakt_email", email: "kontakt_email", e_mail: "kontakt_email",
  kontakt_linkedin: "kontakt_linkedin", linkedin: "kontakt_linkedin",
};

function headerKey(h: string): string {
  const k = h
    .trim()
    .toLowerCase()
    .replace(/ö/g, "oe").replace(/ä/g, "ae").replace(/ü/g, "ue")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return ALIASES[k] ?? k;
}

export function parseCsv(text: string): Record<string, string>[] {
  const res = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    delimitersToGuess: [";", ",", "\t"],
    transformHeader: headerKey,
  });
  return res.data;
}

/** Akzeptiert YYYY-MM-DD und DD.MM.YYYY. */
export function parseDate(v: string | undefined): string | null {
  const s = (v ?? "").trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) {
    const ch = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s);
    if (ch) m = [s, ch[3]!, ch[2]!.padStart(2, "0"), ch[1]!.padStart(2, "0")] as unknown as RegExpExecArray;
  }
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso ? iso : null;
}

const clean = (v: string | undefined) => {
  const s = (v ?? "").trim();
  return s ? s : null;
};

export function planImport(
  rows: Record<string, string>[],
  existingKeys: ReadonlySet<string>,
  defaults: ImportDefaults,
): ImportPlan {
  const plan: ImportPlan = { neu: [], duplikate: [], fehler: [], warnungen: [] };
  const seen = new Map<string, number>();

  rows.forEach((r, i) => {
    const zeile = i + 2; // Kopfzeile = 1
    const name = clean(r.name);
    if (!name) {
      plan.fehler.push({ zeile, meldung: "Firmenname fehlt." });
      return;
    }

    const quelle = clean(r.quelle) ?? defaults.quelle.trim();
    if (!quelle) {
      plan.fehler.push({ zeile, meldung: "Quelle fehlt (weder in der Zeile noch als Vorgabe)." });
      return;
    }
    const rowDate = clean(r.quelle_datum);
    const quelle_datum = rowDate ? parseDate(rowDate) : parseDate(defaults.quelle_datum);
    if (!quelle_datum) {
      plan.fehler.push({ zeile, meldung: `Erhebungsdatum ungültig: «${rowDate ?? defaults.quelle_datum}».` });
      return;
    }

    let kanal: Channel = defaults.herkunftskanal;
    const k = clean(r.herkunftskanal)?.toLowerCase();
    if (k) {
      if ((CHANNELS as readonly string[]).includes(k)) kanal = k as Channel;
      else plan.warnungen.push({ zeile, meldung: `Unbekannter Kanal «${k}», verwende «${kanal}».` });
    }

    let kanton = clean(r.kanton)?.toUpperCase() ?? null;
    if (kanton && !(KANTONE as readonly string[]).includes(kanton)) {
      plan.warnungen.push({ zeile, meldung: `Unbekannter Kanton «${kanton}» wurde weggelassen.` });
      kanton = null;
    }

    const rawWebsite = clean(r.website);
    const website = normalizeWebsite(rawWebsite);
    if (rawWebsite && !website) plan.warnungen.push({ zeile, meldung: `Website «${rawWebsite}» nicht erkannt.` });
    const ort = clean(r.ort);
    const key = dedupeKey({ website, name, ort });
    if (!website) plan.warnungen.push({ zeile, meldung: "Keine Website: Duplikatprüfung nur über Name und Ort." });

    if (existingKeys.has(key)) {
      plan.duplikate.push({ zeile, name, schluessel: key, grund: "datenbank" });
      return;
    }
    if (seen.has(key)) {
      plan.duplikate.push({ zeile, name, schluessel: key, grund: "datei" });
      return;
    }
    seen.set(key, zeile);

    let kontakt: ImportContact | null = null;
    const kName = clean(r.kontakt_name);
    if (kName) {
      let email = clean(r.kontakt_email);
      if (email && !isValidEmail(email)) {
        plan.warnungen.push({ zeile, meldung: `E-Mail «${email}» ungültig, nicht übernommen.` });
        email = null;
      } else if (email && isFreemail(email)) {
        plan.warnungen.push({
          zeile,
          meldung: `E-Mail «${email}» ist eine Freemail-Adresse (möglicherweise privat), nicht übernommen.`,
        });
        email = null;
      }
      const rawLi = clean(r.kontakt_linkedin);
      const linkedin = normalizeLinkedin(rawLi);
      if (rawLi && !linkedin) plan.warnungen.push({ zeile, meldung: `LinkedIn-URL «${rawLi}» nicht erkannt.` });
      kontakt = {
        name: kName,
        funktion: clean(r.kontakt_funktion),
        email_geschaeftlich: email?.toLowerCase() ?? null,
        linkedin_url: linkedin,
      };
    } else if (clean(r.kontakt_email) || clean(r.kontakt_linkedin)) {
      plan.warnungen.push({ zeile, meldung: "Kontaktangaben ohne Namen werden nicht übernommen." });
    }

    plan.neu.push({
      zeile,
      name,
      ort,
      kanton,
      branche: clean(r.branche),
      groesse_ca: clean(r.groesse_ca),
      website,
      domain: normalizeDomain(website),
      dedupe_key: key,
      quelle,
      quelle_datum,
      herkunftskanal: kanal,
      kontakt,
    });
  });

  return plan;
}
