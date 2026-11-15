// Macht einen Screenshot der Sprite-Galerie (für die Sichtprüfung).
// Aufruf: node tools/galerie-foto.mjs <kategorie|alle> <ausgabe.png> [skalierung] [zeitalter] [hell]
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const [kat = 'alle', aus = 'galerie.png', sk = '3', za = '-1', hell = ''] = process.argv.slice(2);
const wurzel = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const typen = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp' };
const server = http.createServer((q, a) => {
  const p = path.join(wurzel, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!p.startsWith(wurzel) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { a.writeHead(404); a.end(); return; }
  a.writeHead(200, { 'content-type': typen[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(a);
}).listen(0);
const port = server.address().port;
const b = await chromium.launch();
const s = await b.newPage({ viewport: { width: 1400, height: 900 } });
const fehler = [];
s.on('pageerror', (e) => fehler.push(String(e))); s.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()); });
await s.goto(`http://localhost:${port}/tools/sprite-galerie.html?kat=${kat === 'alle' ? '' : kat}&sk=${sk}&za=${za}${hell ? '&hell=1' : ''}`);
await s.waitForSelector('body[data-fertig="1"]', { timeout: 20000 }).catch(() => fehler.push('Galerie nicht fertig geladen'));
await s.screenshot({ path: aus, fullPage: true });
if (fehler.length) console.log('FEHLER:\n' + fehler.join('\n')); else console.log('ok', aus);
await b.close(); server.close();
