import test from 'node:test';
import assert from 'node:assert/strict';
import { uhr, STD, MIN, speicherAttrappe, socketAttrappe, Spiel } from './hilfen.mjs';
import { WeltServer } from '../src/server.js';
import { botMachen, botErweitern } from '../tools/bot.mjs';
import { EINHEIT } from '../public/shared/daten/index.js';
import { schichtVon } from '../public/shared/engine/einheiten.js';
botErweitern(Spiel);

test('Mehrspieler-Simulation: 4 Spieler (Bots) + KI + Stadtstaaten + Barbaren über 2 simulierte Wochen', { timeout: 300000 }, async () => {
  const sp = speicherAttrappe();
  let schreibZeilen = 0, schreibVorgaenge = 0;
  const alt = sp.schreibe; sp.schreibe = (z) => { schreibZeilen += z.size; schreibVorgaenge++; alt(z); };
  const so = socketAttrappe();
  const srv = new WeltServer(sp, { __eigeneUhr: true }, so);
  const sockets = [];
  for (const [i, name] of ['anna', 'bert', 'carla', 'dieter'].entries()) {
    const r = await srv.http('/api/registrieren', 'POST', { name, passwort: 'passwort1' }, 'ip' + i);
    const ws = so.neu(srv.verbindungPruefen(r.token)); srv.verbunden(ws);
    await srv.nachricht(ws, JSON.stringify({ t: 'volk_gruenden', id: 1, name: name + 'volk', farbe: ['#1010f0', '#ffffff', '#d010f0', '#10b0f0'][i] }));
    const v = srv.spiel.z.voelker[ws.info.volk];
    const sied = srv.spiel.einheitenVon(v.id).find((e) => e.typ === 'siedler');
    await srv.nachricht(ws, JSON.stringify({ t: 'befehl', id: 2, b: { art: 'stadt_gruenden', einheit: sied.id } }));
    botMachen(srv.spiel, v, ['forscher', 'bauer', 'krieger', 'forscher'][i]);
    sockets.push(ws);
  }
  let alarme = 0, nachrichten = 0;
  const startZeilen = schreibZeilen;
  for (let h = 0; h < 14 * 24; h++) {
    // nachts sind zwei Spieler offline
    const stunde = h % 24;
    for (const [i, ws] of sockets.entries()) {
      const soll = !(i >= 2 && (stunde < 8 || stunde > 20));
      const ist = so.liste.includes(ws);
      if (soll && !ist) { so.liste.push(ws); srv.verbunden(ws); }
      if (!soll && ist) { so.weg(ws); srv.getrennt(ws); }
    }
    // Alarme so wie das Durable Object: immer zum nächsten Ereignis
    const ende = uhr.jetzt() + STD;
    for (;;) {
      const n = srv.spiel.naechsteZeit();
      if (n == null || n > ende) break;
      uhr.setze(Math.max(uhr.jetzt(), n)); srv.alarm(); alarme++;
      if (alarme > 400000) break;
    }
    uhr.setze(ende);
    // ein paar Spielerbefehle (Ping)
    for (const ws of sockets) if (so.liste.includes(ws)) { await srv.nachricht(ws, JSON.stringify({ t: 'befehl', id: 9, b: { art: 'ping' } })); nachrichten++; }
  }
  const s = srv.spiel;
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
  for (const ws of sockets) { const v = s.z.voelker[ws.info.volk]; assert.ok(s.staedteVon(v.id).length >= 2, v.name + ' hat zu wenige Städte'); }
  // Lastabschätzung (2 Wochen) -> pro Tag
  const tage = 14;
  const zeilenProTag = (schreibZeilen - startZeilen) / tage;
  const anfragenProTag = alarme / tage + nachrichten / 20 / tage;
  console.log(`Last: ${Math.round(alarme / tage)} Alarme/Tag, ${Math.round(zeilenProTag)} geschriebene Zeilen/Tag, ${Math.round(anfragenProTag)} Anfragen/Tag (ohne echte Klicks), ${sp.m.size} Zeilen gesamt`);
  assert.ok(anfragenProTag < 20000, 'zu viele Anfragen: ' + anfragenProTag);
  assert.ok(zeilenProTag < 60000, 'zu viele Schreibzeilen: ' + zeilenProTag);
});
