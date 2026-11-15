// Gemeinsame Testhilfen: simulierte Uhr, frische Welt, Speicher- und Socket-Attrappen für den Server.
import { simulierteUhr } from '../public/shared/uhr.js';
export const STD = 3600e3, MIN = 60e3, TAG = 24 * STD;
export const uhr = simulierteUhr(Date.UTC(2026, 0, 5, 12));
const { Spiel, leererZustand } = await import('../public/shared/engine/spiel.js');
export { Spiel, leererZustand };

/** Neue Welt mit initialisierten Akteuren. */
export function neueWelt() {
  const s = new Spiel(leererZustand(uhr.jetzt()));
  s.t = uhr.jetzt();
  s.weltInitialisieren();
  return s;
}
let farbNr = 0;
const FARBEN = ['#1010f0', '#ffffff', '#d010f0', '#10b0f0', '#d07050', '#909030', '#50b090', '#303090'];
/** Spieler mit erster Stadt. */
export function spielerMitStadt(s, name = 'Spieler' + (++farbNr)) {
  const v = s.neuesSpielerVolk(name.toLowerCase(), name, FARBEN.find((f) => !s.farbeFehler(f)));
  const sied = s.einheitenVon(v.id).find((e) => e.typ === 'siedler');
  const r = s.befehl(v.id, { art: 'stadt_gruenden', einheit: sied.id });
  if (!r.ok) throw new Error(r.fehler);
  return { v, stadt: s.z.staedte[r.stadt] };
}
export function vorspulen(s, ms) { uhr.vorspulen(ms); s.verarbeite(uhr.jetzt()); }
export function allesErforschen(s, v, bisZeitalter = 6) {
  s.aendern(v.id);
  for (const f of Object.values(s.constructor.prototype.forschungsName ? globalThis.__FORSCHUNG || {} : {})) void f;
}
/** Speicher-Attrappe für WeltServer. */
export function speicherAttrappe(start = new Map()) {
  const m = new Map(start);
  return { m, alle: () => new Map(m), schreibe: (z) => { for (const [k, v] of z) { if (v == null) m.delete(k); else m.set(k, v); } }, geschrieben: () => m.size };
}
/** Socket-Attrappe. */
export function socketAttrappe() {
  const liste = [];
  const api = {
    liste,
    alle: () => liste,
    sende: (ws, text) => ws.empfangen.push(JSON.parse(text)),
    info: (ws) => ws.info,
    setzeInfo: (ws, i) => { ws.info = i; },
    neu: (info) => { const ws = { info, empfangen: [] }; liste.push(ws); return ws; },
    weg: (ws) => liste.splice(liste.indexOf(ws), 1),
  };
  return api;
}
