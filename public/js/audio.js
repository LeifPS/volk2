// Ton-Engine von Volk: Chiptune-Musik und Effekte, vollständig per Web Audio API erzeugt (keine Audiodateien).
// Öffentlich: tonStarten(), ton(art), musikZeitalter(z), einstellungenSetzen({ton, musik, lautstaerke}),
//             musikRendern(zeitalter, sekunden) -> Promise<AudioBuffer>, wavAusBuffer(buffer) -> ArrayBuffer.

const SPEICHER = 'volk_ton';
const E = { ton: true, musik: true, lautstaerke: 0.6 };
try { const s = JSON.parse(localStorage.getItem(SPEICHER) || 'null'); if (s) uebernehmen(s); } catch { /* kein Speicher */ }
function uebernehmen(o) {
  if (!o || typeof o !== 'object') return;
  if (typeof o.ton === 'boolean') E.ton = o.ton;
  if (typeof o.musik === 'boolean') E.musik = o.musik;
  const l = Number(o.lautstaerke);
  if (o.lautstaerke != null && Number.isFinite(l)) E.lautstaerke = Math.min(1, Math.max(0, l));
}

// ---------------------------------------------------------------- Grundlagen
const PEGEL_MUSIK = 0.5, PEGEL_EFFEKTE = 0.8;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function zufall(seed) { // mulberry32, fester Seed -> reproduzierbare Variation
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const wahl = (r, l) => l[Math.floor(r() * l.length)];

// Wellenformen und Rauschen je Kontext zwischenspeichern
const kontextDaten = new WeakMap();
function daten(ctx) {
  let d = kontextDaten.get(ctx);
  if (d) return d;
  const puls = (duty, n, weich) => {
    const re = new Float32Array(n + 1), im = new Float32Array(n + 1);
    for (let k = 1; k <= n; k++) re[k] = (Math.sin(Math.PI * k * duty) / k) / (1 + k * weich);
    return ctx.createPeriodicWave(re, im);
  };
  const flRe = new Float32Array([0, 0, 0, 0, 0, 0]), flIm = new Float32Array([0, 1, 0.18, 0.06, 0.03, 0.01]);
  const rausch = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), rd = rausch.getChannelData(0);
  let x = 12345;
  for (let i = 0; i < rd.length; i++) { x = (x * 1103515245 + 12345) & 0x7fffffff; rd[i] = x / 0x3fffffff - 1; }
  d = {
    p12: puls(0.125, 24, 0.06), p25: puls(0.25, 24, 0.06), p50: puls(0.5, 24, 0.08),
    weich: puls(0.5, 10, 0.35), floete: ctx.createPeriodicWave(flRe, flIm), rausch,
  };
  kontextDaten.set(ctx, d);
  return d;
}

// Instrumente: welle, a (Anschlag), s (Halte-Pegel), dz (Abfall-Zeitkonstante), r (Ausklang), pluck (zupfen: tau), vib, det
const INSTR = {
  floete: { welle: 'floete', a: 0.07, s: 0.8, dz: 0.4, r: 0.22, vib: 5.2, vt: 0.005, lp: 3200 },
  puls: { welle: 'p25', a: 0.012, s: 0.55, dz: 0.18, r: 0.12, vib: 5.5, vt: 0.003, lp: 2600 },
  schalmei: { welle: 'p12', a: 0.03, s: 0.6, dz: 0.3, r: 0.15, vib: 4.5, vt: 0.004, lp: 1900 },
  rund: { welle: 'p50', a: 0.015, s: 0.6, dz: 0.2, r: 0.12, lp: 2200 },
  laute: { welle: 'p12', a: 0.004, pluck: 0.32, r: 0.1, lp: 2400 },
  lyra: { welle: 'triangle', a: 0.004, pluck: 0.6, r: 0.15, lp: 4000 },
  arp: { welle: 'p25', a: 0.003, pluck: 0.12, r: 0.06, lp: 2000 },
  glocke: { welle: 'sine', a: 0.004, pluck: 0.9, r: 0.3, lp: 5000 },
  epiano: { welle: 'weich', a: 0.006, pluck: 0.7, r: 0.15, lp: 2400 },
  pad: { welle: 'weich', a: 0.9, s: 1, dz: 1, r: 1.4, det: 7, lp: 1400 },
  sinus: { welle: 'sine', a: 0.08, s: 0.85, dz: 0.5, r: 0.4, vib: 4, vt: 0.004, lp: 5000 },
  bass: { welle: 'triangle', a: 0.01, s: 0.85, dz: 0.4, r: 0.08, lp: 1200 },
  bordun: { welle: 'triangle', a: 0.6, s: 1, dz: 1, r: 0.9, lp: 900 },
  subbass: { welle: 'sine', a: 0.05, s: 0.9, dz: 0.5, r: 0.3, lp: 600 },
};

function note(ctx, ziel, name, t, d, f, v) {
  const I = INSTR[name], D = daten(ctx);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v, t + I.a);
  let ende;
  if (I.pluck) {
    g.gain.setTargetAtTime(0, t + I.a, I.pluck);
    const aus = t + Math.max(I.a, d);
    g.gain.setTargetAtTime(0, aus, I.r / 3);
    ende = Math.min(t + I.a + I.pluck * 5, aus + I.r * 2);
  } else {
    g.gain.setTargetAtTime(v * I.s, t + I.a, I.dz);
    const aus = t + Math.max(I.a, d);
    g.gain.setTargetAtTime(0, aus, I.r / 3);
    ende = aus + I.r * 2;
  }
  g.connect(ziel);
  const oszis = I.det ? [-I.det, I.det] : [0];
  for (const det of oszis) {
    const o = ctx.createOscillator();
    if (D[I.welle]) o.setPeriodicWave(D[I.welle]); else o.type = I.welle;
    o.frequency.setValueAtTime(f, t);
    if (det) o.detune.setValueAtTime(det, t);
    o.connect(g);
    if (I.vib && d > 0.35) { // verzögertes Vibrato nur bei langen Tönen
      const l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = I.vib; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * I.vt, t + Math.min(0.5, d * 0.6));
      l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(ende);
    }
    o.start(t); o.stop(ende);
  }
}

// Schlagwerk aus Rauschen und kurzen Tonhöhen-Stürzen
function schlag(ctx, ziel, art, t, v) {
  const D = daten(ctx);
  const rauschen = (dauer, typ, freq, q, pegel) => {
    const s = ctx.createBufferSource(); s.buffer = D.rausch;
    const f = ctx.createBiquadFilter(); f.type = typ; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(pegel, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dauer);
    s.connect(f); f.connect(g); g.connect(ziel);
    s.start(t, (t * 7.31) % 0.8); s.stop(t + dauer + 0.02);
  };
  const ton_ = (f0, f1, dauer, pegel, typ = 'sine') => {
    const o = ctx.createOscillator(); o.type = typ;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dauer);
    const g = ctx.createGain(); g.gain.setValueAtTime(pegel, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dauer);
    o.connect(g); g.connect(ziel); o.start(t); o.stop(t + dauer + 0.02);
  };
  switch (art) {
    case 'trommel': ton_(140, 62, 0.22, v); rauschen(0.07, 'lowpass', 900, 0.7, v * 0.35); break;
    case 'kick': ton_(130, 45, 0.18, v); break;
    case 'snare': rauschen(0.12, 'bandpass', 1900, 0.9, v * 0.8); ton_(200, 150, 0.06, v * 0.3, 'triangle'); break;
    case 'hat': rauschen(0.035, 'highpass', 7000, 0.7, v); break;
    case 'tamb': rauschen(0.09, 'highpass', 5200, 1.5, v); break;
    case 'tock': ton_(900, 700, 0.05, v, 'triangle'); break;
  }
}

// ---------------------------------------------------------------- Komposition
const SKALA = {
  pentaMoll: [0, 3, 5, 7, 10], ionisch: [0, 2, 4, 5, 7, 9, 11], dorisch: [0, 2, 3, 5, 7, 9, 10],
  mixo: [0, 2, 4, 5, 7, 9, 10], aeolisch: [0, 2, 3, 5, 7, 8, 10], lydisch: [0, 2, 4, 6, 7, 9, 11],
};
const R4 = [
  [[0, 4], [4, 4], [8, 6], [14, 2]], [[0, 6], [6, 2], [8, 4], [12, 4]], [[0, 2], [2, 2], [4, 4], [8, 8]],
  [[0, 8], [8, 4], [12, 4]], [[0, 3], [3, 1], [4, 4], [8, 2], [10, 2], [12, 4]], [[0, 4], [6, 2], [8, 8]],
];
const R4_KAD = [[[0, 4], [4, 12]], [[0, 16]], [[0, 2], [2, 2], [4, 10]]];
const R3 = [[[0, 4], [4, 4], [8, 4]], [[0, 6], [6, 2], [8, 4]], [[0, 4], [4, 2], [6, 2], [8, 4]], [[0, 8], [8, 4]], [[0, 2], [2, 2], [4, 4], [8, 4]]];
const R3_KAD = [[[0, 12]], [[0, 4], [4, 8]]];
const R4_BEWEGT = [[[0, 2], [2, 2], [4, 2], [6, 2], [8, 4], [12, 4]], [[0, 3], [3, 3], [6, 2], [8, 2], [10, 2], [12, 4]], [[0, 4], [4, 2], [6, 2], [8, 6], [14, 2]]];
const R4_SYNK = [[[0, 3], [3, 3], [6, 2], [8, 6], [14, 2]], [[2, 2], [4, 4], [10, 6]], [[0, 6], [6, 4], [10, 2], [12, 4]]];

// Je Zeitalter: Tonart, Tempo, Takt, Klangfarben, Schlagwerk, Abschnitte und Form
const ZEITALTER = [
  { // 0 Antike: pentatonisch, Flöte und Rahmentrommel
    seed: 101, grund: 62, skala: 'pentaMoll', bpm: 72, takt: 4, rh: R4, kad: R4_KAD, echo: 0.3, bassArt: 'bordun', bassInstr: 'bordun',
    perc: [['trommel', 0, 0.5], ['trommel', 10, 0.25], ['tock', 6, 0.12], ['tock', 14, 0.1]],
    abschnitte: {
      A: { prog: [0, 0, 2, 0, 3, 3, 2, 0], mel: 'floete', okt: 1, dichte: 0.75, perc: 1 },
      B: { prog: [3, 3, 2, 2, 0, 0, 4, 0], mel: 'floete', okt: 1, hoch: 2, dichte: 0.85, perc: 1, arp: 'lyra', arpTakt: 8 },
      C: { prog: [0, 4, 0, 2, 0, 4, 3, 0], mel: 'lyra', okt: 1, dichte: 0.45, perc: 0 },
      P: { prog: [0, 0, 0, 0], mel: null, perc: 0, pad: 'floete' },
    },
    form: ['A', 'B', 'A', 'C', 'P', 'B', 'A'],
  },
  { // 1 Klassik: ionisch, Lyra-Arpeggien, getragen
    seed: 202, grund: 53, skala: 'ionisch', bpm: 80, takt: 4, rh: R4, kad: R4_KAD, echo: 0.25, bassArt: 'halbe', bassInstr: 'bass',
    perc: [['trommel', 0, 0.35], ['tock', 8, 0.1]],
    abschnitte: {
      A: { prog: [0, 3, 0, 4, 5, 3, 4, 0], mel: 'floete', okt: 1, dichte: 0.8, perc: 1, arp: 'lyra', arpTakt: 4 },
      B: { prog: [5, 5, 3, 3, 1, 1, 4, 4], mel: 'puls', okt: 1, dichte: 0.7, perc: 1, arp: 'lyra', arpTakt: 8 },
      C: { prog: [0, 5, 3, 4], mel: 'lyra', okt: 1, hoch: 2, dichte: 0.5, perc: 0, begleit: 'pad' },
      P: { prog: [0, 3, 0, 0], mel: null, perc: 0, arp: 'lyra', arpTakt: 4 },
    },
    form: ['A', 'B', 'A', 'C', 'P', 'B', 'A'],
  },
  { // 2 Mittelalter: dorisch, Laute, Bordun-Quinte
    seed: 303, grund: 50, skala: 'dorisch', bpm: 76, takt: 4, rh: R4, kad: R4_KAD, echo: 0.22, bassArt: 'bordun', bassInstr: 'bordun',
    perc: [['trommel', 0, 0.4], ['trommel', 6, 0.2], ['tamb', 8, 0.06], ['tamb', 12, 0.04]],
    abschnitte: {
      A: { prog: [0, 0, 6, 0, 0, 3, 6, 0], mel: 'schalmei', okt: 1, dichte: 0.75, perc: 1, arp: 'laute', arpTakt: 4 },
      B: { prog: [2, 2, 6, 6, 3, 3, 4, 0], mel: 'laute', okt: 1, hoch: 2, dichte: 0.85, perc: 1 },
      C: { prog: [0, 6, 0, 3], mel: 'floete', okt: 1, dichte: 0.55, perc: 0, arp: 'laute', arpTakt: 8 },
      P: { prog: [0, 0, 6, 0], mel: null, perc: 0, arp: 'laute', arpTakt: 2 },
    },
    form: ['A', 'B', 'A', 'C', 'P', 'B', 'A'],
  },
  { // 3 Renaissance: Dreiertakt-Tanz, Dur
    seed: 404, grund: 55, skala: 'ionisch', bpm: 108, takt: 3, rh: R3, kad: R3_KAD, echo: 0.18, bassArt: 'tanz', bassInstr: 'bass',
    perc: [['trommel', 0, 0.35], ['tamb', 4, 0.06], ['tamb', 8, 0.06]],
    abschnitte: {
      A: { prog: [0, 4, 0, 4, 5, 3, 4, 0], mel: 'floete', okt: 1, dichte: 0.85, perc: 1, arp: 'laute', arpTakt: 6 },
      B: { prog: [3, 0, 3, 4, 5, 2, 3, 4], mel: 'rund', okt: 1, dichte: 0.8, perc: 1, begleit: 'laute' },
      C: { prog: [5, 2, 3, 0, 5, 2, 4, 4], mel: 'laute', okt: 1, hoch: 2, dichte: 0.6, perc: 0 },
      P: { prog: [0, 3, 4, 0], mel: null, perc: 0, arp: 'laute', arpTakt: 3 },
    },
    form: ['A', 'A', 'B', 'C', 'A', 'P', 'B', 'A'],
  },
  { // 4 Industrie: äolisch, rhythmisch, Ostinato
    seed: 505, grund: 45, skala: 'aeolisch', bpm: 100, takt: 4, rh: R4_BEWEGT, kad: R4_KAD, echo: 0.14, bassArt: 'ostinato', bassInstr: 'bass',
    perc: [['kick', 0, 0.45], ['kick', 8, 0.35], ['snare', 4, 0.07], ['snare', 12, 0.08], ['hat', 2, 0.03], ['hat', 6, 0.03], ['hat', 10, 0.03], ['hat', 14, 0.035]],
    abschnitte: {
      A: { prog: [0, 5, 2, 6, 0, 5, 3, 4], mel: 'puls', okt: 1, dichte: 0.75, perc: 2, arp: 'arp', arpTakt: 8 },
      B: { prog: [3, 3, 0, 0, 5, 5, 4, 4], mel: 'rund', okt: 1, dichte: 0.7, perc: 2, arp: 'arp', arpTakt: 16 },
      C: { prog: [0, 5, 3, 4], mel: null, perc: 1, arp: 'arp', arpTakt: 8, begleit: 'pad' },
      P: { prog: [0, 5, 0, 5], mel: null, perc: 0, begleit: 'pad' },
    },
    form: ['C', 'A', 'B', 'A', 'P', 'C', 'B', 'A'],
  },
  { // 5 Moderne: Dur mit Septakkorden, laufender Bass, weiche Synkopen
    seed: 606, grund: 48, skala: 'ionisch', bpm: 90, takt: 4, rh: R4_SYNK, kad: R4_KAD, echo: 0.2, bassArt: 'lauf', bassInstr: 'bass', sept: true,
    perc: [['kick', 0, 0.35], ['kick', 10, 0.2], ['snare', 8, 0.05], ['hat', 4, 0.025], ['hat', 12, 0.025], ['hat', 14, 0.018]],
    abschnitte: {
      A: { prog: [0, 5, 1, 4, 0, 5, 1, 4], mel: 'puls', okt: 1, dichte: 0.7, perc: 2, begleit: 'epiano' },
      B: { prog: [3, 2, 1, 4, 3, 2, 5, 4], mel: 'sinus', okt: 1, hoch: 2, dichte: 0.6, perc: 1, begleit: 'epiano' },
      C: { prog: [3, 3, 0, 0, 1, 1, 4, 4], mel: 'epiano', okt: 1, dichte: 0.5, perc: 1, begleit: 'pad' },
      P: { prog: [0, 3, 0, 3], mel: null, perc: 0, begleit: 'pad' },
    },
    form: ['A', 'B', 'A', 'C', 'P', 'B', 'A'],
  },
  { // 6 Atomzeit: lydisch, schwebende Flächen, Echo-Arpeggien
    seed: 707, grund: 50, skala: 'lydisch', bpm: 66, takt: 4, rh: R4, kad: R4_KAD, echo: 0.45, bassArt: 'bordun', bassInstr: 'subbass', sept: true,
    perc: [['hat', 4, 0.015], ['hat', 12, 0.02], ['kick', 0, 0.18]],
    abschnitte: {
      A: { prog: [0, 0, 1, 1, 0, 0, 5, 4], mel: 'sinus', okt: 1, dichte: 0.5, perc: 1, begleit: 'pad', arp: 'glocke', arpTakt: 4 },
      B: { prog: [5, 4, 0, 1, 5, 4, 3, 1], mel: 'glocke', okt: 1, hoch: 2, dichte: 0.55, perc: 0, begleit: 'pad' },
      C: { prog: [0, 1, 0, 1], mel: null, perc: 1, begleit: 'pad', arp: 'arp', arpTakt: 8 },
      P: { prog: [0, 5, 0, 1], mel: null, perc: 0, begleit: 'pad' },
    },
    form: ['C', 'A', 'B', 'P', 'A', 'C', 'B'],
  },
];

const LAUT = { floete: 0.2, puls: 0.11, schalmei: 0.12, rund: 0.1, laute: 0.17, lyra: 0.24, arp: 0.06, glocke: 0.12, epiano: 0.13, pad: 0.055, sinus: 0.2, bass: 0.26, bordun: 0.14, subbass: 0.22 };
const PAN = { floete: 0.15, puls: 0.1, schalmei: 0.1, rund: -0.1, laute: -0.3, lyra: -0.25, arp: 0.35, glocke: 0.3, epiano: -0.2, pad: 0, sinus: 0.1, bass: 0, bordun: 0, subbass: 0 };

const songs = new Map();
function komponiere(z) {
  if (songs.has(z)) return songs.get(z);
  const Z = ZEITALTER[z], r = zufall(Z.seed), sk = SKALA[Z.skala], n = sk.length;
  const takt = Z.takt * 4, ev = [];
  const midi = (i) => Z.grund + sk[((i % n) + n) % n] + 12 * Math.floor(i / n);
  const akkord = (c) => n === 5 ? [c, c + 2, c + 3] : Z.sept ? [c, c + 2, c + 4, c + 6] : [c, c + 2, c + 4];
  const motive = {};
  const neuesMotiv = () => ({ rh: [wahl(r, Z.rh), wahl(r, Z.rh)], kont: Array.from({ length: 12 }, () => wahl(r, [-2, -1, -1, -1, 1, 1, 1, 2, 0, -3, 3])) });
  const mutiere = (m) => { const k = { rh: [...m.rh], kont: [...m.kont] }; for (let j = 0; j < 3; j++) k.kont[Math.floor(r() * k.kont.length)] = wahl(r, [-2, -1, 1, 2]); if (r() < 0.5) k.rh[1] = wahl(r, Z.rh); return k; };
  const naechster = (cur, c, oben) => { let best = c, bd = 1e9; for (let i = c - n * 3; i <= c + n * 4; i++) { if (!akkord(c).some((a) => (((i - a) % n) + n) % n === 0)) continue; const dd = Math.abs(i - cur) + (oben && i < cur ? 0.5 : 0); if (dd < bd) { bd = dd; best = i; } } return best; };
  const grundton = (cur, c) => { let best = c, bd = 1e9; for (let i = c - n * 3; i <= c + n * 4; i += n) if (Math.abs(i - cur) < bd) { bd = Math.abs(i - cur); best = i; } return best; };
  let pos = 0, bisher = {};
  for (const buchst of Z.form) {
    const A = Z.abschnitte[buchst], takte = A.prog.length;
    if (!motive[buchst]) motive[buchst] = neuesMotiv(); else motive[buchst] = mutiere(motive[buchst]);
    const mot = motive[buchst], wdh = bisher[buchst] = (bisher[buchst] || 0) + 1;
    const lo = n * (A.okt || 1) - 2, hi = n * ((A.okt || 1) + 1) + (A.hoch === 2 ? n - 1 : 2);
    let cur = n * (A.okt || 1) + (A.hoch === 2 ? n >> 1 : 0), leer = false;
    for (let b = 0; b < takte; b++) {
      const t0 = pos + b * takt, c = A.prog[b], ak = akkord(c), letzter = b === takte - 1;
      // Melodie
      if (A.mel) {
        const rest = !leer && b % 4 === 2 && r() > A.dichte + 0.2;
        leer = rest;
        if (!rest) {
          const kad = b % 4 === 3, rh = kad ? wahl(r, Z.kad) : mot.rh[(b + (b >= 4 ? 1 : 0) + wdh) % 2];
          rh.forEach(([s, d], k) => {
            if (k > 0 && r() > A.dichte) return;
            if (k === 0) cur = naechster(cur + mot.kont[b % mot.kont.length], c, b % 2 === 1);
            else cur += mot.kont[(k + b * 3) % mot.kont.length];
            if (kad && k === rh.length - 1) cur = grundton(cur, c);
            else if (s % 8 === 0 && k > 0) cur = naechster(cur, c, false);
            while (cur > hi) cur -= n; while (cur < lo) cur += n;
            while (midi(cur) > 88) cur -= n;
            ev.push({ s: t0 + s, d: kad && k === rh.length - 1 ? d - 2 : d * 0.92, i: A.mel, m: midi(cur), v: 0.85 + r() * 0.15 });
          });
        }
      }
      // Bass
      const bi = Z.bassInstr, wurzel = c - n;
      if (Z.bassArt === 'bordun') {
        if (b % 2 === 0 || A.prog[b - 1] !== c) {
          const d = (A.prog[b + 1] === c && b % 2 === 0 ? 2 : 1) * takt - 1;
          ev.push({ s: t0, d, i: bi, m: midi(wurzel), v: 1 });
          if (bi === 'bordun') ev.push({ s: t0, d, i: bi, m: midi(wurzel) + 7, v: 0.6 });
        }
      } else if (Z.bassArt === 'halbe') {
        ev.push({ s: t0, d: 7, i: bi, m: midi(wurzel), v: 1 }); ev.push({ s: t0 + 8, d: 7, i: bi, m: midi(wurzel + (n === 5 ? 3 : 4)), v: 0.8 });
      } else if (Z.bassArt === 'tanz') {
        ev.push({ s: t0, d: 5, i: bi, m: midi(wurzel), v: 1 }); ev.push({ s: t0 + 8, d: 3, i: bi, m: midi(wurzel + 4), v: 0.6 });
      } else if (Z.bassArt === 'ostinato') {
        const fig = [0, 0, 4, 0, 7, 0, 4, 2];
        fig.forEach((o, k) => ev.push({ s: t0 + k * 2, d: 1.6, i: bi, m: midi(wurzel) + (o === 7 ? 12 : 0) + (o === 4 ? 7 : o === 2 ? 3 : 0), v: k % 4 === 0 ? 1 : 0.7 }));
      } else if (Z.bassArt === 'lauf') {
        const ziel = letzter ? A.prog[0] : A.prog[b + 1];
        [wurzel, wurzel + 2, wurzel + 4].forEach((i, k) => ev.push({ s: t0 + k * 4, d: 3.4, i: bi, m: midi(i), v: k ? 0.75 : 1 }));
        ev.push({ s: t0 + 12, d: 3.4, i: bi, m: midi(ziel - n) + (r() < 0.5 ? -1 : 2), v: 0.7 });
      }
      // Arpeggio
      if (A.arp) {
        const schritt = takt / A.arpTakt, folge = [...ak, ak[1] + n, ...ak.slice(1).reverse()];
        for (let k = 0; k < A.arpTakt; k++) ev.push({ s: t0 + k * schritt, d: schritt * 0.9, i: A.arp, m: midi(folge[(k + b) % folge.length] + (A.arp === 'arp' || A.arp === 'glocke' ? n : 0)), v: k === 0 ? 1 : 0.75 });
      }
      // Begleitung / Fläche
      const fl = A.begleit || A.pad;
      if (fl) {
        const tonart = fl === 'floete' ? [c] : ak;
        if (fl === 'epiano' || fl === 'laute') {
          for (const s of Z.takt === 3 ? [4, 8] : [0, 6, 10]) for (const a of tonart) ev.push({ s: t0 + s, d: 3, i: fl, m: midi(a), v: 0.6 });
        } else for (const a of tonart) ev.push({ s: t0, d: takt - 1, i: fl, m: midi(a + (fl === 'floete' ? 0 : 0)), v: fl === 'floete' ? 0.5 : 0.8 });
      }
      // Schlagwerk (leise, Abschnittsenden atmen)
      if (A.perc && !(letzter && A.perc === 1)) for (const [art, s, v] of Z.perc) if (s < takt && (A.perc === 2 || v >= 0.1 || b % 2 === 0)) ev.push({ s: t0 + s, i: art, perc: true, v: v * (A.perc === 2 ? 1 : 0.8) });
    }
    pos += takte * takt;
  }
  ev.sort((a, b) => a.s - b.s);
  const song = { ev, laenge: pos, sps: 60 / Z.bpm / 4, echo: Z.echo };
  songs.set(z, song);
  return song;
}

// ---------------------------------------------------------------- Spieler (ein Thema mit eigener Kette)
class Spieler {
  constructor(ctx, ziel, z, start) {
    this.ctx = ctx; this.song = komponiere(z); this.z = z;
    this.aus = ctx.createGain(); this.aus.gain.value = 0; this.aus.connect(ziel);
    const sps = this.song.sps;
    this.echo = ctx.createDelay(1.5); this.echo.delayTime.value = Math.min(1.4, sps * 6);
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    const elp = ctx.createBiquadFilter(); elp.type = 'lowpass'; elp.frequency.value = 2200;
    this.echoNass = ctx.createGain(); this.echoNass.gain.value = this.song.echo;
    this.echo.connect(elp); elp.connect(fb); fb.connect(this.echo); elp.connect(this.echoNass); this.echoNass.connect(this.aus);
    this.kanaele = {}; this.idx = 0; this.runde = 0; this.t0 = start;
  }
  kanal(name) {
    let k = this.kanaele[name];
    if (k) return k;
    const ctx = this.ctx, g = ctx.createGain(), lp = ctx.createBiquadFilter();
    g.gain.value = LAUT[name] ?? 0.5; lp.type = 'lowpass'; lp.frequency.value = INSTR[name]?.lp || 8000; lp.Q.value = 0.3;
    g.connect(lp);
    let ende = lp;
    if (ctx.createStereoPanner && PAN[name]) { const p = ctx.createStereoPanner(); p.pan.value = PAN[name]; lp.connect(p); ende = p; }
    ende.connect(this.aus);
    if (name !== 'bass' && name !== 'subbass' && name !== 'bordun' && name !== 'perc') { const s = ctx.createGain(); s.gain.value = 0.5; ende.connect(s); s.connect(this.echo); }
    return (this.kanaele[name] = g);
  }
  plane(bis) {
    const { ev, laenge, sps } = this.song, jetzt = this.ctx.currentTime;
    for (let schutz = 0; schutz < 2000; schutz++) {
      const e = ev[this.idx], t = this.t0 + (this.runde * laenge + e.s) * sps;
      if (t > bis) break;
      if (t >= jetzt - 0.03) {
        try {
          if (e.perc) schlag(this.ctx, this.kanal('perc'), e.i, t, e.v);
          else note(this.ctx, this.kanal(e.i), e.i, t, e.d * sps, mtof(e.m), e.v);
        } catch { /* einzelner Ton darf nie die Musik stoppen */ }
      }
      if (++this.idx >= ev.length) { this.idx = 0; this.runde++; }
    }
  }
  einblenden(t, dauer) { const g = this.aus.gain; g.cancelScheduledValues(t); g.setValueAtTime(0, t); g.linearRampToValueAtTime(1, t + dauer); }
  ausblenden(dauer) {
    const t = this.ctx.currentTime, g = this.aus.gain;
    this.endeZeit = t + dauer;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + dauer);
    setTimeout(() => { try { this.aus.disconnect(); this.echoNass.disconnect(); } catch { } }, (dauer + 3) * 1000);
  }
}
INSTR.perc = { lp: 9000 }; LAUT.perc = 1; PAN.perc = 0;

// ---------------------------------------------------------------- Laufzeit
let ctx = null, master = null, musikBus = null, effektBus = null, spieler = null, alteSpieler = [];
let zeitalter = 0, takt = null, gestartet = false;
const VORLAUF = 0.4, INTERVALL = 90;

function lautstaerkeAnwenden() {
  if (!ctx) return;
  const t = ctx.currentTime, v = E.lautstaerke;
  master.gain.setTargetAtTime(v * v * 0.6 + v * 0.4, t, 0.05); // leicht gehörrichtig
}

export function tonStarten() {
  if (ctx) { if (ctx.state === 'suspended' && !document.hidden) ctx.resume().catch(() => {}); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try { ctx = new AC({ latencyHint: 'playback' }); } catch { try { ctx = new AC(); } catch { ctx = null; return; } }
  master = ctx.createGain(); master.gain.value = 0;
  const kompr = ctx.createDynamicsCompressor();
  kompr.threshold.value = -14; kompr.knee.value = 10; kompr.ratio.value = 4; kompr.attack.value = 0.005; kompr.release.value = 0.2;
  master.connect(kompr); kompr.connect(ctx.destination);
  musikBus = ctx.createGain(); musikBus.gain.value = PEGEL_MUSIK; musikBus.connect(master);
  effektBus = ctx.createGain(); effektBus.gain.value = PEGEL_EFFEKTE; effektBus.connect(master);
  gestartet = true;
  lautstaerkeAnwenden();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  document.addEventListener('visibilitychange', sichtbarkeit);
  musikAktualisieren();
}

function sichtbarkeit() {
  if (!ctx) return;
  if (document.hidden) { stoppeTakt(); ctx.suspend().catch(() => {}); }
  else { ctx.resume().catch(() => {}); starteTakt(); }
}
function starteTakt() { if (!takt && (spieler || alteSpieler.length) && !document.hidden) takt = setTimeout(tick, 0); }
function stoppeTakt() { if (takt) { clearTimeout(takt); takt = null; } }
function tick() {
  takt = null;
  if (!ctx || document.hidden) return;
  alteSpieler = alteSpieler.filter((s) => ctx.currentTime < s.endeZeit);
  if (!spieler && !alteSpieler.length) return;
  if (ctx.state === 'running') {
    const bis = ctx.currentTime + VORLAUF;
    for (const s of alteSpieler) s.plane(Math.min(bis, s.endeZeit)); // beim Überblenden läuft das alte Thema weiter
    const s = spieler;
    if (s) {
      // nach langer Unterbrechung nicht nachholen, sondern um ganze Schleifen weiterrücken
      const schleife = s.song.laenge * s.song.sps, t = s.t0 + (s.runde * s.song.laenge + s.song.ev[s.idx].s) * s.song.sps;
      if (t < ctx.currentTime - 1) s.t0 += Math.ceil((ctx.currentTime - t) / schleife) * schleife;
      s.plane(bis);
    }
  }
  takt = setTimeout(tick, INTERVALL);
}

function musikAktualisieren() {
  if (!ctx) return;
  const soll = E.musik ? zeitalter : null;
  if (spieler && spieler.z === soll) return;
  if (spieler) { spieler.ausblenden(soll == null ? 1.5 : 3); alteSpieler.push(spieler); spieler = null; }
  alteSpieler = alteSpieler.filter((s) => ctx.currentTime < s.endeZeit);
  if (soll != null) {
    const start = ctx.currentTime + 0.15;
    spieler = new Spieler(ctx, musikBus, soll, start + (alteSpieler.length ? 1.2 : 0));
    spieler.einblenden(start, alteSpieler.length ? 4 : 2.5);
  }
  starteTakt();
}

export function musikZeitalter(z) {
  z = Math.max(0, Math.min(ZEITALTER.length - 1, Math.floor(Number(z) || 0)));
  if (z === zeitalter && (!ctx || spieler?.z === z || !E.musik)) return;
  zeitalter = z;
  musikAktualisieren();
}

export function einstellungenSetzen(o) {
  uebernehmen(o);
  try { localStorage.setItem(SPEICHER, JSON.stringify(E)); } catch { /* iframe ohne Speicher */ }
  if (!ctx) return;
  lautstaerkeAnwenden();
  musikAktualisieren();
}

// ---------------------------------------------------------------- Effekte
const zuletzt = {}, MINABSTAND = { klick: 0.045, meldung: 0.25, bau: 0.2, forschung: 0.4, kampf: 0.15, gruendung: 0.5, warnung: 0.6, fehler: 0.2, zeitalter: 2, sieg: 2 };
let fenster = [];
function effektNoten(art) { // [verzögerung s, instrument, midi, dauer s, pegel] bzw. ['@', schlagart, verz, pegel]
  switch (art) {
    case 'klick': return [[0, 'arp', 84, 0.03, 0.35]];
    case 'meldung': return [[0, 'glocke', 88, 0.15, 0.4], [0.09, 'glocke', 95, 0.25, 0.32]];
    case 'bau': return [['@', 'tock', 0, 0.5], [0, 'rund', 55, 0.05, 0.4], ['@', 'tock', 0.13, 0.4], [0.13, 'rund', 60, 0.07, 0.35]];
    case 'forschung': return [[0, 'arp', 72, 0.06, 0.4], [0.06, 'arp', 76, 0.06, 0.4], [0.12, 'arp', 79, 0.06, 0.4], [0.18, 'glocke', 84, 0.3, 0.45]];
    case 'kampf': return [['@', 'snare', 0, 1.2], ['@', 'kick', 0, 0.9], [0, 'puls', 52, 0.08, 0.5], [0.07, 'puls', 47, 0.12, 0.4]];
    case 'gruendung': return [[0, 'puls', 67, 0.09, 0.4], [0.1, 'puls', 72, 0.09, 0.4], [0.2, 'puls', 76, 0.09, 0.4], [0.3, 'floete', 79, 0.35, 0.55], [0.3, 'lyra', 67, 0.35, 0.4]];
    case 'warnung': return [[0, 'rund', 81, 0.1, 0.3], [0.13, 'rund', 77, 0.1, 0.3], [0.26, 'rund', 81, 0.1, 0.3], [0.39, 'rund', 77, 0.14, 0.3]];
    case 'fehler': return [[0, 'puls', 50, 0.07, 0.45], [0.09, 'puls', 46, 0.13, 0.45]];
    case 'zeitalter': return [[0, 'puls', 60, 0.12, 0.4], [0.14, 'puls', 64, 0.12, 0.4], [0.28, 'puls', 67, 0.12, 0.4], [0.42, 'floete', 72, 0.9, 0.55], [0.42, 'lyra', 64, 0.9, 0.4], [0.42, 'bass', 48, 0.9, 0.6], ['@', 'trommel', 0.42, 0.6], [0.7, 'glocke', 84, 0.8, 0.3]];
    case 'sieg': return [[0, 'puls', 67, 0.1, 0.4], [0.12, 'puls', 67, 0.1, 0.4], [0.24, 'puls', 67, 0.1, 0.4], [0.36, 'floete', 72, 0.35, 0.55], [0.36, 'bass', 48, 0.35, 0.6], [0.72, 'puls', 70, 0.12, 0.4], [0.86, 'floete', 74, 0.12, 0.5], [1.0, 'floete', 79, 1.0, 0.6], [1.0, 'lyra', 67, 1.0, 0.45], [1.0, 'bass', 43, 1.0, 0.6], ['@', 'trommel', 1.0, 0.7], ['@', 'tamb', 1.0, 0.3]];
  }
  return null;
}
export function ton(art) {
  if (!E.ton || !ctx || ctx.state !== 'running') return;
  const liste = effektNoten(art);
  if (!liste) return;
  const jetzt = ctx.currentTime;
  if (jetzt - (zuletzt[art] ?? -9) < (MINABSTAND[art] ?? 0.1)) return;
  fenster = fenster.filter((t) => jetzt - t < 0.25);
  if (fenster.length >= 4 && art !== 'zeitalter' && art !== 'sieg') return; // Drosselung bei Ansturm
  zuletzt[art] = jetzt; fenster.push(jetzt);
  const t = jetzt + 0.01;
  if (art === 'zeitalter' || art === 'sieg') { // Musik kurz absenken
    const g = musikBus.gain; g.cancelScheduledValues(t); g.setTargetAtTime(PEGEL_MUSIK * 0.35, t, 0.1); g.setTargetAtTime(PEGEL_MUSIK, t + (art === 'sieg' ? 2.2 : 1.6), 0.6);
  }
  for (const x of liste) {
    try {
      if (x[0] === '@') schlag(ctx, effektBus, x[1], t + x[2], x[3] * 0.5);
      else note(ctx, effektBus, x[1], t + x[0], x[3], mtof(x[2]), x[4] * 0.5);
    } catch { }
  }
}

// ---------------------------------------------------------------- Offline-Rendern und WAV
export async function musikRendern(z = 0, sekunden = 30) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const rate = 44100, len = Math.max(1, Math.ceil(rate * sekunden));
  const oc = new OAC(2, len, rate);
  const kompr = oc.createDynamicsCompressor();
  kompr.threshold.value = -14; kompr.knee.value = 10; kompr.ratio.value = 4; kompr.attack.value = 0.005; kompr.release.value = 0.2;
  const bus = oc.createGain(); bus.gain.value = PEGEL_MUSIK * 1.4;
  bus.connect(kompr); kompr.connect(oc.destination);
  const z_ = Math.max(0, Math.min(ZEITALTER.length - 1, Math.floor(Number(z) || 0)));
  const s = new Spieler(oc, bus, z_, 0.05);
  s.einblenden(0, 0.5);
  const ausAb = Math.max(0.5, sekunden - 1.5); // am Ende sanft ausblenden
  s.aus.gain.setValueAtTime(1, ausAb); s.aus.gain.linearRampToValueAtTime(0, sekunden);
  s.plane(sekunden);
  return oc.startRendering();
}

export function wavAusBuffer(buffer) {
  const kn = buffer.numberOfChannels, rate = buffer.sampleRate, n = buffer.length;
  const ab = new ArrayBuffer(44 + n * kn * 2), dv = new DataView(ab);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); dv.setUint32(4, 36 + n * kn * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, kn, true); dv.setUint32(24, rate, true);
  dv.setUint32(28, rate * kn * 2, true); dv.setUint16(32, kn * 2, true); dv.setUint16(34, 16, true);
  str(36, 'data'); dv.setUint32(40, n * kn * 2, true);
  const kanaele = Array.from({ length: kn }, (_, k) => buffer.getChannelData(k));
  let o = 44;
  for (let i = 0; i < n; i++) for (let k = 0; k < kn; k++) { const v = Math.max(-1, Math.min(1, kanaele[k][i])); dv.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
  return ab;
}

// Nur für Tests/Werkzeuge: Länge der Schleifen in Sekunden
export function _musikInfo() { return ZEITALTER.map((_, z) => { const s = komponiere(z); return { sekunden: +(s.laenge * s.sps).toFixed(1), noten: s.ev.length }; }); }
