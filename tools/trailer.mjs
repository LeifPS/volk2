// Trailer (ca. 38 s, 1280x720, H.264, mit selbst erzeugter Chiptune-Musik) aus dem Demo-Modus.
// Aufruf: FFMPEG=/pfad/zu/ffmpeg node tools/trailer.mjs     (ffmpeg z. B. aus "npm i ffmpeg-static" in einem Nebenordner)
// Ergebnis: hub-eintrag/trailer.mp4
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const wurzel = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'volk-trailer-'));
const FPS = 24, B = 1280, H = 720;
const typen = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((q, a) => {
  let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p === '/') p = '/index.html'; if (p.startsWith('/public/')) p = p.slice(7);
  const d = p.startsWith('/tools/') || p.startsWith('/hub-eintrag/') ? path.join(wurzel, p) : path.join(wurzel, 'public', p);
  if (!fs.existsSync(d) || fs.statSync(d).isDirectory()) { a.writeHead(404); a.end(); return; }
  a.writeHead(200, { 'content-type': typen[path.extname(d)] || 'application/octet-stream' }); fs.createReadStream(d).pipe(a);
}).listen(0);
const URL0 = 'http://localhost:' + server.address().port;
const browser = await chromium.launch();
let bildNr = 0;
const bild = async (seite) => { await seite.screenshot({ path: path.join(tmp, `b${String(bildNr++).padStart(5, '0')}.png`) }); };

// Texteinblendung im Pixelstil
const TEXT_CSS = `#trailertext{position:fixed;left:0;right:0;bottom:70px;text-align:center;z-index:999;pointer-events:none;font-family:Silkscreen,monospace;font-weight:700;font-size:40px;color:#fff;text-shadow:4px 4px 0 #000,-2px -2px 0 #000,2px -2px 0 #000,-2px 2px 0 #000;letter-spacing:1px;transition:opacity .4s}
#trailertext small{display:block;font-family:Pixelify,monospace;font-size:24px;font-weight:400;margin-top:6px;color:#f1d9a0}
#leiste,#forschungsanzeige,#auswahl,#aktionen,#minikarte,#naechste,#meldungsleiste,#tut-blase,#tut-rahmen{display:none!important}`;
async function demoSeite(zeitalter, ohneUi = true) {
  const s = await browser.newPage({ viewport: { width: B, height: H } });
  await s.goto(`${URL0}/?demo=1&zeitalter=${zeitalter}`);
  await s.waitForSelector('#leiste', { timeout: 60000 });
  await s.waitForTimeout(1500);
  await s.addStyleTag({ content: TEXT_CSS + (ohneUi ? '' : '') });
  await s.evaluate(async () => { const r = await import('/js/karte/render.js'); r.optionen.wetter = false; r.optionen.tagnacht = false; const d = document.createElement('div'); d.id = 'trailertext'; document.body.append(d); });
  return s;
}
const text = (s, haupt, klein = '') => s.evaluate(([h, k]) => { document.getElementById('trailertext').innerHTML = h + (k ? '<small>' + k + '</small>' : ''); }, [haupt, klein]);
const kameraFahrt = async (s, sek, f) => { const n = Math.round(sek * FPS); for (let i = 0; i < n; i++) { await s.evaluate(f, i / n); await s.waitForTimeout(16); await bild(s); } };

// 1) Titel
{
  const s = await browser.newPage({ viewport: { width: B, height: H } });
  await s.goto(`${URL0}/tools/icon.html`);
  await s.waitForSelector('body[data-fertig="1"]');
  await s.addStyleTag({ content: `body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#12151f!important}canvas{width:360px!important;height:360px!important}h1{font-family:Silkscreen,monospace;color:#f1c40f;font-size:96px;margin:10px 0 0;text-shadow:6px 6px 0 #000}p{font-family:Pixelify,monospace;color:#f0ead6;font-size:28px;margin:4px}@font-face{font-family:Silkscreen;src:url(/fonts/silkscreen-700.woff2)}@font-face{font-family:Pixelify;src:url(/fonts/pixelify.woff2)}` });
  await s.evaluate(() => { const h = document.createElement('h1'); h.textContent = 'VOLK'; const p = document.createElement('p'); p.textContent = 'Baue dein Volk. In Echtzeit.'; document.body.append(h, p); });
  await s.waitForTimeout(400);
  for (let i = 0; i < FPS * 3.5; i++) await bild(s);
  await s.close();
}
// 2) Weite Welt, Antike
{
  const s = await demoSeite(1);
  await text(s, 'Eine riesige Welt', 'Erkunde, gründe Städte, wachse');
  await kameraFahrt(s, 5, async (p) => { const r = await import('/js/karte/render.js'); if (p === 0) { r.kamera.zoom = 1; r.kamera._x = r.kamera.x - 300; } r.kamera.x = r.kamera._x + p * 600; r.neuZeichnen(); });
  await s.close();
}
// 3) Zeitalter-Morph: dieselbe Gegend in sieben Zeitaltern
for (const za of [0, 1, 2, 3, 4, 5, 6]) {
  const s = await demoSeite(za);
  const namen = ['Antike', 'Klassik', 'Mittelalter', 'Renaissance', 'Industrie', 'Moderne', 'Atomzeit'];
  await text(s, 'Von Lehmhütten bis zu Hochhäusern', namen[za]);
  await s.evaluate(async () => { const r = await import('/js/karte/render.js'); const z = await import('/js/kern/zustand.js'); const st = z.eigeneStaedte().find((x) => x.hauptstadt) || z.eigeneStaedte()[0]; r.zentriereAuf(st.feld); r.kamera.zoom = 3; r.neuZeichnen(); });
  await s.waitForTimeout(400);
  for (let i = 0; i < FPS * 1.15; i++) { await s.waitForTimeout(20); await bild(s); }
  await s.close();
}
// 4) Forschungsbaum
{
  const s = await demoSeite(3);
  await s.evaluate(async () => { const m = await import('/js/ui/fenster.js'); await m.forschung(); });
  await s.waitForTimeout(1200);
  await text(s, 'Über 240 Erfindungen', 'Ein riesiger Forschungsbaum – von der Antike bis zur Atomzeit');
  const cv = await s.$('.fenster canvas');
  const box = cv ? await cv.boundingBox() : { x: 200, y: 200, width: 800, height: 400 };
  await s.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2);
  await s.mouse.down();
  for (let i = 0; i < FPS * 4.5; i++) { await s.mouse.move(box.x + box.width * 0.7 - i * 4, box.y + box.height / 2); await bild(s); }
  await s.mouse.up();
  await s.close();
}
// 5) Kampf
{
  const s = await demoSeite(2);
  await s.evaluate(async () => {
    const sp = window.__demo.spiel, v = window.__demo.volk;
    const hex = await import('/shared/hex.js'); const st = sp.staedteVon(v.id)[0];
    const frei = (i) => !sp.einheitenAuf(i).length && sp.betretbar(v.id, { klasse: 'nahkampf', tempo: 2 }, i) && !sp.stadtAuf(i);
    const a = hex.umkreis(st.feld, 3).find((i) => hex.abstand(i, st.feld) === 3 && frei(i) && hex.nachbarn(i).filter(frei).length >= 3);
    const ziele = hex.nachbarn(a).filter(frei);
    const bar = sp.barbarenVolk();
    window.__k = { a, b: ziele[0], e: sp.einheitErzeugen(v.id, 'ritter', a).id, f: sp.einheitErzeugen(v.id, 'trebuchet', ziele[1]).id };
    sp.einheitErzeugen(bar.id, 'langschwertkaempfer', ziele[0]);
    const r = await import('/js/karte/render.js'); r.zentriereAuf(a); r.kamera.zoom = 3;
    (await import('/js/kern/netz.js')).vollAnfordern();
  });
  await s.waitForTimeout(800);
  await text(s, 'Kämpfe nur auf deinen Befehl', 'Mit Vorschau – und nie gegen Spieler, die offline sind');
  for (let i = 0; i < FPS * 1; i++) await bild(s);
  await s.evaluate(async () => { const n = await import('/js/kern/netz.js'); await n.befehl({ art: 'angreifen', einheit: window.__k.f, ziel: window.__k.b }); });
  for (let i = 0; i < FPS * 1.6; i++) { await s.waitForTimeout(20); await bild(s); }
  await s.evaluate(async () => { const n = await import('/js/kern/netz.js'); await n.befehl({ art: 'angreifen', einheit: window.__k.e, ziel: window.__k.b }); });
  for (let i = 0; i < FPS * 2; i++) { await s.waitForTimeout(20); await bild(s); }
  await s.close();
}
// 6) Diplomatie und Handel
{
  const s = await demoSeite(4);
  await s.evaluate(async () => { const m = await import('/js/ui/fenster.js'); await m.diplomatie(); });
  await s.waitForTimeout(1000);
  await text(s, 'Handel, Bündnisse, Diplomatie', 'Mit Freunden, Familie, KI-Völkern und Stadtstaaten');
  for (let i = 0; i < FPS * 3.5; i++) await bild(s);
  await s.close();
}
// 7) Moderne Großstadt, langsamer Zoom
{
  const s = await demoSeite(5);
  await text(s, 'Deine Welt läuft weiter', 'auch wenn du offline bist');
  await kameraFahrt(s, 4, async (p) => { const r = await import('/js/karte/render.js'); const z = await import('/js/kern/zustand.js'); const st = z.eigeneStaedte().sort((a, b) => b.bev - a.bev)[0]; if (p === 0) r.zentriereAuf(st.feld); r.kamera.zoom = 1.5 + p * 1.5; r.neuZeichnen(); });
  await s.close();
}
// 8) Schluss
{
  const s = await browser.newPage({ viewport: { width: B, height: H } });
  await s.goto(`${URL0}/tools/icon.html`);
  await s.waitForSelector('body[data-fertig="1"]');
  await s.addStyleTag({ content: `body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#12151f!important}canvas{width:300px!important;height:300px!important}h1{font-family:Silkscreen,monospace;color:#f1c40f;font-size:88px;margin:8px 0 0;text-shadow:6px 6px 0 #000}p{font-family:Pixelify,monospace;color:#f0ead6;font-size:28px;margin:4px}@font-face{font-family:Silkscreen;src:url(/fonts/silkscreen-700.woff2)}@font-face{font-family:Pixelify;src:url(/fonts/pixelify.woff2)}` });
  await s.evaluate(() => { const h = document.createElement('h1'); h.textContent = 'VOLK'; const p = document.createElement('p'); p.textContent = 'Jetzt im Leif Game Hub (Alpha)'; const q = document.createElement('p'); q.textContent = 'Am PC und auf dem Tablet'; q.style.fontSize = '22px'; q.style.color = '#b8b2a0'; document.body.append(h, p, q); });
  await s.waitForTimeout(400);
  for (let i = 0; i < FPS * 4; i++) await bild(s);
  await s.close();
}

// Musik: Mittelalter-Thema offline rendern
const sek = Math.ceil(bildNr / FPS) + 1;
{
  const s = await browser.newPage();
  await s.goto(`${URL0}/index.html?nichts`);
  const wav = await s.evaluate(async (sek) => { const a = await import('/js/audio.js'); const buf = await a.musikRendern(3, sek); return Array.from(new Uint8Array(a.wavAusBuffer(buf))); }, sek);
  fs.writeFileSync(path.join(tmp, 'musik.wav'), Buffer.from(wav));
  await s.close();
}
await browser.close(); server.close();
const ziel = path.join(wurzel, 'hub-eintrag', 'trailer.mp4');
const dauer = bildNr / FPS;
execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, 'b%05d.png'), '-i', path.join(tmp, 'musik.wav'),
  '-vf', `fade=t=in:st=0:d=0.6,fade=t=out:st=${(dauer - 0.8).toFixed(2)}:d=0.8,format=yuv420p`,
  '-af', `afade=t=in:st=0:d=0.8,afade=t=out:st=${(dauer - 1.5).toFixed(2)}:d=1.5`,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', ziel]);
console.log(`Trailer: ${ziel} (${dauer.toFixed(1)} s, ${bildNr} Bilder)`);
fs.rmSync(tmp, { recursive: true, force: true });
