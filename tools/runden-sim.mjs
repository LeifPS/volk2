// Runden-Simulation: Ein guter Bot-Spieler (wie in balance-sim) in einer Partie, gemessen in Runden.
// Aufruf: node tools/runden-sim.mjs [runden=700] [tempo=normal]
import { Spiel, leererZustand } from '../public/shared/engine/spiel.js';
import { botMachen, botErweitern } from './bot.mjs';
import { FORSCHUNGEN } from '../public/shared/daten/index.js';
import { RUNDEN_DAUER } from '../public/shared/regeln.js';
botErweitern(Spiel);
const N = +process.argv[2] || 700, tempo = process.argv[3] || 'normal';
if (process.env.RA) RUNDEN_DAUER.a = +process.env.RA; if (process.env.RB) RUNDEN_DAUER.b = +process.env.RB;
const T0 = Date.UTC(2026, 0, 5, 12);
const s = new Spiel(leererZustand(T0)); s.t = T0;
s.partieStarten({ spieler: [{ konto: 'a', name: 'Anna', farbe: '#1010f0' }], ki: [{ stufe: 'normal' }, { stufe: 'normal' }], stadtstaaten: 4, tempo, rundenlimit: 0, siege: { eroberung: false, wissenschaft: false, punkte: false } }, T0);
const v = s.alleVoelker().find((x) => x.konto);
s.befehl(v.id, { art: 'stadt_gruenden', einheit: s.einheitenVon(v.id).find((e) => e.typ === 'siedler').id }, T0);
botMachen(s, v, 'forscher');
const gesamt = FORSCHUNGEN.length; const zeit = {};
let fusion = null, echt = T0;
for (let i = 1; i <= N; i++) {
  s.kiDenken(v.id); s.botExtras(v);
  echt += 1000; s.befehl(v.id, { art: 'zug_beenden' }, echt);
  const n = Object.keys(v.forschung.erforscht).length;
  const z = Math.max(...Object.keys(v.forschung.erforscht).map((id) => FORSCHUNGEN.find((f) => f.id === id)?.zeitalter ?? 0));
  if (zeit[z] == null) zeit[z] = s.z.global.partie.runde;
  if (!fusion && v.forschung.erforscht.fusionsforschung) fusion = s.z.global.partie.runde;
  if (i % 100 === 0) console.log(`Runde ${s.z.global.partie.runde}: erforscht ${n}/${gesamt}, Städte ${s.staedteVon(v.id).length}, Gold ${Math.round(v.gold)}`);
  if (n >= gesamt) { console.log('Alles erforscht in Runde', s.z.global.partie.runde); break; }
}
console.log('Zeitalter erreicht in Runde:', JSON.stringify(zeit), '| Fusionsforschung:', fusion);
