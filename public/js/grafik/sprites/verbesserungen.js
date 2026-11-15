// Feldverbesserungen (48x32, liegen unten mittig auf dem Hexfeld) und Weg-Symbole (16x16).
// Böden/Äcker/Wasser werden ohne Umriss gezeichnet, Gebäude und Objekte mit eigenem Umriss (Ebenen-Technik).
import { definiere } from '../sprites.js';
import { PAL, hell, dunkel, mische, Pinsel } from '../pixel.js';
import { bez, rand } from './rohstoffe.js';

const W = 48, H = 32;

// ---------- Hilfen ----------
/** Zeichnet fn auf eine eigene Ebene, umrandet sie und legt sie auf p. */
function obj(p, fn) {
  const q = new Pinsel(p.w, p.h);
  fn(q);
  rand(q);
  q.umriss();
  for (let i = 0; i < q.feld.length; i++) if (q.feld[i]) p.feld[i] = q.feld[i];
  return p;
}
/** Acker als leicht schräges Parallelogramm mit Furchen; unten eine dunkle Erdkante. */
function beet(p, x, y, w, h, c1, c2, kante = true) {
  for (let j = 0; j < h; j++) {
    const s = Math.round((h - 1 - j) * 0.5);
    p.rect(x + s, y + j, w, 1, j === 0 ? hell(c1, 0.15) : (j % 2 ? c2 : c1));
  }
  if (kante) p.rect(x, y + h, w, 1, '#5a3a1a');
  return p;
}
/** Boden-Fleck (ohne Umriss). */
function fleck(p, cx, cy, rx, ry, c) { p.ellipse(cx, cy, rx, ry, c); p.ellipse(cx + 1, cy + 1, rx - 1, ry - 1, c); return p; }
/** Haus mit Satteldach (Dachfläche zum Betrachter). yb = unterste Zeile. */
function haus(q, x, yb, b, hw, rh, wand, dach, tuer = true) {
  const top = yb - hw + 1;
  q.rect(x, top, b, hw, wand);
  q.rect(x + b - Math.max(1, Math.floor(b / 4)), top, Math.max(1, Math.floor(b / 4)), hw, dunkel(wand, 0.2));
  for (let k = 0; k < rh; k++) {
    const xx = x - 1 + k, bb = b + 2 - 2 * k;
    if (bb <= 0) break;
    q.rect(xx, top - 1 - k, bb, 1, k === 0 ? dunkel(dach, 0.25) : dach);
    q.px(xx, top - 1 - k, hell(dach, 0.25));
  }
  if (tuer) q.rect(x + Math.floor(b / 2) - 1, yb - 2, 2, 3, '#4a2e14');
  return top - rh;
}
/** Laubbaum. */
function baum(q, x, y, r = 3) {
  q.rect(x, y - 2, 1, 3, PAL.holzD);
  q.kreis(x, y - 2 - r, r, PAL.gruen);
  q.px(x - 1, y - 3 - r - 1, PAL.gruenH).px(x - 2, y - 2 - r, PAL.gruenH).px(x - 1, y - 2 - r, PAL.gruenH);
  q.px(x + 1, y - 1 - r + 1, PAL.gruenD).px(x + 2, y - 2 - r + 1, PAL.gruenD);
}
/** Nadelbaum. */
function tanne(q, x, y, hh = 8) {
  q.rect(x, y - 1, 1, 2, PAL.holzD);
  for (let j = 0; j < hh; j++) { const w = Math.floor((hh - j) / 2); q.rect(x - w, y - 2 - j, 2 * w + 1, 1, j % 2 ? '#2c6a34' : '#3a8a40'); q.px(x - w, y - 2 - j, '#4fa850'); }
}
/** Spielerfarben-Fähnchen; (x,y) = Fuß der Stange. */
function fahne(q, x, y, h = 9) {
  q.rect(x, y - h, 1, h + 1, PAL.holzD);
  q.rect(x + 1, y - h, 5, 1, 'S+').rect(x + 1, y - h + 1, 5, 1, 'S').rect(x + 1, y - h + 2, 4, 1, 'S-');
  q.px(x, y - h - 1, PAL.gold);
}
/** Holzzaun von (x0,y0) nach (x1,y1); Pfosten 4 hoch. */
function zaun(q, x0, y0, x1, y1, f = PAL.holz) {
  q.linie(x0, y0 - 2, x1, y1 - 2, f);
  q.linie(x0, y0 - 1 + 1, x1, y1 - 1 + 1, dunkel(f, 0.15));
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 4));
  for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); q.rect(x, y - 3, 1, 4, PAL.holzH).px(x, y, PAL.holzD); }
}
/** Wellenlinien (ohne Umriss). */
function wellen(p, liste) { for (const [x, y, l] of liste) { p.rect(x, y, l, 1, '#bfe2ff'); p.rect(x + 1, y + 1, l - 2, 1, '#5a9ad8'); } }
/** Fass/Tank (stehender Zylinder). */
function tank(q, x, yb, b, h, c) {
  q.rect(x, yb - h + 1, b, h, c);
  q.rect(x, yb - h + 1, 1, h, hell(c, 0.3)).rect(x + b - 2, yb - h + 1, 2, h, dunkel(c, 0.25));
  q.ellipse(x + (b - 1) / 2, yb - h + 1, (b - 1) / 2, 1, hell(c, 0.2));
}
/** Felsen/Hügel-Haufen. */
function felsen(q, cx, yb, rx, ry, c = PAL.stein) {
  q.ellipse(cx, yb - ry, rx, ry, c);
  q.rect(cx - rx - 1, yb, 2 * rx + 3, 2, 'leer');
  q.ellipse(cx - rx / 3, yb - ry * 1.4, rx / 2, ry / 2, hell(c, 0.2));
  q.ellipse(cx + rx / 2, yb - ry * 0.6, rx / 2.2, ry / 2.2, dunkel(c, 0.15));
}
/** Holzstapel (Stämme mit Schnittflächen). */
function stapel(q, x, yb, n = 3) {
  for (let r = 0; r < n; r++) for (let i = 0; i < n - r; i++) {
    const cx = x + i * 3 + r * 1.5, cy = yb - 1 - r * 2.5;
    q.kreis(cx, cy, 1.2, '#c8955a'); q.px(cx, cy, '#8a5a2b'); q.px(cx - 1, cy - 1, '#e2b878');
  }
}
/** Lore auf Schienen. */
function lore(q, x, yb, c = PAL.eisenD) {
  q.rect(x, yb - 4, 6, 3, c).rect(x, yb - 4, 6, 1, PAL.eisen);
  q.rect(x + 1, yb - 5, 4, 1, '#3a3a40').px(x + 2, yb - 6, '#6f6a62').px(x + 3, yb - 5, '#e07a2e');
  q.px(x + 1, yb - 1, '#22201e').px(x + 4, yb - 1, '#22201e');
}
function schienen(p, x0, x1, y) { p.rect(x0, y, x1 - x0, 1, '#6b7682'); for (let x = x0; x < x1; x += 2) p.px(x, y + 1, PAL.holzD); }
/** Stolleneingang mit Holzbalken (im Fels). */
function stollen(q, x, yb) {
  q.rect(x, yb - 7, 8, 8, '#1a1612');
  q.rect(x, yb - 8, 8, 2, PAL.holz).rect(x, yb - 8, 8, 1, PAL.holzH);
  q.rect(x - 1, yb - 7, 2, 8, PAL.holz).rect(x + 7, yb - 7, 2, 8, PAL.holzD);
  q.px(x - 1, yb - 7, PAL.holzH);
  q.px(x + 3, yb - 4, '#f39c12');
}
function rauch(q, x, y, n = 3) { for (let i = 0; i < n; i++) q.kreis(x + i, y - i * 3, 1.2 + i * 0.4, i ? '#b8b8b8' : '#8c8c8c'); }

function def(id, zeichne) { definiere('verbesserung', id, { w: W, h: H, umriss: false, zeichne: (p, o) => { zeichne(p, o); rand(p, '#2b2118'); } }); }

// ---------- Farm-Kette ----------
function farmFelder(p, lush = 0) {
  const g = lush ? '#5aa84f' : '#6aa84f', gd = lush ? '#3d8a3a' : '#4f8a3a';
  beet(p, 9, 12, 13, 6, '#e0b83a', '#b8902a');
  beet(p, 25, 11, 14, 6, g, gd);
  beet(p, 5, 20, 15, 7, '#8a5a2b', '#6b4420');
  beet(p, 22, 19, 17, 7, '#d4ac36', '#a8862a');
}
def('farm', (p) => {
  farmFelder(p);
  obj(p, (q) => { q.ellipse(41, 23, 3, 3, '#e0b83a'); q.rect(38, 26, 7, 1, 'leer'); q.px(40, 21, '#fff0a0').px(39, 22, '#fff0a0').px(42, 24, '#a8862a'); q.rect(40, 19, 2, 1, '#c89a2a'); });
  obj(p, (q) => { q.rect(4, 15, 1, 4, PAL.holz).rect(3, 16, 3, 1, PAL.holz).rect(3, 14, 3, 2, PAL.stoff).px(4, 13, '#c8a050'); });
});
def('bewaesserte_farm', (p) => {
  farmFelder(p, 1);
  // Kanäle
  p.rect(3, 18, 40, 2, PAL.wasser).rect(3, 18, 40, 1, PAL.wasserH);
  for (let y = 10; y < 28; y++) { const x = 22 - Math.round((y - 10) * 0.5); p.rect(x, y, 2, 1, PAL.wasser).px(x, y, PAL.wasserH); }
  p.rect(2, 27, 40, 1, PAL.wasser).rect(2, 27, 40, 1, '#5a9ad8');
  // Schleusentor
  obj(p, (q) => { q.rect(41, 16, 4, 4, '#8a8a80').rect(41, 16, 4, 1, PAL.steinH).rect(42, 17, 2, 2, PAL.holz); });
  obj(p, (q) => { q.rect(10, 16, 3, 3, PAL.holzD).px(11, 17, PAL.wasserH); });
});
def('windrad_farm', (p) => {
  beet(p, 4, 13, 14, 6, '#e0b83a', '#b8902a');
  beet(p, 2, 21, 16, 6, '#6aa84f', '#4f8a3a');
  beet(p, 18, 21, 14, 6, '#d4ac36', '#a8862a');
  obj(p, (q) => {
    // Mühlenturm
    q.poly([[30, 26], [42, 26], [40, 10], [32, 10]], '#e8dcc0');
    q.poly([[38, 26], [42, 26], [40, 10], [38, 10]], '#c4b48f');
    q.rect(34, 20, 3, 6, '#4a2e14').rect(35, 14, 2, 2, '#4a2e14');
    q.rect(31, 8, 10, 2, PAL.ziegelD).rect(32, 7, 8, 1, PAL.ziegel).rect(33, 6, 6, 1, PAL.ziegel).rect(34, 5, 4, 1, hell(PAL.ziegel, 0.2));
  });
  obj(p, (q) => {
    const hx = 36, hy = 9;
    const fluegel = (dx, dy) => {
      const px = -dy, py = dx;
      for (let i = 1; i <= 9; i++) {
        const x = hx + dx * i, y = hy + dy * i;
        q.px(x, y, PAL.holzD);
        if (i >= 3) for (const k of [1, 2]) q.px(x + px * k, y + py * k, (i + k) % 3 ? PAL.stoff : PAL.holz);
      }
    };
    fluegel(1, -1); fluegel(-1, -1); fluegel(1, 1); fluegel(-1, 1);
    q.kreis(hx, hy, 1, PAL.holzD).px(hx, hy, PAL.holzH);
  });
});
def('mechanisierte_farm', (p) => {
  beet(p, 14, 10, 26, 7, '#e8c040', '#c09a2a');
  beet(p, 4, 19, 22, 8, '#5aa84f', '#3d8a3a');
  beet(p, 26, 19, 16, 8, '#e8c040', '#c09a2a');
  obj(p, (q) => {
    // Silo
    tank(q, 3, 18, 7, 14, '#9ab0c0');
    q.ellipse(6, 4, 3, 2, '#c8d4dc').rect(3, 5, 7, 1, '#7d8f9c');
    q.rect(3, 9, 7, 1, '#7d8f9c').rect(3, 13, 7, 1, '#7d8f9c');
    // Scheune
    haus(q, 10, 18, 7, 5, 3, '#c0392b', '#7a2a20');
  });
  obj(p, (q) => {
    // Traktor
    q.rect(30, 19, 8, 4, '#d42a1a').rect(30, 19, 8, 1, '#f05a3a');
    q.rect(31, 15, 4, 4, '#d42a1a').rect(32, 16, 2, 2, PAL.glas);
    q.rect(31, 14, 5, 1, '#3a3a3a');
    q.rect(37, 16, 1, 3, '#3a3a3a').px(37, 15, '#8c8c8c');
    q.kreis(32, 23, 2.5, '#22201e').px(32, 23, '#8c8c8c').px(31, 22, '#4a4a4a');
    q.kreis(38, 24, 1.3, '#22201e').px(38, 24, '#8c8c8c');
  });
});
def('terrassenfeld', (p) => {
  const stufe = (y, x0, x1, c, d) => {
    p.rect(x0, y, x1 - x0, 3, c).rect(x0 + 1, y, x1 - x0 - 2, 1, hell(c, 0.2));
    for (let x = x0 + 2; x < x1 - 1; x += 3) p.px(x, y + 1, d);
    p.rect(x0, y + 3, x1 - x0, 2, '#8a7a62').rect(x0, y + 4, x1 - x0, 1, '#6a5a48');
    for (let x = x0 + 1; x < x1; x += 4) p.px(x, y + 3, '#a89a80');
  };
  stufe(8, 14, 34, '#7ac05a', '#4f9a3a');
  stufe(13, 9, 39, '#6ab04a', '#3d8a3a');
  stufe(18, 5, 43, '#7ac05a', '#4f9a3a');
  stufe(23, 3, 45, '#5aa84f', '#3d8a3a');
  obj(p, (q) => { q.rect(40, 18, 1, 4, PAL.holzD); q.ellipse(40, 17, 2, 1, '#e8c040'); });
});

// ---------- Mine-Kette ----------
function minenBerg(p) { obj(p, (q) => { felsen(q, 22, 27, 15, 9, '#9a958a'); q.px(14, 15, '#c9c4ba').px(26, 20, '#7a756c').px(30, 16, '#7a756c').px(18, 22, '#7a756c'); }); }
def('mine', (p) => {
  fleck(p, 26, 27, 16, 3, '#8a7a62');
  minenBerg(p);
  obj(p, (q) => stollen(q, 18, 26));
  schienen(p, 20, 40, 28);
  obj(p, (q) => lore(q, 32, 28));
  obj(p, (q) => { q.rect(6, 25, 2, 2, PAL.holz); q.linie(5, 21, 9, 25, PAL.holzH); q.linie(3, 22, 6, 20, '#9aa5b1'); });
});
def('tiefe_mine', (p) => {
  fleck(p, 26, 27, 18, 3, '#8a7a62');
  minenBerg(p);
  obj(p, (q) => stollen(q, 12, 26));
  obj(p, (q) => {
    // hölzerner Förderturm
    q.linie(28, 27, 32, 5, PAL.holz).linie(40, 27, 35, 5, PAL.holzD);
    q.linie(29, 27, 33, 5, PAL.holz).linie(39, 27, 34, 5, PAL.holzD);
    q.rect(30, 14, 9, 1, PAL.holzD).rect(31, 20, 8, 1, PAL.holzD);
    q.linie(30, 14, 38, 20, PAL.holzD).linie(38, 14, 31, 20, PAL.holzD);
    q.kreis(34, 5, 2.5, '#5d6a73'); q.kreis(34, 5, 1.2, 'leer'); q.px(34, 5, PAL.holzD);
    q.rect(34, 7, 1, 13, '#3a3a3a');
    q.rect(33, 20, 3, 3, '#6b7682');
  });
  schienen(p, 14, 44, 28);
  obj(p, (q) => lore(q, 20, 28));
});
def('industriemine', (p) => {
  fleck(p, 24, 27, 20, 3, '#6a6258');
  obj(p, (q) => felsen(q, 14, 27, 11, 8, '#8a857a'));
  obj(p, (q) => {
    // Ziegelhalle mit Schornstein
    q.rect(25, 6, 3, 14, PAL.backstein).rect(25, 6, 1, 14, hell(PAL.backstein, 0.2)).rect(24, 5, 5, 1, PAL.backsteinD);
    haus(q, 22, 27, 14, 8, 3, PAL.backstein, '#4a4a50', false);
    q.rect(25, 22, 2, 2, '#f1c40f').rect(30, 22, 2, 2, '#f1c40f');
    q.rect(27, 25, 3, 3, '#3a2a20');
  });
  obj(p, (q) => rauch(q, 26, 3, 2));
  obj(p, (q) => {
    // Stahl-Förderturm
    q.linie(37, 27, 40, 4, PAL.stahl).linie(45, 27, 42, 4, PAL.stahlD);
    for (let y = 8; y < 27; y += 5) { q.rect(38, y, 7, 1, PAL.stahlD); q.linie(38, y, 44, y + 5, PAL.stahl); }
    q.kreis(41, 4, 2.4, PAL.rot); q.kreis(41, 4, 1, 'leer'); q.px(41, 4, PAL.stahlD);
  });
  obj(p, (q) => {
    // Förderband vom Berg zur Halle
    q.linie(6, 23, 21, 13, '#3a3a3a'); q.linie(6, 24, 21, 14, '#5a5a5a');
    for (let i = 0; i < 4; i++) q.rect(8 + i * 4, 21 - Math.round(i * 2.7), 1, 4 + Math.round(i * 2.7), PAL.stahlD);
    q.px(10, 20, '#2a2a30').px(14, 18, '#e07a2e').px(18, 15, '#2a2a30');
  });
});

// ---------- Steinbruch ----------
function bruchwand(q, x, yb, b, stufen, c) {
  for (let s = 0; s < stufen; s++) {
    const y = yb - 4 - s * 4, xx = x + s * 3, bb = b - s * 6;
    q.rect(xx, y, bb, 4, c).rect(xx, y, bb, 1, hell(c, 0.25)).rect(xx, y + 3, bb, 1, dunkel(c, 0.2));
    for (let i = xx + 2; i < xx + bb - 1; i += 4) q.px(i, y + 1 + (i % 2), dunkel(c, 0.25));
  }
}
function block(q, x, yb, b, h, c) { q.rect(x, yb - h + 1, b, h, c).rect(x, yb - h + 1, b, 1, hell(c, 0.3)).rect(x + b - 1, yb - h + 2, 1, h - 1, dunkel(c, 0.25)); }
def('steinbruch', (p) => {
  fleck(p, 24, 26, 18, 4, '#b8b0a0');
  obj(p, (q) => bruchwand(q, 6, 24, 24, 3, PAL.stein));
  obj(p, (q) => { block(q, 32, 26, 5, 4, PAL.steinH); block(q, 38, 27, 4, 3, PAL.stein); block(q, 34, 21, 4, 3, PAL.stein); });
  obj(p, (q) => { q.linie(25, 27, 29, 23, PAL.holz); q.linie(27, 22, 30, 25, '#9aa5b1').px(28, 23, '#6b7682'); });
});
def('grosser_steinbruch', (p) => {
  fleck(p, 24, 26, 21, 4, '#b8b0a0');
  obj(p, (q) => bruchwand(q, 2, 25, 30, 4, PAL.stein));
  obj(p, (q) => {
    // Holzkran
    q.rect(38, 6, 2, 21, PAL.holz).rect(38, 6, 1, 21, PAL.holzH);
    q.linie(39, 6, 27, 9, PAL.holzD).linie(39, 7, 27, 10, PAL.holz);
    q.linie(38, 14, 32, 8, PAL.holzD);
    q.rect(28, 10, 1, 6, '#3a3a3a');
    block(q, 26, 19, 5, 3, PAL.steinH);
    q.rect(36, 26, 6, 1, PAL.holzD);
  });
  obj(p, (q) => { block(q, 42, 27, 4, 3, PAL.stein); block(q, 43, 24, 3, 2, PAL.steinH); block(q, 33, 28, 4, 3, PAL.stein); });
});

// ---------- Holz ----------
function stumpf(q, x, y) { q.rect(x, y - 1, 3, 2, PAL.holz); q.rect(x, y - 2, 3, 1, '#e2b878').px(x + 1, y - 2, '#c8955a'); q.px(x + 2, y, PAL.holzD); }
def('holzfaellerlager', (p) => {
  fleck(p, 24, 25, 19, 4, '#6a8a3a');
  obj(p, (q) => { tanne(q, 40, 18, 11); tanne(q, 7, 16, 9); });
  obj(p, (q) => {
    // Blockhütte
    const yb = 24, x = 12;
    q.rect(x, yb - 5, 12, 6, PAL.holz);
    for (let y = yb - 5; y <= yb; y += 2) q.rect(x, y, 12, 1, PAL.holzH);
    q.rect(x + 9, yb - 5, 3, 6, PAL.holzD);
    for (let k = 0; k < 4; k++) q.rect(x - 1 + k, yb - 6 - k, 14 - 2 * k, 1, k ? '#6b4a2a' : '#4a3018');
    q.rect(x + 4, yb - 2, 2, 3, '#2a1a0a').rect(x + 7, yb - 3, 2, 2, '#f1c40f');
  });
  obj(p, (q) => stapel(q, 27, 27, 3));
  obj(p, (q) => { stumpf(q, 6, 27); stumpf(q, 37, 28); q.linie(38, 25, 40, 23, PAL.holzD); q.rect(40, 22, 2, 2, PAL.eisenH); });
});
def('saegewerk', (p) => {
  fleck(p, 24, 26, 20, 4, '#7a6a48');
  p.rect(2, 23, 10, 6, PAL.wasser); p.rect(2, 23, 10, 1, PAL.wasserH); p.px(5, 26, PAL.wasserH);
  obj(p, (q) => tanne(q, 43, 19, 10));
  obj(p, (q) => {
    // Halle
    haus(q, 10, 25, 20, 9, 5, PAL.holzH, '#6b4a2a', false);
    q.rect(17, 19, 6, 7, '#2a1a0a');
    q.kreis(20, 21, 2.5, '#c8d0d8'); q.kreis(20, 21, 0.6, '#6b7682');
    for (const [dx, dy] of [[0, -3], [3, 0], [0, 3], [-3, 0], [2, -2], [2, 2], [-2, 2], [-2, -2]]) q.px(20 + dx, 21 + dy, '#e8eef4');
    q.rect(12, 18, 3, 2, PAL.glas).rect(26, 18, 2, 2, PAL.glas);
  });
  obj(p, (q) => { q.kreis(9, 22, 4, PAL.holzD); q.kreis(9, 22, 2.6, 'leer'); for (let a = 0; a < 8; a++) q.px(9 + Math.round(Math.cos(a * 0.785) * 3.5), 22 + Math.round(Math.sin(a * 0.785) * 3.5), PAL.holzH); q.kreis(9, 22, 0.6, PAL.holz); });
  obj(p, (q) => {
    // Bretterstapel
    for (let i = 0; i < 4; i++) q.rect(31 + i, 27 - i * 2, 10, 2, i % 2 ? '#d8a868' : '#c8955a').rect(31 + i, 27 - i * 2, 10, 1, '#ecc488');
  });
});

// ---------- Plantage ----------
function busch(q, x, y, c = '#3d8f3a', frucht) { q.kreis(x, y, 2, c); q.px(x - 1, y - 1, hell(c, 0.3)).px(x + 1, y + 1, dunkel(c, 0.25)); if (frucht) q.px(x + 1, y, frucht).px(x - 1, y + 1, frucht); }
def('plantage', (p) => {
  for (let r = 0; r < 4; r++) p.rect(6 + (3 - r) * 2, 13 + r * 4, 30, 2, '#7a5a30');
  for (let r = 0; r < 4; r++) obj(p, (q) => { for (let i = 0; i < 6; i++) busch(q, 9 + (3 - r) * 2 + i * 5 + (r % 2), 12 + r * 4, r % 2 ? '#3d8f3a' : '#4aa040', '#e0402a'); });
  obj(p, (q) => { haus(q, 38, 27, 6, 4, 3, PAL.putz, PAL.ziegel); });
});
def('grossplantage', (p) => {
  for (let r = 0; r < 5; r++) p.rect(2 + (4 - r) * 2, 10 + r * 4, 30, 2, '#7a5a30');
  for (let r = 0; r < 5; r++) obj(p, (q) => { for (let i = 0; i < 6; i++) busch(q, 5 + (4 - r) * 2 + i * 5 + (r % 2), 9 + r * 4, r % 2 ? '#3d8f3a' : '#4aa040', '#f39c12'); });
  obj(p, (q) => {
    haus(q, 33, 27, 12, 8, 4, PAL.weiss, PAL.ziegel);
    q.rect(35, 21, 2, 2, PAL.glas).rect(41, 21, 2, 2, PAL.glas);
    q.rect(32, 26, 3, 2, PAL.holz).rect(32, 26, 3, 1, PAL.holzH);
  });
  obj(p, (q) => { q.rect(26, 27, 5, 3, PAL.stoff).rect(26, 27, 5, 1, '#efe6cc'); q.rect(28, 26, 1, 1, '#a08050'); });
});

// ---------- Weide ----------
def('weide', (p) => {
  fleck(p, 24, 21, 19, 7, '#7cc05a');
  for (const [x, y] of [[12, 18], [30, 16], [22, 24], [36, 23], [16, 22]]) p.px(x, y, '#f4d03f').px(x + 1, y + 2, '#a8e070');
  obj(p, (q) => {
    zaun(q, 6, 16, 22, 11); zaun(q, 22, 11, 42, 15);
  });
  obj(p, (q) => {
    zaun(q, 6, 16, 6, 27); zaun(q, 42, 15, 42, 27);
    q.rect(26, 22, 7, 3, PAL.holz).rect(27, 22, 5, 1, PAL.wasser).px(28, 22, PAL.wasserH);
  });
  obj(p, (q) => { zaun(q, 6, 28, 42, 28); q.rect(20, 25, 6, 4, 'leer'); });
});
def('ranch', (p) => {
  fleck(p, 24, 22, 20, 7, '#7cc05a');
  obj(p, (q) => { zaun(q, 3, 18, 16, 13); });
  obj(p, (q) => {
    // rote Scheune
    q.rect(17, 9, 18, 14, '#c0392b');
    q.rect(31, 9, 4, 14, '#962d22');
    q.poly([[15, 10], [26, 2], [37, 10]], '#5a3a2a');
    q.linie(16, 9, 26, 2, '#7a5a3a');
    q.rect(19, 9, 14, 1, '#4a2a1a');
    q.rect(22, 15, 8, 8, PAL.weiss).rect(23, 16, 6, 7, '#8a2a20');
    q.linie(23, 16, 28, 22, PAL.weiss).linie(28, 16, 23, 22, PAL.weiss);
    q.rect(24, 5, 4, 3, PAL.weiss).rect(25, 6, 2, 2, '#4a2a1a');
  });
  obj(p, (q) => { zaun(q, 3, 18, 3, 28); zaun(q, 3, 28, 44, 28); zaun(q, 44, 18, 44, 28); });
  obj(p, (q) => { q.ellipse(38, 24, 2, 3, '#e8c040'); q.rect(36, 27, 5, 1, 'leer'); q.ellipse(10, 24, 2, 2.5, '#e8c040'); q.rect(8, 27, 5, 1, 'leer'); });
});

// ---------- Jagd ----------
function feuer(q, x, y) {
  q.rect(x - 2, y, 5, 1, PAL.holzD).linie(x - 2, y - 1, x + 2, y, PAL.holz);
  q.px(x, y - 4, '#ffde7a').rect(x - 1, y - 3, 3, 2, '#f39c12').rect(x, y - 3, 1, 2, '#ffde7a').px(x - 1, y - 1, '#e04a1a').px(x + 1, y - 1, '#e04a1a').px(x, y - 1, '#f39c12');
}
function stein(q, x, y) { q.rect(x, y, 2, 1, PAL.steinD).px(x, y, PAL.stein); }
def('jagdlager', (p) => {
  fleck(p, 24, 25, 18, 4, '#7a7a4a');
  obj(p, (q) => {
    // Zelt (Tipi)
    q.poly([[8, 26], [24, 26], [16, 7]], '#c8a070');
    q.poly([[16, 7], [24, 26], [19, 26]], '#a07a50');
    q.linie(16, 7, 8, 26, '#e0c090');
    q.poly([[14, 26], [18, 26], [16, 19]], '#3a2410');
    q.linie(14, 5, 16, 8, PAL.holzD).linie(18, 5, 16, 8, PAL.holzD);
    q.rect(11, 18, 10, 1, '#8a3a20').px(13, 14, '#8a3a20').px(19, 14, '#8a3a20');
  });
  obj(p, (q) => {
    // Trockengestell mit Fell
    q.rect(30, 12, 1, 15, PAL.holzD).rect(40, 12, 1, 15, PAL.holzD).rect(29, 12, 13, 1, PAL.holz);
    q.karte(31, 13, ['.FFFFFFF.', 'FFfFFFfFF', '.FFwwwFF.', '.FFwwwFF.', '..FFFFF..', '.FF...FF.', '...FFF...'], { F: '#b8732a', f: '#8a4a14', w: '#e8c898' });
  });
  obj(p, (q) => { feuer(q, 27, 28); stein(q, 23, 28); stein(q, 30, 28); });
});
def('wildhege', (p) => {
  fleck(p, 24, 25, 19, 4, '#6a8a3a');
  obj(p, (q) => { tanne(q, 8, 22, 12); tanne(q, 14, 26, 8); });
  obj(p, (q) => {
    // Hochsitz
    q.linie(24, 28, 27, 10, PAL.holzD).linie(36, 28, 33, 10, PAL.holzD);
    for (let y = 14; y < 28; y += 3) q.rect(25 + Math.round((28 - y) / 6) - 1, y, 12 - Math.round((28 - y) / 3) + 2, 1, PAL.holz);
    q.rect(25, 6, 11, 6, PAL.holz).rect(25, 6, 11, 1, PAL.holzH).rect(27, 7, 7, 2, '#2a1a0a');
    for (let k = 0; k < 3; k++) q.rect(24 + k, 5 - k, 13 - 2 * k, 1, k ? '#4f7a3a' : '#3a5a2a');
    // Leiter
    q.linie(21, 28, 25, 12, PAL.holzH); q.linie(19, 28, 23, 12, PAL.holzH);
    for (let y = 14; y < 28; y += 3) q.linie(19 + Math.round((28 - y) / 4), y, 21 + Math.round((28 - y) / 4), y, PAL.holzH);
  });
  obj(p, (q) => {
    // Futterraufe
    q.rect(40, 21, 1, 7, PAL.holzD).rect(46 - 1, 21, 1, 7, PAL.holzD);
    q.poly([[38, 21], [42.5, 17], [47, 21]], '#6b4a2a');
    q.rect(41, 22, 4, 3, '#c8a050').px(42, 23, '#a8862a');
  });
});

// ---------- Wasser ----------
function boot(q, x, yb, segel = true, rumpf = PAL.holz) {
  q.rect(x, yb - 2, 10, 2, rumpf).rect(x + 1, yb, 8, 1, dunkel(rumpf, 0.3)).px(x - 1, yb - 3, rumpf).px(x + 10, yb - 3, rumpf);
  q.rect(x, yb - 2, 10, 1, hell(rumpf, 0.2));
  if (segel) {
    q.rect(x + 4, yb - 11, 1, 9, PAL.holzD);
    q.poly([[x + 5, yb - 10], [x + 5, yb - 4], [x + 9, yb - 4]], PAL.weiss);
    q.poly([[x + 3, yb - 9], [x + 3, yb - 4], [x, yb - 4]], PAL.stoff);
  }
}
def('fischerboote', (p) => {
  wellen(p, [[6, 23, 12], [25, 27, 14], [14, 29, 8], [32, 18, 9]]);
  obj(p, (q) => boot(q, 8, 22, true));
  obj(p, (q) => { boot(q, 27, 26, true, '#9a6a3a'); q.linie(26, 24, 22, 28, '#d9cfb4'); });
  p.rect(18, 27, 5, 1, '#d9cfb4');
});
def('fangflotte', (p) => {
  wellen(p, [[3, 28, 16], [26, 29, 16], [36, 20, 8]]);
  obj(p, (q) => {
    // Kutter
    q.poly([[4, 20], [34, 20], [31, 26], [7, 26]], '#2a4a7a');
    q.rect(4, 20, 30, 1, '#4a6a9a').rect(7, 25, 24, 1, '#c0392b');
    q.rect(9, 13, 10, 7, PAL.weiss).rect(17, 13, 2, 7, '#c8c4ba');
    q.rect(10, 15, 2, 2, PAL.glas).rect(13, 15, 2, 2, PAL.glas);
    q.rect(8, 12, 12, 1, '#c0392b');
    q.rect(12, 6, 1, 6, '#3a3a3a').px(12, 5, PAL.rot);
    // Ausleger mit Netz
    q.rect(26, 6, 1, 14, '#6b7682'); q.linie(26, 6, 33, 15, '#6b7682');
    q.linie(33, 15, 33, 19, '#3a3a3a');
    q.rect(21, 17, 4, 3, PAL.feuer).rect(21, 17, 4, 1, '#ffc060');
  });
  obj(p, (q) => {
    q.karte(34, 15, ['n.n.n', '.n.n.', 'n.n.n', '.n.n.'], { n: '#d9cfb4' });
  });
  obj(p, (q) => boot(q, 36, 27, false, PAL.holz));
});
def('oelplattform', (p) => {
  wellen(p, [[2, 28, 10], [34, 28, 12], [16, 30, 10]]);
  obj(p, (q) => {
    for (const x of [10, 18, 28, 36]) { q.rect(x, 18, 2, 11, '#c8a020'); q.px(x, 18, '#f1d040'); }
    q.linie(11, 27, 19, 20, '#a08010').linie(29, 27, 37, 20, '#a08010');
    q.rect(7, 15, 34, 4, '#6b7682').rect(7, 15, 34, 1, '#9aa5b1').rect(7, 18, 34, 1, '#3f4950');
    // Bohrturm
    q.linie(14, 14, 18, 2, '#c0392b').linie(22, 14, 19, 2, '#962d22');
    for (let y = 5; y < 14; y += 3) q.rect(15 + Math.round((14 - y) / 4) - 1, y, 8 - Math.round((14 - y) / 2) + 2, 1, '#c0392b');
    // Wohncontainer
    q.rect(26, 9, 12, 6, PAL.weiss).rect(26, 9, 12, 1, '#ffffff').rect(28, 11, 2, 2, PAL.glas).rect(32, 11, 2, 2, PAL.glas).rect(36, 9, 2, 6, '#c8c4ba');
    q.rect(30, 7, 7, 2, '#f1c40f').rect(32, 6, 2, 1, '#3a3a3a');
    // Fackel-Ausleger
    q.linie(40, 15, 45, 9, '#6b7682');
  });
  obj(p, (q) => { q.px(45, 6, '#ffde7a').rect(44, 7, 3, 2, '#f39c12').px(45, 8, '#ffde7a').px(46, 5, '#f39c12'); });
});
def('aquakultur', (p) => {
  wellen(p, [[2, 13, 6], [40, 28, 6]]);
  const ring = (cx, cy, rx, ry) => {
    p.ellipse(cx, cy, rx, ry, '#2a6aa8');
    obj(p, (q) => { q.ellipse(cx, cy, rx, ry, '#f39c12'); q.ellipse(cx, cy, rx - 1.3, ry - 1.1, 'leer'); });
    for (let x = cx - rx + 2; x < cx + rx - 1; x += 2) p.px(x, cy, '#5a9ad8');
    for (let x = cx - rx + 3; x < cx + rx - 1; x += 2) p.px(x, cy - 1, '#5a9ad8').px(x, cy + 1, '#5a9ad8');
  };
  ring(14, 17, 8, 4); ring(33, 15, 7, 3.5); ring(25, 25, 8, 4);
  obj(p, (q) => { for (const [x, y] of [[6, 22], [41, 21], [17, 29]]) { q.rect(x, y, 2, 2, PAL.weiss).px(x, y, PAL.rot).px(x + 1, y, PAL.rot); } });
  obj(p, (q) => { q.rect(38, 24, 7, 2, PAL.holz).rect(38, 24, 7, 1, PAL.holzH); });
});

// ---------- Öl an Land ----------
function pumpe(q, x, yb) {
  // Pferdekopfpumpe (22 breit): links Kurbel mit Gegengewicht, rechts der Pferdekopf über dem Bohrloch.
  q.rect(x, yb, 22, 1, '#3a3a40');
  q.linie(x + 9, yb, x + 11, yb - 9, '#5d6a73').linie(x + 13, yb, x + 11, yb - 9, '#3f4950');
  q.linie(x + 10, yb, x + 12, yb - 9, '#5d6a73');
  q.rect(x + 10, yb - 4, 3, 1, '#3f4950');
  q.rect(x + 2, yb - 4, 5, 4, '#6b7682').rect(x + 2, yb - 4, 5, 1, '#9aa5b1');
  q.kreis(x + 4, yb - 6, 2.4, '#c0392b'); q.px(x + 3, yb - 7, '#e86a5a').px(x + 4, yb - 6, '#3a3a40');
  q.linie(x + 5, yb - 7, x + 5, yb - 11, '#3a3a40');
  q.linie(x + 3, yb - 12, x + 18, yb - 10, '#2a2a30'); q.linie(x + 3, yb - 11, x + 18, yb - 9, '#4a4a55');
  q.karte(x + 17, yb - 14, ['.YYY', 'YYYYY', 'YYYYy', 'YYYyy', '.YYy.', '..Yy.', '...y.'], { Y: '#f1c40f', y: '#b8930a' });
  q.rect(x + 20, yb - 7, 1, 6, '#c8d0d8');
  q.rect(x + 19, yb - 2, 3, 2, '#5d6a73').rect(x + 19, yb - 2, 3, 1, '#9aa5b1');
  q.px(x + 11, yb - 10, '#9aa5b1');
}
def('bohrturm', (p) => {
  fleck(p, 24, 26, 18, 4, '#5a5048');
  p.ellipse(34, 27, 4, 1, '#15131c');
  obj(p, (q) => { tank(q, 3, 25, 7, 8, '#9a9a9a'); q.rect(3, 21, 7, 1, '#c0392b'); });
  obj(p, (q) => pumpe(q, 13, 27));
  obj(p, (q) => { q.rect(39, 24, 4, 4, '#3a5a7a').rect(39, 25, 4, 1, '#24405a').rect(39, 24, 4, 1, '#5a7a9a'); });
});
def('foerderanlage', (p) => {
  fleck(p, 24, 26, 21, 5, '#5a5048');
  obj(p, (q) => { tank(q, 27, 18, 9, 9, '#c8c4ba'); tank(q, 37, 19, 8, 8, '#c8c4ba'); q.rect(27, 14, 9, 1, '#c0392b'); q.rect(37, 15, 8, 1, '#c0392b'); });
  obj(p, (q) => pumpe(q, 2, 20));
  obj(p, (q) => pumpe(q, 14, 28));
  obj(p, (q) => { q.rect(36, 23, 11, 1, '#6b7682').rect(36, 24, 11, 1, '#3f4950'); q.rect(38, 22, 1, 3, '#3f4950').rect(44, 22, 1, 3, '#3f4950'); });
});

// ---------- Baustoffe ----------
def('lehmgrube', (p) => {
  p.ellipse(20, 20, 15, 6, '#d88a5a');
  p.ellipse(20, 21, 13, 4.5, '#a0552e');
  p.ellipse(20, 22, 10, 3, '#7a3a1e');
  p.ellipse(21, 23, 7, 1.6, '#5a2a14');
  p.rect(7, 16, 26, 1, '#e8a070');
  p.px(14, 21, '#c87443').px(25, 22, '#c87443').px(18, 24, '#8a4a28');
  obj(p, (q) => {
    for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) { const x = 30 + i * 4 - r * 2, y = 26 + r * -3; q.rect(x, y, 3, 2, '#d08048').rect(x, y, 3, 1, '#eaa070'); }
  });
  obj(p, (q) => { q.linie(10, 28, 15, 18, PAL.holz); q.rect(15, 15, 2, 3, PAL.eisenD).px(15, 15, PAL.eisen); });
  obj(p, (q) => { q.rect(5, 25, 6, 4, PAL.holz).rect(5, 25, 6, 1, PAL.holzH).rect(6, 24, 4, 1, '#c87443'); q.px(5, 29, '#22201e').px(10, 29, '#22201e'); });
});
def('salzwerk', (p) => {
  for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) {
    const x = 4 + i * 11 + (1 - r) * 3, y = 15 + r * 7;
    p.rect(x, y, 10, 5, '#d8cfb8'); p.rect(x + 1, y + 1, 8, 3, i === 1 && r === 0 ? '#9cc8e8' : '#f4f4f8'); p.px(x + 2, y + 1, '#ffffff').px(x + 6, y + 2, '#dfe8ff');
    if (i === 1 && r === 0) p.px(x + 3, y + 2, '#ffffff');
  }
  obj(p, (q) => {
    q.poly([[36, 27], [46, 27], [41, 20]], '#ffffff'); q.poly([[41, 20], [46, 27], [43, 27]], '#d8d4e0');
  });
  obj(p, (q) => { haus(q, 34, 16, 9, 6, 3, PAL.holzH, '#6b4a2a'); q.rect(40, 5, 2, 4, PAL.backstein); });
  obj(p, (q) => rauch(q, 41, 3, 2));
  obj(p, (q) => { q.linie(2, 29, 6, 23, PAL.holz); q.rect(6, 21, 3, 2, PAL.holzD); });
});
def('pilzzucht', (p) => {
  for (let r = 0; r < 3; r++) p.rect(5 + (2 - r) * 2, 16 + r * 5, 26, 2, '#4a3a5a');
  for (const [x, y] of [[4, 12], [38, 14], [30, 9], [12, 29]]) p.px(x, y, '#b6fff0');
  obj(p, (q) => {
    for (let r = 0; r < 3; r++) for (let i = 0; i < 5; i++) {
      const x = 8 + (2 - r) * 2 + i * 5, y = 16 + r * 5, c = (i + r) % 2 ? '#36d6c4' : '#b06ae0';
      q.rect(x, y - 1, 1, 2, '#e4dcc8'); q.rect(x - 1, y - 3, 3, 2, c).px(x, y - 4, c).px(x - 1, y - 3, hell(c, 0.5));
    }
  });
  obj(p, (q) => { haus(q, 36, 27, 8, 6, 3, '#6a5a7a', '#3a2a4a'); q.rect(41, 23, 2, 2, '#36d6c4'); });
});
def('irrlichtschrein', (p) => {
  p.ellipse(24, 22, 15, 6, '#3a4a3a');
  p.ellipse(24, 22, 9, 3.5, '#4a8a7a');
  p.ellipse(24, 22, 5, 2, '#7adac0');
  const menhir = (q, x, yb, h) => { q.rect(x, yb - h + 1, 3, h, '#8a8f88').rect(x, yb - h + 1, 1, h, '#b0b5ac').rect(x + 2, yb - h + 2, 1, h - 1, '#5f645c').px(x + 1, yb - h, '#8a8f88').px(x + 1, yb - h + 3, '#7adac0'); };
  obj(p, (q) => { menhir(q, 15, 17, 8); menhir(q, 23, 15, 9); menhir(q, 31, 17, 8); });
  obj(p, (q) => {
    q.kreis(24, 12, 3, '#4ad8b0'); q.kreis(24, 12, 1.8, '#a8ffe0'); q.px(24, 12, '#ffffff');
    q.px(23, 16, '#4ad8b0').px(24, 17, '#2a9a90');
  });
  obj(p, (q) => { menhir(q, 8, 25, 8); menhir(q, 37, 25, 8); menhir(q, 16, 29, 7); menhir(q, 30, 29, 7); });
  for (const [x, y] of [[6, 10], [42, 12], [12, 4], [37, 5]]) p.px(x, y, '#a8ffe0');
});

// ---------- Handel/Wissen ----------
function stand(q, x, yb, c1, c2) {
  q.rect(x, yb - 4, 12, 5, PAL.holz).rect(x, yb - 4, 12, 1, PAL.holzH);
  q.rect(x + 1, yb - 10, 1, 6, PAL.holzD).rect(x + 10, yb - 10, 1, 6, PAL.holzD);
  for (let i = 0; i < 14; i++) q.rect(x - 1 + i, yb - 12, 1, 3, (i >> 1) % 2 ? c2 : c1);
  for (let i = 0; i < 14; i += 2) q.px(x - 1 + i, yb - 9, (i >> 1) % 2 ? c2 : c1);
  q.px(x + 3, yb - 5, '#e0402a').px(x + 4, yb - 5, '#f1c40f').px(x + 6, yb - 5, '#5aa84f').px(x + 8, yb - 5, '#f39c12').px(x + 7, yb - 5, '#e0402a');
}
function kiste(q, x, yb, s = 4) { q.rect(x, yb - s + 1, s, s, '#b07a42').rahmen(x, yb - s + 1, s, s, '#7a4a20').px(x + 1, yb - s + 2, '#d8a868'); }
function sack(q, x, yb) { q.rect(x, yb - 3, 4, 4, PAL.stoff).px(x, yb - 3, 'leer').px(x + 3, yb - 3, 'leer').rect(x + 1, yb - 4, 2, 1, PAL.stoffD).px(x + 3, yb - 1, PAL.stoffD); }
def('handelsposten', (p) => {
  fleck(p, 24, 25, 18, 4, '#b8a070');
  obj(p, (q) => stand(q, 10, 25, '#c0392b', '#f4f1ea'));
  obj(p, (q) => { kiste(q, 26, 26, 5); kiste(q, 29, 22, 4); sack(q, 33, 27); sack(q, 37, 26); q.px(34, 23, '#f39c12').px(38, 22, '#e0402a'); });
  obj(p, (q) => { q.rect(6, 27, 1, 1, 'leer'); q.ellipse(7, 26, 2, 1.5, '#a86a3a'); q.rect(6, 23, 3, 2, '#a86a3a').px(7, 22, '#a86a3a'); });
});
def('handelshaus', (p) => {
  fleck(p, 24, 26, 20, 4, '#b8a070');
  obj(p, (q) => {
    // Fachwerk-Kontor, zweistöckig
    const x = 10, yb = 26;
    q.rect(x, yb - 15, 20, 16, PAL.putz).rect(x + 15, yb - 15, 5, 16, PAL.putzD);
    for (const xx of [x, x + 5, x + 10, x + 15, x + 19]) q.rect(xx, yb - 15, 1, 16, PAL.holzD);
    q.rect(x, yb - 8, 20, 1, PAL.holzD).rect(x, yb - 15, 20, 1, PAL.holzD);
    q.linie(x, yb - 8, x + 5, yb - 15, PAL.holzD).linie(x + 15, yb - 15, x + 19, yb - 8, PAL.holzD);
    for (const xx of [x + 2, x + 7, x + 12]) q.rect(xx, yb - 13, 2, 3, PAL.glas);
    q.rect(x + 7, yb - 5, 5, 6, '#4a2e14').rect(x + 2, yb - 5, 3, 3, PAL.glas);
    for (let k = 0; k < 7; k++) q.rect(x - 1 + k, yb - 16 - k, 22 - 2 * k, 1, k ? PAL.ziegel : PAL.ziegelD).px(x - 1 + k, yb - 16 - k, hell(PAL.ziegel, 0.25));
    q.rect(x + 8, yb - 21, 3, 3, PAL.putz).rect(x + 9, yb - 20, 1, 1, '#4a2e14');
    // Kranbalken
    q.rect(x + 9, yb - 23, 1, 2, PAL.holzD).rect(x + 10, yb - 23, 5, 1, PAL.holzD).rect(x + 14, yb - 22, 1, 5, '#3a3a3a');
  });
  obj(p, (q) => { kiste(q, 32, 27, 5); kiste(q, 37, 27, 5); kiste(q, 34, 22, 5); sack(q, 42, 27); sack(q, 5, 27); });
});
def('bergobservatorium', (p) => {
  obj(p, (q) => {
    felsen(q, 24, 28, 17, 6, '#8a857a');
    // Kuppel
    q.ellipse(24, 13, 8, 8, '#e8ecf0'); q.rect(14, 14, 20, 8, 'leer');
    q.rect(16, 12, 16, 2, '#c8d0d8');
    q.ellipse(21, 8, 2, 2, '#ffffff');
    // Sockel
    q.rect(15, 14, 18, 10, PAL.steinH).rect(15, 14, 18, 1, '#e4e0d8').rect(29, 14, 4, 10, PAL.stein);
    for (let y = 16; y < 24; y += 3) q.rect(15, y, 14, 1, PAL.stein);
    q.rect(22, 19, 4, 5, '#4a2e14');
    q.rect(25, 5, 2, 8, '#2a3550');
    // Fernrohr
    q.linie(26, 8, 33, 2, '#b08a3e').linie(27, 8, 34, 2, '#8a5f26').px(34, 1, '#c8d0d8');
  });
  for (const [x, y] of [[6, 4], [40, 8], [10, 10], [44, 3]]) p.px(x, y, '#fff6c0');
});
def('ferienanlage', (p) => {
  fleck(p, 24, 24, 20, 6, '#e8d8a0');
  p.rect(22, 21, 14, 6, '#4ab8e8'); p.rect(22, 21, 14, 1, '#ffffff'); p.rahmen(21, 20, 16, 8, '#f4f1ea'); p.px(26, 23, '#bfefff').px(31, 24, '#bfefff');
  obj(p, (q) => {
    haus(q, 4, 22, 14, 7, 4, PAL.weiss, '#e07a3a');
    q.rect(6, 17, 3, 2, PAL.glas).rect(13, 17, 3, 2, PAL.glas);
  });
  obj(p, (q) => {
    // Palme
    q.linie(41, 26, 39, 10, '#8a5a2b').linie(42, 26, 40, 10, '#6b4420');
    bez(q, [40, 9], [45, 7], [47, 12], 0.5, 0, '#2a9a4a'); bez(q, [40, 9], [35, 6], [33, 11], 0.5, 0, '#2a9a4a');
    bez(q, [40, 9], [42, 4], [46, 4], 0.5, 0, '#3db85a'); bez(q, [40, 9], [37, 4], [34, 5], 0.5, 0, '#3db85a');
  });
  obj(p, (q) => {
    // Sonnenschirm
    q.rect(16, 24, 1, 5, PAL.holzD);
    for (let i = 0; i < 9; i++) q.rect(12 + i, 23 - (i < 5 ? i >> 1 : (8 - i) >> 1), 1, 1 + (i < 5 ? i >> 1 : (8 - i) >> 1), i % 2 ? '#ffffff' : '#e03a3a');
    q.rect(9, 28, 6, 1, '#ffffff').rect(9, 27, 2, 1, '#ffffff');
  });
});
function muehlrad(q, cx, cy, r) {
  q.kreis(cx, cy, r, PAL.holzD); q.kreis(cx, cy, r - 1.4, 'leer');
  for (let a = 0; a < 8; a++) { const ang = a * Math.PI / 4; q.linie(cx, cy, cx + Math.round(Math.cos(ang) * r), cy + Math.round(Math.sin(ang) * r), PAL.holz); q.px(cx + Math.round(Math.cos(ang) * (r + 0.6)), cy + Math.round(Math.sin(ang) * (r + 0.6)), PAL.holzH); }
  q.kreis(cx, cy, 1, PAL.eisenD);
}
def('wassermuehle', (p) => {
  p.rect(26, 23, 20, 7, PAL.wasser); p.rect(26, 23, 20, 1, PAL.wasserH); wellen(p, [[36, 26, 6]]);
  obj(p, (q) => {
    haus(q, 6, 26, 18, 11, 6, PAL.putz, '#7a4a2a');
    for (const xx of [6, 12, 18, 23]) q.rect(xx, 16, 1, 11, PAL.holzD);
    q.rect(6, 21, 18, 1, PAL.holzD);
    q.rect(9, 17, 2, 3, PAL.glas).rect(19, 17, 2, 3, PAL.glas).rect(14, 22, 3, 5, '#4a2e14');
  });
  obj(p, (q) => muehlrad(q, 30, 20, 7));
  p.rect(34, 26, 4, 2, '#ffffff'); p.px(28, 27, '#ffffff');
});
def('wasserkraftwerk', (p) => {
  p.rect(2, 12, 44, 5, PAL.wasser); p.rect(2, 12, 44, 1, PAL.wasserH);
  p.rect(2, 25, 44, 6, '#4a8fd0'); wellen(p, [[8, 27, 8], [30, 28, 8]]);
  obj(p, (q) => {
    // Staumauer
    q.poly([[2, 17], [46, 17], [44, 25], [4, 25]], PAL.beton);
    q.rect(2, 17, 44, 1, '#c8ccce'); q.rect(4, 24, 40, 1, PAL.betonD);
    for (const x of [10, 20, 30]) { q.rect(x, 19, 4, 6, '#3a5a7a'); q.rect(x, 19, 4, 1, '#24405a'); }
    // Turbinenhaus
    q.rect(31, 9, 12, 8, '#d8dcde').rect(31, 9, 12, 1, '#ffffff').rect(40, 9, 3, 8, '#a8acae');
    for (const x of [33, 36]) q.rect(x, 11, 2, 3, PAL.glas);
    q.rect(38, 4, 1, 5, '#6b7682'); q.linie(38, 4, 44, 6, '#6b7682'); q.px(44, 7, '#f1c40f');
  });
  for (const x of [11, 21, 31]) { p.rect(x, 25, 2, 3, '#ffffff'); p.px(x + 1, 28, '#bfe2ff'); }
});
function windrad(q, x, yb, h) {
  q.rect(x, yb - h, 1, h + 1, '#e4e8ec').px(x + 1, yb - Math.floor(h / 2), '#b8c0c8');
  const hy = yb - h;
  q.rect(x - 1, hy - 1, 3, 2, '#ffffff');
  q.linie(x, hy, x, hy - 8, '#ffffff'); q.linie(x, hy, x + 7, hy + 4, '#ffffff'); q.linie(x, hy, x - 7, hy + 4, '#ffffff');
  q.px(x + 1, hy - 6, '#c8d0d8').px(x + 5, hy + 4, '#c8d0d8').px(x - 5, hy + 4, '#c8d0d8');
}
def('windpark', (p) => {
  fleck(p, 24, 24, 20, 5, '#7cc05a');
  obj(p, (q) => windrad(q, 34, 20, 12));
  obj(p, (q) => windrad(q, 12, 22, 12));
  obj(p, (q) => windrad(q, 24, 28, 15));
});
def('solarpark', (p) => {
  fleck(p, 24, 22, 21, 7, '#d8c890');
  obj(p, (q) => {
    for (let r = 0; r < 3; r++) for (let i = 0; i < 3; i++) {
      const x = 4 + i * 14 + (2 - r) * 2, y = 11 + r * 6;
      q.poly([[x + 1, y], [x + 12, y], [x + 11, y + 4], [x, y + 4]], '#2a4a9a');
      q.rect(x + 1, y, 11, 1, '#6a9ae0');
      q.rect(x + 1 + 3, y + 1, 1, 3, '#8ab0f0').rect(x + 7, y + 1, 1, 3, '#8ab0f0');
      q.rect(x, y + 2, 12, 1, '#4a6ac0');
      q.rect(x + 3, y + 5, 1, 1, '#6b7682').rect(x + 9, y + 5, 1, 1, '#6b7682');
    }
  });
});

// ---------- Militär ----------
function pfahl(q, x, yb, h) { q.rect(x, yb - h + 1, 2, h, PAL.holz).px(x, yb - h + 1, PAL.holzH).px(x + 1, yb - h, PAL.holzD).px(x, yb - h, PAL.holz); q.px(x + 1, yb, PAL.holzD); }
def('fort', (p) => {
  fleck(p, 24, 22, 19, 7, '#8a7a50');
  obj(p, (q) => {
    // hintere Palisade
    for (let x = 8; x < 40; x += 2) pfahl(q, x, 15 - Math.round(Math.abs(x - 24) * 0.15), 7);
    haus(q, 19, 17, 10, 4, 3, PAL.holzH, '#5a3a1a', false);
  });
  obj(p, (q) => fahne(q, 30, 10, 9));
  obj(p, (q) => {
    // seitliche Palisaden
    for (let y = 14; y < 26; y += 2) { pfahl(q, 6 - Math.round((y - 14) * 0.25), y + 3, 7); pfahl(q, 40 + Math.round((y - 14) * 0.25), y + 3, 7); }
  });
  obj(p, (q) => {
    // vordere Palisade mit Tor
    for (let x = 4; x < 44; x += 2) if (x < 20 || x > 26) pfahl(q, x, 29, 8);
    q.rect(20, 22, 8, 8, '#4a2e14').rect(20, 22, 8, 1, PAL.holzD).rect(23, 22, 2, 8, PAL.holzD);
    // Wachtürmchen
    q.rect(17, 14, 4, 15, PAL.holz).rect(16, 13, 6, 2, PAL.holzD).rect(27, 14, 4, 15, PAL.holz).rect(26, 13, 6, 2, PAL.holzD);
    q.rect(17, 14, 1, 15, PAL.holzH).rect(27, 14, 1, 15, PAL.holzH);
  });
});
function bastion(q, x, yb, b, h) {
  q.rect(x, yb - h + 1, b, h, PAL.stein); q.rect(x, yb - h + 1, b, 1, PAL.steinH); q.rect(x + b - 2, yb - h + 2, 2, h - 1, PAL.steinD);
  for (let i = 0; i < b; i += 2) q.px(x + i, yb - h, PAL.stein);
  for (let y = yb - h + 3; y < yb; y += 3) for (let i = ((y >> 1) % 2) * 2; i < b - 2; i += 4) q.px(x + i, y, PAL.steinD);
}
def('festung', (p) => {
  fleck(p, 24, 23, 21, 7, '#7a7a60');
  obj(p, (q) => { bastion(q, 9, 18, 30, 7); bastion(q, 20, 12, 8, 9); q.rect(23, 7, 2, 3, '#22201e'); });
  obj(p, (q) => fahne(q, 24, 3, 7));
  obj(p, (q) => {
    // Eckbastionen vorn (spitz)
    q.poly([[2, 25], [8, 19], [14, 25], [8, 30]], PAL.stein); q.linie(2, 25, 8, 19, PAL.steinH); q.linie(8, 30, 14, 25, PAL.steinD);
    q.poly([[34, 25], [40, 19], [46, 25], [40, 30]], PAL.stein); q.linie(34, 25, 40, 19, PAL.steinH); q.linie(40, 30, 46, 25, PAL.steinD);
    bastion(q, 12, 28, 24, 8);
    q.rect(21, 23, 6, 6, '#22201e').rect(22, 22, 4, 1, '#22201e');
    q.rect(21, 23, 6, 1, PAL.holzD);
    q.px(8, 24, '#22201e').px(40, 24, '#22201e');
  });
});
def('bunkeranlage', (p) => {
  fleck(p, 24, 23, 21, 7, '#6a6a50');
  // Schützengraben
  p.linie(3, 20, 12, 17, '#3a3020').linie(12, 17, 20, 19, '#3a3020').linie(28, 18, 36, 16, '#3a3020').linie(36, 16, 45, 19, '#3a3020');
  p.linie(3, 21, 12, 18, '#2a2418').linie(12, 18, 20, 20, '#2a2418').linie(28, 19, 36, 17, '#2a2418').linie(36, 17, 45, 20, '#2a2418');
  obj(p, (q) => {
    q.ellipse(24, 17, 9, 5, PAL.beton); q.rect(14, 18, 21, 5, 'leer');
    q.rect(15, 17, 19, 6, PAL.beton); q.rect(15, 17, 19, 1, '#c8ccce'); q.rect(31, 17, 3, 6, PAL.betonD);
    q.rect(19, 19, 10, 2, '#22201e');
    q.ellipse(22, 13, 3, 1, '#c8ccce');
  });
  obj(p, (q) => fahne(q, 31, 13, 8));
  obj(p, (q) => {
    // Sandsäcke
    for (let i = 0; i < 7; i++) { q.ellipse(6 + i * 3, 27, 1.5, 1, PAL.khaki); q.px(5 + i * 3, 26, '#c8ba8a'); }
    for (let i = 0; i < 6; i++) { q.ellipse(7.5 + i * 3, 25, 1.5, 1, PAL.khaki); q.px(6.5 + i * 3, 24, '#c8ba8a'); }
    q.ellipse(38, 24, 6, 3.5, PAL.beton); q.rect(31, 25, 15, 4, 'leer'); q.rect(32, 24, 12, 3, PAL.beton); q.rect(34, 24, 7, 1, '#22201e'); q.rect(32, 21, 4, 1, '#c8ccce');
    q.linie(30, 23, 26, 23, PAL.stahlD);
  });
});
def('aussenposten', (p) => {
  fleck(p, 24, 25, 14, 4, '#7a6a48');
  obj(p, (q) => fahne(q, 31, 24, 12));
  obj(p, (q) => {
    // Feuerschale auf Dreibein
    q.linie(19, 28, 23, 19, PAL.holzD).linie(27, 28, 23, 19, PAL.holzD).linie(23, 28, 23, 19, PAL.holz);
    q.rect(19, 17, 9, 3, PAL.eisenD).rect(19, 17, 9, 1, PAL.eisen).rect(20, 20, 7, 1, PAL.stahlD);
    q.rect(20, 14, 7, 3, '#f39c12').rect(21, 12, 5, 2, '#f39c12').rect(22, 10, 3, 2, '#ffde7a').px(23, 8, '#ffde7a').px(21, 11, '#e04a1a').px(25, 11, '#e04a1a').rect(22, 14, 3, 2, '#ffde7a');
    q.px(19, 13, '#e04a1a').px(27, 13, '#e04a1a');
  });
  obj(p, (q) => { stapel(q, 10, 28, 2); q.ellipse(36, 27, 2, 1.3, PAL.stein); });
  for (const [x, y] of [[20, 5], [27, 4], [24, 2]]) p.px(x, y, '#ffde7a');
});
def('beobachtungsposten', (p) => {
  fleck(p, 24, 27, 13, 3, '#7a6a48');
  obj(p, (q) => {
    // Holzturm
    q.linie(17, 29, 21, 9, PAL.holz).linie(31, 29, 27, 9, PAL.holzD);
    q.linie(18, 29, 22, 9, PAL.holzH).linie(30, 29, 26, 9, PAL.holzD);
    for (let y = 13; y < 29; y += 5) q.rect(19 + Math.round((29 - y) * 0.1) - 1, y, 12 - Math.round((29 - y) * 0.2) + 2, 1, PAL.holzD);
    q.linie(20, 13, 29, 18, PAL.holzD).linie(28, 13, 19, 23, PAL.holzD);
    q.rect(17, 7, 14, 3, PAL.holz).rect(17, 7, 14, 1, PAL.holzH);
    q.rect(18, 4, 1, 3, PAL.holzD).rect(29, 4, 1, 3, PAL.holzD);
    for (let k = 0; k < 3; k++) q.rect(16 + k, 3 - k, 16 - 2 * k, 1, k ? '#6b4a2a' : '#4a3018');
    // Fernrohr
    q.linie(24, 6, 29, 4, '#b08a3e');
  });
  obj(p, (q) => fahne(q, 30, 10, 8));
});
def('radarstation', (p) => {
  fleck(p, 24, 26, 19, 4, '#7a7a68');
  obj(p, (q) => {
    // Gittermast
    q.linie(18, 26, 22, 12, PAL.stahl).linie(28, 26, 24, 12, PAL.stahlD);
    for (let y = 14; y < 26; y += 4) { q.rect(19 + Math.round((26 - y) * 0.28) - 1, y, 10 - Math.round((26 - y) * 0.56) + 2, 1, PAL.stahlD); }
    q.linie(20, 18, 26, 22, PAL.stahl).linie(26, 18, 20, 22, PAL.stahl);
    // Schüssel
    q.ellipse(23, 7, 9, 5, '#e8ecf0'); q.ellipse(24, 6, 7, 3.5, '#c8d0d8'); q.ellipse(25, 5, 4, 2, '#a8b0b8');
    q.linie(23, 7, 30, 1, PAL.stahlD); q.px(30, 1, PAL.rot);
    q.rect(22, 11, 3, 2, PAL.stahl);
  });
  obj(p, (q) => { q.rect(32, 20, 11, 7, '#c8ccce').rect(32, 20, 11, 1, '#e4e8ea').rect(40, 20, 3, 7, PAL.betonD).rect(34, 22, 2, 2, PAL.glas).rect(37, 23, 2, 4, '#3a3a40'); fahne(q, 42, 19, 8); });
  obj(p, (q) => { q.rect(6, 23, 8, 5, PAL.tarn).rect(6, 23, 8, 1, '#8a9a5a').rect(8, 25, 3, 3, '#3a3a40'); });
});
def('leuchtturm_feld', (p) => {
  obj(p, (q) => {
    felsen(q, 24, 29, 15, 4, '#7a756c');
    q.poly([[18, 27], [30, 27], [28, 8], [20, 8]], PAL.weiss);
    for (const y of [10, 17, 24]) q.poly([[20 - (y - 8) * 0.1, y], [28 + (y - 8) * 0.1, y], [28 + (y + 3 - 8) * 0.1, y + 3], [20 - (y + 3 - 8) * 0.1, y + 3]], '#d42a1a');
    q.poly([[26, 27], [30, 27], [28, 8], [26, 8]], dunkel(PAL.weiss, 0.12));
    for (const y of [10, 17, 24]) q.rect(26, y, 3, 4, '#a01a10');
    q.rect(18, 7, 12, 1, '#3a3a3a');
    q.rect(20, 3, 8, 4, '#fff27a').rect(21, 3, 1, 4, '#3a3a3a').rect(26, 3, 1, 4, '#3a3a3a');
    q.rect(19, 2, 10, 1, '#d42a1a').rect(21, 1, 6, 1, '#d42a1a').rect(23, 0, 2, 1, '#3a3a3a');
    q.rect(23, 22, 2, 5, '#4a2e14');
  });
  p.linie(19, 5, 4, 2, '#fff6a0'); p.linie(19, 5, 4, 8, '#fff6a0'); p.linie(29, 5, 44, 2, '#fff6a0'); p.linie(29, 5, 44, 8, '#fff6a0');
});
def('bruecke', (p) => {
  obj(p, (q) => {
    q.rect(2, 12, 44, 16, PAL.stein);
    q.ellipse(24, 31, 15, 13, 'leer');
    q.rect(2, 10, 44, 2, '#b8b2a6').rect(2, 12, 44, 1, PAL.steinH);
    for (let x = 2; x < 46; x += 3) q.px(x, 9, '#b8b2a6');
    q.rect(2, 13, 1, 15, PAL.steinH);
    for (let y = 15; y < 28; y += 3) for (let x = 3 + (y % 2) * 2; x < 45; x += 4) if (q.hole(x, y)) q.px(x, y, PAL.steinD);
    for (let a = 0; a <= 14; a++) { const ang = Math.PI + a * Math.PI / 14; const x = Math.round(24 + Math.cos(ang) * 16), y = Math.round(31 + Math.sin(ang) * 14); if (q.hole(x, y)) q.px(x, y, '#c9c4ba'); }
    q.rect(43, 13, 3, 15, PAL.steinD);
  });
});
def('kanal', (p) => {
  obj(p, (q) => {
    q.poly([[2, 18], [46, 14], [46, 24], [2, 28]], PAL.stein);
    q.poly([[2, 19], [46, 15], [46, 22], [2, 26]], PAL.wasser);
    q.linie(2, 19, 46, 15, PAL.wasserH);
    q.linie(2, 18, 46, 14, PAL.steinH);
    for (let x = 4; x < 46; x += 4) { q.px(x, 18 - Math.round(x / 11), PAL.steinD); q.px(x + 1, 27 - Math.round(x / 11), PAL.steinD); }
  });
  wellen(p, [[8, 22, 5], [32, 19, 5]]);
  obj(p, (q) => {
    // Schleusentore
    q.rect(22, 13, 2, 13, PAL.holz).rect(22, 13, 1, 13, PAL.holzH); q.rect(26, 12, 2, 13, PAL.holzD);
    q.rect(20, 11, 10, 2, PAL.holzD).rect(20, 11, 10, 1, PAL.holz);
    q.rect(21, 9, 1, 2, PAL.eisenD).rect(28, 9, 1, 2, PAL.eisenD).linie(17, 10, 21, 9, PAL.holzD);
  });
});

// ---------- Wege (nur Symbole 16x16) ----------
function weg(id, zeichne) { definiere('verbesserung', id, { w: 16, h: 16, zeichne: (p) => { zeichne(p); rand(p); } }); }
weg('pfad', (p) => {
  bez(p, [3, 14], [2, 7], [8, 7], 1.6, 1.3, '#b08a5a');
  bez(p, [8, 7], [14, 7], [12, 1.5], 1.3, 1, '#b08a5a');
  p.px(4, 11, '#8a6a40').px(6, 8, '#8a6a40').px(11, 5, '#8a6a40').px(3, 9, '#d0aa78').px(9, 6, '#d0aa78');
  p.px(1, 4, '#5aa84f').px(2, 3, '#5aa84f').px(13, 11, '#5aa84f').px(14, 12, '#3d7f38');
});
weg('strasse', (p) => {
  p.poly([[2, 14], [7, 1], [10, 1], [14, 14]], '#b8a888');
  p.linie(2, 14, 7, 1, '#8a7a5a').linie(14, 14, 10, 1, '#8a7a5a');
  for (const [x, y] of [[6, 10], [9, 6], [10, 12], [8, 3], [5, 13]]) p.px(x, y, '#9a8a6a');
  for (const [x, y] of [[7, 7], [11, 9], [8, 12]]) p.px(x, y, '#d8ccb0');
});
weg('pflasterstrasse', (p) => {
  p.poly([[2, 14], [7, 1], [10, 1], [14, 14]], '#6a6862');
  for (let y = 2; y < 14; y += 2) {
    const l = 7 - (y - 1) * 5 / 13, r = 10 + (y - 1) * 4 / 13;
    for (let x = Math.ceil(l) + ((y >> 1) % 2); x < r; x += 2) p.rect(x, y, 1, 1, '#a9a49a').px(x, y + 1, '#8a857a');
  }
  p.linie(2, 14, 7, 1, '#c9c4ba').linie(14, 14, 10, 1, '#c9c4ba');
});
weg('eisenbahn', (p) => {
  for (let y = 2; y <= 13; y += 2) p.rect(3 + Math.round((13 - y) * 0.15), y, 10 - Math.round((13 - y) * 0.3), 1, PAL.holz);
  p.linie(5, 14, 7, 1, '#8a96a2').linie(11, 14, 9, 1, '#8a96a2');
  p.linie(6, 14, 8, 1, '#c8d0d8').linie(12, 14, 10, 1, '#5d6a73');
});
weg('autobahn', (p) => {
  p.poly([[2, 14], [6, 1], [10, 1], [14, 14]], '#3e4248');
  p.linie(2, 14, 6, 1, "#f4f1ea").linie(14, 14, 10, 1, '#f4f1ea');
  for (let y = 2; y < 14; y += 4) p.rect(8, y, 1, 2, '#f1c40f');
  p.px(4, 9, '#5a6068').px(12, 6, '#5a6068');
});
