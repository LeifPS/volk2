// Landeinheiten (zivil, Späher, Händler, Nahkampf, Fernkampf, Reiter, Belagerung, Flak, Sanitäter).
// 32x32, Blick nach rechts, Füße/Ketten unten bei y≈30, Licht von oben links. Spielerfarbe über 'S', 'S-', 'S+'.
// Der Krieger steht in beispiel.js.
import { definiere } from '../sprites.js';
import { PAL, hell, dunkel, mische, Pinsel, UMRISS } from '../pixel.js';

const S = 'S', SD = 'S-', SH = 'S+', SDD = 'S--';
const SP = { S: 1, 'S-': 1, 'S+': 1, 'S--': 1 };
/** Dunkler/heller Ton, funktioniert auch mit Spielerfarben-Platzhaltern. */
const dk = (c, t = 0.25) => (c === S ? SD : c === SH ? S : c === SD ? SDD : c === SDD ? SDD : dunkel(c, t));
const hl = (c, t = 0.25) => (c === S ? SH : c === SD ? S : c === SDD ? SD : c === SH ? SH : hell(c, t));

// Zusatzfarben
const C = {
  feldgrau: '#6e7866', feldgrauD: '#4e5649', feldgrauH: '#8e9886',
  sand: '#c9b27c', sandD: '#9c8658', sandH: '#e0cc98',
  tarnG: '#56693a', tarnB: '#6e5638', tarnS: '#2c2a24', tarnH: '#8a9a5c',
  kette: '#35312d', ketteH: '#5c564e', reifen: '#262422', felge: '#8c8f88',
  schwarzH: '#3c3834', blut: '#a8241c', kreuz: '#d2261c',
  messing: '#d4a640', stroh: '#e2c46a', strohD: '#b8963e',
  fell: '#8a6a48', fellD: '#5e4630', kamel: '#c79a5c', kamelD: '#9c7440',
  grau: '#7c7a80', grauD: '#5a585e', grauH: '#a4a2a8',
  plane: '#e6dcc2', planeD: '#bcb094', khaki: '#b8a878', khakiD: '#8c7e54',
  dunkelgelb: '#c2a45e', dunkelgelbD: '#977d42', rotbraun: '#7a4a32', nato: '#4a5a34',
};

// ---------------------------------------------------------------- Grundwerkzeuge

/** Zeichnet fn auf ein eigenes Blatt, schattiert es optional, setzt optional einen inneren Umriss und überträgt (mit Versatz). */
function lage(p, fn, o = {}) {
  const t = new Pinsel(p.w, p.h); fn(t);
  if (o.schatten !== 0) t.schattieren(o.schatten ?? 0.18);
  if (o.rand) t.umriss(o.rand === true ? UMRISS : o.rand);
  const dx = o.dx || 0, dy = o.dy || 0;
  for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) { const c = t.feld[y * t.w + x]; if (c) p.px(x + dx, y + dy, c); }
}
/** Linie mit Dicke (zusätzliche Linien nach unten bzw. rechts versetzt). */
function strich(p, x0, y0, x1, y1, c, d = 2, senk = false) {
  for (let i = 0; i < d; i++) senk ? p.linie(x0 + i, y0, x1 + i, y1, c) : p.linie(x0, y0 + i, x1, y1 + i, c);
}
/** Rohr unter Winkel (Grad, 0 = rechts, positiv = nach oben). */
function rohr(p, x, y, laenge, winkel, dicke, c, cH) {
  const r = winkel * Math.PI / 180, ex = Math.cos(r), ey = -Math.sin(r);
  for (let i = 0; i <= laenge; i += 0.5) for (let k = 0; k < dicke; k++) {
    const px = x + ex * i + (-ey) * k * 0.9, py = y + ey * i + ex * k * 0.9;
    p.px(px, py, k === 0 && cH ? cH : c);
  }
  return [Math.round(x + ex * laenge), Math.round(y + ey * laenge)];
}
/** Speichenrad. */
function rad(p, cx, cy, r, o = {}) {
  const ring = o.ring || PAL.holzD, sp = o.speiche || PAL.holz, nabe = o.nabe || PAL.eisenD;
  p.kreis(cx, cy, r, ring);
  if (r >= 2) p.kreis(cx, cy, r - 1, o.innen ?? null);
  if (r >= 2 && !o.innen) { // Speichen
    for (let i = -r + 1; i <= r - 1; i++) { p.px(cx + i, cy, sp); p.px(cx, cy + i, sp); }
    if (r >= 3) for (let i = 1; i < r - 0.5; i++) { p.px(cx + i * 0.7, cy + i * 0.7, sp); p.px(cx - i * 0.7, cy - i * 0.7, sp); p.px(cx + i * 0.7, cy - i * 0.7, sp); p.px(cx - i * 0.7, cy + i * 0.7, sp); }
  }
  p.px(cx, cy, nabe);
  if (o.glanz) p.px(cx - r + 1, cy - r + 1, o.glanz);
}
/** Gummirad (Fahrzeuge). */
function reifen(p, cx, cy, r, felge = C.felge) {
  p.kreis(cx, cy, r, C.reifen);
  p.kreis(cx, cy, Math.max(0.6, r - 1.4), felge);
  p.px(cx, cy, dunkel(felge, 0.4));
  p.px(cx - r + 1, cy - r + 1, '#4a4642');
}
/** Kettenlaufwerk mit Laufrollen. */
function kette(p, x, y, w, h, o = {}) {
  const r = h / 2;
  p.rect(x + r, y, w - 2 * r, h, C.kette);
  p.ellipse(x + r, y + r - 0.5, r, r - 0.5, C.kette); p.ellipse(x + w - r - 1, y + r - 0.5, r, r - 0.5, C.kette);
  // Glieder
  for (let i = x + 1; i < x + w - 1; i += 2) { p.px(i, y, C.ketteH); p.px(i + 1, y + h - 1, C.ketteH); }
  const n = o.rollen ?? Math.max(3, Math.floor((w - 4) / (h - 1)));
  const rr = o.rollenR ?? Math.max(1, (h - 3) / 2);
  const farbe = o.rolle || C.felge;
  for (let i = 0; i < n; i++) {
    const cx = x + r + (w - 2 * r - 1) * (n === 1 ? 0.5 : i / (n - 1));
    p.kreis(cx, y + h / 2 - 0.5, rr, farbe);
    p.px(cx, y + h / 2 - 0.5, dunkel(farbe, 0.45));
  }
  if (o.antrieb !== false) { p.kreis(x + w - r - 1, y + r - 0.5, Math.max(1, r - 1.5), dunkel(farbe, 0.2)); }
}

// ---------------------------------------------------------------- Personen

/** Kopf in Seitenansicht (Blick rechts). (x,y) = links oben eines 6x5-Kastens. */
function kopf(p, x, y, o = {}) {
  const haut = o.haut || PAL.haut, haar = o.haar || PAL.haar;
  p.rect(x + 1, y, 3, 1, haar); p.rect(x, y + 1, 5, 1, haar);
  p.rect(x, y + 2, 2, 1, haar); p.px(x + 2, y + 2, haut); p.px(x + 3, y + 2, '#1e1814'); p.px(x + 4, y + 2, haut);
  p.px(x, y + 3, haar); p.rect(x + 1, y + 3, 5, 1, haut); p.px(x + 1, y + 3, PAL.hautD);
  p.rect(x + 1, y + 4, 4, 1, haut); p.px(x + 1, y + 4, PAL.hautD);
  if (o.bart) { p.rect(x + 2, y + 4, 3, 1, o.bart); p.px(x + 4, y + 3, o.bart); p.px(x + 2, y + 3, o.bart); }
  if (o.schnurrbart) p.rect(x + 4, y + 3, 2, 1, o.schnurrbart);
  if (o.haarLang) p.rect(x - 1, y + 1, 1, 4, haar);
}

/** Kopfbedeckungen. (x,y) wie bei kopf(). */
function helm(p, x, y, typ, o = {}) {
  const f = o.farbe;
  switch (typ) {
    case 'kappe': { const c = f || PAL.leder; p.rect(x + 1, y - 1, 3, 1, c).rect(x, y, 5, 1, c).rect(x - 1, y + 1, 6, 1, dk(c)); break; }
    case 'stirnband': { p.rect(x, y + 1, 5, 1, f || S); p.px(x - 1, y + 2, f || S); if (o.feder) { p.linie(x, y, x - 2, y - 4, PAL.weiss); p.px(x - 2, y - 4, '#c0392b'); } break; }
    case 'pelz': { const c = f || C.fell; p.rect(x, y - 2, 5, 3, c).rect(x - 1, y + 1, 7, 1, C.fellD); p.px(x + 1, y - 2, hell(c, 0.3)).px(x + 3, y - 3, c).px(x + 2, y - 3, S); break; }
    case 'spitzmuetze': { const c = f || S; p.rect(x, y - 1, 5, 2, c).rect(x - 1, y + 1, 6, 1, dk(c)); p.rect(x, y - 2, 3, 1, c).rect(x - 1, y - 3, 2, 1, c).px(x - 2, y - 3, dk(c)); break; }
    case 'bronze': { // korinthischer Helm mit Längskamm
      const b = PAL.bronze, bd = PAL.bronzeD;
      p.rect(x, y - 1, 5, 3, b).rect(x + 1, y - 2, 3, 1, b).rect(x - 1, y + 1, 1, 3, bd);
      p.rect(x, y + 2, 2, 3, bd); p.px(x + 2, y + 2, b); p.px(x + 4, y + 2, b); p.px(x + 4, y + 1, b); p.px(x + 3, y + 2, '#1e1814'); p.px(x + 1, y - 1, hell(b, 0.4));
      p.rect(x - 1, y - 4, 6, 2, S).rect(x - 2, y - 3, 1, 3, S).rect(x, y - 5, 4, 1, SH).px(x - 2, y - 4, SD).px(x + 5, y - 3, SD);
      break;
    }
    case 'galea': { // römischer Helm mit Querkamm
      const e = PAL.eisen;
      p.rect(x, y - 1, 5, 3, e).rect(x + 1, y - 2, 3, 1, e).rect(x - 1, y + 2, 2, 1, PAL.eisenD).px(x + 1, y - 1, PAL.eisenH);
      p.rect(x + 2, y + 2, 2, 2, PAL.messing); p.rect(x + 4, y + 1, 2, 1, PAL.eisenD);
      p.rect(x + 1, y - 5, 3, 3, S).px(x + 1, y - 5, SH).px(x + 2, y - 5, SH).px(x + 3, y - 3, SD);
      break;
    }
    case 'konisch': { // Spangenhelm mit Nasenschutz
      const e = PAL.eisen;
      p.px(x + 2, y - 2, e).rect(x + 1, y - 1, 3, 1, e).rect(x, y, 5, 2, e).px(x + 1, y - 1, PAL.eisenH).px(x + 2, y - 2, PAL.eisenH);
      p.rect(x, y + 1, 5, 1, PAL.bronze); p.px(x + 4, y + 2, PAL.eisenD).px(x + 4, y + 3, PAL.eisenD);
      p.rect(x - 1, y + 2, 2, 3, PAL.eisenD); // Kettennacken
      break;
    }
    case 'topf': { // Topfhelm
      const e = PAL.eisenH, d = PAL.eisen;
      p.rect(x, y - 1, 6, 6, d).rect(x, y - 1, 6, 1, e).rect(x, y - 1, 1, 6, e);
      p.rect(x + 2, y + 1, 4, 1, '#1e1814'); p.px(x + 4, y + 3, '#1e1814').px(x + 5, y + 3, '#1e1814');
      p.rect(x + 3, y - 1, 1, 6, PAL.gold);
      if (o.helmzier !== false) { p.rect(x + 1, y - 3, 3, 2, S).px(x, y - 4, SH).px(x + 1, y - 4, SH).px(x - 1, y - 4, S); }
      break;
    }
    case 'eisenhut': {
      const e = PAL.eisen;
      p.rect(x + 1, y - 2, 3, 1, e).rect(x, y - 1, 5, 2, e).px(x + 1, y - 2, PAL.eisenH).px(x, y - 1, PAL.eisenH);
      p.rect(x - 2, y + 1, 9, 1, PAL.eisenD).px(x - 2, y + 1, PAL.eisen);
      break;
    }
    case 'schaller': { // Schaller mit langem Nackenschirm
      const e = PAL.eisen;
      p.rect(x, y - 1, 5, 3, e).rect(x + 1, y - 2, 3, 1, e).px(x + 1, y - 1, PAL.eisenH);
      p.rect(x - 2, y + 1, 3, 1, PAL.eisenD).px(x - 3, y + 2, PAL.eisenD);
      p.rect(x + 3, y + 1, 3, 1, '#1e1814');
      break;
    }
    case 'kapuze': {
      const c = f || S;
      p.rect(x - 1, y - 1, 6, 3, c).rect(x - 1, y + 2, 3, 3, c).rect(x, y + 5, 3, 1, dk(c));
      p.px(x + 5, y, c); p.px(x - 2, y + 1, c).px(x - 3, y + 2, dk(c)).px(x - 3, y + 3, dk(c));
      p.rect(x, y - 1, 3, 1, hl(c));
      break;
    }
    case 'morion': {
      const e = PAL.eisenH;
      p.rect(x, y - 1, 5, 2, PAL.eisen).px(x + 2, y - 3, e).rect(x + 1, y - 2, 3, 1, e);
      p.rect(x - 1, y + 1, 7, 1, PAL.eisenD).px(x - 2, y, PAL.eisen).px(x + 6, y, PAL.eisen);
      p.px(x - 1, y - 2, PAL.weiss).px(x - 2, y - 3, PAL.weiss);
      break;
    }
    case 'barett': {
      p.rect(x - 1, y - 1, 7, 2, S).rect(x - 2, y, 1, 1, SD).rect(x, y - 1, 4, 1, SH);
      // große Federn
      p.linie(x - 1, y - 2, x - 3, y - 6, PAL.weiss).linie(x, y - 2, x - 1, y - 6, SH).linie(x + 1, y - 2, x + 2, y - 5, PAL.weiss).px(x - 4, y - 7, PAL.weiss).px(x - 1, y - 7, SH);
      break;
    }
    case 'dreispitz': {
      const k = '#1e1c1e';
      p.rect(x - 1, y - 1, 7, 2, k).rect(x, y - 2, 5, 1, k).px(x - 2, y - 2, k).px(x + 6, y - 2, k);
      p.rect(x - 1, y, 7, 1, PAL.gold).px(x - 2, y - 2, PAL.gold).px(x + 6, y - 2, PAL.gold);
      p.px(x + 3, y - 1, S);
      break;
    }
    case 'pickelhaube': {
      const k = '#232022';
      p.rect(x, y - 1, 5, 3, k).rect(x + 1, y - 2, 3, 1, k).px(x + 1, y - 1, '#4a4448');
      p.rect(x + 4, y + 1, 2, 1, k); p.rect(x - 1, y + 1, 1, 1, k);
      p.px(x + 3, y, PAL.gold).px(x + 3, y + 1, PAL.goldD);
      p.px(x + 2, y - 3, PAL.gold).px(x + 2, y - 4, PAL.gold).px(x + 2, y - 2, PAL.goldD);
      break;
    }
    case 'stahlhelm': {
      const c = f || C.feldgrau;
      p.rect(x, y - 2, 5, 3, c).rect(x + 1, y - 3, 3, 1, c).px(x + 1, y - 2, hl(c));
      p.rect(x - 1, y + 1, 2, 2, dk(c)).px(x - 2, y + 2, dk(c)); p.rect(x + 4, y + 1, 2, 1, dk(c));
      if (o.abzeichen) p.rect(x + 1, y - 1, 2, 2, o.abzeichen);
      break;
    }
    case 'rundhelm': { // Fallschirmjäger
      const c = f || C.feldgrau;
      p.rect(x, y - 2, 5, 4, c).rect(x + 1, y - 3, 3, 1, c).px(x + 1, y - 2, hl(c)).rect(x - 1, y - 1, 1, 3, dk(c));
      p.px(x + 4, y + 3, PAL.lederD).px(x + 3, y + 4, PAL.lederD);
      break;
    }
    case 'gefechtshelm': { // moderner Helm mit Nachtsicht
      const c = f || C.tarnG;
      p.rect(x - 1, y - 2, 6, 4, c).rect(x, y - 3, 4, 1, c).px(x, y - 2, hl(c)).px(x + 2, y - 1, C.tarnB).px(x - 1, y, C.tarnB).px(x + 3, y - 3, C.tarnB);
      p.rect(x + 4, y - 2, 2, 2, '#26282a').px(x + 6, y - 2, '#3c4044').px(x + 6, y - 1, '#5ab84a');
      p.px(x - 1, y + 2, dk(c));
      break;
    }
    case 'tropenhelm': {
      const c = f || C.sandH;
      p.rect(x, y - 3, 5, 3, c).rect(x + 1, y - 4, 3, 1, c).px(x + 1, y - 3, PAL.weiss);
      p.rect(x - 1, y, 7, 1, C.sand).px(x - 2, y + 1, C.sandD).px(x + 6, y + 1, C.sandD).rect(x, y - 1, 5, 1, S);
      break;
    }
    case 'strohhut': {
      p.rect(x, y - 2, 5, 2, C.stroh).rect(x - 2, y, 9, 1, C.strohD).px(x - 2, y, C.stroh).rect(x, y - 1, 5, 1, S).px(x + 1, y - 2, hell(C.stroh, 0.3));
      break;
    }
    case 'bauhelm': {
      const g = '#f2c21a';
      p.rect(x, y - 2, 5, 3, g).rect(x + 1, y - 3, 3, 1, g).px(x + 1, y - 2, '#fbe58a').rect(x - 1, y + 1, 1, 1, '#c89a10').rect(x + 4, y + 1, 3, 1, '#c89a10');
      p.px(x + 2, y - 3, '#fbe58a');
      break;
    }
    case 'tschako': { // Kavallerie
      p.rect(x, y - 4, 5, 5, S).rect(x, y - 4, 5, 1, PAL.gold).rect(x + 4, y + 1, 2, 1, '#1e1c1e').rect(x, y, 5, 1, '#1e1c1e').px(x + 1, y - 3, SH);
      p.rect(x + 2, y - 7, 1, 3, PAL.weiss).px(x + 1, y - 7, PAL.weiss).px(x + 3, y - 2, PAL.gold);
      break;
    }
    case 'kuerass': { // Kürassierhelm mit Rosshaarbusch
      const e = PAL.eisenH;
      p.rect(x, y - 2, 5, 3, PAL.eisen).rect(x + 1, y - 3, 3, 1, e).px(x + 1, y - 2, e).rect(x + 4, y + 1, 2, 1, PAL.eisenD).rect(x - 1, y + 1, 2, 2, PAL.eisenD);
      p.rect(x + 1, y - 4, 4, 1, PAL.messing).px(x + 4, y - 3, PAL.messing);
      p.linie(x + 1, y - 4, x - 3, y - 1, '#1e1c1e').linie(x, y - 4, x - 3, y, '#1e1c1e').px(x - 3, y + 1, '#1e1c1e');
      break;
    }
    case 'barettS': { const c = f || S; p.rect(x - 1, y - 1, 6, 2, c).rect(x, y - 2, 4, 1, hl(c)).px(x + 5, y, dk(c)); break; }
    case 'muetze': { const c = f || C.feldgrau; p.rect(x, y - 1, 5, 2, c).rect(x + 4, y + 1, 2, 1, '#1e1c1e').px(x + 2, y, o.abzeichen || S); break; }
  }
}

/**
 * Stehende/kniende Figur (Blick rechts). Füße bei y=30.
 * o: haut, haar, hose, schuh, rumpf, rock, rockLang, guertel, arm, armHinten, hand ([x,y] vordere Hand), handHinten,
 *    pose ('stehen'|'schritt'|'knien'), dx, helm, helmOpt, bart, ruestung(fn)
 */
function person(p, o = {}) {
  const t = new Pinsel(p.w, p.h);
  const haut = o.haut || PAL.haut;
  const rumpf = o.rumpf || S;
  const hose = o.hose || haut;
  const schuh = o.schuh || PAL.lederD;
  const rock = o.rock === undefined ? rumpf : o.rock;
  const arm = o.arm || rumpf;
  const armH = o.armHinten || dk(arm, 0.2);
  const knien = o.pose === 'knien';
  const u = knien ? 4 : 0; // Oberkörper absenken
  const handH = o.handHinten || [12, 22 + u];
  const hand = o.hand || [19, 22 + u];
  lage(t, (q) => {
    // hinterer Arm
    if (o.armHintenVor !== true) { strich(q, 13, 18 + u, handH[0], handH[1], armH, 2, true); q.px(handH[0], handH[1] + 1, PAL.hautD).px(handH[0] + 1, handH[1] + 1, PAL.hautD); }
    // Beine
    const hD = dk(hose, 0.18);
    if (knien) {
      // hinteres Knie am Boden
      q.rect(12, 26, 3, 3, hD); q.rect(9, 28, 5, 2, hD); q.rect(7, 29, 3, 2, schuh);
      // vorderes Bein: Oberschenkel waagrecht, Unterschenkel senkrecht
      q.rect(15, 25, 5, 3, hose); q.rect(18, 27, 3, 3, hose); q.rect(18, 29, 4, 2, schuh);
    } else if (o.pose === 'schritt') {
      strich(q, 13, 24, 11, 29, hD, 2, true); q.rect(10, 30, 3, 1, schuh); q.px(10, 29, schuh).px(11, 29, schuh);
      strich(q, 16, 24, 18, 29, hose, 2, true); q.rect(18, 30, 3, 1, schuh); q.px(18, 29, schuh).px(19, 29, schuh);
    } else {
      q.rect(12, 24, 2, 6, hD); q.rect(12, 29, 3, 2, schuh);
      q.rect(16, 24, 2, 6, hose); q.rect(16, 29, 3, 2, schuh);
      if (o.stiefel) { q.rect(12, 27, 2, 2, schuh); q.rect(16, 27, 2, 2, schuh); }
    }
    // Rumpf
    q.rect(12, 17 + u, 7, 5, rumpf); q.px(12, 17 + u, null);
    q.rect(12, 22 + u, 7, 1, o.guertel || PAL.leder);
    if (rock) q.rect(12, 23 + u, 7, o.rockLang ? 4 : 2, rock);
    if (o.rockLang) q.rect(11, 25 + u, 1, 2, dk(rock));
  }, { schatten: 0.15 });
  for (let i = 0; i < t.feld.length; i++) if (t.feld[i]) p.feld[i] = t.feld[i];
  t.feld.fill(null);
  if (o.ruestung) o.ruestung(p, u);
  // Kopf
  kopf(p, 13, 11 + u, { haut, haar: o.haar, bart: o.bart, schnurrbart: o.schnurrbart, haarLang: o.haarLang });
  if (o.helm) helm(p, 13, 11 + u, o.helm, o.helmOpt || {});
  if (o.ohneArm) return;
  // vorderer Arm
  strich(p, 17, 18 + u, hand[0] - 1, hand[1], arm, 2, true);
  p.px(17, 18 + u, hl(arm));
  p.px(hand[0], hand[1], haut).px(hand[0], hand[1] + 1, PAL.hautD);
}
/** Vorderer Arm nachträglich (über Waffen). */
function armVorne(p, x0, y0, x1, y1, c, haut = PAL.haut) { strich(p, x0, y0, x1 - 1, y1, c, 2, true); p.px(x1, y1, haut).px(x1, y1 + 1, PAL.hautD); }

// Waffen
function speer(p, x0, y0, x1, y1, o = {}) {
  p.linie(x0, y0, x1, y1, o.schaft || PAL.holz);
  const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0);
  const sp = o.spitze || PAL.eisen;
  p.px(x1, y1, sp).px(x1 + dx, y1 + dy, sp).px(x1 + dx * 2, y1 + dy * 2, hl(sp, 0.4));
  if (o.breit) { p.px(x1 + dy, y1 - dx, sp).px(x1 - dy, y1 + dx, sp); }
}
function rundschild(p, cx, cy, rx, ry, o = {}) {
  p.ellipse(cx, cy, rx, ry, o.rand || PAL.holzD);
  p.ellipse(cx, cy, rx - 1, ry - 1, o.feld || S);
  if (o.muster) o.muster(p);
  p.px(cx, cy, o.buckel || PAL.eisenH);
  p.px(cx - rx + 1, cy - ry + 2, hl(o.feld || S));
}
function bogen(p, x, y0, y1, o = {}) { // Bogen nach rechts gewölbt, x = Griff
  const h = y1 - y0, c = o.farbe || PAL.holz;
  const mid = (y0 + y1) / 2;
  for (let y = y0; y <= y1; y++) { const t = (y - mid) / (h / 2); p.px(x + Math.round((1 - t * t) * (o.woelb ?? 2)), y, c); }
  if (o.reflex) { p.px(x - 1, y0, c).px(x - 1, y1, c); p.px(x - 2, y0 - 1, o.horn || PAL.weiss).px(x - 2, y1 + 1, o.horn || PAL.weiss); }
  p.linie(x - (o.zug || 0), Math.round(mid), x, y0, '#cfc6b2'); p.linie(x - (o.zug || 0), Math.round(mid), x, y1, '#cfc6b2');
}
function koecher(p, x, y, o = {}) {
  p.rect(x, y, 2, 7, o.farbe || PAL.leder).px(x + 1, y + 1, PAL.lederD);
  p.px(x, y - 1, PAL.weiss).px(x + 1, y - 2, '#c0392b').px(x - 1, y - 1, PAL.weiss).px(x + 1, y - 1, PAL.holzH);
}
function gewehr(p, x, y, laenge, o = {}) { // waagrecht nach rechts, Kolben bei x
  const holz = o.holz || PAL.holz, lauf = o.lauf || PAL.eisenD;
  p.rect(x, y, 3, 2, holz).rect(x + 3, y, Math.max(2, Math.floor(laenge / 2) - 2), 1, holz);
  p.rect(x + 3, y + 1, 1, 1, PAL.schwarz);
  p.rect(x + 3, y - 1, laenge - 3, 1, lauf);
  if (o.bajonett) p.rect(x + laenge, y - 1, 3, 1, PAL.eisenH);
}

// ---------------------------------------------------------------- Pferde

/**
 * Pferd (Blick rechts), Hufe bei y=30. o: farbe, maehne, galopp, schabracke(fn), panzer, decke, dx
 */
function pferd(p, o = {}) {
  const k = o.farbe || '#8a5230', d = dk(k, 0.3), m = o.maehne || '#2e1c10', huf = '#1e1410';
  const g = o.galopp;
  lage(p, (q) => {
    // ferne Beine
    if (g) { strich(q, 19, 23, 24, 26, d, 2); q.px(25, 27, huf).px(24, 27, huf); strich(q, 9, 23, 5, 28, d, 2, true); q.rect(4, 29, 2, 1, huf); }
    else { q.rect(19, 23, 2, 7, d); q.rect(19, 29, 2, 1, huf); q.rect(10, 23, 2, 7, d); q.rect(10, 29, 2, 1, huf); q.px(9, 25, d); }
    // Rumpf
    q.ellipse(14, 20.5, 7.5, 3.6, k);
    q.ellipse(20, 20.5, 3, 3.4, k);
    // Hals + Kopf
    q.poly([[18, 19], [22, 12], [25, 13], [24, 20]], k);
    q.poly([[22, 11], [24, 9.5], [26, 10.5], [29.5, 15], [29, 16.5], [27, 16.5], [24.5, 14.5]], k);
    q.px(23, 9, k).px(24, 8, k);
    // nahe Beine
    if (g) {
      strich(q, 21, 22, 27, 24, k, 2); q.rect(27, 25, 2, 1, huf); q.px(28, 24, k);
      strich(q, 8, 23, 2, 26, k, 2); q.rect(1, 27, 2, 1, huf); q.px(2, 26, k);
    } else {
      q.rect(21, 23, 2, 7, k); q.rect(21, 29, 2, 2, huf);
      q.rect(8, 23, 2, 3, k); q.rect(7, 25, 2, 5, k); q.rect(7, 29, 2, 2, huf);
    }
  }, { schatten: 0.2 });
  // Mähne + Schweif
  p.linie(22, 11, 19, 18, m).linie(23, 11, 20, 17, m).px(23, 9, m).px(24, 10, m);
  if (g) { p.linie(6, 18, 2, 18, m).linie(6, 19, 1, 20, m).px(3, 19, m); }
  else { p.linie(6, 18, 4, 21, m).linie(5, 18, 3, 25, m).linie(4, 22, 4, 26, m).px(3, 26, m); }
  p.px(25, 11, '#140e0a').px(29, 15, '#3a2418').px(26, 16, '#1e1410');
  if (o.blesse) p.linie(26, 11, 28, 14, PAL.weiss);
  // Zaumzeug
  p.linie(24, 13, 27, 15, PAL.lederD).px(25, 12, PAL.lederD);
  if (o.decke) { // Satteldecke
    p.rect(11, 17, 7, 5, o.decke).rect(11, 21, 7, 1, o.deckeRand || PAL.gold);
  }
}

/** Sitzender Reiter. (bx,by) = Sattelpunkt (Hüfte), Standard 14/17. */
function reiterFigur(p, o = {}) {
  const bx = o.x ?? 13, by = o.y ?? 16;
  const rumpf = o.rumpf || S, hose = o.hose || PAL.leder, schuh = o.schuh || PAL.lederD;
  lage(p, (q) => {
    // Hinterer Arm
    if (o.handHinten) strich(q, bx, by - 5, o.handHinten[0], o.handHinten[1], dk(o.arm || rumpf, 0.2), 2, true);
    q.rect(bx - 2, by - 6, 6, 6, rumpf); q.px(bx - 2, by - 6, null);
    q.rect(bx - 2, by, 6, 1, o.guertel || PAL.lederD);
    q.rect(bx - 2, by + 1, 6, 1, o.rock || hose);
    // Bein
    q.rect(bx + 1, by + 1, 4, 2, hose); q.rect(bx + 3, by + 2, 2, 5, hose); q.rect(bx + 3, by + 6, 3, 2, schuh);
    if (o.stiefel !== false) q.rect(bx + 3, by + 4, 2, 2, schuh);
  }, { schatten: 0.15, rand: true });
  if (o.ruestung) o.ruestung(p, bx, by);
  kopf(p, bx - 1, by - 11, { haar: o.haar, bart: o.bart, schnurrbart: o.schnurrbart });
  if (o.helm) helm(p, bx - 1, by - 11, o.helm, o.helmOpt || {});
  if (o.hand) { strich(p, bx + 2, by - 5, o.hand[0] - 1, o.hand[1], o.arm || rumpf, 2, true); p.px(bx + 2, by - 5, hl(o.arm || rumpf)); p.px(o.hand[0], o.hand[1], PAL.haut).px(o.hand[0], o.hand[1] + 1, PAL.hautD); }
}

// ---------------------------------------------------------------- Einheiten: zivil

definiere('einheit', 'siedler', {
  w: 32, h: 32,
  zeichne(p) {
    // großes Bündel auf dem Rücken
    lage(p, (q) => { q.ellipse(9, 17, 4, 5, C.plane); q.rect(6, 13, 6, 2, S); q.rect(5, 19, 8, 2, S); q.ellipse(10, 11, 2, 2, PAL.holz); q.px(9, 10, PAL.holzH); }, { schatten: 0.2 });
    p.linie(6, 14, 12, 21, PAL.planeD).px(8, 17, C.planeD).px(10, 15, C.planeD);
    p.rect(4, 22, 3, 3, '#6a6460').rect(4, 22, 3, 1, '#8c8680'); // Kochtopf
    person(p, { rumpf: C.khaki, rock: C.khakiD, arm: C.khaki, hose: PAL.leder, haar: '#6a4a30', bart: '#6a4a30', helm: 'strohhut', pose: 'schritt', hand: [21, 20], handHinten: [12, 21] });
    // Riemen
    p.linie(13, 17, 17, 22, PAL.lederD);
    // Wanderstab mit Fahne
    p.linie(22, 6, 22, 30, PAL.holz).px(22, 6, PAL.holzH);
    p.rect(23, 6, 6, 4, S).rect(23, 6, 6, 1, SH).px(28, 9, null).rect(23, 9, 4, 1, SD);
    armVorne(p, 17, 18, 21, 19, C.khaki);
  },
});

definiere('einheit', 'arbeiter', {
  w: 32, h: 32,
  zeichne(p) {
    person(p, { rumpf: S, rock: C.khakiD, arm: S, hose: C.khaki, helm: 'kappe', helmOpt: { farbe: C.stroh }, ohneArm: true, pose: 'schritt' });
    // Spitzhacke über der Schulter
    p.linie(9, 14, 22, 20, PAL.holz).linie(9, 15, 21, 20, PAL.holzD);
    p.poly([[6, 18], [7, 13], [10, 10], [12, 9], [9, 13], [8, 16]], PAL.eisen); p.px(10, 10, PAL.eisenH).px(11, 9, PAL.eisenH);
    p.px(5, 19, PAL.eisenD);
    armVorne(p, 17, 18, 18, 15, S);
    // Schaufel in der hinteren Hand
    p.linie(25, 12, 25, 26, PAL.holzH); p.rect(24, 26, 3, 4, PAL.eisen).px(24, 26, PAL.eisenH).rect(24, 11, 3, 1, PAL.holzD);
    armVorne(p, 18, 20, 24, 22, S);
  },
});

definiere('einheit', 'ingenieur', {
  w: 32, h: 32,
  zeichne(p) {
    // Werkzeugkiste
    lage(p, (q) => { q.rect(3, 25, 7, 5, '#c0392b'); q.rect(3, 25, 7, 1, '#e05a48'); q.rect(5, 23, 3, 1, PAL.eisenD); q.px(5, 24, PAL.eisenD).px(7, 24, PAL.eisenD); });
    p.px(4, 27, PAL.eisenH).px(8, 27, PAL.eisenH);
    person(p, {
      rumpf: '#3d5f8a', rock: '#3d5f8a', arm: '#3d5f8a', hose: '#3d5f8a', schuh: '#2a2420', helm: 'bauhelm', guertel: PAL.lederD, stiefel: true,
      hand: [21, 19], handHinten: [12, 22],
      ruestung(q) { q.rect(13, 17, 5, 5, S).rect(15, 17, 1, 5, SH); q.rect(12, 20, 7, 1, '#f2c21a'); q.px(14, 19, PAL.weiss); },
    });
    // Schraubenschlüssel erhoben
    p.linie(22, 18, 25, 12, PAL.eisen).px(25, 11, PAL.eisenH).px(26, 11, PAL.eisen).px(24, 10, PAL.eisen).px(26, 12, PAL.eisen).px(25, 12, null);
    p.px(23, 16, PAL.eisenD).px(24, 14, PAL.eisenH);
    // Bauplan unter dem Arm
    p.rect(9, 19, 2, 5, '#5f8fd0').px(9, 19, '#9fc3ee');
  },
});

// ---------------------------------------------------------------- Späher

definiere('einheit', 'spaeher', {
  w: 32, h: 32,
  zeichne(p) {
    // kurzer Umhang
    // wehender Umhang
    lage(p, (q) => { q.poly([[13, 17], [6, 25], [8, 27], [11, 25], [14, 20]], S); q.linie(12, 18, 7, 25, SH); });
    // Wanderstab
    p.linie(9, 10, 11, 30, PAL.holzH).px(9, 10, PAL.holz).px(8, 9, PAL.holz);
    person(p, { rumpf: PAL.leder, rock: PAL.lederD, arm: PAL.haut, hose: PAL.haut, helm: 'stirnband', helmOpt: { feder: true }, pose: 'schritt', hand: [23, 14], handHinten: [10, 21] });
    // zeigender Finger
    p.px(24, 13, PAL.haut);
    // Signalhorn am Riemen
    p.linie(13, 17, 18, 22, PAL.lederD); p.rect(17, 22, 3, 2, PAL.weiss).px(20, 22, PAL.stoffD).px(16, 23, PAL.stoffD);
  },
});

definiere('einheit', 'kundschafter', {
  w: 32, h: 32,
  zeichne(p) {
    pferd(p, { farbe: '#b88a52', maehne: '#f0e4c8', blesse: true, decke: SD, deckeRand: S });
    // Umhang
    lage(p, (q) => { q.poly([[11, 10], [6, 17], [8, 19], [12, 15]], S); q.px(6, 17, SD); }, { rand: true });
    reiterFigur(p, { rumpf: '#5a7a3a', hose: C.khaki, helm: 'kapuze', helmOpt: { farbe: S }, hand: [19, 7], handHinten: [16, 12] });
    // Fernrohr am Auge
    p.linie(17, 7, 22, 5, PAL.messing).linie(18, 8, 22, 6, PAL.goldD).px(23, 5, PAL.eisenD).px(23, 6, PAL.eisenD);
    // Karte in der anderen Hand
    p.rect(16, 11, 4, 3, PAL.weiss).px(17, 12, '#c0392b').px(18, 12, PAL.stoffD).linie(16, 13, 19, 11, PAL.stoffD);
  },
});

definiere('einheit', 'entdecker', {
  w: 32, h: 32,
  zeichne(p) {
    // großer Rucksack mit Schlafrolle
    lage(p, (q) => { q.rect(6, 16, 6, 9, PAL.leder); q.rect(6, 14, 7, 3, S); q.px(6, 14, SD); q.rect(7, 19, 4, 3, PAL.lederD); q.rect(5, 25, 7, 2, C.khakiD); });
    p.rect(9, 12, 2, 2, '#c8a040').px(9, 11, PAL.eisenD); // Laterne
    p.px(9, 12, '#fff2a0');
    person(p, { rumpf: C.khaki, rock: C.khakiD, arm: C.khaki, hose: C.khakiD, schuh: '#3a2a1c', stiefel: true, helm: 'tropenhelm', schnurrbart: '#6a4a30', hand: [21, 17], handHinten: [12, 22] });
    // Machete
    p.linie(22, 16, 27, 9, PAL.eisenH).linie(23, 16, 27, 10, PAL.eisen).px(21, 17, PAL.lederD).px(22, 18, PAL.lederD);
    // Kompass am Gürtel
    p.px(16, 22, PAL.messing).px(17, 22, PAL.gold);
  },
});

definiere('einheit', 'fernaufklaerer', {
  w: 32, h: 32,
  zeichne(p) {
    const k = C.tarnG;
    // Geländewagen
    lage(p, (q) => {
      q.rect(2, 19, 28, 6, k);
      q.poly([[20, 19], [23, 15], [29, 16], [30, 19]], k); // Motorhaube
      q.rect(26, 19, 4, 5, dunkel(k, 0.1));
      q.rect(3, 17, 7, 2, dunkel(k, 0.1)); // Heck
    });
    p.rect(2, 21, 28, 1, C.tarnB).rect(10, 22, 6, 1, C.tarnS).px(28, 18, C.tarnB);
    p.rect(13, 20, 6, 2, S).rect(13, 20, 6, 1, SH); // Erkennungsfeld
    p.rect(29, 19, 1, 2, '#f8e8a0'); // Scheinwerfer
    // Windschutzscheibe
    p.linie(20, 18, 21, 13, PAL.eisenD).linie(21, 13, 22, 13, PAL.eisenD).px(21, 15, PAL.glas).px(21, 16, PAL.glasD);
    // Besatzung
    kopf(p, 14, 12); helm(p, 14, 12, 'gefechtshelm');
    p.rect(14, 17, 5, 2, C.tarnG).px(18, 17, C.tarnB);
    kopf(p, 6, 11); helm(p, 6, 11, 'barettS');
    p.rect(6, 16, 5, 1, C.tarnG);
    // Funkgerät + Antenne
    p.rect(3, 14, 3, 3, '#3c4430').px(4, 14, '#5ab84a');
    p.linie(4, 13, 2, 1, '#2a2a2a'); p.px(2, 1, '#d23a2a');
    // MG vorn
    p.linie(18, 12, 26, 11, '#2a2a2a').px(19, 13, '#2a2a2a');
    reifen(p, 7, 26, 3.5); reifen(p, 24, 26, 3.5);
  },
});

// ---------------------------------------------------------------- Händler

definiere('einheit', 'karawane', {
  w: 32, h: 32,
  zeichne(p) {
    const k = C.kamel, d = C.kamelD, huf = '#4a3420';
    lage(p, (q) => {
      // ferne Beine (dünn, lang, mit Knie)
      q.rect(10, 20, 2, 5, d); q.rect(10, 25, 1, 5, d); q.rect(18, 20, 2, 5, d); q.rect(19, 25, 1, 5, d);
      q.ellipse(13, 17, 7, 3.6, k);
      q.ellipse(12, 13, 4, 3, k); // Höcker
      // Hals: nach vorn unten, dann hoch zum Kopf
      q.poly([[18, 14], [22, 16], [24, 16], [25, 11], [25, 8], [27, 8], [27, 12], [26, 18], [22, 20], [18, 19]], k);
      q.poly([[24, 7], [26, 5.5], [30, 7], [30, 9.5], [27, 10], [25, 9]], k); // Kopf
      q.rect(7, 20, 2, 5, k); q.rect(8, 25, 1, 5, k); q.rect(20, 20, 2, 5, k); q.rect(21, 25, 1, 5, k);
    }, { schatten: 0.2 });
    p.px(7, 24, d).px(20, 24, d).px(8, 24, d).px(21, 24, d);
    p.rect(7, 30, 3, 1, huf).rect(20, 30, 3, 1, huf).rect(9, 30, 3, 1, '#3a2818').rect(18, 30, 3, 1, '#3a2818');
    p.px(27, 7, '#1e1410').px(25, 5, d).px(30, 9, d).px(29, 9, '#6a4a2a');
    p.linie(6, 15, 5, 20, d).px(5, 21, '#3a2a1a');
    // Packen: Satteltaschen, Teppichrolle in Spielerfarbe, Ballen
    lage(p, (q) => {
      q.rect(7, 15, 4, 6, PAL.leder); q.rect(14, 15, 4, 6, PAL.leder);
      q.rect(7, 11, 11, 3, S); q.rect(7, 11, 11, 1, SH); q.ellipse(7, 12, 1, 1.4, SD);
      q.rect(9, 8, 4, 3, '#7a3a8a'); q.rect(13, 9, 3, 2, '#2a8a7a');
    }, { rand: true });
    p.px(8, 17, PAL.gold).px(15, 17, PAL.gold).px(9, 12, PAL.gold).px(13, 12, PAL.gold).px(10, 9, '#a85ab8');
    // Zaum und Führleine
    p.linie(26, 9, 29, 8, PAL.lederD).linie(28, 9, 30, 15, PAL.lederD);
    // Glöckchen
    p.px(24, 17, PAL.gold).px(24, 18, PAL.goldD);
  },
});

definiere('einheit', 'handelstross', {
  w: 32, h: 32,
  zeichne(p) {
    // Wagen mit Plane und Fässern, gezogen von einem Pferd (kleiner, rechts)
    lage(p, (q) => {
      q.rect(2, 19, 17, 4, PAL.holz); q.rect(2, 19, 17, 1, PAL.holzH);
      q.ellipse(10, 15, 8, 5, C.plane); q.rect(2, 15, 17, 4, C.plane);
      q.rect(19, 21, 5, 1, PAL.holzD); // Deichsel
    });
    for (let x = 4; x < 18; x += 4) p.linie(x, 11, x, 18, C.planeD);
    p.rect(3, 16, 15, 2, S).rect(3, 16, 15, 1, SH);
    p.px(2, 14, PAL.holzD).px(18, 14, PAL.holzD);
    rad(p, 6, 25, 4); rad(p, 16, 25, 4);
    // Fass und Kiste hinten
    p.rect(0, 20, 0, 0, null);
    // kleines Pferd
    lage(p, (q) => {
      const k = '#6a4a32', d = '#4a3222';
      q.rect(21, 23, 1, 7, d); q.rect(28, 23, 1, 7, d);
      q.ellipse(25, 20.5, 4.5, 2.6, k);
      q.poly([[27, 20], [29, 14], [31, 15], [30, 21]], k);
      q.rect(22, 23, 1, 7, k); q.rect(29, 23, 1, 7, k);
    }, { schatten: 0.2, rand: true });
    p.linie(28, 14, 27, 19, '#2a1a10').px(30, 15, '#140e0a').px(20, 21, '#2a1a10').px(20, 22, '#2a1a10');
    p.linie(22, 19, 26, 19, S);
    // Wächter mit Speer auf dem Bock
    kopf(p, 14, 4); helm(p, 14, 4, 'eisenhut');
    p.rect(14, 9, 5, 4, S).rect(14, 9, 5, 1, SH).rect(15, 9, 1, 4, PAL.eisen);
    p.linie(21, 1, 19, 14, PAL.holz).px(21, 1, PAL.eisenH).px(21, 2, PAL.eisen);
    p.px(19, 10, PAL.haut);
    // Goldkiste
    p.rect(8, 7, 5, 4, PAL.holzD).rect(8, 7, 5, 1, PAL.holzH).px(10, 9, PAL.gold).px(10, 8, PAL.gold);
  },
});

definiere('einheit', 'lastwagenkonvoi', {
  w: 32, h: 32,
  zeichne(p) {
    // hinterer Lastwagen (kleiner, versetzt)
    const lkw = (q, x, y, s) => {
      q.rect(x, y, 14 * s, 8 * s, C.plane);
      q.rect(x + 14 * s, y + 3 * s, 6 * s, 5 * s, '#4a6a4a');
      q.rect(x + 15 * s, y + 4 * s, 3 * s, 2 * s, PAL.glas);
      q.rect(x, y + 8 * s, 20 * s, 2 * s, '#3a3632');
    };
    lage(p, (q) => {
      q.rect(1, 10, 13, 7, C.planeD); q.rect(14, 12, 5, 5, '#3e5a3e'); q.rect(15, 13, 2, 2, PAL.glasD); q.rect(1, 17, 18, 2, '#2e2a28');
    }, { schatten: 0.12 });
    p.rect(2, 11, 11, 2, SD);
    reifen(p, 4, 19, 2); reifen(p, 16, 19, 2);
    // vorderer Lastwagen
    lage(p, (q) => {
      q.rect(6, 15, 17, 9, '#a0805a'); // Pritsche
      q.rect(23, 17, 7, 7, '#4a6a4a'); // Fahrerhaus
      q.rect(23, 17, 6, 1, '#6a8a6a');
      q.rect(6, 24, 24, 2, '#3a3632');
    }, { schatten: 0.18, rand: true });
    // Ladung: Kisten und Planen
    lage(p, (q) => { q.rect(7, 11, 6, 4, PAL.holzH); q.rect(14, 12, 5, 3, '#d8b04a'); q.rect(19, 13, 3, 2, PAL.holz); }, { rand: true });
    p.linie(7, 13, 12, 13, PAL.holzD).linie(10, 11, 10, 14, PAL.holzD);
    p.rect(7, 18, 15, 3, S).rect(7, 18, 15, 1, SH);
    p.px(14, 19, PAL.gold).px(13, 20, PAL.gold).px(15, 20, PAL.gold); // Münzzeichen
    p.rect(25, 18, 3, 3, PAL.glas).px(25, 18, '#cfe8f6');
    p.px(29, 22, '#f8e8a0').px(29, 23, '#f8e8a0');
    reifen(p, 11, 27, 3); reifen(p, 26, 27, 3);
  },
});

// ---------------------------------------------------------------- Nahkampf

definiere('einheit', 'speertraeger', {
  w: 32, h: 32,
  zeichne(p) {
    person(p, {
      rumpf: PAL.leder, rock: S, arm: PAL.haut, hose: PAL.haut, helm: 'kappe', haar: '#3a2418', hand: [19, 21], handHinten: [12, 22],
      ruestung(q) { q.rect(13, 18, 5, 3, PAL.lederD); q.px(15, 19, PAL.bronze); },
    });
    // langer Speer schräg nach vorn oben
    speer(p, 8, 30, 25, 3, { spitze: PAL.bronze, breit: true });
    p.px(19, 21, PAL.haut);
    // Weidenschild
    rundschild(p, 10, 21, 3, 5, { rand: PAL.holz, feld: S, buckel: PAL.bronze, muster(q) { q.linie(10, 17, 10, 25, SH); } });
  },
});

definiere('einheit', 'schwertkaempfer', {
  w: 32, h: 32,
  zeichne(p) {
    person(p, {
      rumpf: PAL.eisen, rock: S, arm: PAL.eisenD, hose: '#5a4a3a', helm: 'konisch', bart: '#7a4a2a', stiefel: true, hand: [21, 14], handHinten: [12, 22],
      ruestung(q) { for (let y = 17; y < 22; y++) for (let x = 12 + (y % 2); x < 19; x += 2) q.px(x, y, PAL.eisenD); q.rect(12, 22, 7, 1, PAL.lederD); q.px(15, 22, PAL.messing); },
    });
    // erhobenes Eisenschwert
    p.linie(22, 13, 27, 4, PAL.eisenH).linie(23, 13, 27, 5, PAL.eisen).px(28, 3, PAL.eisenH);
    p.linie(20, 12, 23, 15, PAL.messing).px(21, 15, PAL.lederD);
    // ovaler Schild mit Buckel
    rundschild(p, 10, 21, 4, 6, { rand: PAL.eisenD, feld: S, buckel: PAL.eisenH, muster(q) { q.rect(7, 21, 7, 1, SD); q.rect(10, 16, 1, 11, SD); } });
  },
});

definiere('einheit', 'hoplit', {
  w: 32, h: 32,
  zeichne(p) {
    person(p, {
      rumpf: '#a8702a', rock: PAL.weiss, arm: PAL.haut, hose: PAL.haut, helm: 'bronze', hand: [20, 18], handHinten: [12, 22],
      ruestung(q) { q.rect(13, 17, 5, 1, hell(PAL.bronze, 0.3)); q.rect(15, 18, 1, 3, PAL.bronzeD); q.rect(12, 23, 7, 2, PAL.stoff); for (let x = 12; x < 19; x += 2) q.px(x, 24, PAL.stoffD); q.rect(16, 26, 2, 3, PAL.bronze); },
    });
    // Speer über Kopf, waagrecht nach vorn
    speer(p, 3, 19, 28, 17, { spitze: PAL.bronze });
    p.px(20, 18, PAL.haut);
    // großer runder Bronzeschild (Aspis) mit Lambda
    rundschild(p, 10, 21, 6, 6, { rand: PAL.bronze, feld: S, buckel: SH, muster(q) { q.linie(10, 17, 7, 25, PAL.bronze); q.linie(10, 17, 13, 25, PAL.bronze); } });
    p.ellipse(10, 21, 6, 6, null);
    p.kreis(10, 21, 6, PAL.bronze); p.kreis(10, 21, 5, S); p.linie(10, 17, 7, 25, PAL.gold); p.linie(10, 17, 13, 25, PAL.gold); p.px(5, 18, hell(PAL.bronze, 0.4)).px(6, 17, hell(PAL.bronze, 0.4));
  },
});

definiere('einheit', 'legionaer', {
  w: 32, h: 32,
  zeichne(p) {
    person(p, {
      rumpf: PAL.eisen, rock: S, arm: S, hose: PAL.haut, helm: 'galea', hand: [21, 20], handHinten: [12, 22], schuh: PAL.leder,
      ruestung(q) { for (let y = 18; y < 22; y += 2) q.rect(12, y, 7, 1, PAL.eisenD); q.rect(13, 17, 4, 1, PAL.eisenH); q.rect(12, 23, 7, 2, S); for (let x = 12; x < 19; x += 2) q.px(x, 23, PAL.lederD); },
    });
    // Gladius nach vorn
    p.rect(21, 20, 6, 1, PAL.eisenH).px(27, 20, PAL.eisen).rect(21, 21, 5, 1, PAL.eisen).px(20, 19, PAL.messing).px(20, 22, PAL.messing);
    // Scutum: hoher rechteckiger Schild
    lage(p, (q) => {
      q.rect(5, 15, 8, 14, S); q.rect(5, 15, 1, 14, SH); q.rect(12, 15, 1, 14, SD);
      q.rect(5, 15, 8, 1, PAL.messing); q.rect(5, 28, 8, 1, PAL.messing);
      q.kreis(9, 21.5, 1.5, PAL.messing); q.px(9, 21, PAL.gold);
      q.linie(6, 18, 8, 20, PAL.gold); q.linie(12, 18, 10, 20, PAL.gold); q.linie(6, 25, 8, 23, PAL.gold); q.linie(12, 25, 10, 23, PAL.gold);
    }, { schatten: 0 });
  },
});

definiere('einheit', 'langschwertkaempfer', {
  w: 32, h: 32,
  zeichne(p) {
    const pl = PAL.eisenH;
    person(p, {
      rumpf: S, rock: S, arm: PAL.eisen, hose: PAL.eisen, schuh: PAL.eisenD, helm: 'topf', hand: [19, 21], handHinten: [12, 22], guertel: PAL.lederD,
      ruestung(q) {
        // Wappenrock mit Kreuz, Plattenbeine
        q.rect(15, 18, 1, 6, PAL.gold); q.rect(13, 19, 5, 1, PAL.gold);
        q.rect(12, 17, 2, 2, pl); q.rect(17, 17, 2, 2, pl);
        q.rect(16, 25, 2, 1, pl).rect(12, 25, 2, 1, PAL.eisen).px(16, 27, PAL.eisenD);
      },
    });
    // großes Langschwert senkrecht vor dem Körper
    p.rect(21, 3, 2, 17, PAL.eisenH).rect(22, 3, 1, 17, PAL.eisen).px(21, 2, PAL.eisenH).px(22, 2, null);
    p.rect(18, 20, 7, 1, PAL.eisenD).px(18, 20, PAL.gold).px(24, 20, PAL.gold);
    p.rect(21, 21, 2, 4, PAL.lederD).rect(21, 25, 2, 1, PAL.gold);
    armVorne(p, 17, 18, 20, 21, PAL.eisen, PAL.eisenD);
    p.rect(20, 21, 2, 2, PAL.eisenD);
  },
});

definiere('einheit', 'pikenier', {
  w: 32, h: 32,
  zeichne(p) {
    person(p, {
      rumpf: PAL.stoff, rock: S, arm: S, hose: SD, helm: 'eisenhut', hand: [19, 21], handHinten: [12, 22], stiefel: true,
      ruestung(q) { q.rect(12, 17, 7, 5, PAL.eisen); q.rect(13, 17, 2, 4, PAL.eisenH); q.rect(15, 18, 1, 3, PAL.eisenD); for (let y = 23; y < 25; y++) for (let x = 12; x < 19; x += 2) q.px(x, y, SH); },
    });
    // sehr lange Pike schräg über das ganze Bild
    p.linie(2, 29, 29, 1, PAL.holz);
    p.px(29, 1, PAL.eisenH).px(30, 0, null).px(28, 2, PAL.eisen).px(29, 2, PAL.eisen).px(28, 1, PAL.eisenH);
    p.px(19, 11, PAL.eisenD).px(18, 12, PAL.eisenD);
    p.px(19, 21, PAL.haut);
    armVorne(p, 13, 18, 12, 24, S);
  },
});

definiere('einheit', 'musketier', {
  w: 32, h: 32,
  zeichne(p) {
    person(p, {
      rumpf: S, rock: S, rockLang: true, arm: S, hose: PAL.weiss, schuh: '#1e1c1e', helm: 'dreispitz', haar: PAL.weiss, hand: [20, 18], handHinten: [12, 21], guertel: PAL.weiss,
      ruestung(q) { q.linie(12, 17, 18, 23, PAL.weiss); q.linie(18, 17, 12, 23, PAL.weiss); q.rect(17, 17, 2, 6, SH); q.px(17, 19, PAL.gold).px(17, 21, PAL.gold); q.rect(16, 26, 2, 3, PAL.weiss); },
    });
    // Muskete mit Bajonett, schräg vor der Brust
    p.linie(10, 28, 24, 6, PAL.holz).linie(11, 28, 25, 6, PAL.holzD);
    p.linie(15, 20, 25, 4, PAL.eisenD).linie(25, 4, 27, 1, PAL.eisenH);
    p.rect(9, 27, 3, 2, PAL.holzD);
    p.px(20, 18, PAL.haut).px(20, 19, PAL.hautD);
    armVorne(p, 13, 18, 14, 22, SD);
  },
});

definiere('einheit', 'landsknecht', {
  w: 32, h: 32,
  zeichne(p) {
    person(p, {
      rumpf: S, rock: PAL.gold, arm: S, hose: PAL.gold, schuh: PAL.schwarz, helm: 'barett', bart: '#a0602a', schnurrbart: '#a0602a', hand: [19, 21], handHinten: [12, 22],
      ruestung(q) {
        // geschlitzte Pluderkleidung
        for (let y = 17; y < 22; y++) q.px(13 + (y % 3) * 2, y, PAL.gold);
        q.rect(12, 23, 7, 2, PAL.gold); q.px(13, 23, S).px(16, 24, S).px(15, 23, '#c0392b');
        q.rect(12, 25, 2, 2, S).rect(16, 25, 2, 2, S).px(12, 26, PAL.gold).px(17, 25, PAL.gold);
        q.rect(16, 27, 2, 2, '#c0392b').rect(12, 27, 2, 2, PAL.gold);
      },
    });
    // Hellebarde
    p.linie(21, 2, 21, 30, PAL.holz);
    p.poly([[22, 4], [25, 3], [26, 6], [22, 7]], PAL.eisen); p.linie(22, 4, 25, 3, PAL.eisenH);
    p.px(20, 5, PAL.eisen).px(19, 6, PAL.eisen).px(21, 0, PAL.eisenH).px(21, 1, PAL.eisenH);
    p.px(21, 8, S).px(21, 9, S);
    p.px(20, 21, PAL.haut).px(20, 22, PAL.hautD);
    // Katzbalger am Gürtel
    p.linie(10, 25, 12, 22, PAL.eisen).px(12, 21, PAL.messing).px(11, 21, PAL.messing).px(13, 22, PAL.messing);
  },
});

definiere('einheit', 'gewehrschuetze', {
  w: 32, h: 32,
  zeichne(p) {
    person(p, {
      rumpf: S, rock: S, arm: S, hose: '#2e2e36', schuh: '#1a1818', stiefel: true, helm: 'pickelhaube', schnurrbart: '#5a3a20', hand: [21, 18], handHinten: [12, 21], guertel: '#1e1c1e',
      ruestung(q) { q.rect(18, 17, 1, 5, PAL.gold); for (let y = 18; y < 22; y += 2) q.px(17, y, PAL.gold); q.rect(12, 17, 2, 1, '#c0392b'); q.rect(13, 22, 2, 2, '#1e1c1e'); q.rect(16, 24, 2, 1, '#c0392b'); },
    });
    // Gewehr im Anschlag nach vorn, mit Bajonett
    p.rect(14, 18, 4, 2, PAL.holz).rect(18, 18, 6, 1, PAL.holz).rect(17, 17, 10, 1, PAL.eisenD).rect(27, 17, 3, 1, PAL.eisenH);
    p.px(18, 19, PAL.schwarz);
    p.px(21, 18, PAL.haut).px(22, 19, PAL.hautD);
    // Tornister
    p.rect(9, 17, 3, 6, '#5a3a20').rect(9, 16, 3, 1, '#2a1c10').px(10, 18, '#7a5a3a');
  },
});

definiere('einheit', 'infanterie', {
  w: 32, h: 32,
  zeichne(p) {
    const fg = C.feldgrau;
    person(p, {
      rumpf: fg, rock: fg, arm: fg, hose: fg, schuh: '#1e1c1a', stiefel: true, helm: 'stahlhelm', helmOpt: { abzeichen: S }, hand: [20, 20], handHinten: [12, 22], guertel: '#2a2420', pose: 'schritt',
      ruestung(q) { q.rect(12, 17, 7, 1, S); q.rect(13, 22, 2, 2, '#3a3028'); q.rect(16, 22, 2, 2, '#3a3028'); q.rect(13, 19, 1, 2, SH); },
    });
    // Sturmgepäck + Spaten
    p.rect(9, 17, 3, 6, C.feldgrauD).rect(9, 23, 2, 3, PAL.eisenD).px(10, 16, PAL.holz).px(10, 15, PAL.holz);
    // Gewehr schräg (Vorhalte)
    p.linie(13, 25, 26, 14, PAL.holz).linie(14, 25, 26, 15, PAL.holzD).linie(18, 21, 28, 12, '#2a2a2a');
    armVorne(p, 17, 18, 20, 20, fg);
  },
});

definiere('einheit', 'fallschirmjaeger', {
  w: 32, h: 32,
  zeichne(p) {
    // Fallschirm in Spielerfarbe
    lage(p, (q) => {
      q.ellipse(15.5, 6, 13, 5, S); q.rect(2, 6, 28, 5, null);
      for (let x = 3; x <= 28; x += 5) q.rect(x, 5, 2, 1, SH);
      q.rect(3, 6, 26, 1, SD);
      for (let x = 5; x <= 26; x += 7) q.rect(x, 3, 1, 4, SD);
    }, { schatten: 0 });
    p.rect(3, 2, 26, 1, null);
    // Leinen
    p.linie(3, 7, 13, 18, '#d8d0c0').linie(28, 7, 18, 18, '#d8d0c0').linie(10, 7, 14, 17, '#d8d0c0').linie(21, 7, 17, 17, '#d8d0c0');
    const k = '#7a8256';
    p.schiebe(0, -1);
    lage(p, (q) => {
      // Soldat schwebend (Beine angewinkelt)
      kopf(q, 13, 12); helm(q, 13, 12, 'rundhelm', { farbe: C.feldgrauD });
      q.rect(12, 17, 7, 6, k); q.px(13, 18, C.tarnB).px(16, 20, C.tarnB).px(17, 18, C.tarnS).px(14, 21, C.tarnS);
      q.rect(12, 23, 3, 4, '#5a6040'); q.rect(16, 23, 3, 3, '#5a6040'); q.rect(17, 26, 3, 2, '#5a6040');
      q.rect(11, 27, 4, 2, '#1e1c1a'); q.rect(17, 28, 4, 2, '#1e1c1a');
      q.rect(11, 15, 1, 5, k); q.rect(19, 15, 1, 5, k); q.px(11, 14, PAL.haut).px(19, 14, PAL.haut);
      q.rect(13, 22, 5, 1, S);
      // MP vor der Brust
      q.linie(13, 21, 19, 19, '#2a2a2a');
    }, { schatten: 0.15 });
  },
});

definiere('einheit', 'panzerabwehrtrupp', {
  w: 32, h: 32,
  zeichne(p) {
    const fg = C.feldgrau;
    person(p, {
      pose: 'knien', rumpf: fg, rock: fg, arm: fg, hose: fg, schuh: '#1e1c1a', helm: 'stahlhelm', helmOpt: { farbe: C.feldgrauD, abzeichen: S }, hand: [19, 25], handHinten: [12, 26], guertel: '#2a2420', ohneArm: true,
      ruestung(q) { q.rect(12, 21, 7, 1, S); },
    });
    // Panzerschreck: langes Rohr auf der Schulter, Schutzschild vor dem Gesicht
    lage(p, (q) => {
      q.rect(3, 19, 27, 2, '#4a5a38'); q.rect(3, 19, 27, 1, '#6a7a52');
      q.rect(2, 18, 2, 4, '#3a4a2c'); q.rect(29, 18, 2, 4, '#3a4a2c');
      q.rect(20, 21, 1, 3, '#2a2a2a');
    }, { rand: true });
    lage(p, (q) => { q.rect(19, 13, 3, 6, '#56663e'); q.rect(19, 13, 3, 1, '#7a8a62'); q.px(20, 15, '#8fc3e0'); }, { rand: true });
    p.rect(7, 19, 3, 1, S).rect(24, 19, 3, 1, S);
    armVorne(p, 17, 22, 20, 23, fg);
    // Munitionsträger: Rakete
    p.rect(4, 26, 5, 2, '#5a6040').px(9, 26, '#8a6a3a').px(9, 27, '#8a6a3a').px(3, 26, '#3a3a2a').px(3, 27, '#3a3a2a');
  },
});

definiere('einheit', 'moderne_infanterie', {
  w: 32, h: 32,
  zeichne(p) {
    const tg = C.tarnG;
    person(p, {
      rumpf: tg, rock: '#4a4a3a', arm: tg, hose: tg, schuh: '#3a3024', stiefel: true, helm: 'gefechtshelm', hand: [20, 19], handHinten: [12, 21], guertel: '#3a3a30',
      ruestung(q, u) {
        q.rect(12, 17, 7, 6, S); q.rect(12, 17, 7, 1, SH); q.rect(13, 19, 2, 2, SD); q.rect(16, 19, 2, 2, SD); q.px(17, 18, PAL.weiss);
        q.px(12, 25, C.tarnB).px(17, 26, C.tarnS).px(16, 28, C.tarnB).px(13, 27, C.tarnS);
        q.rect(15, 26, 3, 1, '#2a2a28'); // Knieschoner
      },
    });
    // Rucksack mit Funkantenne
    p.rect(9, 17, 3, 7, '#4a4a3a').px(9, 18, C.tarnB).linie(10, 16, 7, 6, '#222');
    // kompaktes Sturmgewehr mit Optik
    p.rect(15, 19, 4, 2, '#2a2a28').rect(19, 19, 8, 1, '#2a2a28').rect(18, 20, 3, 2, '#2a2a28').rect(20, 18, 3, 1, '#1a1a1a').px(22, 18, '#d03a2a').px(27, 19, '#1a1a1a');
    p.px(20, 19, PAL.haut);
    armVorne(p, 13, 18, 16, 20, tg);
  },
});

definiere('einheit', 'panzergrenadier', {
  w: 32, h: 32,
  zeichne(p) {
    const k = '#5c6a44', d = '#424e30';
    kette(p, 2, 24, 27, 6, { rollen: 6, rollenR: 1.5 });
    lage(p, (q) => {
      q.poly([[2, 23], [3, 15], [20, 15], [30, 20], [30, 23]], k);
      q.rect(2, 15, 3, 9, d); // Heckklappe
    });
    p.rect(2, 22, 28, 1, d).linie(20, 15, 30, 20, hell(k, 0.25));
    p.rect(7, 18, 9, 3, S).rect(7, 18, 9, 1, SH); // Seitenmarkierung
    for (let x = 6; x < 18; x += 3) p.px(x, 16, d); // Winkelspiegel
    p.rect(3, 17, 1, 4, '#2a2a2a');
    // kleiner Turm mit Maschinenkanone
    lage(p, (q) => { q.rect(13, 11, 8, 4, k); q.rect(14, 10, 5, 1, k); q.rect(21, 12, 9, 1, '#2a2a2a'); q.rect(20, 11, 2, 3, d); }, { rand: true });
    p.rect(19, 12, 1, 2, '#3a4a5a');
    // Grenadier in der Luke
    kopf(p, 6, 9); helm(p, 6, 9, 'gefechtshelm');
    p.rect(6, 14, 5, 1, C.tarnG).px(10, 14, S);
    // Nebelwerfer
    p.px(19, 10, '#2a2a2a').px(20, 10, '#2a2a2a');
  },
});

definiere('einheit', 'moderne_panzerabwehr', {
  w: 32, h: 32,
  zeichne(p) {
    const tg = C.tarnG;
    // Lenkwaffe auf Dreibein
    lage(p, (q) => {
      q.linie(19, 21, 15, 29, '#2a2a2a'); q.linie(20, 21, 24, 29, '#2a2a2a'); q.linie(20, 21, 20, 29, '#3a3a3a');
      q.rect(14, 15, 16, 3, '#5a6a46'); q.rect(14, 15, 16, 1, '#7a8a62'); q.rect(29, 14, 2, 5, '#4a5a38');
      q.rect(16, 18, 6, 3, '#3a3a36'); q.rect(16, 18, 6, 1, '#4e4e48'); q.rect(21, 19, 1, 1, '#8fc3e0');
    }, { rand: true });
    p.rect(24, 15, 2, 1, S).rect(25, 16, 1, 1, SD);
    // liegender Schütze mit Blick durchs Visier
    lage(p, (q) => {
      kopf(q, 9, 14); helm(q, 9, 14, 'gefechtshelm', { farbe: '#6a7a4a' });
      q.rect(3, 19, 10, 5, tg); q.px(5, 20, C.tarnB).px(9, 22, C.tarnS).px(11, 20, C.tarnB);
      q.rect(4, 19, 7, 3, S); q.rect(4, 19, 7, 1, SH);
      q.rect(1, 24, 12, 3, tg); q.px(3, 25, C.tarnS).px(8, 24, C.tarnB);
      q.rect(1, 27, 4, 3, '#3a3024'); q.rect(9, 27, 5, 3, '#4a4a3a');
      q.rect(12, 20, 4, 2, tg); q.px(15, 19, PAL.haut);
    }, { schatten: 0.15 });
  },
});

// ---------------------------------------------------------------- Fernkampf

definiere('einheit', 'schleuderer', {
  w: 32, h: 32,
  zeichne(p) {
    person(p, { rumpf: PAL.haut, rock: S, arm: PAL.haut, hose: PAL.haut, haar: '#2a1a10', haarLang: true, hand: [19, 11], handHinten: [10, 19], guertel: PAL.lederD, pose: 'schritt' });
    // Schleuder kreist über dem Kopf
    p.linie(19, 10, 23, 5, PAL.leder).px(24, 4, PAL.lederD);
    p.kreis(25, 3, 1.3, PAL.stein).px(25, 2, PAL.steinH);
    // Steinbeutel
    p.rect(11, 23, 3, 3, PAL.leder).px(12, 22, PAL.lederD);
    // Fellumhang
    p.rect(12, 17, 3, 2, C.fell).px(14, 17, C.fellD);
  },
});

definiere('einheit', 'bogenschuetze', {
  w: 32, h: 32,
  zeichne(p) {
    koecher(p, 10, 15);
    person(p, { rumpf: PAL.leder, rock: S, arm: S, hose: PAL.lederD, helm: 'stirnband', haar: '#5a3a20', hand: [16, 19], handHinten: [22, 18], armHintenVor: true });
    // Bogen gespannt
    bogen(p, 23, 9, 27, { zug: 6, woelb: 3, farbe: PAL.holz });
    p.linie(16, 18, 26, 18, PAL.holzH); p.px(27, 18, PAL.eisen).px(16, 17, PAL.weiss).px(16, 19, PAL.weiss);
    // ausgestreckter Arm zum Bogen
    strich(p, 17, 18, 22, 18, S, 2); p.px(23, 18, PAL.haut).px(23, 19, PAL.haut);
  },
});

definiere('einheit', 'kompositbogenschuetze', {
  w: 32, h: 32,
  zeichne(p) {
    // Goryt (Köcher mit Bogenfach)
    p.rect(9, 20, 3, 8, S).rect(9, 20, 3, 1, PAL.gold).px(10, 19, PAL.weiss).px(11, 18, '#c0392b');
    person(p, {
      rumpf: PAL.bronze, rock: S, arm: S, hose: '#8a3a2a', schuh: PAL.lederD, stiefel: true, helm: 'spitzmuetze', helmOpt: { farbe: '#c0392b' }, hand: [16, 18], handHinten: [22, 17], armHintenVor: true, bart: '#2a1a10',
      ruestung(q) { for (let y = 17; y < 22; y++) for (let x = 12 + (y % 2); x < 19; x += 2) q.px(x, y, PAL.bronzeD); for (let x = 12; x < 19; x += 2) q.px(x, 24, PAL.gold); },
    });
    // Reflexbogen mit Hornenden
    bogen(p, 24, 11, 25, { zug: 7, woelb: 2, reflex: true, farbe: '#5a3a1a', horn: '#efe6cf' });
    p.px(24, 17, PAL.weiss).px(24, 18, '#efe6cf');
    p.linie(17, 18, 27, 18, PAL.holzH); p.px(28, 18, PAL.eisen);
    strich(p, 17, 17, 23, 17, S, 2); p.px(24, 17, PAL.haut).px(24, 18, PAL.haut);
  },
});

definiere('einheit', 'berittener_bogenschuetze', {
  w: 32, h: 32,
  zeichne(p) {
    pferd(p, { farbe: '#d0c0a0', maehne: '#5a4a3a', galopp: true, decke: S, deckeRand: '#c0392b' });
    p.rect(8, 16, 3, 5, PAL.leder).px(9, 15, PAL.weiss).px(10, 14, '#c0392b'); // Köcher am Sattel
    reiterFigur(p, { rumpf: '#8a4a2a', hose: '#5a3a2a', helm: 'pelz', bart: '#2a1a10', hand: [16, 10], handHinten: [20, 10],
      ruestung(q, bx, by) { q.rect(bx - 2, by - 6, 6, 1, C.fell); q.px(bx, by - 3, S).px(bx + 1, by - 3, S); } });
    // Reflexbogen nach vorn
    bogen(p, 21, 4, 16, { zug: 5, woelb: 2, reflex: true, farbe: '#4a2a14' });
    p.linie(16, 10, 25, 10, PAL.holzH); p.px(26, 10, PAL.eisen);
    strich(p, 15, 10, 20, 10, '#8a4a2a', 2); p.px(21, 10, PAL.haut);
  },
});

definiere('einheit', 'armbrustschuetze', {
  w: 32, h: 32,
  zeichne(p) {
    // Setzschild (Pavese) hinter dem Schützen
    lage(p, (q) => {
      q.poly([[3, 12], [9, 11], [10, 29], [4, 30]], S);
      q.rect(6, 11, 1, 19, SD); q.linie(3, 12, 9, 11, SH);
      q.rect(5, 17, 3, 3, PAL.weiss); q.px(6, 18, '#c0392b');
      q.rect(4, 30, 6, 0, null);
    }, { schatten: 0 });
    person(p, {
      rumpf: '#8a7a5a', rock: S, arm: '#8a7a5a', hose: SD, helm: 'schaller', hand: [20, 19], handHinten: [16, 19], armHintenVor: true, stiefel: true,
      ruestung(q) { for (let y = 17; y < 22; y++) q.px(12 + (y % 3) * 2, y, '#6a5a3a'); q.rect(12, 17, 7, 1, PAL.eisen); },
    });
    // Armbrust im Anschlag
    lage(p, (q) => {
      q.rect(14, 18, 12, 2, PAL.holz); q.rect(14, 18, 12, 1, PAL.holzH);
      q.rect(25, 14, 1, 9, PAL.eisenD); q.px(25, 13, PAL.eisen).px(25, 23, PAL.eisen).px(24, 14, PAL.eisen).px(24, 22, PAL.eisen);
      q.rect(26, 18, 1, 1, PAL.eisenH);
    }, { schatten: 0.1, rand: true });
    p.linie(18, 18, 24, 14, '#e8e0d0').linie(18, 18, 24, 22, '#e8e0d0');
    p.px(20, 20, PAL.haut).px(16, 20, PAL.haut);
    // Bolzenköcher
    p.rect(11, 23, 2, 4, PAL.lederD).px(11, 22, PAL.eisen).px(12, 22, PAL.holzH);
  },
});

definiere('einheit', 'langbogenschuetze', {
  w: 32, h: 32,
  zeichne(p) {
    koecher(p, 10, 22, { farbe: PAL.lederD });
    person(p, { rumpf: '#4a6a32', rock: '#4a6a32', arm: '#4a6a32', hose: '#5a4a2a', helm: 'kapuze', helmOpt: { farbe: S }, hand: [17, 17], handHinten: [22, 16], armHintenVor: true, stiefel: true });
    // mannshoher Langbogen
    bogen(p, 23, 2, 30, { zug: 6, woelb: 3, farbe: PAL.holzH });
    p.linie(17, 16, 27, 16, PAL.holz); p.px(28, 16, PAL.eisen).px(17, 15, PAL.weiss).px(17, 17, PAL.weiss);
    strich(p, 17, 16, 23, 16, '#4a6a32', 2); p.px(24, 16, PAL.haut).px(24, 17, PAL.haut);
  },
});

definiere('einheit', 'arkebusier', {
  w: 32, h: 32,
  zeichne(p) {
    person(p, {
      rumpf: S, rock: S, arm: S, hose: '#3a3028', helm: 'morion', schnurrbart: '#3a2418', bart: '#3a2418', hand: [22, 18], handHinten: [16, 19], armHintenVor: true, stiefel: true,
      ruestung(q) { q.rect(13, 17, 5, 5, PAL.eisen); q.rect(13, 17, 2, 4, PAL.eisenH); q.rect(12, 17, 7, 1, PAL.weiss); q.rect(13, 23, 5, 2, SD); q.linie(12, 17, 18, 22, PAL.lederD); },
    });
    // Hakenbüchse auf Stützgabel
    p.linie(25, 19, 25, 30, PAL.holzD).px(24, 18, PAL.eisen).px(26, 18, PAL.eisen);
    p.rect(13, 17, 5, 2, PAL.holz).rect(18, 17, 6, 1, PAL.holz).rect(17, 16, 13, 1, PAL.eisenD).px(29, 16, PAL.eisen);
    p.px(18, 18, PAL.schwarz);
    p.px(16, 18, PAL.haut).px(22, 17, PAL.haut);
    // glimmende Lunte + Pulverflaschen
    p.px(17, 15, '#f39c12').px(16, 14, '#d8d0c0').px(15, 13, '#b8b0a0');
    p.px(13, 21, PAL.messing).px(14, 21, PAL.messing).px(15, 21, PAL.messing);
  },
});

definiere('einheit', 'feldgeschuetz', {
  w: 32, h: 32,
  zeichne(p) {
    // leichte Kanone (19. Jh.) mit Bedienung
    lage(p, (q) => {
      q.poly([[3, 27], [5, 27], [16, 21], [17, 23], [6, 29], [3, 29]], '#4a5a3a');
      rohr(q, 14, 20, 15, 10, 2, '#2e3236', '#5d6a73');
      q.rect(13, 19, 4, 4, '#4a5a3a');
    }, { schatten: 0.15 });
    rad(p, 15, 25, 5, { ring: '#3a2a1a', speiche: PAL.holzH, nabe: PAL.eisenD });
    p.rect(26, 17, 2, 2, '#1e1c1e');
    // Kanonier in Uniform
    lage(p, (q) => {
      person(q, { rumpf: S, rock: S, arm: S, hose: '#2e2e36', schuh: '#1a1818', stiefel: true, helm: 'muetze', helmOpt: { farbe: S, abzeichen: PAL.gold }, hand: [10, 21], handHinten: [4, 22], guertel: PAL.weiss });
    }, { dx: -9, schatten: 0 });
    // Ladestock
    p.linie(0, 14, 4, 28, PAL.holz);
    p.px(0, 14, null);
    p.px(1, 15, '#2a2a2a');
    // Munitionskiste
    p.rect(22, 27, 6, 3, '#5a4a3a').rect(22, 27, 6, 1, '#7a6a5a');
  },
});

definiere('einheit', 'maschinengewehr', {
  w: 32, h: 32,
  zeichne(p) {
    // Soldat hinter der Waffe
    lage(p, (q) => {
      kopf(q, 9, 13); helm(q, 9, 13, 'stahlhelm', { farbe: '#5a6648', abzeichen: S });
      q.rect(7, 18, 8, 5, '#5a6648'); q.rect(7, 18, 8, 1, S);
      q.rect(14, 19, 5, 2, '#5a6648'); q.px(19, 19, PAL.haut);
    }, { schatten: 0.15 });
    // MG auf Lafette
    lage(p, (q) => {
      q.rect(14, 17, 8, 3, '#2e2e2c'); q.rect(14, 17, 8, 1, '#4a4a46'); q.rect(22, 18, 7, 1, '#2e2e2c'); q.rect(28, 17, 2, 3, '#2e2e2c');
      q.rect(17, 20, 2, 3, '#2e2e2c'); q.linie(22, 18, 26, 22, '#3a3a36');
      q.rect(15, 20, 2, 3, '#4a5a38');
    }, { schatten: 0.1, rand: true });
    p.px(18, 15, '#2e2e2c').px(17, 16, '#2e2e2c');
    // Patronengurt
    for (let i = 0; i < 4; i++) p.px(13 - i, 21 + i, PAL.messing);
    // Sandsackwall
    lage(p, (q) => {
      for (let i = 0; i < 4; i++) q.ellipse(4 + i * 7, 27, 3.5, 2, C.sand);
      for (let i = 0; i < 4; i++) q.ellipse(7 + i * 7, 23.5, 3.5, 2, C.sandH);
      q.rect(1, 28, 30, 2, C.sandD);
    }, { schatten: 0.15, rand: C.sandD });
    p.rect(9, 22, 3, 2, S).rect(9, 22, 3, 1, SH);
  },
});

definiere('einheit', 'raketenwerfer', {
  w: 32, h: 32,
  zeichne(p) {
    const tg = '#6a7a4a';
    person(p, {
      rumpf: tg, rock: tg, arm: tg, hose: tg, schuh: '#3a3024', stiefel: true, helm: 'gefechtshelm', helmOpt: { farbe: '#7a7a52' }, hand: [19, 18], handHinten: [16, 19], armHintenVor: true, guertel: '#3a3a30', pose: 'schritt',
      ruestung(q) { q.rect(12, 18, 7, 4, S); q.rect(12, 18, 7, 1, SH); q.px(13, 24, C.tarnB).px(16, 26, C.tarnS).px(17, 20, SD); },
    });
    // Panzerfaust-Rohr auf der Schulter mit Gefechtskopf
    lage(p, (q) => {
      q.rect(3, 14, 20, 3, '#3e4a2e'); q.rect(3, 14, 20, 1, '#5a6a44');
      q.poly([[22, 13], [26, 13], [30, 15], [26, 17], [22, 17]], '#5a6440'); q.px(30, 15, '#3a3a2a');
      q.rect(14, 12, 3, 2, '#2a2a2a'); q.rect(13, 17, 2, 2, '#2a2a2a'); q.rect(19, 17, 1, 2, '#2a2a2a');
      q.rect(1, 13, 2, 5, '#3e4a2e');
    }, { rand: true });
    p.rect(7, 15, 2, 1, S);
    p.px(19, 18, PAL.haut).px(14, 19, PAL.haut);
    // Ersatzraketen am Rücken
    p.rect(8, 19, 3, 6, '#4a4a3a').px(9, 18, '#5a6440').px(10, 18, '#5a6440');
  },
});

// ---------------------------------------------------------------- Reiter

definiere('einheit', 'streitwagen', {
  w: 32, h: 32,
  zeichne(p) {
    // Pferd vorn (kleiner)
    lage(p, (q) => {
      const k = '#a06a3a', d = '#704a26';
      strich(q, 19, 21, 21, 28, d, 2, true); strich(q, 27, 21, 30, 27, d, 2, true);
      q.ellipse(22, 18.5, 5.5, 3, k);
      q.poly([[25, 17], [27, 11], [29, 11], [29, 18]], k);
      q.poly([[27, 10], [29, 9], [31, 13], [30, 14], [28, 13]], k);
      strich(q, 18, 21, 17, 28, k, 2, true); strich(q, 26, 21, 28, 27, k, 2, true);
    }, { schatten: 0.2 });
    p.rect(16, 29, 2, 1, '#1e1410').rect(19, 29, 2, 1, '#1e1410').rect(28, 28, 2, 1, '#1e1410').rect(30, 27, 1, 1, '#1e1410');
    p.linie(27, 10, 25, 17, '#2e1c10').linie(16, 17, 14, 22, '#2e1c10').px(29, 10, '#140e0a');
    p.rect(20, 15, 5, 2, S).rect(26, 9, 2, 1, S).px(27, 8, SH); // Federbusch, Decke
    // Wagenkasten
    lage(p, (q) => {
      q.poly([[3, 15], [12, 15], [13, 22], [3, 22]], PAL.bronze);
      q.rect(3, 14, 10, 1, PAL.bronzeD);
      q.rect(12, 20, 8, 1, PAL.holzD); // Deichsel
    }, { schatten: 0.2 });
    p.rect(4, 17, 7, 3, S).rect(4, 17, 7, 1, SH).px(7, 18, PAL.gold);
    rad(p, 8, 24, 5, { ring: PAL.holzD, speiche: PAL.holz, nabe: PAL.bronze });
    // Lenker mit Speer und Zügeln
    kopf(p, 6, 4); helm(p, 6, 4, 'bronze');
    p.rect(5, 9, 6, 6, S).rect(5, 9, 6, 1, SH).rect(6, 10, 4, 3, PAL.bronze);
    p.linie(11, 11, 26, 13, PAL.lederD);
    p.px(11, 11, PAL.haut);
    speer(p, 1, 16, 8, 0, { spitze: PAL.bronze });
  },
});

definiere('einheit', 'reiter', {
  w: 32, h: 32,
  zeichne(p) {
    pferd(p, { farbe: '#7a4a2a', maehne: '#1e1410', decke: S, deckeRand: PAL.lederD });
    reiterFigur(p, { rumpf: PAL.leder, hose: '#6a5a3a', helm: 'konisch', hand: [18, 12], handHinten: [10, 13],
      ruestung(q, bx, by) { q.rect(bx - 2, by - 6, 6, 1, S); q.rect(bx - 1, by - 4, 4, 1, PAL.lederD); } });
    // Speer nach vorn gesenkt
    speer(p, 6, 15, 29, 8, { spitze: PAL.eisen });
    p.px(18, 12, PAL.haut);
    // kleiner Rundschild am Rücken
    rundschild(p, 9, 14, 3, 3, { rand: PAL.holzD, feld: S, buckel: PAL.eisenH });
  },
});

definiere('einheit', 'kriegselefant', {
  w: 32, h: 32,
  zeichne(p) {
    const k = '#8c8a8e', d = '#646268', D = '#55535a';
    lage(p, (q) => {
      q.rect(8, 22, 4, 8, D); q.rect(19, 22, 4, 8, D);
      q.ellipse(13, 18, 10, 6.5, k);
      q.ellipse(23, 15, 5, 5, k);
      q.poly([[26, 14], [29, 17], [30, 22], [30, 27], [29, 28], [28, 27], [28, 22], [26, 19]], k);
      q.rect(5, 22, 4, 8, k); q.rect(16, 22, 4, 8, k);
      q.linie(3, 15, 2, 22, d);
    }, { schatten: 0.18 });
    p.rect(5, 29, 4, 1, '#3a383e').rect(16, 29, 4, 1, '#3a383e');
    for (const x of [5, 7, 16, 18]) p.px(x, 30, '#d8d4c8');
    lage(p, (q) => { q.poly([[19, 10], [22, 11], [22, 19], [20, 21], [18, 18], [18, 12]], '#7c7a80'); }, { schatten: 0.15 });
    p.px(24, 13, '#1a1410');
    // Stoßzähne mit Eisenspitzen
    p.linie(26, 20, 30, 18, '#f4eee0').linie(26, 21, 29, 19, '#d8d0c0').px(31, 17, PAL.eisenH);
    // Stirnplatte und Schabracke in Spielerfarbe
    p.rect(22, 10, 5, 3, PAL.bronze).px(23, 10, hell(PAL.bronze, 0.3));
    lage(p, (q) => {
      q.poly([[6, 13], [19, 13], [19, 23], [6, 23]], S);
      q.rect(6, 22, 14, 1, PAL.gold); q.rect(6, 13, 14, 1, SH);
      for (let x = 7; x < 19; x += 3) q.px(x, 23, PAL.gold);
    }, { schatten: 0, rand: true });
    p.rect(11, 16, 4, 4, PAL.bronze).px(12, 17, PAL.gold).px(13, 18, PAL.goldD);
    // Turm (Howdah) mit Krieger
    lage(p, (q) => {
      q.rect(6, 7, 11, 6, PAL.holz); q.rect(6, 7, 11, 1, PAL.holzH);
      q.rect(5, 6, 1, 7, PAL.holzD); q.rect(17, 6, 1, 7, PAL.holzD);
      q.rect(7, 9, 9, 2, SD);
    }, { rand: true });
    kopf(p, 9, 1); helm(p, 9, 1, 'konisch');
    p.rect(9, 6, 5, 1, S);
    speer(p, 5, 9, 15, 0, { spitze: PAL.eisen });
    // Mahut
    kopf(p, 19, 4); p.rect(19, 9, 4, 3, PAL.weiss);
  },
});

definiere('einheit', 'ritter', {
  w: 32, h: 32,
  zeichne(p) {
    pferd(p, { farbe: '#e8e4dc', maehne: '#c8c0b0' });
    // Schabracke in Spielerfarbe bis zu den Knien, auch über dem Hals
    lage(p, (q) => {
      q.ellipse(14, 20.5, 8, 3.8, S);
      q.rect(6, 20, 17, 6, S); q.px(6, 26, null);
      q.poly([[18, 19], [22, 11.5], [25, 12.5], [24, 21]], S);
      q.poly([[22, 10.5], [24, 9], [26, 10], [28.5, 14], [26, 15], [24, 14]], SD);
      for (let x = 6; x <= 22; x += 2) q.px(x, 26, PAL.gold);
      q.rect(6, 25, 17, 1, PAL.gold);
    }, { schatten: 0 });
    p.px(25, 11, '#140e0a').px(26, 12, PAL.gold);
    p.rect(9, 20, 3, 3, PAL.gold).px(10, 21, SD); // Wappen
    p.rect(18, 21, 3, 3, PAL.gold).px(19, 22, SD);
    p.px(9, 27, PAL.eisen).px(22, 27, PAL.eisen);
    reiterFigur(p, {
      rumpf: PAL.eisen, hose: PAL.eisen, schuh: PAL.eisenD, helm: 'topf', hand: [18, 13], handHinten: [9, 12], arm: PAL.eisen,
      ruestung(q, bx, by) { q.rect(bx - 2, by - 6, 6, 6, S); q.rect(bx, by - 6, 1, 6, PAL.gold); q.rect(bx - 2, by - 4, 6, 1, PAL.gold); q.rect(bx + 1, by + 1, 4, 1, PAL.eisenH); },
    });
    // Dreiecksschild
    lage(p, (q) => { q.poly([[6, 9], [11, 9], [11, 14], [8.5, 17], [6, 14]], S); q.rect(6, 9, 6, 1, SH); q.rect(8, 10, 1, 6, PAL.gold); q.rect(6, 12, 6, 1, PAL.gold); }, { schatten: 0, rand: true });
    // eingelegte Lanze mit Wimpel
    p.linie(10, 15, 31, 10, PAL.holzH).linie(10, 16, 18, 14, PAL.holz);
    p.rect(17, 12, 2, 4, PAL.eisen);
    p.poly([[22, 12], [27, 11], [24, 9]], S); p.px(26, 11, SD);
    p.px(18, 13, PAL.eisenD);
  },
});

definiere('einheit', 'kuerassier', {
  w: 32, h: 32,
  zeichne(p) {
    pferd(p, { farbe: '#46362c', maehne: '#141010', decke: S, deckeRand: PAL.gold });
    p.rect(11, 18, 7, 1, PAL.gold);
    p.rect(18, 22, 2, 1, PAL.gold); // Pistolenholster
    reiterFigur(p, {
      rumpf: PAL.weiss, hose: PAL.weiss, schuh: '#1a1818', helm: 'kuerass', schnurrbart: '#2a1a10', hand: [20, 8], handHinten: [10, 13], arm: S,
      ruestung(q, bx, by) { q.rect(bx - 2, by - 6, 6, 6, PAL.eisenH); q.rect(bx - 1, by - 6, 2, 5, '#e8eef4'); q.rect(bx + 2, by - 5, 1, 4, PAL.eisen); q.rect(bx - 2, by, 6, 1, S); q.rect(bx - 2, by - 6, 1, 6, S); q.px(bx + 1, by - 4, PAL.messing); },
    });
    // Pallasch erhoben
    p.linie(21, 7, 28, 1, PAL.eisenH).linie(21, 8, 28, 2, PAL.eisen).px(20, 6, PAL.messing).px(19, 8, PAL.messing).px(20, 9, PAL.messing);
    // Pistole im Gürtel
    p.rect(11, 15, 3, 1, '#2a2a2a').px(11, 16, PAL.holz);
  },
});

definiere('einheit', 'kavallerie', {
  w: 32, h: 32,
  zeichne(p) {
    pferd(p, { farbe: '#a0603a', maehne: '#3a2010', galopp: true, decke: S, deckeRand: PAL.weiss, blesse: true });
    reiterFigur(p, {
      rumpf: S, hose: '#c0392b', schuh: '#1a1818', helm: 'tschako', schnurrbart: '#3a2010', hand: [19, 6], handHinten: [10, 12], arm: S,
      ruestung(q, bx, by) { for (let y = by - 5; y < by; y += 2) q.rect(bx - 1, y, 4, 1, PAL.gold); q.rect(bx - 2, by - 6, 2, 1, PAL.gold); q.rect(bx + 3, by + 2, 1, 5, PAL.gold); },
    });
    // gebogener Säbel nach vorn oben
    p.px(20, 5, PAL.eisen).linie(21, 5, 25, 2, PAL.eisenH).linie(25, 2, 28, 2, PAL.eisenH).px(29, 3, PAL.eisenH).linie(21, 6, 26, 3, PAL.eisen);
    p.px(19, 5, PAL.messing).px(19, 7, PAL.messing).px(18, 6, PAL.messing);
    // Karabiner am Sattel
    p.linie(5, 19, 11, 22, '#2a2a2a');
  },
});

/** Panzerwanne-Hilfen */
function tarnFlecken(p, punkte, farben) { punkte.forEach(([x, y, w, h], i) => p.rect(x, y, w, h, farben[i % farben.length])); }

definiere('einheit', 'leichter_panzer', {
  w: 32, h: 32,
  zeichne(p) {
    // Rhombus-Panzer des Ersten Weltkriegs: Kette läuft rings um die Wanne
    const k = '#857a56', d = '#5e5639';
    lage(p, (q) => {
      q.poly([[3, 22], [6, 13], [26, 11], [31, 13], [30, 19], [25, 29], [7, 29]], C.kette);
      q.poly([[5, 22], [8, 15], [25, 13], [29, 14], [28, 19], [24, 27], [8, 27]], k);
    }, { schatten: 0.12 });
    // Kettenglieder rundum
    for (let x = 8; x < 26; x += 2) p.px(x, 12 + (x < 16 ? 1 : 0), C.ketteH).px(x + 1, 28, C.ketteH);
    for (let i = 0; i < 4; i++) { p.px(4 + i * 0.7, 20 - i * 2, C.ketteH); p.px(30 - i, 15 + i * 3, C.ketteH); }
    // Spielerfarben-Streifen, Nieten
    p.rect(8, 16, 18, 2, S).rect(8, 16, 18, 1, SH);
    for (let x = 9; x < 25; x += 3) { p.px(x, 19, d).px(x, 25, d); }
    // Seitenerker mit kurzer Kanone
    lage(p, (q) => { q.rect(11, 19, 9, 6, d); q.rect(11, 19, 9, 1, k); q.poly([[20, 19], [22, 21], [20, 24]], d); }, { rand: true });
    p.rect(21, 21, 7, 2, '#2e2e2c').rect(21, 21, 7, 1, '#4a4a46');
    p.rect(13, 21, 2, 2, '#1e1c1a').px(17, 21, PAL.eisenD);
    // Lenkräder am Heck
    p.linie(5, 25, 1, 27, '#4a4440'); rad(p, 2, 28, 2, { ring: '#4a4440', speiche: '#6a645c', nabe: '#2a2826' });
    // Kommandantenkasten + Auspuff
    p.rect(12, 9, 7, 3, d).rect(12, 9, 7, 1, k).px(17, 10, '#1e1c1a').rect(9, 8, 1, 4, '#3a3a3a').px(9, 7, C.rauch).px(8, 6, '#a8a8a8');
  },
});

definiere('einheit', 'panzer', {
  w: 32, h: 32,
  zeichne(p) {
    // mittlerer Kampfpanzer (2. Weltkrieg)
    const k = C.oliv || '#5b6b3a', o = '#5e6c3c', d = '#44502a';
    kette(p, 3, 24, 25, 6, { rollen: 5, rollenR: 1.8, rolle: '#6a6e62' });
    lage(p, (q) => {
      q.poly([[3, 23], [4, 19], [22, 19], [28, 22], [28, 23]], o);
      q.rect(2, 22, 27, 2, d);
    });
    p.linie(22, 19, 28, 22, hell(o, 0.25)).rect(26, 21, 2, 1, '#f0e0a0');
    // Turm
    lage(p, (q) => {
      q.poly([[9, 19], [10, 14], [12, 12], [19, 12], [21, 14], [21, 19]], o);
      q.rect(12, 10, 4, 2, d); // Kuppel
    }, { rand: true });
    p.rect(11, 15, 9, 2, S).rect(11, 15, 9, 1, SH);
    p.px(14, 13, hell(o, 0.3)).px(13, 10, hell(d, 0.3));
    // Kanone (mittel)
    p.rect(21, 14, 2, 3, d).rect(23, 15, 7, 1, '#3a4226').rect(23, 14, 7, 1, '#5a6a3a');
    // Antenne mit Wimpel
    p.linie(10, 13, 7, 3, '#2a2a2a'); p.rect(8, 3, 3, 2, S);
    // Werkzeug am Heck
    p.rect(4, 20, 5, 1, PAL.holz);
  },
});

definiere('einheit', 'schwerer_panzer', {
  w: 32, h: 32,
  zeichne(p) {
    // schwerer Panzer: kastig, breit, langes dickes Rohr mit Mündungsbremse, Tarnflecken
    const k = C.dunkelgelb, d = C.dunkelgelbD;
    lage(p, (q) => {
      q.rect(1, 22, 27, 9, C.kette);
      q.ellipse(3.5, 26, 3, 4, C.kette); q.ellipse(25.5, 26, 3, 4, C.kette);
    }, { schatten: 0 });
    for (let x = 2; x < 27; x += 2) p.px(x, 22, C.ketteH).px(x + 1, 30, C.ketteH);
    // verschachtelte Laufrollen
    for (let i = 0; i < 6; i++) { p.kreis(4 + i * 4, 26.5, 2.4, '#7a7464'); p.px(4 + i * 4, 26.5, '#3a3830'); }
    for (let i = 0; i < 5; i++) p.kreis(6 + i * 4, 25.5, 1.2, '#8c8676');
    lage(p, (q) => {
      q.rect(0, 15, 29, 7, k);
      q.poly([[25, 15], [30, 17], [30, 22], [26, 22]], k);
    });
    tarnFlecken(p, [[3, 16, 4, 2], [12, 19, 5, 2], [20, 16, 3, 3], [7, 20, 3, 1], [26, 18, 2, 2]], ['#4a5a30', C.rotbraun]);
    p.rect(0, 21, 30, 1, d);
    // großer kastiger Turm
    lage(p, (q) => {
      q.rect(3, 7, 16, 8, k); q.rect(4, 6, 13, 1, k);
      q.rect(5, 4, 5, 2, d); // Kommandantenkuppel
    }, { rand: true });
    tarnFlecken(p, [[4, 8, 3, 2], [14, 11, 3, 2], [5, 13, 2, 1]], ['#4a5a30', C.rotbraun]);
    // Spielerfarbe: Kreuzabzeichen
    p.rect(8, 8, 5, 5, PAL.weiss).rect(9, 9, 3, 3, S).rect(10, 8, 1, 5, S).rect(8, 10, 5, 1, S);
    p.rect(3, 14, 16, 1, d);
    // sehr langes dickes Rohr mit Mündungsbremse
    p.rect(19, 8, 3, 5, d).rect(19, 8, 3, 1, k);
    p.rect(22, 9, 7, 2, '#6a5a3a').rect(22, 9, 7, 1, k);
    p.rect(28, 8, 3, 4, '#4a4030').px(28, 8, '#6a5a3a').px(30, 9, '#1e1c1a').px(30, 10, '#1e1c1a');
    // Ersatzkettenglieder
    p.rect(1, 17, 1, 3, C.ketteH);
  },
});

definiere('einheit', 'moderner_kampfpanzer', {
  w: 32, h: 32,
  zeichne(p) {
    // flach, lang, keilförmiger Turm, sehr langes Glattrohr, Seitenschürzen, NATO-Tarnung
    const g = C.nato, b = '#5a4632', s = '#24241e';
    kette(p, 2, 25, 26, 5, { rollen: 7, rollenR: 1.6, rolle: '#5a5a50' });
    lage(p, (q) => {
      q.poly([[1, 19], [24, 19], [30, 21], [29, 24], [1, 24]], g);
      q.rect(2, 22, 26, 4, g); // Schürzen
    }, { schatten: 0.15 });
    tarnFlecken(p, [[3, 20, 4, 2], [12, 22, 5, 2], [20, 20, 3, 2], [8, 24, 3, 1], [24, 22, 2, 2]], [b, s, b]);
    p.rect(2, 25, 26, 1, '#3a4628');
    for (let x = 4; x < 27; x += 4) p.px(x, 23, '#3a4628');
    // keilförmiger Turm
    lage(p, (q) => {
      q.poly([[2, 18], [3, 14], [15, 13], [21, 16], [21, 18]], g);
      q.rect(4, 12, 3, 2, '#3e4a2c'); q.rect(10, 11, 4, 2, '#3e4a2c'); // Optiken
    }, { rand: true });
    tarnFlecken(p, [[4, 15, 3, 2], [14, 14, 3, 2], [18, 16, 2, 1]], [b, s]);
    p.rect(8, 16, 6, 2, S).rect(8, 16, 6, 1, SH);
    p.px(13, 12, '#8fc3e0').px(5, 12, '#8fc3e0');
    // sehr langes Glattrohr mit Thermalhülle und Rauchabsauger
    p.rect(21, 15, 11, 1, '#56663e').rect(21, 16, 11, 1, '#3e4a2c').rect(25, 14, 3, 4, '#3e4a2c').px(25, 14, '#56663e');
  },
});

definiere('einheit', 'kampfhubschrauber', {
  w: 32, h: 32,
  zeichne(p) {
    const k = '#4c5a3c', d = '#36402a';
    // Schatten am Boden
    p.rect(13, 30, 9, 1, '#2b2118');
    // Heckausleger mit Heckrotor
    lage(p, (q) => {
      q.poly([[2, 11], [5, 11], [14, 15], [14, 18], [4, 14]], k);
      q.rect(1, 7, 2, 6, k);
    });
    p.linie(1, 5, 2, 14, '#c8ccd0').px(2, 9, '#2a2a2a');
    // Rumpf (schmal, Tandem-Cockpit)
    lage(p, (q) => {
      q.poly([[12, 13], [20, 11], [27, 13], [30, 17], [27, 20], [14, 20]], k);
    }, { schatten: 0.18 });
    p.poly([[20, 12], [24, 11], [28, 14], [21, 14]], '#7ab0d0'); p.linie(24, 11, 22, 14, d).px(21, 12, '#c8e4f4');
    p.rect(14, 15, 6, 3, S).rect(14, 15, 6, 1, SH);
    // Stummelflügel mit Raketenbehältern
    p.rect(15, 19, 9, 1, d); p.rect(15, 20, 4, 3, '#3a3a30').px(15, 20, '#4a4a40').px(15, 22, '#5a5a50');
    p.rect(20, 20, 4, 2, '#3a3a30').px(24, 20, '#c0392b').px(24, 21, '#c0392b');
    // Bugkanone + Sensor
    p.rect(28, 20, 1, 2, '#2a2a2a').rect(29, 22, 2, 1, '#2a2a2a'); p.kreis(29, 18, 1, '#2a2a30');
    // Kufen
    p.linie(14, 24, 26, 24, '#2a2a2a').px(14, 21, '#2a2a2a').px(14, 22, '#2a2a2a').px(14, 23, '#2a2a2a').px(24, 21, '#2a2a2a').px(24, 22, '#2a2a2a').px(24, 23, '#2a2a2a').px(27, 23, '#2a2a2a');
    // Rotormast und Rotor (Bewegungsunschärfe)
    p.rect(19, 8, 2, 3, d);
    p.rect(3, 7, 28, 1, '#3a3a3a'); p.rect(19, 7, 2, 1, '#1e1e1e');
    for (let x = 4; x < 31; x += 3) p.px(x, 6, '#9aa0a6');
  },
});

// ---------------------------------------------------------------- Belagerung

definiere('einheit', 'rammbock', {
  w: 32, h: 32,
  zeichne(p) {
    // fahrbares Schutzdach mit Fellen und schwingendem Rammbalken
    lage(p, (q) => {
      q.rect(3, 13, 2, 12, PAL.holzD); q.rect(20, 13, 2, 12, PAL.holzD);
      q.rect(4, 22, 18, 2, PAL.holz);
    });
    // Rammbalken mit Eisenkopf (Widder)
    lage(p, (q) => {
      q.rect(1, 17, 24, 3, PAL.holzH); q.rect(1, 17, 24, 1, hell(PAL.holzH, 0.2));
      q.rect(24, 16, 4, 5, PAL.eisen); q.rect(28, 17, 2, 3, PAL.eisenD); q.px(24, 16, PAL.eisenH);
      for (let x = 6; x < 22; x += 5) q.rect(x, 17, 1, 3, PAL.eisenD);
    }, { rand: true });
    p.linie(9, 11, 9, 16, '#c8b88c').linie(16, 11, 16, 16, '#c8b88c');
    // Dach
    lage(p, (q) => {
      q.poly([[1, 12], [12, 4], [24, 12]], C.fell);
      q.rect(1, 12, 24, 1, C.fellD);
    }, { schatten: 0.15, rand: true });
    for (let i = 0; i < 4; i++) p.linie(4 + i * 5, 11, 9 + i * 3, 6, C.fellD);
    // Fahne
    p.linie(12, 4, 12, 0, PAL.holzD); p.rect(13, 0, 5, 3, S).rect(13, 0, 5, 1, SH);
    rad(p, 6, 26, 3.5); rad(p, 18, 26, 3.5);
    p.rect(4, 13, 16, 1, S);
  },
});

definiere('einheit', 'katapult', {
  w: 32, h: 32,
  zeichne(p) {
    // Gestell
    lage(p, (q) => {
      q.rect(3, 23, 24, 3, PAL.holz); q.rect(3, 23, 24, 1, PAL.holzH);
      q.poly([[16, 23], [19, 12], [21, 12], [21, 23]], PAL.holzD);
      q.rect(15, 11, 8, 2, PAL.holz);
    });
    p.rect(16, 15, 4, 2, S).rect(16, 15, 4, 1, SH);
    // Wurfarm zurückgezogen, mit Löffel und Stein
    lage(p, (q) => {
      q.linie(6, 21, 21, 15, PAL.holzH); q.linie(6, 22, 21, 16, PAL.holz);
      q.ellipse(5, 19, 3, 2, PAL.holzD);
    }, { rand: true });
    p.kreis(5, 17, 2, PAL.stein).px(4, 16, PAL.steinH);
    // Torsionsbündel
    p.rect(20, 18, 3, 4, '#c8b88c').px(21, 19, '#a89868');
    // Seil + Winde
    p.linie(7, 22, 13, 23, '#c8b88c'); p.kreis(25, 21, 1.5, PAL.holzD);
    rad(p, 7, 27, 3); rad(p, 23, 27, 3);
    // Steinvorrat
    p.kreis(28, 28, 1.5, PAL.stein).kreis(29, 26, 1, PAL.steinD);
  },
});

definiere('einheit', 'ballista', {
  w: 32, h: 32,
  zeichne(p) {
    // Dreibein-Gestell
    lage(p, (q) => {
      q.linie(14, 18, 8, 29, PAL.holzD); q.linie(15, 18, 9, 29, PAL.holzD);
      q.linie(16, 18, 22, 29, PAL.holzD); q.linie(17, 18, 23, 29, PAL.holzD);
      q.rect(15, 18, 2, 12, PAL.holz);
      q.rect(7, 29, 17, 1, PAL.holzD);
    });
    // Schiene mit Bolzen
    lage(p, (q) => {
      q.rect(3, 15, 25, 3, PAL.holz); q.rect(3, 15, 25, 1, PAL.holzH);
      q.rect(17, 11, 4, 10, PAL.holzD); q.rect(17, 11, 4, 1, PAL.holzH);
      q.rect(17, 13, 4, 2, S); q.rect(17, 18, 4, 2, S);
    }, { rand: true });
    // Bogenarme weit
    p.linie(19, 11, 13, 4, PAL.holzD).linie(20, 11, 14, 4, PAL.holz);
    p.linie(19, 20, 13, 27, PAL.holzD).linie(20, 20, 14, 27, PAL.holz);
    p.linie(13, 4, 6, 15, '#e8e0d0').linie(13, 27, 6, 17, '#e8e0d0');
    // großer Bolzen
    p.rect(6, 15, 24, 1, PAL.holzH).px(30, 15, PAL.eisenH).px(29, 14, PAL.eisen).px(29, 16, PAL.eisen).px(28, 15, PAL.eisen);
    p.px(6, 14, S).px(7, 14, S).px(6, 16, S);
    // Spannwinde
    p.kreis(4, 18, 2, PAL.holzD).px(4, 18, PAL.eisen);
  },
});

definiere('einheit', 'trebuchet', {
  w: 32, h: 32,
  zeichne(p) {
    // hohes A-Gestell
    lage(p, (q) => {
      q.rect(2, 28, 28, 2, PAL.holz);
      q.linie(9, 28, 15, 8, PAL.holzD); q.linie(10, 28, 16, 8, PAL.holzD);
      q.linie(23, 28, 17, 8, PAL.holzD); q.linie(22, 28, 16, 8, PAL.holzD);
      q.rect(11, 20, 10, 1, PAL.holz);
      q.rect(15, 7, 3, 2, PAL.eisenD);
    });
    // langer Wurfarm (kurzes Ende mit Gegengewicht rechts unten, langes Ende links oben)
    lage(p, (q) => {
      q.linie(2, 3, 23, 14, PAL.holzH); q.linie(2, 4, 23, 15, PAL.holz);
      // Gegengewichtskasten
      q.rect(20, 14, 9, 8, PAL.holz); q.rect(20, 14, 9, 1, PAL.holzH);
      q.rect(20, 17, 9, 1, PAL.eisenD); q.rect(20, 21, 9, 1, PAL.eisenD);
      q.rect(21, 15, 7, 2, S);
    }, { rand: true });
    p.rect(22, 18, 5, 3, PAL.stein).px(23, 18, PAL.steinH).px(25, 19, PAL.steinD);
    // Schlinge mit Stein
    p.linie(2, 3, 1, 9, '#c8b88c'); p.kreis(2, 10, 1.4, PAL.stein); p.px(1, 9, PAL.steinH);
    // Wimpel oben
    p.px(16, 6, PAL.holzD).px(16, 5, PAL.holzD).rect(17, 4, 4, 2, S).px(17, 4, SH);
    // Seilwinde
    rad(p, 6, 25, 3, { ring: PAL.holzD, speiche: PAL.holz }); p.linie(6, 25, 11, 20, '#c8b88c');
  },
});

definiere('einheit', 'kanone', {
  w: 32, h: 32,
  zeichne(p) {
    // Holzlafette
    lage(p, (q) => {
      q.poly([[2, 28], [5, 29], [17, 21], [18, 18], [14, 18]], PAL.holz);
      q.rect(12, 18, 7, 5, PAL.holz);
    }, { schatten: 0.18 });
    p.rect(12, 20, 6, 2, S).rect(12, 20, 6, 1, SH);
    // Bronzerohr, dick und konisch
    lage(p, (q) => {
      q.poly([[8, 17], [10, 14], [28, 12], [29, 15], [12, 19]], PAL.bronze);
      q.ellipse(8, 17, 2, 2, PAL.bronze); q.px(6, 18, PAL.bronzeD).px(5, 19, PAL.bronzeD);
      q.rect(28, 11, 2, 5, PAL.bronze);
    }, { schatten: 0.25, rand: true });
    p.linie(11, 15, 27, 13, hell(PAL.bronze, 0.35));
    p.rect(16, 13, 1, 5, PAL.bronzeD).rect(23, 12, 1, 5, PAL.bronzeD);
    p.px(30, 13, '#1e1c1a').px(30, 14, '#1e1c1a');
    rad(p, 15, 24, 5.5, { ring: '#4a3018', speiche: PAL.holzH, nabe: PAL.eisen });
    // Kugelpyramide
    for (const [x, y] of [[24, 28], [27, 28], [30, 28], [25.5, 25.5], [28.5, 25.5], [27, 23]]) { p.kreis(x, y, 1.2, '#2e2e30'); p.px(x - 0.5, y - 0.6, '#6a6a70'); }
  },
});

definiere('einheit', 'artillerie', {
  w: 32, h: 32,
  zeichne(p) {
    // schweres Feldgeschütz mit Schutzschild (WW1), langes Rohr
    const k = '#6a6e58', d = '#4c5040';
    lage(p, (q) => {
      q.poly([[1, 28], [4, 29], [17, 22], [15, 20]], d); // Lafettenschwanz
      q.rect(12, 18, 8, 5, k);
    }, { schatten: 0.18 });
    lage(p, (q) => {
      rohr(q, 14, 16, 17, 14, 3, '#545a48', '#7a806a');
      q.rect(12, 15, 7, 4, '#545a48');
      q.rect(14, 19, 6, 1, '#3a3e32'); // Rücklaufzylinder
    }, { schatten: 0.15, rand: true });
    // Schutzschild
    lage(p, (q) => { q.poly([[18, 11], [21, 10], [22, 24], [18, 24]], k); }, { rand: true });
    p.rect(19, 15, 2, 4, S).px(19, 15, SH);
    p.px(30, 11, '#1e1c1a').px(30, 12, '#1e1c1a');
    // große Stahlspeichenräder
    rad(p, 15, 25, 5, { ring: '#2e2e2a', speiche: '#6a6e58', nabe: '#2e2e2a' });
    // Granaten
    for (let i = 0; i < 3; i++) { p.rect(24 + i * 2, 26, 1, 4, PAL.messing); p.px(24 + i * 2, 25, '#4a4a46'); }
  },
});

definiere('einheit', 'haubitze', {
  w: 32, h: 32,
  zeichne(p) {
    // moderne gezogene Haubitze: steil erhöhtes Rohr, gespreizte Holme, Tarnfarbe
    const k = C.tarnG, d = '#3e4a2a';
    lage(p, (q) => {
      q.poly([[1, 28], [3, 29], [15, 23], [14, 21]], d);
      q.poly([[3, 30], [5, 30], [16, 24], [15, 23]], k);
      q.rect(12, 19, 8, 5, k);
      q.rect(1, 29, 4, 1, '#2a2a2a');
    }, { schatten: 0.15 });
    // langes Rohr ca. 45°
    lage(p, (q) => {
      rohr(q, 14, 19, 19, 48, 3, '#4a5634', '#6a7a4a');
      q.rect(12, 16, 6, 5, '#4a5634');
      q.linie(15, 20, 21, 13, '#2e3424'); // Rücklauf
    }, { schatten: 0.12, rand: true });
    tarnFlecken(p, [[13, 20, 3, 2], [17, 22, 2, 1], [8, 25, 3, 1]], [C.tarnB, C.tarnS]);
    p.rect(13, 17, 4, 2, S).px(13, 17, SH);
    // Mündungsbremse
    p.rect(26, 4, 3, 3, '#2e3424').px(26, 4, '#4a5634');
    // große Gummiräder
    reifen(p, 17, 26, 4); reifen(p, 22, 27, 3);
    // Geschosse
    p.rect(26, 26, 2, 4, '#7a7a5a').px(26, 25, '#c0a040').px(27, 25, '#c0a040').rect(29, 27, 2, 3, '#7a7a5a').px(29, 26, '#c0a040');
  },
});

definiere('einheit', 'raketenartillerie', {
  w: 32, h: 32,
  zeichne(p) {
    const k = '#5a6640', d = '#404a2c';
    kette(p, 2, 25, 27, 5, { rollen: 6, rollenR: 1.6, rolle: '#5a5a50' });
    lage(p, (q) => {
      q.rect(2, 20, 27, 5, k);
      q.poly([[21, 14], [28, 14], [30, 18], [30, 24], [21, 24]], k); // Fahrerhaus vorn
    });
    p.rect(23, 15, 4, 3, PAL.glasD).px(23, 15, PAL.glas);
    p.rect(4, 21, 8, 2, S).rect(4, 21, 8, 1, SH);
    tarnFlecken(p, [[14, 21, 3, 2], [26, 20, 2, 2], [6, 23, 3, 1]], [C.tarnB, C.tarnS]);
    // Werferkasten schräg nach oben, vorn die Rohrmündungen
    lage(p, (q) => {
      q.rect(9, 17, 6, 3, '#2e3424');
      q.poly([[3, 15], [16, 6], [20, 12], [7, 21]], '#56623c');
      q.linie(3, 15, 16, 6, '#7a8658');
      q.linie(7, 13, 11, 19, d);
    }, { schatten: 0, rand: true });
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) p.px(17 + i, 8 + i * 2 - j + (j ? 0 : 0), '#1a1a18');
    p.linie(16, 6, 20, 12, '#3a442a');
    p.px(17, 8, '#1a1a18').px(18, 10, '#1a1a18').px(19, 12, '#1a1a18').px(16, 9, '#c0392b').px(17, 11, '#c0392b');
    // abgefeuerte Rakete mit Rauchspur
    p.linie(23, 2, 28, 0, PAL.weiss).px(29, 0, '#c0392b');
    p.px(22, 3, PAL.feuer).px(21, 4, C.rauch).px(20, 4, '#b0b0b0');
  },
});

// ---------------------------------------------------------------- Flak

definiere('einheit', 'flak', {
  w: 32, h: 32,
  zeichne(p) {
    // 8,8-cm-Flak auf Kreuzlafette, Rohr steil nach oben
    const k = '#7a7c74', d = '#565850';
    lage(p, (q) => {
      q.rect(2, 27, 28, 2, d); q.rect(13, 26, 6, 3, d);
      q.rect(1, 26, 3, 4, '#3a3a36'); q.rect(28, 26, 3, 4, '#3a3a36');
      q.rect(12, 20, 8, 6, k);
    });
    lage(p, (q) => {
      rohr(q, 14, 21, 21, 62, 3, '#5a5c54', '#8a8c84');
      q.rect(11, 17, 9, 6, '#6a6c64'); // Wiege
      q.poly([[19, 16], [23, 14], [24, 25], [19, 25]], k); // Schild
    }, { schatten: 0.15, rand: true });
    p.rect(20, 18, 3, 4, S).px(20, 18, SH);
    p.rect(22, 0, 3, 3, '#3a3a36');
    // Abschussmarkierungen am Rohr
    for (let i = 0; i < 3; i++) p.px(17 + i, 13 - i * 2, PAL.weiss);
    // Schütze mit Stahlhelm
    lage(p, (q) => {
      kopf(q, 5, 16); helm(q, 5, 16, 'stahlhelm', { abzeichen: S });
      q.rect(5, 21, 5, 5, C.feldgrau); q.rect(9, 22, 3, 2, C.feldgrau); q.px(11, 22, PAL.haut);
    }, { schatten: 0.15 });
    // Granaten
    p.rect(25, 23, 1, 3, PAL.messing).rect(27, 23, 1, 3, PAL.messing).px(25, 22, '#4a4a46').px(27, 22, '#4a4a46');
  },
});

definiere('einheit', 'flakpanzer', {
  w: 32, h: 32,
  zeichne(p) {
    const k = '#5a6640', d = '#404a2c';
    kette(p, 2, 25, 27, 5, { rollen: 6, rollenR: 1.6, rolle: '#5a5a50' });
    lage(p, (q) => {
      q.poly([[1, 20], [24, 20], [30, 22], [29, 25], [1, 25]], k);
    });
    tarnFlecken(p, [[3, 21, 4, 2], [14, 22, 4, 2], [24, 22, 2, 1]], [C.tarnB, C.tarnS]);
    // hoher Turm
    lage(p, (q) => {
      q.rect(8, 12, 13, 8, k); q.rect(9, 11, 11, 1, k);
    }, { rand: true });
    p.rect(10, 15, 9, 3, S).rect(10, 15, 9, 1, SH);
    // Zwillingskanonen seitlich, steil nach oben
    lage(p, (q) => {
      rohr(q, 19, 15, 13, 50, 2, '#2e3424', '#4e5634');
      rohr(q, 21, 17, 12, 50, 2, '#2e3424', '#4e5634');
      q.rect(18, 14, 4, 5, d);
    }, { schatten: 0, rand: true });
    // Rundsuchradar (Schüssel) auf dem Turm
    p.linie(10, 11, 10, 7, '#2a2a2a');
    lage(p, (q) => { q.ellipse(10, 5, 5, 1.6, '#8a8e86'); q.rect(6, 5, 9, 1, '#6a6e66'); }, { rand: true });
    p.px(10, 4, '#b8bcb4');
    // Folgeradar vorn
    p.kreis(6, 14, 2, '#6a6e66'); p.px(6, 14, '#3a3e36'); p.px(5, 13, '#9a9e96');
  },
});

definiere('einheit', 'flugabwehrraketen', {
  w: 32, h: 32,
  zeichne(p) {
    // Radfahrzeug mit Startgestell, vier Raketen steil nach oben, Radar
    const k = '#5e6a46', d = '#424c30';
    lage(p, (q) => {
      q.rect(1, 21, 29, 4, k);
      q.rect(23, 15, 7, 6, k); q.rect(1, 25, 29, 1, d);
    });
    p.rect(25, 16, 4, 3, PAL.glasD).px(25, 16, PAL.glas);
    p.rect(3, 22, 8, 2, S).rect(3, 22, 8, 1, SH);
    reifen(p, 5, 27, 2.6); reifen(p, 11, 27, 2.6); reifen(p, 25, 27, 2.6);
    // Startgestell
    lage(p, (q) => {
      q.linie(6, 21, 11, 14, d); q.linie(7, 21, 12, 14, d);
      q.rect(14, 18, 4, 3, d);
    }, { rand: true });
    // drei Raketen (weiß mit roter Spitze) auf der Startschiene, 45° nach oben
    lage(p, (q) => {
      for (let o = 0; o < 9; o++) q.linie(4 + o, 19, 15 + o, 8, '#3e4632');
      for (let i = 0; i < 3; i++) {
        const x = 4 + i * 3;
        q.linie(x, 18, x + 12, 6, '#ffffff'); q.linie(x + 1, 18, x + 13, 6, '#c8ccd0');
        q.px(x + 13, 5, '#c0392b').px(x + 12, 5, '#e05040').px(x + 14, 5, '#a02a20');
        q.px(x + 3, 15, '#c0392b');
      }
    }, { schatten: 0, rand: true });
    // Radar-Antenne auf Mast
    p.linie(20, 20, 20, 11, '#2a2a2a');
    lage(p, (q) => { q.rect(18, 6, 5, 5, '#7a7e76'); q.rect(18, 6, 5, 1, '#a0a49c'); for (let y = 7; y < 11; y += 2) q.rect(19, y, 3, 1, '#5a5e56'); }, { rand: true });
  },
});

// ---------------------------------------------------------------- Sanitäter

definiere('einheit', 'feldscher', {
  w: 32, h: 32,
  zeichne(p) {
    person(p, {
      rumpf: S, rock: S, rockLang: true, arm: S, hose: '#4a3a2a', helm: 'barettS', helmOpt: { farbe: '#2a2420' }, bart: '#8a8478', hand: [21, 19], handHinten: [12, 22],
      ruestung(q) { q.rect(13, 18, 5, 9, PAL.weiss); q.rect(13, 18, 5, 1, PAL.stoff); q.px(15, 21, C.blut).px(16, 23, C.blut).px(14, 25, C.blut); },
    });
    // Arzttasche
    lage(p, (q) => { q.rect(7, 21, 5, 4, PAL.leder); q.rect(8, 20, 3, 1, PAL.lederD); }, { rand: true });
    p.px(9, 22, PAL.messing);
    // Kräuterbündel / Fläschchen in der Hand
    p.rect(22, 16, 2, 3, '#5aa84f').px(22, 15, '#3d7f38').px(23, 14, '#5aa84f');
    p.rect(22, 19, 2, 2, '#8fc3e0');
    // Säge am Gürtel
    p.linie(17, 24, 20, 27, PAL.eisen).px(18, 26, PAL.eisenD).px(19, 27, PAL.eisenD).px(17, 23, PAL.holz);
  },
});

definiere('einheit', 'sanitaeter', {
  w: 32, h: 32,
  zeichne(p) {
    const fg = C.feldgrau;
    person(p, {
      rumpf: fg, rock: fg, arm: fg, hose: fg, schuh: '#1e1c1a', stiefel: true, helm: 'stahlhelm', hand: [20, 21], handHinten: [12, 22], guertel: '#2a2420', pose: 'schritt',
      ruestung(q) { q.rect(12, 17, 7, 1, S); },
    });
    // Rotes Kreuz auf dem Helm
    p.rect(14, 9, 3, 3, PAL.weiss).px(15, 9, C.kreuz).px(14, 10, C.kreuz).px(15, 10, C.kreuz).px(16, 10, C.kreuz).px(15, 11, C.kreuz);
    // Armbinde
    p.rect(17, 19, 2, 2, PAL.weiss).px(18, 19, C.kreuz).px(17, 20, C.kreuz);
    // zusammengerollte Trage über der Schulter
    lage(p, (q) => { q.linie(5, 25, 24, 10, PAL.holz); q.linie(5, 26, 24, 11, PAL.holzD); q.linie(8, 22, 18, 14, C.plane); q.linie(9, 22, 19, 14, C.plane); q.linie(8, 23, 18, 15, C.planeD); }, { schatten: 0, rand: true });
    // Sanitätstasche mit Kreuz
    lage(p, (q) => { q.rect(20, 21, 6, 5, PAL.weiss); q.rect(20, 21, 6, 1, '#e0dcd0'); q.rect(22, 22, 2, 3, C.kreuz); q.rect(21, 23, 4, 1, C.kreuz); }, { schatten: 0.1, rand: true });
    p.linie(17, 18, 21, 21, PAL.lederD);
  },
});

definiere('einheit', 'feldlazarett', {
  w: 32, h: 32,
  zeichne(p) {
    // Krankenwagen mit Kofferaufbau und Zeltanbau
    const k = '#6e7a56';
    // Sanitätszelt hinten
    lage(p, (q) => { q.poly([[1, 29], [1, 17], [6, 12], [8, 17], [8, 29]], C.plane); }, { schatten: 0.15 });
    p.linie(6, 12, 6, 29, C.planeD).rect(3, 23, 3, 6, '#3a3630');
    lage(p, (q) => {
      q.rect(7, 11, 16, 14, PAL.weiss);
      q.rect(23, 15, 7, 10, k); q.rect(23, 15, 6, 1, hell(k, 0.25));
      q.rect(7, 24, 23, 2, '#3a3632');
    }, { schatten: 0.15, rand: true });
    p.rect(24, 16, 4, 4, PAL.glas).px(24, 16, '#cfe8f6');
    // großes rotes Kreuz
    p.rect(9, 13, 12, 9, PAL.weiss);
    p.rect(13, 14, 4, 7, C.kreuz).rect(11, 16, 8, 3, C.kreuz);
    p.rect(7, 11, 16, 1, S).rect(7, 23, 16, 1, S);
    p.px(29, 21, '#f8e8a0');
    // Blaulicht
    p.rect(25, 13, 2, 2, '#3a7ae0').px(25, 13, '#a0c8ff');
    reifen(p, 11, 27, 3); reifen(p, 26, 27, 3);
  },
});
