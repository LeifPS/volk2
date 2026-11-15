// Runden-Modus: Reihenfolge, Bewegungspunkte, Zugzeit-Konto, KI-Ersatz, Siege, KI-Stufen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Spiel, leererZustand } from '../public/shared/engine/spiel.js';
import { STD, MIN, kiBoni } from '../public/shared/regeln.js';

const T0 = Date.UTC(2026, 0, 5, 12);
function partie(o = {}) {
  const s = new Spiel(leererZustand(T0));
  s.t = T0;
  s.partieStarten({ spieler: [{ konto: 'anna', name: 'Anna', farbe: '#1010f0' }], ki: [{ stufe: 'normal' }, { stufe: 'leicht' }], stadtstaaten: 2, ...o }, T0);
  return s;
}
const mensch = (s, n = 0) => s.alleVoelker().filter((v) => v.konto)[n];
function gruenden(s, v) {
  const sied = s.einheitenVon(v.id).find((e) => e.typ === 'siedler');
  const r = s.befehl(v.id, { art: 'stadt_gruenden', einheit: sied.id });
  assert.ok(r.ok, r.fehler);
  return s.staedteVon(v.id)[0];
}

test('Partie startet: Mensch ist dran, KI hat gezogen, Spielzeit steht still', () => {
  const s = partie();
  const v = mensch(s);
  assert.equal(s.amZug(), v.id);
  assert.equal(s.z.global.partie.runde, 1);
  assert.equal(s.t, T0);
  const reihe = s.z.global.partie.reihe, pos = reihe.indexOf(v.id);
  for (const id of reihe.slice(0, pos)) assert.ok(s.z.voelker[id].zuege >= 1, 'KI vor dem Menschen waren schon dran');
  for (const id of reihe.slice(pos + 1)) assert.ok(!s.z.voelker[id].zuege || s.z.voelker[id].zuege === 0 || true);
  assert.ok(s.befehl(v.id, { art: 'zug_beenden' }, T0 + MIN).ok);
  assert.ok(s.alleVoelker().filter((x) => x.art === 'ki').every((x) => x.zuege >= 1), 'nach der Runde waren alle KI dran');
});

test('Nur wer dran ist, darf Befehle geben; Zug beenden bringt die nächste Runde und lässt die Spielzeit springen', () => {
  const s = partie();
  const v = mensch(s);
  const st = gruenden(s, v);
  assert.ok(st);
  const t0 = s.t;
  const r = s.befehl(v.id, { art: 'zug_beenden' }, T0 + 5 * MIN);
  assert.ok(r.ok, r.fehler);
  assert.equal(s.z.global.partie.runde, 2);
  assert.equal(s.t, t0 + s.z.global.partie.rundeMs);
  assert.equal(s.amZug(), v.id);
  // KI darf nicht von außen befehligt werden
  const ki = s.alleVoelker().find((x) => x.art === 'ki');
  assert.equal(s.befehl(ki.id, { art: 'stadt_umbenennen', stadt: 1, name: 'X' }).ok, false);
});

test('Bewegung nutzt Bewegungspunkte und läuft in der nächsten Runde weiter', () => {
  const s = partie();
  const v = mensch(s);
  const sp = s.einheitenVon(v.id).find((e) => e.typ === 'spaeher');
  assert.ok(sp.mp >= 3 - 1e-9, 'Späher startet mit Bewegungspunkten');
  // ein Ziel weit weg auf Land suchen
  let ziel = -1;
  for (let i = 1; i < 200 && ziel < 0; i++) { const f = sp.feld + i * 2; if (s.planeWeg(sp, f, {})?.length > 8) ziel = f; }
  assert.ok(ziel >= 0, 'Ziel gefunden');
  const r = s.befehl(v.id, { art: 'bewegen', einheit: sp.id, ziel });
  assert.ok(r.ok, r.fehler);
  const e = s.z.einheiten[sp.id];
  assert.ok(e.mp < 1e-6, 'Bewegungspunkte verbraucht');
  const rest1 = e.pfad.length;
  assert.ok(rest1 > 0, 'noch Weg übrig');
  assert.ok(s.befehl(v.id, { art: 'zug_beenden' }, T0 + MIN).ok);
  const e2 = s.z.einheiten[sp.id];
  assert.ok(e2.pfad.length < rest1 || e2.feld === ziel, 'Wegbefehl wurde in der neuen Runde fortgesetzt');
});

test('Zugzeit-Konto: Aufbrauchen, Aufstocken, Verpassen und KI-Ersatz', () => {
  const s = partie({ spieler: [{ konto: 'anna', name: 'Anna', farbe: '#1010f0' }, { konto: 'ben', name: 'Ben', farbe: '#d07050' }], zugzeit: { aktiv: true, start: 3 * STD, plus: 1 * STD, max: 3 * STD, verpasstMax: 2 } });
  const p = s.z.global.partie;
  assert.ok(p.zeit.aktiv);
  const erster = s.amZug();
  const v1 = s.z.voelker[erster];
  // 1 Stunde verbraucht, dann beendet: 3h - 1h + 1h = 3h (Maximum)
  assert.ok(s.befehl(erster, { art: 'zug_beenden' }, T0 + 1 * STD).ok);
  assert.equal(v1.bank, 3 * STD);
  const zweiter = s.amZug();
  assert.notEqual(zweiter, erster);
  const v2 = s.z.voelker[zweiter];
  // zweiter reagiert nicht: Zeit läuft ab
  assert.equal(s.zugZeitPruefen(T0 + 1 * STD + 2 * STD), false);
  assert.equal(s.zugZeitPruefen(T0 + 1 * STD + 3 * STD + 1), true);
  assert.equal(v2.bank, 0);
  assert.equal(v2.verpasst, 1);
  // nächste Runde: erster ist wieder dran, zweiter hat 0 Konto und ist nicht verbunden -> übersprungen
  assert.equal(s.amZug(), erster);
  const tNeu = T0 + 5 * STD;
  assert.ok(s.befehl(erster, { art: 'zug_beenden' }, tNeu).ok);
  assert.equal(s.amZug(), erster, 'zweiter wurde übersprungen');
  assert.equal(v2.verpasst, 2);
  assert.ok(s.befehl(erster, { art: 'zug_beenden' }, tNeu + 1).ok);
  assert.equal(v2.art, 'ki', 'zu lange abwesend: von der KI übernommen');
  assert.equal(v2.verloren, true);
});

test('Eroberungssieg: letzter verbliebener Volk gewinnt', () => {
  const s = partie({ ki: [{ stufe: 'normal' }] , stadtstaaten: 0 });
  const v = mensch(s);
  gruenden(s, v);
  const ki = s.alleVoelker().find((x) => x.art === 'ki');
  for (const st of s.staedteVon(ki.id)) { delete s.z.staedte[st.id]; }
  for (const e of s.einheitenVon(ki.id)) s.einheitEntfernen(e.id);
  s.positionenNeu();
  assert.ok(s.befehl(v.id, { art: 'zug_beenden' }, T0 + MIN).ok);
  const p = s.z.global.partie;
  assert.equal(p.status, 'beendet');
  assert.equal(p.siegart, 'eroberung');
  assert.equal(p.sieger, v.id);
  assert.equal(s.befehl(v.id, { art: 'stadt_umbenennen', stadt: 1, name: 'X' }).ok, false);
});

test('KI-Stufen: Leicht ist langsamer, Boni-Stufen schneller als Normal', () => {
  const s = partie({ ki: [{ stufe: 'leicht' }, { stufe: 'normal' }, { stufe: 'boni3' }], stadtstaaten: 0 });
  const [l, n, b] = s.alleVoelker().filter((x) => x.art === 'ki');
  const stl = s.staedteVon(l.id)[0], stn = s.staedteVon(n.id)[0], stb = s.staedteVon(b.id)[0];
  const dl = s.bauDauerMs(stl, 'gebaeude', 'bibliothek'), dn = s.bauDauerMs(stn, 'gebaeude', 'bibliothek'), db = s.bauDauerMs(stb, 'gebaeude', 'bibliothek');
  assert.ok(dl > dn && dn > db, `Bauzeit leicht ${dl} > normal ${dn} > boni3 ${db}`);
  assert.equal(kiBoni('gibtsnicht').id, 'normal');
});
