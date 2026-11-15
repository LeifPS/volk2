import test from 'node:test';
import assert from 'node:assert/strict';
import { karte, startWert, LANDANTEIL } from '../public/shared/karte.js';
import { GELAENDE } from '../public/shared/daten/gelaende.js';
import { ROHSTOFFE } from '../public/shared/daten/rohstoffe.js';
import { ANZAHL, BREITE, HOEHE, abstand, nachbarn, umkreis, feldMitte, feldBeiPixel } from '../public/shared/hex.js';
import { execFileSync } from 'node:child_process';

test('Karte ist deterministisch (gleicher Hash in einem zweiten Prozess)', () => {
  const h = karte().hash;
  const h2 = execFileSync(process.execPath, ['--input-type=module', '-e', "import('./public/shared/karte.js').then(m=>process.stdout.write(m.karte().hash))"]).toString();
  assert.equal(h, h2);
});

test('Karte nutzt keine engine-abhängigen Rechenfunktionen', async () => {
  const fs = await import('node:fs');
  for (const f of ['public/shared/karte.js', 'public/shared/zufall.js']) {
    const t = fs.readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '');
    assert.ok(!/Math\.(sin|cos|tan|exp|pow|log|atan|hypot|cbrt)/.test(t), f + ' nutzt eine nicht exakte Math-Funktion');
  }
});

test('Landanteil 40-50 %, mehrere Kontinente und Inseln', () => {
  const k = karte();
  const land = [...k.gelaende].filter((g) => !GELAENDE[g].wasser).length / ANZAHL;
  assert.ok(land >= 0.40 && land <= 0.50, 'Landanteil ' + land);
  const gross = k.landmasseGroesse.filter((n) => n >= 400).length;
  const insel = k.landmasseGroesse.filter((n) => n < 60).length;
  assert.ok(gross >= 3, 'große Kontinente: ' + gross);
  assert.ok(insel >= 3, 'Inseln: ' + insel);
});

test('Alle Gelände kommen vor, Flüsse und Seen existieren', () => {
  const k = karte();
  const da = new Set(k.gelaende);
  for (let i = 0; i < GELAENDE.length; i++) assert.ok(da.has(i), 'fehlt: ' + GELAENDE[i].id);
  assert.ok([...k.fluss].filter(Boolean).length > 300);
});

test('Alle platzierbaren Rohstoffe kommen mehrfach vor', () => {
  const k = karte();
  const n = {};
  for (const r of k.rohstoff) if (r) n[r - 1] = (n[r - 1] || 0) + 1;
  ROHSTOFFE.forEach((r, i) => { if (!r.flaeche) assert.ok((n[i] || 0) >= 3, r.id + ': ' + (n[i] || 0)); });
});

test('Genug gute Startplätze mit Platz (keine isolierten)', () => {
  const k = karte();
  const kand = [];
  for (let i = 0; i < ANZAHL; i += 3) if (startWert(i) > 0) kand.push(i);
  assert.ok(kand.length > 1000, 'Startkandidaten: ' + kand.length);
  for (const i of kand.slice(0, 200)) {
    assert.ok(k.landmasseGroesse[k.landmasse[i]] >= 250, 'kleine Landmasse');
    assert.ok(umkreis(i, 2).filter((j) => !GELAENDE[k.gelaende[j]].wasser).length >= 12);
  }
});

test('Hex-Geometrie: Nachbarn haben Abstand 1, Pixel-Umrechnung passt', () => {
  for (const i of [0, 500, 777, 12345, ANZAHL - 1]) {
    for (const n of nachbarn(i)) assert.equal(abstand(i, n), 1);
    const [x, y] = feldMitte(i, 28);
    assert.equal(feldBeiPixel(x, y, 28), i);
  }
  assert.equal(umkreis(BREITE * 50 + 50, 2).length, 19);
});
