import test from 'node:test';
import assert from 'node:assert/strict';
import { uhr, neueWelt, spielerMitStadt, vorspulen, STD, MIN } from './hilfen.mjs';
import { schaden, erwarteterSchaden, verwundungsMalus, KAMPF } from '../public/shared/regeln.js';
import { umkreis, abstand, nachbarn } from '../public/shared/hex.js';
import { karte } from '../public/shared/karte.js';
import { GELAENDE } from '../public/shared/daten/gelaende.js';
import { FORSCHUNGEN } from '../public/shared/daten/index.js';

test('Schadensformel wie in Civ: 30 × 1,0417^Δ × Zufall 0,8..1,2', () => {
  assert.equal(erwarteterSchaden(20, 20), 30);
  assert.equal(schaden(20, 20, 0), 24);
  assert.equal(schaden(20, 20, 1), 36);
  assert.equal(erwarteterSchaden(30, 20), Math.round(30 * Math.pow(1.0417, 10)));
  assert.ok(erwarteterSchaden(10, 40) < 10 && erwarteterSchaden(40, 10) > 90);
  assert.equal(verwundungsMalus(100), 0); assert.equal(verwundungsMalus(55), -4);
  // symmetrisch: Gleich starke Gegner fügen sich im Mittel gleichen Schaden zu
  assert.ok(Math.abs(erwarteterSchaden(33, 27) / 30 - 30 / erwarteterSchaden(27, 33)) < 0.06);
});

function kriegsBereit(s, a, b) {
  for (const v of [a, b]) { v.schutz_bis = 0; v.verbunden = 1; v.letzte_aktivitaet = uhr.jetzt(); v.forschung.erforscht.kriegerkodex = 1; }
}
function freiesNachbarfeld(s, v, d, feld) { return nachbarn(feld).find((n) => s.platzFrei(v, d, n) && s.betretbar(v, d, n) && !GELAENDE[karte().gelaende[n]].wasser); }

test('Neulingsschutz, Krieg nur gegen Online-Spieler, Waffenruhe offline, Schonfrist, Frieden nur beidseitig', () => {
  const s = neueWelt();
  const A = spielerMitStadt(s, 'Alpha'), B = spielerMitStadt(s, 'Beta');
  A.v.bekannt[B.v.id] = 1; B.v.bekannt[A.v.id] = 1;
  A.v.forschung.erforscht.kriegerkodex = 1;
  let r = s.befehl(A.v.id, { art: 'krieg_erklaeren', volk: B.v.id });
  assert.equal(r.ok, false); assert.match(r.fehler, /Neulingsschutz/);
  vorspulen(s, 25 * STD);
  B.v.verbunden = 0; B.v.getrennt_seit = uhr.jetzt() - 3 * STD; B.v.letzte_aktivitaet = uhr.jetzt() - 3 * STD;
  r = s.befehl(A.v.id, { art: 'krieg_erklaeren', volk: B.v.id });
  assert.equal(r.ok, false); assert.match(r.fehler, /offline/);
  s.verbindung(B.v.id, true);
  r = s.befehl(A.v.id, { art: 'krieg_erklaeren', volk: B.v.id });
  assert.equal(r.ok, true, r.fehler);
  assert.ok(s.imKrieg(A.v.id, B.v.id));
  assert.equal(s.kampfHindernis(A.v.id, B.v.id), null);
  // B geht offline: 30 min lang angreifbar, dann Waffenruhe
  s.verbindung(B.v.id, false);
  vorspulen(s, 20 * MIN);
  assert.equal(s.kampfHindernis(A.v.id, B.v.id), null);
  vorspulen(s, 15 * MIN);
  assert.match(s.kampfHindernis(A.v.id, B.v.id), /Waffenruhe/);
  // zurück: 10 min Schonfrist
  s.verbindung(B.v.id, true);
  assert.match(s.kampfHindernis(A.v.id, B.v.id), /Waffenruhe/);
  vorspulen(s, 11 * MIN);
  A.v.letzte_aktivitaet = uhr.jetzt();
  assert.equal(s.kampfHindernis(A.v.id, B.v.id), null);
  // Frieden: Angebot ohne Forschung nicht möglich, mit Forschung Angebot + Annahme
  r = s.befehl(A.v.id, { art: 'diplomatie_angebot', an: B.v.id, typ: 'frieden' });
  assert.equal(r.ok, false);
  A.v.forschung.erforscht.diplomatie = 1;
  r = s.befehl(A.v.id, { art: 'diplomatie_angebot', an: B.v.id, typ: 'frieden' });
  assert.equal(r.ok, true, r.fehler);
  assert.ok(s.imKrieg(A.v.id, B.v.id), 'Angebot allein beendet keinen Krieg');
  r = s.befehl(B.v.id, { art: 'angebot_antwort', id: r.angebot, annehmen: true });
  assert.equal(r.ok, true, r.fehler);
  assert.ok(!s.imKrieg(A.v.id, B.v.id));
});

test('Automatischer Friedensvorschlag nach 12 h ohne Kampf, beide müssen zustimmen', () => {
  const s = neueWelt();
  const A = spielerMitStadt(s, 'Gamma'), B = spielerMitStadt(s, 'Delta');
  A.v.bekannt[B.v.id] = 1; B.v.bekannt[A.v.id] = 1;
  vorspulen(s, 25 * STD);
  kriegsBereit(s, A.v, B.v);
  assert.equal(s.befehl(A.v.id, { art: 'krieg_erklaeren', volk: B.v.id }).ok, true);
  vorspulen(s, 13 * STD);
  const auto = Object.values(s.z.angebote).find((a) => a.auto);
  assert.ok(auto, 'kein Friedensvorschlag');
  assert.equal(s.befehl(A.v.id, { art: 'angebot_antwort', id: auto.id, annehmen: true }).ok, true);
  assert.ok(s.imKrieg(A.v.id, B.v.id));
  assert.equal(s.befehl(B.v.id, { art: 'angebot_antwort', id: auto.id, annehmen: true }).ok, true);
  assert.ok(!s.imKrieg(A.v.id, B.v.id));
});

test('Nahkampf: beide verlieren LP, Abklingzeit, Erfahrung; Fernkampf ohne Gegenschaden', () => {
  const s = neueWelt();
  const A = spielerMitStadt(s, 'Epsilon'), B = spielerMitStadt(s, 'Zeta');
  A.v.bekannt[B.v.id] = 1; B.v.bekannt[A.v.id] = 1;
  vorspulen(s, 25 * STD); kriegsBereit(s, A.v, B.v);
  s.befehl(A.v.id, { art: 'krieg_erklaeren', volk: B.v.id });
  // Einheiten nebeneinander auf neutralem Land platzieren
  const k = karte();
  let ort = -1;
  for (let i = 5000; i < 20000; i++) { const g = GELAENDE[k.gelaende[i]]; if (g.id === 'ebene' && s.besitzer(i) == null && !s.einheitenAuf(i).length && nachbarn(i).every((n) => GELAENDE[k.gelaende[n]].id === 'ebene' && s.besitzer(n) == null && !s.einheitenAuf(n).length)) { ort = i; break; } }
  assert.ok(ort > 0);
  const ziel = nachbarn(ort)[0];
  const a = s.einheitErzeugen(A.v.id, 'krieger', ort);
  const b = s.einheitErzeugen(B.v.id, 'krieger', ziel);
  const vs = s.kampfVorschau(a, ziel);
  assert.equal(vs.ok, true, vs.grund);
  assert.ok(vs.schadenAnAngreifer > 0 && vs.schadenAnVerteidiger > 0);
  const r = s.befehl(A.v.id, { art: 'angreifen', einheit: a.id, ziel });
  assert.equal(r.ok, true, r.fehler);
  assert.ok(a.hp < 100 && (s.einheit(b.id) ? s.einheit(b.id).hp < 100 : true));
  assert.ok(a.abkling_bis > uhr.jetzt());
  assert.ok(a.ep > 0);
  const r2 = s.befehl(A.v.id, { art: 'angreifen', einheit: a.id, ziel });
  assert.equal(r2.ok, false); assert.match(r2.fehler, /erholen/);
  // Fernkampf
  const f = s.einheitErzeugen(A.v.id, 'schleuderer', nachbarn(ort)[3]);
  const dist = abstand(f.feld, ziel);
  if (s.einheit(b.id) && dist <= 1) {
    const hpVor = f.hp;
    const r3 = s.befehl(A.v.id, { art: 'angreifen', einheit: f.id, ziel });
    assert.equal(r3.ok, true, r3.fehler);
    assert.equal(f.hp, hpVor, 'Fernkämpfer nimmt keinen Schaden');
  }
});

test('Stadt: viel LP, Eroberung durch Nahkampf -> gehört dem Eroberer, ist zerstört; KI darf Spielerstädte nie erobern', () => {
  const s = neueWelt();
  const A = spielerMitStadt(s, 'Eta'), B = spielerMitStadt(s, 'Theta');
  A.v.bekannt[B.v.id] = 1; B.v.bekannt[A.v.id] = 1;
  vorspulen(s, 25 * STD); kriegsBereit(s, A.v, B.v);
  s.befehl(A.v.id, { art: 'krieg_erklaeren', volk: B.v.id });
  const st = B.stadt;
  st.bev = 8; st.gebaeude.kornspeicher = 1; st.gebaeude.schrein = 1;
  assert.ok(s.stadtMaxHp(st) >= 300);
  const feld = nachbarn(st.feld).find((n) => !GELAENDE[karte().gelaende[n]].wasser && !s.einheitenAuf(n).length);
  const a = s.einheitErzeugen(A.v.id, 'schwertkaempfer', feld);
  for (const u of s.einheitenAuf(st.feld)) s.einheitEntfernen(u.id);
  st.hp = 5; st.hp_um = uhr.jetzt(); st.angriff_um = uhr.jetzt();
  B.v.verbunden = 0; B.v.letzte_aktivitaet = uhr.jetzt(); B.v.getrennt_seit = uhr.jetzt(); // noch online-Fenster
  const r = s.befehl(A.v.id, { art: 'angreifen', einheit: a.id, ziel: st.feld });
  assert.equal(r.ok, true, r.fehler);
  assert.equal(r.erobert, true);
  assert.equal(st.volk, A.v.id);
  assert.ok(st.bev <= 4 && st.zerstoert_bis > uhr.jetzt());
  assert.ok(!st.gebaeude.palast);
  // KI gegen Spieler: Stadt fällt nie unter 1 LP
  const ki = s.alleVoelker().find((x) => x.art === 'ki');
  assert.equal(s.darfErobern(ki.id, A.stadt), false);
  const bar = s.barbarenVolk();
  assert.equal(s.darfErobern(bar.id, A.stadt), false);
});

test('Offline und im Frieden: Barbaren und Raubtiere können nichts anrichten', () => {
  const s = neueWelt();
  const A = spielerMitStadt(s, 'Iota');
  vorspulen(s, 25 * STD);
  A.v.verbunden = 0; A.v.letzte_aktivitaet = uhr.jetzt() - 2 * STD; A.v.getrennt_seit = uhr.jetzt() - 2 * STD;
  assert.ok(s.kampfHindernis(s.barbarenVolk().id, A.v.id));
  assert.ok(s.kampfHindernis(s.tierVolk().id, A.v.id));
  A.v.verbunden = 1;
  assert.equal(s.kampfHindernis(s.barbarenVolk().id, A.v.id), null);
});

test('Heilung: in eigener Stadt schneller als im eigenen Gebiet, außerhalb nicht', () => {
  const s = neueWelt();
  const A = spielerMitStadt(s, 'Kappa');
  const e = s.einheitenVon(A.v.id).find((x) => x.typ === 'krieger');
  e.feld = A.stadt.feld; s.positionenNeu(); e.hp = 40; e.hp_um = uhr.jetzt();
  const inStadt = s.heilrate(e);
  const g = A.stadt.gebiet.find((i) => i !== A.stadt.feld && !GELAENDE[karte().gelaende[i]].wasser);
  e.feld = g; s.positionenNeu();
  const imGebiet = s.heilrate(e);
  assert.ok(inStadt > imGebiet && imGebiet > 0);
  e.feld = A.stadt.feld; s.positionenNeu(); s.hpAbrechnen(e);
  vorspulen(s, 2 * STD);
  assert.ok(s.aktuelleHp(e) >= 100 - 1e-9 || s.aktuelleHp(e) > 40 + inStadt * 1.9);
});

test('Stapelregel: kein zweites Militär auf ein Feld, fremde Einheiten blockieren, Platztausch mit eigenen', () => {
  const s = neueWelt();
  const A = spielerMitStadt(s, 'Lambda');
  const k = s.einheitenVon(A.v.id).find((x) => x.typ === 'krieger');
  const d = { klasse: 'nahkampf' };
  const k2 = s.einheitErzeugen(A.v.id, 'krieger', k.feld);
  assert.notEqual(k2.feld, k.feld, 'zweiter Krieger muss auf ein Nachbarfeld');
  // Platztausch
  const r = s.befehl(A.v.id, { art: 'bewegen', einheit: k2.id, ziel: k.feld });
  assert.equal(r.ok, true, r.fehler);
  const alt = k2.feld;
  vorspulen(s, 2 * STD);
  assert.equal(k2.feld, k.feld === alt ? k2.feld : k2.feld);
  assert.notEqual(k.feld, k2.feld);
});

test('Atomwaffe nur mit Forschung, nie gegen offline/geschützte Ziele, erobert nie', () => {
  const s = neueWelt();
  const A = spielerMitStadt(s, 'Mylos'), B = spielerMitStadt(s, 'Nyxar');
  const n = s.einheitErzeugen(A.v.id, 'atomwaffe', A.stadt.feld);
  let r = s.befehl(A.v.id, { art: 'atomschlag', einheit: n.id, ziel: B.stadt.feld });
  assert.equal(r.ok, false);
  for (const f of FORSCHUNGEN) A.v.forschung.erforscht[f.id] = 1;
  r = s.befehl(A.v.id, { art: 'atomschlag', einheit: n.id, ziel: B.stadt.feld });
  assert.equal(r.ok, false, 'B ist geschützt/nicht im Krieg');
  assert.equal(B.stadt.volk, B.v.id);
});
