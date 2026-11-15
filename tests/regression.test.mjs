// Regressionstests für die Fehler aus dem Code-Review.
import test from 'node:test';
import assert from 'node:assert/strict';
import { uhr, STD, MIN, TAG, neueWelt, spielerMitStadt, vorspulen, speicherAttrappe, socketAttrappe } from './hilfen.mjs';
import { WeltServer } from '../src/server.js';
import { Konten } from '../src/konten.js';
import { nachbarn } from '../public/shared/hex.js';
import { karte } from '../public/shared/karte.js';
import { GELAENDE } from '../public/shared/daten/gelaende.js';

const env = { __eigeneUhr: true };
async function serverMitSpieler(name = 'anna') {
  const sp = speicherAttrappe(), so = socketAttrappe();
  const srv = new WeltServer(sp, env, so);
  const r = await srv.http('/api/registrieren', 'POST', { name, passwort: 'passwort1' }, 'ip-' + name);
  const ws = so.neu(srv.verbindungPruefen(r.token)); srv.verbunden(ws);
  await srv.nachricht(ws, JSON.stringify({ t: 'volk_gruenden', id: 1, name: name + 'volk', farbe: '#1010f0' }));
  return { sp, so, srv, ws, token: r.token, vid: ws.info.volk };
}

test('Aktives Naturereignis übersteht einen Neustart des Durable Objects', async () => {
  const { sp, so, srv, ws, vid } = await serverMitSpieler();
  const s = srv.spiel;
  await srv.nachricht(ws, JSON.stringify({ t: 'befehl', id: 2, b: { art: 'stadt_gruenden', einheit: s.einheitenVon(vid).find((e) => e.typ === 'siedler').id } }));
  const st = s.staedteVon(vid)[0];
  const id = s.neueId();
  (s.z.global.ereignisse ||= []).push({ id, typ: 'duerre', felder: st.gebiet.slice(), mitte: st.feld, start: s.t + MIN, ende: s.t + 10 * STD, aktiv: false, nahrung: -1 });
  s.markiere('g');
  uhr.vorspulen(2 * MIN); srv.alarm(); s.raten(vid); srv.nachAenderung();
  const neu = new WeltServer(sp, env, so);
  assert.doesNotThrow(() => neu.spiel.naechsteZeit());
  assert.equal((await neu.http('/api/status', 'GET')).ok, true);
});

test('Waffenruhe gilt in beide Richtungen: offline gegangener Angreifer greift nach dem Marsch nicht an', () => {
  const s = neueWelt();
  const A = spielerMitStadt(s, 'Anfang'), B = spielerMitStadt(s, 'Beginn');
  A.v.schutz_bis = B.v.schutz_bis = 0;
  s.verbindung(A.v.id, true); s.verbindung(B.v.id, true);
  Object.assign(s.diplo(A.v.id, B.v.id), { krieg: true, seit: s.t, letzter_kampf: s.t });
  const ka = s.einheitenVon(A.v.id).find((e) => e.typ === 'krieger'), kb = s.einheitenVon(B.v.id).find((e) => e.typ === 'krieger');
  let f0 = -1, f2 = -1;
  const ok = (i) => s.besitzer(i) == null && s.betretbar(A.v.id, { klasse: 'nahkampf' }, i) && !s.einheitenAuf(i).length;
  for (let i = 1000; i < 20000 && f0 < 0; i++) { if (!ok(i)) continue; for (const n1 of nachbarn(i)) { if (!ok(n1)) continue; const n2 = nachbarn(n1).find((x) => x !== i && !nachbarn(i).includes(x) && ok(x)); if (n2 != null) { f0 = i; f2 = n2; break; } } }
  ka.feld = f0; kb.feld = f2; s.positionenNeu();
  const r = s.befehl(B.v.id, { art: 'angreifen', einheit: kb.id, ziel: f0 });
  assert.equal(r.ok, true, r.fehler);
  kb.pfad[kb.pfad.length - 1].t = s.t + 45 * MIN;
  s.verbindung(B.v.id, false);
  vorspulen(s, 50 * MIN);
  assert.equal(s.z.einheiten[ka.id].hp, 100);
});

test('Prototyp-Schlüssel als Bau-ID oder Kontoname richten keinen Schaden an', async () => {
  const s = neueWelt();
  const { v, stadt } = spielerMitStadt(s, 'Prototyp');
  for (const typ of ['einheit', 'gebaeude', 'wunder']) for (const id of ['constructor', 'toString', '__proto__', 'raubtier']) {
    const r = s.befehl(v.id, { art: 'bauen', stadt: stadt.id, typ, id });
    assert.equal(r.ok, false, typ + ':' + id);
  }
  assert.equal(stadt.schlange.length, 0);
  const k = new Konten({}, () => Date.now());
  for (const n of ['constructor', '__proto__', 'toString']) {
    const r = await k.anmelden(n, 'passwort1', 'x');
    assert.equal(r.ok, false);
  }
  assert.equal((await k.registrieren('constructor', 'passwort1', 'y')).ok, true);
});

test('Bei der Eroberung werden Kriegsschiffe im Hafen versenkt statt übernommen', () => {
  const s = neueWelt();
  const A = spielerMitStadt(s, 'Hafenwacht'), B = spielerMitStadt(s, 'Seeraeuber');
  const k = karte();
  // eine Küstenstadt von A suchen oder Schiff einfach auf die Stadt setzen
  const boot = s.einheitErzeugen(A.v.id, 'boot', A.stadt.feld);
  if (boot) { boot.feld = A.stadt.feld; s.positionenNeu(); }
  const kb = s.einheitenVon(B.v.id).find((e) => e.typ === 'krieger');
  s.stadtErobern(A.stadt, kb);
  const militaerB = s.einheitenAuf(A.stadt.feld).filter((e) => e.volk === B.v.id && !['siedler', 'arbeiter', 'spaeher'].includes(e.typ));
  assert.equal(militaerB.length, 1, militaerB.map((e) => e.typ).join(','));
});

test('Automatischer Friedensvorschlag kommt nach Ablauf erneut', () => {
  const s = neueWelt();
  const A = spielerMitStadt(s, 'Dauerkrieg'), B = spielerMitStadt(s, 'Gegenseite');
  Object.assign(s.diplo(A.v.id, B.v.id), { krieg: true, seit: s.t, letzter_kampf: s.t });
  vorspulen(s, 13 * STD);
  const erst = Object.values(s.z.angebote).find((a) => a.auto);
  assert.ok(erst);
  vorspulen(s, 8 * TAG);
  const neu = Object.values(s.z.angebote).find((a) => a.auto);
  assert.ok(neu && neu.id !== erst.id, 'nach Ablauf muss ein neuer Vorschlag kommen');
});

test('Zwei Tabs: Schließen eines Tabs lässt den Spieler verbunden', async () => {
  const sp = speicherAttrappe(), so = socketAttrappe();
  const srv = new WeltServer(sp, env, so);
  const r = await srv.http('/api/registrieren', 'POST', { name: 'zweitab', passwort: 'passwort1' }, 'z');
  const w1 = so.neu(srv.verbindungPruefen(r.token)); srv.verbunden(w1);
  const w2 = so.neu(srv.verbindungPruefen(r.token)); srv.verbunden(w2);
  await srv.nachricht(w1, JSON.stringify({ t: 'volk_gruenden', id: 1, name: 'Zweitabvolk', farbe: '#1010f0' }));
  const v = srv.spiel.z.voelker[w1.info.volk];
  assert.equal(v.verbunden, 2);
  so.weg(w1); srv.getrennt(w1); srv.getrennt(w1);
  assert.equal(v.verbunden, 1);
});

test('Nebel: Stadtplatz-Anfrage und Wegvorschau verraten nichts Unsichtbares', async () => {
  const { srv, ws, vid } = await serverMitSpieler('nebelig');
  const s = srv.spiel;
  const fremd = s.alleStaedte().find((x) => x.volk !== vid && !s.istErkundet(s.nebel(vid), x.feld));
  assert.throws(() => s.frage(vid, { art: 'stadtplatz', feld: fremd.feld }));
  const nahe = nachbarn(fremd.feld).find((i) => !s.istErkundet(s.nebel(vid), i));
  if (nahe != null) assert.throws(() => s.frage(vid, { art: 'stadtplatz', feld: nahe }));
});

test('Vorgemerkter Bauauftrag startet, sobald das Material reicht, ohne Sekundentakt', () => {
  const s = neueWelt();
  const { v, stadt } = spielerMitStadt(s, 'Vormerker');
  s.aendern(v.id); v.gold = 0; delete s._raten[v.id];
  const r = s.befehl(v.id, { art: 'bauen', stadt: stadt.id, typ: 'einheit', id: 'krieger', vormerken: true });
  assert.equal(r.ok, true, r.fehler);
  let ereignisse = 0;
  for (let i = 0; i < 36; i++) { uhr.vorspulen(10 * MIN); ereignisse += s.verarbeite(uhr.jetzt()); }
  assert.ok(stadt.bau.length === 1 || s.einheitenVon(v.id).filter((e) => e.typ === 'krieger').length >= 2, 'Auftrag muss gestartet sein: ' + JSON.stringify({ schlange: stadt.schlange, bau: stadt.bau.length, gold: v.gold, k: s.einheitenVon(v.id).map((e) => e.typ), m: v.meldungen.slice(-3).map((m) => m.text) }));
  assert.ok(ereignisse < 3000, 'Sekundentakt? Ereignisse: ' + ereignisse);
});

test('Barbaren ignorieren den Neulingsschutz, Raubtiere nicht, Offline-Spieler bleiben verschont', () => {
  const s = neueWelt();
  const { v } = spielerMitStadt(s, 'Neuling');
  v.verbunden = 1; v.letzte_aktivitaet = s.t;
  const b = s.barbarenVolk(), t = s.tierVolk();
  assert.ok(v.schutz_bis > s.t);
  assert.equal(s.kampfHindernis(b.id, v.id), null, 'Barbaren dürfen Neulinge angreifen');
  assert.ok(s.kampfHindernis(t.id, v.id), 'Raubtiere respektieren den Schutz');
  assert.equal(s.kampfHindernis(v.id, b.id), null, 'Neulinge dürfen Barbaren bekämpfen');
  // Barbar neben einem Neuling geht tatsächlich zum Angriff über
  const ziel = s.einheitenVon(v.id).find((e) => e.typ === 'krieger');
  const n = nachbarn(ziel.feld).find((i) => s.einheitenAuf(i).length === 0 && !s.stadtAuf(i));
  const e = s.einheitErzeugen(b.id, 'krieger', n, {});
  e.abkling_bis = 0; e.pfad = [];
  const hp = ziel.hp;
  s.barbarHandeln(b, e);
  assert.ok(e.angriff != null || ziel.hp < hp || e.hp < 100, 'Der Barbar geht auf den Neuling los');
  // offline: verschont
  v.verbunden = 0; v.letzte_aktivitaet = s.t - 2 * STD; v.getrennt_seit = s.t - 2 * STD;
  assert.ok(s.kampfHindernis(b.id, v.id));
});
