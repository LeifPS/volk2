import test from 'node:test';
import assert from 'node:assert/strict';
import { STD, MIN, TAG, speicherAttrappe, socketAttrappe } from './hilfen.mjs';
import { PartieServer } from '../src/server.js';
import { LobbyServer, einstellungenPruefen } from '../src/lobby.js';
import { Konten, passwortHash } from '../src/konten.js';

const env = { ADMIN_TOKEN: 'admin-geheim-1234567890' };
const FARBEN = ['#1010f0', '#ffffff', '#d010f0', '#10b0f0'];
/** Erzeugt einen Partie-Server mit n Menschen (und optional KI) und verbindet je einen Socket. */
function neuePartie(namen = ['anna', 'bert'], o = {}) {
  const sp = speicherAttrappe(), so = socketAttrappe();
  const srv = new PartieServer(sp, env, so);
  const r = srv.start({ id: 'abc123', name: 'Testpartie', host: namen[0], spieler: namen.map((n, i) => ({ konto: n, name: n + 'volk', farbe: FARBEN[i] })), einstellungen: { ki: o.ki || [{ stufe: 'normal' }], stadtstaaten: 1, zugzeit: { aktiv: false }, ...(o.einstellungen || {}) } }, Date.now());
  assert.equal(r.ok, true, r.fehler);
  const verb = {};
  for (const n of namen) { const ws = so.neu({ konto: n }); srv.verbunden(ws); verb[n] = { ws, volk: srv.volkVon(n) }; }
  return { srv, sp, so, ...verb };
}
const antwort = (ws, id) => ws.empfangen.find((m) => m.t === 'antwort' && m.id === id);
let nid = 100;
async function befehl(srv, ws, b) { const id = nid++; await srv.nachricht(ws, JSON.stringify({ t: 'befehl', id, b })); return antwort(ws, id); }
/** Lässt so lange Züge beenden, bis `konto` am Zug ist. */
async function bisAmZug(srv, pn, konto) {
  for (let i = 0; i < 20 && srv.spiel.amZug() !== srv.volkVon(konto); i++) {
    const dran = srv.kontoVon(srv.spiel.amZug());
    await befehl(srv, pn[dran].ws, { art: 'zug_beenden' });
  }
  assert.equal(srv.spiel.amZug(), srv.volkVon(konto));
}

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
  const ohne = new LobbyServer(speicherAttrappe(), {});
  assert.equal((await ohne.http('/api/admin/statistik', 'GET', null, 'x', 'Bearer irgendwas')).ok, false);
  const lobby = new LobbyServer(speicherAttrappe(), env);
  await lobby.http('/api/registrieren', 'POST', { name: 'oma', passwort: 'passwort1' }, 'ipx');
  assert.equal((await lobby.http('/api/admin/passwort', 'POST', { name: 'oma', passwort: 'neu12345' }, 'x', 'Bearer falsch')).ok, false);
  assert.equal((await lobby.http('/api/admin/passwort', 'POST', { name: 'oma', passwort: 'neu12345' }, 'x', 'Bearer ' + env.ADMIN_TOKEN)).ok, true);
  assert.equal((await lobby.http('/api/anmelden', 'POST', { name: 'oma', passwort: 'neu12345' }, 'ipy')).ok, true);
  assert.equal((await lobby.http('/api/admin/sperren', 'POST', { name: 'oma' }, 'x', 'Bearer ' + env.ADMIN_TOKEN)).ok, true);
  assert.equal((await lobby.http('/api/anmelden', 'POST', { name: 'oma', passwort: 'neu12345' }, 'ipz')).ok, false);
});

test('Lobby: Partie erstellen, beitreten, Einstellungen prüfen, nur der Host startet, Zugang nur für Mitglieder', async () => {
  const gestartet = [];
  const lobby = new LobbyServer(speicherAttrappe(), env, { starten: async (p) => { gestartet.push(p); return { ok: true }; } });
  const reg = async (n, ip) => (await lobby.http('/api/registrieren', 'POST', { name: n, passwort: 'passwort1' }, ip)).token;
  const tA = await reg('anna', 'i1'), tB = await reg('bert', 'i2'), tC = await reg('carl', 'i3');
  const neu = await lobby.http('/api/partie/neu', 'POST', { token: tA, name: 'Familienrunde', volk: { name: 'Annas Volk', farbe: '#1010f0' }, einstellungen: { tempo: 'blitz', ki: [{ stufe: 'boni2' }, { stufe: 'quatsch' }], maxSpieler: 2, siege: { punkte: false } } });
  assert.equal(neu.ok, true, neu.fehler);
  const id = neu.partie.id;
  assert.equal(neu.partie.einstellungen.tempo, 'blitz');
  assert.deepEqual(neu.partie.einstellungen.ki.map((k) => k.stufe), ['boni2', 'normal'], 'unbekannte KI-Stufe wird Normal');
  assert.equal(neu.partie.einstellungen.siege.punkte, false);
  // Beitreten: ähnliche Farbe, doppelter Name, dann ok
  assert.equal((await lobby.http('/api/partie/beitreten', 'POST', { token: tB, partie: id, volk: { name: 'Berts Volk', farbe: '#1111f1' } })).ok, false);
  assert.equal((await lobby.http('/api/partie/beitreten', 'POST', { token: tB, partie: id, volk: { name: 'annas volk', farbe: '#d010f0' } })).ok, false);
  assert.equal((await lobby.http('/api/partie/beitreten', 'POST', { token: tB, partie: id, volk: { name: 'Berts Volk', farbe: '#d010f0' } })).ok, true);
  assert.equal((await lobby.http('/api/partie/beitreten', 'POST', { token: tC, partie: id, volk: { name: 'Carls Volk', farbe: '#10b0f0' } })).ok, false, 'Partie voll (maxSpieler 2)');
  // Nur Host startet und ändert
  assert.equal((await lobby.http('/api/partie/starten', 'POST', { token: tB, partie: id })).ok, false);
  assert.equal((await lobby.http('/api/partie/einstellungen', 'POST', { token: tB, partie: id, einstellungen: {} })).ok, false);
  assert.equal(lobby.zugang(tA, id), null, 'vor dem Start kein Spielzugang');
  assert.equal((await lobby.http('/api/partie/starten', 'POST', { token: tA, partie: id })).ok, true);
  assert.equal(gestartet.length, 1); assert.equal(gestartet[0].spieler.length, 2);
  assert.equal(lobby.zugang(tA, id), 'anna'); assert.equal(lobby.zugang(tB, id), 'bert'); assert.equal(lobby.zugang(tC, id), null, 'Fremde kommen nicht rein');
  // Liste: Mitglieder sehen die Partie, Dritte nicht (läuft schon)
  assert.equal((await lobby.http('/api/partien', 'GET', { token: tA })).partien.length, 1);
  assert.equal((await lobby.http('/api/partien', 'GET', { token: tC })).partien.length, 0);
  assert.equal((await lobby.http('/api/partien', 'GET', {})).ok, false, 'ohne Anmeldung nichts');
  // Statusmeldung der Partie
  lobby.statusMelden(id, { runde: 7, status: 'laeuft', dran: 'bert', sieger: null, siegart: null });
  const l = (await lobby.http('/api/partien', 'GET', { token: tB })).partien[0];
  assert.equal(l.runde, 7); assert.equal(l.am_zug, true);
  // Neustart: alles bleibt
  const lobby2 = new LobbyServer(lobby.speicher, env);
  assert.equal(lobby2.zugang(tA, id), 'anna');
  assert.equal(einstellungenPruefen({ rundenlimit: 5 }).rundenlimit, 20);
});

test('Partie-Server: Einheiten fremder Völker, Bauen außerhalb, Forschung überspringen, Kosten umgehen, Karte lesen – und nur im eigenen Zug', async () => {
  const P = neuePartie(['anna', 'bert']);
  const { srv } = P, s = srv.spiel;
  const [A, B] = [P.anna, P.bert];
  const wsDran = (k) => P[k].ws;
  // Wer zuerst dran ist, baut die Stadt; der andere darf nichts.
  const erster = srv.kontoVon(s.amZug()), zweiter = erster === 'anna' ? 'bert' : 'anna';
  const sied1 = s.einheitenVon(P[erster].volk).find((e) => e.typ === 'siedler');
  const fremd = await befehl(srv, wsDran(zweiter), { art: 'stadt_gruenden', einheit: s.einheitenVon(P[zweiter].volk).find((e) => e.typ === 'siedler').id });
  assert.equal(fremd.ok, false); assert.match(fremd.fehler, /nicht am Zug/);
  assert.equal((await befehl(srv, wsDran(erster), { art: 'stadt_gruenden', einheit: sied1.id })).ok, true);
  // Fremde Einheiten (auch im eigenen Zug) sind tabu
  const eFremd = s.einheitenVon(P[zweiter].volk)[0];
  assert.equal((await befehl(srv, wsDran(erster), { art: 'bewegen', einheit: eFremd.id, ziel: eFremd.feld + 1 })).ok, false);
  assert.equal((await befehl(srv, wsDran(erster), { art: 'aufloesen', einheit: eFremd.id })).ok, false);
  const stadt = s.staedteVon(P[erster].volk)[0];
  const r1 = await befehl(srv, wsDran(erster), { art: 'bauen', stadt: stadt.id, typ: 'gebaeude', id: 'universitaet' });
  assert.equal(r1.ok, false); assert.match(r1.fehler, /Forschung/);
  s.z.voelker[P[erster].volk].gold = 0;
  assert.equal((await befehl(srv, wsDran(erster), { art: 'bauen', stadt: stadt.id, typ: 'einheit', id: 'siedler' })).ok, false);
  // Unsinnige Nachrichten
  await srv.nachricht(wsDran(erster), 'kein json');
  for (const [id, art] of [[999, 'befehl_bauen'], [998, '__proto__'], [997, 'constructor']]) {
    await srv.nachricht(wsDran(erster), JSON.stringify({ t: 'befehl', id, b: { art } }));
    assert.equal(antwort(wsDran(erster), id).ok, false);
  }
  // Forschung überspringen gibt es nicht
  const r4 = await befehl(srv, wsDran(erster), { art: 'forschen', id: 'eisenverarbeitung' });
  assert.equal(r4.ok, true);
  assert.notEqual(s.z.voelker[P[erster].volk].forschung.aktiv, 'eisenverarbeitung');
  // Ansicht enthält nichts außerhalb der Sicht
  const sicht = s.sichtbareFelder(P[erster].volk), ans = s.ansichtFuer(P[erster].volk);
  for (const e of Object.values(ans.einheiten)) if (e.volk !== P[erster].volk) assert.ok(sicht.has(e.feld));
  for (const i of Object.keys(ans.felder)) assert.ok(s.istErkundet(s.nebel(P[erster].volk), +i));
  await srv.nachricht(wsDran(erster), JSON.stringify({ t: 'frage', id: 996, q: { art: 'weg', einheit: eFremd.id, ziel: 0 } }));
  assert.equal(antwort(wsDran(erster), 996).ok, false);
  // Konto ohne Volk in dieser Partie
  const ws = P.so.neu({ konto: 'fremder' }); srv.verbunden(ws);
  await srv.nachricht(ws, JSON.stringify({ t: 'befehl', id: 995, b: { art: 'ping' } }));
  assert.ok(!antwort(ws, 995) || antwort(ws, 995).ok === false);
  void A; void B;
});

test('Speicherung: nach Neustart (neuer Server aus demselben Speicher) ist alles wieder da, auch wer am Zug ist', async () => {
  const P = neuePartie(['carla', 'dirk']);
  const { srv, sp } = P;
  await bisAmZug(srv, P, 'carla');
  const sied = srv.spiel.einheitenVon(P.carla.volk).find((e) => e.typ === 'siedler');
  await befehl(srv, P.carla.ws, { art: 'stadt_gruenden', einheit: sied.id });
  await befehl(srv, P.carla.ws, { art: 'forschen', id: 'ackerbau' });
  await befehl(srv, P.carla.ws, { art: 'zug_beenden' });
  const vorher = JSON.stringify({ v: srv.spiel.z.voelker[P.carla.volk].forschung, s: srv.spiel.staedteVon(P.carla.volk).map((x) => [x.bev, x.gebiet.length]), runde: srv.spiel.z.global.partie.runde, dran: srv.spiel.amZug(), t: srv.spiel.t });
  const zeilen = sp.m.size;
  assert.ok(zeilen > 10 && zeilen < 400, 'Zeilen: ' + zeilen);
  const srv2 = new PartieServer(sp, env, socketAttrappe());
  const nachher = JSON.stringify({ v: srv2.spiel.z.voelker[P.carla.volk].forschung, s: srv2.spiel.staedteVon(P.carla.volk).map((x) => [x.bev, x.gebiet.length]), runde: srv2.spiel.z.global.partie.runde, dran: srv2.spiel.amZug(), t: srv2.spiel.t });
  assert.equal(nachher, vorher);
  assert.equal(srv2.spiel.nebelText(P.carla.volk), srv.spiel.nebelText(P.carla.volk));
  assert.equal(srv2.volkVon('dirk'), P.dirk.volk);
});

test('Zugzeit im Server: Alarm = Frist des Zugs; nach Ablauf wird der Zug beendet', async () => {
  const P = neuePartie(['emil', 'fritz'], { einstellungen: { zugzeit: { aktiv: true, start: 2 * STD, plus: STD, max: 2 * STD, verpasstMax: 3 } } });
  const { srv } = P;
  const p = srv.spiel.z.global.partie;
  assert.ok(p.zug && p.zug.frist > Date.now() + 1.9 * STD, 'Frist läuft');
  assert.ok(srv.naechsterAlarm() >= p.zug.frist - 5000 && srv.naechsterAlarm() <= p.zug.frist + 5000);
  const dran = srv.spiel.amZug();
  p.zug.frist = Date.now() - 1; // Frist abgelaufen
  srv.alarm();
  assert.notEqual(srv.spiel.amZug(), dran, 'nächster ist dran');
  assert.equal(srv.spiel.z.voelker[dran].bank, 0);
});

test('Deltas: nach einer Änderung bekommt der Client nur die Unterschiede', async () => {
  const P = neuePartie(['dora', 'emma']);
  const { srv } = P;
  await bisAmZug(srv, P, 'dora');
  const voll = P.dora.ws.empfangen.filter((m) => m.t === 'voll');
  assert.ok(voll.length >= 1);
  assert.ok(voll[0].ansicht.partie && voll[0].ansicht.partie.runde >= 1, 'Ansicht enthält die Partie');
  const n = P.dora.ws.empfangen.length;
  const sied = srv.spiel.einheitenVon(P.dora.volk).find((e) => e.typ === 'siedler');
  await befehl(srv, P.dora.ws, { art: 'stadt_gruenden', einheit: sied.id });
  const delta = P.dora.ws.empfangen.slice(n).find((m) => m.t === 'delta');
  assert.ok(delta && delta.d.staedte && delta.d.einheiten);
  assert.ok(JSON.stringify(delta).length < JSON.stringify(voll[0]).length);
});
