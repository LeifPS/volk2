// Screenshots für den Hub aus dem Demo-Modus (ohne Server): 1600 px breit, WebP, nach hub-eintrag/shots/.
// Aufruf: node tools/screenshots.mjs        (braucht Playwright-Chromium und Pillow)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const wurzel = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const aus = path.join(wurzel, 'hub-eintrag', 'shots');
fs.mkdirSync(aus, { recursive: true });
const typen = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = http.createServer((q, a) => {
  let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p === '/') p = '/index.html';
  const d = path.join(wurzel, 'public', p);
  if (!fs.existsSync(d) || fs.statSync(d).isDirectory()) { a.writeHead(404); a.end(); return; }
  a.writeHead(200, { 'content-type': typen[path.extname(d)] || 'application/octet-stream' }); fs.createReadStream(d).pipe(a);
}).listen(0);
const B = 'http://localhost:' + server.address().port;
const browser = await chromium.launch();
const SZENEN = [
  { n: 1, za: 3, js: `const r=await import('/js/karte/render.js'); r.kamera.zoom=1.5; r.optionen.wetter=false; r.optionen.tagnacht=false;` },
  { n: 2, za: 3, js: `const m=await import('/js/ui/fenster.js'); const z=await import('/js/kern/zustand.js'); await m.stadt(z.eigeneStaedte().sort((a,b)=>b.bev-a.bev)[0].id,'bauen');` },
  { n: 3, za: 3, js: `const m=await import('/js/ui/fenster.js'); await m.forschung();` },
  { n: 4, za: 3, js: `await window.__szeneKampf();` },
  { n: 5, za: 4, js: `const m=await import('/js/ui/fenster.js'); await m.diplomatie();` },
  { n: 6, za: 5, js: `const r=await import('/js/karte/render.js'); r.kamera.zoom=2; r.optionen.wetter=false; r.optionen.tagnacht=false;` },
  { n: 7, za: 0, js: `const r=await import('/js/karte/render.js'); r.kamera.zoom=2; r.optionen.wetter=false; r.optionen.tagnacht=false;` },
  { n: 8, za: 3, js: `const m=await import('/js/ui/fenster.js'); await m.rangliste();` },
  { n: 9, za: 6, js: `const r=await import('/js/karte/render.js'); r.kamera.zoom=1.5; r.optionen.wetter=false; r.optionen.tagnacht=false;` },
  { n: 10, za: 2, js: `const m=await import('/js/ui/fenster.js'); await m.lexikon('einheit','ritter');` },
];
for (const sz of SZENEN) {
  const s = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const fehler = [];
  s.on('pageerror', (e) => fehler.push(String(e)));
  await s.goto(`${B}/?demo=1&zeitalter=${sz.za}`);
  await s.waitForSelector('#leiste', { timeout: 60000 });
  await s.waitForTimeout(2500);
  await s.evaluate(async () => {
    // Szene "Kampf": eigene Einheit neben einen Barbaren stellen und die Kampfvorschau öffnen
    window.__szeneKampf = async () => {
      const sp = window.__demo.spiel, v = window.__demo.volk;
      const hex = await import('/shared/hex.js'); const st = sp.staedteVon(v.id)[0];
      const frei = (i) => !sp.einheitenAuf(i).length && sp.betretbar(v.id, { klasse: 'nahkampf', tempo: 2 }, i) && !sp.stadtAuf(i);
      const a = hex.umkreis(st.feld, 3).find((i) => hex.abstand(i, st.feld) === 3 && frei(i) && hex.nachbarn(i).some(frei));
      const b = hex.nachbarn(a).find(frei);
      const bar = sp.barbarenVolk();
      const best = (await import('/shared/daten/index.js')).EINHEITEN.filter((d) => d.klasse === 'nahkampf' && d.zeitalter <= v.zeitalter).sort((x, y) => y.staerke - x.staerke)[0];
      const e = sp.einheitErzeugen(v.id, best.id, a); sp.einheitErzeugen(bar.id, 'langschwertkaempfer', b);
      const hud = await import('/js/ui/hud.js'); const r = await import('/js/karte/render.js');
      (await import('/js/kern/netz.js')).vollAnfordern();
      await new Promise((ok) => setTimeout(ok, 600));
      hud.waehle({ art: 'einheit', id: e.id }); r.zentriereAuf(a); r.kamera.zoom = 2;
      await hud.befehlAufFeld(b);
    };
    const r = await import('/js/karte/render.js'); const z = await import('/js/kern/zustand.js');
    const st = z.eigeneStaedte().sort((a, b) => b.bev - a.bev)[0]; if (st) r.zentriereAuf(st.feld);
  });
  await s.evaluate(`(async()=>{${sz.js}})()`);
  await s.waitForTimeout(2500);
  const png = path.join(aus, sz.n + '.png');
  await s.screenshot({ path: png });
  execFileSync('python3', ['-c', `from PIL import Image; Image.open(${JSON.stringify(png)}).convert('RGB').save(${JSON.stringify(png.replace('.png', '.webp'))}, 'WEBP', quality=88)`]);
  fs.unlinkSync(png);
  console.log(sz.n + '.webp', fehler.length ? 'FEHLER: ' + fehler.join(' | ') : 'ok');
  await s.close();
}
await browser.close(); server.close();
