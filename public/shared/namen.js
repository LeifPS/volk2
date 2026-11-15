// Prüfungen für Volksnamen und -farben (ohne Engine-Abhängigkeiten, auch im Client nutzbar).
const UNFUG = ['arsch', 'fick', 'fotze', 'hitler', 'nazi', 'scheiss', 'scheiß', 'hure', 'wichser', 'nigger', 'neger', 'schwuchtel', 'penis', 'vagina', 'porno', 'admin', 'barbaren', 'tiere', 'system'];

function rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
/** Wahrgenommener Farbabstand (gewichtetes RGB, "redmean"). */
export function farbAbstand(a, b) {
  const [r1, g1, b1] = rgb(a), [r2, g2, b2] = rgb(b);
  const rm = (r1 + r2) / 2, dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db);
}
export const FARB_VORSCHLAEGE = ['#1010f0', '#ffffff', '#d010f0', '#10b0f0', '#d07050', '#909030', '#50b090', '#303090', '#70b0f0', '#907090', '#107070', '#d0d0b0', '#90f070', '#30f050', '#307010', '#10b010'];
export const FARB_MINDESTABSTAND = 100;

/** Prüft einen Volksnamen. Liefert Fehlertext oder null. */
export function volksnameFehler(name) {
  if (typeof name !== 'string') return 'Bitte gib einen Volksnamen ein.';
  const n = name.trim();
  if (n.length < 3 || n.length > 24) return 'Der Volksname muss 3 bis 24 Zeichen lang sein.';
  if (!/^[\p{L}\p{N}][\p{L}\p{N} '\-.]*$/u.test(n)) return 'Erlaubt sind Buchstaben, Ziffern, Leerzeichen, Bindestrich, Apostroph und Punkt.';
  const k = n.toLowerCase().replace(/[^a-zäöüß]/g, '');
  if (UNFUG.some((w) => k.includes(w))) return 'Dieser Name ist nicht erlaubt. Bitte wähle einen anderen.';
  return null;
}

