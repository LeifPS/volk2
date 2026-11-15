// Gelände-Dekoration (Bewuchs/Relief) für die Hexfelder, 48x40, je 4 Varianten.
// Sprite-Unterkante liegt ca. 10 px unter der Feldmitte; die Feldmitte ist also bei (24, 29).
// Objekte werden einzeln umrandet (teil), damit sich überlappende Bäume/Felsen voneinander abheben;
// flache Dinge (Gras, Wasserlachen, Schatten, Nebel) bleiben ohne Umriss.
import { definiere } from '../sprites.js';
import { PAL, hell, dunkel, mische, Pinsel, UMRISS } from '../pixel.js';

// ---------- Hilfen ----------
function zufall(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function saat(s, v) { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return zufall(h + v * 7919); }

/** Zeichnet fn auf ein eigenes Blatt, umrandet es und überträgt es auf p. */
function teil(p, fn, rand = UMRISS, basis) {
  const t = new Pinsel(p.w, p.h); fn(t); if (rand) t.umriss(rand);
  if (basis !== undefined) for (let x = 0; x < t.w; x++) if (t.hole(x, basis + 1) === rand) t.px(x, basis + 1, 'leer');
  for (let i = 0; i < t.feld.length; i++) if (t.feld[i]) p.feld[i] = t.feld[i];
}
/** Liegt (x,y) auf der sichtbaren Hexfläche (Feldmitte 24/29)? */
function imHex(x, y, m = 2) {
  const dy = Math.abs(y - 29); if (y > 38 - m + 1) return false;
  const hw = dy <= 10 ? 23 : 23 * (20 - dy) / 10;
  return Math.abs(x - 23.5) <= hw - m;
}
/** Szene: Liste von {y, f, flach}; flache Teile zuerst, dann von hinten nach vorne mit eigenem Umriss. */
function szene(p, teile) {
  for (const t of teile.filter((t) => t.flach)) t.f(p);
  for (const t of teile.filter((t) => !t.flach).sort((a, b) => a.y - b.y)) teil(p, t.f, t.rand === undefined ? UMRISS : t.rand, t.basis);
}
const O = (y, f, rand, basis) => ({ y, f, rand, basis });
const F = (f) => ({ flach: true, f });
/** Streut n Positionen auf die Hexfläche (für Kleinkram). */
function streu(r, n, m = 3, yMin = 15, yMax = 38) {
  const l = []; let tries = 0;
  while (l.length < n && tries++ < 400) { const x = Math.round(2 + r() * 44), y = Math.round(yMin + r() * (yMax - yMin)); if (imHex(x, y, m)) l.push([x, y]); }
  return l;
}

// ---------- Bausteine ----------
function stamm(p, x, y, h, c = PAL.holz, cd = PAL.holzD) { for (let i = 0; i < h; i++) { p.px(x, y - i, c); p.px(x + 1, y - i, cd); } }
function schatten(p, x, y, rx, c) { p.ellipse(x + 1.5, y + 0.3, rx, Math.max(0.6, rx * 0.3), c); }

const LAUB = { d: '#2c5a28', b: '#3d7f38', h: '#5aa84f', hh: '#86c86a' };
const LAUB2 = { d: '#3e5a22', b: '#5a7d2c', h: '#7da23e', hh: '#a8c860' };
const NADEL = { h: '#3f8a4a', b: '#2d6a3a', d: '#214f2c', dd: '#163a1f' };

function laubbaum(p, x, y, s, T, r) {
  const th = 3 + (s > 1 ? 1 : 0);
  stamm(p, x, y, th + 2, PAL.holz, PAL.holzD);
  p.px(x - 1, y, PAL.holzD).px(x + 2, y, PAL.holzD);
  const rx = 3 + s * 1.2, ry = 2.6 + s * 0.9, cx = x + 0.5, cy = y - th - ry + 0.5;
  const bl = [[cx - rx * 0.45, cy + ry * 0.25, rx * 0.62, ry * 0.68], [cx + rx * 0.45, cy + ry * 0.3, rx * 0.6, ry * 0.66], [cx - 0.2, cy - ry * 0.3, rx * 0.68, ry * 0.7]];
  for (const [a, b, c, d] of bl) p.ellipse(a, b, c, d, T.d);
  for (const [a, b, c, d] of bl) p.ellipse(a - 0.5, b - 0.6, c - 0.6, d - 0.6, T.b);
  for (const [a, b, c, d] of bl) p.ellipse(a - c * 0.35, b - d * 0.4, c * 0.38, d * 0.32, T.h);
  // Blattstruktur
  for (let i = 0; i < 4 + s * 3; i++) {
    const a = r() * Math.PI * 2, rr = r() * 0.8;
    const xx = Math.round(cx + Math.cos(a) * rx * rr), yy = Math.round(cy + Math.sin(a) * ry * rr);
    if (p.hole(xx, yy) === T.b) p.px(xx, yy, xx > cx ? T.d : T.h);
  }
  p.px(Math.round(cx - rx * 0.5), Math.round(cy - ry * 0.55), T.hh);
  if (s > 0) p.px(Math.round(cx - rx * 0.2), Math.round(cy - ry * 0.85), T.hh);
}

function nadelbaum(p, x, y, h, T) {
  const top = y - h;
  p.px(x, y, PAL.holzD).px(x, y - 1, PAL.holz);
  const n = h - 2;
  for (let r = 0; r < n; r++) {
    const yy = top + r, tier = Math.floor(r / 3), w = r % 3;
    const hw = r === 0 ? 0 : Math.round(0.4 + tier * 0.95 + w * 0.75);
    for (let i = -hw; i <= hw; i++) {
      let c = i < 0 ? T.b : (i === 0 ? T.b : T.d);
      if (i === -hw && hw > 0) c = T.h;
      if (i > 0 && i === hw) c = T.dd;
      if (w === 2 && r > 0) c = i < -hw + 2 ? T.b : (i <= 0 ? T.d : T.dd);
      if (r === 0) c = T.h;
      p.px(x + i, yy, c);
    }
    if (w === 0 && r > 0) p.px(x - hw + 1, yy, T.h);
  }
}

function palme(p, x, y, h, lean, T) {
  let tx = x, ty = y - h;
  for (let t = 0; t <= h; t++) {
    const xx = x + Math.round(lean * (t / h) * (t / h));
    p.px(xx, y - t, t % 2 ? T.st : T.stD); p.px(xx + 1, y - t, T.stD);
    tx = xx; ty = y - t;
  }
  const wedel = [[-1, -0.3, 7], [1, -0.3, 7], [-0.75, -1.0, 5], [0.75, -1.0, 5], [-0.55, 0.25, 5], [0.6, 0.25, 5]];
  let vx = tx + 0.5, vy = ty;
  for (const [dx, up, L] of wedel) {
    let px0 = vx, py0 = vy;
    for (let i = 1; i <= L; i++) {
      const fx = vx + dx * i, fy = vy + up * i + 0.11 * i * i;
      const dick = i < L * 0.75;
      p.linie(px0, py0, fx, fy, up < -0.5 || (dx < 0 && i < 3) ? T.h : T.b);
      if (dick) p.linie(px0, py0 + 1, fx, fy + 1, T.d);
      px0 = fx; py0 = fy;
    }
  }
  p.rect(tx - 1, ty - 1, 3, 2, T.b); p.px(tx - 1, ty - 1, T.h);
  p.px(tx, ty + 1, '#6b4a2a').px(tx + 1, ty + 1, '#4a3018').px(tx - 1, ty + 1, '#4a3018');
}

function akazie(p, x, y, s, T) {
  p.linie(x, y, x, y - 4, '#6b4a2a').linie(x + 1, y, x + 1, y - 3, '#4a3018');
  p.linie(x, y - 4, x - 3 - s, y - 7, '#6b4a2a').linie(x + 1, y - 3, x + 4 + s, y - 8, '#4a3018').linie(x, y - 5, x + 1, y - 8, '#6b4a2a');
  const cy = y - 9;
  p.ellipse(x + 0.5, cy + 0.3, 6 + s, 1.7, T.d);
  p.ellipse(x - 0.5, cy - 0.5, 5.5 + s, 1.3, T.b);
  p.ellipse(x - 2, cy - 1.2, 3 + s * 0.5, 0.7, T.h);
  p.ellipse(x + 3 + s, cy - 1.8, 2.5, 1, T.b); p.px(x + 2 + s, cy - 2.6, T.h);
  p.ellipse(x - 4 - s, cy - 0.8, 2, 0.9, T.b);
}

function busch(p, x, y, rr, T) {
  p.ellipse(x + 0.3, y - rr * 0.7, rr, rr * 0.75, T.d);
  p.ellipse(x - 0.3, y - rr * 0.85, rr - 0.6, rr * 0.55, T.b);
  p.px(x - Math.round(rr * 0.5), y - Math.round(rr * 1.1), T.h);
  if (rr > 2) p.px(x - Math.round(rr * 0.5) + 1, y - Math.round(rr * 1.1), T.h);
}

const STEIN = { hh: '#cfcac0', h: '#aaa59b', b: '#8a857c', d: '#65615a' };
function fels(p, x, y, s, T = STEIN) {
  const w = 1.5 + s * 1.4, h = 1 + s * 1.2;
  p.poly([[x - w, y], [x - w + 0.5, y - h * 0.6], [x - w * 0.4, y - h], [x + w * 0.4, y - h], [x + w, y - h * 0.4], [x + w, y]], T.d);
  p.poly([[x - w, y - 1], [x - w + 0.5, y - h * 0.6], [x - w * 0.4, y - h], [x + w * 0.3, y - h], [x + w * 0.1, y - 1]], T.b);
  p.linie(x - w * 0.4, y - h, x + w * 0.3, y - h, T.h);
  p.px(x - w * 0.4, y - h, T.hh);
  if (s >= 2) p.linie(x - w + 0.5, y - h * 0.6, x - w * 0.4, y - h, T.h);
}

function gras(p, x, y, c1, c2, art = 0) {
  if (art === 0) p.px(x, y, c2).px(x, y - 1, c1).px(x - 1, y - 1, c2).px(x - 1, y - 2, c1).px(x + 1, y - 1, c1).px(x + 2, y - 2, c1);
  else if (art === 1) p.px(x, y, c2).px(x + 1, y, c2).px(x, y - 1, c1).px(x, y - 2, c1).px(x + 1, y - 1, c1).px(x - 1, y - 1, c1).px(x + 2, y - 1, c2);
  else p.px(x, y, c2).px(x - 1, y - 1, c1).px(x + 1, y - 1, c1).px(x + 1, y - 2, c1).px(x - 2, y - 2, c2);
}

const KAKTUS = { h: '#6fae4a', b: '#4a8a3a', d: '#2f6a2a', bl: '#e86a9a' };
function kaktus(p, x, y, h, T = KAKTUS, arme = 3, bluete = false) {
  p.rect(x - 1, y - h + 1, 3, h, T.b); p.rect(x - 1, y - h + 2, 1, h - 2, T.h); p.rect(x + 1, y - h + 2, 1, h - 2, T.d);
  p.px(x - 1, y - h + 1, 'leer').px(x + 1, y - h + 1, 'leer').px(x, y - h, T.b);
  if (arme & 1) { const ay = y - Math.floor(h * 0.4); p.rect(x - 3, ay, 2, 1, T.b); p.rect(x - 4, ay - 3, 2, 4, T.b); p.rect(x - 4, ay - 3, 1, 4, T.h); p.px(x - 4, ay - 3, 'leer'); p.px(x - 3, ay - 4, T.b); }
  if (arme & 2) { const ay = y - Math.floor(h * 0.6); p.rect(x + 2, ay, 2, 1, T.d); p.rect(x + 3, ay - 2, 2, 3, T.b); p.rect(x + 4, ay - 2, 1, 3, T.d); p.px(x + 4, ay - 2, 'leer'); p.px(x + 3, ay - 3, T.b); }
  for (let i = 2; i < h - 1; i += 3) p.px(x, y - i, T.h);
  if (bluete) p.px(x, y - h, T.bl).px(x - 1, y - h + 1, T.bl);
}

/** Runde Kuppe mit Lichtverlauf von oben links. T = [dunkel, mittel, hell, sehr hell]. */
function kuppe(p, cx, by, rwL, rwR, hh, T, opt = {}) {
  for (let x = Math.floor(cx - rwL); x <= Math.ceil(cx + rwR); x++) {
    const rw = x < cx ? rwL : rwR, dx = (x - cx) / rw;
    if (Math.abs(dx) > 1) continue;
    const top = Math.round(by - hh * Math.pow(1 - dx * dx, opt.form ?? 0.5));
    for (let y = top; y <= by; y++) {
      const ny = (y - top) / Math.max(1, by - top);
      let v = -dx * 0.85 + (1 - ny) * 0.55 - 0.15 + (((x + y) & 1) ? 0.06 : -0.06);
      if (opt.grat && x > cx) v -= 0.5;
      const c = v > 0.55 ? T[3] : v > 0.1 ? T[2] : v > -0.4 ? T[1] : T[0];
      p.px(x, y, c);
    }
  }
}

/** Berg mit gezackter Silhouette, Lichtseite links, Schatten rechts, Schneekappe. */
function berg(p, cx, by, w, h, T, r, opt = {}) {
  const L = cx - w / 2, R = cx + w / 2, gx = cx + (opt.versatz || 0), gy = by - h;
  const tops = {};
  // Schultern: Knick im Hang auf jeder Seite
  const schL = 0.35 + r() * 0.3, schR = 0.35 + r() * 0.3;
  let n = 0;
  for (let x = Math.ceil(L); x <= Math.floor(R); x++) {
    const links = x <= gx, fr = links ? (gx - x) / (gx - L) : (x - gx) / (R - gx);
    const sch = links ? schL : schR;
    let t = gy + fr * h - Math.sin(Math.min(1, fr / sch) * Math.PI) * h * 0.07 * (fr < sch ? 1 : 0) + (fr > sch ? -h * 0.06 * Math.sin((fr - sch) / (1 - sch) * Math.PI) : 0);
    if (opt.krater && Math.abs(x - gx) <= opt.krater) t = gy + Math.abs(x - gx) * 0.3;
    if (x % 2 === 0) n = Math.max(-1.5, Math.min(1.5, n + (r() - 0.5) * 1.6));
    const nah = Math.abs(x - gx);
    tops[x] = Math.round(t + (nah > 1 && !(opt.krater && nah <= opt.krater + 1) ? n * Math.min(1, nah / 5) : 0));
  }
  const schnee = opt.schnee ?? 0;
  const kerben = [], rippen = [];
  for (let i = 0; i < 3; i++) kerben.push([gx - 1 - r() * w * 0.3, 0.15 + r() * 0.45]);
  for (let i = 0; i < 2; i++) rippen.push([gx + 2 + r() * w * 0.25, 0.25 + r() * 0.4]);
  const gratK = opt.grat ?? 0.04;
  for (const xs in tops) {
    const x = +xs, top = tops[x];
    for (let y = top; y <= by; y++) {
      const f = (y - gy) / h;
      const grat = gx + gratK * w * f + Math.sin(f * 9 + gx) * 1.0;
      const links = x < grat;
      let c = links ? T.h : T.d;
      if (links && (y - top <= 0)) c = T.hh;
      if (links && grat - x < 2.5 && f > 0.1) c = T.b;
      if (!links && x - grat < 1) c = T.dd;
      if (links && ((x * 5 + y * 3) % 13 === 0) && f > 0.2) c = T.b;
      if (!links && ((x * 3 + y * 5) % 11 === 0) && f > 0.3) c = T.dd;
      // Gesteinsrinnen (Lichtseite) und helle Rippen (Schattenseite)
      for (const [kx, kf] of kerben) { const ky = gy + kf * h; if (y > ky && Math.abs(x - (kx - (y - ky) * 0.6)) < 0.6 && f < 0.9 && links) c = T.b; if (y > ky && Math.abs(x - (kx - (y - ky) * 0.6) - 1) < 0.6 && f < 0.9 && links) c = T.hh; }
      for (const [kx, kf] of rippen) { const ky = gy + kf * h; if (y > ky && Math.abs(x - (kx + (y - ky) * 0.5)) < 0.6 && f < 0.9 && !links) c = T.b; }
      if (f > 0.86) c = links ? T.b : T.dd;
      const zack = (((x * 7) % 5) / 5 - 0.5) * 0.2 + ((x % 2) ? 0.04 : 0);
      const sn = schnee > 0 && f < schnee + zack + (links ? 0 : -0.04);
      if (sn) c = links ? (y === top ? '#ffffff' : T.s) : (y === top ? T.s : T.sd);
      p.px(x, y, c);
    }
  }
  return tops;
}

const BERG = { hh: '#cfcac2', h: '#a8a29a', b: '#8a857e', d: '#6a6670', dd: '#4c4954', s: '#f6f8fb', sd: '#aebdd2' };

// ---------- Wald ----------
definiere('deko', 'wald', {
  w: 48, h: 40, varianten: 4, umriss: false,
  zeichne(p, o) {
    const r = saat('wald', o.variante), T = [];
    const sc = '#36702f';
    const L = (x, y, s, pal = LAUB) => { T.push(F((q) => schatten(q, x, y, 3 + s, sc))); T.push(O(y, (q) => laubbaum(q, x, y, s, pal, r))); };
    const N = (x, y, h) => { T.push(F((q) => schatten(q, x, y, 2 + h / 5, sc))); T.push(O(y, (q) => nadelbaum(q, x, y, h, NADEL))); };
    const B = (x, y) => T.push(O(y, (q) => busch(q, x, y, 2, LAUB)));
    if (o.variante === 0) { N(11, 25, 14); L(23, 23, 1); N(34, 25, 13); L(16, 34, 2); N(29, 35, 12); L(39, 34, 1); B(7, 34); B(23, 38); }
    else if (o.variante === 1) { N(9, 30, 11); N(17, 23, 13); N(26, 21, 15); N(35, 25, 13); N(41, 32, 10); N(13, 37, 12); N(23, 34, 14); N(33, 37, 12); }
    else if (o.variante === 2) { L(13, 27, 2); L(31, 24, 2, LAUB2); L(23, 36, 2); L(40, 35, 1); L(6, 35, 0, LAUB2); B(30, 33); B(16, 38); }
    else { L(11, 23, 0); N(19, 22, 10); L(28, 25, 1, LAUB2); N(37, 27, 11); N(7, 33, 10); L(19, 33, 1); N(30, 37, 13); L(41, 37, 0); B(25, 30); }
    for (const [x, y] of streu(r, 6)) T.push(F((q) => gras(q, x, y, '#5a9c4e', '#3a7434', Math.floor(r() * 3))));
    szene(p, T);
  },
});

// ---------- Dschungel ----------
const DSCH = { d: '#124f26', b: '#1d7436', h: '#2f9446', hh: '#56c06a' };
const DPALM = { st: '#7a5a3a', stD: '#55391f', b: '#2a9a44', d: '#176a2e', h: '#5cc26a' };
function liane(p, x, y, l) { for (let i = 0; i < l; i++) { p.px(x + (i % 4 === 2 ? 1 : 0), y + i, '#2f6a24'); if (i % 3 === 1) p.px(x + 1 + (i % 4 === 2 ? 1 : 0), y + i, '#4fa040'); } }
function farn(p, x, y, T) {
  p.ellipse(x, y - 1.5, 3.5, 1.8, T.d);
  p.ellipse(x - 0.5, y - 2, 2.8, 1.2, T.b);
  for (const [a, b] of [[-3, -2], [-1, -3], [1, -3], [3, -2], [0, -4]]) p.px(x + a, y + b, T.h);
  p.px(x - 4, y - 1, T.b).px(x + 4, y - 1, T.d);
}
function urwaldbaum(p, x, y, s, r) {
  const th = 5 + s;
  stamm(p, x, y, th + 2, '#6a4a2e', '#46301c');
  p.px(x - 1, y, '#46301c').px(x + 2, y, '#46301c').px(x - 1, y - 1, '#6a4a2e');
  laubbaum(p, x, y - th + 2, 1 + s, DSCH, r);
  liane(p, x - 3 - s, y - th - 1, 4 + s);
  liane(p, x + 3 + s, y - th, 3 + s);
}
definiere('deko', 'dschungel', {
  w: 48, h: 40, varianten: 4, umriss: false,
  zeichne(p, o) {
    const r = saat('dschungel', o.variante), T = [];
    const sc = '#257a42';
    const U = (x, y, s) => { T.push(F((q) => schatten(q, x, y, 4 + s, sc))); T.push(O(y, (q) => urwaldbaum(q, x, y, s, r))); };
    const P = (x, y, h, l) => { T.push(F((q) => schatten(q, x + l, y, 3, sc))); T.push(O(y, (q) => palme(q, x, y, h, l, DPALM))); };
    const Fa = (x, y) => T.push(O(y, (q) => farn(q, x, y, DPALM)));
    const Bl = (x, y, c) => T.push(O(y + 0.1, (q) => { q.px(x, y, c).px(x + 1, y, c).px(x, y - 1, c).px(x + 1, y - 1, '#ffd040'); }));
    if (o.variante === 0) { U(14, 26, 1); P(30, 24, 12, 2); U(36, 33, 0); P(9, 35, 10, -2); P(23, 37, 11, 1); Fa(18, 33); Fa(42, 37); Bl(29, 33, '#e8402a'); }
    else if (o.variante === 1) { P(10, 26, 11, -1); P(20, 22, 14, 2); P(33, 25, 12, -2); P(40, 33, 10, 2); P(15, 36, 12, -1); P(28, 36, 13, 1); Fa(7, 33); Fa(22, 31); Bl(36, 37, '#ff6a20'); }
    else if (o.variante === 2) { U(12, 28, 2); U(32, 26, 1); P(22, 37, 12, -1); U(40, 36, 0); Fa(6, 36); Fa(30, 36); Fa(17, 33); Bl(10, 37, '#e8402a'); Bl(35, 31, '#c040c0'); }
    else { U(23, 24, 2); P(9, 31, 11, -2); P(37, 30, 12, 2); U(17, 37, 0); P(30, 38, 10, 1); Fa(42, 37); Fa(5, 37); Bl(25, 34, '#ff6a20'); }
    for (const [x, y] of streu(r, 7)) T.push(F((q) => gras(q, x, y, '#4fc070', '#24804a', Math.floor(r() * 3))));
    szene(p, T);
  },
});

// ---------- Savanne ----------
const AKAZIE = { d: '#4f5e22', b: '#6e7f2e', h: '#93a03e', hh: '#b8c25a' };
const SGRAS = ['#e4d27a', '#a8943c'];
function grasbuendel(p, x, y) {
  for (const [dx, hh, c] of [[-3, 3, '#8a7a30'], [-2, 5, SGRAS[0]], [-1, 4, '#cdb85a'], [0, 6, '#f0e098'], [1, 4, '#b8a448'], [2, 5, '#cdb85a'], [3, 3, '#8a7a30']]) p.linie(x + Math.sign(dx), y, x + dx, y - hh, c);
  p.rect(x - 1, y, 3, 1, SGRAS[1]);
}
function termitenhuegel(p, x, y) { p.poly([[x - 3, y], [x - 1, y - 7], [x + 1, y - 8], [x + 3, y], [x + 4, y]], '#8a5a34'); p.linie(x - 1, y - 7, x - 2, y - 1, '#b07a48'); p.rect(x + 1, y - 6, 1, 6, '#6a4224'); p.px(x + 2, y - 4, '#6a4224').px(x - 1, y - 4, '#a06a3e'); }
definiere('deko', 'savanne', {
  w: 48, h: 40, varianten: 4, umriss: false,
  zeichne(p, o) {
    const r = saat('savanne', o.variante), T = [];
    const sc = '#a8943e';
    const A = (x, y, s) => { T.push(F((q) => q.ellipse(x + 2, y, 6 + s, 1.3, sc))); T.push(O(y, (q) => akazie(q, x, y, s, AKAZIE))); };
    const G = (x, y) => T.push(F((q) => grasbuendel(q, x, y)));
    const Bu = (x, y) => T.push(O(y, (q) => busch(q, x, y, 2, AKAZIE)));
    if (o.variante === 0) { A(22, 30, 1); G(10, 34); G(36, 36); G(30, 26); Bu(13, 27); }
    else if (o.variante === 1) { A(14, 27, 0); A(33, 35, 1); G(8, 36); G(24, 37); G(38, 26); G(19, 33); }
    else if (o.variante === 2) { A(30, 27, 0); T.push(O(35, (q) => fels(q, 13, 35, 2))); T.push(O(33, (q) => fels(q, 17, 33, 1))); Bu(36, 36); Bu(8, 30); G(24, 36); G(20, 25); }
    else { T.push(O(30, (q) => termitenhuegel(q, 15, 30))); A(34, 31, 0); G(9, 36); G(22, 36); G(26, 27); G(40, 37); }
    for (const [x, y] of streu(r, 10)) T.push(F((q) => gras(q, x, y, '#e8d888', '#a8943c', Math.floor(r() * 3))));
    szene(p, T);
  },
});

// ---------- Hügel ----------
const HUEGEL = ['#5f7034', '#7c9045', '#97ab5a', '#b2c473'];
definiere('deko', 'huegel', {
  w: 48, h: 40, varianten: 4, umriss: false,
  zeichne(p, o) {
    const r = saat('huegel', o.variante), T = [];
    const K = (cx, by, rl, rr, hh) => T.push(O(by, (q) => kuppe(q, cx, by, rl, rr, hh, HUEGEL)));
    const S = (x, y, s) => T.push(O(y + 0.5, (q) => fels(q, x, y, s)));
    const L = (x, y, s) => T.push(O(y + 0.5, (q) => laubbaum(q, x, y, s, LAUB, r)));
    if (o.variante === 0) { K(15, 30, 11, 11, 13); K(32, 35, 13, 11, 12); S(37, 34, 2); S(11, 29, 1); }
    else if (o.variante === 1) { K(24, 32, 16, 15, 16); K(10, 37, 8, 8, 7); S(30, 31, 2); S(26, 28, 1); L(38, 36, 0); }
    else if (o.variante === 2) { K(13, 27, 9, 9, 10); K(33, 28, 10, 9, 11); K(22, 37, 12, 11, 10); S(17, 36, 1); S(40, 27, 1); }
    else { K(28, 30, 13, 12, 14); K(12, 35, 10, 9, 10); S(10, 34, 2); S(34, 29, 1); L(41, 36, 0); T.push(O(37, (q) => busch(q, 25, 37, 2, LAUB))); }
    szene(p, T);
    // Grasbüschel und Steinchen auf den Kuppen (flach)
    for (const [x, y] of streu(r, 12, 3, 12)) if (p.hole(x, y) && p.hole(x, y - 2)) gras(p, x, y, '#b8ca7a', '#6a7d3a', Math.floor(r() * 3));
  },
});

// ---------- Gebirge ----------
definiere('deko', 'gebirge', {
  w: 48, h: 40, varianten: 4, umriss: false,
  zeichne(p, o) {
    const r = saat('gebirge', o.variante), T = [];
    const B = (cx, by, w, h, opt = {}) => T.push(O(by, (q) => berg(q, cx, by, w, h, BERG, r, { schnee: 0.36, ...opt })));
    if (o.variante === 0) { B(14, 32, 22, 22); B(34, 31, 22, 24, { versatz: 1 }); B(24, 37, 30, 35, { versatz: -1 }); }
    else if (o.variante === 1) { B(31, 33, 24, 25, { versatz: 2 }); B(18, 37, 32, 35, { versatz: -2 }); T.push(O(38, (q) => fels(q, 38, 37, 2))); }
    else if (o.variante === 2) { B(12, 33, 20, 20); B(27, 36, 30, 34, { versatz: 3 }); B(39, 37, 16, 17, { schnee: 0.25 }); }
    else { B(17, 36, 26, 33, { versatz: 1, grat: 0.12 }); B(33, 36, 26, 31, { versatz: -1 }); B(26, 38, 16, 12, { schnee: 0 }); }
    szene(p, T);
  },
});

// ---------- Wüste ----------
const SAND = ['#b89a58', '#d4b56a', '#e6c985', '#f4dea0'];
function steinchen(p, x, y) { p.px(x, y, '#9a8466').px(x + 1, y, '#7a6650').px(x, y - 1, '#c4b08a'); }
definiere('deko', 'wueste', {
  w: 48, h: 40, varianten: 4, umriss: false,
  zeichne(p, o) {
    const r = saat('wueste', o.variante), T = [];
    const D = (cx, by, rl, rr, hh) => T.push(O(by - 4, (q) => { kuppe(q, cx, by, rl, rr, hh, SAND, { grat: true, form: 0.8 }); for (let i = 2; i < hh; i += 2) q.linie(cx - rl * 0.7 + i, by - i * 0.5 + 1, cx - rl * 0.35 + i, by - i * 0.5, SAND[1]); }, '#a88c4a', by));
    const K = (x, y, h, a, b) => T.push(O(y, (q) => kaktus(q, x, y, h, KAKTUS, a, b)));
    const S = (x, y, s) => T.push(O(y + 0.5, (q) => fels(q, x, y, s, { hh: '#e4cfa0', h: '#c4a878', b: '#a08458', d: '#7a6040' })));
    if (o.variante === 0) { D(16, 33, 14, 7, 7); D(36, 37, 10, 6, 5); K(29, 30, 11, 3, true); S(10, 37, 2); }
    else if (o.variante === 1) { D(24, 30, 18, 10, 9); K(13, 36, 9, 1, false); K(37, 34, 12, 3, false); }
    else if (o.variante === 2) { D(30, 31, 16, 8, 8); S(14, 31, 3); S(19, 33, 1); K(37, 38, 8, 2, true); }
    else { D(12, 29, 10, 6, 6); D(30, 36, 16, 9, 7); K(24, 27, 10, 3, false); S(40, 31, 2); K(10, 37, 7, 1, false); }
    szene(p, T);
    for (const [x, y] of streu(r, 5)) if (!p.hole(x, y)) steinchen(p, x, y);
  },
});

// ---------- Tundra ----------
const MOOS = ['#5e6a4c', '#76835e', '#909c74'];
function moos(p, x, y, w, r) { for (let i = 0; i < w * 3; i++) { const xx = x + Math.round((r() - 0.5) * w * 2), yy = y + Math.round((r() - 0.5) * w * 0.7); p.px(xx, yy, MOOS[Math.floor(r() * 3)]); } }
function zwergbusch(p, x, y, c) {
  p.ellipse(x, y - 1.5, 3, 1.8, dunkel(c, 0.3)); p.ellipse(x - 0.5, y - 2, 2.3, 1.2, c);
  p.px(x - 2, y - 3, hell(c, 0.3)).px(x, y - 3, hell(c, 0.3)).px(x + 1, y - 2, dunkel(c, 0.15)).px(x - 1, y - 1, '#c04a3a');
}
definiere('deko', 'tundra', {
  w: 48, h: 40, varianten: 4, umriss: false,
  zeichne(p, o) {
    const r = saat('tundra', o.variante), T = [];
    const FL = { hh: '#c8c8b8', h: '#a4a496', b: '#86867a', d: '#5e5e56' };
    const S = (x, y, s) => T.push(O(y + 0.5, (q) => { fels(q, x, y, s, FL); q.px(x - 1, y - 1, '#c8b040').px(x, y - 1, '#a8a040'); }));
    const Z = (x, y, c) => T.push(O(y, (q) => zwergbusch(q, x, y, c)));
    const N = (x, y, h) => T.push(O(y, (q) => nadelbaum(q, x, y, h, { h: '#4a7a52', b: '#3a6244', d: '#2c4c36', dd: '#20382a' })));
    const M = (x, y, w) => T.push(F((q) => moos(q, x, y, w, r)));
    if (o.variante === 0) { M(14, 32, 6); M(32, 26, 5); S(30, 34, 3); S(14, 28, 1); Z(20, 36, '#8a5a3a'); Z(37, 29, '#6a7a4a'); }
    else if (o.variante === 1) { M(24, 32, 8); N(16, 29, 9); S(33, 31, 2); Z(9, 35, '#9a4a3a'); Z(38, 37, '#8a5a3a'); }
    else if (o.variante === 2) { M(10, 33, 5); M(36, 34, 6); S(20, 31, 2); S(25, 33, 3); S(39, 27, 1); Z(13, 27, '#6a7a4a'); }
    else { M(22, 28, 7); M(28, 36, 6); Z(12, 31, '#8a5a3a'); Z(30, 31, '#9a4a3a'); Z(40, 35, '#6a7a4a'); S(18, 37, 1); N(34, 26, 8); }
    for (const [x, y] of streu(r, 8)) T.push(F((q) => gras(q, x, y, '#b0b88e', '#6a7458', Math.floor(r() * 3))));
    szene(p, T);
  },
});

// ---------- Schnee ----------
const SCHNEE = ['#b4c4d6', '#d4dfea', '#eef3f8', '#ffffff'];
const EIS = { hh: '#ffffff', h: '#d8f2fc', b: '#a6d6ec', d: '#6fa6c8' };
function eisbrocken(p, x, y, s) {
  const w = 2 + s, h = 3 + s * 2;
  p.poly([[x - w, y], [x - w + 1, y - h * 0.6], [x - 0.5, y - h], [x + w * 0.6, y - h * 0.7], [x + w, y]], EIS.d);
  p.poly([[x - w, y], [x - w + 1, y - h * 0.6], [x - 0.5, y - h], [x, y - 1]], EIS.b);
  p.linie(x - w + 1, y - h * 0.6, x - 0.5, y - h, EIS.hh);
  p.linie(x - 0.5, y - h + 1, x - 0.5, y - 1, EIS.h);
  p.px(x + 1, y - h * 0.5, EIS.b);
}
definiere('deko', 'schnee', {
  w: 48, h: 40, varianten: 4, umriss: false,
  zeichne(p, o) {
    const r = saat('schnee', o.variante), T = [];
    const W = (cx, by, rl, rr, hh) => T.push(O(by - 2, (q) => kuppe(q, cx, by, rl, rr, hh, SCHNEE, { form: 0.7 }), '#8a9cb4', by));
    const E = (x, y, s) => T.push(O(y + 0.5, (q) => eisbrocken(q, x, y, s)));
    if (o.variante === 0) { W(16, 33, 12, 9, 6); W(34, 37, 9, 8, 4); E(30, 31, 2); E(34, 32, 0); }
    else if (o.variante === 1) { W(25, 31, 16, 14, 8); E(12, 37, 1); E(39, 36, 1); }
    else if (o.variante === 2) { E(16, 30, 3); E(21, 31, 1); E(32, 35, 2); W(10, 37, 7, 6, 3); W(38, 29, 7, 6, 3); }
    else { W(14, 29, 10, 8, 5); W(30, 34, 13, 10, 6); E(38, 38, 1); E(9, 37, 0); }
    szene(p, T);
    for (const [x, y] of streu(r, 8)) if (!p.hole(x, y)) p.px(x, y, '#c8d6e4').px(x + 1, y, '#ffffff');
  },
});

// ---------- Sumpf ----------
function lache(p, x, y, rx, ry) {
  p.ellipse(x, y, rx + 1, ry + 0.6, '#46603f');
  p.ellipse(x, y, rx, ry, '#36584e');
  p.ellipse(x + 0.5, y + 0.3, rx - 1, ry - 0.8, '#3e6a62');
  p.linie(x - rx * 0.5, y - ry * 0.3, x - rx * 0.1, y - ry * 0.3, '#7aa8a0');
  p.px(x + rx * 0.3, y + ry * 0.2, '#7aa8a0');
}
function seerose(p, x, y) { p.px(x, y, '#5a9a48').px(x + 1, y, '#5a9a48').px(x - 1, y, '#3f7a38').px(x, y - 1, '#f4d0e0'); }
function schilf(p, x, y, n, r) {
  for (let i = 0; i < n; i++) {
    const xx = x + i * 2 - n, h = 6 + Math.floor(r() * 5), kn = (i % 3 === 1) ? 1 : 0;
    p.linie(xx, y, xx + kn, y - h, i & 1 ? '#5f7a30' : '#8aa848');
    p.px(xx, y, '#3e5228');
    if (i % 2 === 0) { p.rect(xx + kn, y - h + 1, 1, 3, '#6a3e1e'); p.px(xx + kn, y - h + 1, '#8a5a30'); p.px(xx + kn, y - h, '#a8c060'); }
    else { p.px(xx + 1, y - 3, '#a8c060'); p.px(xx + 2, y - 4, '#a8c060'); }
  }
}
function toterbaum(p, x, y) {
  p.linie(x, y, x, y - 9, '#5a4a3a').linie(x + 1, y, x + 1, y - 7, '#3e3228');
  p.linie(x, y - 6, x - 3, y - 9, '#5a4a3a').linie(x + 1, y - 5, x + 4, y - 8, '#3e3228').linie(x - 3, y - 9, x - 3, y - 11, '#5a4a3a').linie(x, y - 9, x + 1, y - 12, '#5a4a3a');
}
definiere('deko', 'sumpf', {
  w: 48, h: 40, varianten: 4, umriss: false,
  zeichne(p, o) {
    const r = saat('sumpf', o.variante), T = [];
    const W = (x, y, rx, ry) => T.push(F((q) => lache(q, x, y, rx, ry)));
    const S = (x, y, n) => T.push(O(y, (q) => schilf(q, x, y, n, r), null));
    const R = (x, y) => T.push(F((q) => seerose(q, x, y)));
    if (o.variante === 0) { W(18, 31, 8, 3); W(34, 36, 6, 2); S(10, 30, 4); S(27, 35, 3); S(40, 33, 3); R(16, 31); }
    else if (o.variante === 1) { W(24, 34, 12, 4); S(12, 34, 3); S(35, 31, 4); R(21, 35); R(28, 33); T.push(O(26, (q) => toterbaum(q, 22, 26))); }
    else if (o.variante === 2) { W(13, 28, 6, 2); W(30, 30, 7, 2); W(20, 37, 6, 2); S(22, 30, 3); S(39, 37, 3); S(8, 36, 3); T.push(O(33, (q) => busch(q, 32, 34, 2, LAUB))); }
    else { W(28, 30, 9, 3); W(12, 36, 7, 2); S(18, 29, 5); S(36, 37, 4); R(30, 29); R(13, 36); T.push(O(38, (q) => toterbaum(q, 42, 30))); }
    for (const [x, y] of streu(r, 8)) T.push(F((q) => { if (!q.hole(x, y)) gras(q, x, y, '#8aa86a', '#46603f', Math.floor(r() * 3)); }));
    szene(p, T);
  },
});

// ---------- Grasland (dezent, flach) ----------
definiere('deko', 'grasland', {
  w: 48, h: 40, varianten: 4, umriss: false,
  zeichne(p, o) {
    const r = saat('grasland', o.variante);
    const blumen = [['#f4d03f', '#ffffff', '#e8e060'], ['#ffffff', '#f4a0c0', '#f4d03f'], ['#e86a6a', '#ffffff', '#f4d03f'], ['#a0a0f0', '#f4d03f', '#ffffff']][o.variante];
    for (const [x, y] of streu(r, 9 + o.variante * 2)) gras(p, x, y, '#86c46a', '#4f8a3c', Math.floor(r() * 3));
    const nb = [5, 8, 4, 10][o.variante];
    for (const [x, y] of streu(r, nb, 3)) {
      const c = blumen[Math.floor(r() * 3)];
      p.px(x, y, '#3f7a30').px(x, y - 1, c);
      if (r() < 0.5) p.px(x - 1, y - 1, c).px(x + 1, y - 1, c).px(x, y - 2, c).px(x, y - 1, '#f0c020');
    }
    if (o.variante === 2) { p.ellipse(32, 31, 2.5, 1.2, '#4f8a3c'); p.ellipse(31.5, 30.5, 2, 0.8, '#6aa84f'); p.px(31, 30, '#90d070'); }
    if (o.variante === 3) for (const [x, y] of streu(r, 3, 4)) { p.px(x, y, '#9a948a').px(x + 1, y, '#7a756c').px(x, y - 1, '#c4beb2'); }
  },
});

// ---------- Ebene (dezent, flach) ----------
definiere('deko', 'ebene', {
  w: 48, h: 40, varianten: 4, umriss: false,
  zeichne(p, o) {
    const r = saat('ebene', o.variante);
    for (const [x, y] of streu(r, 12 + o.variante)) gras(p, x, y, r() < 0.5 ? '#d4cf7a' : '#c8c068', '#8a8c42', Math.floor(r() * 3));
    const bue = [[[12, 30], [34, 35]], [[24, 29]], [[10, 35], [30, 27], [38, 36]], [[18, 34], [33, 30]]][o.variante];
    for (const [x, y] of bue) {
      p.ellipse(x + 1.5, y + 0.5, 3, 1, '#8a943e');
      p.ellipse(x, y - 1, 2.5, 1.6, '#5a6a2c'); p.ellipse(x - 0.5, y - 1.5, 2, 1.1, '#788a38'); p.px(x - 1, y - 2, '#9cac4e');
      if (o.variante === 1) p.px(x + 1, y - 2, '#c04040').px(x - 2, y - 1, '#c04040');
    }
    if (o.variante === 3) for (const [x, y] of streu(r, 3, 4)) p.px(x, y, '#9a8466').px(x + 1, y, '#7a6650').px(x, y - 1, '#c4b08a');
  },
});

// ---------- Oase ----------
const OPALM = { st: '#8a6a40', stD: '#5e4428', b: '#2e9a48', d: '#1d6e32', h: '#62c470' };
function teich(p, x, y, rx, ry) {
  p.ellipse(x, y + 0.5, rx + 2, ry + 1.2, '#7aa848');
  p.ellipse(x, y, rx + 1, ry + 0.5, '#c4b072');
  p.ellipse(x, y, rx, ry, '#3a8fc0');
  p.ellipse(x + 0.6, y + 0.4, rx - 1.2, ry - 0.8, '#4fa3c9');
  p.linie(x - rx * 0.5, y - ry * 0.4, x - rx * 0.1, y - ry * 0.4, '#a8dcf0');
  p.px(x + rx * 0.35, y + ry * 0.2, '#a8dcf0').px(x + rx * 0.35 + 1, y + ry * 0.2, '#a8dcf0');
}
definiere('deko', 'oase', {
  w: 48, h: 40, varianten: 4, umriss: false,
  zeichne(p, o) {
    const r = saat('oase', o.variante), T = [];
    const P = (x, y, h, l) => T.push(O(y, (q) => palme(q, x, y, h, l, OPALM)));
    const W = (x, y, rx, ry) => T.push(F((q) => teich(q, x, y, rx, ry)));
    const G = (x, y) => T.push(O(y, (q) => busch(q, x, y, 1.6, { d: '#3a7a30', b: '#5aa04a', h: '#8ac86a' })));
    if (o.variante === 0) { W(26, 33, 9, 3); P(13, 30, 12, -2); P(36, 29, 11, 2); G(20, 37); }
    else if (o.variante === 1) { W(20, 31, 8, 3); P(32, 34, 14, 2); P(37, 28, 9, 1); P(10, 36, 10, -1); }
    else if (o.variante === 2) { W(28, 35, 10, 3); P(17, 28, 13, -1); P(25, 26, 10, 2); G(39, 33); G(12, 36); }
    else { W(23, 30, 7, 2); P(14, 36, 12, -2); P(33, 37, 13, 1); P(37, 26, 9, 2); G(29, 27); }
    szene(p, T);
  },
});

// ---------- Vulkan ----------
const VULK = { hh: '#8c7872', h: '#6e5c56', b: '#56463f', d: '#3e322f', dd: '#2a201e', s: '#6e5c56', sd: '#3e322f' };
function vulkan(p, cx, by, w, h, r, lav) {
  const tops = berg(p, cx, by, w, h, VULK, r, { krater: 4, schnee: 0, grat: 0.1 });
  const ky = by - h;
  p.ellipse(cx, ky + 0.5, 4.5, 1.6, '#2a1612');
  p.ellipse(cx, ky + 0.7, 3.5, 1.0, '#c83a10');
  p.ellipse(cx - 0.3, ky + 0.6, 2.4, 0.6, '#ff8a20');
  p.px(cx - 1, ky + 0.5, '#ffe080').px(cx, ky + 0.5, '#ffd040');
  for (const [sx, dir, len] of lav) {
    let x = cx + sx, y = ky + 2;
    for (let i = 0; i < len; i++) {
      x += dir * (i % 3 === 0 ? 1 : 0) + (i % 5 === 2 ? -dir * 0.5 : 0); y += 1;
      if (y > by - 1) break;
      const glut = i < len * 0.7;
      p.px(x, y, glut ? '#e8501a' : '#8a2a10'); p.px(x + 1, y, glut ? (i % 2 ? '#ffb030' : '#ff7a20') : '#5a2010');
      if (i > 2 && i % 4 === 0) p.px(x + 2, y, '#c83a10');
    }
  }
  return tops;
}
function rauch(p, x, y, r, n) {
  for (let i = 0; i < n; i++) {
    const xx = x + i * 1.6 + Math.round(r() * 2 - 1), yy = y - i * 2.2, rr = 1.4 + i * 0.5;
    p.ellipse(xx, yy, rr, rr * 0.8, '#5e5654');
    p.ellipse(xx - 0.5, yy - 0.5, rr - 0.6, rr * 0.8 - 0.6, '#857c78');
    p.px(xx - rr * 0.5, yy - rr * 0.5, '#a49a96');
  }
}
definiere('deko', 'vulkan', {
  w: 48, h: 40, varianten: 4, umriss: false,
  zeichne(p, o) {
    const r = saat('vulkan', o.variante), T = [];
    const v = o.variante;
    if (v === 1) T.push(O(30, (q) => berg(q, 38, 33, 16, 12, VULK, r, { schnee: 0 })));
    if (v === 3) T.push(O(30, (q) => berg(q, 10, 34, 16, 10, VULK, r, { schnee: 0 })));
    const cx = [24, 21, 25, 27][v], h = [28, 26, 30, 27][v];
    const lav = [[[-2, -1, 18], [2, 1, 22]], [[0, 1, 20], [-3, -1, 12]], [[-1, -1, 24], [2, 1, 14], [0, 0, 10]], [[1, 1, 20]]][v];
    T.push(O(38, (q) => vulkan(q, cx, 38, 40, h, r, lav)));
    T.push(O(40, (q) => rauch(q, cx, 38 - h - 3, r, [3, 4, 2, 4][v])));
    szene(p, T);
    // glühende Brocken
    for (const [x, y] of streu(r, 3, 4, 30)) if (p.hole(x, y)) p.px(x, y, '#ff7a20');
  },
});

// ---------- Korallenriff (flach, unter Wasser) ----------
function koralle(p, x, y, art, c) {
  const d = dunkel(c, 0.35), h = hell(c, 0.35);
  p.ellipse(x + 1, y + 0.5, 4, 1.3, '#329aae');
  if (art === 0) { // Geweihkoralle
    p.linie(x, y, x, y - 5, d).linie(x + 1, y, x + 1, y - 3, d);
    p.linie(x, y - 2, x - 3, y - 5, c).linie(x - 3, y - 5, x - 3, y - 7, h);
    p.linie(x + 1, y - 3, x + 3, y - 6, c).linie(x + 3, y - 6, x + 4, y - 8, h);
    p.linie(x, y - 5, x - 1, y - 8, h).px(x - 1, y - 9, hell(c, 0.6)).px(x + 4, y - 9, hell(c, 0.6)).px(x - 3, y - 8, hell(c, 0.6));
  } else if (art === 1) { // Hirnkoralle
    p.ellipse(x, y - 2, 3.5, 2.4, d); p.ellipse(x - 0.5, y - 2.6, 2.8, 1.7, c);
    p.linie(x - 2, y - 2, x + 1, y - 3, d).linie(x - 1, y - 1, x + 2, y - 2, d);
    p.px(x - 2, y - 4, h).px(x - 1, y - 4, h).px(x - 3, y - 3, h);
  } else if (art === 2) { // Fächerkoralle
    for (let i = -4; i <= 4; i++) p.linie(x, y, x + i, y - 6 + Math.abs(i) * 0.6, i < -1 ? h : (i > 1 ? d : c));
    for (let i = -3; i <= 3; i += 2) p.px(x + i, y - 4 + Math.abs(i) * 0.4, hell(c, 0.6));
    p.px(x, y, d);
  } else { // Röhrenkoralle
    for (const [dx, hh] of [[-2, 4], [0, 6], [2, 5], [1, 3]]) { p.rect(x + dx, y - hh, 1, hh + 1, dx > 0 ? d : c); p.px(x + dx, y - hh, h); p.px(x + dx, y - hh - 1, '#ffe8a0'); }
  }
}
definiere('deko', 'korallenriff', {
  w: 48, h: 40, varianten: 4, umriss: false,
  zeichne(p, o) {
    const r = saat('korallenriff', o.variante);
    const farben = ['#f0607a', '#ff8a3a', '#b05ae0', '#f8d040', '#ff9ac0', '#40d8a0'];
    // Sandflecken und tiefe Stellen
    for (const [x, y] of streu(r, 2 + (o.variante & 1), 8, 20, 34)) { p.ellipse(x, y, 5, 1.8, '#78cdd0'); p.ellipse(x - 0.5, y - 0.4, 3.5, 1.1, '#96dad6'); }
    for (const [x, y] of streu(r, 2, 8, 20, 36)) p.ellipse(x, y, 4, 1.4, '#3ea4ba');
    const n = [6, 8, 5, 8][o.variante];
    const pos = streu(r, n, 5, 19, 37).sort((a, b) => a[1] - b[1]);
    pos.forEach(([x, y], i) => koralle(p, x, y, (i + o.variante) % 4, farben[(i * 2 + o.variante) % farben.length]));
    // Seegras und Lichtkringel
    for (const [x, y] of streu(r, 3, 4, 18, 37)) { p.linie(x, y, x, y - 4, '#2a8a68'); p.px(x + 1, y - 2, '#3aa878').px(x - 1, y - 4, '#4fc088').px(x - 1, y - 5, '#4fc088'); }
    for (const [x, y] of streu(r, 6, 3, 14, 38)) if (!p.hole(x, y)) p.px(x, y, '#9ae8f0').px(x + 1, y, '#c8f4f8');
    // kleiner Fisch
    const fx = [34, 12, 30, 20][o.variante], fy = [25, 28, 33, 24][o.variante];
    p.px(fx, fy, '#f0a020').px(fx + 1, fy, '#f8c040').px(fx + 2, fy, '#ffffff').px(fx - 1, fy - 1, '#f0a020').px(fx - 1, fy + 1, '#f0a020').px(fx + 1, fy - 1, '#d08010');
  },
});

// ---------- Mangroven ----------
const MANG = { d: '#1f5a3a', b: '#2f7a4c', h: '#479a5e', hh: '#6cbc7a' };
function mangrove(p, x, y, s, r) {
  const ry = y - 4;
  for (const dx of [-3, -1.5, 1.5, 3]) { p.linie(x + 0.5, ry, x + dx, y - (Math.abs(dx) > 2 ? 0 : 1), '#5a3e28'); }
  p.linie(x - 4, y, x - 3, y - 2, '#6a4a30'); p.linie(x + 4, y, x + 3, y - 2, '#46301c');
  stamm(p, x, ry, 4, '#6a4a30', '#46301c');
  laubbaum(p, x, ry - 2, s, MANG, r);
}
function flachwasser(p, x, y, rx, ry) { p.ellipse(x, y, rx, ry, '#3f8a8a'); p.ellipse(x + 0.5, y + 0.3, rx - 1, ry - 0.6, '#4a9a9a'); p.linie(x - rx * 0.6, y, x - rx * 0.2, y, '#88c8c0'); p.linie(x + rx * 0.2, y + 1, x + rx * 0.5, y + 1, '#88c8c0'); }
definiere('deko', 'mangroven', {
  w: 48, h: 40, varianten: 4, umriss: false,
  zeichne(p, o) {
    const r = saat('mangroven', o.variante), T = [];
    const W = (x, y, rx, ry) => T.push(F((q) => flachwasser(q, x, y, rx, ry)));
    const M = (x, y, s) => T.push(O(y, (q) => mangrove(q, x, y, s, r)));
    if (o.variante === 0) { W(24, 33, 18, 5); M(14, 31, 1); M(32, 29, 2); M(25, 38, 1); }
    else if (o.variante === 1) { W(20, 32, 14, 4); W(36, 37, 8, 2); M(12, 33, 2); M(28, 30, 1); M(37, 37, 0); }
    else if (o.variante === 2) { W(24, 35, 19, 4); M(19, 28, 2); M(34, 34, 2); M(9, 37, 0); }
    else { W(22, 31, 13, 4); W(30, 37, 12, 2); M(10, 30, 0); M(22, 30, 1); M(35, 30, 1); M(16, 38, 1); M(30, 38, 0); }
    szene(p, T);
  },
});

// ---------- Salzebene (flach) ----------
definiere('deko', 'salzebene', {
  w: 48, h: 40, varianten: 4, umriss: false,
  zeichne(p, o) {
    const r = saat('salzebene', o.variante);
    // Risse: Polygonnetz aus Waben
    const riss = '#d6d0c0', rissD = '#c2baa6';
    const versatz = o.variante * 3;
    for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) {
      const cx = col * 12 + (row & 1) * 6 - 2 + versatz % 12, cy = 14 + row * 6 + (o.variante % 2);
      const pts = [[cx - 6, cy], [cx - 3, cy - 3], [cx + 3, cy - 3], [cx + 6, cy], [cx + 3, cy + 3], [cx - 3, cy + 3]].map(([a, b]) => [a + Math.round(r() - 0.5), b]);
      for (let i = 0; i < 6; i++) {
        const [a, b] = pts[i], [c, d] = pts[(i + 1) % 6];
        if (r() < 0.25 + o.variante * 0.08) continue;
        for (let t = 0; t <= 1; t += 0.12) { const x = Math.round(a + (c - a) * t), y = Math.round(b + (d - b) * t); if (imHex(x, y, 3)) p.px(x, y, t > 0.5 ? rissD : riss); }
      }
      if (imHex(cx, cy, 4) && r() < 0.35) { p.px(cx - 1, cy - 1, '#ffffff').px(cx, cy - 1, '#ffffff').px(cx - 1, cy, '#fbfaf4'); }
    }
    // Kristallkrusten
    const n = [4, 6, 3, 7][o.variante];
    for (const [x, y] of streu(r, n, 5, 17, 36)) {
      p.px(x, y, '#d8d2c0').px(x + 1, y, '#c4bca6').px(x, y - 1, '#ffffff').px(x - 1, y, '#ffffff').px(x, y - 2, '#ffffff');
      if (r() < 0.5) p.px(x + 2, y - 1, '#ffffff').px(x + 2, y, '#d8d2c0');
    }
    if (o.variante === 2) { p.ellipse(28, 31, 6, 2, '#d6e4e8'); p.ellipse(28, 31, 4, 1, '#e8f2f4'); p.px(26, 30, '#ffffff'); }
  },
});

// ---------- Kristallgebirge ----------
const KBERG = { hh: '#c6c8e2', h: '#a2a6c8', b: '#8a8eb0', d: '#666a8e', dd: '#4a4d6c', s: '#eef0ff', sd: '#b6bad8' };
const LILA = { hh: '#ffe8ff', h: '#e0a8ff', b: '#b060e8', d: '#7a34b0' };
const TUERKIS = { hh: '#e8fffc', h: '#9af4ea', b: '#36d0c4', d: '#1a8a8c' };
function kristall(p, x, y, h, T, neig = 0) {
  for (let i = 0; i < h; i++) {
    const xx = x + Math.round(neig * i / h), yy = y - i;
    const spitze = i >= h - 2;
    if (!spitze) { p.px(xx - 1, yy, T.h); p.px(xx, yy, T.b); p.px(xx + 1, yy, T.d); }
    else if (i === h - 2) { p.px(xx - 1, yy, T.h); p.px(xx, yy, T.h); p.px(xx + 1, yy, T.b); }
    else p.px(xx, yy, T.hh);
  }
  p.px(x - 1, y - Math.floor(h / 2), T.hh);
}
function glimmer(p, x, y, c) { p.px(x, y, c).px(x - 1, y, mische(c, '#ffffff', 0.5)).px(x + 1, y, mische(c, '#ffffff', 0.5)).px(x, y - 1, mische(c, '#ffffff', 0.5)).px(x, y + 1, mische(c, '#ffffff', 0.5)); }
definiere('deko', 'kristallgebirge', {
  w: 48, h: 40, varianten: 4, umriss: false,
  zeichne(p, o) {
    const r = saat('kristallgebirge', o.variante), T = [];
    const B = (cx, by, w, h, opt = {}) => T.push(O(by, (q) => berg(q, cx, by, w, h, KBERG, r, { schnee: 0.2, ...opt })));
    const K = (x, y, h, T2, n = 0) => T.push(O(y + 0.6, (q) => kristall(q, x, y, h, T2, n)));
    const v = o.variante;
    if (v === 0) { B(15, 33, 22, 22); B(30, 37, 34, 33, { versatz: 1 }); K(17, 36, 8, LILA, -1); K(20, 37, 5, TUERKIS, 1); K(37, 37, 7, TUERKIS); K(40, 37, 4, LILA, 1); }
    else if (v === 1) { B(24, 37, 38, 34); K(11, 36, 6, TUERKIS, -1); K(28, 30, 6, LILA); K(31, 31, 4, LILA, 1); K(33, 37, 9, TUERKIS, 1); K(30, 38, 5, LILA, -1); }
    else if (v === 2) { B(32, 33, 24, 26, { versatz: 2 }); B(16, 37, 28, 30, { versatz: -2 }); K(25, 37, 10, LILA); K(28, 38, 6, LILA, 2); K(22, 38, 5, TUERKIS, -2); K(40, 35, 5, TUERKIS); }
    else { B(20, 36, 30, 32, { versatz: 1 }); B(37, 37, 18, 18); K(14, 37, 7, LILA, -2); K(17, 37, 9, TUERKIS); K(32, 38, 7, LILA, 1); K(24, 28, 5, TUERKIS); }
    szene(p, T);
    const g = [[[19, 27, '#f0c8ff'], [36, 28, '#c8fff8']], [[22, 25, '#f0c8ff'], [14, 30, '#c8fff8']], [[24, 26, '#f0c8ff'], [41, 30, '#c8fff8']], [[19, 26, '#c8fff8'], [36, 31, '#f0c8ff']]][v];
    for (const [x, y, c] of g) glimmer(p, x, y, c);
  },
});

// ---------- Irrlichtmoor ----------
function moorbecken(p, x, y, rx, ry) {
  p.ellipse(x, y, rx + 1, ry + 0.7, '#38463f');
  p.ellipse(x, y, rx, ry, '#1c2826');
  p.ellipse(x + 0.6, y + 0.3, rx - 1.4, ry - 0.8, '#223432');
  p.linie(x - rx * 0.5, y - ry * 0.3, x - rx * 0.15, y - ry * 0.3, '#4a7a70');
}
function irrlicht(p, x, y, c) {
  const k = mische(c, '#ffffff', 0.6);
  p.px(x, y, k).px(x - 1, y, c).px(x + 1, y, c).px(x, y - 1, c).px(x, y + 1, c).px(x, y - 2, mische(c, '#4c5e58', 0.5));
}
function nebel(p, x, y, w, r) {
  for (let i = 0; i < w; i++) for (let j = 0; j < 2; j++) if (((x + i + j * 2 + y) % 3 === 0 || (j === 0 && (x + i) % 2 === 0)) && r() < 0.8) p.px(x + i, y + j, j ? '#7a908a' : '#94aaa2');
}
definiere('deko', 'irrlichtmoor', {
  w: 48, h: 40, varianten: 4, umriss: false,
  zeichne(p, o) {
    const r = saat('irrlichtmoor', o.variante), T = [];
    const W = (x, y, rx, ry) => T.push(F((q) => moorbecken(q, x, y, rx, ry)));
    const FL = { hh: '#8a9890', h: '#6e7c74', b: '#56625c', d: '#3c4640' };
    const S = (x, y, s) => T.push(O(y + 0.5, (q) => { fels(q, x, y, s, FL); q.px(x - 1, y - 1, '#5a7a4a'); }));
    const Sc = (x, y, n) => T.push(O(y, (q) => { schilf(q, x, y, n, r); for (let i = 0; i < q.feld.length; i++) if (q.feld[i] === '#8aa848' || q.feld[i] === '#a8c060') q.feld[i] = '#8a9a68'; else if (q.feld[i] === '#5f7a30') q.feld[i] = '#5a6a44'; }, null));
    const v = o.variante;
    if (v === 0) { W(17, 31, 8, 3); W(33, 36, 7, 2); S(31, 30, 2); Sc(9, 36, 3); T.push(O(26, (q) => toterbaum(q, 38, 28))); }
    else if (v === 1) { W(24, 33, 13, 4); S(12, 28, 1); S(36, 27, 2); Sc(39, 37, 3); Sc(15, 37, 2); }
    else if (v === 2) { W(13, 29, 6, 2); W(28, 30, 7, 2); W(22, 37, 8, 2); S(39, 33, 3); T.push(O(26, (q) => toterbaum(q, 8, 33))); }
    else { W(30, 30, 9, 3); W(12, 36, 7, 2); S(20, 28, 2); S(24, 37, 1); Sc(40, 37, 3); Sc(8, 29, 2); }
    szene(p, T);
    for (const [x, y, w] of [[[5, 33, 16], [26, 25, 14]], [[8, 31, 20], [28, 38, 12]], [[18, 33, 18], [2, 27, 10]], [[22, 33, 18], [6, 39, 12]]][v]) nebel(p, x, y, w, r);
    const l = [[[20, 24, '#a0ffd0'], [35, 27, '#e8ff90'], [12, 27, '#a0ffd0']], [[27, 25, '#a0ffd0'], [19, 22, '#e8ff90']], [[17, 23, '#a0ffd0'], [31, 24, '#e8ff90'], [24, 31, '#a0ffd0']], [[33, 23, '#e8ff90'], [14, 30, '#a0ffd0']]][v];
    for (const [x, y, c] of l) irrlicht(p, x, y, c);
  },
});

// ---------- Pilzwald ----------
const PILZ = [
  { b: '#9a5ac8', d: '#6a3a94', h: '#c08ae8', hh: '#e4c4ff', p: '#f0d8ff' },
  { b: '#c8403a', d: '#8a2a26', h: '#e8706a', hh: '#ffb0a0', p: '#ffffff' },
  { b: '#2ab0a4', d: '#1a7a74', h: '#5ad8c8', hh: '#b0fff0', p: '#e0fff8' },
];
function riesenpilz(p, x, y, s, T) {
  const sh = 5 + s * 2, hw = 3 + s * 1.5, hh = 2 + s * 0.7;
  // Stiel
  p.rect(x - 1, y - sh, 3, sh + 1, '#e4d8c4'); p.rect(x - 1, y - sh, 1, sh + 1, '#f4ecdc'); p.rect(x + 1, y - sh, 1, sh + 1, '#b4a690');
  p.px(x - 2, y, '#c4b6a0').px(x + 2, y, '#b4a690');
  if (s > 0) p.rect(x - 2, y - Math.round(sh * 0.6), 5, 1, '#d4c8b2');
  // Hut
  const cy = y - sh;
  p.ellipse(x + 0.5, cy, hw + 0.5, 1, '#4a3a5a');
  p.ellipse(x + 0.5, cy - 1, hw + 0.5, hh, T.d);
  p.ellipse(x, cy - 1.6, hw, hh - 0.4, T.b);
  p.ellipse(x - hw * 0.35, cy - 1.4 - hh * 0.4, hw * 0.4, hh * 0.35, T.h);
  // Punkte
  const pts = [[-hw * 0.5, -hh * 0.5], [hw * 0.3, -hh * 0.9], [hw * 0.6, -hh * 0.2], [-hw * 0.1, -hh * 1.2]];
  for (const [dx, dy] of pts.slice(0, 2 + s)) p.px(x + dx, cy - 1 + dy, T.p);
  p.px(x - hw * 0.3, cy - 1 - hh * 0.9, T.hh);
}
function minipilz(p, x, y, T) { p.px(x, y, '#e4d8c4').px(x, y - 1, '#e4d8c4').px(x - 1, y - 2, T.b).px(x, y - 2, T.h).px(x + 1, y - 2, T.d); }
definiere('deko', 'pilzwald', {
  w: 48, h: 40, varianten: 4, umriss: false,
  zeichne(p, o) {
    const r = saat('pilzwald', o.variante), T = [];
    const P = (x, y, s, f) => { T.push(F((q) => q.ellipse(x + 2, y + 0.3, 3 + s * 1.5, 1, '#5a4874'))); T.push(O(y, (q) => riesenpilz(q, x, y, s, PILZ[f]))); };
    const M = (x, y, f) => T.push(O(y, (q) => minipilz(q, x, y, PILZ[f])));
    const v = o.variante;
    if (v === 0) { P(15, 28, 2, 0); P(32, 30, 1, 1); P(24, 37, 1, 2); M(8, 35, 1); M(40, 36, 0); M(35, 37, 2); }
    else if (v === 1) { P(24, 31, 3, 1); P(10, 35, 0, 2); P(38, 36, 0, 0); M(17, 37, 0); M(31, 37, 2); }
    else if (v === 2) { P(12, 30, 1, 2); P(26, 26, 2, 0); P(36, 34, 2, 2); P(18, 38, 0, 1); M(29, 37, 1); M(8, 37, 0); }
    else { P(30, 27, 2, 2); P(14, 33, 2, 1); P(36, 38, 0, 0); M(23, 36, 0); M(26, 37, 2); M(9, 38, 1); M(41, 31, 1); }
    for (const [x, y] of streu(r, 6)) T.push(F((q) => { q.px(x, y, '#9a7ac0'); q.px(x + 1, y - 1, '#8a6ab0'); }));
    szene(p, T);
    for (const [x, y] of streu(r, 4, 3, 12, 34)) if (!p.hole(x, y)) p.px(x, y, '#c8ffe8');
  },
});

// ---------- Barbarenlager ----------
function zelt(p, x, y, w, h, T) {
  p.poly([[x - w, y], [x, y - h], [x + w * 0.35, y]], T.h);
  p.poly([[x, y - h], [x + w * 0.35, y], [x + w, y - 1], [x + w * 0.7, y - h * 0.4]], T.d);
  p.linie(x, y - h, x + w * 0.35, y, T.b);
  p.poly([[x - w * 0.35, y], [x - w * 0.1, y - h * 0.55], [x + w * 0.05, y]], '#2a1a10');
  p.linie(x - w * 0.6, y - h * 0.4 + 1, x - w * 0.25, y - h * 0.4 - 0, T.streifen);
  p.linie(x - w * 0.75, y - h * 0.25 + 1, x - w * 0.5, y - h * 0.25, T.streifen);
  p.linie(x - 1, y - h - 2, x + 1, y - h + 1, PAL.holzD).linie(x + 1, y - h - 2, x - 1, y - h + 1, PAL.holz);
}
function lagerfeuer(p, x, y) {
  for (const [a, b] of [[-3, 0], [-2, 1], [0, 1], [2, 1], [3, 0], [-2, -1], [2, -1]]) p.px(x + a, y + b, b === 1 ? '#6a665e' : '#9a958a');
  p.linie(x - 2, y, x + 2, y - 1, PAL.holzD).linie(x - 2, y - 1, x + 2, y, PAL.holz);
  p.karte(x - 2, y - 7, ['..y..', '.yo..', '.ooy.', 'yoWor', 'roWWo', '.rooo'], { y: '#ffd040', o: '#f39c12', W: '#fff4b0', r: '#d0401a' });
}
function schaedelpfahl(p, x, y) {
  p.rect(x, y - 13, 1, 14, PAL.holz).rect(x + 1, y - 13, 1, 14, PAL.holzD);
  p.linie(x - 2, y - 10, x + 3, y - 10, PAL.holzD);
  p.karte(x - 1, y - 17, ['.www.', 'wwwwW', 'wkwkW', '.wwW.', '.k.k.'], { w: '#ece6d4', W: '#c4bca6', k: '#2a201a' });
  p.px(x - 2, y - 9, '#ece6d4').px(x + 3, y - 9, '#c4bca6');
  p.linie(x - 1, y - 6, x + 2, y - 4, '#8a2a20');
}
function fahne(p, x, y, h) {
  p.rect(x, y - h, 1, h + 1, PAL.holzD);
  p.px(x, y - h - 1, PAL.eisenH);
  p.karte(x + 1, y - h, ['rrrrrrrr', 'rkkrrrrkr', 'rrkkkkkr', 'rrrkkrr.', 'rrkrrkr.', 'rrrrr.r.'], { r: '#b02a20', k: '#22201e' });
}
definiere('deko', 'barbarenlager', {
  w: 48, h: 40, umriss: false, varianten: 2,
  zeichne(p, o) {
    const T = [];
    T.push(F((q) => { q.ellipse(24, 32, 19, 6.5, '#8a7a52'); q.ellipse(24, 32, 17, 5.5, '#9a8458'); for (let i = 0; i < 20; i++) q.px(8 + ((i * 13) % 32), 28 + ((i * 7) % 9), '#7a6a46'); }));
    const Z = { h: '#c09a6a', b: '#8a6a48', d: '#7a5a3c', streifen: '#8a2a20' };
    const Z2 = { h: '#a8a088', b: '#78705a', d: '#686050', streifen: '#22201e' };
    if (o.variante === 0) {
      T.push(O(28, (q) => zelt(q, 13, 28, 8, 11, Z)));
      T.push(O(30, (q) => zelt(q, 33, 30, 7, 10, Z2)));
      T.push(O(37, (q) => lagerfeuer(q, 24, 36)));
      T.push(O(36, (q) => schaedelpfahl(q, 9, 37)));
      T.push(O(33, (q) => fahne(q, 39, 36, 16)));
    } else {
      T.push(O(27, (q) => zelt(q, 25, 27, 9, 13, Z)));
      T.push(O(34, (q) => zelt(q, 11, 34, 6, 8, Z2)));
      T.push(O(37, (q) => lagerfeuer(q, 28, 37)));
      T.push(O(35, (q) => schaedelpfahl(q, 39, 36)));
      T.push(O(30, (q) => fahne(q, 7, 30, 15)));
    }
    szene(p, T);
  },
});

// ---------- Ruine ----------
const MAUER = { hh: '#d4cdbd', h: '#b8b0a0', b: '#9a9282', d: '#746c5e', fuge: '#857d6e' };
function mauerstueck(p, x, y, w, hs, d, moosig) {
  // hs: Höhenprofil je Spalte
  for (let i = 0; i < w; i++) {
    const h = hs[i % hs.length];
    for (let j = 0; j < h; j++) {
      let c = (j + (i >> 1)) % 3 === 0 && i % 3 === 1 ? MAUER.fuge : MAUER.b;
      if (j % 3 === 0) c = MAUER.fuge;
      if (j === h - 1) c = MAUER.h;
      p.px(x + i, y - j, c);
    }
  }
  for (let i = 0; i < d; i++) for (let j = 0; j < hs[(w - 1) % hs.length] - Math.ceil(i / 2); j++) p.px(x + w + i, y - j - Math.ceil(i / 2), j % 3 === 0 ? MAUER.d : '#665e52');
  p.px(x, y - hs[0] + 1, MAUER.hh);
  if (moosig) for (let i = 0; i < w; i += 3) p.px(x + i, y - hs[i % hs.length] + 1, '#6a8a40');
}
function saeulenstumpf(p, x, y, h) {
  p.rect(x - 2, y, 5, 1, MAUER.d).rect(x - 1, y - h, 3, h, MAUER.b).rect(x - 1, y - h, 1, h, MAUER.hh).rect(x + 1, y - h, 1, h, MAUER.d);
  p.px(x, y - h, MAUER.h).px(x + 1, y - h - 1, MAUER.b);
}
function truemmer(p, x, y) { p.rect(x, y - 1, 2, 2, MAUER.b).px(x, y - 1, MAUER.h).px(x + 1, y, MAUER.d); p.px(x + 3, y, MAUER.d).px(x + 2, y, MAUER.b); }
definiere('deko', 'ruine', {
  w: 48, h: 40, umriss: false, varianten: 2,
  zeichne(p, o) {
    const T = [];
    if (o.variante === 0) {
      T.push(O(28, (q) => mauerstueck(q, 9, 28, 14, [12, 12, 13, 11, 10, 9, 9, 7, 6, 6, 4, 3, 3, 2], 3, true)));
      T.push(O(25, (q) => mauerstueck(q, 28, 25, 9, [5, 6, 8, 9, 9, 7, 5, 4, 3], 2, false)));
      T.push(O(35, (q) => saeulenstumpf(q, 34, 35, 6)));
      T.push(O(37, (q) => truemmer(q, 18, 36)));
      T.push(O(33, (q) => truemmer(q, 25, 33)));
      T.push(O(38, (q) => truemmer(q, 39, 38)));
    } else {
      // Torbogen-Rest
      T.push(O(30, (q) => { mauerstueck(q, 14, 30, 4, [15, 15, 16, 15], 2, true); mauerstueck(q, 27, 30, 3, [8, 7, 5], 2, false); q.linie(18, 17, 22, 15, MAUER.b).linie(18, 16, 22, 14, MAUER.h).linie(18, 18, 21, 17, MAUER.d); }));
      T.push(O(36, (q) => mauerstueck(q, 31, 36, 8, [4, 5, 5, 4, 3, 3, 2, 2], 2, true)));
      T.push(O(34, (q) => saeulenstumpf(q, 9, 35, 4)));
      T.push(O(37, (q) => truemmer(q, 21, 37)));
      T.push(O(33, (q) => truemmer(q, 37, 28)));
    }
    szene(p, T);
    for (const [x, y] of [[12, 30], [30, 27], [22, 38], [40, 36]]) gras(p, x, y, '#7aa850', '#4a7a30', 0);
  },
});

// ---------- Fallout (flach) ----------
definiere('deko', 'fallout', {
  w: 48, h: 40, umriss: false, varianten: 2,
  zeichne(p, o) {
    const r = saat('fallout', o.variante);
    const cx = o.variante ? 27 : 22, cy = 31;
    p.ellipse(cx, cy, 15, 6, '#5a5a3a');
    p.ellipse(cx, cy, 13, 5, '#46462e');
    p.ellipse(cx, cy + 0.5, 9, 3.5, '#33331f');
    p.ellipse(cx - 0.5, cy - 4, 11, 1.2, '#7a7a4a');
    p.ellipse(cx + 1, cy + 1, 5, 1.6, '#7aa82a'); p.ellipse(cx + 1, cy + 1, 3, 0.8, '#c8f04a'); p.px(cx, cy + 1, '#f0ff9a');
    for (const [x, y] of streu(r, 10, 3, 18, 38)) if (!p.hole(x, y)) p.px(x, y, r() < 0.5 ? '#9ab83a' : '#5a5a3a');
    // giftige Wolke
    const wolke = o.variante ? [[18, 18, 6], [27, 15, 7], [35, 19, 5], [24, 21, 5]] : [[14, 19, 5], [22, 15, 7], [31, 17, 6], [26, 22, 4]];
    for (const [x, y, rr] of wolke) p.ellipse(x + 0.6, y + 0.6, rr, rr * 0.7, '#7a8a2a');
    for (const [x, y, rr] of wolke) p.ellipse(x, y, rr - 0.4, rr * 0.7 - 0.4, '#a8bc3a');
    for (const [x, y, rr] of wolke) p.ellipse(x - rr * 0.3, y - rr * 0.25, rr * 0.5, rr * 0.35, '#d8e868');
    for (const [x, y, rr] of wolke) p.px(x - rr * 0.45, y - rr * 0.4, '#f4ffa8');
    for (let i = 0; i < 25; i++) { const x = 8 + Math.floor(r() * 32), y = 10 + Math.floor(r() * 16); if (!p.hole(x, y)) { if (r() < 0.4) p.px(x, y, '#c8dc58'); } }
  },
});
