// Hexfeld-Geometrie: Spitze oben, "odd-r"-Versatz (ungerade Zeilen um ein halbes Feld nach rechts).
// Feld-Index i = y * BREITE + x. Keine Umrundung der Karte (die Welt hat Ränder).

export const BREITE = 192;
export const HOEHE = 120;
export const ANZAHL = BREITE * HOEHE;

export const idx = (x, y) => y * BREITE + x;
export const xVon = (i) => i % BREITE;
export const yVon = (i) => (i / BREITE) | 0;
export const gueltig = (x, y) => x >= 0 && y >= 0 && x < BREITE && y < HOEHE;

// Nachbarn: Reihenfolge O, NO, NW, W, SW, SO
const GERADE = [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
const UNGERADE = [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]];

const NACHBAR_CACHE = new Int32Array(ANZAHL * 6);
for (let i = 0; i < ANZAHL; i++) {
  const x = i % BREITE, y = (i / BREITE) | 0;
  const t = y & 1 ? UNGERADE : GERADE;
  for (let r = 0; r < 6; r++) {
    const nx = x + t[r][0], ny = y + t[r][1];
    NACHBAR_CACHE[i * 6 + r] = gueltig(nx, ny) ? idx(nx, ny) : -1;
  }
}

/** Nachbar in Richtung r (0..5) oder -1. */
export function nachbar(i, r) { return NACHBAR_CACHE[i * 6 + r]; }

/** Alle gültigen Nachbarn als Array. */
export function nachbarn(i) {
  const a = [];
  for (let r = 0; r < 6; r++) { const n = NACHBAR_CACHE[i * 6 + r]; if (n >= 0) a.push(n); }
  return a;
}

function wuerfel(i) {
  const x = i % BREITE, y = (i / BREITE) | 0;
  const q = x - ((y - (y & 1)) >> 1);
  return [q, y, -q - y];
}

/** Hex-Abstand zwischen zwei Feldern. */
export function abstand(a, b) {
  const A = wuerfel(a), B = wuerfel(b);
  return Math.max(Math.abs(A[0] - B[0]), Math.abs(A[1] - B[1]), Math.abs(A[2] - B[2]));
}

/** Alle Felder mit Abstand <= radius (inkl. Mitte). */
export function umkreis(i, radius) {
  const erg = [];
  const x0 = i % BREITE, y0 = (i / BREITE) | 0;
  for (let dy = -radius; dy <= radius; dy++) {
    const y = y0 + dy;
    if (y < 0 || y >= HOEHE) continue;
    for (let dx = -radius - 1; dx <= radius + 1; dx++) {
      const x = x0 + dx;
      if (x < 0 || x >= BREITE) continue;
      const j = idx(x, y);
      if (abstand(i, j) <= radius) erg.push(j);
    }
  }
  return erg;
}

/** Felder mit genau Abstand radius. */
export function ring(i, radius) {
  return umkreis(i, radius).filter((j) => abstand(i, j) === radius);
}

// --- Darstellung (Perspektive B: leicht schräg mit Höhe) ---
export const STAUCHUNG = 0.72;
export const WURZEL3 = Math.sqrt(3);

/** Mittelpunkt eines Feldes in Weltpixeln bei Hex-Radius R (vor Kamera). */
export function feldMitte(i, R) {
  const x = i % BREITE, y = (i / BREITE) | 0;
  return [WURZEL3 * R * (x + (y & 1) * 0.5) + WURZEL3 * R / 2, (R + y * 1.5 * R) * STAUCHUNG];
}

/** Feld unter einem Weltpixel (ohne Höhenkorrektur) oder -1. */
export function feldBeiPixel(px, py, R) {
  const x = px - WURZEL3 * R / 2;
  const y = py / STAUCHUNG - R;
  const q = (WURZEL3 / 3 * x - y / 3) / R;
  const r = (2 / 3 * y) / R;
  // Würfelrundung
  let rx = Math.round(q), rz = Math.round(r), ry = Math.round(-q - r);
  const dx = Math.abs(rx - q), dz = Math.abs(rz - r), dyy = Math.abs(ry - (-q - r));
  if (dx > dyy && dx > dz) rx = -ry - rz; else if (dyy <= dz) rz = -rx - ry;
  const zeile = rz, spalte = rx + ((rz - (rz & 1)) >> 1);
  return gueltig(spalte, zeile) ? idx(spalte, zeile) : -1;
}
