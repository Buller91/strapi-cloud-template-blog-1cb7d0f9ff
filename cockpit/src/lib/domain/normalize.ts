/** Domain aus einer Website-Angabe: ohne Protokoll, ohne www., ohne Pfad, klein. */
export function normalizeDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  let s = input.trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^[a-z]+:\/\//, "");
  s = s.replace(/^www\d?\./, "");
  s = s.split(/[/?#]/)[0] ?? "";
  s = s.replace(/:\d+$/, "").replace(/\.$/, "");
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s)) return null;
  return s;
}

export function normalizeText(input: string | null | undefined): string {
  return (input ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(ag|gmbh|sa|sarl|kg|klg|einzelfirma)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Schlüssel für die Duplikaterkennung: Domain, sonst Name + Ort. */
export function dedupeKey(a: { website?: string | null; name: string; ort?: string | null }): string {
  const d = normalizeDomain(a.website);
  if (d) return d;
  return `name:${normalizeText(a.name)}|${normalizeText(a.ort)}`;
}

const FREEMAIL = new Set([
  "gmail.com", "googlemail.com", "gmx.ch", "gmx.net", "gmx.de", "gmx.com", "bluewin.ch",
  "hotmail.com", "hotmail.ch", "outlook.com", "live.com", "msn.com", "yahoo.com", "yahoo.de",
  "icloud.com", "me.com", "mac.com", "sunrise.ch", "hispeed.ch", "protonmail.com", "proton.me",
  "web.de", "t-online.de", "swissonline.ch", "green.ch", "quickline.ch",
]);

export function emailDomain(email: string): string | null {
  const m = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/.exec(email.trim().toLowerCase());
  return m ? m[1]! : null;
}

export function isValidEmail(email: string): boolean {
  return emailDomain(email) !== null;
}

/** Freemail-Adressen gelten als möglicherweise privat. */
export function isFreemail(email: string): boolean {
  const d = emailDomain(email);
  return d !== null && FREEMAIL.has(d);
}

export function normalizeLinkedin(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const s = url.trim();
  if (!/^(https?:\/\/)?([a-z]{2,3}\.)?(www\.)?linkedin\.com\/(in|company)\/[^/?#\s]+/i.test(s)) return null;
  return s.startsWith("http") ? s : `https://${s}`;
}

export function normalizeWebsite(url: string | null | undefined): string | null {
  const d = normalizeDomain(url);
  if (!d) return null;
  const s = url!.trim();
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}
