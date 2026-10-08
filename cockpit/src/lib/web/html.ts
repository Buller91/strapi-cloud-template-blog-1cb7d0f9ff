// Reine Funktionen zum Auswerten von HTML (ohne Netzwerk, testbar).

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1]?.toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<\/(p|div|h[1-6]|li|tr|section|article|header|footer|br)\s*>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

export function extractTitle(html: string): string | null {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? decodeEntities(m[1]!.trim()) : null;
}

export function extractLinks(html: string, base: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/<a\s[^>]*href\s*=\s*["']([^"'#]+)["']/gi)) {
    try {
      const u = new URL(decodeEntities(m[1]!), base);
      if (u.protocol === "http:" || u.protocol === "https:") {
        u.hash = "";
        out.add(u.toString());
      }
    } catch {
      /* ungültige URL */
    }
  }
  return [...out];
}

const INTERESTING = /(kontakt|contact|ueber|uber|about|team|leistung|angebot|dienst|service|firma|unternehmen|portrait|referenz)/i;

/** Wählt bis zu n interne Unterseiten, die für die Recherche aufschlussreich sind. */
export function pickSubpages(links: string[], base: string, n = 4): string[] {
  const host = new URL(base).hostname.replace(/^www\./, "");
  return links
    .filter((l) => {
      const u = new URL(l);
      return u.hostname.replace(/^www\./, "") === host && INTERESTING.test(u.pathname) && !/\.(pdf|jpe?g|png|zip)$/i.test(u.pathname);
    })
    .slice(0, n);
}

export interface SiteSignals {
  https: boolean;
  kontaktformular: boolean;
  telefonLink: boolean;
  mailtoLink: boolean;
  mobilViewport: boolean;
  copyrightJahre: number[];
}

/** Technische Beobachtungen, die belegbar sind (keine Bewertung). */
export function siteSignals(url: string, pages: { html: string }[]): SiteSignals {
  const all = pages.map((p) => p.html).join("\n");
  const years = [...all.matchAll(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/gi)].map((m) => Number(m[1]));
  return {
    https: url.startsWith("https://"),
    kontaktformular: /<form[\s>]/i.test(all) && /(<textarea|type=["']?email)/i.test(all),
    telefonLink: /href=["']tel:/i.test(all),
    mailtoLink: /href=["']mailto:/i.test(all),
    mobilViewport: /<meta[^>]+name=["']viewport["']/i.test(all),
    copyrightJahre: [...new Set(years)].sort(),
  };
}

/** Sehr einfache robots.txt-Auswertung für «User-agent: *». */
export function robotsAllows(robotsTxt: string, path: string): boolean {
  let applies = false;
  const disallow: string[] = [];
  const allow: string[] = [];
  for (const raw of robotsTxt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!m) continue;
    const key = m[1]!.toLowerCase();
    const val = m[2]!.trim();
    if (key === "user-agent") applies = val === "*";
    else if (applies && key === "disallow" && val) disallow.push(val);
    else if (applies && key === "allow" && val) allow.push(val);
  }
  const longest = (rules: string[]) => Math.max(-1, ...rules.filter((r) => path.startsWith(r)).map((r) => r.length));
  return longest(allow) >= longest(disallow);
}
