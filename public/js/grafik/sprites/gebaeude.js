// Stadtgebäude (32x32) in leichter Schrägansicht: Front + rechte Seite + Dach. Licht von oben links.
// Spielerfarbe ('S', 'S-', 'S+') als Fahne/Akzent bei militärischen Gebäuden. Umriss wird automatisch ergänzt.
import { definiere } from '../sprites.js';
import { PAL, hell, dunkel, mische } from '../pixel.js';

const F = {
  stroh: '#d6b25a', lehm: '#c99c68', lehmD: '#9e7248', marmor: '#ece6d6', terra: '#c4623e', schiefer: '#5b6878',
  kupfer: '#5fa58f', tuer: '#4a2e14', dunkelGlas: '#2e4258', sand: '#dcc48e', weiss: '#f2f0ea', rotK: '#d0302a',
  gras: '#5aa84f', grasD: '#3d7f38', wasser: '#3d7fc4', wasserH: '#8fc0ee', glut: '#ff8a2a', gelb: '#ffd84a',
  blau: '#2f6fb0', gruenG: '#6ad06a', nacht: '#1e2632', licht: '#ffe58a', fachwerk: '#f0e2c0',
};
const D = (c, t = 0.28) => dunkel(c, t);
const L = (c, t = 0.2) => hell(c, t);

// ---------- Hilfen ----------
/** Quader: Front (x..x+b-1, unten yb, Höhe h), rechte Seite mit Tiefe d (45°), Deckel. */
function box(p, x, yb, b, h, d, c, o = {}) {
  const top = yb - h + 1;
  p.rect(x, top, b, h, c);
  const sc = o.seite || D(c), dc = o.deckel || L(c, 0.22);
  for (let i = 1; i <= d; i++) p.rect(x + b - 1 + i, top - i, 1, h, sc);
  if (!o.ohneDeckel) for (let k = 1; k <= d; k++) p.rect(x + k, top - k, b - 1, 1, dc);
  if (!o.ohneKante) p.rect(x, top, 1, h, L(c, 0.12));
  return { x, top, b, h, d, yb, r: x + b - 1, c };
}
/** Satteldach, First parallel zur Front. rh = Höhe über Traufe (Bildschirm). */
function sattel(p, B, rh, dach, o = {}) {
  const { x, top, b, d } = B, m = o.m ?? Math.ceil(d / 2);
  p.poly([[x + b - 1, top], [x + b - 1 + d, top - d], [x + b - 1 + m, top - rh]], o.giebel || D(B.c, 0.15));
  for (let j = 0; j <= rh; j++) {
    const s = Math.round(j * m / rh), y = top - j;
    const c = j === 0 ? D(dach, 0.3) : j === rh ? L(dach, 0.3) : (j % 2 ? dach : mische(dach, D(dach, 0.2), 0.6));
    p.rect(x - 1 + s, y, b + 1, 1, c);
    p.px(x - 1 + s, y, L(dach, 0.2));
    if (o.muster) for (let i = (j * 3) % 4; i < b; i += 4) p.px(x + s + i, y, D(dach, 0.25));
  }
  return top - rh;
}
/** Giebel zur Front, First läuft nach hinten. */
function giebel(p, B, rh, dach, o = {}) {
  const { x, top, b, d } = B, cx = x + (b - 1) / 2, ax = Math.round(cx);
  p.poly([[ax, top - rh], [x + b, top], [x + b - 1 + d, top - d], [ax + d - 1, top - rh - d + 1]], D(dach, 0.1));
  for (let j = 1; j < rh; j++) {
    const w = ((b - 1) / 2) * (1 - j / rh);
    p.rect(Math.round(cx - w), top - j, Math.round(cx + w) - Math.round(cx - w) + 1, 1, o.wand || B.c);
  }
  p.linie(x - 1, top, ax, top - rh, L(dach, 0.25));
  p.linie(ax, top - rh, x + b, top, dach);
  p.linie(x - 1, top + 1, ax, top - rh + 1, D(dach, 0.2));
  return top - rh;
}
/** Walm-/Zeltdach mit Spitze über der Dachmitte. */
function zelt(p, B, rh, dach) {
  const { x, top, b, d } = B, ax = Math.round(x + (b - 1) / 2 + d / 2), ay = top - Math.round(d / 2) - rh;
  p.poly([[x + b, top], [x + b - 1 + d, top - d], [ax, ay]], D(dach, 0.25));
  p.poly([[x - 1, top], [x + b, top], [ax, ay]], dach);
  p.linie(x - 1, top, ax, ay, L(dach, 0.25));
  return ay;
}
/** Kuppel (Halbkugel) mit Basis bei yb. */
function kuppel(p, cx, yb, r, c, ry = r) {
  for (let y = Math.round(yb - ry); y <= yb; y++) {
    const t = (yb - y) / (ry + 0.4), hw = Math.sqrt(Math.max(0, 1 - t * t)) * (r + 0.4);
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const u = (x - cx) / (r + 0.5);
      p.px(x, y, u < -0.35 && t > 0.25 ? L(c, 0.3) : u > 0.4 ? D(c, 0.25) : c);
    }
  }
}
/** Kegeldach. */
function kegel(p, cx, yb, r, h, c) {
  for (let j = 0; j <= h; j++) {
    const w = r * (1 - j / h), y = yb - j;
    for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) p.px(x, y, x < cx - w / 3 ? L(c, 0.2) : x > cx + w / 3 ? D(c, 0.25) : c);
  }
}
/** Runder Turm (Zylinder). */
function zylinder(p, x, yb, b, h, c) {
  p.rect(x, yb - h + 1, b, h, c);
  p.rect(x, yb - h + 1, 1, h, L(c, 0.25)).rect(x + 1, yb - h + 1, 1, h, L(c, 0.1));
  p.rect(x + b - 2, yb - h + 1, 2, h, D(c, 0.25));
  p.ellipse(x + (b - 1) / 2, yb - h + 1, (b - 1) / 2, 1, L(c, 0.2));
}
function fenster(p, x, y, w = 2, h = 2, c = PAL.glas) { p.rect(x, y, w, h, c); p.px(x, y, L(c, 0.45)); if (w > 1 && h > 1) p.px(x + w - 1, y + h - 1, D(c, 0.25)); }
function fensterReihe(p, x, y, n, abst, w = 2, h = 2, c = PAL.glas) { for (let i = 0; i < n; i++) fenster(p, x + i * abst, y, w, h, c); }
function bogenFenster(p, x, y, w, h, c = PAL.glasD) { p.rect(x, y + 1, w, h - 1, c); p.rect(x + (w > 2 ? 1 : 0), y, w - (w > 2 ? 2 : 0), 1, c); p.px(x + (w > 2 ? 1 : 0), y, L(c, 0.4)); }
function tuer(p, x, yb, w = 2, h = 4, c = F.tuer) { p.rect(x, yb - h + 1, w, h, c); p.rect(x, yb - h + 1, w, 1, D(c, 0.3)); }
function saeulen(p, x, yb, n, abst, h, c = F.marmor) {
  for (let i = 0; i < n; i++) { const xx = x + i * abst; p.rect(xx, yb - h + 1, 2, h, c); p.px(xx + 1, yb - h + 1, D(c, 0.2)); p.rect(xx + 1, yb - h + 2, 1, h - 2, D(c, 0.15)); }
}
/** Spielerfahne; (x,yb) = Fuß der Stange. */
function fahne(p, x, yb, h = 9, w = 5) {
  p.rect(x, yb - h, 1, h + 1, PAL.holzD);
  p.rect(x + 1, yb - h, w, 1, 'S+').rect(x + 1, yb - h + 1, w, 1, 'S').rect(x + 1, yb - h + 2, w - 1, 1, 'S-');
  p.px(x, yb - h - 1, PAL.gold);
}
function rauch(p, x, y, n = 3) { for (let i = 0; i < n; i++) p.kreis(x + i, y - i * 3, 1 + i * 0.45, i ? '#c4c4c4' : '#9a9a9a'); }
function schornstein(p, x, yb, h, c = PAL.backstein, w = 3) { p.rect(x, yb - h + 1, w, h, c).rect(x, yb - h + 1, 1, h, L(c, 0.2)).rect(x + w - 1, yb - h + 1, 1, h, D(c, 0.25)).rect(x - 1, yb - h + 1, w + 2, 1, D(c, 0.15)); }
function sack(p, x, yb, c = PAL.stoff) { p.karte(x, yb - 5, ['.kk.', 'dssd', 'shsd', 'hssd', 'sssd', '.dd.'], { k: PAL.lederD, s: c, h: L(c, 0.3), d: D(c, 0.3) }); }
function kiste(p, x, yb, s = 4, c = PAL.holzH) { p.rect(x, yb - s + 1, s, s, c); p.rahmen(x, yb - s + 1, s, s, D(c, 0.3)); p.linie(x, yb - s + 1, x + s - 1, yb, D(c, 0.3)); }
function fass(p, x, yb, c = PAL.holz) { p.rect(x, yb - 3, 3, 4, c); p.rect(x, yb - 2, 3, 1, PAL.eisenD); p.px(x, yb - 3, L(c, 0.3)); p.rect(x + 2, yb - 3, 1, 4, D(c, 0.25)); }
function wasser(p, x, y, w, h) { p.rect(x, y, w, h, F.wasser); for (let i = 0; i < w - 5; i += 5) p.rect(x + i + Math.round((y / 2) % 3), y, 3, 1, F.wasserH); if (h > 2) for (let i = 2; i < w; i += 6) p.rect(x + i, y + 2, 2, 1, '#6aa6e0'); }
function baum(p, x, yb, r = 3) { p.rect(x, yb - 2, 1, 3, PAL.holzD); p.kreis(x, yb - 2 - r, r, PAL.gruen); p.kreis(x - 1, yb - 3 - r, r / 2, PAL.gruenH); p.px(x + r - 1, yb - 1 - r, PAL.gruenD); }
function zinnen(p, x, y, b, c, abst = 2) { for (let i = 0; i < b; i += abst) p.rect(x + i, y - 1, 1, 1, c); }
function rotesKreuz(p, cx, cy, s = 1) { p.rect(cx - s, cy - 3 * s, 2 * s + 1, 6 * s + 1, F.rotK); p.rect(cx - 3 * s, cy - s, 6 * s + 1, 2 * s + 1, F.rotK); }
function pferdKopf(p, x, y, c = '#8a5a32') {
  p.karte(x, y, ['.mm..', 'mkkk.', 'kkkkk', '.kkkkk', '..kkkw', '..kk..'], { m: '#3a2414', k: c, w: D(c, 0.3) });
  p.px(x + 2, y + 2, PAL.schwarz);
}
function zahnrad(p, cx, cy, r, c) { p.kreis(cx, cy, r, c); for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]) p.px(Math.round(cx + dx * (r + 1)), Math.round(cy + dy * (r + 1)), c); p.kreis(cx, cy, Math.max(0.6, r / 2.5), D(c, 0.4)); }
function muenze(p, cx, cy, r = 3) { p.kreis(cx, cy, r, PAL.gold); p.kreis(cx, cy, r - 1, '#ffd94a'); p.px(cx - 1, cy - 1, '#fff2b0'); p.rect(cx, cy - 1, 1, 3, PAL.goldD); p.kreis(cx + 0.5, cy + 0.5, r, null); }
function maske(p, x, y, c, froh) {
  p.ellipse(x + 2, y + 2, 2, 2.5, c);
  p.px(x + 1, y + 1, PAL.schwarz).px(x + 3, y + 1, PAL.schwarz);
  if (froh) p.px(x + 1, y + 3, PAL.schwarz).rect(x + 2, y + 4, 1, 1, PAL.schwarz).px(x + 3, y + 3, PAL.schwarz);
  else p.px(x + 1, y + 4, PAL.schwarz).rect(x + 2, y + 3, 1, 1, PAL.schwarz).px(x + 3, y + 4, PAL.schwarz);
}
function kran(p, x, yb, h, ausleger, c = PAL.holz) {
  p.rect(x, yb - h, 2, h + 1, c).rect(x, yb - h, 1, h + 1, L(c, 0.2));
  p.rect(x - 2, yb - h, ausleger + 2, 1, c);
  p.linie(x + 1, yb - h + 3, x + ausleger - 2, yb - h + 1, D(c, 0.2));
  p.rect(x + ausleger - 1, yb - h + 1, 1, Math.floor(h / 2), PAL.schwarz);
}
function schiff(p, x, yb, l, c = PAL.holz) {
  p.poly([[x, yb - 3], [x + l, yb - 3], [x + l - 3, yb], [x + 3, yb]], c);
  p.rect(x, yb - 3, l + 1, 1, L(c, 0.25));
}
function g(id, zeichne) { definiere('gebaeude', id, { w: 32, h: 32, zeichne }); }

// ===================== Antike =====================
g('palast', (p) => {
  const B = box(p, 3, 29, 22, 9, 4, F.marmor);
  saeulen(p, 5, 29, 6, 4, 7, F.weiss);
  p.rect(3, 21, 22, 1, PAL.gold);
  sattel(p, B, 4, F.terra);
  box(p, 10, 22, 8, 7, 3, F.marmor);
  p.rect(10, 16, 8, 1, PAL.gold);
  fensterReihe(p, 11, 18, 3, 2, 1, 3, F.dunkelGlas);
  kuppel(p, 15, 14, 5, PAL.gold, 6);
  p.rect(15, 6, 1, 2, PAL.goldD); p.px(15, 5, PAL.gold);
  tuer(p, 13, 29, 3, 5, F.tuer);
  fahne(p, 5, 20, 7, 4); fahne(p, 25, 18, 7, 4);
});
g('kornspeicher', (p) => {
  const B = box(p, 6, 27, 15, 10, 5, PAL.holz, { ohneDeckel: true });
  for (let x = 8; x < 21; x += 3) p.rect(x, 18, 1, 10, PAL.holzD);
  sattel(p, B, 9, F.stroh, { muster: true });
  tuer(p, 11, 27, 5, 6, '#3a2410');
  p.rect(12, 25, 3, 3, F.stroh); p.px(13, 24, F.stroh);
  sack(p, 1, 30, '#e0cc98'); sack(p, 6, 30, '#c8b07a');
  sack(p, 21, 30, '#e0cc98'); sack(p, 26, 30, '#c8b07a');
  p.px(11, 30, F.stroh).px(12, 30, F.stroh).px(16, 29, F.stroh);
});
g('toepferei', (p) => {
  const B = box(p, 3, 28, 13, 8, 4, F.lehm);
  sattel(p, B, 6, F.stroh, { muster: true });
  tuer(p, 7, 28, 3, 5);
  // Brennofen (Kuppel) mit Glut
  kuppel(p, 23, 28, 6, F.lehmD, 7);
  p.rect(21, 25, 4, 4, '#2a1a10').rect(22, 26, 2, 3, F.glut).px(22, 27, F.gelb);
  rauch(p, 24, 18, 3);
  // Amphoren
  const krug = (x, c) => p.karte(x, 24, ['.n.', 'hrh', 'rrr', 'rlr', 'rrr', 'rrr', '.r.'], { n: D(c, 0.3), r: c, l: L(c, 0.35), h: D(c, 0.15) });
  krug(2, F.terra); krug(10, '#b0703e'); krug(13, F.terra);
});
g('schrein', (p) => {
  // Steinsockel
  box(p, 7, 29, 16, 3, 3, PAL.stein);
  p.rect(10, 26, 10, 1, PAL.steinD);
  // Pfosten und geschwungenes Dach
  p.rect(10, 17, 2, 10, F.terra).rect(19, 17, 2, 10, F.terra);
  p.rect(10, 17, 1, 10, L(F.terra, 0.3));
  p.rect(7, 15, 17, 2, '#6a2a1e').rect(6, 14, 19, 1, '#8a3a26').px(5, 13, '#8a3a26').px(25, 13, '#8a3a26');
  p.rect(8, 12, 15, 2, '#a8442e').rect(10, 11, 11, 1, L('#a8442e', 0.2));
  p.rect(15, 9, 1, 2, PAL.gold);
  // Altar mit Flamme
  p.rect(13, 23, 5, 3, PAL.steinH).rect(13, 23, 5, 1, PAL.weiss);
  p.ellipse(15, 21, 1, 2, F.glut).px(15, 21, F.gelb).px(15, 19, F.glut);
});
g('denkmal', (p) => {
  box(p, 7, 29, 16, 3, 3, PAL.steinD);
  box(p, 10, 26, 10, 3, 2, PAL.stein);
  // Obelisk
  p.poly([[13, 23], [17, 23], [16, 7], [14, 7]], F.sand);
  p.poly([[16, 23], [17, 23], [16, 7], [15, 7]], D(F.sand, 0.2));
  p.rect(13, 23, 1, 1, L(F.sand, 0.2)).linie(13, 22, 14, 8, L(F.sand, 0.3));
  p.poly([[14, 7], [16, 7], [15, 4]], PAL.gold);
  p.px(15, 12, PAL.goldD).px(15, 15, PAL.goldD).px(15, 18, PAL.goldD);
  // Kränze
  p.kreis(9, 25, 1, F.grasD); p.kreis(21, 25, 1, F.grasD);
});
g('bibliothek', (p) => {
  const B = box(p, 3, 29, 20, 11, 5, F.marmor);
  // Regale mit Büchern hinter Säulen
  p.rect(5, 21, 16, 7, '#5a3a1a');
  const farben = ['#b03a2e', '#2e6ab0', '#3d8f3a', '#d4a020', '#7a3fa0', '#b06a2e'];
  for (let x = 5, i = 0; x < 21; x++, i++) { p.rect(x, 21, 1, 3, farben[i % 6]); p.rect(x, 25, 1, 3, farben[(i + 3) % 6]); }
  p.rect(5, 24, 16, 1, PAL.holzD);
  saeulen(p, 4, 29, 5, 4, 9, F.weiss);
  p.rect(3, 19, 20, 1, PAL.steinD);
  giebel(p, B, 6, F.terra, { wand: F.marmor });
  p.kreis(13, 15, 1, PAL.gold);
  p.rect(2, 29, 23, 1, PAL.steinH);
});
g('brunnen', (p) => {
  // Steinring
  p.ellipse(15, 26, 9, 4, PAL.stein);
  p.ellipse(15, 24, 7, 2, '#244a74');
  p.ellipse(15, 24, 5, 1, F.wasser);
  p.rect(6, 26, 19, 3, PAL.stein);
  for (let x = 7; x < 25; x += 3) p.rect(x, 27, 2, 1, PAL.steinD);
  p.rect(6, 26, 1, 3, PAL.steinH);
  p.ellipse(15, 29, 9, 1, PAL.steinD);
  // Holzgestell mit Kurbel und Dach
  p.rect(7, 12, 2, 13, PAL.holz).rect(22, 12, 2, 13, PAL.holzD);
  p.rect(8, 15, 15, 1, PAL.holzD);
  p.rect(14, 16, 1, 5, PAL.eisenD);
  p.rect(13, 20, 3, 3, PAL.holzH).rect(13, 21, 3, 1, PAL.eisenD);
  p.rect(23, 15, 2, 1, PAL.eisen).rect(24, 16, 1, 2, PAL.eisen);
  p.poly([[4, 13], [27, 13], [24, 7], [7, 7]], F.stroh);
  p.rect(5, 12, 22, 1, D(F.stroh, 0.25)); p.rect(8, 7, 16, 1, L(F.stroh, 0.3));
  for (let x = 7; x < 25; x += 3) p.px(x, 10, D(F.stroh, 0.2));
});
g('stadtmauer_holz', (p) => {
  // Palisade aus angespitzten Stämmen mit Tor
  for (let x = 3; x < 28; x += 3) {
    if (x >= 12 && x <= 17) continue;
    const h = 13 + ((x * 7) % 3);
    p.rect(x, 29 - h, 3, h, PAL.holz).rect(x, 29 - h, 1, h, PAL.holzH).rect(x + 2, 29 - h, 1, h, PAL.holzD);
    p.px(x + 1, 28 - h, PAL.holz);
  }
  p.rect(2, 21, 28, 1, PAL.holzD);
  // Tor
  p.rect(12, 13, 2, 17, PAL.holzD).rect(18, 13, 2, 17, PAL.holzD);
  p.rect(11, 12, 10, 2, PAL.holz).rect(11, 12, 10, 1, PAL.holzH);
  p.rect(14, 17, 4, 13, '#3a2410');
  p.rect(14, 20, 4, 1, PAL.holzD).rect(14, 25, 4, 1, PAL.holzD);
  fahne(p, 16, 11, 8, 5);
});
g('wachturm', (p) => {
  // Stelzen
  p.linie(9, 29, 12, 13, PAL.holz).linie(10, 29, 13, 13, PAL.holz);
  p.linie(22, 29, 19, 13, PAL.holzD).linie(21, 29, 18, 13, PAL.holzD);
  p.linie(11, 24, 20, 18, PAL.holzD).linie(11, 18, 20, 24, PAL.holz);
  p.rect(14, 13, 1, 17, PAL.holzD);
  // Plattform mit Brüstung
  p.rect(9, 11, 14, 3, PAL.holz).rect(9, 11, 14, 1, PAL.holzH);
  for (let x = 9; x < 23; x += 2) p.rect(x, 8, 1, 3, PAL.holzD);
  p.rect(9, 8, 14, 1, PAL.holz);
  // Dach
  p.poly([[7, 7], [24, 7], [16, 1]], F.stroh);
  p.linie(7, 7, 16, 1, L(F.stroh, 0.3)); p.rect(7, 7, 18, 1, D(F.stroh, 0.25));
  fahne(p, 23, 13, 9, 5);
});
g('kaserne', (p) => {
  const B = box(p, 3, 29, 20, 9, 5, PAL.holz, { ohneDeckel: true });
  for (let x = 3; x < 23; x += 2) p.rect(x, 21, 1, 9, PAL.holzD);
  sattel(p, B, 7, F.stroh, { muster: true });
  tuer(p, 11, 29, 4, 6, '#2e1c0c');
  // Schild mit Spielerfarbe und gekreuzte Speere
  p.linie(4, 30, 10, 18, PAL.holzH).linie(10, 30, 4, 18, PAL.holzH);
  p.px(10, 17, PAL.eisenH).px(4, 17, PAL.eisenH).px(11, 16, PAL.eisenH).px(3, 16, PAL.eisenH);
  p.ellipse(7, 24, 3, 3.5, 'S').ellipse(7, 24, 1.5, 2, 'S+').px(7, 24, PAL.gold);
  p.rect(16, 23, 3, 2, F.dunkelGlas);
  fahne(p, 26, 22, 9, 4);
});
g('lager', (p) => {
  // Offener Schuppen
  p.rect(4, 15, 2, 15, PAL.holz).rect(22, 15, 2, 15, PAL.holzD).rect(26, 12, 2, 14, PAL.holzD);
  p.rect(6, 18, 16, 12, '#4a3220');
  p.poly([[2, 16], [25, 16], [30, 11], [7, 11]], F.stroh);
  p.rect(2, 16, 24, 1, D(F.stroh, 0.3)); p.linie(7, 11, 30, 11, L(F.stroh, 0.3));
  for (let x = 6; x < 26; x += 3) p.px(x + 1, 13, D(F.stroh, 0.2));
  // Kisten & Fässer
  kiste(p, 7, 29, 5); kiste(p, 12, 29, 5, PAL.holz); kiste(p, 9, 24, 4);
  fass(p, 18, 29); fass(p, 25, 30); fass(p, 28, 30, PAL.holzD);
  sack(p, 19, 25);
});
g('bronzeschmiede', (p) => {
  const B = box(p, 3, 28, 15, 9, 4, F.lehm);
  sattel(p, B, 6, F.stroh, { muster: true });
  schornstein(p, 15, 18, 8, PAL.steinD);
  rauch(p, 16, 9, 3);
  // Esse mit Glut
  p.rect(6, 22, 7, 7, '#2a1a10').rect(7, 24, 5, 4, F.glut).rect(8, 25, 3, 2, F.gelb);
  // Amboss
  p.rect(20, 25, 7, 2, PAL.bronzeD).rect(19, 25, 2, 1, PAL.bronzeD).rect(22, 27, 3, 2, PAL.bronzeD).rect(21, 29, 5, 1, PAL.bronzeD);
  p.rect(20, 25, 7, 1, PAL.bronze);
  p.rect(25, 20, 1, 4, PAL.holz).rect(24, 19, 3, 2, PAL.eisenD);
  p.px(21, 23, F.gelb).px(23, 22, F.glut);
});
g('stall', (p) => {
  const B = box(p, 2, 24, 17, 11, 5, PAL.holzH, { ohneDeckel: true });
  for (let y = 15; y < 24; y += 2) p.rect(2, y, 17, 1, PAL.holz);
  giebel(p, B, 7, F.stroh, { wand: PAL.holzH });
  p.karte(8, 7, ['.eee.', 'e...e', 'e...e', 'e...e', 'ee.ee'], { e: PAL.eisenH });
  p.rect(6, 16, 9, 9, '#1e140a'); p.linie(6, 16, 14, 24, PAL.holz).linie(14, 16, 6, 24, PAL.holz); p.rahmen(6, 16, 9, 9, PAL.holz);
  // Pferd vor dem Stall
  p.karte(14, 17, [
    '..........mk.',
    '.........mkkk',
    '.........kekk',
    '........kkk.n',
    't.kkkkkkkkk..',
    'tkkkkkkkkkk..',
    't.kkkkkkkk...',
    '..kkkkkkkk...',
    '..k.k...k.k..',
    '..k.k...k.k..',
    '..k.k...k.k..',
    '..h.h...h.h..',
  ], { m: '#2a1a0e', t: '#2a1a0e', k: '#f0ebe0', e: PAL.schwarz, n: '#b8b0a0', h: '#3a2414' });
  p.rect(17, 23, 6, 1, '#d0c8b8');
  p.rect(18, 22, 4, 1, 'S');
  // Heu
  p.rect(1, 26, 6, 4, F.stroh); p.rect(1, 26, 6, 1, L(F.stroh, 0.3)); p.rect(1, 28, 6, 1, D(F.stroh, 0.2));
});

// ===================== Klassik =====================
g('tempel', (p) => {
  const B = box(p, 4, 26, 20, 11, 4, F.marmor);
  p.rect(5, 16, 18, 10, '#6a5a48');
  p.ellipse(14, 22, 1.5, 2, F.glut).px(14, 22, F.gelb);
  saeulen(p, 5, 26, 5, 4, 10, F.weiss);
  p.rect(4, 15, 20, 2, F.marmor).rect(4, 16, 20, 1, D(F.marmor, 0.15));
  giebel(p, B, 6, F.marmor, { wand: L(F.marmor, 0.1) });
  p.rect(13, 12, 3, 1, PAL.gold);
  // Stufen
  p.rect(3, 27, 22, 1, PAL.steinH).rect(2, 28, 24, 1, F.marmor).rect(1, 29, 26, 1, PAL.steinH);
  p.rect(25, 27, 2, 1, PAL.steinD).rect(26, 28, 2, 1, PAL.steinD).rect(27, 29, 2, 1, PAL.steinD);
});
g('markt', (p) => {
  // Drei Stände mit gestreiften Markisen
  const stand = (x, yb, c1, c2, ware) => {
    p.rect(x, yb - 9, 1, 10, PAL.holzD).rect(x + 8, yb - 9, 1, 10, PAL.holzD);
    for (let i = 0; i < 10; i++) { p.rect(x - 1 + i, yb - 11, 1, 3, i % 2 ? c1 : c2); p.px(x - 1 + i, yb - 8, i % 2 ? D(c1, 0.2) : D(c2, 0.2)); }
    p.rect(x, yb - 12, 9, 1, L(c1, 0.3));
    p.rect(x, yb - 3, 9, 4, PAL.holz).rect(x, yb - 3, 9, 1, PAL.holzH);
    for (let i = 0; i < 4; i++) p.kreis(x + 1.5 + i * 2, yb - 5, 1, ware[i % ware.length]);
  };
  stand(17, 20, '#c0392b', F.weiss, ['#e74c3c', '#f39c12']);
  stand(3, 22, '#2e6ab0', F.weiss, ['#6ad06a', '#f1c40f']);
  stand(14, 30, '#d4a020', '#7a3fa0', ['#e67e22', '#c0392b', '#8e44ad']);
  fass(p, 4, 30); sack(p, 8, 30, PAL.stoffD); kiste(p, 26, 30, 4);
});
g('werkstatt', (p) => {
  const B = box(p, 3, 28, 17, 10, 5, F.fachwerk);
  p.rect(3, 19, 17, 1, PAL.holzD).rect(3, 24, 17, 1, PAL.holzD);
  for (const x of [3, 9, 14, 19]) p.rect(x, 19, 1, 10, PAL.holzD);
  p.linie(3, 24, 9, 19, PAL.holzD).linie(14, 19, 19, 24, PAL.holzD);
  sattel(p, B, 7, F.terra, { muster: true });
  tuer(p, 10, 28, 4, 4);
  // Werkbank, Säge, Hammer
  p.rect(20, 26, 9, 1, PAL.holzH).rect(21, 27, 1, 3, PAL.holzD).rect(27, 27, 1, 3, PAL.holzD);
  p.rect(22, 25, 4, 1, PAL.eisenH).linie(22, 25, 25, 24, PAL.eisen).rect(26, 24, 1, 2, PAL.holz);
  p.rect(21, 22, 1, 3, PAL.holz).rect(20, 21, 3, 1, PAL.eisenD);
  // Stämme
  p.rect(4, 28, 12, 2, PAL.holz).rect(4, 28, 12, 1, PAL.holzH); p.kreis(16, 29, 1, '#d8a868');
});
g('aquaedukt', (p) => {
  // Zwei Bogenreihen mit Wasserrinne oben
  p.rect(1, 12, 30, 18, PAL.steinH);
  p.rect(1, 12, 30, 1, L(PAL.steinH, 0.2));
  for (let i = 0; i < 4; i++) { const x = 2 + i * 7; p.rect(x + 1, 22, 5, 8, 'leer'); p.ellipse(x + 3, 22, 2.5, 2.5, 'leer'); p.rect(x + 1, 22, 5, 8, 'leer'); }
  for (let i = 0; i < 7; i++) { const x = 1 + i * 4.3; p.rect(Math.round(x + 1), 15, 2, 3, 'leer'); p.ellipse(Math.round(x + 1.5), 15, 1, 1, 'leer'); }
  // Schattenkanten der Pfeiler
  for (let i = 0; i < 5; i++) p.rect(1 + i * 7, 20, 1, 10, PAL.stein);
  p.rect(1, 19, 30, 1, PAL.steinD); p.rect(1, 13, 30, 1, PAL.stein);
  for (let x = 1; x < 31; x += 4) p.px(x, 21, PAL.steinD);
  // Wasser oben
  p.rect(1, 10, 30, 2, F.wasser).rect(1, 10, 30, 1, F.wasserH);
  p.rect(1, 9, 30, 1, PAL.stein);
  p.rect(1, 30, 30, 1, PAL.steinD);
});
g('kolosseum', (p) => {
  p.ellipse(15.5, 18, 14, 9, PAL.putzD);
  p.rect(1, 18, 30, 11, PAL.putz);
  p.ellipse(15.5, 28, 14, 2, PAL.putz);
  // Arena innen
  p.ellipse(15.5, 15, 11, 5, PAL.putzD);
  p.ellipse(15.5, 16, 9, 3, '#d8c08a');
  p.rect(3, 13, 1, 4, PAL.putz);
  // Bogenreihen
  for (const y of [20, 25]) for (let x = 3; x < 29; x += 3) { p.rect(x, y, 2, 3, '#5a4a38'); p.px(x, y, '#7a6a52'); }
  p.rect(1, 19, 30, 1, D(PAL.putz, 0.15)); p.rect(1, 24, 30, 1, D(PAL.putz, 0.15));
  p.rect(26, 18, 5, 12, D(PAL.putz, 0.18));
  p.rect(1, 18, 1, 11, L(PAL.putz, 0.2));
});
g('stadtmauer_stein', (p) => {
  const B = box(p, 1, 29, 26, 13, 3, PAL.stein, { ohneDeckel: true });
  for (let y = 18; y < 30; y += 3) for (let x = 1 + ((y / 3) % 2) * 2; x < 27; x += 4) p.px(x, y, PAL.steinD);
  p.rect(1, 16, 26, 1, PAL.steinH);
  for (let x = 1; x < 27; x += 4) { p.rect(x, 13, 2, 3, PAL.stein); p.px(x, 13, PAL.steinH); }
  void B;
  // Tor
  p.rect(10, 21, 8, 9, '#2a2018'); p.ellipse(13.5, 21, 3.5, 3, '#2a2018');
  for (let x = 11; x < 18; x += 2) p.rect(x, 20, 1, 10, PAL.eisenD);
  p.rect(10, 24, 8, 1, PAL.eisenD);
  fahne(p, 21, 12, 9, 5);
});
g('werft', (p) => {
  wasser(p, 1, 26, 30, 4);
  // Helling
  p.poly([[1, 24], [30, 21], [30, 25], [1, 26]], PAL.holzD);
  p.linie(1, 24, 30, 21, PAL.holzH);
  // Gerüst hinten
  for (const x of [3, 27]) p.rect(x, 7, 1, 16, PAL.holzH);
  p.rect(3, 7, 25, 1, PAL.holzH);
  p.rect(14, 3, 1, 5, PAL.holzD); p.rect(10, 4, 9, 1, PAL.holzD);
  // Halbfertiger Rumpf: links beplankt, rechts nur Spanten
  p.poly([[4, 11], [26, 10], [23, 21], [8, 22]], '#7a4a22');
  for (let y = 12; y < 22; y += 2) p.linie(5 + (y - 11) * 0.35, y, 15, y - 0.3, PAL.holzH);
  p.linie(4, 11, 15, 10.5, L(PAL.holzH, 0.2));
  p.rect(16, 11, 8, 10, 'leer');
  p.rect(7, 13, 2, 1, PAL.holzD);
  for (let x = 16; x < 26; x += 3) { p.linie(x, 10, x - 1 - Math.round((x - 15) * 0.25), 21, PAL.holzH); p.px(x, 10, L(PAL.holzH, 0.3)); }
  p.linie(15, 11, 25, 10, PAL.holz);
  p.rect(8, 21, 15, 1, PAL.holzD);
  // Stützen
  for (const x of [9, 15, 21]) p.rect(x, 22, 1, 2, PAL.holzH);
});
g('leuchtturm', (p) => {
  // Fels und Wasser
  wasser(p, 1, 27, 30, 3);
  p.ellipse(15, 27, 9, 3, PAL.steinD); p.ellipse(13, 26, 6, 2, PAL.stein);
  // Turm
  p.poly([[11, 26], [20, 26], [18, 9], [13, 9]], F.weiss);
  p.poly([[17, 26], [20, 26], [18, 9], [17, 9]], D(F.weiss, 0.2));
  p.rect(12, 14, 7, 2, F.rotK); p.rect(11, 21, 9, 2, F.rotK);
  tuer(p, 14, 26, 2, 3);
  // Laterne mit Feuer
  p.rect(11, 8, 9, 1, PAL.steinD);
  p.rect(12, 4, 7, 4, F.gelb).rect(13, 5, 5, 2, '#fff6c0');
  p.rect(12, 4, 1, 4, PAL.steinD).rect(18, 4, 1, 4, PAL.steinD);
  p.poly([[11, 4], [20, 4], [15, 1]], F.rotK);
  // Lichtstrahlen
  p.linie(8, 5, 4, 4, '#fff2a0').linie(23, 5, 28, 4, '#fff2a0');
});
g('badehaus', (p) => {
  const B = box(p, 3, 24, 22, 9, 4, PAL.putz);
  for (let x = 6; x < 24; x += 5) bogenFenster(p, x, 18, 3, 5, PAL.glasD);
  zelt(p, B, 2, F.terra);
  kuppel(p, 14, 15, 5, PAL.steinH, 5);
  p.px(14, 9, PAL.gold);
  // Becken mit Brunnenfigur
  p.rect(1, 25, 30, 5, PAL.steinH);
  p.rect(3, 26, 26, 3, F.wasser).rect(3, 26, 26, 1, F.wasserH);
  for (let x = 6; x < 28; x += 6) p.rect(x, 27, 2, 1, '#6aa6e0');
  p.rect(1, 25, 30, 1, F.weiss);
  p.rect(27, 20, 2, 6, PAL.steinH); p.px(27, 19, PAL.steinH);
  p.linie(26, 20, 23, 25, F.wasserH);
});
g('muenzpraegeanstalt', (p) => {
  const B = box(p, 4, 29, 18, 11, 5, PAL.stein);
  sattel(p, B, 5, F.schiefer);
  // Große Goldmünze an der Fassade
  p.kreis(13, 23, 4, PAL.goldD); p.kreis(12.5, 22.5, 3.5, PAL.gold); p.kreis(12.5, 22.5, 2, '#ffd94a');
  p.px(11, 21, '#fff2b0'); p.rect(12, 21, 1, 4, PAL.goldD);
  tuer(p, 18, 29, 3, 4);
  // Münzstapel
  for (let i = 0; i < 4; i++) { p.rect(25, 29 - i * 2, 5, 2, PAL.gold); p.rect(25, 29 - i * 2, 5, 1, '#ffe27a'); }
  for (let i = 0; i < 2; i++) { p.rect(1, 29 - i * 2, 4, 2, PAL.gold); p.rect(1, 29 - i * 2, 4, 1, '#ffe27a'); }
});
g('campus', (p) => {
  // Säulenhalle (Stoa) mit Innenhof, Baum und Schriftrolle
  p.rect(1, 25, 30, 5, '#cbbf9a'); p.rect(1, 25, 30, 1, L('#cbbf9a', 0.2));
  const B = box(p, 2, 21, 26, 6, 3, PAL.putz);
  saeulen(p, 3, 21, 7, 4, 5, F.weiss);
  p.rect(2, 16, 27, 1, PAL.steinD);
  sattel(p, B, 4, F.terra);
  baum(p, 6, 29, 3);
  // Lesepult mit Schriftrolle
  p.rect(18, 26, 1, 4, PAL.holzD);
  p.rect(15, 24, 8, 2, F.weiss).rect(15, 24, 1, 2, PAL.stoffD).rect(22, 24, 1, 2, PAL.stoffD);
  p.rect(17, 24, 4, 1, PAL.steinD);
  p.rect(25, 26, 4, 4, PAL.steinH).rect(25, 26, 4, 1, F.weiss);
});
g('ziegelei', (p) => {
  // Brennofen aus Ziegel mit Schornstein
  const B = box(p, 3, 29, 14, 10, 4, PAL.backstein);
  for (let y = 21; y < 29; y += 2) for (let x = 3 + (y % 4 === 1 ? 0 : 2); x < 17; x += 4) p.px(x, y, PAL.backsteinD);
  kuppel(p, 10, 19, 7, PAL.backsteinD, 4);
  schornstein(p, 13, 15, 9, PAL.backstein);
  rauch(p, 14, 5, 2);
  p.rect(7, 24, 5, 5, '#2a1a10').rect(8, 26, 3, 3, F.glut);
  // Ziegelstapel
  for (let r = 0; r < 4; r++) for (let i = 0; i < 3 - (r > 1); i++) { const x = 20 + i * 3 + (r % 2), y = 29 - r * 2; p.rect(x, y, 3, 2, F.terra); p.rect(x, y, 3, 1, L(F.terra, 0.25)); p.px(x + 2, y + 1, D(F.terra, 0.3)); }
});

// ===================== Mittelalter =====================
g('kathedrale', (p) => {
  const B = box(p, 8, 29, 15, 13, 3, PAL.steinH);
  giebel(p, B, 5, F.schiefer, { wand: PAL.steinH });
  // Zwei Türme mit Spitzen
  for (const x of [3, 21]) {
    box(p, x, 29, 7, 19, 2, PAL.stein);
    bogenFenster(p, x + 2, 14, 3, 5, PAL.glasD);
    kegel(p, x + 3.5, 10, 4, 9, F.schiefer);
    p.px(x + 3, 1, PAL.gold);
  }
  // Rosette und Portal
  p.kreis(15, 20, 3, '#7a3fa0'); p.kreis(15, 20, 2, '#2e6ab0'); p.px(15, 20, F.gelb); p.rect(15, 17, 1, 7, '#c0392b'); p.rect(12, 20, 7, 1, '#c0392b');
  p.rect(13, 25, 5, 5, '#2a2018'); p.ellipse(15, 25, 2.5, 2, '#2a2018');
});
g('universitaet', (p) => {
  const B = box(p, 2, 29, 26, 10, 3, '#b8a888');
  fensterReihe(p, 4, 22, 3, 3, 2, 3, PAL.glasD); fensterReihe(p, 20, 22, 3, 3, 2, 3, PAL.glasD);
  sattel(p, B, 5, F.schiefer);
  // Mittelturm mit Uhr
  box(p, 11, 29, 8, 24, 2, PAL.steinH);
  p.kreis(15, 13, 2.5, F.weiss); p.rahmen(13, 11, 5, 5, PAL.gold); p.rect(15, 11, 1, 3, PAL.schwarz).rect(15, 13, 2, 1, PAL.schwarz);
  bogenFenster(p, 14, 18, 3, 4, PAL.glasD);
  tuer(p, 13, 29, 4, 5, F.tuer);
  kegel(p, 15.5, 5, 5, 4, F.kupfer);
  p.rect(15, 0 + 1, 1, 1, PAL.gold);
});
g('theater', (p) => {
  const B = box(p, 2, 29, 23, 12, 5, '#d8b88a');
  p.rect(5, 20, 17, 9, '#5a1018');
  p.rect(5, 20, 17, 2, '#c0392b');
  for (let x = 6; x < 22; x += 3) p.rect(x, 22, 1, 7, '#8e1a22');
  p.rect(5, 22, 3, 7, '#c0392b').rect(19, 22, 3, 7, '#c0392b');
  p.rect(2, 18, 23, 2, PAL.gold);
  sattel(p, B, 5, F.terra);
  // Komödien- und Tragödienmaske
  p.karte(6, 6, ['.wwwww.', 'wwwwwww', 'wkkwkkw', 'wwwwwww', 'wkwwwkw', 'wwkkkww', '.wwwww.', '..www..'], { w: F.weiss, k: PAL.schwarz });
  p.karte(15, 7, ['.ggggg.', 'ggggggg', 'gkkgkkg', 'ggggggg', 'gggkggg', 'ggkgkgg', '.gkggg.', '..ggg..'], { g: '#f0c040', k: PAL.schwarz });
  p.px(17, 13, '#f0c040');
  p.linie(13, 8, 15, 10, '#c0392b');
  p.rect(1, 29, 25, 1, PAL.steinD);
});
g('burgturm', (p) => {
  zylinder(p, 8, 29, 15, 22, PAL.stein);
  for (let y = 10; y < 29; y += 3) for (let x = 9 + ((y / 3) % 2) * 2; x < 22; x += 4) p.px(x, y, PAL.steinD);
  p.rect(7, 6, 17, 3, PAL.stein); p.rect(7, 6, 1, 3, PAL.steinH); p.rect(22, 6, 2, 3, PAL.steinD);
  for (let x = 7; x < 24; x += 3) p.rect(x, 4, 2, 2, PAL.stein);
  p.rect(14, 13, 2, 4, '#1a1612'); p.rect(14, 21, 2, 3, '#1a1612');
  tuer(p, 13, 29, 4, 4, '#2a2018');
  p.rect(15, 1, 1, 3, PAL.holzD);
  p.rect(16, 1, 6, 1, 'S+').rect(16, 2, 6, 1, 'S').rect(16, 3, 5, 1, 'S-');
});
g('waffenkammer', (p) => {
  const B = box(p, 3, 29, 20, 12, 4, PAL.stein);
  for (let y = 20; y < 29; y += 3) for (let x = 4 + ((y / 3) % 2) * 2; x < 22; x += 4) p.px(x, y, PAL.steinD);
  sattel(p, B, 5, F.schiefer);
  // Schild in Spielerfarbe mit gekreuzten Schwertern
  p.linie(6, 26, 18, 18, PAL.eisenH).linie(6, 18, 18, 26, PAL.eisenH);
  p.rect(5, 26, 2, 1, PAL.gold).rect(17, 26, 2, 1, PAL.gold);
  p.poly([[9, 19], [15, 19], [15, 24], [12, 27], [9, 24]], 'S'); p.rect(10, 20, 2, 3, 'S+'); p.rect(12, 20, 1, 6, PAL.gold);
  // Waffenständer
  for (const x of [25, 27, 29]) { p.rect(x, 18, 1, 12, PAL.holz); p.px(x, 17, PAL.eisenH).px(x, 16, PAL.eisenH); }
  p.rect(24, 26, 7, 1, PAL.holzD);
});
g('speicherhaus', (p) => {
  const B = box(p, 4, 29, 17, 16, 5, F.fachwerk);
  for (const y of [14, 19, 24, 29]) p.rect(4, y, 17, 1, PAL.holzD);
  for (const x of [4, 10, 15, 20]) p.rect(x, 14, 1, 16, PAL.holzD);
  for (const y of [14, 19, 24]) { p.linie(4, y + 5, 10, y, PAL.holzD); p.linie(15, y, 20, y + 5, PAL.holzD); }
  const t = giebel(p, B, 9, F.terra, { wand: F.fachwerk });
  // Ladeluken und Kranbalken
  p.rect(11, 15, 4, 4, '#3a2410').rect(11, 20, 4, 4, '#3a2410');
  p.rect(12, t + 3, 1, 1, PAL.holzD); p.rect(12, 9, 1, 3, PAL.holzD);
  p.rect(10, 10, 6, 1, PAL.holz); p.rect(10, 11, 1, 4, '#8a7a60'); sack(p, 9, 18, PAL.stoff);
  sack(p, 1, 30); sack(p, 22, 30, PAL.stoffD); sack(p, 25, 30); sack(p, 23, 27);
});
g('lagerhaus', (p) => {
  const B = box(p, 2, 29, 22, 12, 5, '#9a6a3a', { ohneDeckel: true });
  for (let x = 2; x < 24; x += 2) p.rect(x, 18, 1, 12, D('#9a6a3a', 0.15));
  sattel(p, B, 6, F.schiefer);
  // Große Tore
  for (const x of [4, 14]) { p.rect(x, 21, 7, 9, '#3a2410'); p.linie(x, 21, x + 6, 29, PAL.holz); p.linie(x + 6, 21, x, 29, PAL.holz); p.rahmen(x, 21, 7, 9, PAL.holz); }
  kiste(p, 25, 30, 5); kiste(p, 26, 25, 4, PAL.holz); fass(p, 1, 30);
});
g('heilhaus', (p) => {
  const B = box(p, 3, 29, 18, 11, 5, F.weiss);
  for (const x of [3, 9, 15, 20]) p.rect(x, 19, 1, 11, PAL.holz);
  p.rect(3, 19, 18, 1, PAL.holz);
  sattel(p, B, 7, F.terra, { muster: true });
  fenster(p, 5, 22, 3, 3, PAL.glasD); fenster(p, 16, 22, 3, 3, PAL.glasD);
  tuer(p, 11, 29, 3, 5);
  // Grünes Kreuz (Heilkunde) über der Tür
  p.rect(12, 20, 1, 3, '#2e8a3a').rect(11, 21, 3, 1, '#2e8a3a');
  // Kräutergarten
  for (let x = 22; x < 30; x += 2) { p.rect(x, 27, 1, 3, F.grasD); p.px(x, 26, '#b080d0'); p.px(x + 1, 28, F.gras); }
  p.rect(21, 30, 9, 1, '#6a4a2a');
});
g('hafen', (p) => {
  wasser(p, 1, 23, 30, 7);
  // Steg
  p.rect(1, 21, 20, 3, PAL.holzH); p.rect(1, 21, 20, 1, L(PAL.holzH, 0.2));
  for (let x = 2; x < 21; x += 5) p.rect(x, 24, 1, 4, PAL.holzD);
  // Tretradkran
  p.rect(5, 6, 2, 15, PAL.holz); p.rect(5, 6, 1, 15, PAL.holzH);
  p.linie(6, 7, 18, 3, PAL.holz); p.linie(6, 8, 18, 4, PAL.holzD);
  p.rect(18, 4, 1, 9, '#8a7a60'); kiste(p, 16, 15, 4);
  p.kreis(5, 17, 3, PAL.holzD); p.kreis(5, 17, 2, 'leer'); p.kreis(5, 17, 2, '#6a4a2a'); p.px(5, 17, PAL.holzD);
  // Kogge
  schiff(p, 15, 29, 14, PAL.holz);
  p.rect(22, 15, 1, 11, PAL.holzD);
  p.rect(19, 16, 7, 7, PAL.stoff).rect(19, 16, 1, 7, F.weiss).rect(25, 16, 1, 7, PAL.stoffD);
  p.rect(23, 14, 3, 1, 'S');
  kiste(p, 10, 20, 4, PAL.holz); fass(p, 2, 20);
});
g('gestuet', (p) => {
  const B = box(p, 2, 19, 17, 7, 4, PAL.holzH, { ohneDeckel: true });
  for (let y = 14; y < 19; y += 2) p.rect(2, y, 17, 1, PAL.holz);
  sattel(p, B, 6, F.terra, { muster: true });
  p.rect(8, 14, 5, 6, '#1e140a');
  // Koppel mit Zaun und Pferd
  p.rect(1, 20, 30, 10, F.gras); p.rect(1, 20, 30, 1, L(F.gras, 0.2));
  for (let x = 1; x < 31; x += 5) p.rect(x, 19, 1, 4, PAL.holzD);
  p.rect(1, 20, 30, 1, PAL.holz);
  p.karte(9, 19, [
    '..........mk..',
    '.........mkkk.',
    '.........kekk.',
    't.......kkk.kn',
    'tkkkkkkkkkk...',
    't.kkkkkkkkk...',
    '..kkkkkkkk....',
    '..k.k...k.k...',
    '..k.k...k.k...',
    '..h.h...h.h...',
  ], { m: '#3a2414', t: '#3a2414', k: '#c07a3e', e: PAL.schwarz, n: '#8a5226', h: '#3a2414' });
  p.rect(13, 23, 5, 1, L('#c07a3e', 0.25));
  fahne(p, 26, 18, 7, 4);
});
g('muehle', (p) => {
  // Steinerner Mühlenturm mit Flügeln
  p.poly([[9, 29], [21, 29], [19, 12], [11, 12]], PAL.putz);
  p.poly([[17, 29], [21, 29], [19, 12], [17, 12]], D(PAL.putz, 0.2));
  p.poly([[9, 13], [21, 13], [15, 6]], F.terra); p.linie(9, 13, 15, 6, L(F.terra, 0.3));
  tuer(p, 13, 29, 3, 5); fenster(p, 14, 17, 2, 2, PAL.glasD);
  // Flügel
  const cx = 15, cy = 12;
  p.linie(cx, cy, cx - 11, cy - 9, PAL.holzD).linie(cx, cy, cx + 11, cy + 9, PAL.holzD).linie(cx, cy, cx + 9, cy - 11, PAL.holzD).linie(cx, cy, cx - 9, cy + 11, PAL.holzD);
  p.poly([[cx - 3, cy - 3], [cx - 10, cy - 9], [cx - 8, cy - 11], [cx - 2, cy - 5]], PAL.stoff);
  p.poly([[cx + 3, cy + 3], [cx + 10, cy + 9], [cx + 8, cy + 11], [cx + 2, cy + 5]], PAL.stoff);
  p.poly([[cx + 3, cy - 3], [cx + 9, cy - 10], [cx + 11, cy - 8], [cx + 5, cy - 2]], PAL.stoffD);
  p.poly([[cx - 3, cy + 3], [cx - 9, cy + 10], [cx - 11, cy + 8], [cx - 5, cy + 2]], PAL.stoffD);
  p.kreis(cx, cy, 1, PAL.holz);
  sack(p, 23, 30); sack(p, 26, 30, PAL.stoffD);
});
g('karawanserei', (p) => {
  const B = box(p, 2, 29, 22, 12, 4, F.sand);
  p.rect(2, 17, 22, 1, D(F.sand, 0.15)); zinnen(p, 2, 18, 22, F.sand);
  // Großes Spitzbogentor
  p.rect(9, 20, 8, 10, '#5a3a20'); p.ellipse(13, 20, 4, 4, '#5a3a20'); p.px(13, 15, '#5a3a20');
  p.rect(10, 21, 6, 9, '#3a2410');
  p.rect(9, 19, 8, 1, '#2e8a8a');
  fenster(p, 4, 21, 2, 3, '#3a2410'); fenster(p, 20, 21, 2, 3, '#3a2410');
  kuppel(p, 6, 16, 3, '#e8d8a8', 3); kuppel(p, 20, 16, 3, '#2e8a8a', 3);
  void B;
  // Kamel
  p.karte(21, 21, [
    '.......kk.',
    '..kk...kkw',
    '.kkkkk.k..',
    'kkkkkkkk..',
    '.kkkkkk...',
    '.k.k.k.k..',
    '.k.k.k.k..',
    '.k.k.k.k..',
  ], { k: '#c08a4e', w: '#8a5a2e' });
  sack(p, 23, 22, '#c0392b');
});
g('sternwarte', (p) => {
  const B = box(p, 5, 29, 18, 10, 4, PAL.steinH);
  bogenFenster(p, 8, 22, 3, 4, PAL.glasD); bogenFenster(p, 16, 22, 3, 4, PAL.glasD);
  tuer(p, 12, 29, 3, 4);
  zylinder(p, 9, 19, 11, 4, PAL.stein); void B;
  kuppel(p, 14, 14, 7, '#c8ccd2', 7);
  // Spalt und Fernrohr
  p.rect(13, 7, 3, 7, F.nacht);
  p.linie(14, 10, 20, 3, PAL.bronze).linie(15, 10, 21, 3, PAL.bronzeD); p.rect(20, 2, 2, 2, PAL.bronze);
  // Sterne
  p.px(4, 5, F.gelb).px(26, 9, F.gelb).px(7, 2, '#fff6c0').px(28, 3, '#fff6c0');
});

// ===================== Renaissance =====================
g('festungsmauer', (p) => {
  // Bastion (Keilform) mit Erdwall, Kanonen und Wachhäuschen
  p.poly([[1, 19], [15, 23], [15, 30], [1, 30]], PAL.stein);
  p.poly([[15, 23], [30, 19], [30, 30], [15, 30]], D(PAL.stein, 0.22));
  p.poly([[1, 19], [15, 23], [30, 19], [15, 13]], PAL.steinH);
  p.poly([[3, 18], [15, 21], [28, 18], [15, 14]], F.gras);
  p.poly([[6, 18], [15, 20], [25, 18], [15, 16]], F.grasD);
  p.linie(1, 19, 15, 23, L(PAL.steinH, 0.2)).linie(15, 23, 30, 19, PAL.steinH);
  for (let y = 25; y < 30; y += 2) { p.linie(1, y - 4, 15, y, D(PAL.stein, 0.1)); p.linie(15, y, 30, y - 4, D(PAL.stein, 0.32)); }
  p.rect(15, 23, 1, 7, PAL.steinH);
  // Kanonen
  for (const [x, y] of [[7, 17], [21, 17]]) { p.rect(x, y, 3, 2, PAL.holzD); p.rect(x + 1, y + 1, 1, 3, PAL.schwarz); p.px(x + 1, y, PAL.stahlH); }
  // Wachhäuschen an der Spitze
  zylinder(p, 13, 23, 5, 6, PAL.steinH); kegel(p, 15, 17, 3, 3, F.schiefer); p.rect(15, 20, 1, 2, PAL.schwarz);
  fahne(p, 15, 13, 7, 5);
  p.rect(1, 30, 30, 1, PAL.steinD);
});
g('bank', (p) => {
  const B = box(p, 3, 29, 22, 12, 4, F.marmor);
  p.rect(4, 19, 20, 10, '#7a6e5e');
  saeulen(p, 4, 29, 6, 4, 10, F.weiss);
  p.rect(3, 17, 22, 2, F.marmor).rect(3, 18, 22, 1, D(F.marmor, 0.15));
  giebel(p, B, 7, F.marmor, { wand: L(F.marmor, 0.15) });
  // Goldmünze im Giebel
  p.kreis(14, 14, 2.5, PAL.goldD); p.kreis(13.6, 13.6, 2, PAL.gold); p.px(13, 13, '#fff2b0'); p.rect(14, 13, 1, 3, PAL.goldD);
  p.rect(2, 29, 25, 1, PAL.steinH);
  // Goldmünzen am Eingang
  p.kreis(27, 28, 2, PAL.gold); p.px(26, 27, '#fff2b0'); p.kreis(29, 26, 1.4, PAL.goldD);
});
g('manufaktur', (p) => {
  const B = box(p, 2, 29, 24, 12, 4, PAL.backstein);
  fensterReihe(p, 4, 20, 6, 4, 2, 3, PAL.glasD); fensterReihe(p, 4, 25, 4, 4, 2, 3, PAL.glasD);
  tuer(p, 20, 29, 4, 5);
  sattel(p, B, 5, F.schiefer);
  schornstein(p, 20, 15, 8, PAL.backsteinD);
  rauch(p, 21, 5, 2);
  // Wasserrad
  p.kreis(26, 24, 4, PAL.holz); p.kreis(26, 24, 3, PAL.holzD); p.kreis(26, 24, 1, PAL.holz);
  p.linie(22, 24, 30, 24, PAL.holz).linie(26, 20, 26, 28, PAL.holz);
  p.rect(22, 28, 9, 2, F.wasser); p.rect(22, 28, 9, 1, F.wasserH);
});
g('opernhaus', (p) => {
  const B = box(p, 2, 29, 26, 13, 3, '#e8d8b0');
  for (let x = 4; x < 27; x += 4) bogenFenster(p, x, 20, 2, 5, '#f5c060');
  p.rect(2, 26, 26, 1, PAL.gold); p.rect(2, 18, 26, 1, PAL.gold);
  tuer(p, 13, 29, 4, 3, '#7a1a20');
  zelt(p, B, 2, F.kupfer);
  kuppel(p, 15, 14, 8, F.kupfer, 7);
  p.rect(15, 5, 1, 2, PAL.gold); p.kreis(15, 4, 1, PAL.gold);
  // Statuen
  p.rect(3, 14, 2, 3, PAL.gold); p.rect(25, 14, 2, 3, PAL.gold); p.px(3, 13, PAL.gold).px(26, 13, PAL.gold);
});
g('pulvermuehle', (p) => {
  const B = box(p, 4, 29, 14, 11, 4, PAL.steinD);
  sattel(p, B, 5, F.schiefer);
  tuer(p, 9, 29, 3, 5, PAL.eisenD);
  fenster(p, 6, 21, 2, 2, '#1a1612'); fenster(p, 14, 21, 2, 2, '#1a1612');
  // Pulverfässer mit Warnzeichen
  for (const [x, y] of [[20, 30], [24, 30], [28, 30], [22, 26], [26, 26]]) { p.rect(x - 1, y - 4, 4, 5, '#4a3020'); p.rect(x - 1, y - 3, 4, 1, PAL.eisenD); p.rect(x - 1, y - 1, 4, 1, PAL.eisenD); p.px(x - 1, y - 4, PAL.holz); }
  // Explosionsstern
  p.poly([[24, 12], [26, 16], [30, 16], [27, 19], [28, 23], [24, 20], [20, 23], [21, 19], [18, 16], [22, 16]], F.glut);
  p.kreis(24, 18, 2, F.gelb);
  p.px(15, 9, PAL.rauch);
});
g('akademie', (p) => {
  const B = box(p, 2, 29, 26, 11, 3, '#e4d4b0');
  fensterReihe(p, 4, 21, 3, 3, 2, 4, PAL.glasD); fensterReihe(p, 20, 21, 3, 3, 2, 4, PAL.glasD);
  zelt(p, B, 2, F.schiefer);
  // Portikus mit Kuppel
  p.rect(11, 18, 8, 12, '#7a6e5e');
  saeulen(p, 11, 29, 3, 3, 11, F.weiss);
  p.poly([[10, 18], [20, 18], [15, 14]], F.marmor);
  kuppel(p, 15, 13, 6, '#9ab0c0', 6);
  // Globus auf der Kuppel
  p.rect(15, 6, 1, 1, PAL.bronze);
  p.kreis(15, 3, 2, F.wasser); p.px(14, 2, F.gras).px(15, 3, F.gras).px(16, 4, F.gras).px(14, 2, F.wasserH);
});
g('handelskompanie', (p) => {
  // Kontorhaus mit Treppengiebel
  const B = box(p, 3, 29, 15, 15, 3, PAL.backstein);
  for (let s = 0; s < 4; s++) p.rect(3 + s * 2, 13 - s * 2, 15 - s * 4, 2, PAL.backstein);
  p.rect(9, 5, 3, 2, PAL.backstein);
  fensterReihe(p, 5, 17, 3, 4, 2, 3, F.weiss); fensterReihe(p, 5, 22, 3, 4, 2, 3, F.weiss);
  p.rect(9, 9, 3, 3, '#3a2410');
  tuer(p, 9, 29, 3, 4, '#2a4a2a');
  void B;
  // Ballen, Kisten, Gewürze, Schiffsmast
  kiste(p, 19, 30, 5, PAL.holzH); kiste(p, 24, 30, 5, PAL.holz); kiste(p, 21, 25, 4);
  sack(p, 26, 25, '#d4a020'); p.ellipse(28, 28, 1.5, 2, '#b03a2e');
  p.rect(25, 4, 1, 16, PAL.holzD); p.rect(22, 6, 7, 1, PAL.holzD); p.rect(23, 7, 5, 5, PAL.stoff);
  p.rect(26, 3, 3, 1, 'S');
});
g('trockendock', (p) => {
  // Steinbecken mit Schiff auf Stützen
  p.poly([[1, 18], [30, 18], [30, 30], [1, 30]], PAL.steinD);
  p.rect(1, 18, 30, 2, PAL.stein); p.rect(1, 18, 30, 1, PAL.steinH);
  p.rect(3, 28, 26, 2, '#4a5a6a');
  // Schiffsrumpf
  p.poly([[3, 15], [28, 15], [25, 24], [7, 24]], PAL.holz);
  p.rect(3, 15, 26, 1, PAL.holzH); p.rect(5, 19, 22, 1, PAL.holzD);
  p.rect(5, 22, 21, 2, PAL.bronze);
  for (const x of [9, 15, 21]) p.rect(x, 24, 1, 4, PAL.holzH);
  // Masten
  p.rect(10, 4, 1, 11, PAL.holzD); p.rect(19, 2, 1, 13, PAL.holzD);
  p.rect(8, 6, 5, 1, PAL.holzD); p.rect(17, 4, 5, 1, PAL.holzD);
  p.linie(10, 4, 19, 2, '#8a7a60');
  p.rect(1, 14, 1, 4, PAL.eisenD); p.rect(30, 14, 1, 4, PAL.eisenD);
});
g('schlossgarten', (p) => {
  // Barocker Garten mit Hecken, Brunnen, Pavillon
  p.poly([[1, 30], [30, 30], [27, 18], [4, 18]], F.gras);
  for (const [x, y] of [[4, 21], [21, 21], [3, 26], [23, 26]]) { p.rect(x, y, 6, 2, F.grasD); p.rect(x, y, 6, 1, PAL.gruen); }
  p.rect(14, 19, 3, 12, '#d8c8a0');
  p.ellipse(15.5, 24, 4, 2, PAL.steinH); p.ellipse(15.5, 24, 3, 1, F.wasser);
  p.rect(15, 18, 1, 6, F.wasserH); p.px(14, 18, F.wasserH).px(16, 18, F.wasserH).px(13, 19, F.wasserH).px(17, 19, F.wasserH);
  // Formbäume
  for (const x of [5, 26]) { p.rect(x, 12, 1, 6, PAL.holzD); p.kreis(x, 10, 3, PAL.gruen); p.kreis(x - 1, 9, 1.5, PAL.gruenH); }
  // Pavillon
  p.rect(11, 9, 1, 8, F.weiss).rect(19, 9, 1, 8, F.weiss);
  kuppel(p, 15.5, 9, 6, F.kupfer, 5);
  p.px(15, 3, PAL.gold);
});

// ===================== Industrie =====================
g('fabrik', (p) => {
  const B = box(p, 2, 29, 22, 10, 4, PAL.backstein, { ohneDeckel: true });
  // Sheddach
  for (let i = 0; i < 4; i++) { const x = 2 + i * 6; p.poly([[x, 19], [x + 6, 19], [x + 6, 14]], F.schiefer); p.rect(x + 5, 14, 1, 6, PAL.glas); p.linie(x, 19, x + 5, 15, L(F.schiefer, 0.2)); }
  p.rect(25, 15, 4, 14, D(PAL.backstein));
  fensterReihe(p, 4, 22, 5, 4, 2, 3, PAL.glasD);
  tuer(p, 9, 29, 4, 3, PAL.eisenD);
  void B;
  // Hoher Schornstein
  schornstein(p, 25, 28, 24, PAL.backsteinD, 4);
  p.rect(25, 8, 4, 1, PAL.eisen);
  rauch(p, 26, 3, 1); p.kreis(23, 3, 1.5, '#7a7a7a'); p.kreis(20, 2, 1, '#9a9a9a');
});
g('boerse', (p) => {
  const B = box(p, 2, 29, 26, 11, 3, '#d4ccbc');
  p.rect(3, 21, 24, 8, '#5a544a');
  saeulen(p, 3, 29, 7, 4, 8, F.weiss);
  p.rect(2, 20, 26, 1, D('#d4ccbc', 0.2));
  zelt(p, B, 3, F.schiefer);
  // Kurstafel mit Diagramm auf dem Dach
  p.rect(5, 6, 20, 9, F.nacht); p.rahmen(5, 6, 20, 9, PAL.gold);
  p.rect(9, 15, 1, 3, PAL.stahl).rect(20, 15, 1, 3, PAL.stahl);
  p.linie(7, 11, 10, 9, '#e74c3c').linie(10, 9, 13, 12, '#e74c3c');
  p.linie(13, 12, 16, 10, F.gruenG).linie(16, 10, 19, 11, F.gruenG).linie(19, 11, 22, 8, F.gruenG);
  p.px(21, 8, F.gruenG).px(22, 9, F.gruenG);
  p.rect(6, 13, 18, 1, '#3a4a5a');
  p.rect(1, 29, 28, 1, PAL.steinH);
});
g('depot', (p) => {
  const B = box(p, 2, 25, 24, 12, 4, '#8a4a32');
  p.rect(2, 14, 24, 1, D('#8a4a32', 0.2));
  for (const x of [4, 15]) { p.rect(x, 17, 8, 9, PAL.stahl); for (let y = 18; y < 26; y += 2) p.rect(x, y, 8, 1, PAL.stahlD); }
  sattel(p, B, 3, PAL.stahl);
  // Schienen, Waggon, Ölfässer
  p.rect(1, 28, 30, 1, PAL.eisenD); for (let x = 1; x < 31; x += 2) p.px(x, 29, PAL.holzD);
  p.rect(2, 26, 2, 2, '#c0392b').rect(5, 26, 2, 2, '#2e6ab0').rect(8, 26, 2, 2, '#c0392b');
  kiste(p, 26, 30, 4, PAL.holzH);
});
g('krankenhaus', (p) => {
  const B = box(p, 2, 29, 26, 16, 3, F.weiss);
  fensterReihe(p, 4, 17, 6, 4, 2, 2, PAL.glas); fensterReihe(p, 4, 21, 6, 4, 2, 2, PAL.glas); fensterReihe(p, 4, 25, 2, 4, 2, 2, PAL.glas); fensterReihe(p, 20, 25, 2, 4, 2, 2, PAL.glas);
  tuer(p, 13, 29, 4, 4, PAL.glasD);
  sattel(p, B, 4, PAL.ziegel);
  // Rotes Kreuz auf weißem Schild
  p.rect(10, 4, 11, 11, F.weiss); p.rahmen(10, 4, 11, 11, '#d8d4c8');
  rotesKreuz(p, 15, 9, 1);
});
g('kraftwerk', (p) => {
  const B = box(p, 2, 29, 20, 12, 4, PAL.backstein);
  fensterReihe(p, 4, 20, 4, 4, 2, 5, PAL.glasD);
  sattel(p, B, 3, PAL.stahl);
  schornstein(p, 6, 14, 10, PAL.backsteinD, 3); schornstein(p, 14, 14, 11, PAL.backsteinD, 3);
  rauch(p, 7, 3, 1); p.kreis(15, 3, 1.5, '#5a5a5a'); p.kreis(10, 2, 1, '#6a6a6a');
  // Kohlehalde und Strommast
  p.ellipse(25, 28, 4, 2, '#2a2a2a'); p.px(25, 27, '#4a4a4a').px(27, 28, '#4a4a4a');
  p.rect(27, 8, 1, 18, PAL.stahl); p.rect(25, 10, 5, 1, PAL.stahl); p.rect(25, 14, 5, 1, PAL.stahl);
  p.px(25, 9, F.gelb).px(29, 9, F.gelb);
});
g('militaerakademie', (p) => {
  const B = box(p, 2, 29, 26, 12, 3, '#9a8a6e');
  fensterReihe(p, 4, 21, 6, 4, 2, 3, PAL.glasD);
  p.rect(10, 24, 10, 6, '#5a4a38'); saeulen(p, 10, 29, 3, 4, 6, F.marmor);
  zelt(p, B, 3, F.schiefer);
  // Stern-Emblem in Spielerfarbe
  p.kreis(15, 13, 3, 'S'); p.poly([[15, 10], [16, 12], [18, 12], [16, 14], [17, 16], [15, 15], [13, 16], [14, 14], [12, 12], [14, 12]], PAL.gold);
  fahne(p, 3, 17, 9, 5); fahne(p, 25, 15, 9, 5);
  // Kanonen
  p.rect(1, 28, 6, 2, PAL.stahl).px(1, 28, PAL.stahlH); p.rect(24, 28, 6, 2, PAL.stahl).px(29, 28, PAL.stahlH);
});
g('grosshafen', (p) => {
  wasser(p, 1, 24, 30, 6);
  p.rect(1, 21, 16, 3, PAL.stein); p.rect(1, 21, 16, 1, PAL.steinH); p.rect(1, 24, 16, 2, PAL.steinD);
  // Stahlkran
  p.rect(3, 6, 2, 15, PAL.stahl); p.rect(3, 6, 1, 15, PAL.stahlH);
  for (let y = 8; y < 20; y += 3) p.linie(3, y, 4, y + 2, PAL.stahlD);
  p.rect(1, 5, 17, 2, '#d4a020'); p.rect(1, 5, 17, 1, F.gelb);
  p.rect(15, 7, 1, 8, PAL.schwarz); kiste(p, 13, 18, 4, '#2e6ab0');
  // Dampfschiff
  p.poly([[11, 26], [30, 26], [28, 30], [13, 30]], '#2a2a32');
  p.rect(11, 26, 20, 1, '#c0392b');
  box(p, 16, 25, 10, 3, 1, F.weiss);
  schornstein(p, 21, 21, 6, '#c0392b', 2); p.rect(21, 16, 2, 1, PAL.schwarz);
  p.kreis(23, 13, 1.4, PAL.rauch); p.kreis(25, 11, 1, '#b0b0b0');
});
g('museum', (p) => {
  const B = box(p, 2, 29, 26, 14, 3, '#d8cfc0');
  // Säulen links und rechts, großes Gemälde in der Mitte
  saeulen(p, 3, 29, 2, 4, 12, '#ece4d4'); saeulen(p, 21, 29, 2, 4, 12, '#ece4d4');
  p.rect(10, 17, 10, 8, PAL.gold); p.rect(11, 18, 8, 6, '#6ab0e0');
  p.poly([[11, 23], [14, 20], [17, 23]], '#5a7a5a'); p.rect(11, 22, 8, 2, F.gras); p.kreis(17, 19, 1, F.gelb);
  p.rect(10, 17, 10, 1, '#fff0a0');
  tuer(p, 13, 29, 4, 3, '#4a4238');
  p.rect(2, 15, 26, 1, D('#d8cfc0', 0.15));
  giebel(p, B, 6, '#d8cfc0', { wand: '#e4dccc' });
  // Vase im Giebel
  p.karte(13, 9, ['.v.', 'vvv', 'vbv', '.v.'], { v: '#2e6ab0', b: F.weiss });
  p.rect(1, 29, 28, 1, PAL.steinH);
});
g('bahnhof', (p) => {
  // Hallenbogen aus Glas und Stahl
  p.rect(2, 16, 26, 14, PAL.backstein);
  p.ellipse(15, 16, 12, 9, PAL.stahl);
  p.ellipse(15, 16, 11, 8, PAL.glas);
  for (let x = 6; x < 26; x += 4) p.rect(x, 8, 1, 9, PAL.stahlD);
  p.ellipse(15, 16, 6, 4, PAL.stahl); p.ellipse(15, 16, 5, 3, PAL.glasD);
  p.rect(2, 16, 26, 2, PAL.backsteinD);
  // Uhr
  p.kreis(15, 13, 2, F.weiss); p.rect(15, 12, 1, 2, PAL.schwarz).px(16, 13, PAL.schwarz);
  // Einfahrt mit Lok
  p.rect(9, 20, 13, 10, '#1a1612');
  p.rect(10, 22, 11, 6, '#2a2a32'); p.kreis(15, 25, 2.5, '#3a3a44'); p.px(15, 25, F.gelb); p.rect(10, 28, 11, 1, '#c0392b');
  fenster(p, 4, 21, 3, 4, PAL.glasD); fenster(p, 24, 21, 3, 4, PAL.glasD);
  p.rect(1, 30, 30, 1, PAL.eisenD);
});
g('flugfeld', (p) => {
  // Wiese
  p.poly([[1, 30], [30, 30], [30, 16], [1, 16]], F.gras);
  p.rect(1, 16, 30, 1, L(F.gras, 0.2));
  p.poly([[1, 30], [10, 30], [30, 22], [30, 18]], '#9a9a8a');
  // Wellblechhangar
  p.ellipse(7, 17, 6, 8, '#8a9098'); p.rect(0, 17, 15, 9, 'leer');
  for (let x = 2; x < 13; x += 2) p.rect(x, 10, 1, 7, '#7a8088');
  p.rect(1, 17, 13, 1, '#5a6068');
  p.rect(4, 12, 6, 5, '#2a2a2a');
  // Doppeldecker von oben
  p.rect(10, 17, 19, 3, '#e8d070'); p.rect(10, 17, 19, 1, L('#e8d070', 0.3)); p.rect(10, 19, 19, 1, D('#e8d070', 0.25));
  p.rect(18, 13, 3, 15, '#d03a2a'); p.rect(18, 13, 1, 15, L('#d03a2a', 0.25));
  p.rect(15, 25, 9, 2, '#d03a2a'); p.rect(19, 24, 1, 4, '#8a2018');
  p.rect(18, 15, 3, 2, PAL.schwarz);
  p.rect(16, 12, 7, 1, '#5a5a5a'); p.rect(19, 11, 1, 2, PAL.eisen);
  p.px(11, 18, 'S').px(27, 18, 'S');
  // Windsack
  p.rect(28, 5, 1, 11, PAL.eisenD); p.rect(24, 5, 4, 2, '#f08030'); p.px(25, 5, F.weiss).px(25, 6, F.weiss);
});
g('schule', (p) => {
  const B = box(p, 3, 29, 22, 12, 4, '#b5523b');
  for (let y = 20; y < 29; y += 2) for (let x = 3 + (y % 4 ? 0 : 2); x < 25; x += 4) p.px(x, y, PAL.backsteinD);
  fensterReihe(p, 5, 21, 4, 5, 3, 4, F.weiss); p.rect(5, 23, 18, 1, '#b5523b');
  fensterReihe(p, 5, 21, 4, 5, 3, 1, PAL.glas);
  tuer(p, 12, 29, 4, 3, '#2a4a7a');
  sattel(p, B, 5, F.schiefer);
  // Glockentürmchen
  box(p, 11, 14, 6, 6, 2, F.weiss);
  p.rect(12, 9, 4, 4, '#3a3028'); p.ellipse(13.5, 11, 1.2, 1.5, PAL.gold);
  zelt(p, { x: 11, top: 9, b: 6, d: 2 }, 3, F.schiefer);
  // Baum
  baum(p, 28, 30, 2);
});
g('stahlwerk', (p) => {
  // Hochofen (Zylinder) mit Rohren und glühendem Abstich
  zylinder(p, 3, 29, 10, 20, PAL.stahl);
  p.rect(2, 12, 12, 1, PAL.stahlD); p.rect(2, 19, 12, 1, PAL.stahlD);
  p.rect(5, 6, 6, 4, PAL.stahlD); p.kreis(8, 4, 1.5, F.glut);
  p.linie(11, 10, 22, 6, PAL.stahl).linie(11, 11, 22, 7, PAL.stahlD);
  // Halle
  const B = box(p, 14, 29, 13, 11, 3, '#6a4a3a');
  sattel(p, B, 3, PAL.stahl);
  schornstein(p, 21, 15, 9, PAL.stahlD, 3); rauch(p, 22, 5, 2);
  // Flüssiger Stahl
  p.rect(1, 27, 13, 2, F.glut); p.rect(3, 27, 8, 1, F.gelb);
  p.rect(16, 22, 4, 6, '#2a1a10'); p.rect(17, 24, 2, 4, F.glut);
});
g('zoo', (p) => {
  p.poly([[1, 30], [30, 30], [30, 22], [1, 22]], F.gras);
  baum(p, 4, 24, 3); baum(p, 27, 22, 3);
  // Giraffe
  p.karte(13, 4, [
    '..oo.',
    '.kkkk',
    '..kk.',
    '..kk.',
    '..kk.',
    '..kk.',
    '..kk.',
    '..kk.',
    'kkkkk',
    'kfkkfk',
    'kkkfkkk',
    'kkkkkk',
    'k..k..k',
    'k..k..k',
    'k..k..k',
    'k..k..k',
  ].map(z => z.padEnd(8, '.')), { k: '#e0b040', f: '#9a5a20', o: '#7a4a20' });
  p.px(15, 9, '#9a5a20').px(16, 7, '#9a5a20').px(16, 5, PAL.schwarz);
  // Elefant
  p.ellipse(23, 24, 4, 3, '#8a8a90'); p.kreis(19, 23, 2, '#9a9aa0'); p.rect(17, 24, 1, 4, '#9a9aa0');
  p.rect(20, 26, 2, 3, '#8a8a90').rect(25, 26, 2, 3, '#7a7a80'); p.px(19, 22, PAL.schwarz);
  // Gitterzaun
  for (let x = 1; x < 31; x += 2) p.rect(x, 26, 1, 4, PAL.stahlD);
  p.rect(1, 26, 30, 1, PAL.stahl); p.rect(1, 29, 30, 1, PAL.stahl);
});

// ===================== Moderne =====================
g('forschungslabor', (p) => {
  const B = box(p, 2, 29, 22, 10, 4, F.weiss);
  p.rect(2, 22, 22, 4, PAL.glas); for (let x = 2; x < 24; x += 3) p.rect(x, 22, 1, 4, '#c8ccd0');
  tuer(p, 11, 29, 4, 3, PAL.glasD);
  void B;
  kuppel(p, 9, 19, 6, '#d4dadf', 6); p.rect(8, 13, 2, 6, '#5a6a7a');
  // Großer Erlenmeyerkolben
  p.rect(22, 9, 3, 6, '#cfe8f0'); p.poly([[22, 15], [24, 15], [29, 25], [17, 25]], '#cfe8f0');
  p.poly([[21, 19], [26, 19], [28, 24], [18, 24]], '#5ad06a'); p.rect(19, 23, 9, 1, '#3aa04a');
  p.px(22, 21, '#c8ffc8').px(24, 17, F.weiss).px(23, 10, F.weiss).rect(21, 8, 5, 1, '#a8c8d0');
  p.kreis(25, 5, 1, '#9ae09a'); p.px(23, 3, '#c8ffc8');
});
g('flughafen', (p) => {
  // Terminal aus Glas
  const B = box(p, 1, 29, 20, 8, 3, PAL.beton);
  p.rect(2, 23, 18, 4, PAL.glas); for (let x = 2; x < 20; x += 3) p.rect(x, 23, 1, 4, PAL.glasD);
  p.rect(1, 22, 20, 1, PAL.betonD); void B;
  // Tower
  p.rect(22, 9, 3, 21, PAL.beton).rect(22, 9, 1, 21, L(PAL.beton, 0.2)).rect(24, 9, 1, 21, PAL.betonD);
  p.rect(19, 5, 9, 4, PAL.glasD).rect(20, 6, 7, 2, PAL.glas); p.rect(19, 4, 9, 1, PAL.beton); p.rect(20, 9, 7, 1, PAL.betonD);
  p.rect(23, 1, 1, 3, PAL.stahl); p.px(23, 1, '#ff3030');
  // Düsenflugzeug
  p.rect(3, 15, 14, 3, F.weiss); p.px(17, 16, F.weiss).px(2, 16, F.weiss);
  p.poly([[8, 17], [12, 17], [9, 21], [7, 21]], '#c8ccd0');
  p.poly([[3, 15], [5, 15], [4, 11], [2, 11]], '#2e6ab0');
  fensterReihe(p, 6, 16, 5, 2, 1, 1, PAL.glasD);
});
g('betonbunker', (p) => {
  p.poly([[1, 29], [30, 29], [27, 15], [4, 15]], PAL.beton);
  p.poly([[20, 15], [27, 15], [30, 29], [22, 29]], PAL.betonD);
  p.rect(4, 15, 23, 1, L(PAL.beton, 0.2));
  p.ellipse(15, 15, 9, 4, PAL.beton); p.rect(5, 15, 21, 1, PAL.beton); p.ellipse(13, 13, 5, 2, L(PAL.beton, 0.2));
  // Sehschlitze
  p.rect(5, 19, 6, 1, PAL.schwarz); p.rect(13, 19, 6, 1, PAL.schwarz);
  p.rect(10, 23, 6, 6, '#3a3e40'); p.rahmen(10, 23, 6, 6, PAL.stahlD);
  p.rect(2, 29, 28, 1, PAL.betonD);
  for (const [x, y] of [[6, 25], [20, 26], [24, 22]]) p.px(x, y, PAL.betonD);
  fahne(p, 23, 11, 8, 5);
});
g('flakstellung', (p) => {
  // Sandsackring
  p.ellipse(15, 26, 13, 4, '#c8b07a');
  for (let x = 3; x < 26; x += 3) { p.ellipse(x + 1, 24, 1.5, 1, '#d8c08a'); p.ellipse(x + 2, 27, 1.5, 1, '#b8a06a'); }
  p.ellipse(15, 25, 9, 2, '#6a6448');
  // Flak mit zwei Rohren
  p.rect(12, 20, 7, 5, PAL.tarn); p.rect(12, 20, 7, 1, L(PAL.tarn, 0.2));
  p.linie(14, 20, 23, 5, PAL.stahlD).linie(15, 20, 24, 5, PAL.stahl);
  p.linie(16, 21, 25, 6, PAL.stahlD).linie(17, 21, 26, 6, PAL.stahl);
  p.rect(10, 18, 4, 4, PAL.oliv);
  // Munitionskisten
  kiste(p, 3, 23, 3, PAL.oliv); kiste(p, 26, 23, 3, PAL.oliv);
  fahne(p, 4, 18, 9, 5);
});
g('kuehlhaus', (p) => {
  const B = box(p, 3, 29, 22, 13, 4, '#e8f0f4');
  for (let x = 3; x < 25; x += 3) p.rect(x, 17, 1, 13, '#c8d8e0');
  p.rect(3, 17, 22, 1, '#b0c4d0');
  void B;
  // Schneeflocke
  const cx = 14, cy = 22;
  p.rect(cx, cy - 4, 1, 9, F.blau); p.rect(cx - 4, cy, 9, 1, F.blau);
  p.linie(cx - 3, cy - 3, cx + 3, cy + 3, F.blau).linie(cx - 3, cy + 3, cx + 3, cy - 3, F.blau);
  p.px(cx - 1, cy - 4, F.blau).px(cx + 1, cy - 4, F.blau).px(cx - 1, cy + 4, F.blau).px(cx + 1, cy + 4, F.blau);
  // Kühlaggregat und Eiszapfen
  box(p, 7, 12, 8, 3, 2, PAL.stahl); for (let x = 8; x < 14; x += 2) p.px(x, 11, PAL.stahlD);
  for (let x = 4; x < 24; x += 4) p.rect(x, 18, 1, 2, '#a8e0ff');
  p.rect(26, 22, 4, 8, PAL.stahlH); p.rect(26, 22, 4, 1, F.weiss);
});
g('stadion', (p) => {
  p.ellipse(15.5, 19, 14, 10, PAL.beton);
  p.rect(1, 19, 30, 10, PAL.beton);
  p.ellipse(15.5, 28, 14.5, 2, PAL.betonD);
  p.rect(2, 19, 1, 9, L(PAL.beton, 0.2));
  // Ränge
  p.ellipse(15.5, 17, 12, 7, '#c0392b'); p.ellipse(15.5, 17, 11, 6, '#2e6ab0');
  for (let x = 6; x < 27; x += 2) p.px(x, 13, F.gelb);
  p.ellipse(15.5, 18, 9, 4, F.gras);
  p.rect(9, 18, 14, 1, F.weiss); p.ellipse(15.5, 18, 1.5, 1, F.gras); p.rect(15, 15, 1, 7, F.weiss);
  // Flutlichtmasten
  for (const x of [2, 28]) { p.rect(x, 4, 1, 12, PAL.stahl); p.rect(x - 1, 3, 3, 2, F.licht); }
  for (let x = 4; x < 28; x += 4) p.rect(x, 23, 2, 2, '#5a5e60');
});
g('rundfunkhaus', (p) => {
  const B = box(p, 2, 29, 16, 15, 3, PAL.beton);
  fensterReihe(p, 4, 17, 4, 3, 2, 2, PAL.glasD); fensterReihe(p, 4, 21, 4, 3, 2, 2, PAL.glasD); fensterReihe(p, 4, 25, 2, 3, 2, 2, PAL.glasD);
  tuer(p, 11, 29, 3, 4, PAL.glasD); void B;
  // Funkmast mit Wellen
  for (let y = 6; y < 30; y++) { const w = Math.round((y - 6) / 6); p.px(24 - w, y, '#c0392b'); p.px(24 + w, y, '#c0392b'); if (y % 3 === 0) p.rect(24 - w, y, 2 * w + 1, 1, y % 6 ? F.weiss : '#c0392b'); }
  p.rect(24, 3, 1, 4, PAL.stahl); p.px(24, 2, '#ff3030');
  for (const s of [-1, 1]) { const x = 24 + s * 3; p.px(x, 2, F.gelb).px(x + s, 3, F.gelb).px(x + s, 4, F.gelb).px(x, 5, F.gelb); const x2 = 24 + s * 5; p.px(x2, 1, '#fff2a0').px(x2 + s, 2, '#fff2a0').px(x2 + s, 3, '#fff2a0').px(x2 + s, 4, '#fff2a0').px(x2, 5, '#fff2a0'); }
  // Schüssel auf dem Dach
  p.ellipse(8, 10, 3, 2, F.weiss); p.rect(8, 11, 1, 3, PAL.stahl); p.px(7, 9, '#e8e8e8');
});
g('einkaufszentrum', (p) => {
  const B = box(p, 1, 29, 25, 12, 4, '#e0d8cc');
  p.rect(2, 20, 23, 9, PAL.glas); for (let x = 2; x < 25; x += 4) p.rect(x, 20, 1, 9, PAL.glasD);
  p.rect(2, 24, 23, 1, PAL.glasD);
  // Markisen
  for (let i = 0; i < 6; i++) p.rect(2 + i * 4, 19, 4, 2, ['#c0392b', '#f39c12', '#2e8a3a', '#2e6ab0', '#8e44ad', '#c0392b'][i]);
  void B;
  // Einkaufstasche als Leuchtschild
  p.rect(9, 9, 9, 7, '#e84a8a'); p.rect(9, 9, 9, 1, L('#e84a8a', 0.3)); p.rect(16, 10, 2, 6, D('#e84a8a', 0.2));
  p.rect(11, 6, 1, 3, PAL.schwarz).rect(15, 6, 1, 3, PAL.schwarz).rect(11, 6, 5, 1, PAL.schwarz);
  // Einkaufswagen
  p.rect(26, 25, 5, 3, PAL.stahlH); p.rect(26, 25, 5, 1, PAL.stahl); p.px(25, 24, PAL.stahl); p.px(27, 29, PAL.schwarz).px(30, 29, PAL.schwarz);
});
g('raffinerie', (p) => {
  // Tanks
  for (const [x, c] of [[1, '#d8d8d0'], [8, '#c8c8c0']]) { zylinder(p, x, 29, 7, 8, c); p.rect(x, 25, 7, 1, '#c0392b'); }
  // Destillationskolonnen
  zylinder(p, 16, 29, 4, 22, PAL.stahlH); zylinder(p, 21, 29, 3, 17, PAL.stahl);
  for (let y = 10; y < 29; y += 4) p.rect(15, y, 6, 1, PAL.stahlD);
  p.linie(19, 12, 22, 14, PAL.stahlD);
  // Fackel
  p.rect(27, 7, 1, 23, PAL.stahlD); p.rect(26, 7, 3, 1, PAL.stahl);
  p.ellipse(27, 4, 1.5, 2.5, F.glut); p.px(27, 5, F.gelb); p.px(27, 2, '#ffb040');
  p.rect(1, 29, 30, 1, PAL.stahlD);
  p.linie(8, 22, 16, 22, PAL.stahl);
});
g('u_bahn', (p) => {
  // Platz mit Treppenabgang und Tunnelportal
  p.poly([[1, 30], [30, 30], [30, 20], [1, 20]], '#b0b0a8');
  p.rect(1, 20, 30, 1, '#c8c8c0');
  // Treppe
  p.rect(4, 22, 12, 8, '#2a2a2e'); for (let y = 23; y < 30; y += 2) p.rect(5, y, 10, 1, PAL.betonD);
  p.rect(3, 21, 1, 9, PAL.stahlH).rect(16, 21, 1, 9, PAL.stahlH);
  // Schild (blaues Quadrat) auf Mast
  p.rect(20, 10, 1, 18, PAL.stahl);
  p.rect(17, 3, 8, 8, '#1e5ab0'); p.rect(17, 3, 8, 1, L('#1e5ab0', 0.3));
  p.rect(19, 5, 1, 4, F.weiss).rect(22, 5, 1, 4, F.weiss).rect(19, 8, 4, 1, F.weiss);
  // Zug im Tunnel
  p.rect(23, 14, 8, 13, PAL.beton); p.rect(24, 16, 6, 11, '#1a1a1e');
  p.rect(24, 19, 6, 8, '#e8c020'); p.rect(25, 21, 4, 2, PAL.glasD); p.px(25, 25, F.weiss).px(28, 25, F.weiss);
  p.rect(23, 14, 8, 1, L(PAL.beton, 0.2));
});

// ===================== Informationszeitalter =====================
g('raketenbasis', (p) => {
  // Startrampe mit Rakete und Turm
  p.rect(1, 27, 30, 3, PAL.betonD); p.rect(1, 27, 30, 1, PAL.beton);
  p.rect(20, 3, 3, 24, '#c0392b'); for (let y = 4; y < 27; y += 3) p.linie(20, y, 22, y + 2, '#7a2018');
  p.rect(16, 8, 4, 1, PAL.stahl); p.rect(16, 16, 4, 1, PAL.stahl);
  // Rakete
  p.rect(11, 8, 5, 17, F.weiss); p.rect(14, 8, 2, 17, '#d0d0d0');
  p.poly([[11, 8], [15, 8], [13, 2]], '#c0392b');
  p.poly([[9, 26], [11, 20], [11, 26]], '#c0392b'); p.poly([[16, 20], [18, 26], [16, 26]], '#c0392b');
  p.rect(11, 13, 5, 1, 'S'); fenster(p, 12, 10, 2, 2, PAL.glasD);
  p.rect(12, 25, 3, 2, PAL.stahlD);
  // Dampf
  p.kreis(6, 27, 2, '#e0e0e0'); p.kreis(25, 27, 2, '#e0e0e0'); p.kreis(3, 25, 1.5, '#d0d0d0');
});
g('kernkraftwerk', (p) => {
  // Kühlturm (hyperbolisch)
  for (let y = 7; y <= 29; y++) {
    const t = (y - 18) / 11, hw = 4.5 + 3.5 * t * t;
    const x0 = Math.round(16 - hw), x1 = Math.round(16 + hw);
    p.rect(x0, y, x1 - x0 + 1, 1, '#c8c8c0'); p.rect(x0, y, 2, 1, '#e4e4dc'); p.rect(x1 - 2, y, 3, 1, '#9a9a92');
  }
  p.ellipse(16, 7, 7, 1, '#8a8a82');
  p.rect(9, 22, 14, 1, '#c0392b');
  // Dampfwolke
  p.kreis(14, 5, 2.5, '#f0f0f0'); p.kreis(18, 4, 2.4, F.weiss); p.kreis(21, 3, 1.5, '#e4e4e4');
  // Reaktorkuppel
  p.rect(1, 22, 9, 8, PAL.beton);
  kuppel(p, 5, 22, 4, '#d8dce0', 5);
  p.rect(23, 23, 8, 7, PAL.beton); p.rect(23, 23, 8, 1, L(PAL.beton, 0.2)); fensterReihe(p, 24, 25, 3, 2, 1, 2, PAL.glasD);
  // Strahlenzeichen
  p.kreis(5, 26, 2, F.gelb); p.px(5, 26, PAL.schwarz).px(4, 25, PAL.schwarz).px(6, 25, PAL.schwarz).px(5, 27, PAL.schwarz);
});
g('containerhafen', (p) => {
  wasser(p, 1, 26, 30, 4);
  p.rect(1, 22, 30, 4, PAL.betonD); p.rect(1, 22, 30, 1, PAL.beton);
  // Containerbrücke
  p.rect(16, 5, 2, 17, '#e0a020').rect(26, 5, 2, 17, '#c08010');
  p.rect(10, 4, 21, 2, '#e0a020'); p.rect(10, 4, 21, 1, F.gelb);
  p.linie(17, 6, 26, 12, '#c08010');
  p.rect(13, 6, 1, 6, PAL.schwarz); p.rect(11, 12, 5, 3, '#2e8a3a');
  // Containerstapel
  const farben = ['#c0392b', '#2e6ab0', '#2e8a3a', '#e67e22', '#8e44ad', '#2e6ab0'];
  for (let r = 0; r < 3; r++) for (let i = 0; i < 3 - (r === 2); i++) { const x = 1 + i * 5, y = 19 - r * 3, c = farben[(r * 3 + i) % 6]; p.rect(x, y, 5, 3, c); p.rect(x, y, 5, 1, L(c, 0.25)); for (let k = 1; k < 5; k += 2) p.px(x + k, y + 1, D(c, 0.25)); }
  p.rect(19, 19, 5, 3, '#e67e22'); p.rect(19, 19, 5, 1, L('#e67e22', 0.25));
});
g('robotfabrik', (p) => {
  const B = box(p, 1, 29, 20, 10, 4, '#d8dce0');
  p.rect(2, 21, 18, 3, PAL.glas); p.rect(1, 25, 20, 1, '#2e8ad0');
  tuer(p, 4, 29, 6, 3, PAL.stahlD);
  void B;
  // Roboterarm
  p.rect(22, 27, 7, 3, PAL.stahlD); p.rect(23, 25, 5, 2, '#e08a20');
  p.linie(25, 25, 22, 15, '#e08a20').linie(26, 25, 23, 15, '#e08a20'); p.linie(27, 25, 24, 15, '#c07010');
  p.kreis(23, 15, 1.5, PAL.stahl);
  p.linie(23, 14, 28, 8, '#e08a20').linie(24, 15, 29, 9, '#c07010');
  p.kreis(29, 8, 1, PAL.stahl); p.rect(28, 10, 1, 2, PAL.stahlD).rect(30, 10, 1, 2, PAL.stahlD);
  // Zahnrad-Emblem
  zahnrad(p, 11, 13, 3, PAL.stahl); p.px(11, 13, '#5ad0f0');
});
g('klinikum', (p) => {
  // Hochhausklinik aus Glas mit Hubschrauberlandeplatz
  const B = box(p, 4, 29, 17, 22, 4, F.weiss);
  for (let y = 10; y < 28; y += 3) p.rect(5, y, 15, 2, PAL.glas);
  for (let x = 8; x < 20; x += 4) p.rect(x, 10, 1, 18, '#d8dce0');
  void B;
  // Helipad
  p.ellipse(14, 5, 6, 1.5, '#5a5e60'); p.ellipse(14, 5, 4, 1, F.gelb); p.ellipse(14, 5, 3, 0.5, '#5a5e60');
  // Rotes Kreuz Schild
  p.rect(22, 13, 9, 9, F.weiss); rotesKreuz(p, 26, 17, 1);
  // Anbau
  box(p, 1, 29, 5, 6, 1, '#e8ecee'); tuer(p, 9, 29, 4, 3, PAL.glasD);
});
g('rechenzentrum', (p) => {
  const B = box(p, 2, 29, 22, 14, 4, '#3a4250');
  // Serverschränke mit LEDs
  for (let i = 0; i < 4; i++) { const x = 4 + i * 5; p.rect(x, 18, 4, 10, '#1a1e26'); for (let y = 19; y < 28; y += 2) { p.px(x + 1, y, ['#30e060', '#30a0ff', '#ffb020'][(i + y) % 3]); p.rect(x + 2, y, 1, 1, '#2a3040'); } }
  void B;
  // Satellitenschüsseln und Kühler
  p.ellipse(9, 10, 3.5, 2.5, '#e0e4e8'); p.rect(9, 11, 1, 3, PAL.stahl); p.px(11, 9, PAL.stahlD);
  for (let x = 15; x < 24; x += 4) { p.rect(x, 12, 3, 2, PAL.stahlH); p.px(x + 1, 12, PAL.stahlD); }
  // Glasfaser-Leuchten
  p.rect(2, 16, 22, 1, '#30a0ff');
});
g('solarkraftwerk', (p) => {
  // Solarturm
  p.rect(22, 6, 3, 20, PAL.beton); p.rect(22, 6, 1, 20, L(PAL.beton, 0.2));
  p.rect(21, 3, 5, 4, F.gelb); p.rect(22, 4, 3, 2, '#fff6c0');
  p.linie(19, 3, 17, 1, '#fff2a0').linie(27, 3, 29, 1, '#fff2a0');
  // Paneele
  const panel = (x, y) => { p.poly([[x, y + 4], [x + 8, y + 4], [x + 10, y], [x + 2, y]], '#1e3a6a'); p.linie(x + 2, y, x + 10, y, '#5a8ad8'); p.linie(x + 1, y + 2, x + 9, y + 2, '#2e5aa0'); p.rect(x + 4, y + 5, 1, 2, PAL.stahl); };
  panel(1, 12); panel(11, 12); panel(1, 19); panel(11, 19); panel(4, 24); panel(16, 24);
  p.rect(1, 30, 30, 1, F.grasD);
});
g('raumfahrtzentrum', (p) => {
  const B = box(p, 1, 29, 18, 8, 3, F.weiss);
  p.rect(2, 23, 16, 3, PAL.glasD); fensterReihe(p, 3, 24, 5, 3, 1, 1, '#5ad0f0');
  void B;
  // Große Parabolantenne
  p.poly([[3, 6], [17, 14], [13, 18], [2, 13]], '#e0e4e8');
  p.linie(3, 6, 17, 14, '#c8ccd0'); p.linie(2, 13, 13, 18, '#a8acb0');
  p.linie(7, 13, 13, 7, PAL.stahl); p.kreis(13, 7, 1, '#c0392b');
  p.rect(9, 17, 2, 4, PAL.stahl);
  // Kleine Rakete
  p.rect(24, 9, 4, 18, F.weiss); p.rect(26, 9, 2, 18, '#d0d0d0'); p.poly([[24, 9], [27, 9], [25.5, 4]], '#2e6ab0');
  p.poly([[22, 27], [24, 22], [24, 27]], '#2e6ab0'); p.poly([[28, 22], [30, 27], [28, 27]], '#2e6ab0');
  p.rect(24, 15, 4, 1, '#2e6ab0');
});
g('medienzentrum', (p) => {
  const B = box(p, 3, 29, 18, 24, 4, '#7a9ab0');
  for (let y = 7; y < 29; y += 2) p.rect(4, y, 16, 1, PAL.glas);
  void B;
  // Riesenbildschirm
  p.rect(6, 10, 13, 8, '#1a1e26');
  p.rect(7, 11, 11, 6, '#5aa8f0'); p.rect(7, 15, 11, 2, F.gras); p.kreis(10, 12, 1, F.gelb); p.poly([[12, 16], [15, 12], [17, 16]], '#e84a8a');
  // Antennen
  p.rect(9, 1, 1, 5, PAL.stahl); p.px(9, 1, '#ff3030'); p.rect(15, 2, 1, 4, PAL.stahl);
  // Schüssel
  p.ellipse(26, 25, 3, 3, F.weiss); p.ellipse(26.5, 25, 2, 2, '#d8dce0'); p.rect(26, 27, 1, 3, PAL.stahl); p.px(28, 23, PAL.stahlD);
});
