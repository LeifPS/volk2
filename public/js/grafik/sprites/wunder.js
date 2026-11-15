// Weltwunder (64x64): große, detaillierte Einzelbilder. Licht von oben links, Umriss automatisch.
import { definiere } from '../sprites.js';
import { PAL, hell, dunkel } from '../pixel.js';

const D = (c, t = 0.28) => dunkel(c, t);
const L = (c, t = 0.2) => hell(c, t);
const C = {
  sand: '#e2c584', sandH: '#f2dca4', sandD: '#b89656', sonne: '#ffd23a', sonneH: '#fff2a0', marmor: '#f2eee4', marmorD: '#cfc8b8',
  bronze: '#c8913e', bronzeH: '#e8b868', bronzeD: '#8a5a22', gruenspan: '#6fb39a', gruenspanH: '#9ad4bc', gruenspanD: '#3f7f6a',
  wasser: '#3d7fc4', wasserH: '#8fc0ee', wasserD: '#2a5a94', gras: '#5aa84f', grasD: '#3d7f38', grasH: '#7cc46a',
  glas: '#9fd0ec', glasD: '#5a94bc', eisen: '#e8eef2', terra: '#c4623e', palme: '#3d8f3a', palmeH: '#5ab04a',
};

function kuppel(p, cx, yb, r, c, ry = r) {
  for (let y = Math.round(yb - ry); y <= yb; y++) {
    const t = (yb - y) / (ry + 0.4), hw = Math.sqrt(Math.max(0, 1 - t * t)) * (r + 0.4);
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const u = (x - cx) / (r + 0.5);
      p.px(x, y, u < -0.35 && t > 0.2 ? L(c, 0.3) : u > 0.4 ? D(c, 0.22) : c);
    }
  }
}
/** Zwiebelkuppel: Basis bei yb, Breite r, Höhe h, Spitze oben. */
function zwiebel(p, cx, yb, r, h, c) {
  for (let j = 0; j <= h; j++) {
    const t = j / h; // 0 unten, 1 oben
    const w = t < 0.55 ? r * Math.sin((0.35 + t / 0.55 * 0.65) * Math.PI / 2 + 0.25) : r * (1 - (t - 0.55) / 0.45) ** 1.4;
    const y = yb - j;
    for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) { const u = (x - cx) / (w + 0.5); p.px(x, y, u < -0.3 ? L(c, 0.25) : u > 0.45 ? D(c, 0.2) : c); }
  }
  p.rect(Math.round(cx), yb - h - 3, 1, 3, PAL.gold);
}
function palme(p, x, yb, h) {
  for (let j = 0; j < h; j++) p.px(x + Math.round(Math.sin(j / h * 1.6) * 2), yb - j, j % 2 ? '#8a6a3a' : '#a8844a');
  const tx = x + Math.round(Math.sin(1.6) * 2), ty = yb - h;
  for (const [dx, dy] of [[-5, 2], [5, 2], [-4, -2], [4, -2], [0, -3], [-6, 4], [6, 4]]) p.linie(tx, ty, tx + dx, ty + dy, C.palme);
  p.linie(tx, ty, tx - 4, ty - 2, C.palmeH); p.linie(tx, ty, tx + 5, ty + 2, C.palmeH);
  p.px(tx, ty + 1, '#6a4a20').px(tx + 1, ty + 1, '#6a4a20');
}
function wasser(p, x, y, w, h) {
  p.rect(x, y, w, h, C.wasser);
  for (let j = 0; j < h; j += 2) for (let i = (j * 3) % 7; i < w - 3; i += 7) p.rect(x + i, y + j, 3, 1, j === 0 ? C.wasserH : '#6aa6e0');
}
function saeulen(p, x, yb, n, abst, h, c = C.marmor) {
  for (let i = 0; i < n; i++) { const xx = x + i * abst; p.rect(xx, yb - h + 1, 3, h, c); p.px(xx, yb - h + 1, L(c, 0.3)); p.rect(xx + 2, yb - h + 1, 1, h, D(c, 0.18)); p.rect(xx - 1, yb - h + 1, 5, 1, D(c, 0.08)); p.rect(xx - 1, yb, 5, 1, D(c, 0.12)); }
}
function w(id, zeichne) { definiere('wunder', id, { w: 64, h: 64, zeichne }); }

// ---------- Pyramiden ----------
w('pyramiden', (p) => {
  // Sonne mit Strahlen
  p.kreis(47, 13, 7, C.sonne); p.kreis(45, 11, 4, '#ffe066'); p.kreis(44, 10, 2, C.sonneH);
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; p.linie(47 + Math.cos(a) * 9, 13 + Math.sin(a) * 9, 47 + Math.cos(a) * 11, 13 + Math.sin(a) * 11, C.sonne); }
  // Wüstenboden
  p.ellipse(32, 57, 30, 5, C.sand); p.rect(1, 57, 62, 5, C.sand);
  p.ellipse(18, 59, 10, 1, C.sandH); p.ellipse(48, 60, 8, 1, C.sandD);
  const pyr = (cx, yb, hb, hh) => {
    p.poly([[cx - hb, yb], [cx, yb - hh], [cx, yb]], C.sandH);
    p.poly([[cx, yb - hh], [cx + hb, yb], [cx, yb]], C.sandD);
    for (let y = yb - hh + 3; y < yb; y += 3) { const w2 = (y - (yb - hh)) * hb / hh; p.linie(cx - w2 + 1, y, cx - 1, y, C.sand); p.linie(cx + 1, y, cx + w2 - 1, y, D(C.sandD, 0.12)); }
    p.linie(cx, yb - hh, cx, yb, L(C.sandH, 0.2));
    p.poly([[cx - 2, yb - hh + 3], [cx, yb - hh], [cx + 2, yb - hh + 3]], PAL.gold);
  };
  pyr(51, 54, 11, 16);
  pyr(8, 56, 7, 10);
  pyr(28, 56, 24, 34);
  // Sphinx
  p.rect(43, 52, 12, 4, C.sand); p.rect(43, 52, 12, 1, C.sandH); p.rect(51, 47, 4, 6, C.sand); p.rect(50, 47, 1, 4, '#4a6aa0'); p.rect(55, 48, 1, 4, '#4a6aa0');
  p.px(53, 49, PAL.schwarz); p.rect(54, 47, 1, 1, C.sandD); p.rect(54, 55, 4, 1, C.sandD); p.rect(44, 55, 2, 1, C.sandD);
  palme(p, 7, 60, 12); palme(p, 53, 60, 10);
});

// ---------- Große Bibliothek ----------
w('grosse_bibliothek', (p) => {
  // Stufen
  for (let i = 0; i < 4; i++) { p.rect(4 + i * 2 - 2, 58 - i * 2, 60 - i * 4 + 0, 2, i % 2 ? C.marmorD : C.marmor); p.rect(4 + i * 2 - 2, 58 - i * 2, 60 - i * 4, 1, L(C.marmor, 0.3)); }
  // Innenraum mit Schriftrollen-Regalen
  p.rect(8, 26, 48, 26, '#6a4a2a');
  for (let r = 0; r < 6; r++) {
    const y = 28 + r * 4;
    p.rect(8, y + 3, 48, 1, '#4a3018');
    for (let x = 9; x < 55; x += 3) { const c = ['#efe2be', '#e2d0a0', '#f4ead0'][(x + r) % 3]; p.rect(x, y, 2, 3, c); p.px(x, y, '#c0a878'); p.px(x + 1, y + 2, '#b89a68'); }
  }
  // Säulen
  saeulen(p, 7, 51, 8, 7, 26, C.marmor);
  // Gebälk mit Fries
  p.rect(4, 22, 56, 4, C.marmor); p.rect(4, 22, 56, 1, L(C.marmor, 0.3)); p.rect(4, 25, 56, 1, C.marmorD);
  for (let x = 6; x < 58; x += 4) p.rect(x, 23, 2, 2, '#3a6aa8');
  // Giebel
  p.poly([[3, 21], [60, 21], [32, 6]], C.marmor);
  p.poly([[32, 6], [60, 21], [32, 21]], C.marmorD);
  p.linie(3, 21, 32, 6, L(C.marmor, 0.4)); p.rect(3, 21, 58, 1, D(C.marmor, 0.2));
  // Goldene Eule (Weisheit) im Giebel
  p.karte(28, 11, ['g...g', 'ggggg', 'gwgwg', 'ggogg', '.ggg.', '.g.g.'], { g: PAL.gold, w: '#fff6c0', o: PAL.goldD });
  p.px(32, 4, PAL.gold); p.px(32, 5, PAL.goldD); p.rect(2, 20, 2, 2, PAL.gold); p.rect(60, 20, 2, 2, PAL.gold);
  // Gelehrter mit Schriftrolle
  p.rect(30, 46, 4, 6, '#f4f1ea'); p.kreis(31.5, 44, 1.5, PAL.haut); p.rect(33, 47, 3, 2, '#efe2be');
  palme(p, 7, 56, 18); palme(p, 53, 56, 16);
});

// ---------- Koloss von Rhodos ----------
w('koloss', (p) => {
  // Hafenwasser
  wasser(p, 1, 50, 62, 12);
  // Sockel links und rechts (Hafenmolen)
  for (const x of [4, 42]) { p.rect(x, 44, 18, 8, PAL.stein); p.rect(x, 44, 18, 1, PAL.steinH); p.rect(x + 15, 44, 3, 8, PAL.steinD); for (let i = 1; i < 18; i += 4) p.px(x + i, 48, PAL.steinD); p.rect(x + 3, 41, 12, 3, C.marmor); p.rect(x + 3, 41, 12, 1, L(C.marmor, 0.3)); }
  const b = C.bronze, bh = C.bronzeH, bd = C.bronzeD;
  // Beine (gespreizt)
  p.poly([[11, 41], [15, 41], [30, 31], [26, 28]], b); p.linie(11, 41, 26, 28, bh);
  p.poly([[49, 41], [53, 41], [38, 28], [34, 31]], bd); p.linie(53, 41, 38, 28, D(bd, 0.2));
  p.rect(10, 39, 7, 2, bd); p.rect(47, 39, 7, 2, bd);
  // Lendentuch
  p.poly([[25, 26], [39, 26], [41, 33], [23, 33]], '#e8dcc0'); p.linie(25, 26, 23, 33, '#fff6e0'); p.rect(32, 27, 1, 6, '#c4b48f');
  // Torso
  p.poly([[25, 26], [39, 26], [41, 14], [23, 14]], b);
  p.rect(23, 14, 4, 12, bh); p.rect(37, 14, 4, 12, bd);
  p.linie(32, 16, 32, 25, bd); p.linie(27, 18, 31, 19, bd).linie(33, 19, 37, 18, bd); p.rect(29, 22, 1, 1, bd).px(35, 22, bd);
  // Linker Arm (hängt, hält Bogen/Tuch)
  p.poly([[22, 15], [25, 15], [22, 30], [19, 29]], b); p.linie(22, 15, 19, 29, bh); p.kreis(20, 31, 1.5, b);
  // Rechter Arm erhoben mit Fackel
  p.poly([[39, 15], [42, 13], [46, 8], [43, 7]], b); p.linie(42, 13, 46, 8, bd);
  p.kreis(44.5, 7, 1.5, b);
  // Fackel mit Flamme
  p.rect(44, 4, 2, 3, bd); p.rect(43, 4, 4, 1, PAL.gold);
  p.ellipse(44.5, 2, 1.5, 1.5, '#ff8a2a'); p.px(44, 2, '#ffd23a').px(45, 2, '#ffd23a');
  // Kopf mit Strahlenkrone
  p.rect(30, 11, 4, 3, b);
  p.kreis(32, 8, 3, b); p.kreis(31, 7, 1.5, bh); p.px(33, 8, bd).px(34, 8, PAL.schwarz);
  for (const [dx, dy] of [[-4, -2], [-3, -4], [0, -5], [3, -4], [4, -2]]) p.linie(32, 7, 32 + dx, 7 + dy, PAL.gold);
  // Segelschiff zwischen den Beinen
  p.poly([[24, 54], [42, 54], [39, 58], [27, 58]], '#7a4a22'); p.rect(24, 54, 19, 1, '#a8743a');
  p.rect(33, 41, 1, 13, '#5a3a1a'); p.rect(29, 42, 9, 9, '#f4f1ea'); p.rect(29, 42, 1, 9, '#ffffff'); p.rect(37, 42, 1, 9, '#d8d0c0'); p.rect(29, 46, 9, 1, '#c0392b');
});

// ---------- Große Mauer ----------
w('grosse_mauer', (p) => {
  // Hügellandschaft
  p.ellipse(14, 54, 18, 14, C.grasD); p.ellipse(44, 46, 22, 22, C.gras); p.ellipse(60, 40, 10, 18, C.grasD);
  p.rect(1, 52, 62, 10, C.grasD);
  p.ellipse(38, 34, 10, 6, C.grasH); p.ellipse(10, 46, 6, 3, C.gras);
  p.rect(0, 62, 64, 2, 'leer');
  // Berge im Hintergrund werden nicht gebraucht – Mauer über die Hügel
  const pfad = [[2, 50], [12, 42], [22, 47], [32, 38], [40, 26], [50, 30], [57, 20]];
  const stein = '#b8a888', steinD = '#8a7a5e', steinH = '#d8cca8';
  for (let i = 0; i < pfad.length - 1; i++) {
    const [x0, y0] = pfad[i], [x1, y1] = pfad[i + 1];
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let k = 0; k <= n; k++) {
      const x = Math.round(x0 + (x1 - x0) * k / n), y = Math.round(y0 + (y1 - y0) * k / n);
      p.rect(x, y, 2, 6, stein); p.px(x, y + 5, steinD); p.px(x, y + 3, D(stein, 0.1));
      p.px(x, y, steinH); p.px(x, y + 1, '#c8bc98');
      if ((x + k) % 3 === 0) p.px(x, y - 1, stein);
    }
  }
  // Wachtürme
  for (const [x, y] of [[11, 40], [39, 24], [55, 18]]) {
    p.rect(x - 3, y - 6, 8, 11, stein); p.rect(x - 3, y - 6, 2, 11, steinH); p.rect(x + 3, y - 6, 2, 11, steinD);
    for (let i = 0; i < 8; i += 2) p.px(x - 3 + i, y - 7, stein);
    p.rect(x, y - 3, 2, 3, '#3a2a1a');
    p.poly([[x - 4, y - 8], [x + 5, y - 8], [x + 1, y - 12]], C.terra); p.linie(x - 4, y - 8, x + 1, y - 12, L(C.terra, 0.3));
  }
  p.rect(0, 0, 1, 64, 'leer'); p.rect(63, 0, 1, 64, 'leer');
  // Wolken und Kiefern
  p.ellipse(14, 10, 6, 2, '#f4f8fc'); p.ellipse(18, 8, 4, 2, '#ffffff');
  for (const [x, y] of [[26, 52], [48, 45], [6, 56], [54, 52]]) { for (let j = 0; j < 6; j++) p.rect(x - Math.floor((6 - j) / 2), y - j, 2 * Math.floor((6 - j) / 2) + 1, 1, j % 2 ? '#2c6a34' : '#3a8a40'); p.px(x, y + 1, PAL.holzD); }
});

// ---------- Taj Mahal ----------
w('taj_mahal', (p) => {
  const m = C.marmor, md = C.marmorD;
  // Plattform
  p.rect(3, 48, 58, 6, m); p.rect(3, 48, 58, 1, L(m, 0.3)); p.rect(3, 53, 58, 1, md);
  // Minarette
  for (const x of [5, 55]) {
    p.rect(x, 18, 4, 30, m); p.rect(x + 3, 18, 1, 30, md); p.rect(x, 18, 1, 30, '#ffffff');
    for (const y of [26, 34, 42]) p.rect(x - 1, y, 6, 1, md);
    p.rect(x - 1, 17, 6, 1, md);
    kuppel(p, x + 1.5, 16, 2.5, m, 3); p.px(x + 2, 12, PAL.gold);
  }
  // Hauptbau
  p.rect(15, 28, 34, 20, m); p.rect(15, 28, 1, 20, '#ffffff'); p.rect(45, 28, 4, 20, md);
  // Großes Iwan-Spitzbogentor
  p.rect(26, 31, 12, 4, '#e4dccc');
  p.rect(27, 35, 10, 13, '#5a6a8a'); p.ellipse(32, 35, 5, 4, '#5a6a8a'); p.px(32, 30, '#5a6a8a');
  p.rect(29, 38, 6, 10, '#3a4a6a');
  p.rahmen(25, 30, 14, 18, '#b8a888');
  // Seitennischen
  for (const x of [17, 40]) for (const y of [31, 40]) { p.rect(x, y + 2, 5, 5, '#8a9ab0'); p.ellipse(x + 2, y + 2, 2, 2, '#8a9ab0'); p.px(x + 2, y, '#8a9ab0'); }
  // Chattris (kleine Kuppeln)
  for (const x of [19, 45]) { p.rect(x - 2, 24, 5, 4, m); p.rect(x - 1, 25, 1, 3, md).rect(x + 1, 25, 1, 3, md); kuppel(p, x, 23, 3, m, 3); p.px(x, 19, PAL.gold); }
  // Trommel und Zwiebelkuppel
  p.rect(23, 24, 18, 4, m); p.rect(39, 24, 2, 4, md);
  zwiebel(p, 32, 24, 10, 18, m);
  // Wasserbecken mit Spiegelung und Zypressen
  p.rect(20, 54, 24, 8, C.wasser); p.rect(20, 54, 24, 1, '#c8c4b8'); p.rect(22, 56, 20, 4, '#6aa6e0'); p.rect(30, 55, 4, 6, '#d8e8f4');
  for (const x of [11, 16, 47, 52]) { p.ellipse(x, 56, 1.5, 4, C.grasD); p.px(x - 1, 54, C.gras); p.px(x, 61, PAL.holzD); }
  p.rect(3, 54, 17, 7, C.gras); p.rect(44, 54, 17, 7, C.gras);
  for (const x of [11, 16, 47, 52]) { p.ellipse(x, 55, 1.5, 4, C.grasD); p.px(x - 1, 53, C.gras); p.px(x, 60, PAL.holzD); }
});

// ---------- Kristallpalast ----------
w('kristallpalast', (p) => {
  const g = C.glas, gd = C.glasD, e = C.eisen;
  // Rasen
  p.rect(1, 54, 62, 8, C.gras); p.rect(1, 54, 62, 1, C.grasH);
  // Seitenflügel in Stufen
  const fluegel = (x, y, wd, h) => { p.rect(x, y, wd, h, g); for (let i = 0; i < wd; i += 3) p.rect(x + i, y, 1, h, e); for (let j = 0; j < h; j += 4) p.rect(x, y + j, wd, 1, e); p.rect(x, y, wd, 1, '#ffffff'); p.rect(x + 1, y + 1, 2, h - 1, L(g, 0.3)); };
  fluegel(2, 40, 60, 15);
  fluegel(6, 32, 52, 8);
  // Tonnengewölbe der Seitenschiffe
  p.ellipse(32, 32, 26, 4, gd); p.rect(6, 32, 52, 1, e);
  for (let x = 8; x < 57; x += 4) p.px(x, 30, e);
  // Zentrales Querschiff mit großem Bogen
  for (let y = 12; y <= 54; y++) {
    const t = (y - 30) / 18, hw = y < 30 ? 13 * Math.sqrt(Math.max(0, 1 - t * t)) : 13;
    p.rect(Math.round(32 - hw), y, Math.round(hw * 2) + 1, 1, g);
  }
  for (let x = 20; x <= 44; x += 3) for (let y = 12; y <= 54; y++) if (p.hole(x, y)) p.px(x, y, e);
  for (let y = 16; y <= 54; y += 4) for (let x = 19; x <= 45; x++) if (p.hole(x, y)) p.px(x, y, e);
  // Bogenkanten
  for (let k = 0; k <= 40; k++) { const a = Math.PI * k / 40; p.px(Math.round(32 - Math.cos(a) * 13), Math.round(30 - Math.sin(a) * 18), '#ffffff'); p.px(Math.round(32 - Math.cos(a) * 9), Math.round(30 - Math.sin(a) * 13), gd); }
  // Lichtreflexe
  for (const [x, y] of [[24, 20], [25, 19], [26, 18], [10, 44], [11, 43], [48, 44], [49, 43]]) p.px(x, y, '#ffffff');
  // Eingang
  p.rect(28, 44, 9, 11, '#3a5a7a'); p.ellipse(32, 44, 4, 3, '#3a5a7a'); p.rect(32, 41, 1, 14, e);
  // Fahnen (ohne Wappen)
  for (const [x, c] of [[32, '#c0392b'], [8, '#2e6ab0'], [56, '#2e6ab0']]) { const y = x === 32 ? 3 : 24; p.rect(x, y, 1, 9 - (x === 32 ? 0 : 0), PAL.eisenD); p.rect(x + 1, y, 4, 3, c); }
  // Springbrunnen
  p.ellipse(14, 58, 5, 2, PAL.steinH); p.ellipse(14, 58, 4, 1, C.wasser); p.rect(14, 54, 1, 4, C.wasserH);
  p.ellipse(50, 58, 5, 2, PAL.steinH); p.ellipse(50, 58, 4, 1, C.wasser); p.rect(50, 54, 1, 4, C.wasserH);
});

// ---------- Freiheitsstatue ----------
w('freiheitsstatue', (p) => {
  const g = C.gruenspan, gh = C.gruenspanH, gd = C.gruenspanD;
  // Wasser und Insel
  wasser(p, 1, 56, 62, 6);
  p.ellipse(32, 56, 24, 4, '#8a9a6a'); p.ellipse(32, 55, 22, 2, C.gras);
  // Sternförmiges Fort
  p.poly([[12, 55], [52, 55], [48, 48], [16, 48]], '#c8b890'); p.rect(16, 48, 32, 1, '#e0d4b0');
  // Sockel
  p.poly([[22, 48], [42, 48], [40, 34], [24, 34]], '#d8c8a0');
  p.poly([[36, 48], [42, 48], [40, 34], [36, 34]], '#b0a078');
  p.rect(23, 34, 18, 2, '#e8dcbc'); p.rect(26, 38, 3, 6, '#8a7a5a'); p.rect(31, 38, 2, 6, '#8a7a5a'); p.rect(35, 38, 3, 6, '#8a7a5a');
  p.rect(24, 45, 16, 1, '#b0a078');
  // Robe
  p.poly([[26, 34], [38, 34], [36, 18], [28, 18]], g);
  p.poly([[33, 34], [38, 34], [36, 18], [33, 18]], gd);
  for (const x of [28, 31, 34]) p.linie(x, 33, x + 1, 22, x < 33 ? gh : D(gd, 0.1));
  p.linie(26, 26, 36, 22, gh);
  // Tafel im linken Arm
  p.poly([[23, 21], [28, 20], [29, 28], [24, 29]], gh); p.linie(24, 29, 29, 28, gd); p.px(26, 22, gd);
  p.rect(27, 23, 3, 2, g);
  // Rechter Arm mit Fackel
  p.poly([[34, 18], [37, 17], [41, 5], [38, 5]], g); p.linie(38, 5, 34, 18, gh);
  p.rect(38, 4, 4, 2, PAL.goldD); p.rect(37, 3, 6, 1, PAL.gold);
  p.rect(39, 2, 3, 1, '#ff8a2a'); p.px(40, 1, '#ffd23a');
  // Kopf mit Strahlenkrone
  p.rect(31, 15, 3, 3, g);
  p.kreis(32, 12, 3, g); p.kreis(31, 11, 1.5, gh); p.px(33, 12, gd);
  for (const [dx, dy] of [[-5, -1], [-4, -4], [-1, -6], [2, -6], [5, -4], [6, -1]]) p.linie(32, 10, 32 + dx, 10 + dy, gh);
  p.rect(29, 9, 7, 1, gd);
  // Möwen
  p.px(10, 16, '#f4f4f4').px(11, 15, '#f4f4f4').px(12, 16, '#f4f4f4');
  p.px(52, 22, '#f4f4f4').px(53, 21, '#f4f4f4').px(54, 22, '#f4f4f4');
});

// ---------- Internationale Raumstation ----------
w('internationale_raumstation', (p) => {
  // Erde (Horizont) und Sterne
  p.ellipse(32, 92, 46, 38, '#2a6ac0');
  p.ellipse(32, 92, 44, 36, '#3d84d8');
  p.ellipse(18, 60, 8, 2, '#5aa84f'); p.ellipse(44, 62, 10, 2, '#4a9a40'); p.ellipse(26, 57, 6, 1, '#f4f8fc'); p.ellipse(50, 58, 5, 1, '#f4f8fc');
  p.rect(0, 62, 64, 2, 'leer');
  for (const [x, y] of [[4, 4], [12, 18], [58, 6], [50, 14], [6, 34], [60, 42], [22, 6], [40, 3], [2, 46]]) p.px(x, y, x % 3 ? '#fff6c0' : '#ffffff');
  // Gitterträger
  p.rect(5, 30, 54, 3, '#c8ccd0'); for (let x = 5; x < 59; x += 3) p.linie(x, 30, x + 2, 32, '#8a9098');
  p.rect(5, 30, 54, 1, '#e8ecf0');
  // Solarflügel (vier Paare)
  const fluegel = (x, y, hgt) => { p.rect(x, y, 6, hgt, '#c08a2a'); for (let j = 0; j < hgt; j += 2) p.rect(x, y + j, 6, 1, '#e0aa40'); p.rect(x + 2, y, 1, hgt, '#7a5a1a'); p.rect(x, y, 1, hgt, '#f0c860'); };
  for (const x of [6, 14, 44, 52]) { fluegel(x, 9, 20); fluegel(x, 34, 20); p.rect(x + 2, 29, 1, 5, '#8a9098'); }
  // Radiatoren
  p.rect(23, 35, 3, 9, '#f4f4f4'); p.rect(38, 35, 3, 9, '#f4f4f4'); p.rect(23, 35, 1, 9, '#ffffff'); p.rect(40, 35, 1, 9, '#c8ccd0');
  // Module (Zylinder) im Zentrum
  const modul = (x, y, wd, ht) => { p.rect(x, y, wd, ht, '#e4e8ec'); p.rect(x, y, wd, 1, '#ffffff'); p.rect(x, y + ht - 1, wd, 1, '#a8b0b8'); for (let i = 2; i < wd; i += 4) p.rect(x + i, y, 1, ht, '#c8ccd2'); };
  modul(22, 22, 20, 5);
  modul(29, 14, 6, 8); modul(29, 27, 6, 3);
  modul(18, 23, 4, 3); modul(42, 23, 4, 3);
  p.kreis(32, 13, 2, '#e4e8ec');
  // Kleine Solarpaneele am Modul
  p.rect(26, 12, 3, 6, '#2a4a8a'); p.rect(35, 12, 3, 6, '#2a4a8a'); p.rect(26, 12, 3, 1, '#4a7ac0'); p.rect(35, 12, 3, 1, '#4a7ac0');
  // Fenster und Positionslichter
  p.px(31, 24, '#5ad0f0').px(33, 24, '#5ad0f0'); p.px(5, 31, '#ff3030'); p.px(58, 31, '#30ff60');
});
