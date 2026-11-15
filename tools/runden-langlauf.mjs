// Langlauf: ein untätiger Mensch + KI-Völker spielen N Runden. Prüft Fehler, Rechenzeit und KI-Entwicklung. (node tools/runden-langlauf.mjs [runden] [stufe])
import { Spiel, leererZustand } from '../public/shared/engine/spiel.js';
const N = +process.argv[2] || 150, stufe = process.argv[3] || 'normal';
const T0 = Date.UTC(2026, 0, 5, 12);
const s = new Spiel(leererZustand(T0)); s.t = T0;
s.partieStarten({ spieler: [{ konto: 'a', name: 'Anna', farbe: '#1010f0' }], ki: [{ stufe }, { stufe }, { stufe }, { stufe }], stadtstaaten: 4, rundenlimit: 0 }, T0);
const v = s.alleVoelker().find((x) => x.konto);
const sied = s.einheitenVon(v.id).find((e) => e.typ === 'siedler');
s.befehl(v.id, { art: 'stadt_gruenden', einheit: sied.id });
const t = Date.now(); let fehler = 0;
for (let i = 1; i <= N; i++) {
  try { s.befehl(v.id, { art: 'zug_beenden' }, T0 + i * 1000); } catch (e) { fehler++; if (fehler < 3) console.log('FEHLER Runde', i, e.stack.split('\n').slice(0, 3).join(' | ')); }
  if (i % 50 === 0 || i === N) {
    const ki = s.alleVoelker().filter((x) => x.art === 'ki');
    console.log(`Runde ${s.z.global.partie.runde}: ${((Date.now() - t) / 1000).toFixed(1)} s, KI-Städte ${ki.map((k) => s.staedteVon(k.id).length).join('/')}, KI-Einheiten ${ki.map((k) => s.einheitenVon(k.id).length).join('/')}, KI erforscht ${ki.map((k) => Object.keys(k.forschung?.erforscht || {}).length).join('/')}, Mensch-Städte ${s.staedteVon(v.id).length}, ${s.z.global.partie.ende ? 'ENDE: ' + JSON.stringify(s.z.global.partie.ende) : 'läuft'}`);
  }
  if (s.z.global.partie.ende) break;
}
console.log('Fehler:', fehler);
