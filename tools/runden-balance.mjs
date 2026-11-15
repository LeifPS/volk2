// Runden-Balance: Wie viele Runden brauchen typische Dinge je Spieltempo? (npm run balance:runden)
import { Spiel, leererZustand } from '../public/shared/engine/spiel.js';
import { SPIELTEMPO } from '../public/shared/regeln.js';

const T0 = Date.UTC(2026, 0, 5, 12);
function lauf(tempo) {
  const s = new Spiel(leererZustand(T0)); s.t = T0;
  s.partieStarten({ spieler: [{ konto: 'a', name: 'Anna', farbe: '#1010f0' }], ki: [{ stufe: 'normal' }], stadtstaaten: 2, tempo }, T0);
  const v = s.alleVoelker().find((x) => x.konto);
  const sied = s.einheitenVon(v.id).find((e) => e.typ === 'siedler');
  s.befehl(v.id, { art: 'stadt_gruenden', einheit: sied.id });
  const st = s.staedteVon(v.id)[0];
  const erg = { tempo, krieger: null, arbeiter: null, forschung: null, wachstum3: null, zeitalter1: null };
  const bauKrieger = s.befehl(v.id, { art: 'bauen', stadt: st.id, typ: 'einheit', id: 'krieger' });
  const erstForschung = Object.keys(s.z.global.forschungOptionen || {})[0];
  const fo = s.befehl(v.id, { art: 'forschen', id: 'ackerbau' });
  const start = s.z.global.partie.runde;
  const n0 = s.einheitenVon(v.id).filter((e) => e.typ === 'krieger').length;
  for (let i = 0; i < 400 && s.z.global.partie.laeuft !== false; i++) {
    s.befehl(v.id, { art: 'zug_beenden' }, T0 + i * 60000);
    const r = s.z.global.partie.runde - start;
    const stadt = s.staedteVon(v.id)[0];
    if (!erg.krieger && s.einheitenVon(v.id).filter((e) => e.typ === 'krieger').length > n0) erg.krieger = r;
    if (!erg.forschung && s.z.voelker[v.id].forschung?.erforscht?.ackerbau) erg.forschung = r;
    if (!erg.wachstum3 && stadt && stadt.einwohner >= 3) erg.wachstum3 = r;
    if (erg.krieger && erg.forschung && erg.wachstum3) break;
  }
  return { ...erg, bauOk: bauKrieger.ok, foOk: fo.ok, foFehler: fo.fehler };
}
for (const t of Object.keys(SPIELTEMPO)) console.log(JSON.stringify(lauf(t)));
