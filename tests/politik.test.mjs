import { test } from 'node:test';
import assert from 'node:assert/strict';
import { neueWelt, spielerMitStadt } from './hilfen.mjs';
import { POLITIKEN, politikSchwelle, politikPlaetze } from '../public/shared/daten/politiken.js';

test('Politik-Schwellen steigen und schalten Plätze frei', () => {
  assert.equal(politikPlaetze(0, 0), 0);
  assert.equal(politikPlaetze(politikSchwelle(1), 0), 1);
  assert.equal(politikPlaetze(politikSchwelle(2) - 1, 1), 0);
  assert.equal(politikPlaetze(politikSchwelle(3), 1), 2);
  assert.ok(politikSchwelle(2) > politikSchwelle(1));
  assert.equal(new Set(POLITIKEN.map((p) => p.id)).size, POLITIKEN.length);
});

test('Politik wählen: braucht Kultur, wirkt als Bonus, nicht doppelt', () => {
  const s = neueWelt();
  const { v } = spielerMitStadt(s, 'Politiker');
  let r = s.befehl(v.id, { art: 'politik_waehlen', id: 'gelehrte' });
  assert.equal(r.ok, false, 'ohne Kultur kein Platz');
  v.kultur_gesamt = politikSchwelle(1);
  const vorher = s.boni(v).wissenschaft_prozent;
  r = s.befehl(v.id, { art: 'politik_waehlen', id: 'gelehrte' });
  assert.equal(r.ok, true, r.fehler);
  assert.equal(s.boni(v).wissenschaft_prozent, vorher + 10);
  assert.equal(s.befehl(v.id, { art: 'politik_waehlen', id: 'gelehrte' }).ok, false, 'nicht doppelt');
  assert.equal(s.befehl(v.id, { art: 'politik_waehlen', id: 'marktfreiheit' }).ok, false, 'zweiter Platz noch nicht frei');
  assert.equal(s.befehl(v.id, { art: 'politik_waehlen', id: 'gibtsnicht' }).ok, false);
  const a = s.ansichtFuer(v.id);
  assert.deepEqual(a.du.politiken, ['gelehrte']);
  assert.equal(a.du.politik_plaetze, 0);
});

test('KI wählt Politiken selbst', () => {
  const s = neueWelt();
  const ki = Object.values(s.z.voelker).find((x) => x.art === 'ki');
  ki.kultur_gesamt = politikSchwelle(3);
  s.kiPolitik(ki);
  assert.equal(ki.politiken.length, 3);
  assert.equal(new Set(ki.politiken).size, 3);
});
