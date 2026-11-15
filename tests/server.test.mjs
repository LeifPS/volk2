import test from 'node:test';
import assert from 'node:assert/strict';
import { uhr, vorspulen, STD, MIN, TAG, speicherAttrappe, socketAttrappe } from './hilfen.mjs';
import { WeltServer } from '../src/server.js';
import { Konten, passwortHash } from '../src/konten.js';

const env = { __eigeneUhr: true, ADMIN_TOKEN: 'admin-geheim-1234567890' };
function neuerServer(sp = speicherAttrappe(), so = socketAttrappe()) { return { srv: new WeltServer(sp, env, so), sp, so }; }
async function spielerAnmelden(srv, so, name) {
  const r = await srv.http('/api/registrieren', 'POST', { name, passwort: 'passwort1' }, '1.2.3.' + name.length);
  assert.equal(r.ok, true, r.fehler);
  const info = srv.verbindungPruefen(r.token);
  const ws = so.neu(info);
  srv.verbunden(ws);
  await srv.nachricht(ws, JSON.stringify({ t: 'volk_gruenden', id: 1, name: name + 'volk', farbe: ['#1010f0', '#ffffff', '#d010f0', '#10b0f0'][so.liste.length - 1] }));
  const a = ws.empfangen.find((m) => m.t === 'antwort' && m.id === 1);
  assert.equal(a.ok, true, a.fehler);
  return { ws, token: r.token, volk: a.volk };
}
const antwort = (ws, id) => ws.empfangen.find((m) => m.t === 'antwort' && m.id === id);
let nid = 100;
async function befehl(srv, ws, b) { const id = nid++; await srv.nachricht(ws, JSON.stringify({ t: 'befehl', id, b })); return antwort(ws, id); }

test('Konten: Registrierung, Login, falsches Passwort, Rate-Limit, Namenskollision, Benutzername ≠ Volksname', async () => {
  let t = Date.now();
  const k = new Konten({}, () => t);
  assert.equal((await k.registrieren('ab', 'passwort1')).ok, false);
  assert.equal((await k.registrieren('leif', '123')).ok, false);
  const r = await k.registrieren('Leif', 'passwort1', 'ip1');
  assert.equal(r.ok, true);
  assert.equal((await k.registrieren('leif', 'anderes12', 'ip2')).ok, false, 'Namenskollision (Groß/klein)');
  assert.ok(!JSON.stringify(k.konten).includes('passwort1'), 'Passwort nur gehasht');
  assert.equal(k.konten.leif.hash, await passwortHash('passwort1', k.konten.leif.salz));
  assert.equal((await k.anmelden('leif', 'falsch', 'ip3')).ok, false);
  assert.equal((await k.anmelden('LEIF', 'passwort1', 'ip3')).ok, true);
  for (let i = 0; i < 6; i++) await k.anmelden('leif', 'falsch' + i, 'ip9');
  const gesperrt = await k.anmelden('leif', 'passwort1', 'ip9');
  assert.equal(gesperrt.ok, false); assert.match(gesperrt.fehler, /Zu viele/);
  t += 16 * MIN;
  assert.equal((await k.anmelden('leif', 'passwort1', 'ip9')).ok, true);
  // Sitzung läuft ab
  assert.equal(k.sitzung(r.token), 'leif');
  t += 31 * TAG;
  assert.equal(k.sitzung(r.token), null);
});

test('Admin: nur mit ADMIN_TOKEN aktiv, Passwort-Reset, Sperren', async () => {
  const ohne = new WeltServer(speicherAttrappe(), { __eigeneUhr: true }, socketAttrappe());
  assert.equal((await ohne.http('/api/admin/statistik', 'GET', null, 'x', 'Bearer irgendwas')).ok, false);
  const { srv } = neuerServer();
  await srv.http('/api/registrieren', 'POST', { name: 'oma', passwort: 'passwort1' }, 'ipx');
  assert.equal((await srv.http('/api/admin/passwort', 'POST', { name: 'oma', passwort: 'neu12345' }, 'x', 'Bearer falsch')).ok, false);
  assert.equal((await srv.http('/api/admin/passwort', 'POST', { name: 'oma', passwort: 'neu12345' }, 'x', 'Bearer ' + env.ADMIN_TOKEN)).ok, true);
  assert.equal((await srv.http('/api/anmelden', 'POST', { name: 'oma', passwort: 'neu12345' }, 'ipy')).ok, true);
  assert.equal((await srv.http('/api/admin/sperren', 'POST', { name: 'oma' }, 'x', 'Bearer ' + env.ADMIN_TOKEN)).ok, true);
  assert.equal((await srv.http('/api/anmelden', 'POST', { name: 'oma', passwort: 'neu12345' }, 'ipz')).ok, false);
  // Test-Zeitregler ist ohne Dev-Variable aus
  assert.equal((await srv.http('/api/dev/zeit', 'POST', { sprung_ms: 1000 }, 'x')).ok, false);
});

test('Server-Autorität: fremde Einheiten, Bauen außerhalb, Forschung überspringen, Kosten umgehen, Karte lesen', async () => {
  const { srv, so } = neuerServer();
  const A = await spielerAnmelden(srv, so, 'anna');
  const B = await spielerAnmelden(srv, so, 'bert');
  const s = srv.spiel;
  const eB = s.einheitenVon(B.volk)[0];
  assert.equal((await befehl(srv, A.ws, { art: 'bewegen', einheit: eB.id, ziel: eB.feld + 1 })).ok, false);
  assert.equal((await befehl(srv, A.ws, { art: 'aufloesen', einheit: eB.id })).ok, false);
  const siedA = s.einheitenVon(A.volk).find((e) => e.typ === 'siedler');
  assert.equal((await befehl(srv, A.ws, { art: 'stadt_gruenden', einheit: siedA.id })).ok, true);
  const stadtA = s.staedteVon(A.volk)[0];
  // Gebäude ohne Forschung
  const r1 = await befehl(srv, A.ws, { art: 'bauen', stadt: stadtA.id, typ: 'gebaeude', id: 'universitaet' });
  assert.equal(r1.ok, false); assert.match(r1.fehler, /Forschung/);
  // In fremder Stadt bauen
  const siedB = s.einheitenVon(B.volk).find((e) => e.typ === 'siedler');
  await befehl(srv, B.ws, { art: 'stadt_gruenden', einheit: siedB.id });
  const stadtB = s.staedteVon(B.volk)[0];
  assert.equal((await befehl(srv, A.ws, { art: 'bauen', stadt: stadtB.id, typ: 'einheit', id: 'krieger' })).ok, false);
  // Arbeiter außerhalb der Grenzen
  const arb = s.einheitErzeugen(A.volk, 'arbeiter', stadtB.gebiet.find((i) => i !== stadtB.feld));
  s.z.voelker[A.volk].forschung.erforscht.ackerbau = 1;
  const r2 = await befehl(srv, A.ws, { art: 'arbeiten', einheit: arb.id, verbesserung: 'farm' });
  assert.equal(r2.ok, false); assert.match(r2.fehler, /eigenen Grenzen/);
  // Kosten umgehen: zu teuer
  s.z.voelker[A.volk].gold = 0;
  const r3 = await befehl(srv, A.ws, { art: 'bauen', stadt: stadtA.id, typ: 'einheit', id: 'siedler' });
  assert.equal(r3.ok, false);
  // Unsinnige Nachrichten
  await srv.nachricht(A.ws, 'kein json');
  await srv.nachricht(A.ws, JSON.stringify({ t: 'befehl', id: 999, b: { art: 'befehl_bauen' } }));
  assert.equal(antwort(A.ws, 999).ok, false);
  await srv.nachricht(A.ws, JSON.stringify({ t: 'befehl', id: 998, b: { art: '__proto__' } }));
  assert.equal(antwort(A.ws, 998).ok, false);
  await srv.nachricht(A.ws, JSON.stringify({ t: 'befehl', id: 997, b: { art: 'constructor' } }));
  assert.equal(antwort(A.ws, 997).ok, false);
  // Forschung überspringen gibt es nicht: Server stellt Voraussetzungen davor
  const r4 = await befehl(srv, A.ws, { art: 'forschen', id: 'eisenverarbeitung' });
  assert.equal(r4.ok, true);
  assert.notEqual(s.z.voelker[A.volk].forschung.aktiv, 'eisenverarbeitung');
  // Karte lesen: Ansicht enthält keine Einheiten außerhalb der Sicht
  const sicht = s.sichtbareFelder(A.volk);
  const ans = s.ansichtFuer(A.volk);
  for (const e of Object.values(ans.einheiten)) if (e.volk !== A.volk) assert.ok(sicht.has(e.feld));
  for (const i of Object.keys(ans.felder)) assert.ok(s.istErkundet(s.nebel(A.volk), +i));
  // Befehle an Offline-Spieler-Einheiten: nur der Besitzer kann befehlen; Fragen über fremde Einheiten verweigert
  await srv.nachricht(A.ws, JSON.stringify({ t: 'frage', id: 996, q: { art: 'weg', einheit: eB.id, ziel: 0 } }));
  assert.equal(antwort(A.ws, 996).ok, false);
});

test('Speicherung: nach Neustart (neuer Server aus demselben Speicher) ist alles wieder da', async () => {
  const { srv, sp, so } = neuerServer();
  const A = await spielerAnmelden(srv, so, 'carla');
  const sied = srv.spiel.einheitenVon(A.volk).find((e) => e.typ === 'siedler');
  await befehl(srv, A.ws, { art: 'stadt_gruenden', einheit: sied.id });
  await befehl(srv, A.ws, { art: 'forschen', id: 'ackerbau' });
  vorspulen(srv.spiel, 3 * STD); srv.nachAenderung();
  const vorher = JSON.stringify({ v: srv.spiel.z.voelker[A.volk].forschung, s: srv.spiel.staedteVon(A.volk).map((x) => [x.bev, x.gebiet.length]) });
  const zeilen = sp.m.size;
  assert.ok(zeilen > 10 && zeilen < 400, 'Zeilen: ' + zeilen);
  const srv2 = new WeltServer(sp, env, socketAttrappe());
  const nachher = JSON.stringify({ v: srv2.spiel.z.voelker[A.volk].forschung, s: srv2.spiel.staedteVon(A.volk).map((x) => [x.bev, x.gebiet.length]) });
  assert.equal(nachher, vorher);
  assert.equal(srv2.spiel.nebelText(A.volk), srv.spiel.nebelText(A.volk));
  assert.equal(srv2.konten.sitzung(A.token), 'carla');
});

test('Deltas: nach einer Änderung bekommt der Client nur die Unterschiede', async () => {
  const { srv, so } = neuerServer();
  const A = await spielerAnmelden(srv, so, 'dora');
  const voll = A.ws.empfangen.filter((m) => m.t === 'voll');
  assert.ok(voll.length >= 1);
  const n = A.ws.empfangen.length;
  const sied = srv.spiel.einheitenVon(A.volk).find((e) => e.typ === 'siedler');
  await befehl(srv, A.ws, { art: 'stadt_gruenden', einheit: sied.id });
  const delta = A.ws.empfangen.slice(n).find((m) => m.t === 'delta');
  assert.ok(delta && delta.d.staedte && delta.d.einheiten);
  assert.ok(JSON.stringify(delta).length < JSON.stringify(voll[0]).length);
});
