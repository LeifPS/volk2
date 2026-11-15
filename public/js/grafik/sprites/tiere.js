// Tiere auf Rohstoff-Feldern (nur Optik) und Raubtiere. Seitenansicht, Blick nach rechts, Füße auf der vorletzten Zeile.
import { definiere } from '../sprites.js';
import { PAL, hell, dunkel, mische, Pinsel, UMRISS } from '../pixel.js';

/** Zeichnet fn auf eigenes Blatt, schattiert (Licht oben links) und überträgt. */
function form(p, fn, staerke = 0.2) {
  const t = new Pinsel(p.w, p.h); fn(t); t.schattieren(staerke);
  for (let i = 0; i < t.feld.length; i++) if (t.feld[i]) p.feld[i] = t.feld[i];
}
function teil(p, fn, rand = UMRISS) {
  const t = new Pinsel(p.w, p.h); fn(t); if (rand) t.umriss(rand);
  for (let i = 0; i < t.feld.length; i++) if (t.feld[i]) p.feld[i] = t.feld[i];
}
/** Bein: senkrechter Balken mit Huf/Pfote. */
function bein(p, x, y0, y1, b, c, fuss) { p.rect(x, y0, b, y1 - y0 + 1, c); if (fuss) p.rect(x, y1, b, 1, fuss); }

// ---------- Hirsch ----------
definiere('tier', 'hirsch', {
  w: 20, h: 16,
  zeichne(p) {
    const k = '#9a6a3a', d = '#6e4a26', D = '#5a3a1e';
    form(p, (q) => {
      bein(q, 6, 10, 14, 1, D, '#2a1a10'); bein(q, 14, 10, 14, 1, D, '#2a1a10');
      q.ellipse(8.5, 8.6, 5.5, 2.2, k);
      q.poly([[12, 8], [13.5, 4.5], [15.5, 5], [14.5, 9]], k);
      q.ellipse(15.5, 5, 1.6, 1.2, k);
      q.poly([[15.5, 4.5], [18, 5.5], [17.5, 6.5], [15.5, 6.5]], k);
      bein(q, 4, 10, 14, 1, k, '#2a1a10'); bein(q, 12, 10, 14, 1, k, '#2a1a10');
      q.px(5, 10, k).px(13, 10, k);
    });
    p.linie(5, 10, 11, 10, '#d8bc90').linie(6, 11, 10, 11, '#e0c8a0').px(11, 11, 'leer').px(7, 11, 'leer').px(8, 11, 'leer').px(9, 11, 'leer').px(10, 11, 'leer');
    p.linie(5, 6, 11, 6, '#b88050');
    p.px(3, 7, '#f4f0e6').px(3, 8, '#e0d8c8');
    p.px(16, 5, '#1a1410').px(18, 6, '#2a1a10').px(14, 3, k).px(13, 3, d);
    const A = '#e4d6b8', a = '#b4a280';
    p.linie(15, 4, 14, 1, A).linie(14, 2, 12, 1, a).linie(16, 4, 17, 1, A).linie(17, 2, 18, 1, a).px(15, 3, a);
  },
});

// ---------- Rind ----------
definiere('tier', 'rind', {
  w: 20, h: 16,
  zeichne(p) {
    const k = '#8a5634', d = '#5e3820';
    form(p, (q) => {
      bein(q, 5, 10, 14, 1, d, '#2a1a10'); bein(q, 13, 10, 14, 1, d, '#2a1a10');
      q.ellipse(8.5, 8, 6.5, 3, k);
      q.rect(14, 5, 3, 5, k); q.rect(16, 6, 2, 4, k);
      bein(q, 3, 10, 14, 2, k, '#2a1a10'); bein(q, 11, 10, 14, 2, k, '#2a1a10');
    });
    // Flecken
    for (const [x, y, rx, ry] of [[6, 7, 2, 1.5], [11, 9, 1.6, 1], [9, 6, 1, 0.6]]) for (let yy = Math.floor(y - ry); yy <= y + ry; yy++) for (let xx = Math.floor(x - rx); xx <= x + rx; xx++) {
      const dx = (xx - x) / (rx + 0.5), dy = (yy - y) / (ry + 0.5); if (dx * dx + dy * dy <= 1 && p.hole(xx, yy)) p.px(xx, yy, yy < y ? '#f4eee4' : '#d8d0c4');
    }
    p.rect(16, 8, 2, 2, '#e8a8a0').px(17, 8, '#c88078').px(18, 9, 'leer');
    p.rect(15, 5, 2, 1, '#f4eee4');
    p.px(15, 6, '#1a1410');
    p.px(14, 4, '#e8e0cc').px(13, 3, '#e8e0cc').px(17, 4, '#e8e0cc').px(18, 3, '#c8c0ac');
    p.px(13, 5, d).px(12, 5, k);
    p.px(9, 11, '#e8a8a0').px(10, 11, '#e8a8a0').px(9, 12, '#c88078');
    p.linie(2, 7, 1, 11, d).px(1, 12, '#2a1a10');
  },
});

// ---------- Schaf ----------
definiere('tier', 'schaf', {
  w: 20, h: 16,
  zeichne(p) {
    const F = '#3e3430';
    form(p, (q) => {
      bein(q, 6, 10, 14, 1, '#2a2220'); bein(q, 13, 10, 14, 1, '#2a2220');
      bein(q, 4, 10, 14, 1, F); bein(q, 11, 10, 14, 1, F);
    }, 0.15);
    form(p, (q) => {
      q.ellipse(9, 8, 6, 3.2, '#e8e4d8');
      for (const [x, y] of [[4, 6], [7, 4.8], [10.5, 4.8], [13.5, 6], [3.5, 9], [14, 9], [6, 10.5], [10, 10.5], [12.5, 10.2]]) q.kreis(x, y, 1.6, '#e8e4d8');
    }, 0.12);
    // Wolllocken
    for (const [x, y] of [[6, 6], [9, 7], [12, 6], [7, 9], [11, 9], [4, 8]]) p.px(x, y, '#c8c2b4').px(x + 1, y - 1, '#ffffff');
    form(p, (q) => { q.ellipse(16, 6.5, 1.8, 1.6, F); q.poly([[16, 6], [18.5, 7], [18, 8.5], [16, 8.5]], F); });
    p.px(14, 5, '#5a4a44').px(14, 6, F).px(13, 6, '#5a4a44');
    p.px(17, 6, '#e8d890').px(18, 8, '#c8a0a0');
  },
});

// ---------- Pferd ----------
definiere('tier', 'pferd', {
  w: 20, h: 16,
  zeichne(p) {
    const k = '#8a5230', d = '#5e361e', m = '#2e1c10';
    form(p, (q) => {
      bein(q, 5, 10, 14, 1, d, '#1e1410'); bein(q, 14, 10, 14, 1, d, '#1e1410');
      q.ellipse(9, 8, 5.5, 2.4, k);
      q.poly([[12, 8], [14, 2.5], [16, 3], [15.5, 8.5]], k);
      q.poly([[14, 2], [16, 1], [18.5, 4], [18, 5.5], [16, 4.5]], k);
      bein(q, 3, 10, 14, 1, k, '#1e1410'); bein(q, 12, 10, 14, 1, k, '#1e1410');
      q.px(4, 10, k).px(4, 11, d).px(13, 10, k);
    });
    p.linie(13, 7, 14, 2, m).linie(12, 7, 13, 3, m).px(15, 1, m).px(15, 0, 'leer');
    p.linie(3, 6, 2, 7, m).linie(2, 7, 1, 11, m).linie(3, 7, 2, 11, '#4a2e1c');
    p.px(16, 3, '#1a1410').px(18, 5, '#3a2418').px(15, 1, d);
    p.px(17, 2, '#f4eee4');
    p.linie(6, 6, 11, 6, '#b07040');
  },
});

// ---------- Fuchs ----------
definiere('tier', 'fuchs', {
  w: 20, h: 16,
  zeichne(p) {
    const o = '#d8732a', d = '#a04e18', w = '#f4ece0', s = '#2a1a14';
    form(p, (q) => {
      q.poly([[5, 9], [3, 6], [1, 7], [1, 10], [3, 12], [6, 11]], '#c8682a');
      bein(q, 7, 11, 14, 1, s); bein(q, 13, 11, 14, 1, s);
      q.ellipse(9.5, 9.5, 4.8, 1.9, o);
      q.ellipse(14.5, 7.8, 2, 1.8, o);
      q.poly([[15, 7.5], [18.5, 9], [18, 10], [15, 9.5]], o);
      q.poly([[13, 6], [13.5, 4], [14.5, 6]], o); q.poly([[15, 6], [16, 4], [16.5, 6.5]], o);
      bein(q, 6, 11, 14, 1, s); bein(q, 12, 11, 14, 1, s);
    });
    p.px(1, 7, w).px(1, 8, w).px(2, 7, w).px(1, 9, '#e0d4c4');
    p.linie(14, 9, 17, 10, w).px(15, 10, w).px(13, 10, w).px(13, 11, '#e0d4c4');
    p.linie(7, 11, 11, 11, '#f0e0cc');
    p.px(15, 7, s).px(18, 9, s).px(13, 4, s).px(16, 4, s);
    p.linie(6, 8, 11, 8, '#e88a3a');
  },
});

// ---------- Elefant ----------
definiere('tier', 'elefant', {
  w: 28, h: 20,
  zeichne(p) {
    const k = '#8c8a8e', d = '#646268', D = '#55535a';
    form(p, (q) => {
      bein(q, 8, 13, 18, 3, D, '#3a383e'); bein(q, 17, 13, 18, 3, D, '#3a383e');
      q.ellipse(12, 9.5, 8, 5.2, k);
      q.ellipse(20, 7.5, 4, 4, k);
      q.poly([[22, 7], [25, 9], [26, 13], [26, 17], [25, 18], [24, 17], [24, 13], [22.5, 11]], k); q.px(26, 18, k);
      bein(q, 5, 13, 18, 3, k, '#3a383e'); bein(q, 14, 13, 18, 3, k, '#3a383e');
      q.linie(4, 8, 3, 13, d).px(3, 14, '#3a383e');
    }, 0.18);
    // Ohr
    form(p, (q) => { q.poly([[17, 4], [20, 4.5], [20.5, 10], [18.5, 13], [16.5, 11], [16, 6]], '#7c7a80'); }, 0.15);
    p.linie(17, 6, 17, 10, '#9c9aa0').linie(18, 12, 19.5, 10, '#5a585e');
    p.px(21, 6, '#1a1410');
    p.linie(22, 11, 25, 12, '#f4eee0').px(25, 13, '#d8d0c0');
    for (let y = 12; y <= 16; y += 2) p.px(25, y, d).px(24, y + 1, d);
    p.linie(8, 5, 14, 4, '#aaa8ac');
    p.linie(6, 17, 7, 17, '#d8d4c8').linie(15, 17, 16, 17, '#d8d4c8');
  },
});

// ---------- Fischschwarm (im Wasser, ohne Umriss) ----------
function fisch(p, x, y, k, d, s) {
  p.ellipse(x, y, 2.6, 1.1, k);
  p.linie(x - 2, y - 1, x + 2, y - 1, d).px(x - 1, y - 2, d);
  p.poly([[x - 2.5, y], [x - 4.5, y - 1.5], [x - 4.5, y + 1.5]], d);
  p.linie(x - 1, y + 1, x + 1, y + 1, s);
  p.px(x + 2, y, '#1a1a24').px(x + 3, y, k);
}
definiere('tier', 'fisch', {
  w: 20, h: 16, umriss: false,
  zeichne(p) {
    teil(p, (q) => { fisch(q, 7, 4, '#c8d6e0', '#5a7a9a', '#f4f8fa'); fisch(q, 14, 8, '#d8c8a0', '#9a7a4a', '#f8f0e0'); fisch(q, 7, 11, '#c8d6e0', '#5a7a9a', '#f4f8fa'); }, '#1e4a74');
    for (const [x, y] of [[12, 3], [13, 2], [3, 14], [16, 13], [17, 12]]) p.px(x, y, '#a8d4f0');
    p.linie(10, 14, 13, 14, '#8fc0ee').linie(1, 7, 3, 7, '#8fc0ee');
  },
});

// ---------- Wal ----------
definiere('tier', 'wal', {
  w: 28, h: 20, umriss: false,
  zeichne(p) {
    const k = '#4a5c74', d = '#34445a';
    teil(p, (q) => {
      form(q, (r) => {
        for (let y = 9; y <= 15; y++) for (let x = 3; x <= 24; x++) { const dx = (x - 14) / 10.5, dy = (y - 15.5) / 6; if (dx * dx + dy * dy <= 1) r.px(x, y, k); }
        r.poly([[15, 10], [17, 7.5], [18, 10]], d);
        // Schwanzflosse
        r.poly([[1, 6], [4, 9], [6, 9], [7, 6], [5, 8], [4, 7]], k);
        r.rect(4, 9, 2, 6, k);
      }, 0.2);
      q.px(19, 11, '#1a1a24');
      q.linie(8, 13, 20, 13, '#5a7090');
    });
    // Fontäne
    teil(p, (q) => {
      q.linie(21, 9, 21, 3, '#ffffff').linie(20, 8, 19, 3, '#d8eeff').linie(22, 8, 23, 3, '#d8eeff');
      for (const [x, y] of [[18, 2], [17, 3], [16, 5], [24, 2], [25, 3], [26, 5], [20, 1], [22, 1]]) q.px(x, y, '#d8eeff');
      for (const [x, y] of [[15, 7], [27, 7], [21, 1]]) q.px(x, y, '#ffffff');
    }, '#5a9ad0');
    // Wasser rundherum
    p.linie(0, 16, 6, 16, '#8fc0ee').linie(9, 17, 19, 17, '#d8eeff').linie(21, 16, 27, 16, '#8fc0ee').linie(6, 18, 9, 18, '#8fc0ee').linie(20, 18, 24, 18, '#a8d4f0');
    p.px(3, 15, '#ffffff').px(25, 15, '#ffffff');
  },
});

// ---------- Raubtiere 28x22 ----------

definiere('tier', 'wolf', {
  w: 28, h: 22,
  zeichne(p) {
    const k = '#8a8e96', d = '#5c606a', D = '#4a4e58', h = '#b8bcc4';
    form(p, (q) => {
      // Schwanz
      q.poly([[6, 10], [3, 11], [1, 15], [2, 17], [4, 14], [7, 12]], d);
      bein(q, 8, 14, 20, 2, D, '#2a2a30'); bein(q, 19, 14, 20, 2, D, '#2a2a30');
      q.ellipse(11, 12, 6, 3.4, k);
      q.ellipse(17, 11, 4.5, 4.2, k);
      // Kopf gesenkt
      q.ellipse(21.5, 12.5, 3, 2.6, k);
      q.poly([[22, 11.5], [26.5, 13], [26.5, 14.5], [22, 15]], k);
      q.poly([[19.5, 10.5], [20, 7], [21.5, 10]], k); q.poly([[21.5, 10.5], [23, 7.5], [23.5, 11]], k);
      bein(q, 6, 14, 20, 2, k, '#2a2a30'); bein(q, 16, 14, 20, 2, k, '#2a2a30');
      q.px(5, 14, k).px(18, 15, k);
    });
    // gesträubtes Nackenfell
    for (const [x, y] of [[13, 8], [15, 7], [17, 6.5], [11, 8.5], [19, 7]]) p.px(x, y, h).px(x, y - 1, d);
    p.linie(8, 15, 15, 15, '#c8ccd2');
    // Maul aufgerissen
    p.linie(23, 14, 26, 14, '#8a1a1a').px(22, 14, '#5a1010');
    p.px(23, 13, '#f8f4ea').px(25, 13, '#f8f4ea').px(24, 15, '#f8f4ea').px(26, 15, '#f8f4ea');
    p.px(26, 12, '#1a1a1e').px(23, 12, '#f0d020').px(22, 12, '#1a1a1e');
    p.linie(20, 8, 20, 9, '#d8a0a0');
  },
});

definiere('tier', 'baer', {
  w: 28, h: 22,
  zeichne(p) {
    const k = '#6e4a2e', d = '#4a301c', D = '#3e2816', s = '#b08a5a';
    form(p, (q) => {
      bein(q, 8, 14, 20, 3, D); bein(q, 19, 14, 20, 3, D);
      q.ellipse(12, 12, 8.5, 5, k);
      q.ellipse(16, 9.5, 5, 4.5, k);
      q.ellipse(22, 12, 3.5, 3.2, k);
      q.poly([[23, 11.5], [26.5, 12.5], [26.5, 15], [23, 15.5]], k);
      q.kreis(20.5, 8.6, 1.4, k);
      bein(q, 5, 14, 20, 3, k); bein(q, 16, 14, 20, 4, k);
    });
    p.linie(5, 20, 7, 20, '#f0e8d8').linie(16, 20, 19, 20, '#f0e8d8');
    p.px(6, 19, '#2a1a10').px(17, 19, '#2a1a10').px(18, 19, '#2a1a10');
    p.rect(24, 13, 2, 1, s).px(26, 12, '#1a1410');
    p.linie(23, 15, 26, 15, '#8a1a1a').px(24, 14, '#f8f4ea').px(26, 14, '#f8f4ea').px(25, 16, '#f8f4ea');
    p.px(23, 11, '#1a1410').px(22, 11, '#1a1410');
    p.px(20, 8, '#4a301c');
    for (const [x, y] of [[10, 9], [13, 8], [15, 6], [8, 11], [12, 12]]) p.px(x, y, '#8a603c');
  },
});

function katze(p, F, opt = {}) {
  const { k, d, D, w } = F;
  form(p, (q) => {
    // Schwanz geschwungen
    q.linie(5, 11, 2, 9, d).linie(2, 9, 1, 5, d).linie(5, 12, 3, 9, d).linie(3, 9, 2, 5, d).px(2, 4, d);
    if (opt.dickSchwanz) { q.linie(4, 12, 1, 9, d).linie(1, 9, 0, 6, d); q.linie(6, 12, 3, 10, d); }
    bein(q, 8, 14, 20, 2, D); bein(q, 18, 14, 20, 2, D);
    q.ellipse(12, 12.5, 7.5, 3.3, k);
    q.ellipse(17.5, 12, 3.6, 3.6, k);
    q.ellipse(22, 10.5, 3.2, 3, k);
    q.poly([[23, 10], [26.5, 11.5], [26.5, 13.5], [23, 13.5]], k);
    q.poly([[19.5, 9], [20, 6.5], [21.5, 8]], k); q.poly([[22, 7.5], [23.5, 6.5], [24, 8.5]], k);
    bein(q, 5, 14, 20, 2, k); bein(q, 15, 14, 20, 3, k);
    q.px(4, 14, k).px(7, 15, k);
  }, 0.18);
  // Bauch, Schnauze
  p.linie(8, 15, 16, 15, w).linie(9, 16, 14, 16, w).px(16, 16, w);
  p.rect(24, 12, 3, 1, w).px(26, 11, '#3a2018');
  // Maul offen, Zähne
  p.linie(23, 14, 26, 14, '#8a1a1a').px(23, 13, '#f8f4ea').px(25, 13, '#f8f4ea').px(24, 15, '#f8f4ea').px(26, 15, '#f8f4ea');
  p.px(23, 10, opt.auge || '#f0d020').px(22, 10, '#1a1410');
  p.px(20, 8, '#3a2018').px(23, 7, '#3a2018');
  p.linie(5, 20, 6, 20, w).linie(15, 20, 17, 20, w);
}

definiere('tier', 'tiger', {
  w: 28, h: 22,
  zeichne(p) {
    katze(p, { k: '#e0822a', d: '#c06a1e', D: '#a0561a', w: '#f4ece0' });
    const s = '#22181a';
    for (const x of [7, 10, 13, 16, 19]) { p.linie(x, 9, x + 1, 11, s); p.px(x + 1, 12, s); if (x % 2) p.px(x - 1, 13, s); }
    p.linie(21, 8, 21, 9, s).linie(24, 9, 23, 10, s).px(20, 11, s).px(20, 12, s);
    for (const [x, y] of [[1, 6], [2, 8], [3, 10], [6, 15], [16, 17], [19, 15], [9, 17]]) p.px(x, y, s);
  },
});

definiere('tier', 'jaguar', {
  w: 28, h: 22,
  zeichne(p) {
    katze(p, { k: '#d8a23a', d: '#b8842a', D: '#9a6c20', w: '#f4e6c8' });
    const s = '#2a1a10', m = '#a8701e';
    const ros = (x, y) => { p.px(x, y, s).px(x + 2, y, s).px(x + 1, y - 1, s).px(x + 1, y + 1, s).px(x + 1, y, m); };
    for (const [x, y] of [[6, 11], [9, 10], [12, 11], [15, 10], [10, 13], [14, 13], [17, 12], [7, 13], [19, 9]]) ros(x, y);
    for (const [x, y] of [[21, 9], [23, 8], [20, 12], [1, 7], [2, 5], [3, 10], [6, 17], [16, 17], [19, 15]]) p.px(x, y, s);
  },
});

definiere('tier', 'schneeleopard', {
  w: 28, h: 22,
  zeichne(p) {
    katze(p, { k: '#c8c8c2', d: '#a8a8a2', D: '#8a8a86', w: '#f8f8f4' }, { dickSchwanz: true, auge: '#9ad0e0' });
    const s = '#3a3a40', m = '#8a8a88';
    const ros = (x, y) => { p.px(x, y, s).px(x + 1, y - 1, s).px(x + 2, y, s).px(x + 1, y, m); };
    for (const [x, y] of [[6, 11], [10, 10], [14, 11], [8, 13], [12, 13], [16, 13], [18, 10]]) ros(x, y);
    for (const [x, y] of [[21, 9], [23, 8], [20, 12], [0, 7], [1, 5], [2, 9], [6, 17], [16, 17]]) p.px(x, y, s);
  },
});

definiere('tier', 'krokodil', {
  w: 28, h: 22,
  zeichne(p) {
    const k = '#4e6e34', d = '#34502a', D = '#2a4022', b = '#b0b070';
    form(p, (q) => {
      bein(q, 7, 17, 19, 2, D); bein(q, 17, 17, 19, 2, D);
      // Schwanz bis Kopf
      q.poly([[1, 16], [6, 13], [12, 12], [18, 12], [21, 13], [21, 18], [12, 18.5], [5, 18], [1, 17]], k);
      // Oberkiefer aufgerissen
      q.poly([[19, 13], [22, 11], [26.5, 9.5], [27, 11], [22, 15], [20, 16]], k);
      // Unterkiefer
      q.poly([[20, 17], [26.5, 16.5], [26.5, 18], [20, 18.5]], k);
      q.kreis(21, 12, 1.3, k);
      bein(q, 4, 17, 20, 2, k); bein(q, 14, 17, 20, 2, k);
      q.px(3, 20, k).px(13, 20, k).px(16, 20, 'leer');
    }, 0.2);
    // Rachen und Zähne
    p.poly([[22, 15], [26, 11.5], [26, 16], [22, 17]], '#b03a2a');
    p.linie(23, 16, 26, 16, '#e07060');
    for (const [x, y] of [[23, 14], [24, 13], [25, 12], [26, 11]]) p.px(x, y + 1, '#f8f4ea');
    for (const x of [22, 24, 26]) p.px(x, 16, '#f8f4ea');
    p.px(21, 11, '#f0d020').px(22, 11, '#1a1410');
    // Rückenschuppen
    for (let x = 4; x <= 19; x += 2) p.px(x, Math.round(13 + Math.max(0, 6 - x) * 0.5) - 1, D).px(x + 1, Math.round(13 + Math.max(0, 6 - x) * 0.5) - 1, k);
    for (let x = 6; x <= 18; x += 3) p.px(x, 15, d).px(x + 1, 15, d);
    p.linie(6, 18, 20, 18, b);
  },
});
