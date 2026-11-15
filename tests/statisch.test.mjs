import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
await import('../public/js/grafik/alle.js');
const { hatSprite, pinselFuer, alleSprites } = await import('../public/js/grafik/sprites.js');
const D = await import('../public/shared/daten/index.js');

test('Jede Einheit, jedes Gebäude, Wunder, jeder Rohstoff und jede Verbesserung hat ein Sprite', () => {
  const fehlt = [];
  for (const e of D.EINHEITEN) if (!hatSprite('einheit', e.id)) fehlt.push('einheit:' + e.id);
  for (const g of D.GEBAEUDE) if (!hatSprite('gebaeude', g.id)) fehlt.push('gebaeude:' + g.id);
  for (const w of D.WUNDER) if (!hatSprite('wunder', w.id)) fehlt.push('wunder:' + w.id);
  for (const r of D.ROHSTOFFE) if (!hatSprite('rohstoff', r.id)) fehlt.push('rohstoff:' + r.id);
  for (const v of D.VERBESSERUNGEN) if (!hatSprite('verbesserung', v.id)) fehlt.push('verbesserung:' + v.id);
  for (const r of D.ROHSTOFFE) if (r.tier && !hatSprite('tier', r.tier)) fehlt.push('tier:' + r.tier);
  for (const t of ['wolf', 'baer', 'tiger', 'jaguar', 'krokodil', 'schneeleopard']) if (!hatSprite('tier', t)) fehlt.push('tier:' + t);
  for (const z of ['wirtschaft', 'militaer', 'see', 'wissen', 'staat', 'industrie', 'luft', 'raumfahrt']) if (!hatSprite('zweig', z)) fehlt.push('zweig:' + z);
  for (const g of D.GELAENDE) if (!['kueste', 'meer', 'tiefsee', 'see'].includes(g.id) && !hatSprite('deko', g.id)) fehlt.push('deko:' + g.id);
  for (const x of ['stadt', 'mauer', 'stadtstaat', 'kapitol']) if (!hatSprite('stadt', x)) fehlt.push('stadt:' + x);
  for (const x of ['barbarenlager', 'ruine', 'fallout']) if (!hatSprite('deko', x)) fehlt.push('deko:' + x);
  assert.deepEqual(fehlt, []);
});

test('Alle in der Oberfläche benutzten UI-Symbole existieren', () => {
  const benutzt = new Set();
  const lauf = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { if (!p.includes('sprites')) lauf(p); } else if (p.endsWith('.js')) for (const m of fs.readFileSync(p, 'utf8').matchAll(/(?:symbol|sprite)\('ui',\s*'([a-z_]+)'/g)) benutzt.add(m[1]); } };
  lauf('public/js');
  const fehlt = [...benutzt].filter((id) => !hatSprite('ui', id));
  assert.deepEqual(fehlt, []);
});

test('Sprites sind nicht leer und nicht abgeschnitten; Zeitalter-Stufen der Städte unterscheiden sich', () => {
  const probleme = [];
  for (const s of alleSprites()) {
    const zs = s.zeitalterVarianten ? [0, 1, 2, 3, 4, 5, 6] : [0];
    for (const z of zs) {
      const p = pinselFuer(s.kategorie, s.id, { zeitalter: z, variante: 0, groesse: s.groessen || 1 });
      if (p.deckend() < 12) probleme.push(`${s.kategorie}:${s.id} fast leer`);
    }
  }
  assert.deepEqual(probleme, []);
  const stadt = [0, 1, 2, 3, 4, 5, 6].map((z) => pinselFuer('stadt', 'stadt', { zeitalter: z, groesse: 2 }).feld.join(','));
  assert.equal(new Set(stadt).size, 7, 'Städte je Zeitalter verschieden');
});

test('Keine zwei Einheiten sehen gleich aus', () => {
  const seen = new Map();
  for (const e of D.EINHEITEN) { const k = pinselFuer('einheit', e.id, {}).feld.join(','); assert.ok(!seen.has(k), `${e.id} sieht aus wie ${seen.get(k)}`); seen.set(k, e.id); }
});

test('Statische Dateien: alle Verweise in index.html existieren, wrangler.jsonc ist gültig', () => {
  const html = fs.readFileSync('public/index.html', 'utf8');
  for (const m of html.matchAll(/(?:src|href)="([^"#?]+)"/g)) assert.ok(fs.existsSync(path.join('public', m[1])), 'fehlt: ' + m[1]);
  assert.ok(html.indexOf('lgh-vorlade.js') < html.indexOf('js/main.js'), 'Vorlade-Skript muss vor dem Spielcode stehen');
  assert.ok(html.indexOf('lgh-vorlade.js') < html.indexOf('<meta charset') + 200);
  const w = JSON.parse(fs.readFileSync('wrangler.jsonc', 'utf8').replace(/\/\/.*$/gm, ''));
  assert.equal(w.name, 'volk2'); assert.equal(w.main, './src/worker.js');
  assert.deepEqual(w.durable_objects.bindings.map((b) => b.class_name), ['Lobby', 'Partie']);
  assert.ok(fs.existsSync('public/favicon.svg'));
});

test('Alle Client-Module laden ohne fehlende Importe (statische Importpfade existieren)', () => {
  const fehlt = [];
  const lauf = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) lauf(p); else if (p.endsWith('.js')) for (const m of fs.readFileSync(p, 'utf8').matchAll(/(?:import|from)\s*\(?\s*'(\.{1,2}\/[^']+)'/g)) { if (!fs.existsSync(path.resolve(path.dirname(p), m[1]))) fehlt.push(p + ' -> ' + m[1]); } } };
  lauf('public/js'); lauf('public/shared'); lauf('src');
  assert.deepEqual(fehlt, []);
});
