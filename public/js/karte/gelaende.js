// Vorgerenderte Gelände-Kacheln (Chunks): pixelgenau aus der Karte erzeugt, mit Rauschen, gerasterten Biom-Übergängen,
// Küsten-Seitenkanten (Perspektive B) und Flüssen. Gecacht mit LRU, damit auch Tablets genug Speicher haben.
import { karte } from '../../shared/karte.js';
import { BREITE, HOEHE, idx, nachbar, feldMitte, STAUCHUNG, WURZEL3 } from '../../shared/hex.js';
import { GELAENDE } from '../../shared/daten/gelaende.js';
import { hash } from '../../shared/zufall.js';
import { hexZuRgb } from '../grafik/pixel.js';

export const R = 28;                       // Hex-Radius in Weltpixeln
export const FELD_B = WURZEL3 * R;         // ≈ 48.5
export const ZEILE_H = 1.5 * R * STAUCHUNG; // ≈ 30.2
export const KANTE = 5;                    // Höhe der Seitenkante an Küsten
export const WELT_B = Math.ceil(FELD_B * (BREITE + 0.5)) + 2;
export const WELT_H = Math.ceil((R + HOEHE * 1.5 * R) * STAUCHUNG + R) + 2;
const CHUNK = 256;                         // Chunkgröße in Weltpixeln
const MAX_CHUNKS = 36;

const FARBEN = GELAENDE.map((g) => g.farben.map(hexZuRgb));
const SEITE = GELAENDE.map((g) => hexZuRgb(g.seite));
const WASSER = GELAENDE.map((g) => !!g.wasser);

/** Feld unter einem Weltpixel (Ebene der Oberseite). */
export function feldUnter(px, py) {
  const x = px - FELD_B / 2;
  const y = py / STAUCHUNG - R;
  const q = (WURZEL3 / 3 * x - y / 3) / R;
  const r = (2 / 3 * y) / R;
  let rx = Math.round(q), rz = Math.round(r), ry = Math.round(-q - r);
  const dx = Math.abs(rx - q), dz = Math.abs(rz - r), dy = Math.abs(ry + q + r);
  if (dx > dy && dx > dz) rx = -ry - rz; else if (dy <= dz) rz = -rx - ry;
  const zeile = rz, spalte = rx + ((rz - (rz & 1)) >> 1);
  if (spalte < 0 || zeile < 0 || spalte >= BREITE || zeile >= HOEHE) return -1;
  return idx(spalte, zeile);
}

/** Abstand eines Pixels zum Rand seines Hexfelds (grob, in Pixeln), und das nächste Nachbarfeld. */
function randInfo(px, py, i) {
  const [cx, cy] = feldMitte(i, R);
  const dx = px - cx, dy = (py - cy) / STAUCHUNG;
  // Richtung zum nächsten Nachbarn: Winkel in 6 Sektoren (O, NO, NW, W, SW, SO)
  const w = Math.atan2(-dy, dx);
  let s = Math.round(w / (Math.PI / 3));
  s = ((s % 6) + 6) % 6;
  const nach = nachbar(i, s);
  // Abstand zur Kante in Richtung s
  const ux = Math.cos(s * Math.PI / 3), uy = -Math.sin(s * Math.PI / 3);
  const proj = dx * ux + dy * uy;
  return { rand: (WURZEL3 / 2) * R - proj, nach };
}

const cache = new Map(); // "cx,cy" -> canvas

export function chunkCanvas(cx, cy) {
  const k = cx + ',' + cy;
  let c = cache.get(k);
  if (c) { cache.delete(k); cache.set(k, c); return c; }
  c = baueChunk(cx, cy);
  cache.set(k, c);
  if (cache.size > MAX_CHUNKS) cache.delete(cache.keys().next().value);
  return c;
}
export const CHUNK_GROESSE = CHUNK;
export function cacheLeeren() { cache.clear(); }

function baueChunk(cx, cy) {
  const k = karte();
  const cv = document.createElement('canvas');
  cv.width = CHUNK; cv.height = CHUNK;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(CHUNK, CHUNK);
  const d = img.data;
  const x0 = cx * CHUNK, y0 = cy * CHUNK;
  for (let py = 0; py < CHUNK; py++) {
    const wy = y0 + py;
    for (let px = 0; px < CHUNK; px++) {
      const wx = x0 + px;
      const o = (py * CHUNK + px) * 4;
      let i = feldUnter(wx + 0.5, wy + 0.5);
      if (i < 0) { d[o] = 11; d[o + 1] = 13; d[o + 2] = 20; d[o + 3] = 255; continue; }
      let g = k.gelaende[i];
      let farbe;
      const h = hash(wx, wy, 7);
      const n = (h & 1023) / 1024;
      // Küstenkante: Wasserpixel, über dem (um KANTE versetzt) Land liegt -> Seitenwand
      if (WASSER[g]) {
        const oben = feldUnter(wx + 0.5, wy + 0.5 - KANTE);
        if (oben >= 0 && !WASSER[k.gelaende[oben]] && oben !== i) {
          const s = SEITE[k.gelaende[oben]];
          const t = (wy - 0) % 2 === 0 ? 1 : 0.9;
          d[o] = s[0] * t; d[o + 1] = s[1] * t; d[o + 2] = s[2] * t; d[o + 3] = 255;
          continue;
        }
      }
      // gerasterter Übergang zum Nachbarn nahe der Kante
      const ri = randInfo(wx + 0.5, wy + 0.5, i);
      if (ri.nach >= 0 && ri.rand < 5) {
        const gn = k.gelaende[ri.nach];
        if (gn !== g && WASSER[gn] === WASSER[g]) {
          const p = (5 - ri.rand) / 10; // bis 50 % an der Kante
          if (((h >>> 10) & 1023) / 1024 < p) g = gn;
        }
      }
      const pal = FARBEN[g];
      farbe = pal[n < 0.68 ? 0 : n < 0.86 ? 1 : 2];
      let r = farbe[0], gr = farbe[1], b = farbe[2];
      // Wasser: Schaum am Strand und leichte Wellen
      if (WASSER[g]) {
        if (ri.nach >= 0 && !WASSER[k.gelaende[ri.nach]] && ri.rand < 2.2) { r = 200; gr = 225; b = 240; }
        else if (((wx + wy * 3) % 13 === 0) && n > 0.5) { r += 40; gr += 40; b += 30; }
        if (GELAENDE[g].tief) { r *= 0.92; gr *= 0.92; b *= 0.95; }
      } else {
        // feine Kantenschattierung: oben-links heller, unten-rechts dunkler
        if (ri.rand < 1.4) { const s = ri.nach >= 0 && (nachbarRichtungUnten(i, ri.nach)) ? 0.86 : 1.08; r *= s; gr *= s; b *= s; }
      }
      d[o] = r; d[o + 1] = gr; d[o + 2] = b; d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // Flüsse
  zeichneFluesse(ctx, x0, y0);
  return cv;
}

function nachbarRichtungUnten(i, n) { return n > i; }

function zeichneFluesse(ctx, x0, y0) {
  const k = karte();
  const sp0 = Math.max(0, Math.floor(x0 / FELD_B) - 2), sp1 = Math.min(BREITE - 1, Math.ceil((x0 + CHUNK) / FELD_B) + 2);
  const z0 = Math.max(0, Math.floor(y0 / ZEILE_H) - 2), z1 = Math.min(HOEHE - 1, Math.ceil((y0 + CHUNK) / ZEILE_H) + 2);
  for (let z = z0; z <= z1; z++) for (let s = sp0; s <= sp1; s++) {
    const i = idx(s, z);
    const f = k.fluss[i];
    if (!f || f > 6) continue;
    if (GELAENDE[k.gelaende[i]].wasser) continue;
    const n = nachbar(i, f - 1);
    if (n < 0) continue;
    const [ax, ay] = feldMitte(i, R), [bx, by] = feldMitte(n, R);
    const ende = GELAENDE[k.gelaende[n]].wasser ? 0.75 : 1;
    pixelLinie(ctx, ax - x0, ay - y0, ax + (bx - ax) * ende - x0, ay + (by - ay) * ende - y0, i);
  }
}

function pixelLinie(ctx, x0, y0, x1, y1, saat) {
  const schritte = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)));
  for (let s = 0; s <= schritte; s++) {
    const t = s / schritte;
    // leichte Mäander
    const w = Math.sin(t * Math.PI * 2 + saat) * 2.2;
    const nx = -(y1 - y0), ny = (x1 - x0); const l = Math.hypot(nx, ny) || 1;
    const x = Math.round(x0 + (x1 - x0) * t + nx / l * w), y = Math.round(y0 + (y1 - y0) * t + ny / l * w);
    ctx.fillStyle = '#2f6aa8'; ctx.fillRect(x - 1, y - 1, 3, 3);
    ctx.fillStyle = '#4c8fd6'; ctx.fillRect(x, y - 1, 2, 2);
  }
}
