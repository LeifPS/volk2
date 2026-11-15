// Balance-Simulation: Ein guter Bot-Spieler spielt mehrere Wochen in simulierter Zeit in einer vollen Welt (KI, Stadtstaaten, Barbaren).
// Prüft die Zielwerte für die Zeitalter (Antike ~1 Tag ... Atomzeit ~5 Tage, ganzer Baum in 2-4 Wochen), den Unterhalt und die Stabilität.
// Aufruf: node tools/balance-sim.mjs [tage=32] [--still]
import { simulierteUhr } from '../public/shared/uhr.js';
const uhr = simulierteUhr(Date.UTC(2026, 2, 1, 8));
const { Spiel, leererZustand } = await import('../public/shared/engine/spiel.js');
const { FORSCHUNGEN } = await import('../public/shared/daten/index.js');
const { ZEITALTER } = await import('../public/shared/daten/zeitalter.js');
const { botMachen, botErweitern } = await import('./bot.mjs');
botErweitern(Spiel);

const TAGE = +(process.argv[2] || 32);
const still = process.argv.includes('--still');
const STD = 3600e3, TAG = 24 * STD;
const ZIEL_TAGE = [1, 2, 3, 3, 4, 6, 5]; // effektive Tage je Zeitalter (Auftrag)

const s = new Spiel(leererZustand(uhr.jetzt()));
s.t = uhr.jetzt();
s.weltInitialisieren();
const v = s.neuesSpielerVolk('bot', 'Balancevolk', '#ffffff');
const sied = s.einheitenVon(v.id).find((e) => e.typ === 'siedler');
s.befehl(v.id, { art: 'stadt_gruenden', einheit: sied.id });
botMachen(s, v, 'forscher');
const start = uhr.jetzt();
const zeitalterAb = [0];
let minGold = Infinity, maxUnterhaltAnteil = 0, protokoll = [];
for (let h = 1; h <= TAGE * 24; h++) {
  uhr.vorspulen(STD);
  s.verarbeite(uhr.jetzt());
  const z = v.zeitalter || 0;
  while (zeitalterAb.length <= z) zeitalterAb.push(h / 24);
  const r = s.raten(v.id);
  const unterhalt = r.unterhalt.einheiten + r.unterhalt.gebaeude;
  if (h > 24) { minGold = Math.min(minGold, v.gold); maxUnterhaltAnteil = Math.max(maxUnterhaltAnteil, unterhalt / Math.max(1, r.einnahmen)); }
  if (h % 24 === 0) protokoll.push({ tag: h / 24, zeitalter: ZEITALTER[z].name, forschungen: s.forschungsAnzahl(v), wissenschaft: Math.round(r.wissenschaft), staedte: s.staedteVon(v.id).length, bev: s.staedteVon(v.id).reduce((a, x) => a + x.bev, 0), gold: Math.round(v.gold), netto: Math.round(r.gold), unterhalt: Math.round(unterhalt), einheiten: s.einheitenVon(v.id).length });
  if (s.forschungsAnzahl(v) >= FORSCHUNGEN.filter((f) => !f.wiederholbar).length && zeitalterAb.length === 7) { if (!protokoll.fertig) protokoll.fertig = h / 24; }
}
const ergebnisse = [];
for (let z = 0; z < 7; z++) {
  const von = zeitalterAb[z], bis = zeitalterAb[z + 1] ?? (protokoll.fertig || null);
  ergebnisse.push({ zeitalter: ZEITALTER[z].name, start_tag: von?.toFixed(1), dauer_tage: bis != null && von != null ? +(bis - von).toFixed(1) : null, ziel: ZIEL_TAGE[z] });
}
const fehler = s.z.global.fehler || [];
if (!still) {
  console.table(protokoll.filter((p, i) => i % 2 === 0 || i === protokoll.length - 1));
  console.table(ergebnisse);
}
const nichtWiederholbar = FORSCHUNGEN.filter((f) => !f.wiederholbar).length;
const fertig = s.forschungsAnzahl(v) >= nichtWiederholbar ? protokoll.fertig : null;
const bericht = {
  tage: TAGE, forschungen: s.forschungsAnzahl(v), von: nichtWiederholbar, ganzerBaumNachTagen: fertig,
  zeitalterBeginn: zeitalterAb.map((x) => +x.toFixed(2)), ergebnisse, minGold: Math.round(minGold), maxUnterhaltAnteil: +maxUnterhaltAnteil.toFixed(2), engineFehler: fehler.length,
  ki: s.alleVoelker().filter((x) => x.art === 'ki').map((x) => ({ name: x.name, staedte: s.staedteVon(x.id).length, zeitalter: x.zeitalter })),
};
console.log(JSON.stringify(bericht, null, still ? 0 : 2));
if (fehler.length && !still) console.log(fehler.slice(0, 5));
export default bericht;
