// Browser-Läufe mit Playwright gegen einen lokalen wrangler dev (frischer, temporärer Zustand).
// Prüft: Seite lädt ohne Konsolenfehler, Registrierung bis zur ersten Stadt, Karte pannen/zoomen, Forschungsbaum, Bauauftrag,
// Kampfvorschau, Tutorial, Fenster, Hub-Einbettung im iframe, Touch-Gesten. Aufruf: npm run browsertest
import { chromium, devices } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const wurzel = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const port = 8790 + Math.floor(Math.random() * 100);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'volk-bt-'));
const shots = process.env.SHOTS || tmp;
const dev = spawn('npx', ['wrangler', 'dev', '--port', String(port), '--var', 'ZEITFAKTOR_ERLAUBT:1', '--persist-to', tmp], { cwd: wurzel, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
dev.stdout.on('data', (d) => { log += d; }); dev.stderr.on('data', (d) => { log += d; });
const B = `http://localhost:${port}`;
for (let i = 0; i < 60; i++) { try { const r = await fetch(B + '/api/status'); if (r.ok) break; } catch { /* warten */ } await new Promise((r) => setTimeout(r, 500)); }
const ergebnisse = [];
const pruefe = (name, ok, info = '') => { ergebnisse.push({ name, ok: !!ok, info }); console.log((ok ? '✔ ' : '✖ ') + name + (info ? ' – ' + info : '')); };
const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const s = await ctx.newPage();
  const fehler = [];
  s.on('pageerror', (e) => fehler.push(String(e)));
  s.on('console', (m) => { if (m.type() === 'error' && !/favicon|401/.test(m.text())) fehler.push(m.text()); });
  await s.goto(B + '/');
  await s.waitForSelector('#start form', { timeout: 15000 });
  pruefe('Startseite lädt (Anmeldemaske)', true);
  await s.click('text=Neues Konto');
  await s.fill('#start input[type=text]', 'testerin');
  await s.fill('#start input[type=password]', 'passwort1');
  await s.click('#start button[type=submit]');
  await s.waitForSelector('text=Gründe dein Volk', { timeout: 15000 });
  pruefe('Registrierung führt zur Volksgründung', true);
  await s.fill('#start input[type=text]', 'Die Testerinnen');
  await s.click('#start button[type=submit]');
  await s.waitForSelector('#leiste', { timeout: 20000 });
  await s.waitForTimeout(1500);
  pruefe('Volk gegründet, Spielansicht aufgebaut', await s.isVisible('#ressourcen'));
  await s.screenshot({ path: path.join(shots, 'bt-1-start.png') });
  // Tutorial sichtbar?
  const tutorial = await s.evaluate(() => !!document.querySelector('#tut-blase'));
  pruefe('Tutorial erscheint für neue Spieler', tutorial);
  // Siedler auswählen und Stadt gründen per Knopf
  await s.evaluate(async () => { const z = await import('/js/kern/zustand.js'); const h = await import('/js/ui/hud.js'); const e = z.eigeneEinheiten().find((x) => x.typ === 'siedler'); h.waehle({ art: 'einheit', id: e.id }); });
  await s.waitForTimeout(300);
  await s.click('#aktionen >> text=Stadt gründen');
  await s.waitForTimeout(1500);
  const staedte = await s.evaluate(async () => (await import('/js/kern/zustand.js')).eigeneStaedte().length);
  pruefe('Erste Stadt gegründet', staedte === 1);
  // Pannen und Zoomen
  const vorher = await s.evaluate(async () => { const r = await import('/js/karte/render.js'); return { ...r.kamera }; });
  await s.mouse.move(700, 450); await s.mouse.down(); await s.mouse.move(500, 350, { steps: 8 }); await s.mouse.up();
  await s.mouse.wheel(0, -300); await s.waitForTimeout(300);
  const nachher = await s.evaluate(async () => { const r = await import('/js/karte/render.js'); return { ...r.kamera }; });
  pruefe('Karte pannen und zoomen (Maus)', vorher.x !== nachher.x && vorher.zoom !== nachher.zoom, JSON.stringify(nachher));
  // Bauauftrag
  const bau = await s.evaluate(async () => { const n = await import('/js/kern/netz.js'); const z = await import('/js/kern/zustand.js'); const st = z.eigeneStaedte()[0]; return n.befehl({ art: 'bauen', stadt: st.id, typ: 'einheit', id: 'krieger' }); });
  pruefe('Bauauftrag (Krieger) angenommen', bau.ok, bau.fehler || '');
  // Fenster öffnen
  for (const [name, f] of [['Forschungsbaum', 'forschung'], ['Stadtfenster', 'stadt'], ['Reich', 'reich'], ['Diplomatie', 'diplomatie'], ['Rangliste', 'rangliste'], ['Lexikon', 'lexikon'], ['Hilfe', 'hilfe'], ['Einstellungen', 'einstellungen']]) {
    const n0 = fehler.length;
    await s.evaluate(async (f) => { const m = await import('/js/ui/fenster.js'); const z = await import('/js/kern/zustand.js'); if (f === 'stadt') await m.stadt(z.eigeneStaedte()[0].id); else await m[f](); }, f);
    await s.waitForTimeout(900);
    const offen = await s.evaluate(() => !!document.querySelector('.fenster'));
    if (name === 'Forschungsbaum') await s.screenshot({ path: path.join(shots, 'bt-2-baum.png') });
    pruefe('Fenster: ' + name, offen && fehler.length === n0, fehler.slice(n0).join(' | '));
    await s.keyboard.press('Escape'); await s.waitForTimeout(200);
  }
  // Forschung starten
  const fo = await s.evaluate(async () => (await import('/js/kern/netz.js')).befehl({ art: 'forschen', id: 'toepferei' }));
  pruefe('Forschung gestartet', fo.ok, fo.fehler || '');
  // Zeitregler: 2 Stunden vorspringen, Krieger fertig?
  await fetch(B + '/api/dev/zeit', { method: 'POST', body: JSON.stringify({ sprung_ms: 2 * 3600e3 }) });
  await s.waitForTimeout(2500);
  const krieger = await s.evaluate(async () => (await import('/js/kern/zustand.js')).eigeneEinheiten().filter((e) => e.typ === 'krieger').length);
  pruefe('Zeitregler + Bau fertig nach Zeitsprung (Deltas kommen an)', krieger >= 2, 'Krieger: ' + krieger);
  // Bewegung mit Ankunftszeit (Rechtsklick)
  const bewegt = await s.evaluate(async () => { const z = await import('/js/kern/zustand.js'); const n = await import('/js/kern/netz.js'); const e = z.eigeneEinheiten().find((x) => x.typ === 'spaeher'); const { nachbarn } = await import('/shared/hex.js'); const ziel = nachbarn(nachbarn(e.feld)[0])[0]; return n.befehl({ art: 'bewegen', einheit: e.id, ziel }); });
  pruefe('Einheit bewegen mit Ankunftszeit', bewegt.ok && bewegt.ankunft > Date.now() - 60000, bewegt.fehler || '');
  // Kampfvorschau (Frage) gegen ein Tier/Barbaren, falls sichtbar – sonst nur API-Fehlertext prüfen
  const kv = await s.evaluate(async () => { const n = await import('/js/kern/netz.js'); const z = await import('/js/kern/zustand.js'); const e = z.eigeneEinheiten().find((x) => x.typ === 'krieger'); try { return await n.frage({ art: 'kampfvorschau', einheit: e.id, ziel: e.feld + 1 }); } catch (err) { return { fehler: err.message }; } });
  pruefe('Kampfvorschau antwortet verständlich', kv && (kv.fehler || kv.grund || kv.angreifer), JSON.stringify(kv).slice(0, 80));
  pruefe('Keine Konsolenfehler im Spiel', fehler.length === 0, fehler.slice(0, 3).join(' | '));
  await s.screenshot({ path: path.join(shots, 'bt-3-spiel.png') });

  // Hub-Einbettung im iframe
  const hub = await ctx.newPage();
  const hubFehler = [];
  hub.on('pageerror', (e) => hubFehler.push(String(e)));
  await hub.route('http://hub.test/**', (r) => r.fulfill({ contentType: 'text/html', body: `<html><body style="margin:0"><iframe id="f" src="${B}/" style="width:1200px;height:800px;border:0"></iframe><script>window.nachrichten=[];addEventListener('message',e=>window.nachrichten.push(e.data));</script></body></html>` }));
  await hub.goto('http://hub.test/');
  await hub.waitForTimeout(5000);
  const msgs = await hub.evaluate(() => window.nachrichten);
  pruefe('Hub-iframe: Spiel meldet {lgh:"ton-bereit"}', msgs.some((m) => m && m.lgh === 'ton-bereit'), JSON.stringify(msgs).slice(0, 80));
  const frame = hub.frames().find((f) => f.url().startsWith(B));
  const imFrame = frame ? await frame.evaluate(() => !!document.querySelector('#leiste') || !!document.querySelector('#start')) : false;
  pruefe('Hub-iframe: Spiel lädt im Rahmen (Token aus localStorage)', imFrame);
  pruefe('Hub-iframe: keine Fehler', hubFehler.length === 0, hubFehler.join(' | '));
  // oben links frei?
  const obenLinks = await s.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); const st = getComputedStyle(e); return r.width && r.height && st.visibility !== 'hidden' && st.display !== 'none' && e.id !== 'karte' && r.left < 64 && r.top < 56 && !e.closest('#fenster-ebene'); }).map((e) => e.tagName + '#' + e.id + '.' + e.className));
  pruefe('Oben links (64×56) ist frei für das Hub-Symbol', obenLinks.length === 0, obenLinks.join(','));

  // Touch (Tablet)
  const tablet = await browser.newContext({ ...devices['iPad (gen 7) landscape'], hasTouch: true });
  const t = await tablet.newPage();
  const tFehler = [];
  t.on('pageerror', (e) => tFehler.push(String(e)));
  await t.goto(B + '/?demo=1');
  await t.waitForSelector('#leiste', { timeout: 30000 });
  await t.waitForTimeout(2000);
  const k0 = await t.evaluate(async () => { const r = await import('/js/karte/render.js'); return { ...r.kamera }; });
  const cdp = await tablet.newCDPSession(t);
  const touch = async (typ, pts) => cdp.send('Input.dispatchTouchEvent', { type: typ, touchPoints: pts });
  await touch('touchStart', [{ x: 500, y: 400 }]);
  for (let i = 1; i <= 8; i++) await touch('touchMove', [{ x: 500 - i * 20, y: 400 - i * 10 }]);
  await touch('touchEnd', []);
  await t.waitForTimeout(300);
  const k1 = await t.evaluate(async () => { const r = await import('/js/karte/render.js'); return { ...r.kamera }; });
  pruefe('Touch: Ziehen verschiebt die Karte', k1.x !== k0.x, JSON.stringify(k1));
  await touch('touchStart', [{ x: 400, y: 400, id: 1 }, { x: 600, y: 400, id: 2 }]);
  for (let i = 1; i <= 8; i++) await touch('touchMove', [{ x: 400 - i * 15, y: 400, id: 1 }, { x: 600 + i * 15, y: 400, id: 2 }]);
  await touch('touchEnd', []);
  await t.waitForTimeout(300);
  const k2 = await t.evaluate(async () => { const r = await import('/js/karte/render.js'); return { ...r.kamera }; });
  pruefe('Touch: Zwei-Finger-Zoom', k2.zoom > k1.zoom, 'Zoom ' + k1.zoom + ' → ' + k2.zoom);
  await t.screenshot({ path: path.join(shots, 'bt-4-tablet.png') });
  pruefe('Tablet/Demo ohne Fehler', tFehler.length === 0, tFehler.join(' | '));
} catch (e) {
  pruefe('Browser-Lauf abgebrochen', false, e.stack);
} finally {
  await browser.close();
  dev.kill();
}
const fehlgeschlagen = ergebnisse.filter((e) => !e.ok);
console.log(`\n${ergebnisse.length - fehlgeschlagen.length}/${ergebnisse.length} Prüfungen bestanden. Screenshots: ${shots}`);
fs.writeFileSync(path.join(wurzel, 'tools', 'browsertest-ergebnis.json'), JSON.stringify({ zeit: new Date().toISOString(), ergebnisse }, null, 1));
process.exit(fehlgeschlagen.length ? 1 : 0);
