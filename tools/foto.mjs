// Screenshot einer Seite (lokaler statischer Server über public/ oder eine URL). Aufruf: node tools/foto.mjs <pfad?query> <aus.png> [breite] [hoehe] [wartenMs] [js-vor-foto]
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const [ziel = '/?demo=1', aus = 'foto.png', b = '1600', h = '900', warte = '4000', js = ''] = process.argv.slice(2);
const wurzel = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const typen = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp', '.woff2': 'font/woff2' };
let basis = ziel.startsWith('http') ? '' : null, server = null;
if (basis === null) {
  server = http.createServer((q, a) => {
    let p = decodeURIComponent(new URL(q.url, 'http://x').pathname);
    if (p === '/') p = '/index.html';
    const datei = p.startsWith('/tools/') || p.startsWith('/hub-eintrag/') ? path.join(wurzel, p) : path.join(wurzel, 'public', p);
    if (!fs.existsSync(datei) || fs.statSync(datei).isDirectory()) { a.writeHead(404); a.end(); return; }
    a.writeHead(200, { 'content-type': typen[path.extname(datei)] || 'application/octet-stream' }); fs.createReadStream(datei).pipe(a);
  }).listen(0);
  basis = 'http://localhost:' + server.address().port;
}
const br = await chromium.launch();
const s = await br.newPage({ viewport: { width: +b, height: +h } });
const fehler = [];
s.on('pageerror', (e) => fehler.push('pageerror: ' + e.stack));
s.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') fehler.push(m.type() + ': ' + m.text()); });
await s.goto(basis + ziel);
await s.waitForTimeout(+warte);
if (js) { await s.evaluate(js); await s.waitForTimeout(1500); }
await s.screenshot({ path: aus });
console.log(fehler.length ? fehler.join('\n') : 'keine Fehler');
await br.close(); server?.close();
