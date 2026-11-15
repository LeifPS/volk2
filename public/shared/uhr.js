// Die einzige Zeitquelle des Spiels. Alles, was "jetzt" wissen muss, fragt jetzt().
// Tests setzen eine simulierte Uhr (setzeUhr), der Server eine echte (ggf. lokal beschleunigte), der Client eine mit Server-Abgleich.
let quelle = () => Date.now();

/** Aktuelle Spielzeit in Millisekunden. */
export function jetzt() { return quelle(); }

/** Ersetzt die Zeitquelle (Tests, Test-Zeitregler, Client-Abgleich). */
export function setzeUhr(f) { quelle = f; }

/** Simulierte Uhr für Tests: start in ms, vorspulen(ms). */
export function simulierteUhr(start = Date.UTC(2026, 0, 1)) {
  let t = start;
  const u = { jetzt: () => t, vorspulen: (ms) => { t += ms; return t; }, setze: (x) => { t = x; } };
  setzeUhr(u.jetzt);
  return u;
}
