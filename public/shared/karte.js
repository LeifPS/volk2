// Prozedurale Weltkarte aus festem Seed. Wird nie gespeichert, sondern bei Bedarf (einmal pro Prozess) erzeugt.
// Nur exakte Arithmetik (siehe zufall.js), damit Client und Server auf jeder Engine dieselbe Karte erhalten.
import { BREITE, HOEHE, ANZAHL, nachbarn, nachbar, umkreis, xVon, yVon } from './hex.js';
import { fbm, hash01, wertrauschen } from './zufall.js';
import { GELAENDE, GELAENDE_NR as G } from './daten/gelaende.js';
import { ROHSTOFFE } from './daten/rohstoffe.js';

export const LANDANTEIL = 0.45;

let CACHE = null;

/** Liefert die (gecachte) Weltkarte. */
export function karte() {
  if (!CACHE) CACHE = erzeuge();
  return CACHE;
}

function pixelPos(x, y) { return [x + (y & 1) * 0.5, y * 0.866]; }

function erzeuge() {
  const hoehe = new Float64Array(ANZAHL);
  // Kontinente: 6 große Landmassen auf einem versetzten Raster, getrennt durch Meeresstraßen (Voronoi-Grenzen)
  const zentren = [];
  const SP = 3, ZE = 2, PH = HOEHE * 0.866;
  for (let a = 0; a < SP; a++) for (let b = 0; b < ZE; b++) {
    const k = a * ZE + b;
    const cx = (a + 0.5) * BREITE / SP + (hash01(k, 1) - 0.5) * BREITE / SP * 0.35;
    const cy = (b + 0.5) * PH / ZE + (hash01(k, 2) - 0.5) * PH / ZE * 0.3;
    zentren.push([cx, cy, 30 + hash01(k, 3) * 10, 1]);
  }
  // Inseln
  for (let k = 0; k < 16; k++) {
    zentren.push([10 + hash01(k, 11) * (BREITE - 20), 8 + hash01(k, 12) * (PH - 16), 3 + hash01(k, 13) * 5, 0]);
  }
  for (let i = 0; i < ANZAHL; i++) {
    const x = xVon(i), y = yVon(i);
    const [px, py] = pixelPos(x, y);
    // Verzerrung der Koordinaten macht die Küsten unregelmäßig
    const wx = px + (fbm(x, y, 22, 3, 140) - 0.5) * 26;
    const wy = py + (fbm(x, y, 22, 3, 160) - 0.5) * 22;
    let d1 = Infinity, d2 = Infinity, maske = 0;
    for (const [cx, cy, r, gross] of zentren) {
      const dx = wx - cx, dy = wy - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (gross) { if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
      const rel = d / r;
      if (rel < 1) { const v = (1 - rel) * (gross ? 1.15 : 0.9); if (v > maske) maske = v; }
    }
    const n = fbm(x, y * 0.866, 34, 5, 100);
    // Meeresstraßen zwischen den großen Kontinenten
    const strasse = d2 - d1 < 7 ? (7 - (d2 - d1)) * 0.07 : 0;
    const rx = Math.min(x, BREITE - 1 - x), ry = Math.min(y, HOEHE - 1 - y);
    const rand = Math.min(rx, ry);
    const randMalus = rand < 8 ? (8 - rand) * 0.1 : 0;
    hoehe[i] = n * 0.55 + maske * 0.8 - randMalus - strasse;
  }
  // Schwelle für den gewünschten Landanteil
  const sortiert = Float64Array.from(hoehe).sort();
  const schwelle = sortiert[Math.floor(ANZAHL * (1 - LANDANTEIL))];
  const land = new Uint8Array(ANZAHL);
  for (let i = 0; i < ANZAHL; i++) land[i] = hoehe[i] > schwelle ? 1 : 0;

  // Gebirge und Hügel: Rücken-Rauschen + Höhe
  const bergwert = new Float64Array(ANZAHL);
  const landListe = [];
  for (let i = 0; i < ANZAHL; i++) {
    if (!land[i]) continue;
    const x = xVon(i), y = yVon(i);
    const r = fbm(x, y, 20, 2, 300);
    const ruecken = 1 - Math.abs(2 * r - 1);
    bergwert[i] = ruecken * ruecken * 0.8 + (hoehe[i] - schwelle) * 0.25 + wertrauschen(x, y, 4, 350) * 0.18;
    landListe.push(i);
  }
  const bergSort = landListe.map((i) => bergwert[i]).sort((a, b) => a - b);
  const bergSchwelle = bergSort[Math.floor(bergSort.length * 0.93)];
  const huegelSchwelle = bergSort[Math.floor(bergSort.length * 0.80)];

  // Abstand zum Wasser (für Feuchte und Küsten)
  const wasserAbstand = bfsAbstand((i) => !land[i]);
  const landAbstand = bfsAbstand((i) => land[i] === 1);

  const gel = new Uint8Array(ANZAHL);
  const temp = new Float64Array(ANZAHL);
  const feuchte = new Float64Array(ANZAHL);
  for (let i = 0; i < ANZAHL; i++) {
    const x = xVon(i), y = yVon(i);
    const breite = 1 - Math.abs(y - (HOEHE - 1) / 2) / ((HOEHE - 1) / 2); // 0 Pol, 1 Äquator
    let t = breite + (fbm(x, y, 30, 3, 500) - 0.5) * 0.32;
    if (land[i]) t -= Math.max(0, hoehe[i] - schwelle) * 0.25;
    temp[i] = t;
    let m = fbm(x, y, 26, 4, 600);
    if (land[i]) m += wasserAbstand[i] <= 2 ? 0.12 : wasserAbstand[i] >= 7 ? -0.1 : 0;
    feuchte[i] = m;
    if (!land[i]) {
      const d = landAbstand[i];
      gel[i] = d <= 1 ? G.kueste : d <= 3 ? G.meer : G.tiefsee;
      continue;
    }
    const b = bergwert[i];
    if (b >= bergSchwelle) { gel[i] = G.gebirge; continue; }
    if (t < 0.1) { gel[i] = G.schnee; continue; }
    if (b >= huegelSchwelle) { gel[i] = G.huegel; continue; }
    if (t < 0.24) { gel[i] = m > 0.6 ? G.wald : G.tundra; continue; }
    if (t < 0.62) {
      if (m < 0.36) gel[i] = G.ebene;
      else if (m < 0.54) gel[i] = G.grasland;
      else if (m < 0.68) gel[i] = G.wald;
      else gel[i] = hoehe[i] - schwelle < 0.08 ? G.sumpf : G.wald;
      continue;
    }
    if (m < 0.33) gel[i] = G.wueste;
    else if (m < 0.45) gel[i] = G.savanne;
    else if (m < 0.56) gel[i] = (hash01(i, 21) < 0.5 ? G.grasland : G.ebene);
    else if (m < 0.72) gel[i] = G.dschungel;
    else gel[i] = hoehe[i] - schwelle < 0.08 ? G.sumpf : G.dschungel;
  }

  // Binnenseen: einige Senken weit weg vom Meer
  for (const i of landListe) {
    if (wasserAbstand[i] < 4 || gel[i] === G.gebirge || gel[i] === G.schnee || hash01(i, 71) > 0.006) continue;
    for (const j of [i, ...nachbarn(i)]) if (land[j] && gel[j] !== G.gebirge && (j === i || hash01(j, 72) < 0.6)) { land[j] = 0; gel[j] = G.see; }
  }
  // Seen: kleine, abgeschlossene Wasserflächen
  const besucht = new Uint8Array(ANZAHL);
  for (let i = 0; i < ANZAHL; i++) {
    if (land[i] || besucht[i] || gel[i] === G.see) continue;
    const komp = [i]; besucht[i] = 1;
    let randBerührt = false;
    for (let k = 0; k < komp.length; k++) {
      const j = komp[k];
      const x = xVon(j), y = yVon(j);
      if (x === 0 || y === 0 || x === BREITE - 1 || y === HOEHE - 1) randBerührt = true;
      for (const n of nachbarn(j)) if (!land[n] && !besucht[n]) { besucht[n] = 1; komp.push(n); }
    }
    if (!randBerührt && komp.length <= 30) for (const j of komp) gel[j] = G.see;
  }

  // Flüsse: von Anhöhen bergab bis ins Wasser
  const fluss = new Uint8Array(ANZAHL); // 0 = kein Fluss, sonst Richtung+1 zum Unterlauf, 7 = Mündung/Ende
  const quellen = [];
  for (const i of landListe) {
    if (gel[i] !== G.huegel && gel[i] !== G.gebirge) continue;
    if (hash01(i, 31) < 0.1) quellen.push(i);
  }
  for (const q of quellen) {
    const weg = [q];
    const imWeg = new Set([q]);
    let akt = q, ok = false;
    for (let s = 0; s < 45; s++) {
      let best = -1, bestH = Infinity, bestR = -1;
      for (let r = 0; r < 6; r++) {
        const n = nachbar(akt, r);
        if (n < 0 || imWeg.has(n)) continue;
        const h = land[n] ? hoehe[n] + bergwert[n] * 0.05 : -10;
        if (h < bestH) { bestH = h; best = n; bestR = r; }
      }
      if (best < 0) break;
      if (!land[best] || gel[best] === G.see) { fluss[akt] = bestR + 1; ok = true; break; }
      if (fluss[best]) { fluss[akt] = bestR + 1; ok = true; break; }
      if (gel[best] === G.gebirge) break;
      fluss[akt] = bestR + 1;
      imWeg.add(best); weg.push(best); akt = best;
    }
    if (!ok || weg.length < 4) { for (const j of weg) if (!ok || weg.length < 4) fluss[j] = 0; }
  }
  // Quellen im Gebirge sind optisch unschön: Flüsse beginnen erst unterhalb
  for (let i = 0; i < ANZAHL; i++) if (fluss[i] && gel[i] === G.gebirge) fluss[i] = 0;

  // Exotische Gelände
  for (let i = 0; i < ANZAHL; i++) {
    const g = gel[i], h = hash01(i, 41), x = xVon(i), y = yVon(i);
    if (g === G.gebirge) {
      if (h < 0.05) gel[i] = G.vulkan;
      else if (h < 0.11 && temp[i] > 0.3) gel[i] = G.kristallgebirge;
    } else if (g === G.wueste) {
      if (fbm(x, y, 9, 2, 700) > 0.7) gel[i] = G.salzebene;
      else if (h < 0.035 && !fluss[i] && nachbarn(i).every((n) => gel[n] === G.wueste)) gel[i] = G.oase;
    } else if (g === G.kueste) {
      if (temp[i] > 0.66 && h < 0.16) gel[i] = G.korallenriff;
    } else if ((g === G.grasland || g === G.sumpf || g === G.dschungel) && temp[i] > 0.6 && wasserAbstand[i] === 1 && h < 0.3) {
      if (nachbarn(i).some((n) => gel[n] === G.kueste)) gel[i] = G.mangroven;
    } else if (g === G.sumpf && temp[i] < 0.52 && h < 0.35) {
      gel[i] = G.irrlichtmoor;
    } else if ((g === G.wald || g === G.dschungel) && fbm(x, y, 7, 2, 800) > 0.76) {
      gel[i] = G.pilzwald;
    }
  }

  // Rohstoffe
  const rohstoff = new Uint8Array(ANZAHL); // 0 = keiner, sonst Nummer+1
  const proGelaende = GELAENDE.map(() => []);
  ROHSTOFFE.forEach((r, nr) => {
    if (r.flaeche) return;
    for (const gid of r.gelaende) proGelaende[G[gid]].push([nr, r.dichte]);
  });
  for (let i = 0; i < ANZAHL; i++) {
    const kand = proGelaende[gel[i]];
    if (!kand.length) continue;
    let w = hash01(i, 51);
    // Abstand zu anderen Rohstoffen: Nachbarn mit Rohstoff halbieren die Chance
    if (nachbarn(i).some((n) => rohstoff[n])) w = w * 1.6;
    for (const [nr, d] of kand) {
      if (w < d) { rohstoff[i] = nr + 1; break; }
      w -= d;
    }
  }

  const variante = new Uint8Array(ANZAHL);
  for (let i = 0; i < ANZAHL; i++) variante[i] = Math.floor(hash01(i, 61) * 4);

  // Landmassen (Komponenten) für Startplätze
  const landmasse = new Int32Array(ANZAHL).fill(-1);
  const groessen = [];
  for (let i = 0; i < ANZAHL; i++) {
    if (GELAENDE[gel[i]].wasser || landmasse[i] >= 0) continue;
    const id = groessen.length, st = [i]; landmasse[i] = id; let n = 0;
    while (st.length) {
      const j = st.pop(); n++;
      for (const k of nachbarn(j)) if (landmasse[k] < 0 && !GELAENDE[gel[k]].wasser) { landmasse[k] = id; st.push(k); }
    }
    groessen.push(n);
  }

  const k = { gelaende: gel, fluss, rohstoff, variante, landmasse, landmasseGroesse: groessen, hoehe };
  k.hash = kartenHash(k);
  return k;
}

function bfsAbstand(istZiel) {
  const d = new Int32Array(ANZAHL).fill(9999);
  const q = [];
  for (let i = 0; i < ANZAHL; i++) if (istZiel(i)) { d[i] = 0; q.push(i); }
  for (let k = 0; k < q.length; k++) {
    const i = q[k];
    for (const n of nachbarn(i)) if (d[n] > d[i] + 1) { d[n] = d[i] + 1; q.push(n); }
  }
  return d;
}

function kartenHash(k) {
  let h = 0x811c9dc5;
  const mische = (v) => { h ^= v; h = Math.imul(h, 0x01000193); };
  for (let i = 0; i < ANZAHL; i++) { mische(k.gelaende[i]); mische(k.fluss[i]); mische(k.rohstoff[i]); }
  return (h >>> 0).toString(16);
}

export const istWasser = (i) => !!GELAENDE[karte().gelaende[i]].wasser;
export const gelaendeVon = (i) => GELAENDE[karte().gelaende[i]];
export const rohstoffVon = (i) => { const r = karte().rohstoff[i]; return r ? ROHSTOFFE[r - 1] : null; };

/** Ist das Feld als Stadtplatz grundsätzlich geeignet (ohne Besitz/Abstand)? */
export function stadtGelaendeOk(i) {
  const g = GELAENDE[karte().gelaende[i]];
  return !g.wasser && g.hoehe < 3 && g.id !== 'schnee';
}

/** Bewertet einen möglichen Startplatz (höher = besser), 0 = ungeeignet. */
export function startWert(i) {
  const k = karte();
  if (!stadtGelaendeOk(i)) return 0;
  const g = GELAENDE[k.gelaende[i]];
  if (g.id === 'sumpf' || g.id === 'tundra' || g.id === 'wueste' || g.id === 'irrlichtmoor') return 0;
  if (k.landmasseGroesse[k.landmasse[i]] < 250) return 0;
  let land = 0, wert = 0;
  for (const j of umkreis(i, 2)) {
    const gj = GELAENDE[k.gelaende[j]];
    if (!gj.wasser) land++;
    wert += gj.ertrag.n * 1.2 + gj.ertrag.p + gj.ertrag.g * 0.5 + (k.rohstoff[j] ? 1.5 : 0) + (k.fluss[j] ? 0.6 : 0);
    if (gj.id === 'schnee' || gj.id === 'gebirge') wert -= 1;
  }
  if (land < 12) return 0;
  if (k.fluss[i]) wert += 3;
  if (umkreis(i, 1).some((j) => GELAENDE[k.gelaende[j]].wasser)) wert += 2;
  return Math.max(0.01, wert);
}
