// Städte (7 Zeitalter x 3 Größen), Stadtmauern (4 Stufen), Stadtstaat und Hauptstadt-Markierung.
// Stadt 64x56: Unterkante ca. 10 px unter der Feldmitte; Feldmitte also bei (32, 45). Gebäude stehen auf einer
// elliptischen Fläche um (32, 45). Häuser in Schrägansicht: Vorderseite + rechte Seite (nach hinten oben versetzt).
import { definiere } from '../sprites.js';
import { PAL, hell, dunkel, mische, Pinsel, UMRISS } from '../pixel.js';

// ---------- Hilfen ----------
function teil(p, fn, rand = UMRISS) {
  const t = new Pinsel(p.w, p.h); fn(t); if (rand) t.umriss(rand);
  for (let i = 0; i < t.feld.length; i++) if (t.feld[i]) p.feld[i] = t.feld[i];
}
const s2 = (i) => Math.floor((i + 1) / 2);
/** Farbreihe [hell, grund, dunkel, sehr dunkel]; 'S' ergibt die Spielerfarbe. */
const toene = (c) => (c === 'S' ? ['S+', 'S', 'S-', 'S--'] : [hell(c, 0.22), c, dunkel(c, 0.22), dunkel(c, 0.45)]);

/** Quader: Vorderseite x..x+w-1, Zeilen y-h+1..y; rechte Seite d Spalten breit, nach oben versetzt. */
function quader(p, x, y, w, h, d, front, seite) {
  p.rect(x, y - h + 1, w, h, front);
  for (let i = 0; i < d; i++) p.rect(x + w + i, y - h + 1 - s2(i), 1, h, seite);
}
function flachdach(p, x, y, w, h, d, c, rand) {
  const t = y - h;
  for (let k = 0; k <= Math.ceil(d / 2); k++) p.rect(x + k * 2 - 1 + 1, t - k, w, 1, c);
  for (let k = 0; k <= Math.ceil(d / 2); k++) p.px(x + w - 1 + k * 2, t - k, c).px(x + w + k * 2, t - k, c);
  if (rand) { p.rect(x, t, w, 1, rand); for (let i = 0; i < d; i++) p.px(x + w + i, t - s2(i), dunkel(rand, 0.2)); }
}
/** Satteldach, First parallel zur Vorderseite. F = toene(). */
function satteldach(p, x, y, w, h, d, rh, F, seite) {
  const yE = y - h, sx = Math.max(1, Math.round(d / 2));
  // Giebeldreieck rechts
  p.poly([[x + w, yE + 1], [x + w + d - 1, yE + 1 - s2(d - 1)], [x + w + sx, yE - rh + 1]], seite);
  p.linie(x + w + sx, yE - rh + 1, x + w + d, yE + 1 - s2(d - 1), F[2]);
  for (let k = 0; k < rh; k++) {
    const o = Math.round(k * sx / rh), xs = x - 1 + o, xe = x + w + o;
    let c = k === 0 ? F[3] : (k === rh - 1 ? F[0] : F[1]);
    p.rect(xs, yE - k, xe - xs + 1, 1, c);
    if (k > 0 && k < rh - 1) for (let i = xs + ((k * 2) % 3); i <= xe; i += 3) p.px(i, yE - k, F[2]);
  }
}
/** Giebel zur Vorderseite (Tempel, Kirche, Fachwerk). */
function giebeldach(p, x, y, w, h, d, F, wand, seite, gh) {
  const yE = y - h, ax = x + (w - 1) / 2;
  gh = gh ?? Math.ceil(w / 2);
  p.poly([[x, yE], [x + w - 1, yE], [ax, yE - gh + 1]], wand);
  // rechte Dachfläche nach hinten
  p.poly([[ax, yE - gh], [x + w, yE + 1], [x + w + d - 1, yE + 1 - s2(d - 1)], [ax + d - 1, yE - gh - s2(d - 1)]], F[1]);
  for (let i = 1; i < d; i += 2) p.linie(ax + i, yE - gh - s2(i - 1), x + w + i, yE + 1 - s2(i), F[2]);
  p.linie(x - 1, yE + 1, ax, yE - gh, F[0]).linie(ax, yE - gh, x + w, yE + 1, F[2]);
  p.linie(x, yE + 1, ax, yE - gh + 1, F[0]);
  p.linie(ax, yE - gh, ax + d - 1, yE - gh - s2(d - 1), F[0]);
}
function zeltdach(p, x, y, w, h, d, rh, F) {
  const yE = y - h, ax = Math.round(x + (w + d) / 2) - 1, ay = yE - rh;
  p.poly([[x - 1, yE + 1], [x + w, yE + 1], [ax, ay]], F[1]);
  p.poly([[x + w, yE + 1], [x + w + d - 1, yE + 1 - s2(d - 1)], [ax, ay]], F[2]);
  p.linie(x - 1, yE + 1, ax, ay, F[0]).px(ax, ay, F[0]);
  p.rect(x - 1, yE + 1, w + 1, 1, F[3]);
}
function kuppel(p, cx, by, rx, ry, F) {
  for (let y = Math.floor(by - ry); y <= by; y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const dx = (x - cx) / (rx + 0.5), dy = (y - by) / (ry + 0.5);
    if (dx * dx + dy * dy > 1) continue;
    const v = -dx * 0.9 - dy * 0.5;
    p.px(x, y, v > 0.6 ? F[0] : v > -0.1 ? F[1] : v > -0.6 ? F[2] : F[3]);
  }
}
/** Fensterraster auf Vorder- und Seitenfläche. */
function fenster(p, x, y, w, h, d, c, cs, opt = {}) {
  const dx = opt.dx ?? 2, dy = opt.dy ?? 3, fh = opt.fh ?? 1, oben = opt.oben ?? 2, unten = opt.unten ?? 2;
  for (let yy = y - h + 1 + oben; yy + fh - 1 <= y - unten; yy += dy)
    for (let xx = x + 1; xx < x + w - 1; xx += dx) { p.rect(xx, yy, 1, fh, c); if (opt.licht && ((xx * 7 + yy * 3) % 5 === 0)) p.px(xx, yy, opt.licht); }
  if (cs) for (let yy = y - h + 1 + oben; yy + fh - 1 <= y - unten; yy += dy) for (let i = 1; i < d - 1; i += 2) p.rect(x + w + i, yy - s2(i), 1, fh, cs);
}
function tuer(p, x, y, c = '#3a2414', h = 2) { p.rect(x, y - h + 1, 1, h, c); p.rect(x + 1, y - h + 1, 1, h, dunkel(c, 0.3)); }
function fahne(p, x, y, h, lang = 4) {
  p.rect(x, y - h, 1, h + 1, '#4a3a2a'); p.px(x, y - h - 1, PAL.gold);
  for (let i = 0; i < lang; i++) { p.px(x + 1 + i, y - h + (i % 3 === 2 ? 1 : 0), 'S'); p.px(x + 1 + i, y - h + 1 + (i % 3 === 2 ? 1 : 0), i < lang - 1 ? 'S-' : 'S'); }
  p.px(x + 1, y - h, 'S+');
}
function rauch(p, x, y, n, seed = 0) {
  teil(p, (q) => {
    for (let i = 0; i < n; i++) {
      const xx = x + i * 1.5 + ((i + seed) % 2), yy = y - i * 2.6, r = 1.3 + i * 0.45;
      q.ellipse(xx, yy, r, r * 0.8, '#7c7874'); q.ellipse(xx - 0.4, yy - 0.4, r - 0.5, r * 0.8 - 0.5, '#a49e98'); q.px(xx - r * 0.4, yy - r * 0.4, '#c8c2bc');
    }
  }, '#5a5450');
}

// ---------- Gebäude je Zeitalter ----------
const ZA = [
  { boden: ['#8a7050', '#9a8260', '#7a6244'], wand: '#b88a58', seite: '#8a643c', dach: '#d2ae5a' },          // Antike
  { boden: ['#b8aa88', '#c8bc9c', '#a49676'], wand: '#ece4d2', seite: '#c4b8a0', dach: '#b5523b' },          // Klassik
  { boden: ['#8a8474', '#9a9484', '#767060'], wand: '#e6d8b8', seite: '#bcae90', dach: '#7a4a3a' },          // Mittelalter
  { boden: ['#b0a080', '#c0b292', '#9a8a6c'], wand: '#e4c88e', seite: '#bea06a', dach: '#c0603a' },          // Renaissance
  { boden: ['#76706a', '#86807a', '#625c56'], wand: '#9c4a32', seite: '#6e3122', dach: '#565a66' },          // Industrie
  { boden: ['#868a8c', '#969a9c', '#727678'], wand: '#b4b8ba', seite: '#868a8c', dach: '#6a6e70' },          // Moderne
  { boden: ['#727a84', '#828a94', '#5e666e'], wand: '#a8b4c0', seite: '#76828e', dach: '#5a6470' },          // Atomzeit
];

function huette(p, cx, y, r, h, sdach) {
  const L = '#b88a58', Ld = '#8a643c';
  for (let x = cx - r; x <= cx + r; x++) p.rect(x, y - h + 1, 1, h, x < cx - r / 3 ? hell(L, 0.12) : x > cx + r / 3 ? Ld : L);
  tuer(p, cx - 1, y, '#3a2414', 3);
  const F = sdach ? toene('S') : ['#ecd27a', '#d2ae5a', '#a8843a', '#7a5e28'];
  const rh = r + 3, ty = y - h;
  for (let k = 0; k <= rh; k++) {
    const hw = Math.round((r + 2) * (1 - k / (rh + 1)));
    for (let i = -hw; i <= hw; i++) p.px(cx + i, ty - k + 1, i < -hw / 3 ? F[0] : i > hw / 3 ? F[2] : F[1]);
  }
  for (let i = -r - 2; i <= r + 2; i += 2) p.px(cx + i, ty + 2, F[3]);
  for (let k = 2; k < rh; k += 2) p.px(cx + ((k * 3) % 5) - 2, ty - k + 1, F[3]);
  p.linie(cx, ty - rh, cx - 1, ty - rh - 2, '#5a3a1a').linie(cx, ty - rh, cx + 1, ty - rh - 2, '#5a3a1a');
}

function haus(p, s, z, i, gr, sp) {
  const st = ZA[z], { x, y, w } = s;
  const d = s.d ?? 4;
  const hoch = s.h ?? 0;
  if (z === 0) {
    if (s.rund) { huette(p, x + Math.floor(w / 2), y, Math.floor(w / 2) - 1, 4 + hoch, sp); return; }
    const h = 4 + hoch; quader(p, x, y, w, h, d, st.wand, st.seite);
    for (let k = x + 1; k < x + w; k += 3) p.rect(k, y - h + 1, 1, h, dunkel(st.wand, 0.12));
    tuer(p, x + Math.floor(w / 2), y, '#3a2414', 3);
    satteldach(p, x, y, w, h, d, 4, sp ? toene('S') : ['#ecd27a', '#d2ae5a', '#a8843a', '#7a5e28'], st.seite);
    return;
  }
  if (z === 1) {
    const h = 5 + hoch + (gr > 2 ? 2 : 0);
    quader(p, x, y, w, h, d, st.wand, st.seite);
    fenster(p, x, y, w, h, d, '#5a4a3a', '#4a3a2a', { dx: 3, oben: 1 });
    tuer(p, x + 1, y, '#6a4a2a');
    satteldach(p, x, y, w, h, d, 3, toene(sp ? 'S' : st.dach), st.seite);
    if (i % 3 === 1) { p.rect(x + w - 3, y - 2, 2, 1, '#5a8a3a'); p.px(x + w - 3, y - 3, '#7aaa4a'); }
    return;
  }
  if (z === 2) {
    const h = 6 + hoch + (gr > 2 ? 2 : 0);
    quader(p, x, y, w, h, d, st.wand, st.seite);
    const b = '#4a3020';
    p.rect(x, y - h + 1, 1, h, b).rect(x + w - 1, y - h + 1, 1, h, b).rect(x, y - Math.floor(h / 2), w, 1, b).rect(x, y - h + 1, w, 1, b);
    for (let k = x + 2; k < x + w - 1; k += 3) p.rect(k, y - h + 1, 1, h, b);
    p.linie(x + 1, y - 1, x + 2, y - Math.floor(h / 2) + 1, b);
    for (let k = 0; k < d; k += 2) p.rect(x + w + k, y - h + 1 - s2(k), 1, h, dunkel(b, 0.2));
    p.px(x + 4, y - h + 2, '#e8d070').px(x + 4, y - h + 3, '#c8a040');
    tuer(p, x + 1, y, '#3a2414');
    if (i % 2 === 0) giebeldach(p, x, y, w, h, d, toene(sp ? 'S' : st.dach), st.wand, st.seite, Math.ceil(w / 2) + 1);
    else satteldach(p, x, y, w, h, d, 5, toene(sp ? 'S' : st.dach), st.seite);
    return;
  }
  if (z === 3) {
    const wand = ['#e4c88e', '#e0b4a0', '#d4d8b4', '#ead8b0'][i % 4];
    const h = 7 + hoch + (gr > 2 ? 3 : 0);
    quader(p, x, y, w, h, d, wand, dunkel(wand, 0.22));
    for (let yy = y - h + 2; yy <= y - 2; yy += 3) for (let xx = x + 1; xx < x + w - 1; xx += 2) { p.rect(xx, yy, 1, 2, '#4a3a3a'); p.px(xx, yy - 1, hell(wand, 0.3)); }
    p.rect(x, y - h + 1, w, 1, hell(wand, 0.3));
    tuer(p, x + Math.floor(w / 2), y, '#5a3a2a');
    if (sp) { p.rect(x, y - 2, w, 1, 'S'); for (let k = x; k < x + w; k += 2) p.px(k, y - 1, 'S+'); }
    satteldach(p, x, y, w, h, d, 3, toene(i % 3 === 0 ? '#a85a3a' : st.dach), dunkel(wand, 0.22));
    return;
  }
  if (z === 4) {
    const h = 7 + hoch + (gr > 2 ? 4 : 0);
    quader(p, x, y, w, h, d, st.wand, st.seite);
    for (let yy = y - h + 2; yy <= y; yy += 2) for (let xx = x + (yy & 1); xx < x + w; xx += 3) p.px(xx, yy, '#86402a');
    fenster(p, x, y, w, h, d, '#2a2a34', '#1e1e26', { dx: 2, dy: 3, fh: 2, licht: '#e8c860' });
    if (sp) { p.rect(x, y - 3, w, 1, 'S'); p.rect(x, y - 2, w, 1, 'S-'); }
    satteldach(p, x, y, w, h, d, 3, toene(st.dach), st.seite);
    p.rect(x + 1, y - h - 4, 2, 3, '#6e3122'); p.px(x + 1, y - h - 5, '#3a3a3a');
    return;
  }
  if (z === 5) {
    const h = 9 + hoch + (gr > 2 ? 5 : 0);
    quader(p, x, y, w, h, d, st.wand, st.seite);
    if (i % 2) fenster(p, x, y, w, h, d, PAL.glasD, '#4a7090', { dx: 2, dy: 2, oben: 1, unten: 1 });
    else for (let yy = y - h + 2; yy < y - 1; yy += 2) { p.rect(x + 1, yy, w - 2, 1, PAL.glas); for (let k = 0; k < d - 1; k++) p.px(x + w + k, yy - s2(k), PAL.glasD); }
    if (sp) { p.rect(x, y - 2, w, 1, 'S'); for (let k = x; k < x + w; k += 2) p.px(k, y - 1, 'S-'); }
    flachdach(p, x, y, w, h, d, st.dach, '#c8cccc');
    return;
  }
  // Atomzeit
  const h = 12 + hoch + (gr > 2 ? 3 : 0);
  quader(p, x, y, w, h, d, i % 2 ? '#8fb8d8' : st.wand, i % 2 ? '#5a84a8' : st.seite);
  if (i % 2) { for (let yy = y - h + 2; yy < y; yy += 2) p.rect(x, yy, w, 1, '#6a98c0'); p.linie(x + 1, y - h + 3, x + 3, y - h + 1, '#d8f0ff'); p.linie(x + 1, y - h + 7, x + 4, y - h + 4, '#c0e4f8'); }
  else fenster(p, x, y, w, h, d, '#4a6a88', '#3a5470', { dx: 2, dy: 2, oben: 1, unten: 1, licht: '#f0e080' });
  if (sp) { p.rect(x, y - h + 1, w, 2, 'S'); for (let k = 0; k < d; k++) p.rect(x + w + k, y - h + 1 - s2(k), 1, 2, 'S-'); }
  flachdach(p, x, y, w, h, d, st.dach, '#b0bcc8');
}

// ---------- Wahrzeichen ----------
function wahrzeichen(p, s, z, gr) {
  const { x, y, w } = s, d = 5;
  if (z === 0) { // Häuptlingshalle mit Banner und Totempfahl
    const h = 5 + gr;
    quader(p, x, y, w, h, d, '#a87a4c', '#7a5634');
    for (let k = x + 1; k < x + w; k += 2) p.rect(k, y - h + 1, 1, h, '#946a40');
    p.rect(x + Math.floor(w / 2) - 1, y - 3, 3, 4, '#2a1a10');
    satteldach(p, x, y, w, h, d, 6, ['#ecd27a', '#d2ae5a', '#a8843a', '#7a5e28'], '#7a5634');
    p.linie(x - 1, y - h - 1, x - 2, y - h - 3, '#5a3a1a').linie(x + w + 2, y - h - 6, x + w + 3, y - h - 8, '#5a3a1a');
    // Banner
    p.rect(x + w + d, y - h - 9, 1, h + 9, '#5a3a1a');
    p.rect(x + w + d + 1, y - h - 9, 3, 5, 'S'); p.rect(x + w + d + 1, y - h - 9, 1, 5, 'S+'); p.px(x + w + d + 2, y - h - 4, 'S-').px(x + w + d + 1, y - h - 5, 'S-');
    // Totem
    p.rect(x - 3, y - 11, 2, 12, '#8a5a2b'); p.px(x - 3, y - 10, '#2a1a10').px(x - 2, y - 10, PAL.gold).rect(x - 4, y - 8, 4, 1, '#c0392b').px(x - 3, y - 6, '#2a1a10').px(x - 2, y - 5, '#f4f1ea');
    return;
  }
  if (z === 1) { // Säulentempel
    const h = 7 + gr;
    p.rect(x - 2, y - 1, w + 4, 2, '#d8d0bc'); p.rect(x - 1, y - 2, w + 2, 1, '#ece4d2');
    for (let i = 0; i < d + 2; i++) p.rect(x + w + 2 + i - 0, y - s2(i) - 1, 1, 2, '#b4a890');
    quader(p, x, y - 2, w, h, d, '#7a6e5c', '#c4b8a0');
    for (let k = x; k < x + w; k += 2) { p.rect(k, y - 1 - h, 1, h, '#f8f4ea'); p.px(k, y - 2, '#d8d0bc'); }
    p.rect(x - 1, y - 2 - h, w + 2, 2, '#ece4d2'); p.rect(x - 1, y - 1 - h, w + 2, 1, '#c8bca4');
    giebeldach(p, x - 1, y - 3, w + 2, h, d, toene(ZA[1].dach), '#f4ecdc', '#c4b8a0', Math.ceil(w / 3) + 1);
    p.px(x + Math.floor(w / 2), y - 3 - h - 2, 'S').px(x + Math.floor(w / 2), y - 3 - h - 1, 'S-');
    fahne(p, x + w + d + 1, y - 3, h + 8, 4);
    return;
  }
  if (z === 2) { // Kirche mit Turm + Burgturm
    const h = 8 + gr;
    quader(p, x, y, w, h, d, '#c8c0b0', '#9a9284');
    for (let yy = y - h + 2; yy <= y; yy += 2) for (let xx = x + (yy & 2 ? 0 : 1); xx < x + w; xx += 3) p.px(xx, yy, '#b4ac9c');
    p.rect(x + 2, y - h + 3, 1, 3, '#3a3a5a').rect(x + w - 3, y - h + 3, 1, 3, '#3a3a5a');
    satteldach(p, x, y, w, h, d, 6, toene('#4e5260'), '#9a9284');
    // Kirchturm vorne links
    const tx = x - 1, th = h + 6 + gr * 2;
    quader(p, tx, y, 5, th, 3, '#d4ccbc', '#a49c8c');
    p.rect(tx + 2, y - th + 3, 1, 2, '#2a2a3a').rect(tx + 2, y - 3, 1, 3, '#3a2414');
    zeltdach(p, tx, y, 5, th, 3, 8, toene('S'));
    p.px(tx + 3, y - th - 10, PAL.gold).px(tx + 3, y - th - 11, PAL.gold).px(tx + 2, y - th - 10, PAL.gold).px(tx + 4, y - th - 10, PAL.gold);
    // Burgturm hinten rechts
    const bx = x + w + 3, bh = h + 6 + gr * 2, by = y - 3;
    quader(p, bx, by, 6, bh, 3, '#aaa498', '#7e786e');
    for (let yy = by - bh + 3; yy <= by; yy += 3) for (let xx = bx + (yy % 2); xx < bx + 6; xx += 3) p.px(xx, yy, '#928c80');
    for (let k = 0; k < 6; k += 2) p.px(bx + k, by - bh, '#aaa498');
    p.px(bx + 6, by - bh - 1, '#7e786e').px(bx + 8, by - bh - 2, '#7e786e');
    p.rect(bx + 2, by - bh + 3, 1, 2, '#2a2a3a');
    fahne(p, bx + 3, by - bh, 6, 4);
    return;
  }
  if (z === 3) { // Kuppelbau
    const h = 8 + gr;
    quader(p, x, y, w, h, d, '#ecdcb8', '#c4b088');
    for (let k = x + 1; k < x + w; k += 3) { p.rect(k, y - h + 3, 1, h - 3, '#f8f0dc'); }
    for (let k = x + 2; k < x + w; k += 3) { p.rect(k, y - h + 4, 1, 3, '#5a4a3a'); p.px(k, y - h + 3, '#f8f0dc'); }
    p.rect(x + Math.floor(w / 2) - 1, y - 3, 3, 4, '#5a3a2a');
    flachdach(p, x, y, w, h, d, '#c8b088', '#f4e8cc');
    // Tambour + Kuppel
    const cx = x + (w + d) / 2 - 0.5, ty = y - h - 2;
    p.rect(Math.round(cx - 4), ty - 4, 9, 5, '#ecdcb8'); p.rect(Math.round(cx + 2), ty - 4, 3, 5, '#c4b088');
    for (let k = -3; k <= 3; k += 2) p.rect(Math.round(cx + k), ty - 3, 1, 2, '#5a4a3a');
    kuppel(p, cx + 0.5, ty - 5, 5, 6, toene('#5aa088'));
    p.linie(Math.round(cx - 2), ty - 9, Math.round(cx - 2), ty - 6, '#8ad0b8');
    p.rect(Math.round(cx), ty - 13, 2, 2, '#ecdcb8'); p.px(Math.round(cx), ty - 14, PAL.gold);
    fahne(p, Math.round(cx) + 1, ty - 13, 5, 4);
    return;
  }
  if (z === 4) { // Fabrik mit Sheddach und Schornsteinen
    const h = 7 + gr, ww = w + 2;
    quader(p, x, y, ww, h, d, '#9c4a32', '#6e3122');
    for (let yy = y - h + 2; yy <= y; yy += 2) for (let xx = x + (yy & 1); xx < x + ww; xx += 3) p.px(xx, yy, '#86402a');
    fenster(p, x, y, ww, h, d, '#2a2a34', '#1e1e26', { dx: 2, dy: 3, fh: 2, licht: '#e8c860' });
    p.rect(x + 2, y - 3, 3, 4, '#3a3a40');
    for (let k = 0; k < ww; k += 4) { p.poly([[x + k, y - h], [x + k + 3, y - h - 3], [x + k + 3, y - h]], '#5a5e6a'); p.linie(x + k + 3, y - h - 3, x + k + 3, y - h, '#a8c8e0'); }
    p.rect(x, y - h, ww, 1, '#3e424c');
    const sch = gr > 1 ? [x + 3, x + ww - 1] : [x + ww - 2];
    sch.forEach((sx, j) => { const sh = 12 + gr * 2 + j * 2; p.rect(sx, y - h - sh, 2, sh, '#7a3626'); p.rect(sx, y - h - sh, 1, sh, '#9c4a32'); p.rect(sx - 1, y - h - sh, 4, 1, '#5a2a1e'); for (let yy = y - h - sh + 3; yy < y - h; yy += 4) p.rect(sx, yy, 2, 1, '#5a2a1e'); });
    p.rect(x, y - 5, ww, 1, 'S'); p.rect(x, y - 4, ww, 1, 'S-');
    return;
  }
  if (z === 5) { // Bürohochhaus
    const h = 16 + gr * 3, ww = w - 1;
    quader(p, x, y, ww, h, d, '#c4c8ca', '#8e9294');
    for (let yy = y - h + 2; yy < y - 1; yy += 2) { p.rect(x + 1, yy, ww - 2, 1, PAL.glas); for (let k = 0; k < d - 1; k++) p.px(x + ww + k, yy - s2(k), PAL.glasD); }
    p.linie(x + 1, y - h + 6, x + 3, y - h + 4, '#e0f4ff');
    flachdach(p, x, y, ww, h, d, '#6a6e70', '#d8dcdc');
    p.rect(x, y - h + 1, ww, 2, 'S'); for (let k = 0; k < d; k++) p.rect(x + ww + k, y - h + 1 - s2(k), 1, 2, 'S-');
    p.rect(x + 2, y - h - 4, 1, 3, '#5a5e60'); p.px(x + 2, y - h - 5, '#e83a2a');
    return;
  }
  // Atomzeit: Wolkenkratzer mit Antenne
  const h = Math.min(26 + gr * 5, s.y - 12), ww = w - 2;
  quader(p, x, y, ww, h, d, '#8fb8d8', '#5a84a8');
  for (let yy = y - h + 2; yy < y; yy += 2) p.rect(x, yy, ww, 1, '#6a98c0');
  for (let yy = y - h + 2; yy < y; yy += 3) for (let k = 1; k < d - 1; k += 2) p.px(x + ww + k, yy - s2(k), '#3e6488');
  for (let k = 0; k < 4; k++) p.linie(x + 1, y - h + 4 + k * 9, x + 4, y - h + 1 + k * 9, '#d8f0ff');
  // Stufe oben
  quader(p, x + 2, y - h, ww - 4, 4, 3, '#a8c8e0', '#6a94b8');
  flachdach(p, x + 2, y - h, ww - 4, 4, 3, '#5a6470', '#c8d8e8');
  p.rect(x + 3, y - h - 9, 1, 4, '#7a828c'); p.px(x + 3, y - h - 10, '#ff4a3a');
  p.rect(x, y - h + 3, ww, 1, 'S'); p.rect(x, y - h + 4, ww, 1, 'S-');
}

function kuehlturm(p, x, y, h) {
  for (let j = 0; j < h; j++) {
    const t = j / h, hw = Math.round(4.5 - Math.sin(t * Math.PI * 0.85) * 1.6 + t * 0.6);
    for (let i = -hw; i <= hw; i++) p.px(x + i, y - j, i < -hw / 3 ? '#d4d8da' : i > hw / 3 ? '#8e9294' : '#b4b8ba');
  }
  p.rect(x - 3, y - h, 7, 1, '#6a6e70');
  p.rect(x - 4, y - 2, 9, 1, 'S');
}

// Plätze je Größe (von hinten nach vorne). lm = Wahrzeichen.
const PLAETZE = {
  1: [{ x: 21, y: 44, w: 9, lm: true }, { x: 36, y: 46, w: 8, rund: true }, { x: 13, y: 50, w: 8, rund: true, sp: true }, { x: 28, y: 52, w: 8 }],
  2: [{ x: 13, y: 41, w: 8, h: 1 }, { x: 25, y: 40, w: 11, lm: true }, { x: 43, y: 42, w: 7, rund: true }, { x: 8, y: 47, w: 8, rund: true, sp: true }, { x: 38, y: 48, w: 9, h: 1 }, { x: 18, y: 51, w: 8, sp: true }, { x: 29, y: 53, w: 8 }],
  3: [{ x: 17, y: 37, w: 7, h: 3 }, { x: 26, y: 37, w: 11, lm: true }, { x: 41, y: 38, w: 7, h: 4 }, { x: 8, y: 43, w: 8, h: 2, rund: true }, { x: 18, y: 44, w: 8, h: 4 }, { x: 39, y: 44, w: 8, h: 2, sp: true }, { x: 49, y: 46, w: 7, rund: true }, { x: 10, y: 50, w: 8, h: 1, sp: true }, { x: 23, y: 52, w: 9, h: 2 }, { x: 36, y: 51, w: 8, h: 1, rund: true }],
};

definiere('stadt', 'stadt', {
  w: 64, h: 56, zeitalterVarianten: true, groessen: 3, umriss: false,
  zeichne(p, o) {
    const z = Math.max(0, Math.min(6, o.zeitalter)), gr = Math.max(1, Math.min(3, o.groesse));
    const B = ZA[z].boden;
    // Boden
    const rx = 14 + gr * 4, ry = 5 + gr * 1.7;
    p.ellipse(32, 46, rx + 1, ry + 1, B[2]);
    p.ellipse(32, 45.5, rx, ry, B[0]);
    p.ellipse(31, 45, rx - 3, ry - 2, B[1]);
    for (let i = 0; i < 30; i++) { const xx = 32 + Math.round(Math.sin(i * 2.3) * rx * 0.8), yy = 45 + Math.round(Math.cos(i * 1.7) * ry * 0.7); p.px(xx, yy, B[2]); }
    if (z >= 4) { p.linie(32 - rx + 3, 47, 32 + rx - 3, 45, B[2]); p.linie(31, 45 - ry + 2, 34, 45 + ry - 1, B[2]); }
    const plaetze = PLAETZE[gr].slice();
    let n = 0;
    for (const s of plaetze) {
      const pl = { ...s };
      if (z === 6 && gr === 3 && !s.lm && n === 6) { teil(p, (q) => kuehlturm(q, s.x + 4, s.y, 13)); rauch(p, s.x + 4, s.y - 15, 3); n++; continue; }
      if (z === 6 && gr === 2 && n === 2) { teil(p, (q) => kuehlturm(q, s.x + 4, s.y, 11)); rauch(p, s.x + 4, s.y - 13, 2); n++; continue; }
      if (z >= 1 && pl.rund) pl.rund = false;
      teil(p, (q) => (s.lm ? wahrzeichen(q, pl, z, gr) : haus(q, pl, z, n, gr, !!s.sp)));
      if (z === 4 && s.lm) { const top = s.y - 7 - gr - 12 - gr * 2; const nr = gr > 2 ? 2 : 3; if (gr > 1) { rauch(p, s.x + 4, top - 2, nr, 1); rauch(p, s.x + s.w + 1, top - 4, nr); } else rauch(p, s.x + s.w, top - 2, nr); }
      if (z === 0 && s.lm) teil(p, (q) => { const fx = s.x + s.w + 3, fy = s.y + 4; q.px(fx - 1, fy, '#7a756c').px(fx + 2, fy, '#7a756c'); q.px(fx, fy, '#f39c12').px(fx + 1, fy, '#e8501a').px(fx, fy - 1, '#ffd040').px(fx + 1, fy - 2, '#f39c12'); });
      n++;
    }
    if (gr === 1 && z >= 1) teil(p, (q) => fahne(q, 46, 50, 12, 5));
  },
});

// ---------- Stadtmauer (Überlagerung vorne) ----------
const MR = { cx: 32, cy: 45, rx: 26, ry: 9.5 };
const basisY = (x) => { const t = (x - MR.cx) / MR.rx; return MR.cy + MR.ry * Math.sqrt(Math.max(0, 1 - t * t)); };
function turm(p, x, y, w, h, T, zinnen = true) {
  const hw = Math.floor(w / 2);
  for (let i = -hw; i <= hw; i++) p.rect(x + i, y - h + 1, 1, h, i < -hw / 3 ? T[0] : i > hw / 3 ? T[2] : T[1]);
  p.rect(x - hw, y - h, w, 1, T[0]);
  if (zinnen) for (let i = -hw; i <= hw; i += 2) p.px(x + i, y - h - 1, i > 0 ? T[1] : T[0]);
}
definiere('stadt', 'mauer', {
  w: 64, h: 56, zeitalterVarianten: true, umriss: false,
  zeichne(p, o) {
    const st = Math.max(0, Math.min(3, o.zeitalter));
    const x0 = MR.cx - MR.rx + 1, x1 = MR.cx + MR.rx - 1;
    if (st === 0) { // Holzpalisade
      teil(p, (q) => {
        for (let x = x0; x <= x1; x++) {
          const yb = Math.round(basisY(x)), h = 7 + ((x * 5) % 3 === 0 ? 1 : 0);
          const links = x < MR.cx;
          const c = x % 2 ? (links ? '#a8743c' : '#8a5a2b') : (links ? '#8a5a2b' : '#6a4420');
          q.rect(x, yb - h + 1, 1, h, c);
          q.px(x, yb - h, x % 2 ? '#c8a070' : '#6a4420');
          q.px(x, yb - 3, '#4a3018');
        }
        // Tor
        q.rect(MR.cx - 3, 47, 7, 8, '#3a2414'); q.rect(MR.cx - 3, 47, 7, 1, '#6a4420');
        for (let k = -3; k <= 3; k += 2) q.rect(MR.cx + k, 48, 1, 7, '#5a3a1e');
        // Wachtürme
        for (const tx of [x0 + 1, x1 - 1, MR.cx - 5, MR.cx + 5]) {
          const yb = Math.round(basisY(tx));
          q.rect(tx - 1, yb - 12, 3, 13, '#6a4420'); q.rect(tx - 1, yb - 12, 1, 13, '#8a5a2b');
          q.rect(tx - 3, yb - 13, 7, 2, '#a8743c'); q.rect(tx - 3, yb - 12, 7, 1, '#6a4420');
          q.poly([[tx - 4, yb - 14], [tx, yb - 18], [tx + 4, yb - 14]], '#d2ae5a'); q.linie(tx, yb - 18, tx + 4, yb - 14, '#a8843a');
        }
      });
      return;
    }
    if (st === 1) { // Steinmauer mit Zinnen
      teil(p, (q) => {
        for (let x = x0; x <= x1; x++) {
          const yb = Math.round(basisY(x)), h = 7, links = x < MR.cx - 6;
          const base = links ? '#b4ac9c' : x > MR.cx + 6 ? '#8a8476' : '#a09a8c';
          q.rect(x, yb - h + 1, 1, h, base);
          for (let yy = yb - h + 2; yy <= yb; yy += 2) if ((x + (yy >> 1)) % 3 === 0) q.px(x, yy, dunkel(base, 0.15));
          q.px(x, yb - h, hell(base, 0.25));
          if (x % 2 === 0) q.px(x, yb - h - 1, hell(base, 0.1));
        }
        for (const tx of [x0 + 2, MR.cx - 6, MR.cx + 6, x1 - 2]) { const yb = Math.round(basisY(tx)); turm(q, tx, yb, 7, 13, ['#c4bcac', '#a8a092', '#7e786c']); q.rect(tx, yb - 9, 1, 2, '#2a2a30'); }
        q.rect(MR.cx - 2, 49, 5, 6, '#2a2018'); q.px(MR.cx - 2, 49, '#a09a8c').px(MR.cx + 2, 49, '#a09a8c');
        q.rect(MR.cx - 2, 50, 5, 1, '#5a5048');
        fahne(q, MR.cx - 6, Math.round(basisY(MR.cx - 6)) - 14, 4, 4);
      });
      return;
    }
    if (st === 2) { // Festungsmauer mit Bastionen
      teil(p, (q) => {
        for (let x = x0; x <= x1; x++) {
          const yb = Math.round(basisY(x)), h = 6;
          const base = x < MR.cx ? '#9a8e78' : '#766c5c';
          for (let j = 0; j < h; j++) q.px(x, yb - j, j < 2 ? dunkel(base, 0.1) : base);
          q.px(x, yb - h + 1, hell(base, 0.2)); q.px(x, yb - h, '#6a8a40'); q.px(x, yb - h - 1, (x % 4 === 0) ? '#5a7a34' : null);
          if (x % 6 === 0) q.px(x, yb - 4, '#3a3630');
        }
      });
      for (const bx of [x0 + 5, MR.cx, x1 - 5]) teil(p, (q) => {
        {
          const yb = Math.round(basisY(bx)) + 1;
          q.poly([[bx - 6, yb - 7], [bx, yb - 4], [bx, yb + 1], [bx - 6, yb - 2]], '#aaa290');
          q.poly([[bx, yb - 4], [bx + 6, yb - 7], [bx + 6, yb - 2], [bx, yb + 1]], '#82796a');
          q.poly([[bx - 6, yb - 7], [bx, yb - 4], [bx + 6, yb - 7], [bx, yb - 10]], '#c4bca8');
          q.linie(bx - 6, yb - 7, bx, yb - 10, '#d8d0bc').linie(bx, yb - 4, bx, yb + 1, '#948c7c');
          q.rect(bx - 1, yb - 8, 3, 1, '#2a2a2a').px(bx + 2, yb - 7, '#4a4a4a').px(bx - 1, yb - 7, '#4a4a4a');
          q.px(bx - 3, yb - 3, '#3a3630').px(bx + 3, yb - 3, '#3a3630');
        }
      });
      teil(p, (q) => {
        fahne(q, MR.cx + 4, Math.round(basisY(MR.cx)) - 7, 7, 5);
      });
      return;
    }
    // Betonbunker mit Stacheldraht
    teil(p, (q) => {
      for (let x = x0; x <= x1; x++) {
        const yb = Math.round(basisY(x)), h = 5, base = x < MR.cx ? '#a8acae' : '#86898c';
        q.rect(x, yb - h + 1, 1, h, base); q.px(x, yb - h, hell(base, 0.25));
        if (x % 8 === 0) q.rect(x, yb - h + 1, 1, h, dunkel(base, 0.2));
      }
    });
    for (const bx of [x0 + 6, MR.cx, x1 - 6]) teil(p, (q) => {
      {
        const yb = Math.round(basisY(bx)) + 1;
        kuppel(q, bx, yb, 5, 5, ['#c4c8ca', '#a8acae', '#86898c', '#6a6e70']);
        q.rect(bx - 3, yb - 3, 6, 1, '#1e2022'); q.px(bx + 3, yb - 3, '#3a3e40');
        q.rect(bx - 5, yb - 1, 11, 2, '#7d8183');
      }
    });
    teil(p, (q) => {
      for (const sx of [x0 + 12, x1 - 12]) { const yb = Math.round(basisY(sx)); for (let k = 0; k < 5; k++) { q.rect(sx - 3 + k * 1.5, yb + 1 - (k % 2), 2, 1, k % 2 ? '#a89a6a' : '#8a7c52'); } }
    });
    // Stacheldraht (ohne Umriss)
    for (let x = x0 + 1; x <= x1 - 1; x++) {
      const yb = Math.round(basisY(x)) - 6;
      if (p.hole(x, yb + 1) && !['#c4c8ca', '#a8acae'].includes(p.hole(x, yb))) {
        p.px(x, yb - (x % 3 === 0 ? 1 : 0), '#4a4e52');
        if (x % 3 === 0) p.px(x, yb - 2, '#6a6e72').px(x - 1, yb - 1, '#6a6e72');
      }
      if (x % 7 === 0) p.rect(x, yb - 1, 1, 2, '#3a3e42');
    }
  },
});

// ---------- Stadtstaat ----------
definiere('stadt', 'stadtstaat', {
  w: 64, h: 56, umriss: false,
  zeichne(p) {
    const B = ['#a89a7a', '#b8aa8a', '#948668'];
    p.ellipse(32, 46, 19, 8, B[2]); p.ellipse(32, 45.5, 18, 7, B[0]); p.ellipse(31, 45, 15, 5, B[1]);
    // Turm hinten Mitte
    teil(p, (q) => {
      const tx = 28, ty = 42, th = 19;
      quader(q, tx, ty, 7, th, 3, '#e8e2d4', '#b8b0a0');
      for (let yy = ty - th + 3; yy <= ty; yy += 3) q.rect(tx, yy, 7, 1, '#d4ccbc');
      q.rect(tx + 3, ty - th + 4, 1, 3, '#2a2a3a').rect(tx + 3, ty - th + 12, 1, 3, '#2a2a3a').rect(tx + 3, ty - 3, 1, 3, '#3a2414');
      q.rect(tx - 1, ty - th - 1, 9, 2, '#d4ccbc');
      for (let k = -1; k < 8; k += 2) q.px(tx + k, ty - th - 2, '#e8e2d4');
      q.rect(tx, ty - th - 4, 1, 2, '#e8e2d4').rect(tx + 6, ty - th - 4, 1, 2, '#e8e2d4');
      zeltdach(q, tx, ty - th - 2, 7, 3, 3, 8, toene('#c8a040'));
      // große Fahne
      const fx = tx + 4, fy = ty - th - 12;
      q.rect(fx, fy - 9, 1, 10, '#4a3a2a'); q.px(fx, fy - 10, PAL.gold);
      for (let i = 0; i < 10; i++) for (let j = 0; j < 6; j++) { const wy = fy - 9 + j + (i % 4 >= 2 ? 1 : 0); q.px(fx + 1 + i, wy, j === 0 ? 'S+' : j === 5 ? 'S-' : 'S'); }
      for (let i = 0; i < 10; i += 2) q.px(fx + 1 + i, fy - 9 + 3 + (i % 4 >= 2 ? 1 : 0), 'S-');
      q.px(fx + 5, fy - 6, PAL.gold).px(fx + 4, fy - 5, PAL.gold).px(fx + 6, fy - 5, PAL.gold).px(fx + 5, fy - 4, PAL.gold);
    });
    const H = [{ x: 15, y: 44, w: 8 }, { x: 40, y: 45, w: 8 }, { x: 21, y: 51, w: 8 }, { x: 34, y: 52, w: 7 }];
    H.forEach((s, i) => teil(p, (q) => {
      const h = 6, d = 4, wand = ['#e8dcc0', '#e4ccb0', '#dcd8c0', '#ece0c4'][i];
      quader(q, s.x, s.y, s.w, h, d, wand, dunkel(wand, 0.22));
      fenster(q, s.x, s.y, s.w, h, d, '#4a3a3a', '#3a2a2a', { dx: 2, oben: 1 });
      tuer(q, s.x + 1, s.y, '#5a3a2a');
      satteldach(q, s.x, s.y, s.w, h, d, 3, toene(i === 1 ? 'S' : '#b5523b'), dunkel(wand, 0.22));
    }));
  },
});

// ---------- Hauptstadt-Markierung ----------
definiere('stadt', 'kapitol', {
  w: 16, h: 16,
  zeichne(p) {
    p.karte(1, 2, [
      '......w.......',
      '.....wGw......',
      '......G.......',
      '.g...gGg...g..',
      '.Gg..GGG..gG..',
      '.GGg.GGG.gGG..',
      '.GGGgGRGgGGG..',
      '.GGGGGGGGGGd..',
      '.GGGGGGGGGGd..',
      '.hhhhhhhhhhd..',
      '.GbGGRGGbGGd..',
      '.ddddddddddd..',
    ], { w: '#ffffff', G: '#f1c40f', g: '#ffe680', d: '#b8930a', h: '#ffe680', R: '#e0302a', b: '#3a7ad8' });
    p.schiebe(1, 0);
  },
});
