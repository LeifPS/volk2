// Deterministischer Zufall und Rauschen.
// Wichtig: Nur exakte Arithmetik (+ - * / Math.floor Math.sqrt Math.imul), keine Math.sin/exp/pow,
// damit jede JS-Engine (V8 im Worker, Safari auf dem iPad, Firefox) bitgleich dieselbe Welt erzeugt.

export const WELT_SEED = 1337;

/** 32-Bit-Ganzzahl-Hash aus beliebig vielen Ganzzahlen. */
export function hash(...werte) {
  let h = 0x9e3779b9 ^ WELT_SEED;
  for (const w of werte) {
    h = Math.imul(h ^ (w | 0), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return h >>> 0;
}

/** Hash als Zahl in [0, 1). */
export function hash01(...werte) {
  return hash(...werte) / 4294967296;
}

/** Kleiner, schneller Zufallsgenerator (mulberry32) mit Startwert. */
export function zufallsquelle(start) {
  let a = start >>> 0;
  const f = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.ganz = (n) => Math.floor(f() * n);
  f.wahl = (liste) => liste[Math.floor(f() * liste.length)];
  f.zustand = () => a;
  return f;
}

function glatt(t) { return t * t * (3 - 2 * t); }

/** Wertrauschen (value noise) im Gitterabstand `gitter`, Ergebnis in [0,1). */
export function wertrauschen(x, y, gitter, kanal) {
  const gx = x / gitter, gy = y / gitter;
  const x0 = Math.floor(gx), y0 = Math.floor(gy);
  const fx = glatt(gx - x0), fy = glatt(gy - y0);
  const a = hash01(x0, y0, kanal), b = hash01(x0 + 1, y0, kanal);
  const c = hash01(x0, y0 + 1, kanal), d = hash01(x0 + 1, y0 + 1, kanal);
  const o = a + (b - a) * fx, u = c + (d - c) * fx;
  return o + (u - o) * fy;
}

/** Fraktales Rauschen aus mehreren Oktaven, Ergebnis ca. [0,1). */
export function fbm(x, y, gitter, oktaven, kanal) {
  let summe = 0, amp = 1, norm = 0, g = gitter;
  for (let i = 0; i < oktaven; i++) {
    summe += wertrauschen(x, y, g, kanal + i * 101) * amp;
    norm += amp;
    amp *= 0.5;
    g /= 2;
  }
  return summe / norm;
}
