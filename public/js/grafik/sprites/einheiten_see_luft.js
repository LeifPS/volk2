// Einheiten-Sprites: Schiffe (Seitenansicht, Bug nach rechts, Wasserlinie y=27) und Luftfahrzeuge/Raketen (schwebend mit Schatten).
// Spielerfarbe über 'S' (Grundton), 'S-' (dunkel), 'S+' (hell): Flaggen, Wimpel, Segelstreifen, Rumpfstreifen, Hoheitszeichen.
import { definiere } from '../sprites.js';
import { PAL, Pinsel, mische, hell, dunkel } from '../pixel.js';

const S = 'S', SD = 'S-', SH = 'S+';
const SCHAUM = '#e8f3f9';
const SEGEL = '#f4efe2', SEGEL_D = '#d4c8aa', SEGEL_H = '#fffdf6';
const SCHWARZ = '#1e1b19';
const OCKER = '#d6a94a', OCKER_D = '#a37a2c';

const HOLZ = { h: PAL.holz, d: PAL.holzD, l: PAL.holzH };
const DHOLZ = { h: '#5f412a', d: '#3d2818', l: '#82603e' };
const SCHWARZRUMPF = { h: '#2f2d2c', d: '#1c1b1a', l: '#4a4744' };
const EISEN = { h: '#4f585f', d: '#353c41', l: '#6f7a82' };
const GRAU = { h: '#8b949a', d: '#636c72', l: '#b0b8bd' };
const DGRAU = { h: '#6e777d', d: '#4e565b', l: '#8f989e' };
const UBOOT = { h: '#3b4348', d: '#262c30', l: '#58626a' };
const TURM = { h: '#56616a', d: '#2c3237', l: '#7d8a94' };
const ATOMUB = { h: '#25282b', d: '#16181a', l: '#3e4246' };

function einheit(id, zeichne) { definiere('einheit', id, { w: 32, h: 32, zeichne }); }

/** Färbt alle Pixel im Rechteck, die genau `alt` sind, per fn(x,y) um. */
function umfaerben(p, x0, y0, x1, y1, alt, fn) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (p.hole(x, y) === alt) p.px(x, y, fn(x, y));
}

/** Rumpf zeilenweise: Deck von x0..x1, zum Kiel hin um heck (links) / bug (rechts) eingezogen. */
function rumpf(p, x0, x1, deck, kiel, bug, heck, f, k = 1.4, planken = true) {
  const n = Math.max(1, kiel - deck);
  for (let y = deck; y <= kiel; y++) {
    const t = Math.pow((y - deck) / n, k);
    const l = Math.round(x0 + heck * t), r = Math.round(x1 - bug * t);
    for (let x = l; x <= r; x++) {
      let c = f.h;
      if (y === deck) c = f.l;
      else if (y === kiel || x === r) c = f.d;
      else if (planken && (y - deck) % 2 === 0) c = mische(f.h, f.d, 0.45);
      else if (x === l) c = f.l;
      p.px(x, y, c);
    }
  }
}
/** Wasser-Andeutung unter dem Rumpf (eine Reihe) mit Bugwelle. */
function wasser(p, x0, x1, y = 28) {
  for (let x = x0; x <= x1; x++) p.px(x, y, (x * 3 + y) % 7 === 0 ? PAL.wasserH : PAL.wasser);
  p.px(x1, y, SCHAUM).px(x1 - 1, y, SCHAUM).px(x0, y, SCHAUM).px(x0 + 1, y, PAL.wasserH);
}
function bugwelle(p, x, y = 27) { p.px(x, y, SCHAUM).px(x + 1, y, SCHAUM).px(x + 1, y - 1, PAL.wasserH); }
function mast(p, x, oben, unten, c = PAL.holzD) { p.rect(x, oben, 1, unten - oben + 1, c); }

/** Rahsegel (rechteckig, leicht gebaucht) mit Rahe; muster(i,j,w,h) darf eine Farbe liefern. */
function rahsegel(p, x0, y0, w, h, muster) {
  p.rect(x0 - 1, y0, w + 2, 1, PAL.holzD);
  for (let j = 1; j <= h; j++) for (let i = 0; i < w; i++) {
    if ((i === 0 || i === w - 1) && j === h) continue;
    let c = SEGEL;
    const m = muster && muster(i, j, w, h);
    if (m) c = m === S && i >= w - 2 ? SD : m === S && i === 0 ? SH : m;
    else if (i >= w - 2 || j === h) c = SEGEL_D;
    else if (i === 0 || j === 1) c = SEGEL_H;
    p.px(x0 + i, y0 + j, c);
  }
}
/** Lateinersegel: Rahe schräg von vorne unten nach hinten oben, Dreieck mit senkrechtem Achterliek. */
function lateiner(p, mx, oben, h, vor, hinter, muster) {
  const M = '#010203';
  p.poly([[mx - hinter, oben], [mx + vor, oben + h], [mx - hinter, oben + h]], M);
  umfaerben(p, mx - hinter - 1, oben - 1, mx + vor + 1, oben + h + 1, M, (x, y) => {
    const m = muster && muster(x - mx, y - oben);
    if (m) return m;
    if (y === oben + h || x === mx - hinter) return SEGEL_D;
    return x < mx - hinter + 2 ? SEGEL_H : SEGEL;
  });
  p.linie(mx - hinter - 1, oben - 1, mx + vor + 1, oben + h + 1, PAL.holzD);
}
/** Flagge, weht nach hinten (links) vom Mast bei x. */
function flagge(p, x, y, w = 4, h = 3) {
  p.rect(x - w, y, w, h, S).rect(x - w, y, w, 1, SH).rect(x - w, y + h - 1, w, 1, SD);
  p.px(x - w, y + h - 1, 'leer');
}
function wimpel(p, x, y, len = 5) {
  for (let i = 0; i < len; i++) { p.px(x - 1 - i, y, i < len - 1 ? S : SD); if (i < len - 2) p.px(x - 1 - i, y + 1, SD); }
}
/** Kanonenpforten-Band: Streifen in Bandfarbe, schwarze Pforten. */
function pforten(p, x0, x1, y, schritt = 2, band = OCKER) {
  p.rect(x0, y - 1, x1 - x0 + 1, 2, band);
  p.rect(x0, y - 1, x1 - x0 + 1, 1, hell(band, 0.2));
  for (let x = x0 + 1; x < x1; x += schritt) p.px(x, y, SCHWARZ);
}
function ruder(p, xs, y0, dy, dx, c = PAL.holzH) {
  for (const x of xs) { p.linie(x, y0, x - dx, y0 + dy, c); p.px(x - dx, y0 + dy, PAL.holzD); }
}
function rauch(p, x, y) {
  const r = [[0, 0, 1.6], [-2, -3, 2], [-5, -5, 2.2], [-8, -6, 1.6]];
  for (const [dx, dy, s] of r) p.ellipse(x + dx, y + dy, s, s * 0.8, PAL.rauch);
  for (const [dx, dy, s] of r) p.ellipse(x + dx - 0.5, y + dy - 0.5, s * 0.5, s * 0.4, '#b4b4b4');
}
function schornstein(p, x, y0, y1, w = 2, c = SCHWARZ, band = true) {
  p.rect(x, y0, w, y1 - y0 + 1, c).rect(x, y0, 1, y1 - y0 + 1, hell(c, 0.18));
  if (band) p.rect(x, y0 + 1, w, 1, S);
  p.rect(x, y0, w, 1, '#111');
}
/** Geschützturm: Körper w×2, Rohre nach rechts (dir=1) oder links (-1). */
function turm(p, x, y, w, laenge, dir = 1, f = TURM, rohre = 1) {
  p.rect(x, y, w, 2, f.h).rect(x, y, w, 1, f.l).px(dir > 0 ? x : x + w - 1, y + 1, f.d);
  const sx = dir > 0 ? x + w : x - 1;
  for (let r = 0; r < rohre; r++) for (let i = 0; i < laenge; i++) p.px(sx + dir * i, y + r, f.d);
}
function bullaugen(p, x0, x1, y, schritt = 3, c = '#2a3238') { for (let x = x0; x <= x1; x += schritt) p.px(x, y, c); }

// ================== ANTIKE ==================
einheit('boot', (p) => {
  rumpf(p, 5, 26, 23, 26, 3, 3, HOLZ, 1.8, false);
  p.rect(7, 24, 18, 1, mische(HOLZ.h, HOLZ.d, 0.4));
  p.linie(26, 23, 28, 20, HOLZ.l).px(28, 19, HOLZ.d);           // Bugsteven
  p.linie(5, 23, 4, 21, HOLZ.d).px(4, 20, HOLZ.d);               // Heck
  // Paddler mit Spielerfarben-Tunika
  for (const x of [10, 15, 20]) {
    p.rect(x, 20, 2, 3, S).px(x, 20, SH).px(x + 1, 22, SD);
    p.rect(x, 18, 2, 2, PAL.haut).px(x, 18, PAL.haar).px(x + 1, 18, PAL.haar);
    p.linie(x + 2, 20, x - 1, 27, PAL.holzH); p.px(x - 1, 27, PAL.holzD).px(x - 2, 27, PAL.holzD);
  }
  // Rundschilde an der Bordwand
  for (const x of [8, 13, 18, 23]) p.rect(x, 24, 2, 2, S).px(x, 24, SH).px(x + 1, 25, SD);
  mast(p, 6, 13, 22); wimpel(p, 6, 13, 5);
  wasser(p, 4, 27);
});

einheit('arbeitsboot', (p) => {
  rumpf(p, 6, 25, 21, 27, 3, 2, HOLZ, 2);
  p.rect(7, 22, 18, 1, S).rect(7, 23, 17, 1, SD);
  p.linie(25, 21, 26, 19, HOLZ.d);
  // Kajüte
  p.rect(8, 16, 7, 5, PAL.putz).rect(8, 16, 1, 5, '#f4ead2').rect(14, 16, 1, 5, PAL.putzD);
  p.rect(7, 15, 9, 1, PAL.holzD).rect(10, 17, 2, 2, PAL.glas).px(10, 17, PAL.wasserH);
  // Ladebaum mit Netz
  mast(p, 18, 8, 20); p.linie(18, 9, 25, 13, PAL.holz); p.linie(25, 13, 25, 16, PAL.stoffD);
  p.karte(23, 16, ['.nnn.', 'nNnNn', 'nnNnn', '.nnn.'], { n: '#8a7a52', N: '#5a4f33' });
  p.rect(20, 18, 2, 3, PAL.leder).rect(20, 16, 2, 2, PAL.haut).rect(20, 15, 2, 1, PAL.stroh || '#d8b85a');
  flagge(p, 18, 8, 4, 3);
  wasser(p, 5, 27);
});

einheit('galeere', (p) => {
  rumpf(p, 4, 25, 21, 27, 2, 3, DHOLZ, 1.3);
  p.rect(5, 21, 20, 1, S).rect(5, 22, 20, 1, SD);
  p.linie(4, 21, 3, 18, DHOLZ.l).px(4, 17, DHOLZ.l);
  // Rammsporn
  p.poly([[25, 25], [29, 26], [25, 27]], PAL.bronze); p.px(28, 26, PAL.bronzeD);
  // Ruderpforten + eine Ruderreihe
  for (let x = 7; x <= 23; x += 3) p.px(x, 24, SCHWARZ);
  mast(p, 14, 6, 20);
  rahsegel(p, 10, 8, 9, 8, (i, j) => (j === 3 || j === 4 || j === 7) ? S : null);
  wimpel(p, 14, 6, 5);
  wasser(p, 2, 29);
  ruder(p, [8, 11, 14, 17, 20, 23], 24, 5, 4, '#e3c58e');
});

einheit('trireme', (p) => {
  rumpf(p, 3, 26, 20, 27, 2, 3, DHOLZ, 1.2, false);
  p.rect(4, 20, 22, 1, PAL.bronze);
  // drei versetzte Ruderreihen
  for (let r = 0; r < 3; r++) for (let x = 6 + r; x <= 23; x += 3) p.px(x, 22 + r * 2, SCHWARZ);
  for (let r = 0; r < 3; r++) ruder(p, [6 + r, 12 + r, 18 + r], 22 + r * 2, 6 - r * 2, 3 - r, PAL.holzH);
  ruder(p, [9, 15, 21], 22, 6, 3, PAL.holz);
  p.poly([[26, 25], [30, 26], [26, 27]], PAL.bronze); p.px(29, 26, PAL.bronzeD).px(27, 25, PAL.gold);
  p.px(24, 22, PAL.weiss).px(25, 22, SCHWARZ);                   // Auge am Bug
  p.linie(3, 20, 2, 17, DHOLZ.l).linie(2, 17, 4, 15, DHOLZ.l);    // Heckschwung
  mast(p, 14, 4, 19);
  rahsegel(p, 9, 6, 11, 9, (i, j, w) => (i === 5 && j > 2 && j < 8) || (j === 5 && i > 2 && i < 8) ? PAL.weiss : S);
  wimpel(p, 14, 4, 5);
  wasser(p, 1, 30);
});

einheit('quinquereme', (p) => {
  rumpf(p, 3, 27, 18, 27, 2, 2, DHOLZ, 1.1);
  // Schilde an der Reling
  for (let x = 5; x <= 25; x += 2) p.px(x, 18, x % 4 === 1 ? S : SH).px(x + 1, 18, SD);
  for (let r = 0; r < 2; r++) for (let x = 6 + r; x <= 24; x += 2) p.px(x, 21 + r * 2, SCHWARZ);
  for (let r = 0; r < 2; r++) ruder(p, [6 + r, 9 + r, 12 + r, 15 + r, 18 + r, 21 + r, 24 + r].filter((x) => x < 25), 21 + r * 2, 6 - r * 2, 3, r ? PAL.holz : PAL.holzH);
  p.poly([[27, 24], [30, 25], [27, 26]], PAL.bronze);
  p.linie(3, 18, 2, 15, DHOLZ.l).linie(2, 15, 4, 13, DHOLZ.l);
  // Kampfturm am Bug
  p.rect(22, 12, 5, 6, PAL.holz).rect(22, 12, 1, 6, PAL.holzH).rect(26, 12, 1, 6, PAL.holzD);
  for (let x = 22; x <= 26; x += 2) p.px(x, 11, PAL.holz);
  p.rect(23, 14, 3, 1, S);
  // Katapult an Deck
  p.rect(14, 15, 6, 3, PAL.holzD).rect(14, 15, 6, 1, PAL.holz);
  p.linie(15, 15, 19, 10, PAL.holzH); p.rect(19, 9, 2, 2, PAL.stein);
  p.px(18, 14, PAL.holzH).px(17, 13, PAL.holzD);
  // kleiner Mast mit Spielerfarben-Segel
  mast(p, 9, 3, 17);
  rahsegel(p, 5, 5, 9, 7, (i) => i % 4 < 2 ? S : null);
  wimpel(p, 9, 3, 5);
  wasser(p, 1, 30);
});

einheit('handelsschiff', (p) => {
  rumpf(p, 5, 26, 20, 27, 4, 4, HOLZ, 2.2);
  p.rect(6, 21, 20, 1, S);
  p.linie(5, 20, 3, 17, HOLZ.d).linie(3, 17, 4, 15, HOLZ.d).px(5, 15, HOLZ.d); // Schwanenhals am Heck
  p.linie(26, 20, 27, 18, HOLZ.l);
  // Amphoren und Ballen
  for (const x of [8, 11]) p.karte(x, 16, ['.a.', 'aAa', 'aaA', '.a.'], { a: '#c9774a', A: '#9a5432' });
  p.rect(19, 17, 4, 3, PAL.stoffD).rect(19, 17, 4, 1, PAL.stoff).px(21, 18, PAL.lederD);
  mast(p, 15, 3, 19);
  rahsegel(p, 9, 5, 13, 10, (i, j) => j === 5 || j === 6 ? S : null);
  p.linie(15, 3, 26, 18, '#6b5a40');   // Vorstag
  wimpel(p, 15, 3, 6);
  wasser(p, 3, 28);
});

// ================== MITTELALTER / RENAISSANCE ==================
einheit('kogge', (p) => {
  rumpf(p, 6, 25, 18, 27, 4, 2, HOLZ, 2);
  // Kastelle mit Zinnen
  p.rect(4, 13, 8, 5, PAL.holz).rect(4, 13, 1, 5, PAL.holzH).rect(11, 13, 1, 5, PAL.holzD).rect(5, 15, 6, 1, S);
  for (let x = 4; x <= 11; x += 2) p.px(x, 12, PAL.holzH);
  p.rect(21, 14, 7, 4, PAL.holz).rect(21, 14, 1, 4, PAL.holzH).rect(27, 14, 1, 4, PAL.holzD).rect(22, 15, 5, 1, S);
  for (let x = 21; x <= 27; x += 2) p.px(x, 13, PAL.holzH);
  p.rect(4, 18, 1, 6, PAL.holzD);                                 // Heckruder
  mast(p, 15, 1, 17);
  rahsegel(p, 10, 3, 11, 9, (i) => (i >> 1) % 2 === 0 ? S : null); // senkrechte Streifen
  p.rect(14, 1, 3, 1, PAL.holzD);                                 // Mastkorb
  wimpel(p, 15, 0 + 1, 6);
  wasser(p, 4, 27);
});

einheit('galeasse', (p) => {
  rumpf(p, 3, 26, 19, 27, 2, 2, DHOLZ, 1.3);
  p.rect(2, 15, 6, 4, DHOLZ.h).rect(2, 15, 6, 1, DHOLZ.l).rect(3, 16, 4, 1, S);   // Heckkastell
  p.ellipse(23, 18, 3, 1.5, DHOLZ.h); p.rect(21, 17, 5, 1, DHOLZ.l);             // runder Bugkastell
  pforten(p, 5, 22, 21, 3, OCKER);
  for (let x = 6; x <= 22; x += 2) p.px(x, 24, SCHWARZ);
  ruder(p, [7, 10, 13, 16, 19, 22], 24, 4, 3);
  p.poly([[26, 24], [30, 25], [26, 26]], PAL.eisen);
  // drei Lateinermasten
  const st = (dx, dy) => dx + dy === -3 || dx + dy === -2 ? S : null;
  mast(p, 8, 7, 18); lateiner(p, 8, 7, 9, 4, 4, st);
  mast(p, 15, 3, 18); lateiner(p, 15, 3, 12, 6, 5, st);
  mast(p, 22, 8, 17); lateiner(p, 22, 8, 7, 4, 3, st);
  wimpel(p, 15, 2, 5);
  wasser(p, 1, 30);
});

einheit('karavelle', (p) => {
  rumpf(p, 7, 25, 20, 27, 3, 2, HOLZ, 1.6);
  p.rect(5, 16, 7, 4, PAL.holz).rect(5, 16, 7, 1, PAL.holzH).rect(11, 16, 1, 4, PAL.holzD);   // Achterkastell
  p.rect(5, 20, 3, 3, PAL.holz).rect(5, 22, 2, 1, PAL.holzD);
  p.rect(8, 21, 17, 1, S);
  // Lateinersegel mit Kreuz
  const kreuz = (cx, cy) => (dx, dy) => (dx === cx && dy >= cy - 2 && dy <= cy + 2) || (dy === cy && dx >= cx - 1 && dx <= cx + 1) ? S : null;
  mast(p, 10, 8, 15); lateiner(p, 10, 8, 7, 3, 3, kreuz(-1, 5));
  mast(p, 16, 2, 19); lateiner(p, 16, 2, 15, 7, 5, kreuz(-1, 10));
  mast(p, 22, 7, 19); lateiner(p, 22, 7, 10, 5, 4, kreuz(-1, 7));
  p.linie(25, 20, 28, 18, PAL.holzD);
  flagge(p, 10, 6, 4, 2);
  wasser(p, 4, 27);
});

einheit('galeone', (p) => {
  rumpf(p, 5, 25, 16, 27, 3, 1, DHOLZ, 1.6);
  // hohes Achterkastell mit Goldverzierung
  p.rect(3, 8, 9, 8, DHOLZ.h).rect(3, 8, 9, 1, PAL.gold).rect(3, 8, 1, 19, DHOLZ.l);
  p.rect(4, 10, 7, 1, S).rect(4, 11, 7, 1, SD);
  for (let x = 5; x <= 10; x += 2) p.rect(x, 13, 1, 2, PAL.gold);
  p.rect(3, 16, 3, 10, DHOLZ.h).rect(3, 16, 1, 10, DHOLZ.l);
  p.rect(20, 13, 6, 3, DHOLZ.h).rect(20, 13, 6, 1, PAL.gold);   // Vorderkastell
  p.rect(5, 18, 21, 1, PAL.gold);
  for (let x = 8; x <= 22; x += 3) p.rect(x, 21, 2, 1, SCHWARZ);   // eine Pfortenreihe
  p.linie(25, 15, 30, 11, PAL.holzD);                            // Bugspriet
  // Besan (Lateiner über dem Kastell), Groß- und Fockmast mit getrennten Rahsegeln
  mast(p, 7, 1, 7); lateiner(p, 7, 2, 5, 3, 3, (dx, dy) => dy === 3 ? S : null);
  mast(p, 14, 1, 15);
  rahsegel(p, 12, 3, 5, 3, (i, j) => j === 2 ? S : null);
  rahsegel(p, 11, 8, 7, 5, (i, j) => j === 3 ? S : null);
  mast(p, 21, 4, 12);
  rahsegel(p, 20, 5, 3, 2, (i, j) => j === 1 ? S : null);
  rahsegel(p, 19, 9, 5, 3, (i, j) => j === 2 ? S : null);
  flagge(p, 7, 1, 4, 2); wimpel(p, 14, 1, 4); wimpel(p, 21, 4, 3);
  wasser(p, 2, 28);
});

einheit('fregatte', (p) => {
  // lang, niedrig, schlank; eine durchgehende Kanonenreihe im hellen Band
  rumpf(p, 2, 27, 21, 27, 3, 1, SCHWARZRUMPF, 1.2, false);
  pforten(p, 3, 25, 23, 2, '#e6dcc0');
  p.rect(3, 26, 22, 1, '#b56b38');                                // Kupferbeschlag
  p.rect(2, 21, 25, 1, SCHWARZRUMPF.l);
  p.linie(27, 21, 30, 16, PAL.holzD);                            // langer Bugspriet
  p.linie(30, 16, 23, 4, '#6b5a40');
  // drei hohe Masten, je drei gestaffelte Rahsegel
  for (const [x, s] of [[7, 0], [15, 0], [23, 2]]) {
    mast(p, x, 2 + s, 20);
    rahsegel(p, x - 2, 3 + s, 5, 3, (i, j) => (j === 1 ? S : null));
    rahsegel(p, x - 3, 8 + s, 7, 4);
    rahsegel(p, x - 3, 13 + s, 7, 4, (i, j) => (j === 2 ? S : null));
  }
  p.rect(3, 19, 2, 2, PAL.holzD);
  flagge(p, 4, 15, 3, 3);                                        // Heckflagge
  p.rect(4, 15, 1, 6, PAL.holzD);
  wimpel(p, 15, 2, 5);
  wasser(p, 1, 28);
});

// ================== INDUSTRIE ==================
einheit('linienschiff', (p) => {
  // sehr hoher Rumpf mit drei Kanonendecks
  rumpf(p, 3, 26, 13, 27, 2, 1, SCHWARZRUMPF, 1.1, false);
  pforten(p, 4, 25, 16, 2, OCKER);
  pforten(p, 4, 25, 19, 2, OCKER);
  pforten(p, 5, 24, 22, 2, OCKER);
  p.rect(4, 25, 21, 1, SCHWARZRUMPF.d).rect(4, 26, 21, 1, '#b56b38');
  p.rect(2, 11, 4, 14, '#3a3634').rect(2, 11, 4, 1, PAL.gold);   // Heckgalerie
  for (let y = 13; y <= 22; y += 3) p.rect(3, y, 2, 1, PAL.glas);
  p.rect(6, 13, 20, 1, '#4a4744');
  p.linie(26, 13, 30, 9, PAL.holzD);
  for (const x of [9, 16, 23]) {
    mast(p, x, 1, 12);
    rahsegel(p, x - 2, 2, 5, 3, (i, j) => (j === 2 ? S : null));
    rahsegel(p, x - 3, 6, 7, 5, (i, j) => (j === 3 ? S : null));
  }
  flagge(p, 5, 7, 4, 3); p.rect(5, 7, 1, 4, PAL.holzD);
  wimpel(p, 16, 1, 5);
  wasser(p, 1, 28);
});

einheit('panzerschiff', (p) => {
  rumpf(p, 3, 26, 21, 27, -2, 2, EISEN, 1, false);
  p.rect(4, 21, 22, 1, EISEN.l);
  for (let x = 5; x <= 25; x += 3) p.px(x, 24, EISEN.d);         // Nieten / Plattenstöße
  p.rect(4, 26, 22, 1, '#7a2c22');
  // Kasematte, schräg
  p.poly([[8, 20], [10, 16], [21, 16], [23, 20]], '#5a646b');
  p.rect(10, 16, 11, 1, '#78838b');
  for (const x of [11, 14, 17, 20]) p.rect(x, 18, 1, 1, SCHWARZ);
  // zwei Rauchschornsteine
  schornstein(p, 12, 9, 15, 2); schornstein(p, 16, 10, 15, 2);
  rauch(p, 12, 8); rauch(p, 16, 9);
  mast(p, 23, 11, 19, '#3a3a3a'); flagge(p, 23, 11, 4, 3);
  p.rect(5, 19, 3, 2, '#5a646b');
  wasser(p, 2, 29);
});

einheit('transportschiff', (p) => {
  rumpf(p, 3, 27, 18, 27, 2, 2, SCHWARZRUMPF, 1.3, false);
  p.rect(4, 25, 22, 2, '#8a2f24');
  bullaugen(p, 6, 24, 21, 3, '#d8d0b8');
  p.rect(3, 18, 25, 1, '#e8e2d4');
  // weißer Aufbau, Schornstein mittschiffs
  p.rect(11, 13, 9, 5, PAL.weiss).rect(11, 13, 9, 1, '#ffffff').rect(19, 13, 1, 5, '#c8c2b4');
  bullaugen(p, 12, 18, 15, 2, PAL.glasD);
  p.rect(12, 12, 7, 1, '#7a7a7a');
  schornstein(p, 14, 8, 11, 3, '#2a2a2a'); rauch(p, 15, 8);
  p.rect(14, 9, 3, 1, S).rect(14, 10, 3, 1, SD);
  // Rettungsboote, Masten mit Ladebäumen
  p.rect(12, 11, 3, 1, PAL.holzH).rect(17, 11, 3, 1, PAL.holzH);
  mast(p, 6, 8, 17, '#4a4a4a'); p.linie(6, 10, 9, 16, '#6a6a6a');
  mast(p, 24, 9, 17, '#4a4a4a'); p.linie(24, 11, 21, 16, '#6a6a6a');
  p.rect(7, 16, 3, 2, PAL.holz).rect(21, 16, 3, 2, PAL.holz);
  flagge(p, 6, 8, 4, 3);
  wasser(p, 2, 29);
});

einheit('tauchboot', (p) => {
  // frühes Unterseeboot: kurze Zigarre, fast ganz unter Wasser, Luke, Schraube
  p.ellipse(16, 25, 10, 2.6, PAL.bronzeD);
  p.ellipse(15.5, 24.4, 9, 1.6, PAL.bronze);
  p.rect(9, 23, 13, 1, '#d8a85a');
  for (let x = 8; x <= 24; x += 2) p.px(x, 25, '#6a4a1e');
  p.rect(14, 19, 4, 4, PAL.bronze).rect(14, 19, 1, 4, '#d8a85a').rect(17, 19, 1, 4, PAL.bronzeD);
  p.rect(13, 18, 6, 1, PAL.bronzeD).px(15, 20, PAL.glas).px(16, 20, PAL.glasD);
  p.rect(5, 23, 1, 5, '#6a4a1e').rect(4, 24, 1, 3, PAL.eisen);  // Schraube
  p.linie(26, 25, 30, 24, PAL.eisenD); p.rect(30, 23, 1, 2, PAL.schwarz);   // Spierentorpedo
  mast(p, 16, 13, 17, '#444'); flagge(p, 16, 13, 4, 3);
  // unter Wasser verblassen
  for (let y = 26; y <= 27; y++) for (let x = 0; x < 32; x++) { const c = p.hole(x, y); if (c && c[0] === '#') p.px(x, y, mische(c, PAL.wasser, 0.55)); }
  wasser(p, 3, 28);
});

// ================== MODERNE ==================
einheit('frachter', (p) => {
  rumpf(p, 2, 28, 20, 27, 2, 1, { h: '#2c3e5a', d: '#1d2a3e', l: '#3d5476' }, 1.2, false);
  p.rect(3, 25, 24, 2, '#9a3a2c');
  p.rect(2, 20, 27, 1, '#e8e2d4');
  // Container in Reihen
  const farben = ['#c0392b', S, '#2f7d4a', '#d68a1f', '#3a6ea8', SD, '#8a8f94', '#c0392b'];
  let n = 0;
  for (let x = 10; x <= 26; x += 4) for (let y = 13; y <= 18; y += 2) {
    if (x === 26 && y === 13) continue;
    const c = farben[(n++ * 5 + x) % farben.length];
    p.rect(x, y, 4, 2, c); p.px(x + 3, y, c === S ? SD : dunkel(c[0] === '#' ? c : '#888888', 0.3)); p.px(x, y + 1, c === S ? SD : dunkel(c[0] === '#' ? c : '#888888', 0.3));
  }
  // Brücke am Heck
  p.rect(3, 9, 6, 11, PAL.weiss).rect(3, 9, 1, 11, '#ffffff').rect(8, 9, 1, 11, '#c8c2b4');
  p.rect(2, 9, 8, 1, '#b8b2a4'); p.rect(3, 10, 6, 1, PAL.glasD);
  for (let y = 13; y <= 18; y += 2) p.rect(4, y, 4, 1, PAL.glas);
  p.rect(5, 5, 2, 4, '#2a2a2a').rect(5, 6, 2, 1, S);
  mast(p, 4, 4, 8, '#555'); flagge(p, 4, 4, 3, 2);
  wasser(p, 1, 30);
});

einheit('zerstoerer', (p) => {
  rumpf(p, 4, 27, 22, 27, 3, 1, GRAU, 1.1, false);
  p.rect(5, 26, 20, 1, '#7a2c22');
  p.rect(5, 24, 21, 1, SD);                                        // Rumpfstreifen
  p.px(22, 23, PAL.weiss).px(24, 23, PAL.weiss);                   // Kennnummer
  // kleine Brücke, zwei schlanke Schornsteine
  p.rect(16, 18, 5, 4, GRAU.l).rect(20, 18, 1, 4, GRAU.d).rect(17, 19, 3, 1, PAL.glasD);
  p.rect(10, 18, 2, 4, GRAU.h).rect(13, 19, 2, 3, GRAU.h).rect(10, 18, 2, 1, SCHWARZ).rect(13, 19, 2, 1, SCHWARZ);
  p.rect(10, 20, 2, 1, S).rect(13, 20, 2, 1, S);
  turm(p, 22, 20, 3, 3, 1); turm(p, 5, 20, 3, 3, -1);
  p.rect(8, 21, 1, 1, GRAU.d);
  mast(p, 18, 12, 17, '#4a4f53'); p.rect(17, 14, 3, 1, '#4a4f53');
  flagge(p, 18, 12, 4, 2);
  wasser(p, 3, 29);
});

einheit('kreuzer', (p) => {
  rumpf(p, 3, 28, 20, 27, 3, 1, GRAU, 1.1, false);
  p.rect(4, 26, 22, 1, '#7a2c22');
  p.rect(4, 22, 23, 1, SD);
  // Aufbauten, zwei Schornsteine, Dreibeinmast
  p.rect(10, 16, 11, 4, GRAU.l).rect(10, 16, 11, 1, '#cfd5d9');
  p.rect(17, 12, 4, 4, GRAU.l).rect(17, 13, 4, 1, PAL.glasD);
  schornstein(p, 11, 10, 15, 2, GRAU.d); schornstein(p, 14, 11, 15, 2, GRAU.d);
  mast(p, 19, 4, 11, '#4a4f53'); p.linie(19, 6, 17, 11, '#4a4f53'); p.rect(18, 7, 3, 1, '#4a4f53');
  // drei Doppeltürme
  turm(p, 22, 18, 4, 4, 1, TURM, 2);
  turm(p, 6, 18, 4, 4, -1, TURM, 2);
  turm(p, 21, 15, 3, 3, 1, TURM, 2);
  flagge(p, 19, 4, 4, 3);
  wasser(p, 2, 30);
});

einheit('schlachtschiff', (p) => {
  rumpf(p, 2, 29, 19, 27, 3, 2, DGRAU, 1.1, false);
  p.rect(3, 26, 24, 1, '#7a2c22');
  p.rect(3, 22, 25, 1, SD);
  for (let x = 4; x <= 26; x += 3) p.px(x, 21, DGRAU.d);
  // mächtiger Pagodenturm, ein dicker Schornstein
  p.rect(9, 15, 13, 4, DGRAU.l);
  p.rect(15, 7, 5, 8, DGRAU.l).rect(15, 7, 1, 8, '#a8b0b5').rect(19, 7, 1, 8, DGRAU.d);
  p.rect(14, 10, 7, 1, DGRAU.h).rect(16, 8, 3, 1, PAL.glasD).rect(16, 11, 3, 1, PAL.glasD);
  p.rect(16, 3, 2, 4, '#4a4f53').rect(15, 5, 4, 1, '#4a4f53');
  schornstein(p, 12, 8, 12, 3, DGRAU.d);
  // vier schwere Drillingstürme
  const T = (x, y, dir) => {
    p.rect(x, y, 6, 3, TURM.h).rect(x, y, 6, 1, TURM.l).rect(dir > 0 ? x : x + 5, y, 1, 3, TURM.d).rect(x, y + 2, 6, 1, TURM.d);
    for (let i = 0; i < 5; i++) { p.px(dir > 0 ? x + 6 + i : x - 1 - i, y + 1, '#22272b'); if (i < 4) p.px(dir > 0 ? x + 6 + i : x - 1 - i, y, '#3a4247'); }
  };
  T(20, 16, 1); T(19, 13, 1); T(6, 16, -1); T(7, 13, -1);
  flagge(p, 16, 2, 4, 3);
  wasser(p, 1, 30);
});

einheit('u_boot', (p) => {
  // langes, niedriges Boot mit Turm, Deckgeschütz, Sehrohr
  rumpf(p, 2, 28, 23, 27, 3, 3, UBOOT, 1.3, false);
  p.rect(4, 23, 22, 1, UBOOT.l);
  p.poly([[13, 23], [14, 17], [19, 17], [21, 23]], UBOOT.h);
  p.rect(14, 17, 5, 1, UBOOT.l).rect(14, 17, 1, 6, UBOOT.l);
  p.rect(15, 19, 4, 2, S).rect(15, 20, 4, 1, SD);                 // Turmabzeichen
  p.rect(16, 11, 1, 6, '#2a2f33').px(17, 11, '#2a2f33');           // Sehrohr
  p.rect(18, 13, 1, 4, '#2a2f33');
  p.rect(23, 21, 2, 2, UBOOT.h).linie(25, 21, 27, 20, '#2a2f33');  // Deckgeschütz
  p.linie(28, 23, 23, 17, '#555e64');                              // Netzabweiser
  p.linie(16, 11, 4, 22, '#555e64');                              // Antennendraht
  p.px(4, 22, UBOOT.d);
  for (let y = 25; y <= 27; y++) for (let x = 0; x < 32; x++) { const c = p.hole(x, y); if (c && c[0] === '#') p.px(x, y, mische(c, PAL.wasser, 0.25 + (y - 25) * 0.18)); }
  wasser(p, 1, 30);
});

einheit('flugzeugtraeger', (p) => {
  // Holz-Flugdeck über die ganze Länge, Insel mit Schornstein
  rumpf(p, 4, 27, 20, 27, 3, 2, DGRAU, 1.2, false);
  p.rect(5, 26, 20, 1, '#7a2c22');
  p.rect(5, 22, 21, 1, SD);
  p.rect(1, 18, 30, 2, PAL.holz).rect(1, 18, 30, 1, PAL.holzH).rect(1, 19, 30, 1, PAL.holzD);
  for (let x = 2; x <= 29; x += 3) p.px(x, 18, PAL.weiss);
  p.rect(3, 20, 3, 1, DGRAU.d).rect(25, 20, 4, 1, DGRAU.d);
  // Insel
  p.rect(20, 12, 4, 6, DGRAU.l).rect(23, 12, 1, 6, DGRAU.d).rect(20, 13, 4, 1, PAL.glasD);
  schornstein(p, 21, 9, 11, 3, DGRAU.d, false); p.rect(21, 10, 3, 1, S);
  mast(p, 21, 5, 8, '#4a4f53'); flagge(p, 21, 5, 4, 2);
  // Propellerflugzeuge an Deck
  for (const x of [3, 8, 13]) p.karte(x, 15, ['g....', 'gGGGs', '..d..'], { g: '#5b6b3a', G: '#7d8c52', d: '#3e4a27', s: S });
  wasser(p, 2, 29);
});

// ================== ATOMZEITALTER ==================
einheit('lenkwaffenzerstoerer', (p) => {
  rumpf(p, 3, 28, 21, 27, 4, 1, GRAU, 1, false);
  p.rect(4, 26, 21, 1, '#4a4f53');
  p.rect(4, 23, 22, 1, SD);
  p.px(23, 22, PAL.weiss).px(25, 22, PAL.weiss).px(24, 22, PAL.weiss);
  // kantiger Block-Aufbau mit Radarfeldern
  p.poly([[9, 20], [10, 14], [19, 14], [21, 20]], GRAU.l);
  p.rect(10, 14, 9, 1, '#d0d6da');
  p.poly([[16, 16], [17, 15], [18, 16], [17, 18]], '#3b4f63');     // Phased-Array-Radar
  p.rect(16, 13, 3, 1, PAL.glasD);
  p.rect(13, 9, 2, 5, GRAU.h); p.rect(11, 9, 6, 1, GRAU.d).rect(12, 7, 4, 1, GRAU.d);   // Gittermast
  p.rect(13, 5, 1, 2, '#4a4f53');
  // Raketenzellen und Geschütz
  p.rect(21, 20, 4, 1, '#5a6268'); for (let x = 21; x <= 24; x += 2) p.px(x, 20, '#3a4045');
  p.rect(5, 20, 3, 1, '#5a6268');
  turm(p, 25, 19, 2, 3, 1, GRAU);
  flagge(p, 13, 4, 4, 2);
  wasser(p, 2, 30);
});

einheit('raketenkreuzer', (p) => {
  rumpf(p, 2, 29, 19, 27, 4, 2, GRAU, 1.1, false);
  p.rect(3, 26, 23, 1, '#4a4f53');
  p.rect(3, 22, 25, 1, SD);
  // zwei Aufbaublöcke, Radarkuppel
  p.rect(8, 13, 6, 6, GRAU.l).rect(8, 13, 6, 1, '#d0d6da').rect(9, 15, 4, 1, PAL.glasD);
  p.rect(16, 12, 5, 7, GRAU.l).rect(16, 12, 5, 1, '#d0d6da').rect(17, 14, 3, 1, PAL.glasD);
  p.ellipse(10.5, 11, 1.6, 1.3, PAL.weiss); p.px(10, 10, '#ffffff');
  mast(p, 18, 6, 11, '#4a4f53'); p.rect(16, 8, 5, 1, '#4a4f53');
  // große, schräge Startbehälter
  for (const x of [21, 24]) { p.linie(x, 18, x + 3, 15, '#5a6268'); p.linie(x + 1, 18, x + 4, 15, '#7a838a'); p.px(x + 4, 14, S); }
  for (const x of [3, 5]) { p.linie(x, 18, x + 2, 16, '#5a6268'); p.px(x + 2, 15, S); }
  flagge(p, 18, 6, 4, 2);
  wasser(p, 1, 30);
});

einheit('atom_u_boot', (p) => {
  // sehr lang, glatt, schwarz; Turm weit vorne mit Tiefenrudern
  p.ellipse(15.5, 25, 14.2, 2.4, ATOMUB.h);
  p.rect(3, 23, 25, 1, ATOMUB.l).rect(5, 22, 18, 1, ATOMUB.h);
  p.rect(6, 22, 16, 1, ATOMUB.l);
  p.poly([[19, 22], [20, 15], [24, 15], [24, 22]], ATOMUB.h);
  p.rect(20, 15, 4, 1, ATOMUB.l).rect(20, 15, 1, 7, ATOMUB.l);
  p.rect(18, 18, 9, 1, ATOMUB.h).rect(18, 18, 9, 1, ATOMUB.l);     // Turmruder
  p.rect(21, 20, 3, 1, S);
  p.rect(22, 12, 1, 3, '#555');
  p.poly([[1, 25], [3, 20], [5, 24]], ATOMUB.h);                    // Seitenruder
  p.px(3, 20, ATOMUB.l);
  for (let x = 8; x <= 16; x += 3) p.px(x, 23, ATOMUB.d);          // Raketenluken
  for (let y = 25; y <= 27; y++) for (let x = 0; x < 32; x++) { const c = p.hole(x, y); if (c && c[0] === '#') p.px(x, y, mische(c, PAL.wasser, 0.25 + (y - 25) * 0.18)); }
  wasser(p, 1, 30);
});

einheit('supertraeger', (p) => {
  // graues Flugdeck mit Markierungen, kompakte Insel mit Radar, Düsenjets
  rumpf(p, 3, 28, 19, 27, 2, 2, GRAU, 1.1, false);
  p.rect(4, 26, 23, 1, '#4a4f53');
  p.rect(4, 22, 24, 1, SD);
  p.rect(1, 17, 30, 2, '#5d646a').rect(1, 17, 30, 1, '#767e85');
  for (let x = 2; x <= 29; x += 2) p.px(x, 17, x % 4 ? '#f1c40f' : PAL.weiss);
  p.rect(24, 21, 2, 1, PAL.weiss).px(27, 21, PAL.weiss);           // Kennnummer
  p.rect(18, 11, 4, 6, GRAU.l).rect(21, 11, 1, 6, GRAU.d).rect(18, 12, 4, 1, PAL.glasD).rect(18, 14, 4, 1, S);
  mast(p, 19, 6, 10, '#4a4f53'); p.rect(17, 8, 5, 1, '#4a4f53'); p.ellipse(20, 6, 1, 1, PAL.weiss);
  flagge(p, 19, 4, 3, 2);
  for (const x of [3, 8, 12, 24]) p.karte(x, 15, ['.gg..', 'ggggg'], { g: '#9aa3aa' }).px(x + 4, 16, '#6a737a').px(x, 16, S);
  wasser(p, 1, 30);
});

einheit('landungsschiff', (p) => {
  // hoher, kastenförmiger Rumpf, Heckrampe, Hubschrauber
  rumpf(p, 2, 28, 16, 27, 3, 0, GRAU, 1, false);
  p.rect(3, 26, 22, 1, '#4a4f53');
  p.rect(3, 21, 24, 1, SD);
  p.rect(2, 22, 3, 4, '#2a3036').rect(2, 22, 3, 1, '#4a4f53');     // Heckrampe offen
  p.rect(12, 9, 11, 7, GRAU.l).rect(12, 9, 11, 1, '#d0d6da').rect(22, 9, 1, 7, GRAU.d);
  p.rect(18, 11, 4, 1, PAL.glasD);
  p.rect(13, 12, 3, 3, '#3b4f63');
  mast(p, 17, 3, 8, '#4a4f53'); p.rect(15, 5, 5, 1, '#4a4f53');
  flagge(p, 17, 3, 4, 2);
  // Hubschrauber an Deck
  p.karte(2, 11, ['..rrrrrrr', '.....r...', '....ooOO.', 'tttooooO.', '....oSo..'], { r: '#2a2f33', o: PAL.oliv, O: PAL.glas, t: PAL.olivD, S: S });
  // Landungsboot an der Seite
  p.rect(23, 17, 4, 2, PAL.oliv).rect(23, 17, 4, 1, PAL.khaki);
  wasser(p, 1, 30);
});

// ================== LUFT ==================
function schatten(p, cx, b, y = 29) {
  p.rect(cx - b, y, 2 * b + 1, 1, '#1f2a33').rect(cx - b + 2, y - 1, 2 * b - 3, 1, '#1f2a33');
}
function kokarde(p, x, y) {   // Hoheitszeichen 3×3
  p.rect(x - 1, y - 1, 3, 3, S).px(x - 1, y - 1, SH).px(x + 1, y + 1, SD).px(x, y, PAL.weiss);
}
/** Zeichnet fn auf eigenem Blatt (horizontal, Nase rechts) und überträgt es um winkel gedreht um (cx,cy). */
function gedreht(p, winkel, cx, cy, fn) {
  const t = new Pinsel(p.w, p.h); fn(t);
  const c = Math.cos(winkel), s = Math.sin(winkel);
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const dx = x - cx, dy = y - cy;
    const v = t.hole(Math.round(c * dx + s * dy + cx), Math.round(-s * dx + c * dy + cy));
    if (v) p.px(x, y, v);
  }
}

einheit('doppeldecker', (p) => {
  const B = '#c9b27a', BD = '#9a8452', BH = '#e2d0a0';
  // unterer Flügel (versetzt, dunkler)
  p.rect(12, 4, 5, 19, BD).rect(16, 4, 1, 19, '#7a6840');
  // Rumpf
  p.poly([[4, 12], [24, 11], [25, 13], [24, 16], [4, 14]], B);
  p.rect(5, 12, 19, 1, BH);
  // Leitwerk
  p.rect(4, 9, 4, 8, B).rect(4, 9, 4, 1, BH).rect(4, 12, 2, 2, S).px(4, 12, SH);
  // oberer Flügel
  p.rect(14, 2, 6, 23, B).rect(14, 2, 6, 1, BH).rect(14, 2, 1, 23, BH).rect(19, 2, 1, 23, BD).rect(14, 24, 6, 1, BD);
  for (const y of [6, 20]) { p.px(14, y, '#5a4a2a').px(19, y, '#5a4a2a'); }  // Streben
  kokarde(p, 17, 5); kokarde(p, 17, 21);
  p.rect(20, 13, 3, 2, PAL.lederD).px(21, 13, PAL.haut);           // Pilot
  p.rect(25, 12, 2, 4, PAL.eisenD).px(25, 12, PAL.eisen);           // Sternmotor
  p.rect(28, 9, 1, 10, '#cfd4d8').px(28, 13, PAL.schwarz).px(28, 14, PAL.schwarz);  // Propellerkreis
  p.px(27, 13, PAL.holz).px(27, 14, PAL.holz);
  schatten(p, 16, 6);
});

einheit('jagdflugzeug', (p) => {
  const G = '#6e7f4c', GD = '#4e5c34', GH = '#93a46a';
  p.poly([[4, 13], [24, 12], [26, 14], [24, 16], [4, 15]], G);
  p.rect(5, 13, 19, 1, GH);
  // elliptische Flügel
  p.ellipse(16, 14, 3.4, 11.5, G);
  for (let y = 3; y <= 25; y++) { const r = [...Array(32).keys()].filter((x) => p.hole(x, y) && x >= 12 && x <= 20); if (r.length) { p.px(r[0], y, GH); p.px(r[r.length - 1], y, GD); } }
  p.rect(4, 10, 3, 8, G).rect(4, 10, 3, 1, GH).rect(6, 10, 1, 8, GD);
  p.rect(4, 13, 2, 2, S);
  kokarde(p, 16, 6); kokarde(p, 16, 22);
  p.rect(18, 13, 3, 2, PAL.glas).px(18, 13, PAL.wasserH).rect(21, 13, 1, 2, PAL.glasD);
  p.rect(26, 13, 2, 3, S).px(26, 13, SH);                           // Spinner in Spielerfarbe
  p.rect(28, 9, 1, 11, '#cfd4d8').px(28, 14, PAL.schwarz);
  schatten(p, 15, 6);
});

einheit('duesenjaeger', (p) => {
  const G = '#9aa6af', GD = '#6c7882', GH = '#c3ccd3';
  p.poly([[11, 13], [22, 13], [12, 2], [9, 2]], G);                 // Pfeilflügel oben
  p.poly([[11, 15], [22, 15], [12, 26], [9, 26]], G);
  p.linie(12, 2, 22, 13, GH); p.linie(12, 26, 22, 15, GD);
  p.poly([[3, 12], [6, 13], [6, 15], [3, 16], [2, 14]], G);
  p.poly([[3, 13], [8, 13], [5, 8], [3, 8]], GD); p.poly([[3, 15], [8, 15], [5, 20], [3, 20]], GD);   // Höhenleitwerk
  p.poly([[3, 12], [27, 13], [30, 14], [27, 15], [3, 16]], G);
  p.rect(4, 13, 23, 1, GH);
  p.rect(20, 13, 4, 2, '#2c3e50').px(21, 13, '#5d7f99');           // Kanzel
  p.rect(1, 13, 2, 3, PAL.feuer).px(1, 14, '#f7d26a');              // Nachbrenner
  // Spielerfarben-Winkel
  p.linie(11, 5, 14, 8, S); p.linie(11, 23, 14, 20, S); p.px(12, 5, SH).px(12, 23, SD);
  p.rect(4, 9, 1, 3, S); p.rect(4, 17, 1, 3, S);
  schatten(p, 15, 7);
});

einheit('bomber', (p) => {
  const G = '#6b6f5a', GD = '#4a4d3c', GH = '#8f937a';
  // breite Flügel, vier Motoren
  p.poly([[13, 1], [18, 1], [20, 14], [18, 28], [13, 28], [12, 14]], G);
  p.rect(13, 1, 5, 1, GH).linie(12, 14, 13, 1, GH).linie(12, 14, 13, 28, GH);
  for (const y of [4, 9, 19, 24]) { p.rect(19, y - 1, 4, 3, GD).rect(19, y - 1, 4, 1, G).rect(23, y - 3, 1, 7, '#cfd4d8').px(23, y, PAL.schwarz); }
  p.poly([[2, 12], [27, 12], [29, 14], [27, 16], [2, 16]], G);
  p.rect(3, 12, 24, 1, GH).rect(3, 16, 24, 1, GD);
  p.rect(27, 13, 2, 3, PAL.glas).px(27, 13, PAL.wasserH);           // Glasnase
  p.rect(2, 8, 4, 12, G).rect(2, 8, 4, 1, GH).rect(2, 8, 1, 2, S).rect(2, 18, 1, 2, S);
  p.rect(22, 13, 2, 2, PAL.glasD);
  kokarde(p, 15, 6); kokarde(p, 15, 22);
  p.rect(8, 13, 9, 1, S);
  schatten(p, 15, 8, 30);
});

einheit('sturzkampfbomber', (p) => {
  // Seitenansicht im Sturzflug, Bombe unter dem Rumpf, starres Fahrwerk
  gedreht(p, 0.6, 16, 14, (q) => {
    const G = '#6f7d58', GD = '#4f5a3c', GH = '#95a379';
    q.poly([[5, 12], [24, 12], [26, 14], [24, 16], [7, 15], [5, 14]], G);
    q.rect(6, 12, 18, 1, GH);
    q.rect(4, 8, 3, 6, G).rect(4, 8, 1, 6, GH).rect(5, 9, 2, 3, S);  // Seitenleitwerk
    q.rect(12, 10, 8, 2, PAL.glas).px(12, 10, PAL.wasserH).rect(15, 10, 1, 2, PAL.glasD);   // lange Kanzel
    q.poly([[13, 15], [20, 15], [21, 16], [12, 17]], GD);            // Knickflügel
    q.rect(15, 15, 3, 2, S);
    q.rect(19, 17, 2, 3, GD).rect(19, 19, 3, 2, '#2a2a2a');          // Hosenbein-Fahrwerk
    q.rect(13, 17, 5, 2, '#2e2e2e').px(17, 17, '#555').px(12, 18, '#555');   // Bombe
    q.rect(26, 13, 2, 2, S);
    q.rect(28, 9, 1, 10, '#cfd4d8');
  });
  // Sturz-Linien
  p.linie(2, 3, 6, 6, '#dde6ec'); p.linie(3, 9, 6, 11, '#dde6ec');
  schatten(p, 20, 5);
});

einheit('tarnkappenbomber', (p) => {
  const G = '#363b41', GD = '#24282c', GH = '#4c535a';
  p.poly([[26, 14], [11, 1], [8, 3], [11, 7], [7, 10], [10, 14], [7, 18], [11, 21], [8, 25], [11, 27]], G);
  p.linie(26, 14, 11, 1, GH); p.linie(26, 14, 11, 27, GD);
  p.linie(25, 14, 12, 3, GH);
  p.ellipse(19, 14, 4, 2, GH); p.ellipse(19, 14, 3, 1, G);
  p.rect(21, 13, 3, 2, '#1a2530').px(22, 13, '#3d5a73');
  p.rect(15, 9, 2, 2, GD).rect(15, 17, 2, 2, GD);                   // Lufteinlässe
  p.rect(12, 6, 2, 2, SD).px(12, 6, S); p.rect(12, 20, 2, 2, SD).px(12, 20, S);   // Hoheitszeichen (dezent)
  p.linie(19, 8, 22, 11, S); p.linie(19, 20, 22, 17, S);
  schatten(p, 16, 8);
});

einheit('marschflugkoerper', (p) => {
  // Flugbombe in Seitenansicht: Rumpf, Pulsstrahlrohr oben, Flamme
  const G = '#7b8466', GD = '#565e45', GH = '#a2ab88';
  p.poly([[7, 15], [24, 15], [28, 17], [24, 19], [7, 19]], G);
  p.rect(8, 15, 16, 1, GH).rect(8, 19, 16, 1, GD);
  p.rect(18, 15, 2, 5, S).rect(18, 15, 2, 1, SH);
  p.rect(12, 17, 6, 2, GD).rect(10, 18, 9, 1, GD);                  // Flügel
  p.rect(4, 11, 12, 3, '#5a5e58').rect(4, 11, 12, 1, '#7d827a').rect(14, 13, 2, 2, '#5a5e58');
  p.rect(5, 14, 2, 1, '#5a5e58');
  p.rect(5, 15, 3, 4, G).rect(6, 15, 1, 4, S);                      // Leitwerk
  p.rect(1, 11, 3, 3, PAL.feuer).px(1, 12, '#f7d26a').px(2, 12, '#fff2b0');
  p.px(29, 17, '#c0c4c8');
  schatten(p, 16, 6);
});

einheit('lenkrakete', (p) => {
  gedreht(p, -0.6, 16, 15, (q) => {
    q.rect(9, 14, 16, 3, '#e8ebee').rect(9, 14, 16, 1, '#ffffff').rect(9, 16, 16, 1, '#b8bec4');
    q.poly([[25, 14], [29, 15], [25, 16]], S); q.px(25, 14, SH);
    q.rect(19, 14, 1, 3, S);
    q.poly([[9, 13], [12, 13], [9, 10]], '#9aa3aa'); q.poly([[9, 17], [12, 17], [9, 20]], '#7a838a');
    q.poly([[18, 13], [20, 13], [18, 11]], '#9aa3aa'); q.poly([[18, 17], [20, 17], [18, 19]], '#7a838a');
    q.rect(6, 14, 3, 3, PAL.feuer).px(5, 15, '#f7d26a').px(7, 15, '#fff2b0');
  });
  // Rauchspur
  for (const [x, y, r] of [[5, 24, 1.5], [3, 26, 1.8], [7, 22, 1.2]]) p.ellipse(x, y, r, r, '#c8c8c8');
  schatten(p, 18, 4);
});

einheit('atomwaffe', (p) => {
  // senkrechte Interkontinentalrakete mit Strahlenzeichen
  p.rect(13, 6, 6, 18, '#e8ebee').rect(13, 6, 1, 18, '#ffffff').rect(18, 6, 1, 18, '#aeb5bb');
  p.poly([[13, 6], [16, 1], [18, 6]], S); p.px(15, 3, SH).px(14, 5, SH).px(18, 5, SD);
  p.rect(13, 7, 6, 1, SD);
  p.rect(13, 20, 6, 1, S);
  // Strahlenzeichen
  p.kreis(15.5, 13.5, 2.6, '#f1c40f');
  const ks = [[15, 11], [16, 11], [15, 12], [16, 12], [13, 14], [14, 14], [14, 15], [17, 14], [18, 14], [17, 15]];
  for (const [x, y] of ks) p.px(x, y, SCHWARZ);
  p.px(15, 13, SCHWARZ).px(16, 13, SCHWARZ).px(15, 14, SCHWARZ).px(16, 14, SCHWARZ);
  // Flossen und Triebwerk
  p.poly([[13, 19], [10, 24], [13, 24]], '#8a939a'); p.poly([[18, 19], [21, 24], [18, 24]], '#5f686e');
  p.rect(14, 24, 4, 1, '#4a4f53');
  p.rect(14, 25, 4, 2, PAL.feuer).rect(15, 25, 2, 3, '#f7d26a').px(15, 25, '#fff2b0').px(16, 25, '#fff2b0');
  for (const [x, y, r] of [[10, 28, 2], [21, 28, 2], [7, 29, 1.4], [24, 29, 1.4]]) p.ellipse(x, y, r, r * 0.7, '#bdbdbd');
});
