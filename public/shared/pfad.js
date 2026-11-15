// A*-Wegsuche auf der Hexkarte. Wird vom Server (Wahrheit) und vom Client (Vorschau/Ankunftszeit) genutzt.
import { ANZAHL, abstand, nachbar } from './hex.js';

class Halde {
  constructor() { this.k = []; this.p = []; }
  get leer() { return this.k.length === 0; }
  rein(k, p) {
    const K = this.k, P = this.p; let i = K.length; K.push(k); P.push(p);
    while (i > 0) { const e = (i - 1) >> 1; if (P[e] <= p) break; K[i] = K[e]; P[i] = P[e]; i = e; }
    K[i] = k; P[i] = p;
  }
  raus() {
    const K = this.k, P = this.p, top = K[0], lk = K.pop(), lp = P.pop(), n = K.length;
    if (n) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1; if (c >= n) break;
        if (c + 1 < n && P[c + 1] < P[c]) c++;
        if (P[c] >= lp) break;
        K[i] = K[c]; P[i] = P[c]; i = c;
      }
      K[i] = lk; P[i] = lp;
    }
    return top;
  }
}

const G = new Float64Array(ANZAHL);
const VON = new Int32Array(ANZAHL);
const STEMPEL = new Uint32Array(ANZAHL);
let stempel = 0;

/**
 * Sucht den günstigsten Weg.
 * @param {number} start Startfeld
 * @param {number} ziel Zielfeld
 * @param {(von:number, nach:number)=>number} kosten Kosten eines Schritts (Infinity = verboten)
 * @param {object} opt { minKosten: kleinste mögliche Schrittkosten (Heuristik), maxKnoten, zielNachbarReicht }
 * @returns {{felder:number[], kosten:number[]}|null} felder ohne Start, kosten je Schritt
 */
export function sucheWeg(start, ziel, kosten, opt = {}) {
  if (start === ziel) return { felder: [], kosten: [] };
  const minK = opt.minKosten ?? 0.1;
  const maxKnoten = opt.maxKnoten ?? 40000;
  stempel++;
  if (stempel === 0xffffffff) { STEMPEL.fill(0); stempel = 1; }
  const offen = new Halde();
  G[start] = 0; VON[start] = -1; STEMPEL[start] = stempel;
  offen.rein(start, abstand(start, ziel) * minK);
  let knoten = 0, gefunden = -1;
  const geschlossen = new Set();
  while (!offen.leer) {
    const i = offen.raus();
    if (geschlossen.has(i)) continue;
    geschlossen.add(i);
    if (i === ziel || (opt.zielNachbarReicht && abstand(i, ziel) <= 1)) { gefunden = i; break; }
    if (++knoten > maxKnoten) break;
    for (let r = 0; r < 6; r++) {
      const n = nachbar(i, r);
      if (n < 0 || geschlossen.has(n)) continue;
      const k = kosten(i, n);
      if (!(k < Infinity)) continue;
      const g = G[i] + k;
      if (STEMPEL[n] !== stempel || g < G[n]) {
        STEMPEL[n] = stempel; G[n] = g; VON[n] = i;
        offen.rein(n, g + abstand(n, ziel) * minK);
      }
    }
  }
  if (gefunden < 0) return null;
  const felder = [], ks = [];
  for (let i = gefunden; i !== start; i = VON[i]) { felder.push(i); ks.push(G[i] - G[VON[i]]); }
  felder.reverse(); ks.reverse();
  return { felder, kosten: ks };
}

/** Alle Felder, die von start aus mit Gesamtkosten <= budget erreichbar sind (für Reichweiten-Anzeige). */
export function erreichbar(start, budget, kosten) {
  const best = new Map([[start, 0]]);
  const offen = new Halde(); offen.rein(start, 0);
  while (!offen.leer) {
    const i = offen.raus(); const gi = best.get(i);
    for (let r = 0; r < 6; r++) {
      const n = nachbar(i, r); if (n < 0) continue;
      const k = kosten(i, n); if (!(k < Infinity)) continue;
      const g = gi + k; if (g > budget) continue;
      if (!best.has(n) || g < best.get(n)) { best.set(n, g); offen.rein(n, g); }
    }
  }
  return best;
}
