// Pixel-Zeichen-API für alle Sprites. Sprites werden einmalig in ein Pixelraster gezeichnet und dann gecacht.
// Spielerfarbe: Die Platzhalter 'S' (Grundton), 'S-' (dunkel), 'S+' (hell) werden erst beim Rendern durch die Volksfarbe ersetzt.

export const UMRISS = '#2b2118';
const SPIELER = { 'S': 1, 'S-': 2, 'S+': 3, 'S--': 4 };

export function hexZuRgb(h) {
  if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  const n = parseInt(h.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbZuHex(r, g, b) {
  const k = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + k(r) + k(g) + k(b);
}
/** Mischt Farbe a mit b (t = Anteil b). */
export function mische(a, b, t) {
  const A = hexZuRgb(a), B = hexZuRgb(b);
  return rgbZuHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
export const hell = (c, t = 0.3) => mische(c, '#ffffff', t);
export const dunkel = (c, t = 0.3) => mische(c, '#000000', t);

/** Farbvarianten einer Spielerfarbe. */
export function spielerToene(farbe) {
  return { 1: farbe, 2: dunkel(farbe, 0.35), 3: hell(farbe, 0.35), 4: dunkel(farbe, 0.6) };
}

export class Pinsel {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.feld = new Array(w * h).fill(null); // null | '#rrggbb' | 'S' | 'S-' | 'S+' | 'S--'
  }
  px(x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || !c) return this;
    this.feld[y * this.w + x] = c === 'leer' ? null : c;
    return this;
  }
  hole(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.feld[y * this.w + x]; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c); return this; }
  rahmen(x, y, w, h, c) { this.rect(x, y, w, 1, c); this.rect(x, y + h - 1, w, 1, c); this.rect(x, y, 1, h, c); this.rect(x + w - 1, y, 1, h, c); return this; }
  linie(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
    return this;
  }
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / (rx + 0.5), dy = (y - cy) / (ry + 0.5);
        if (dx * dx + dy * dy <= 1) this.px(x, y, c);
      }
    return this;
  }
  kreis(cx, cy, r, c) { return this.ellipse(cx, cy, r, r, c); }
  /** Gefülltes Polygon (Liste von [x,y]). */
  poly(punkte, c) {
    let minY = Infinity, maxY = -Infinity;
    for (const [, y] of punkte) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs = [];
      for (let i = 0; i < punkte.length; i++) {
        const [x0, y0] = punkte[i], [x1, y1] = punkte[(i + 1) % punkte.length];
        if ((y0 <= y + 0.5 && y1 > y + 0.5) || (y1 <= y + 0.5 && y0 > y + 0.5)) xs.push(x0 + (y + 0.5 - y0) / (y1 - y0) * (x1 - x0));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.px(x, y, c);
    }
    for (let i = 0; i < punkte.length; i++) { const [x0, y0] = punkte[i], [x1, y1] = punkte[(i + 1) % punkte.length]; this.linie(x0, y0, x1, y1, c); }
    return this;
  }
  /** ASCII-Pixelkarte: zeilen = Array von Strings, palette = { 'a': '#rrggbb', 's': 'S', ... }; '.' und ' ' sind transparent. */
  karte(x, y, zeilen, palette) {
    zeilen.forEach((z, j) => { for (let i = 0; i < z.length; i++) { const ch = z[i]; if (ch === '.' || ch === ' ') continue; const c = palette[ch]; if (c) this.px(x + i, y + j, c); } });
    return this;
  }
  /** Spiegelt den Inhalt waagerecht. */
  spiegeln() {
    const f = this.feld.slice();
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.feld[y * this.w + x] = f[y * this.w + (this.w - 1 - x)];
    return this;
  }
  /** Verschiebt den Inhalt. */
  schiebe(dx, dy) {
    const f = this.feld.slice(); this.feld.fill(null);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const c = f[y * this.w + x]; if (c) this.px(x + dx, y + dy, c); }
    return this;
  }
  /** Einfache Licht-Schattierung: Pixel ohne Nachbarn oben-links werden etwas heller, unten-rechts etwas dunkler. */
  schattieren(staerke = 0.18) {
    const f = this.feld.slice();
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const c = f[y * this.w + x]; if (!c || c[0] !== '#') continue;
      const oben = y > 0 ? f[(y - 1) * this.w + x] : null, links = x > 0 ? f[y * this.w + x - 1] : null;
      const unten = y < this.h - 1 ? f[(y + 1) * this.w + x] : null, rechts = x < this.w - 1 ? f[y * this.w + x + 1] : null;
      if (!oben || !links) this.feld[y * this.w + x] = hell(c, staerke);
      else if (!unten || !rechts) this.feld[y * this.w + x] = dunkel(c, staerke);
    }
    return this;
  }
  /** Umriss um alle deckenden Pixel (4er-Nachbarschaft). */
  umriss(c = UMRISS) {
    const f = this.feld.slice();
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (f[y * this.w + x]) continue;
      const n = (xx, yy) => xx >= 0 && yy >= 0 && xx < this.w && yy < this.h && f[yy * this.w + xx];
      if (n(x + 1, y) || n(x - 1, y) || n(x, y + 1) || n(x, y - 1)) this.feld[y * this.w + x] = c;
    }
    return this;
  }
  /** Anzahl deckender Pixel (für Tests). */
  deckend() { return this.feld.filter(Boolean).length; }
  /** Rendert in ein Canvas (Browser) mit gegebener Spielerfarbe. */
  alsCanvas(spielerFarbe = '#c0392b') {
    const toene = spielerToene(spielerFarbe);
    const cv = typeof OffscreenCanvas !== 'undefined' && !globalThis.document ? new OffscreenCanvas(this.w, this.h) : document.createElement('canvas');
    cv.width = this.w; cv.height = this.h;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(this.w, this.h);
    const cache = {};
    for (let i = 0; i < this.feld.length; i++) {
      let c = this.feld[i]; if (!c) continue;
      if (SPIELER[c]) c = toene[SPIELER[c]];
      const rgb = cache[c] || (cache[c] = hexZuRgb(c));
      img.data[i * 4] = rgb[0]; img.data[i * 4 + 1] = rgb[1]; img.data[i * 4 + 2] = rgb[2]; img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }
}

// --- Gemeinsame Palette (gerne benutzen, damit alles zusammenpasst) ---
export const PAL = {
  haut: '#e8b58a', hautD: '#c98f63', haar: '#4a3020', holz: '#8a5a2b', holzD: '#5a3a1a', holzH: '#b07a42',
  eisen: '#9aa5b1', eisenD: '#6b7682', eisenH: '#c8d0d8', bronze: '#c08a3e', bronzeD: '#8a5f26', gold: '#f1c40f', goldD: '#b8930a',
  leder: '#7a4f2a', lederD: '#523419', stoff: '#d9cfb4', stoffD: '#aa9f84', weiss: '#f4f1ea', schwarz: '#22201e',
  stein: '#a9a49a', steinD: '#7a756c', steinH: '#c9c4ba', ziegel: '#b5523b', ziegelD: '#86392a', putz: '#e8dcc0', putzD: '#c4b48f',
  beton: '#a8acae', betonD: '#7d8183', glas: '#8fc3e0', glasD: '#5a8fb0', backstein: '#9c4a32', backsteinD: '#6e3122',
  gruen: '#3d7f38', gruenD: '#2c5a28', gruenH: '#5aa84f', wasser: '#3d7fc4', wasserH: '#8fc0ee', rot: '#c0392b', feuer: '#f39c12', rauch: '#8c8c8c',
  oliv: '#5b6b3a', olivD: '#3e4a27', khaki: '#a89a6a', tarn: '#6b7a4a', stahl: '#5d6a73', stahlD: '#3f4950', stahlH: '#86939c',
};
