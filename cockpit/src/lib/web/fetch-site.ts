import "server-only";
import { lookup } from "node:dns/promises";
import net from "node:net";
import { extractLinks, extractTitle, htmlToText, pickSubpages, robotsAllows, siteSignals, type SiteSignals } from "./html";

const USER_AGENT = "CybersharkCockpit/0.1 (+https://cybershark.ch; einzelne Abrufe zur Recherche)";
const MAX_BYTES = 1_500_000;
const MAX_TEXT = 20_000;

export class FetchError extends Error {}

function isPrivate(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number) as [number, number];
    return (
      a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
    );
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivate(v.slice(7));
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
}

async function assertPublicHost(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new FetchError("Nur http(s) erlaubt.");
  if (url.port && !["80", "443"].includes(url.port)) throw new FetchError("Nur Standard-Ports erlaubt.");
  const addrs = await lookup(url.hostname, { all: true }).catch(() => {
    throw new FetchError(`Domain ${url.hostname} nicht auflösbar.`);
  });
  if (addrs.some((a) => isPrivate(a.address))) throw new FetchError("Interne Adressen werden nicht abgerufen.");
}

async function get(urlStr: string): Promise<{ url: string; status: number; body: string; type: string }> {
  let url = new URL(urlStr);
  for (let hop = 0; hop < 4; hop++) {
    await assertPublicHost(url);
    const res = await fetch(url, {
      redirect: "manual",
      headers: { "user-agent": USER_AGENT, accept: "text/html,text/plain;q=0.9" },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url);
      continue;
    }
    const reader = res.body?.getReader();
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    const body = new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks));
    return { url: url.toString(), status: res.status, body, type: res.headers.get("content-type") ?? "" };
  }
  throw new FetchError("Zu viele Weiterleitungen.");
}

export interface FetchedPage {
  url: string;
  title: string | null;
  text: string;
  gekuerzt: boolean;
  html: string;
}

export interface SiteSnapshot {
  pages: FetchedPage[];
  signals: SiteSignals;
  hinweise: string[];
}

/** Liest die öffentliche Startseite und bis zu vier aufschlussreiche Unterseiten. */
export async function fetchPublicSite(website: string): Promise<SiteSnapshot> {
  const start = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`);
  const hinweise: string[] = [];

  let robots = "";
  try {
    const r = await get(new URL("/robots.txt", start).toString());
    if (r.status === 200) robots = r.body;
  } catch {
    /* keine robots.txt */
  }
  const allowed = (u: string) => robotsAllows(robots, new URL(u).pathname);
  if (!allowed(start.toString())) throw new FetchError("Die Website untersagt das Abrufen per robots.txt.");

  const home = await get(start.toString());
  if (home.status >= 400) throw new FetchError(`Website antwortet mit Status ${home.status}.`);
  const toPage = (r: { url: string; body: string }): FetchedPage => {
    const text = htmlToText(r.body);
    return { url: r.url, title: extractTitle(r.body), text: text.slice(0, MAX_TEXT), gekuerzt: text.length > MAX_TEXT, html: r.body };
  };
  const pages = [toPage(home)];

  for (const sub of pickSubpages(extractLinks(home.body, home.url), home.url)) {
    if (!allowed(sub)) {
      hinweise.push(`${sub} per robots.txt ausgeschlossen`);
      continue;
    }
    try {
      const r = await get(sub);
      if (r.status < 400 && r.type.includes("html")) pages.push(toPage(r));
    } catch (e) {
      hinweise.push(`${sub} nicht abrufbar: ${(e as Error).message}`);
    }
  }

  return { pages, signals: siteSignals(home.url, pages), hinweise };
}
