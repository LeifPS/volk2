import test from 'node:test';
import assert from 'node:assert/strict';
import { uhr, neueWelt, spielerMitStadt, vorspulen, STD, MIN, TAG, Spiel } from './hilfen.mjs';
import { karte } from '../public/shared/karte.js';
import { GELAENDE } from '../public/shared/daten/gelaende.js';
import { nachbarn, abstand, BREITE } from '../public/shared/hex.js';
import { sucheWeg } from '../public/shared/pfad.js';
import { schrittDauer } from '../public/shared/regeln.js';

test('Bau, Forschung, Marsch, Wachstum laufen mit simulierter Uhr in richtiger Reihenfolge', () => {
  const s = neueWelt();
  const { v, stadt } = spielerMitStadt(s, 'Zeitvolk');
  let r = s.befehl(v.id, { art: 'bauen', stadt: stadt.id, typ: 'einheit', id: 'krieger' });
  assert.equal(r.ok, true, r.fehler);
  const fertig = stadt.bau[0].fertig_um;
  assert.ok(fertig > uhr.jetzt());
  r = s.befehl(v.id, { art: 'forschen', id: 'ackerbau' });
  assert.equal(r.ok, true, r.fehler);
  const forschFertig = s.forschungsZeit(v);
  const sp = s.einheitenVon(v.id).find((e) => e.typ === 'spaeher');
  const ziel = stadt.gebiet.find((i) => i !== stadt.feld && abstand(i, sp.feld) >= 1 && !GELAENDE[karte().gelaende[i]].wasser && s.platzFrei(v.id, { klasse: 'spaeher' }, i));
  r = s.befehl(v.id, { art: 'bewegen', einheit: sp.id, ziel });
  assert.equal(r.ok, true, r.fehler);
  const ankunft = r.ankunft;
  // knapp vor dem Bauende: noch nichts fertig
  vorspulen(s, fertig - uhr.jetzt() - 1000);
  assert.equal(s.einheitenVon(v.id).filter((e) => e.typ === 'krieger').length, 1);
  vorspulen(s, 2000);
  assert.equal(s.einheitenVon(v.id).filter((e) => e.typ === 'krieger').length, 2);
  vorspulen(s, Math.max(ankunft, forschFertig) - uhr.jetzt() + 1000);
  assert.equal(sp.feld, ziel);
  assert.ok(v.forschung.erforscht.ackerbau);
  // Wachstum über Stunden
  const bev = stadt.bev;
  vorspulen(s, 12 * STD);
  assert.ok(stadt.bev > bev, 'Stadt sollte gewachsen sein');
  assert.ok(!(s.z.global.fehler || []).length, JSON.stringify(s.z.global.fehler));
});

test('Neustart (Speichern und Laden) ändert nichts am Ablauf', () => {
  const s = neueWelt();
  const { v, stadt } = spielerMitStadt(s, 'Ruhevolk');
  s.befehl(v.id, { art: 'bauen', stadt: stadt.id, typ: 'gebaeude', id: 'kornspeicher', vormerken: true });
  s.befehl(v.id, { art: 'forschen', id: 'toepferei' });
  vorspulen(s, 30 * MIN);
  const kopie = new Spiel(JSON.parse(JSON.stringify(s.z)));
  for (const vid of Object.keys(s.z.voelker)) { kopie.z.nebel = kopie.z.nebel || {}; kopie.z.nebel[vid] = s.nebelText(+vid); }
  vorspulen(s, 30 * STD);
  kopie.verarbeite(uhr.jetzt());
  const a = s.z.voelker[v.id], b = kopie.z.voelker[v.id];
  assert.equal(Math.round(a.gold), Math.round(b.gold));
  assert.deepEqual(Object.keys(a.forschung.erforscht).sort(), Object.keys(b.forschung.erforscht).sort());
  assert.equal(s.z.staedte[stadt.id].bev, kopie.z.staedte[stadt.id].bev);
  assert.deepEqual(Object.keys(s.z.staedte[stadt.id].gebaeude).sort(), Object.keys(kopie.z.staedte[stadt.id].gebaeude).sort());
});

test('Abklingzeit endet zur richtigen Zeit; nächstes Ereignis ist korrekt', () => {
  const s = neueWelt();
  const { v, stadt } = spielerMitStadt(s, 'Alarmvolk');
  s.befehl(v.id, { art: 'bauen', stadt: stadt.id, typ: 'einheit', id: 'krieger' });
  const n = s.naechsteZeit();
  assert.ok(n > uhr.jetzt() && n <= stadt.bau[0].fertig_um);
});

test('Weltquerung: Antike-Infanterie braucht etwa 8 bis 16 Stunden', () => {
  const k = karte();
  // längster Landweg innerhalb des größten Kontinents von West nach Ost
  const groesste = k.landmasseGroesse.indexOf(Math.max(...k.landmasseGroesse));
  let west = -1, ost = -1;
  for (let i = 0; i < k.gelaende.length; i++) if (k.landmasse[i] === groesste && GELAENDE[k.gelaende[i]].hoehe < 3) { const x = i % BREITE; if (west < 0 || x < west % BREITE) west = i; if (ost < 0 || x > ost % BREITE) ost = i; }
  const w = sucheWeg(west, ost, (a, b) => { const g = GELAENDE[k.gelaende[b]]; return g.wasser ? Infinity : g.bewegung; }, { minKosten: 1, maxKnoten: 100000 });
  assert.ok(w);
  const ms = w.kosten.reduce((s, c) => s + schrittDauer(c, 2), 0);
  // ganze Weltbreite hochrechnen
  const breite = Math.abs((ost % BREITE) - (west % BREITE));
  const welt = ms / breite * BREITE / STD;
  assert.ok(welt >= 8 && welt <= 16, `Querung der Welt ~${welt.toFixed(1)} h`);
});

test('Viele gleichzeitige Befehle und Ereignisse über eine simulierte Woche ohne Fehler', () => {
  const s = neueWelt();
  const sp = [spielerMitStadt(s, 'Wochenvolk'), spielerMitStadt(s, 'Tagesvolk')];
  for (const { v, stadt } of sp) {
    s.befehl(v.id, { art: 'forschung_schlange', ids: ['ackerbau', 'toepferei', 'bergbau', 'tierzucht', 'schrift'] });
    s.befehl(v.id, { art: 'bauen', stadt: stadt.id, typ: 'einheit', id: 'arbeiter', vormerken: true });
    s.befehl(v.id, { art: 'bauen', stadt: stadt.id, typ: 'einheit', id: 'krieger', vormerken: true });
    for (const e of s.einheitenVon(v.id)) if (e.typ === 'spaeher') s.befehl(v.id, { art: 'modus', einheit: e.id, modus: 'erkunden' });
  }
  for (let h = 0; h < 7 * 24; h++) {
    vorspulen(s, STD);
    for (const { v } of sp) for (const e of s.einheitenVon(v.id)) if (e.typ === 'arbeiter' && e.modus !== 'auto_arbeit') s.befehl(v.id, { art: 'modus', einheit: e.id, modus: 'auto_arbeit' });
  }
  assert.ok(!(s.z.global.fehler || []).length, JSON.stringify(s.z.global.fehler));
  for (const { v } of sp) assert.ok(Object.keys(v.forschung.erforscht).length >= 6);
});
