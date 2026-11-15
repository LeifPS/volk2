import test from 'node:test';
import assert from 'node:assert/strict';
import { Spiel, leererZustand } from '../public/shared/engine/spiel.js';
import { STD, MIN } from './hilfen.mjs';
import { botMachen, botErweitern } from '../tools/bot.mjs';
import { EINHEIT } from '../public/shared/daten/index.js';
import { schichtVon } from '../public/shared/engine/einheiten.js';
botErweitern(Spiel);

test('Mehrspieler-Simulation: 4 Spieler (Bots) + KI + Stadtstaaten + Barbaren über 250 Runden', { timeout: 300000 }, async () => {
  const T0 = Date.UTC(2026, 0, 5, 12);
  const s = new Spiel(leererZustand(T0)); s.t = T0;
  const namen = ['anna', 'bert', 'carla', 'dieter'], farben = ['#1010f0', '#ffffff', '#d010f0', '#10b0f0'];
  s.partieStarten({ spieler: namen.map((n, i) => ({ konto: n, name: n + 'volk', farbe: farben[i] })), ki: [{ stufe: 'normal' }, { stufe: 'schwer' }], stadtstaaten: 4, zugzeit: { aktiv: true, start: 24 * STD, plus: STD, max: 24 * STD } }, T0);
  const menschen = s.alleVoelker().filter((v) => v.konto);
  for (const [i, v] of menschen.entries()) botMachen(s, v, ['forscher', 'bauer', 'krieger', 'forscher'][i]);
  const RUNDEN = 250;
  let echt = T0, zuege = 0;
  while (s.z.global.partie.runde <= RUNDEN && s.z.global.partie.status === 'laeuft') {
    const dran = s.amZug();
    assert.ok(dran, 'jemand muss dran sein');
    const v = s.z.voelker[dran];
    assert.equal(v.art, 'spieler', 'KI-Züge laufen automatisch, nur Menschen sind „dran“');
    if (!s.staedteVon(dran).length) { const sied = s.einheitenVon(dran).find((e) => e.typ === 'siedler'); const g = s.befehl(dran, { art: 'stadt_gruenden', einheit: sied.id }, echt); assert.ok(g.ok, g.fehler); }
    // Mensch gegen Bot-Verstand: Zug denken, dann beenden
    s.kiDenken(dran); s.botExtras(v);
    echt += 5 * MIN;
    const r = s.befehl(dran, { art: 'zug_beenden' }, echt);
    assert.ok(r.ok, r.fehler);
    zuege++;
  }
  assert.ok(s.z.global.partie.runde > RUNDEN || s.z.global.partie.status !== 'laeuft', 'Partie kam voran');
  const alarme = 0, nachrichten = 0, schreibZeilen = 0, startZeilen = 0;
  assert.deepEqual(s.z.global.fehler || [], []);
  // Konsistenz: Stapelregel, Besitz, gültige Typen
  const belegt = new Map();
  for (const e of s.alleEinheiten()) {
    assert.ok(EINHEIT[e.typ], 'unbekannter Typ ' + e.typ);
    assert.ok(s.z.voelker[e.volk], 'Einheit ohne Volk');
    assert.ok(e.hp > 0 && e.hp <= 100, 'LP ' + e.hp);
    if (e.in) continue;
    const sch = schichtVon(EINHEIT[e.typ]);
    if (sch === 'luft') continue;
    const k = e.feld + ':' + sch;
    if (belegt.has(k) && s.z.voelker[e.volk].art !== 'tiere') { const o = s.alleEinheiten().find((q) => q.id === belegt.get(k)); assert.fail('Stapelregel verletzt auf ' + k + ' | ' + JSON.stringify([e, o].map((x) => ({ id: x.id, typ: x.typ, volk: x.volk, modus: x.modus, pfad: (x.pfad || []).length })))); }
    belegt.set(k, e.id);
  }
  for (const [i, f] of Object.entries(s.z.felder)) if (f.s) assert.ok(s.z.staedte[f.s]?.gebiet.includes(+i), 'Feld ' + i + ' gehört einer Stadt, die es nicht kennt');
  for (const v of s.alleVoelker()) { assert.ok(v.gold >= 0 && Number.isFinite(v.gold)); for (const x of Object.values(v.lager || {})) assert.ok(x >= -1e-6 && Number.isFinite(x)); }
  for (const v of s.alleVoelker().filter((x) => x.konto)) assert.ok(s.staedteVon(v.id).length >= 2 || v.ausgeschieden, v.name + ' hat zu wenige Städte');
  console.log(`Runden: ${s.z.global.partie.runde}, Züge der Menschen: ${zuege}, Städte der Menschen: ${menschen.map((v) => s.staedteVon(v.id).length).join('/')}`);
});
