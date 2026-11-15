// Oberflächen-Symbole (16x16) im Stil der Rohstoff-Symbole. Licht von oben links, Umriss automatisch.
import { definiere } from '../sprites.js';
import { PAL, hell, dunkel, mische } from '../pixel.js';
import { FORM, bez, rand, glanz, sym } from './rohstoffe.js';

function ico(id, zeichne) { definiere('ui', id, { w: 16, h: 16, zeichne: (p, o) => { zeichne(p, o); rand(p); } }); }
/** Symmetrische Karte: nur linke Hälfte (8 Zeichen je Zeile) angeben. */
function halb(p, zeilen, pal, dy = 0) { p.karte(0, dy, zeilen.map((z) => z + [...z].reverse().join('')), pal); }
/** Ring (Kreislinie) mit Dicke. */
function ring(p, cx, cy, r, d, c) { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const e = Math.hypot(x - cx, y - cy); if (e <= r + 0.5 && e > r + 0.5 - d) p.px(x, y, c); } }
/** Gedrehte Ellipsenbahn. */
function bahn(p, cx, cy, rx, ry, w, c) { for (let i = 0; i < 90; i++) { const t = i / 90 * Math.PI * 2, x = rx * Math.cos(t), y = ry * Math.sin(t); p.px(cx + x * Math.cos(w) - y * Math.sin(w), cy + x * Math.sin(w) + y * Math.cos(w), c); } }
/** Dicke Linie (2 px). */
function dick(p, x0, y0, x1, y1, c, c2) { p.linie(x0, y0, x1, y1, c).linie(x0 + 1, y0, x1 + 1, y1, c2 || c); }
function stern(p, cx, cy, r, c, innen = 0.45) {
  const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * innen : r; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  p.poly(pts, c);
}
function muenze(p, cx, cy, r) {
  p.kreis(cx, cy, r, '#c8930a'); p.kreis(cx - 0.3, cy - 0.3, r - 1, '#f1c40f'); ring(p, cx, cy, r - 2.2, 1, '#d9a80c');
  p.px(cx - r + 2, cy - 2, '#fff6b0').px(cx - 2, cy - r + 2, '#fff6b0').px(cx - r + 2, cy - 1, '#ffe27a');
  p.rect(cx - 0.5, cy - 1.5, 1, 3, '#b8930a');
}
function kolben(p, x, c, glasH = '#e8f6ff') {
  // Erlenmeyerkolben, 8 breit, ab Spalte x
  p.rect(x + 3, 2, 3, 5, '#cfe8f5').rect(x + 2, 1, 5, 1, '#9fc8de');
  p.poly([[x + 3, 7], [x + 5, 7], [x + 8, 13], [x + 0, 13]], '#cfe8f5');
  p.poly([[x + 2, 10], [x + 6, 10], [x + 8, 13], [x + 0, 13]], c);
  p.rect(x + 1, 10, 6, 1, hell(c, 0.35));
  p.rect(x, 14, 9, 1, dunkel(c, 0.35));
  p.px(x + 3, 3, glasH).px(x + 3, 4, glasH).px(x + 2, 9, glasH);
  p.px(x + 4, 8, '#ffffff').px(x + 5, 11, hell(c, 0.6)).px(x + 3, 12, hell(c, 0.6));
}
function schwert(p, x0, y0, x1, y1, griff = PAL.leder, klinge = '#c8d0d8') {
  // diagonale Klinge von (x0,y0)=Spitze bis (x1,y1)=Parierstange
  p.linie(x0, y0, x1, y1, klinge).linie(x0 + 1, y0 + (y1 > y0 ? 0 : 0), x1 + 1, y1, dunkel(klinge, 0.25));
  p.px(x0, y0, '#ffffff');
}

// ---------- Lagergüter ----------
ico('gold', (p) => muenze(p, 8, 8, 6.4));
for (const id of ['holz', 'stein', 'marmor', 'salz', 'lehm', 'kupfer', 'zinn', 'eisen', 'pferde', 'salpeter', 'kohle', 'oel', 'aluminium', 'uran', 'elefanten']) ico(id, (p) => FORM[id](p));

// ---------- Erträge ----------
ico('nahrung', (p) => {
  p.kreis(6, 9, 4.2, '#d8342a'); p.kreis(10, 9, 4.2, '#d8342a'); p.ellipse(8, 11, 5, 3, '#d8342a');
  p.px(8, 5, '#a01a14').px(8, 6, '#a01a14');
  p.px(4, 7, '#ff8a7a').px(5, 6, '#ff8a7a').px(4, 8, '#f05a4a');
  p.px(12, 12, '#a01a14').px(11, 13, '#a01a14').px(13, 10, '#a01a14');
  p.rect(8, 2, 1, 4, PAL.holzD);
  p.ellipse(11, 3, 2, 1, '#4caf40'); p.px(10, 3, '#8ad060');
});
ico('produktion', (p) => {
  dick(p, 10, 6, 3, 13, PAL.holz, PAL.holzD);
  p.poly([[5, 4], [9, 0.5], [14.5, 6], [11, 9.5]], '#8a96a2');
  p.linie(5, 4, 9, 1, '#c8d0d8').linie(11, 9, 14, 6, '#5d6a73');
  p.px(6, 4, '#c8d0d8');
});
ico('wissenschaft', (p) => { kolben(p, 3, '#3ac0e8'); p.px(9, 4, '#bff0ff').px(11, 2, '#bff0ff'); });
ico('kultur', (p) => {
  halb(p, [
    '........',
    '........',
    '..MMMMMM',
    '.MMMMMMM',
    '.MMMMMMM',
    '.MMkkMMM',
    '.MkkkkMM',
    '.MMMMMMM',
    '.MMMMMMM',
    '.MMkMMMM',
    '..MMkkkk',
    '..MMMMMM',
    '...MMMMM',
    '.....MMM',
    '........',
    '........',
  ], { M: '#b06ae0', k: '#2a1a3a' });
  p.px(3, 3, '#e0b8ff').px(2, 4, '#e0b8ff').px(2, 5, '#e0b8ff').px(13, 9, '#7a3aa8').px(12, 11, '#7a3aa8');
  p.rect(1, 6, 1, 3, '#f1c40f').rect(14, 6, 1, 3, '#f1c40f');
});
ico('zufriedenheit', (p) => {
  p.kreis(8, 8, 6, '#f5c518'); p.px(4, 4, '#fff0a0').px(5, 3, '#fff0a0').px(3, 5, '#fff0a0');
  p.rect(5, 5, 2, 3, '#3a2a10').rect(9, 5, 2, 3, '#3a2a10');
  p.px(4, 9, '#3a2a10').px(5, 10, '#3a2a10').rect(6, 11, 4, 1, '#3a2a10').px(10, 10, '#3a2a10').px(11, 9, '#3a2a10');
  p.px(12, 11, '#c8930a').px(11, 12, '#c8930a');
});
ico('unzufrieden', (p) => {
  p.kreis(8, 8, 6, '#e8642a'); p.px(4, 4, '#ffb08a').px(5, 3, '#ffb08a').px(3, 5, '#ffb08a');
  p.rect(5, 6, 2, 2, '#3a1a0a').rect(9, 6, 2, 2, '#3a1a0a').px(4, 5, '#3a1a0a').px(11, 5, '#3a1a0a');
  p.px(4, 12, '#3a1a0a').px(5, 11, '#3a1a0a').rect(6, 10, 4, 1, '#3a1a0a').px(10, 11, '#3a1a0a').px(11, 12, '#3a1a0a');
});
ico('bevoelkerung', (p) => {
  p.kreis(8, 4, 2.6, PAL.haut); p.px(7, 3, '#f8d0b0');
  p.rect(6, 1, 5, 1, PAL.haar).px(5, 2, PAL.haar).px(10, 2, PAL.haar);
  p.ellipse(8, 12, 5, 4, '#3a8fd0'); p.rect(2, 14, 13, 2, 'leer');
  p.px(5, 10, '#7ac0f0').px(4, 11, '#7ac0f0');
});
ico('staerke', (p) => {
  p.rect(7, 1, 3, 9, '#c8d0d8').rect(9, 2, 1, 8, '#8a96a2').rect(8, 0, 1, 1, 'leer').px(8, 1, '#ffffff').rect(7, 2, 1, 7, '#ffffff');
  p.px(7, 1, 'leer').px(9, 1, 'leer'); p.px(8, 1, '#e8eef4');
  p.rect(4, 10, 9, 2, '#d9a80c').rect(4, 10, 9, 1, '#f1c40f');
  p.rect(7, 12, 3, 2, PAL.leder).px(8, 12, PAL.holzH);
  p.rect(7, 14, 3, 1, '#d9a80c');
});
ico('fernkampf', (p) => {
  bez(p, [10, 1], [1, 8], [10, 14], 0.6, 0.6, PAL.holz);
  p.px(9, 1, PAL.holzH).px(5, 5, PAL.holzH).px(4, 7, PAL.holzH);
  p.linie(10, 2, 10, 13, '#f4f1ea');
  p.linie(2, 8, 13, 8, '#c8a070');
  p.px(14, 8, '#c8d0d8').px(13, 7, '#c8d0d8').px(13, 9, '#c8d0d8').px(12, 8, '#9aa5b1');
  p.px(2, 7, '#e03a2a').px(3, 7, '#e03a2a').px(2, 9, '#e03a2a').px(3, 9, '#e03a2a');
});
ico('reichweite', (p) => {
  p.kreis(8, 8, 6.4, '#d8342a'); p.kreis(8, 8, 4.8, '#f4f1ea'); p.kreis(8, 8, 3.2, '#d8342a'); p.kreis(8, 8, 1.6, '#f4f1ea'); p.px(8, 8, '#d8342a');
  p.px(4, 3, '#ff7a6a').px(3, 4, '#ff7a6a');
});
ico('tempo', (p) => p.karte(0, 0, [
  '................',
  '................',
  '.......BBBB.....',
  '..w.w..BbBB.....',
  '.wwwww.BbBB.....',
  '..wwwwwBBBB.....',
  '...wwwwBBBB.....',
  '....wwwBBBBB....',
  '.......BBBBBB...',
  '......BBBBBBBB..',
  '.....BBBBBBBBBB.',
  '.....BBBBBBBBBB.',
  '.....ssssssssss.',
  '................',
  '................',
  '................',
], { B: '#a0622e', b: '#d08a52', w: '#f4f1ea', s: '#3a2410' }));
ico('sicht', (p) => {
  halb(p, [
    '........',
    '........',
    '........',
    '........',
    '.....kkk',
    '...kkWWW',
    '..kWWWWI',
    '.kWWWWII',
    '..kWWWWI',
    '...kkWWW',
    '.....kkk',
    '........',
  ], { k: '#2a2a3a', W: '#f4f1ea', I: '#2a7ad0' }, 1);
  p.rect(7, 7, 2, 3, '#22201e').px(7, 7, '#ffffff');
});
ico('auge_zu', (p) => {
  halb(p, [
    '........',
    '........',
    '........',
    '........',
    '.....kkk',
    '...kkWWW',
    '..kWWWWI',
    '.kWWWWII',
    '..kWWWWI',
    '...kkWWW',
    '.....kkk',
    '........',
  ], { k: '#6b6f7a', W: '#a8acb4', I: '#5a6a80' }, 1);
  p.rect(7, 7, 2, 3, '#3a3f46');
  p.linie(2, 2, 13, 13, '#e02a3a').linie(3, 2, 14, 13, '#e02a3a').linie(2, 1, 14, 13, '#ff7a80');
});
ico('hp', (p) => {
  halb(p, [
    '........',
    '........',
    '..RRR...',
    '.RRRRRR.',
    '.RRRRRRR',
    '.RRRRRRR',
    '.RRRRRRR',
    '..RRRRRR',
    '...RRRRR',
    '....RRRR',
    '.....RRR',
    '......RR',
    '.......R',
    '........',
  ], { R: '#e02a3a' }, 1);
  p.rect(3, 5, 2, 1, '#ff9aa0').px(2, 6, '#ff9aa0').px(2, 7, '#ff9aa0').px(4, 4, '#ff9aa0');
  p.px(13, 7, '#a01020').px(12, 9, '#a01020').px(11, 10, '#a01020').px(10, 11, '#a01020').px(13, 6, '#a01020');
});
ico('zeit', (p) => {
  halb(p, [
    '........',
    '.HHHHHHH',
    '..hhhhhh',
    '..gwwwww',
    '..gSSSSS',
    '...gSSSS',
    '....gSSS',
    '.....gSS',
    '......gS',
    '.....g..',
    '....g...',
    '...g...S',
    '..g...SS',
    '..gSSSSS',
    '.HHHHHHH',
    '........',
  ], { H: PAL.holz, h: PAL.holzD, g: '#bfe4f5', w: '#e8f6ff', S: '#f0c050' });
  p.rect(1, 1, 14, 1, PAL.holzH).rect(1, 14, 14, 1, PAL.holzD);
  p.rect(8, 9, 1, 3, '#f0c050').px(7, 9, 'leer');
});

// ---------- Diplomatie ----------
ico('krieg', (p) => {
  p.kreis(8, 8, 6.6, '#b8202a'); p.kreis(8, 8, 5.4, '#d8342a'); p.px(4, 4, '#f06a5a').px(5, 3, '#f06a5a');
  for (const s of [1, -1]) {
    const x0 = s > 0 ? 3 : 12, x1 = s > 0 ? 11 : 4;
    p.linie(x0, 3, x1, 11, '#e8eef4'); p.linie(x0 + (s > 0 ? 1 : -1), 3, x1 + (s > 0 ? 1 : -1), 11, '#9aa5b1');
    p.linie(x1 - 2 * s, 12, x1 + 1 * s, 9, '#f1c40f');
    p.px(x1 + s, 12, PAL.holzD).px(x1 + 2 * s, 13, PAL.holzD);
  }
});
ico('frieden', (p) => {
  p.karte(0, 0, [
    '................',
    '................',
    '.........WW.....',
    '........WWWW....',
    '.......WWkWWyy..',
    '......WWWWWW....',
    '..W..WWWWWW.....',
    '.WWWWWWWWWW.....',
    '..WWWwwwWWW.....',
    '...WWwwwwWW.....',
    '....WWWWWW......',
    '......WWW.......',
    '................',
  ], { W: '#f8f8f4', w: '#c8d0dc', k: '#22201e', y: '#f39c12' });
  p.linie(12, 5, 14, 9, '#3d8f3a'); p.px(13, 8, '#6cbf4a').px(14, 6, '#6cbf4a').px(12, 7, '#6cbf4a').px(15, 9, 'leer');
});
ico('handel', (p) => {
  muenze(p, 8, 8, 4);
  p.rect(3, 2, 8, 1, '#3d9f3a').px(11, 1, '#3d9f3a').px(11, 3, '#3d9f3a').px(12, 2, '#3d9f3a').px(11, 2, '#3d9f3a');
  p.rect(2, 2, 1, 3, '#3d9f3a');
  p.rect(5, 13, 8, 1, '#e8742a').px(4, 12, '#e8742a').px(4, 14, '#e8742a').px(3, 13, '#e8742a').px(4, 13, '#e8742a');
  p.rect(13, 11, 1, 3, '#e8742a');
});
ico('diplomatie', (p) => p.karte(0, 0, [
  '................',
  '................',
  '................',
  '................',
  '.BB..........RR.',
  '.BBB...hh...RRR.',
  '.BBBhhhhHh.hRRR.',
  '.BBBhHHhhHhhRRR.',
  '.BBBhhHHhhHhRRR.',
  '.BBB.hhHHhhhRRR.',
  '.BBB..hhhhh.RRR.',
  '.BB...........R.',
  '................',
], { B: '#3a6fc8', R: '#c8402a', h: '#e8b58a', H: '#c98f63' }));
ico('offene_grenzen', (p) => {
  p.rect(1, 3, 3, 12, PAL.stein).rect(12, 3, 3, 12, PAL.stein);
  p.rect(1, 3, 1, 12, PAL.steinH).rect(14, 3, 1, 12, PAL.steinD).rect(3, 3, 1, 12, PAL.steinD);
  p.rect(1, 2, 3, 1, PAL.steinH).rect(12, 2, 3, 1, PAL.steinH);
  p.poly([[4, 5], [7, 7], [7, 14], [4, 14]], PAL.holz); p.linie(4, 5, 7, 7, PAL.holzH); p.rect(4, 9, 3, 1, PAL.holzD);
  p.poly([[12, 5], [9, 7], [9, 14], [12, 14]], PAL.holzD); p.rect(9, 9, 3, 1, '#3a2410');
  p.rect(5, 14, 6, 1, '#d8c890'); p.rect(7, 12, 2, 2, '#e8d8a0');
});
function wappen(p, x, y, f, rd) {
  p.karte(x, y, ['FFFFFFF', 'FffFFFF', 'FfFFFFF', 'FFFFFFF', 'FFFFFFF', '.FFFFF.', '..FFF..', '...F...'], { F: f, f: hell(f, 0.4) });
  p.rect(x + 3, y + 1, 1, 5, rd).rect(x + 1, y + 3, 5, 1, rd);
}
ico('buendnis', (p) => { wappen(p, 1, 3, '#3a6fc8', '#f1c40f'); wappen(p, 8, 5, '#c8402a', '#f1c40f'); });
ico('tribut', (p) => {
  const st = (x, n) => {
    for (let i = 0; i < n; i++) { const y = 13 - i * 2; p.rect(x, y, 7, 2, '#f1c40f'); p.rect(x, y + 1, 7, 1, '#b8930a'); p.px(x, y, '#fff3a0'); }
    const yt = 13 - n * 2 + 1; p.rect(x + 1, yt - 1, 5, 1, '#ffe27a');
  };
  st(1, 5); st(8, 3);
  p.px(4, 4, '#ffffff');
});
ico('forschungsabkommen', (p) => { kolben(p, -1, '#3ac0e8'); kolben(p, 7, '#7ad04a'); p.px(7, 1, '#ffffff').px(8, 0, '#ffffff').px(9, 1, '#ffffff'); });
ico('karte_tausch', (p) => {
  p.rect(3, 3, 10, 10, '#efe0b8'); p.rect(3, 3, 10, 1, '#fff2d0');
  for (const y of [5, 7, 9]) p.rect(5, y, 6, 1, '#a89060');
  p.rect(5, 11, 4, 1, '#a89060');
  p.ellipse(3, 3, 1.5, 1.5, '#d8c090').ellipse(13, 13, 1.5, 1.5, '#d8c090');
  p.rect(2, 2, 2, 12, '#d8c090').rect(12, 2, 2, 12, '#d8c090').rect(2, 2, 1, 12, '#c8a870').rect(13, 2, 1, 12, '#a8885a');
  p.px(2, 1, '#c8a870').px(13, 14, '#a8885a');
  p.kreis(10, 11, 1.4, '#c0392b'); p.px(10, 11, '#e86a5a');
});

// ---------- Allgemeines ----------
ico('forschung', (p) => {
  halb(p, [
    '........',
    '.....YYY',
    '....YYYY',
    '...YYYYY',
    '...YYYYY',
    '...YYYYY',
    '....YYYY',
    '.....YYY',
    '.....YYY',
    '.....GGG',
    '.....gGG',
    '.....GGG',
    '......gg',
    '........',
  ], { Y: '#ffe04a', G: '#9aa5b1', g: '#6b7682' }, 1);
  p.px(5, 3, '#ffffff').px(4, 4, '#ffffff').px(4, 5, '#fff6c0').px(11, 6, '#e8b818').px(10, 7, '#e8b818');
  p.px(7, 6, '#f39c12').px(8, 6, '#f39c12').px(7, 7, '#f39c12').px(8, 8, '#f39c12');
  p.px(1, 2, '#fff6a0').px(14, 2, '#fff6a0').px(1, 7, '#fff6a0').px(14, 7, '#fff6a0');
});
ico('bau', (p) => {
  // Kelle
  p.poly([[8, 9], [14, 14], [9, 14]], '#c8d0d8'); p.linie(8, 9, 9, 14, '#ffffff'); p.linie(14, 14, 10, 14, '#6b7682');
  p.linie(3, 4, 8, 9, PAL.holz).px(2, 3, PAL.holzD);
  // Hammer
  dick(p, 11, 5, 3, 13, PAL.holzH, PAL.holz);
  p.poly([[8, 3], [11, 0.5], [14.5, 4], [11.5, 7]], '#8a96a2'); p.linie(8, 3, 11, 1, '#c8d0d8');
});
ico('stadt', (p) => {
  p.rect(9, 3, 4, 11, PAL.stein).rect(9, 3, 1, 11, PAL.steinH).rect(12, 3, 1, 11, PAL.steinD);
  p.px(9, 2, PAL.stein).px(11, 2, PAL.stein).rect(10, 6, 1, 2, '#22201e');
  p.rect(2, 9, 9, 5, PAL.putz).rect(8, 9, 2, 5, PAL.putzD);
  p.rect(1, 8, 11, 1, PAL.ziegelD).rect(2, 7, 9, 1, PAL.ziegel).rect(3, 6, 7, 1, PAL.ziegel).rect(4, 5, 5, 1, PAL.ziegel).rect(5, 4, 3, 1, hell(PAL.ziegel, 0.2));
  p.px(2, 7, hell(PAL.ziegel, 0.3)).px(3, 6, hell(PAL.ziegel, 0.3));
  p.rect(5, 11, 2, 3, '#4a2e14').rect(3, 10, 1, 2, PAL.glas);
  p.rect(10, 1, 1, 1, '#c0392b');
  p.rect(1, 14, 14, 1, '#6a8a3a');
});
ico('einheit', (p) => {
  halb(p, [
    '........',
    '.......P',
    '......PP',
    '....HHPP',
    '...HHHHH',
    '..HHHHHH',
    '..HHHHHH',
    '..HHHHHH',
    '..HHkkkk',
    '..HHk...',
    '..HHk...',
    '..HHH...',
    '...HH...',
    '........',
  ], { H: '#9aa5b1', P: '#d8342a', k: '#3a3f46' }, 1);
  p.px(4, 5, '#e0e8ee').px(3, 6, '#e0e8ee').px(3, 7, '#e0e8ee').px(12, 8, '#6b7682').px(12, 9, '#6b7682').px(12, 10, '#6b7682');
  p.rect(2, 9, 12, 1, '#d9a80c');
  p.px(9, 2, '#f06a5a');
});
ico('rangliste', (p) => {
  halb(p, [
    '........',
    '.GGGGGGG',
    'G.GGGGGG',
    'G.GGGGGG',
    '.G.GGGGG',
    '..GGGGGG',
    '...GGGGG',
    '....GGGG',
    '......GG',
    '......GG',
    '.....GGG',
    '....BBBB',
    '....BBBB',
    '........',
  ], { G: '#f1c40f', B: PAL.holz }, 1);
  p.rect(0, 3, 1, 2, 'leer').rect(15, 3, 1, 2, 'leer'); p.px(1, 3, '#f1c40f').px(14, 3, '#f1c40f').px(1, 4, '#f1c40f').px(14, 4, '#f1c40f');
  p.rect(3, 3, 2, 4, '#fff6b0').px(11, 5, '#c8930a').px(10, 7, '#c8930a').px(11, 4, '#c8930a').px(9, 8, '#c8930a');
  p.rect(6, 12, 4, 1, '#f1c40f');
});
ico('einstellungen', (p) => {
  const G = '#9aa5b1';
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; p.kreis(8 + Math.cos(a) * 5.4, 8 + Math.sin(a) * 5.4, 1, G); }
  p.kreis(8, 8, 5, G); p.kreis(8, 8, 2, 'leer');
  ring(p, 8, 8, 2.6, 1, '#5d6a73');
  p.px(4, 4, '#d8e0e8').px(5, 4, '#d8e0e8').px(4, 5, '#d8e0e8').px(3, 7, '#d8e0e8');
  p.px(12, 11, '#6b7682').px(11, 12, '#6b7682');
  p.rect(7, 7, 2, 2, 'leer');
});
ico('hilfe', (p) => {
  p.kreis(8, 8, 6.4, '#2a7ad0'); p.px(4, 3, '#7ab8f0').px(3, 4, '#7ab8f0').px(5, 2, '#7ab8f0');
  p.karte(5, 3, ['.WWWW.', 'WW..WW', '....WW', '...WW.', '..WW..', '..WW..', '......', '..WW..', '..WW..'], { W: '#ffffff' });
});
ico('lexikon', (p) => {
  p.rect(2, 2, 11, 12, '#7a2a20'); p.rect(2, 2, 1, 12, '#a8402a');
  p.rect(4, 3, 9, 10, '#a8402a');
  p.rect(13, 3, 1, 11, '#f4f1ea').rect(4, 13, 10, 1, '#d9cfb4');
  p.rect(6, 5, 5, 3, '#f1c40f').rect(7, 6, 3, 1, '#a8402a');
  p.rect(5, 10, 7, 1, '#d9a80c');
  p.px(3, 3, '#c85a3a');
});
ico('meldung', (p) => {
  halb(p, [
    '........',
    '.......g',
    '......GG',
    '.....GGG',
    '....GGGG',
    '....GGGG',
    '....GGGG',
    '...GGGGG',
    '...GGGGG',
    '..GGGGGG',
    '.GGGGGGG',
    '.ddddddd',
    '......kk',
    '........',
  ], { G: '#f1c40f', g: '#b8930a', d: '#c8930a', k: '#8a6a0a' }, 1);
  p.rect(5, 4, 1, 6, '#fff6b0').px(6, 3, '#fff6b0');
  p.px(11, 7, '#c8930a').px(11, 8, '#c8930a').px(12, 10, '#c8930a');
});
ico('schliessen', (p) => {
  p.rect(2, 2, 12, 12, '#a8202a'); p.rect(2, 2, 12, 1, '#d8443a').rect(2, 2, 1, 12, '#d8443a').rect(2, 13, 12, 1, '#7a1018');
  p.px(2, 2, 'leer').px(13, 2, 'leer').px(2, 13, 'leer').px(13, 13, 'leer');
  for (let i = 0; i < 6; i++) { p.rect(5 + i, 5 + i, 2, 1, '#ffffff'); p.rect(10 - i, 5 + i, 2, 1, '#ffffff'); }
});
function lautsprecher(p) {
  p.rect(1, 6, 3, 5, '#6b7682').rect(1, 6, 3, 1, '#9aa5b1');
  p.poly([[4, 6], [8, 2], [8, 14], [4, 10]], '#9aa5b1'); p.linie(4, 6, 8, 2, '#d8e0e8'); p.rect(8, 2, 1, 13, '#6b7682');
}
ico('ton_an', (p) => {
  lautsprecher(p);
  p.px(10, 7, '#f4f1ea').px(10, 8, '#f4f1ea').px(10, 9, '#f4f1ea');
  p.px(11, 5, '#f4f1ea').px(12, 6, '#f4f1ea').rect(12, 7, 1, 3, '#f4f1ea').px(12, 10, '#f4f1ea').px(11, 11, '#f4f1ea');
  p.px(13, 3, '#f4f1ea').px(14, 5, '#f4f1ea').rect(14, 6, 1, 5, '#f4f1ea').px(14, 11, '#f4f1ea').px(13, 13, '#f4f1ea').px(14, 4, '#f4f1ea').px(14, 12, '#f4f1ea');
});
ico('ton_aus', (p) => {
  lautsprecher(p);
  p.linie(10, 6, 14, 10, '#e02a3a').linie(10, 7, 13, 10, '#e02a3a').linie(14, 6, 10, 10, '#e02a3a').linie(14, 7, 11, 10, '#e02a3a');
});
ico('karte', (p) => {
  p.poly([[1, 3], [5, 2], [10, 4], [14, 3], [14, 13], [10, 14], [5, 12], [1, 13]], '#e8d8a8');
  p.poly([[5, 2], [10, 4], [10, 14], [5, 12]], '#d4c090');
  p.ellipse(4, 7, 2, 2.5, '#6aa84f').ellipse(11, 9, 2.5, 2, '#6aa84f');
  p.rect(7, 4, 2, 9, '#5aa0d8').px(6, 7, '#5aa0d8').px(9, 10, '#5aa0d8');
  p.px(3, 6, '#3d7f38').px(12, 9, '#3d7f38');
  p.px(11, 5, '#d8342a').px(12, 6, '#d8342a').px(10, 6, '#d8342a').px(11, 7, '#d8342a');
  p.rect(5, 2, 1, 11, '#b8a070').rect(10, 4, 1, 11, '#b8a070');
});
ico('zeitalter', (p) => {
  p.rect(2, 1, 12, 2, PAL.steinH).rect(2, 1, 12, 1, '#ffffff').px(1, 2, PAL.steinH).px(14, 2, PAL.steinH);
  p.rect(3, 3, 10, 1, PAL.stein);
  p.rect(4, 4, 8, 9, '#f2eee4');
  for (const x of [5, 7, 9]) p.rect(x, 4, 1, 9, '#c9c4ba');
  p.rect(11, 4, 1, 9, '#a9a49a').rect(4, 4, 1, 9, '#ffffff');
  p.rect(3, 13, 10, 1, PAL.stein).rect(2, 14, 12, 1, PAL.steinD);
});
ico('wunder', (p) => {
  p.poly([[8, 1], [15, 14], [1, 14]], '#e8c870');
  p.poly([[8, 1], [15, 14], [8, 14]], '#c8a050');
  for (let y = 4; y < 14; y += 3) { p.linie(8 - (y - 1) * 0.54, y, 8, y, '#d0b060'); p.linie(8, y, 8 + (y - 1) * 0.54, y, '#a88a40'); }
  p.linie(8, 1, 1, 14, '#fff0b0'); p.px(8, 1, '#ffffff');
  p.rect(1, 15, 15, 1, 'leer');
});
ico('befoerderung', (p) => {
  const ch = ['......YY', '.....YYY', '....YYY.', '...YYY..', '..YYY...'];
  halb(p, ['........', '........', '........', '........', '........', ...ch, ...ch, '.'], { Y: '#f1c40f' });
  for (let i = 0; i < 256; i++) if (p.feld[i] && (i % 16) >= 8) p.feld[i] = '#c8930a';
  for (const y0 of [5, 10]) for (let k = 0; k < 5; k++) p.px(6 - k, y0 + k, '#fff3a0');
  stern(p, 8, 2.6, 2.6, '#f1c40f'); p.px(7, 2, '#fff6b0');
});
ico('schlafen', (p) => p.karte(0, 0, [
  '................',
  '...........ccc..',
  '............c...',
  '...........ccc..',
  '.......bbbb.....',
  '.........b......',
  '........b.......',
  '.......bbbb.....',
  '.aaaaaa.........',
  '.aaaaaa.........',
  '....aa..........',
  '...aa...........',
  '..aa............',
  '.aaaaaa.........',
  '.aaaaaa.........',
  '................',
], { a: '#e8f0ff', b: '#bcd0f0', c: '#8aa8e0' }));
ico('befestigen', (p) => {
  p.karte(0, 0, [
    '................',
    '.SS..SS..SS..SS.',
    '.SS..SS..SS..SS.',
    '.SSSSSSSSSSSSSS.',
    '.SSSSSSSSSSSSSS.',
    '.SSSSSSSSSSSSSS.',
    '.SSSSSSSSSSSSSS.',
    '.SSSSSSSSSSSSSS.',
    '.SSSSSSSSSSSSSS.',
    '.SSSSSSSSSSSSSS.',
    '.SSSSSSSSSSSSSS.',
    '.SSSSSSSSSSSSSS.',
    '.SSSSSSSSSSSSSS.',
    '.dddddddddddddd.',
  ], { S: PAL.stein, d: PAL.steinD });
  for (let y = 5; y < 13; y += 2) { p.rect(1, y, 14, 1, PAL.steinD); for (let x = 2 + ((y >> 1) % 2) * 2; x < 15; x += 4) p.px(x, y - 1, PAL.steinD); }
  p.rect(1, 1, 2, 1, PAL.steinH).rect(5, 1, 2, 1, PAL.steinH).rect(9, 1, 2, 1, PAL.steinH).rect(13, 1, 2, 1, PAL.steinH).rect(1, 3, 14, 1, PAL.steinH).rect(1, 1, 1, 12, PAL.steinH);
  p.rect(14, 2, 1, 11, PAL.steinD);
  p.karte(5, 6, ['SSSSSS', 'SbbbbS', 'SbBbbS', 'SbBbbS', '.SbbS.', '..SS..'], { S: '#f1c40f', b: '#2a5ab0', B: '#6a9ae0' });
});
ico('schild', (p) => {
  p.karte(0, 0, [
    '................',
    '..GGGGGGGGGGGG..',
    '..GBBBBBBBBBBG..',
    '..GBbBBBBBBBBG..',
    '..GBbBBBBBBBBG..',
    '..GBBBBBBBBBBG..',
    '..GBBBBBBBBBBG..',
    '..GBBBBBBBBBBG..',
    '...GBBBBBBBBG...',
    '...GBBBBBBBBG...',
    '....GBBBBBBG....',
    '.....GBBBBG.....',
    '......GBBG......',
    '.......GG.......',
  ], { G: '#f1c40f', B: 'S', b: 'S+' });
  p.rect(7, 3, 2, 8, '#f1c40f').rect(4, 5, 8, 2, '#f1c40f');
});
ico('erkunden', (p) => {
  p.kreis(8, 8, 6.4, '#b08a3e'); p.kreis(8, 8, 5, '#f4f1ea'); p.px(4, 3, '#e0c070').px(3, 4, '#e0c070');
  p.px(8, 3, '#6b7682').px(13 - 1, 8, '#6b7682').px(8, 12, '#6b7682').px(4, 8, '#6b7682');
  p.poly([[8, 8], [11, 4], [9, 9]], '#d8342a'); p.poly([[8, 8], [5, 12], [7, 7]], '#3a3f46');
  p.px(8, 8, '#f1c40f');
});
ico('arbeiten', (p) => {
  dick(p, 11, 4, 3, 13, PAL.holzH, PAL.holz);
  bez(p, [2, 5], [8, 0], [14, 6], 0.7, 0.4, '#8a96a2');
  bez(p, [3, 4], [8, 0], [13, 5], 0.3, 0.2, '#c8d0d8');
  p.px(2, 6, '#6b7682').px(14, 7, '#6b7682');
});
ico('angriff', (p) => {
  p.linie(13, 2, 5, 10, '#e8eef4').linie(13, 3, 6, 10, '#9aa5b1').linie(12, 2, 5, 9, '#ffffff');
  p.linie(3, 8, 7, 12, '#f1c40f').linie(3, 9, 6, 12, '#c8930a');
  p.linie(4, 11, 2, 13, PAL.holzD).px(1, 14, '#f1c40f');
  p.poly([[6, 0.5], [3, 5], [5, 5], [3, 8], [8, 3], [6, 3], [8, 0.5]], '#ffe04a');
  p.px(6, 1, '#ffffff');
});
ico('bewegen', (p) => {
  p.poly([[2, 7], [9, 7], [9, 3], [14.5, 8.5], [9, 14], [9, 10], [2, 10]], '#4caf40');
  p.rect(2, 7, 7, 1, '#9ae080').linie(9, 3, 14, 8, '#9ae080');
  p.rect(2, 10, 7, 1, '#2f7a28');
});
ico('aufloesen', (p) => {
  p.rect(6, 1, 4, 1, '#6b7682');
  p.rect(2, 2, 12, 2, '#9aa5b1').rect(2, 2, 12, 1, '#c8d0d8');
  p.poly([[3, 4], [13, 4], [12, 14], [4, 14]], '#8a96a2');
  for (const x of [5, 8, 11]) p.rect(x, 6, 1, 7, '#5d6a73');
  p.rect(4, 5, 1, 8, '#c8d0d8');
});
ico('aufruesten', (p) => {
  p.poly([[8, 1], [14.5, 8], [10.5, 8], [10.5, 14], [5.5, 14], [5.5, 8], [1.5, 8]], '#4caf40');
  p.linie(8, 1, 2, 7, '#9ae080').rect(6, 8, 1, 6, '#9ae080');
  p.rect(10, 9, 1, 5, '#2f7a28');
});
ico('gruenden', (p) => {
  p.rect(4, 1, 1, 13, PAL.holzD).px(4, 0, '#f1c40f');
  p.karte(5, 1, ['SSSSSSSS', 'S+++SSSS', 'SSSSSSS.', 'SSSSSS..', 'SSSSSSS.', 'S-S-SSSS', '-------.'], { S: 'S', '+': 'S+', '-': 'S-' });
  p.ellipse(4, 14, 3, 1, '#6aa84f');
});
ico('pluendern', (p) => {
  p.linie(10, 7, 4, 14, PAL.holz).linie(11, 7, 5, 14, PAL.holzD);
  p.rect(9, 6, 3, 2, '#6b7682');
  p.karte(6, 0, ['..y.....', '..yy.y..', '.yYyyy..', '.yYYYy..', 'rYYWYYr.', '.rYWYr..', '..rrr...'], { y: '#f39c12', Y: '#ffd04a', W: '#ffffff', r: '#e04a1a' });
});
ico('atom', (p) => {
  bahn(p, 8, 8, 6.5, 2.4, 0, '#3ac0e8'); bahn(p, 8, 8, 6.5, 2.4, Math.PI / 3, '#3ac0e8'); bahn(p, 8, 8, 6.5, 2.4, -Math.PI / 3, '#3ac0e8');
  p.kreis(8, 8, 1.4, '#e02a3a'); p.px(7, 7, '#ff9aa0');
  p.px(14, 8, '#ffffff').px(5, 3, '#ffffff').px(5, 13, '#ffffff');
});
ico('luft', (p) => {
  halb(p, [
    '.......W',
    '......WW',
    '......WW',
    '......WW',
    '.....wWW',
    '...wwwWW',
    '.wwwwwWW',
    '.wwwwwWW',
    '......WW',
    '......WW',
    '......WW',
    '....wwWW',
    '....wwWW',
    '.......W',
  ], { W: '#d8e0e8', w: '#9aa5b1' }, 1);
  p.rect(7, 3, 2, 2, PAL.glas).px(7, 3, '#ffffff');
  p.rect(8, 2, 1, 12, '#b8c0c8');
});
ico('see', (p) => {
  const A = '#8aa0c0';
  p.kreis(8, 2.5, 1.6, A); p.px(8, 2, 'leer');
  p.rect(7, 4, 2, 9, A).rect(4, 5, 8, 1, A);
  bez(p, [2, 9], [3, 14], [8, 14], 0.6, 0.6, A); bez(p, [14, 9], [13, 14], [8, 14], 0.6, 0.6, A);
  p.poly([[1, 8], [3, 8], [3, 10]], A); p.poly([[15, 8], [13, 8], [13, 10]], A);
  p.rect(7, 4, 1, 8, '#c8d8ec').px(3, 11, '#c8d8ec').px(7, 1, '#c8d8ec');
  p.rect(9, 5, 1, 8, '#5a7090');
});
ico('warnung', (p) => {
  p.poly([[8, 1], [15, 14], [1, 14]], '#f5c518'); p.linie(8, 1, 1, 14, '#ffe680'); p.rect(2, 14, 13, 1, '#c8930a');
  p.rect(7, 5, 2, 5, '#22201e').rect(7, 11, 2, 2, '#22201e');
});
ico('haken', (p) => {
  p.linie(2, 8, 6, 12, '#4caf40').linie(2, 9, 6, 13, '#2f8a28').linie(3, 8, 6, 11, '#4caf40');
  p.linie(6, 12, 14, 3, '#4caf40').linie(6, 13, 14, 4, '#2f8a28').linie(6, 11, 13, 3, '#9ae080');
  p.linie(2, 7, 5, 10, '#9ae080');
});
ico('kreuz', (p) => {
  for (let i = 0; i < 10; i++) { p.rect(3 + i, 3 + i, 2, 1, '#e02a3a'); p.rect(11 - i, 3 + i, 2, 1, '#e02a3a'); p.px(3 + i, 2 + i, '#ff7a80'); p.px(12 - i, 2 + i, '#ff7a80'); }
  p.rect(12, 13, 1, 1, '#a01020').px(4, 13, '#a01020');
});
ico('plus', (p) => { p.rect(6, 2, 4, 12, '#4caf40').rect(2, 6, 12, 4, '#4caf40'); p.rect(6, 2, 1, 4, '#9ae080').rect(2, 6, 4, 1, '#9ae080').rect(10, 6, 3, 1, '#9ae080'); p.rect(9, 10, 1, 4, '#2f8a28').rect(10, 9, 4, 1, '#2f8a28'); });
ico('minus', (p) => { p.rect(2, 6, 12, 4, '#e02a3a'); p.rect(2, 6, 12, 1, '#ff7a80'); p.rect(2, 9, 12, 1, '#a01020'); });
function pfeil(p) {
  p.poly([[1.5, 8], [7.5, 2], [7.5, 6], [14, 6], [14, 10], [7.5, 10], [7.5, 14]], '#e8e4da');
  p.linie(1, 8, 7, 2, '#ffffff').rect(8, 6, 6, 1, '#ffffff'); p.rect(8, 10, 6, 1, '#a8a49a'); p.linie(2, 9, 7, 14, '#a8a49a');
}
ico('pfeil_links', (p) => pfeil(p));
ico('pfeil_rechts', (p) => { pfeil(p); p.spiegeln(); for (let i = 0; i < p.feld.length; i++) if (p.feld[i] === '#a8a49a' && (i % 16) < 8 && p.feld[i]) p.feld[i] = '#a8a49a'; });
ico('menue', (p) => { for (const y of [3, 7, 11]) { p.rect(2, y, 12, 2, '#e8e4da'); p.rect(2, y, 12, 1, '#ffffff'); p.rect(2, y + 1, 12, 1, '#c8c4ba'); } });
ico('stern_voll', (p) => { stern(p, 8, 8.6, 7.4, '#f5c518', 0.42); p.linie(8, 2, 6, 6, '#fff3a0').px(4, 7, '#fff3a0').px(3, 6, '#fff3a0'); p.px(11, 13, '#c8930a').px(12, 13, '#c8930a'); });
ico('stern_leer', (p) => { stern(p, 8, 8.6, 7.4, '#8a8f99', 0.42); stern(p, 8, 8.8, 5, '#3a3f4a', 0.42); });
ico('krone', (p) => {
  p.karte(0, 0, [
    '................',
    '................',
    '.r.....r.....r..',
    '.G....GGG....G..',
    '.GG...GGG...GG..',
    '.GGG.GGGGG.GGG..',
    '.GGGGGGGGGGGGG..',
    '.GGGGGGGGGGGGG..',
    '.GGRGGGBGGGRGG..',
    '.GGGGGGGGGGGGG..',
    '.ggggggggggggg..',
    '.GGGGGGGGGGGGG..',
    '.ddddddddddddd..',
    '................',
  ], { G: '#f1c40f', g: '#fff3a0', d: '#b8930a', r: '#e02a3a', B: '#2a7ad0', R: '#e02a3a' });
  p.schiebe(1, 1);
  p.px(2, 5, '#fff3a0').px(2, 6, '#fff3a0').px(8, 4, '#fff3a0');
});
ico('nacht', (p) => {
  p.kreis(7, 8, 6, '#f4e8a0'); p.kreis(10, 6, 5, 'leer');
  p.px(3, 6, '#ffffff').px(2, 8, '#fffbe0');
  p.px(7, 13, '#c8b860').px(9, 13, '#c8b860');
  stern(p, 12, 11, 1.6, '#fff6c0', 0.4); p.px(13, 3, '#fff6c0');
});
ico('tag', (p) => {
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; p.linie(8 + Math.cos(a) * 5, 8 + Math.sin(a) * 5, 8 + Math.cos(a) * 6.8, 8 + Math.sin(a) * 6.8, '#f39c12'); }
  p.kreis(8, 8, 4, '#ffd23a'); p.px(6, 6, '#fff6c0').px(7, 5, '#fff6c0').px(5, 7, '#fff6c0'); p.px(10, 11, '#f0a818').px(11, 10, '#f0a818');
});
function wolke(p, c = '#d8e0e8', d = '#9aa5b1') {
  p.kreis(5, 6, 2.6, c); p.kreis(9, 4.6, 3.2, c); p.kreis(12, 7, 2.3, c); p.rect(3, 7, 10, 2, c);
  p.rect(3, 9, 10, 1, d).px(6, 3, '#ffffff').px(8, 2, '#ffffff').px(4, 5, '#ffffff');
}
ico('regen', (p) => { wolke(p, '#b8c4d0', '#7a8696'); for (const [x, y] of [[4, 11], [7, 12], [10, 11], [13, 12], [5, 14], [11, 14], [8, 14 + 1]]) { p.px(x, y, '#3a8fe0').px(x, y - 1, '#8fc8ff'); } });
ico('schnee', (p) => {
  const C = '#dff2ff';
  for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; p.linie(8 - Math.cos(a) * 6, 8 - Math.sin(a) * 6, 8 + Math.cos(a) * 6, 8 + Math.sin(a) * 6, C); }
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, x = 8 + Math.cos(a) * 4, y = 8 + Math.sin(a) * 4; p.px(x + Math.cos(a + 1.6), y + Math.sin(a + 1.6), '#9ad0f8').px(x + Math.cos(a - 1.6), y + Math.sin(a - 1.6), '#9ad0f8'); }
  p.px(8, 8, '#ffffff');
});
ico('uhr', (p) => {
  p.kreis(8, 8, 6.4, '#2a5aa8'); p.kreis(8, 8, 5, '#f8f6f0');
  for (const [x, y] of [[8, 4], [12, 8], [8, 12], [4, 8]]) p.px(x, y, '#3a3f46');
  p.rect(8, 5, 1, 4, '#22201e').rect(8, 8, 3, 1, '#22201e'); p.px(8, 8, '#d8342a');
  p.px(4, 3, '#6a9ae0').px(3, 4, '#6a9ae0');
});
ico('gift', (p) => {
  halb(p, [
    '........',
    '....WWWW',
    '..WWWWWW',
    '.WWWWWWW',
    '.WWWWWWW',
    '.WWkkkWW',
    '.WWkkkkW',
    '.WWkkkWW',
    '..WWWWWk',
    '...WWWWW',
    '...WkWkW',
    '...WWWWW',
    '....WWWW',
    '........',
  ], { W: '#f0ece0', k: '#22201e' }, 1);
  p.px(3, 3, '#ffffff').px(2, 4, '#ffffff').px(13, 6, '#c8c0aa').px(13, 7, '#c8c0aa').px(12, 9, '#c8c0aa');
  p.px(4, 6, '#7ae04a').px(11, 6, '#7ae04a');
});
ico('lager', (p) => {
  p.rect(2, 3, 12, 11, '#b07a42'); p.rahmen(2, 3, 12, 11, '#7a4a20');
  p.rect(2, 3, 12, 1, '#d8a868').rect(2, 3, 1, 11, '#c88a52');
  p.linie(3, 4, 12, 12, '#7a4a20').linie(4, 4, 13, 12, '#8a5a2b');
  p.rect(2, 8, 12, 1, '#7a4a20');
  for (const [x, y] of [[3, 4], [12, 4], [3, 12], [12, 12]]) p.px(x, y, '#5d6a73');
});
