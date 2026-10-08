import { describe, expect, it } from "vitest";
import { extractLinks, htmlToText, pickSubpages, robotsAllows, siteSignals } from "@/lib/web/html";

describe("HTML-Auswertung", () => {
  const html = `<html><head><title>Muster &amp; Co</title><meta name="viewport" content="width=device-width"></head>
    <body><script>var x=1</script><h1>Elektro&shy;installationen</h1><p>Region Bern</p>
    <a href="/kontakt">Kontakt</a><a href="https://www.muster.ch/ueber-uns">Über uns</a><a href="https://andere.ch/kontakt">x</a>
    <a href="tel:+41311234567">Anrufen</a><footer>© 2017 Muster</footer></body></html>`;

  it("entfernt Skripte und Tags", () => {
    const t = htmlToText(html);
    expect(t).toContain("Region Bern");
    expect(t).not.toContain("var x");
  });

  it("wählt nur interne, aufschlussreiche Unterseiten", () => {
    const links = extractLinks(html, "https://muster.ch/");
    expect(pickSubpages(links, "https://muster.ch/")).toEqual(["https://muster.ch/kontakt", "https://www.muster.ch/ueber-uns"]);
  });

  it("liefert belegbare Signale", () => {
    const s = siteSignals("https://muster.ch/", [{ html }]);
    expect(s).toMatchObject({ https: true, kontaktformular: false, telefonLink: true, mobilViewport: true, copyrightJahre: [2017] });
  });

  it("respektiert robots.txt", () => {
    const robots = "User-agent: *\nDisallow: /intern\nAllow: /intern/oeffentlich\n\nUser-agent: Googlebot\nDisallow: /";
    expect(robotsAllows(robots, "/")).toBe(true);
    expect(robotsAllows(robots, "/intern/x")).toBe(false);
    expect(robotsAllows(robots, "/intern/oeffentlich/a")).toBe(true);
    expect(robotsAllows("User-agent: *\nDisallow: /", "/kontakt")).toBe(false);
  });
});
