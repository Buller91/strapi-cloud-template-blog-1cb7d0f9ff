'use strict';

/**
 * Assembles a standalone, single-file version of the venue app: the markup,
 * styles and script of public/app plus the seed venues inlined as
 * window.VENUE_DATA. The page runs without Strapi, which makes it handy for
 * sharing a preview.
 *
 *   node scripts/build-demo.js ./venue-app.html
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = process.argv[2];

if (!out) {
  console.error('Usage: node scripts/build-demo.js <output.html>');
  process.exit(1);
}

const html = fs.readFileSync(path.join(root, 'public/app/index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/app/app.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public/app/app.js'), 'utf8');
const { venues } = JSON.parse(fs.readFileSync(path.join(root, 'data/venues.json'), 'utf8'));

// Everything between <body> and </body>, without the external script tag.
const body = html
  .slice(html.indexOf('<body>') + '<body>'.length, html.indexOf('</body>'))
  .replace(/\s*<script src="\/app\/app\.js"><\/script>/, '')
  .trim();

const banner = `
      <p class="demo-note">
        Live-Demo mit Beispieldaten &ndash; die Locations sind frei erfunden.
        Der Code l&auml;uft im Repository gegen die Strapi-API unter
        <code>/api/venues/nearby</code>.
      </p>`;

const page = `<title>In der Umgebung – Bars, Restaurants &amp; Clubs</title>
<style>
${css}
.demo-note {
  margin: 0 0 18px;
  padding: 12px 16px;
  border: 1px dashed var(--line);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: 13px;
  background: var(--bg-elevated);
}

.demo-note code {
  color: var(--text);
}
</style>
${body.replace('<p id="status"', `${banner}\n      <p id="status"`)}
<script>
window.VENUE_DATA = ${JSON.stringify(venues)};
</script>
<script>
${js}
</script>
`;

fs.writeFileSync(out, page);
console.log('written', out, (page.length / 1024).toFixed(0) + ' kB');
