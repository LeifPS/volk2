// Forschungsbaum: großes Vollbild-Fenster mit dem ganzen Baum (Canvas), Suche/Filter, Detailpanel und Warteschlangen-Leiste.
// Verschieben per Ziehen (Maus/Touch), Zoom per Mausrad, Zwei-Finger-Geste und Knöpfen.
import { el, symbol, fenster, fehler, toast, zahl, dauerText, balken, tip } from './basis.js';
import { sprite } from '../grafik/sprites.js';
import { T } from '../texte.js';
import { an, du, forschungsFortschritt, serverJetzt, partie } from '../kern/zustand.js';
import { rundenDauerMs, RUNDEN_DAUER, forschungsTempo } from '../../shared/regeln.js';
import { befehl } from '../kern/netz.js';
import { FORSCHUNGEN, FORSCHUNG, NACHFOLGER, EINHEIT, GEB, WUNDER_NACH_ID, VERBESSERUNG, ROHSTOFF, ZEITALTER } from '../../shared/daten/index.js';
import { SPALTEN_ZEITALTER } from '../../shared/daten/forschung.js';

const TB = () => T.baum;

// ---------- Maße (Weltkoordinaten) ----------
const NW = 200, NH = 82;          // Knotengröße
const CW = 268;                   // Spaltenabstand (Knoten + Linienkanal)
const RH = 104;                   // Zeilenabstand
const PADX = 40, TOP = 52, UNTEN = 30;
const KANAL = CW - NW;
const MIN_ZOOM = 0.12;
const ZWEIG_REIHE = ['see', 'wirtschaft', 'staat', 'wissen', 'raumfahrt', 'industrie', 'luft', 'militaer'];

const OPTION_SYM = { krieg: 'krieg', frieden: 'frieden', tausch: 'handel', offene_grenzen: 'offene_grenzen', einschiffen: 'see', karten_tausch: 'karte_tausch', tribut: 'tribut', aufruesten: 'aufruesten', pluendern: 'pluendern', buendnis: 'buendnis', stadtstaat_buendnis: 'buendnis', tiefsee_einschiffen: 'see', forschungsabkommen: 'forschungsabkommen', bauplatz_2: 'bau', bauplatz_3: 'bau', luftlandung: 'luft', atomschlag: 'atom' };
const BONUS_SYM = { wissenschaft_prozent: 'wissenschaft', gold_prozent: 'gold', produktion_prozent: 'produktion', kultur_prozent: 'kultur', nahrung_prozent: 'nahrung', zufriedenheit: 'zufriedenheit', tempo_land: 'tempo', tempo_see: 'see', heilung_prozent: 'hp', stadt_staerke: 'schild', stadt_hp: 'hp', lager: 'lager', unterhalt_rabatt: 'gold', sicht: 'sicht', handel_gold_prozent: 'handel', grenzwachstum_prozent: 'karte', bauzeit_prozent: 'bau', arbeiter_tempo: 'arbeiten', erfahrung_prozent: 'befoerderung', bauplaetze: 'bau', handelsrouten: 'handel' };

// Farben je Zustand: [Füllung, Rand hell, Rand dunkel, Text]
const FARBE = {
  erforscht: { f: '#29492a', h: '#4f8a3f', d: '#1a2f1a', r: '#5fbf4a', t: '#dff3d6', linie: '#5fbf4a' },
  aktiv: { f: '#5c4612', h: '#a8821e', d: '#3a2b08', r: '#f1c40f', t: '#fff4c8', linie: '#f1c40f' },
  schlange: { f: '#26365a', h: '#46619a', d: '#18223a', r: '#5aa0e6', t: '#e2eeff', linie: '#5aa0e6' },
  erforschbar: { f: '#3d4560', h: '#68739a', d: '#262c40', r: '#d8d0b8', t: '#f6f0dc', linie: '#9aa3be' },
  gesperrt: { f: '#1b1f2b', h: '#2b3142', d: '#11141c', r: '#353c50', t: '#8a8798', linie: '#3e465c' },
};

// ---------- Layout (einmalig berechnet) ----------
let LAYOUT = null;
function layout() {
  if (LAYOUT) return LAYOUT;
  const spalten = [];
  for (const f of FORSCHUNGEN) (spalten[f.spalte] ||= []).push(f);
  const maxN = Math.max(...spalten.map((s) => s?.length || 0));
  const R = maxN + 1;
  // Zweige als Bänder: Mittelpunkt je Zweig nach Anteil
  const anzahl = {}; for (const f of FORSCHUNGEN) anzahl[f.zweig] = (anzahl[f.zweig] || 0) + 1;
  const band = {}; let kum = 0;
  for (const z of ZWEIG_REIHE) { const n = anzahl[z] || 0; band[z] = ((kum + n / 2) / FORSCHUNGEN.length) * (R - 1); kum += n; }
  for (const f of FORSCHUNGEN) if (band[f.zweig] == null) band[f.zweig] = (R - 1) / 2;
  const reihe = {};
  const zuweisen = (spalte, wunsch) => {
    const l = [...spalte].sort((a, b) => wunsch[a.id] - wunsch[b.id] || band[a.zweig] - band[b.zweig]);
    const n = l.length, INF = 1e9;
    const dp = Array.from({ length: n }, () => new Array(R).fill(INF)), von = Array.from({ length: n }, () => new Array(R).fill(-1));
    for (let r = 0; r < R; r++) dp[0][r] = (r - wunsch[l[0].id]) ** 2;
    for (let i = 1; i < n; i++) {
      let best = INF, bi = -1;
      for (let r = 0; r < R; r++) {
        if (r > 0 && dp[i - 1][r - 1] < best) { best = dp[i - 1][r - 1]; bi = r - 1; }
        if (bi >= 0) { dp[i][r] = best + (r - wunsch[l[i].id]) ** 2; von[i][r] = bi; }
      }
    }
    let r = 0; for (let k = 1; k < R; k++) if (dp[n - 1][k] < dp[n - 1][r]) r = k;
    for (let i = n - 1; i >= 0; i--) { reihe[l[i].id] = r; r = von[i][r]; }
  };
  const mittel = (ids) => ids.reduce((a, x) => a + reihe[x], 0) / ids.length;
  const kreuzungen = () => {
    const kanten = [];
    for (const f of FORSCHUNGEN) for (const p of f.voraussetzungen) kanten.push([FORSCHUNG[p].spalte, reihe[p], f.spalte, reihe[f.id]]);
    let k = 0;
    for (let i = 0; i < kanten.length; i++) for (let j = i + 1; j < kanten.length; j++) {
      const a = kanten[i], b = kanten[j];
      const c1 = Math.max(a[0], b[0]), c2 = Math.min(a[2], b[2]);
      if (c2 <= c1) continue;
      const y = (e, c) => e[1] + (e[3] - e[1]) * (c - e[0]) / (e[2] - e[0]);
      if ((y(a, c1) - y(b, c1)) * (y(a, c2) - y(b, c2)) < 0) k++;
    }
    return k;
  };
  // Start: Bänder
  const w0 = {}; for (const f of FORSCHUNGEN) w0[f.id] = band[f.zweig];
  for (const s of spalten) if (s) zuweisen(s, w0);
  let bester = { ...reihe }, besterWert = kreuzungen();
  for (let iter = 0; iter < 10; iter++) {
    const w = {};
    const vor = iter % 2 === 0;
    const reihenfolge = vor ? spalten : [...spalten].reverse();
    for (const s of reihenfolge) {
      if (!s) continue;
      for (const f of s) {
        const nach = NACHFOLGER[f.id] || [];
        const nb = vor ? f.voraussetzungen : nach;
        const b = nb.length ? mittel(nb) : band[f.zweig];
        w[f.id] = 0.72 * b + 0.28 * band[f.zweig];
      }
      zuweisen(s, w);
    }
    const k = kreuzungen();
    if (k < besterWert) { besterWert = k; bester = { ...reihe }; }
  }
  Object.assign(reihe, bester);
  const pos = {};
  const belegt = Array.from({ length: spalten.length }, () => new Array(R).fill(null));
  for (const f of FORSCHUNGEN) {
    pos[f.id] = { x: PADX + f.spalte * CW, y: TOP + reihe[f.id] * RH, reihe: reihe[f.id], spalte: f.spalte };
    belegt[f.spalte][reihe[f.id]] = f.id;
  }
  const W = PADX * 2 + (spalten.length - 1) * CW + NW, H = TOP + (R - 1) * RH + NH + UNTEN;
  // Kanten rechtwinklig führen
  const kanalMitte = (c) => PADX + c * CW + NW + KANAL / 2;
  const frei = (r, c1, c2) => { for (let c = c1; c <= c2; c++) if (belegt[c]?.[r]) return false; return true; };
  const kanten = [];
  for (const f of FORSCHUNGEN) {
    const b = pos[f.id];
    for (const pid of f.voraussetzungen) {
      const a = pos[pid];
      const x1 = a.x + NW, y1 = a.y + NH / 2, x2 = b.x, y2 = b.y + NH / 2;
      const versatz = ((b.reihe % 3) - 1) * 9;
      const mZiel = kanalMitte(b.spalte - 1) + versatz, mQuelle = kanalMitte(a.spalte) + versatz;
      let p;
      if (b.spalte - a.spalte <= 1 || frei(a.reihe, a.spalte + 1, b.spalte - 1)) p = [x1, y1, mZiel, y1, mZiel, y2, x2, y2];
      else if (frei(b.reihe, a.spalte + 1, b.spalte - 1)) p = [x1, y1, mQuelle, y1, mQuelle, y2, x2, y2];
      else {
        // durch den Zwischenraum zwischen zwei Zeilen
        let g;
        if (a.reihe === b.reihe) g = a.reihe + (a.reihe < R - 1 ? 1 : 0);
        else g = Math.round((Math.min(a.reihe, b.reihe) + Math.max(a.reihe, b.reihe) + 1) / 2);
        const yg = TOP + g * RH - (RH - NH) / 2;
        p = [x1, y1, mQuelle, y1, mQuelle, yg, mZiel, yg, mZiel, y2, x2, y2];
      }
      kanten.push({ von: pid, nach: f.id, p, x0: Math.min(x1, x2), x1: Math.max(x1, x2) });
    }
  }
  LAYOUT = { pos, W, H, R, kanten, kreuzungen: besterWert };
  return LAYOUT;
}

// ---------- Hilfen ----------
const norm = (s) => s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
const wissenschaft = () => du()?.raten?.wissenschaft || 0;
const erforscht = () => du()?.forschung?.erforscht || {};

/** Dauer in ms bei aktueller Wissenschaft (ohne Teilfortschritt). */
function dauerMs(f) {
  let d = f.dauer;
  if (f.wiederholbar) d *= 1 + 0.15 * (erforscht()[f.id] || 0);
  if (partie()) return rundenDauerMs(d, RUNDEN_DAUER.forschungFaktor) / forschungsTempo(wissenschaft());
  return d * 1000 / (1 + Math.max(0, wissenschaft()) / 100);
}
/** Restdauer in ms (berücksichtigt aktive Forschung und Teilfortschritt). */
function restMs(id) {
  const fo = du()?.forschung, f = FORSCHUNG[id];
  if (fo?.aktiv === id) return fo.fertig_um ? Math.max(0, fo.fertig_um - serverJetzt()) : dauerMs(f) * (1 - forschungsFortschritt());
  return dauerMs(f) * (1 - (fo?.teil?.[id] || 0));
}
/** Fehlende Voraussetzungen (inkl. id) in Reihenfolge, wie der Server sie vorschaltet. */
function weg(id, bekannt) {
  const erg = [], gesehen = new Set();
  const besuche = (x) => {
    if (gesehen.has(x)) return; gesehen.add(x);
    const f = FORSCHUNG[x];
    if (!f || (bekannt[x] && !(x === id && f.wiederholbar))) return;
    for (const p of f.voraussetzungen) besuche(p);
    erg.push(x);
  };
  besuche(id);
  return erg;
}
function zustand(id) {
  const fo = du()?.forschung, f = FORSCHUNG[id];
  if (!fo) return 'gesperrt';
  if (fo.aktiv === id) return 'aktiv';
  if (fo.schlange?.includes(id)) return 'schlange';
  if (fo.erforscht[id] && !f.wiederholbar) return 'erforscht';
  if (f.voraussetzungen.every((p) => fo.erforscht[p])) return 'erforschbar';
  return 'gesperrt';
}
function alleNachfolger(id) {
  const s = new Set(), stapel = [id];
  while (stapel.length) for (const n of NACHFOLGER[stapel.pop()] || []) if (!s.has(n)) { s.add(n); stapel.push(n); }
  return s;
}
function alleVorgaenger(id) {
  const s = new Set(), stapel = [id];
  while (stapel.length) for (const p of FORSCHUNG[stapel.pop()]?.voraussetzungen || []) if (!s.has(p)) { s.add(p); stapel.push(p); }
  return s;
}

function bonusText(id, w) { const t = TB().bonus[id]; return t ? t(w) : `${id}: ${w}`; }
function wirkungText(w = {}) {
  const t = [], N = TB().werte;
  for (const [k, v] of Object.entries(w)) {
    if (k === 'pro_einwohner') { for (const [a, x] of Object.entries(v)) t.push(`+${zahl(x, x % 1 ? 1 : 0)} ${N[a] || a} ${TB().jeEinwohner}`); continue; }
    if (k === 'material') { for (const [a, x] of Object.entries(v)) t.push(`+${x} ${N[a] || a}/h`); continue; }
    const f = TB().wirkung[k];
    if (f) t.push(f(v)); else if (typeof v === 'number') t.push(`${k} ${v}`);
  }
  return t.join(', ');
}
/** Freischaltung → { bild: sprite-Canvas, sym: DOM-Symbol, titel, text } */
function freiInfo(x) {
  const B = TB();
  switch (x.art) {
    case 'einheit': { const d = EINHEIT[x.id]; const farbe = du()?.farbe; return { kat: 'einheit', id: x.id, o: { farbe }, titel: d?.name || x.id, art: B.arten.einheit, text: d ? B.einheitWerte(d) : '' }; }
    case 'gebaeude': { const d = GEB[x.id]; return { kat: 'gebaeude', id: x.id, titel: d?.name || x.id, art: B.arten.gebaeude, text: d ? (wirkungText(d.wirkung) || d.beschreibung) : '' }; }
    case 'wunder': { const d = WUNDER_NACH_ID[x.id]; const r = d?.reich ? Object.entries(d.reich).map(([k, v]) => bonusText(k, v)).join(', ') : ''; return { kat: 'wunder', id: x.id, titel: d?.name || x.id, art: B.arten.wunder, text: [r, d ? wirkungText(d.wirkung) : ''].filter(Boolean).join(' · ') || d?.beschreibung || '' }; }
    case 'verbesserung': { const d = VERBESSERUNG[x.id]; return { kat: 'verbesserung', id: x.id, titel: d?.name || x.id, art: B.arten.verbesserung, text: d?.beschreibung || '' }; }
    case 'rohstoff': { const d = ROHSTOFF[x.id]; return { kat: 'rohstoff', id: x.id, titel: d?.name || x.id, art: B.arten.rohstoff, text: B.rohstoffSichtbar }; }
    case 'option': return { kat: 'ui', id: OPTION_SYM[x.id] || 'stern_voll', titel: B.optionen[x.id] || x.id, art: B.arten.option, text: '' };
    case 'bonus': return { kat: 'ui', id: BONUS_SYM[x.id] || 'plus', titel: bonusText(x.id, x.wert), art: B.arten.bonus, text: '' };
    default: return { kat: 'ui', id: 'stern_leer', titel: x.id, art: '', text: '' };
  }
}
const spriteVon = (i) => sprite(i.kat, i.id, i.o || {}) || sprite('ui', 'stern_leer');

// ---------- CSS ----------
let cssDa = false;
function css() {
  if (cssDa) return; cssDa = true;
  document.head.append(el('style', { text: `
.fenster > .inhalt.fb-innen { padding: 0; overflow: hidden; display: flex; flex-direction: column; -webkit-user-select: none; user-select: none; }
.fb-kopf { display: flex; gap: 6px; align-items: center; flex: 0 1 auto; min-width: 0; position: relative; }
.fenster > .kopf:has(.fb-kopf) h1 { flex: 0 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fenster > .kopf:has(.fb-kopf) .fb-kopf { margin-left: auto; }
.fb-suche { position: relative; }
.fb-suche input, .fb-filter { background: #0e1119; color: var(--text); border: 2px solid var(--rand); box-shadow: inset 2px 2px 0 #000; padding: 6px 8px; min-height: 38px; font-size: 15px; }
.fb-suche input { width: 210px; padding-left: 30px; }
.fb-suche > canvas { position: absolute; left: 8px; top: 11px; pointer-events: none; }
.fb-filter { max-width: 220px; cursor: pointer; }
.fb-treffer { position: absolute; top: calc(100% + 4px); left: 0; z-index: 8; width: 320px; max-height: 60vh; overflow: auto; padding: 4px; display: flex; flex-direction: column; gap: 3px; }
.fb-treffer .eintrag { align-items: center; min-height: 40px; }
.fb-treffer .eintrag.an { background: #3a4561; }
.fb-buehne { position: relative; flex: 1; min-height: 0; overflow: hidden; background: #0f121b; }
.fb-cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; cursor: grab; }
.fb-cv.zieht { cursor: grabbing; } .fb-cv.zeigt { cursor: pointer; }
.fb-zoom { position: absolute; left: 8px; bottom: 8px; display: flex; flex-direction: column; gap: 4px; z-index: 3; }
.fb-zoom .knopf { width: 44px; height: 44px; font-size: 20px; font-family: var(--kopf); }
.fb-detail { position: absolute; top: 6px; right: 6px; bottom: 6px; width: min(390px, 44%); overflow: auto; padding: 10px 12px 14px; z-index: 4; -webkit-user-select: text; user-select: text; }
.fb-detail h2 { margin: 0; font-size: 18px; color: var(--text); }
.fb-dkopf { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
.fb-dkopf > div { flex: 1; min-width: 0; }
.fb-marke { display: inline-block; padding: 1px 6px; margin: 2px 4px 2px 0; border: 2px solid var(--rand); font-size: 12px; font-family: var(--kopf); }
.fb-detail p { margin: 6px 0; }
.fb-detail .fb-besch { color: var(--text2); font-style: italic; }
.fb-detail h3 { margin: 12px 0 4px; }
.fb-verweise { display: flex; flex-wrap: wrap; gap: 4px; }
.fb-verweis { display: inline-flex; align-items: center; gap: 5px; min-height: 38px; padding: 4px 8px; border: 2px solid var(--rand); background: #2b3247; color: var(--text); cursor: pointer; border-left-width: 6px; }
.fb-verweis:hover { background: #38415c; }
.fb-frei { display: flex; gap: 8px; align-items: center; padding: 4px 0; border-bottom: 1px solid #353d52; }
.fb-frei > canvas { flex: none; }
.fb-frei .klein { display: block; }
.fb-weg { background: #1a1f2d; border: 2px solid var(--rand); padding: 6px 8px; margin: 8px 0; font-size: 14px; }
.fb-knoepfe { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
.fb-knoepfe .knopf { min-height: 44px; justify-content: flex-start; text-align: left; gap: 10px; }
.fb-knoepfe .knopf .klein { display: block; color: inherit; opacity: .85; }
.fb-leiste { display: flex; gap: 6px; align-items: center; padding: 6px 8px; border-top: 3px solid var(--rand); background: var(--panel2); min-height: 58px; flex: none; }
.fb-schlange { display: flex; gap: 6px; align-items: center; overflow-x: auto; flex: 1; min-width: 0; scrollbar-width: thin; padding-bottom: 2px; }
.fb-chip { display: inline-flex; align-items: center; gap: 6px; background: #26365a; border: 2px solid var(--rand); box-shadow: inset 2px 2px 0 #46619a, inset -2px -2px 0 #18223a; padding: 3px 4px 3px 8px; min-height: 44px; cursor: pointer; white-space: nowrap; flex: none; }
.fb-chip.aktiv { background: #5c4612; box-shadow: inset 2px 2px 0 #a8821e, inset -2px -2px 0 #3a2b08; padding-right: 8px; }
.fb-chip .balken { width: 90px; height: 8px; }
.fb-chip .nr { font-family: var(--kopf); color: var(--blau); font-size: 13px; }
.fb-chip .knopf { min-height: 34px; min-width: 34px; padding: 2px; }
.fb-legende { display: flex; gap: 10px; align-items: center; flex: none; font-size: 12px; color: var(--text2); }
.fb-legende i { display: inline-block; width: 14px; height: 14px; border: 2px solid; vertical-align: -3px; margin-right: 4px; }
@media (max-width: 1100px) { .fb-legende { display: none; } .fb-suche input { width: 150px; } .fb-filter { max-width: 190px; } }
@media (max-width: 760px) {
  .fb-detail { left: 6px; right: 6px; top: auto; width: auto; height: 60%; }
  .fb-suche input { width: 120px; }
  .fenster > .kopf:has(.fb-kopf) h1 { display: none; }
}
` }));
}

// ---------- Fenster ----------
let offen = null;

export function oeffneForschung(id) {
  if (offen) { if (id && FORSCHUNG[id]) offen.waehle(id, true); return; }
  css();
  const L = layout();
  const B = TB();
  // Zustand der Ansicht
  const ansicht = { s: 1, ox: 0, oy: 0 };
  let auswahl = null, hover = null, suchText = '', treffer = [], trefferNr = -1;
  let filter = 'alle';
  let filterMenge = null;      // Set von IDs, die hervorgehoben sind (null = alle normal)
  let markiert = null;         // Auswahl-Vorgänger-/Nachfolger-Hervorhebung
  let zust = {};
  let bw = 0, bh = 0, dpr = 1, ctx = null, cv = null, buehne = null, detailEl = null, leisteEl = null, schlangeEl = null;
  let zeichnenAngefragt = false, animation = null;
  const abmelden = [];
  const symbole = {};          // Freischaltungs-Sprites je Forschung
  for (const f of FORSCHUNGEN) symbole[f.id] = f.freischaltet.map((x) => spriteVon(freiInfo(x)));
  const namenKurz = {};

  const zustaendeNeu = () => { zust = {}; for (const f of FORSCHUNGEN) zust[f.id] = zustand(f.id); };
  zustaendeNeu();

  // ----- Kopfzeile -----
  const suchFeld = el('input', { type: 'search', placeholder: B.suche, 'aria-label': B.suche, autocomplete: 'off', spellcheck: 'false' });
  const trefferEl = el('div.fb-treffer.pix.versteckt');
  const filterEl = el('select.fb-filter', { 'aria-label': B.filter, tip: B.filterTip });
  const kopf = el('div.fb-kopf', el('div.fb-suche', symbol('ui', 'sicht', { px: 16 }), suchFeld, trefferEl), filterEl);

  const f = fenster(B.titel, (innen) => {
    innen.classList.add('fb-innen');
    cv = el('canvas.fb-cv', { 'aria-label': B.titel });
    ctx = cv.getContext('2d');
    const zoom = el('div.fb-zoom',
      el('button.knopf', { text: '+', 'aria-label': B.zoomRein, tip: B.zoomRein, onclick: () => zoomUm(1.3) }),
      el('button.knopf', { text: '−', 'aria-label': B.zoomRaus, tip: B.zoomRaus, onclick: () => zoomUm(1 / 1.3) }),
      el('button.knopf', { 'aria-label': B.zurAktuellen, tip: B.zurAktuellen, onclick: () => springeZuStart(true) }, symbol('ui', 'forschung', { px: 20 })),
    );
    detailEl = el('div.fb-detail.pix.versteckt');
    buehne = el('div.fb-buehne', cv, zoom, detailEl);
    schlangeEl = el('div.fb-schlange');
    const leg = (z, t) => el('span', el('i', { style: { background: FARBE[z].f, borderColor: FARBE[z].r } }), t);
    leisteEl = el('div.fb-leiste', schlangeEl, el('div.fb-legende', leg('erforscht', B.zustaende.erforscht), leg('aktiv', B.zustaende.aktiv), leg('schlange', B.zustaende.schlange), leg('erforschbar', B.zustaende.erforschbar), leg('gesperrt', B.zustaende.gesperrt)));
    innen.append(buehne, leisteEl);
  }, { breite: 'voll', symbol: symbol('ui', 'forschung', { px: 24 }), kopf, beiSchliessen: () => { for (const a of abmelden) a(); offen = null; } });

  // ----- Filter -----
  function filterOptionen() {
    const opts = [['alle', B.filterAlle], ['erforschbar', B.filterErforschbar], ['offen', B.filterOffen]];
    for (const z of ZWEIG_REIHE) opts.push(['zweig:' + z, B.zweigPraefix + B.zweige[z]]);
    if (filter.startsWith('braucht:')) opts.push([filter, B.brauchtPraefix + FORSCHUNG[filter.slice(8)].name]);
    else if (auswahl) opts.push(['braucht:' + auswahl, B.brauchtPraefix + FORSCHUNG[auswahl].name]);
    filterEl.replaceChildren(...opts.map(([v, t]) => el('option', { value: v, text: t, selected: v === filter })));
  }
  function setzeFilter(v, springen = true) {
    filter = v;
    filterOptionen();
    if (v === 'alle') filterMenge = null;
    else if (v === 'erforschbar') filterMenge = new Set(FORSCHUNGEN.filter((x) => zust[x.id] === 'erforschbar' || zust[x.id] === 'aktiv').map((x) => x.id));
    else if (v === 'offen') filterMenge = new Set(FORSCHUNGEN.filter((x) => zust[x.id] !== 'erforscht').map((x) => x.id));
    else if (v.startsWith('zweig:')) filterMenge = new Set(FORSCHUNGEN.filter((x) => x.zweig === v.slice(6)).map((x) => x.id));
    else if (v.startsWith('braucht:')) { const id = v.slice(8); filterMenge = alleNachfolger(id); filterMenge.add(id); }
    if (springen && filterMenge?.size) {
      // zum ersten Treffer, falls keiner sichtbar ist
      const sichtbar = [...filterMenge].some((x) => imBild(x));
      if (!sichtbar) { const erst = [...filterMenge].sort((a, b) => FORSCHUNG[a].spalte - FORSCHUNG[b].spalte)[0]; zentriere(erst, true); }
    }
    bitte();
  }
  filterEl.addEventListener('change', () => setzeFilter(filterEl.value));
  filterOptionen();

  // ----- Suche -----
  function suche() {
    suchText = norm(suchFeld.value.trim());
    trefferNr = -1;
    treffer = suchText ? FORSCHUNGEN.filter((x) => norm(x.name).includes(suchText) || x.freischaltet.some((y) => norm(freiInfo(y).titel).includes(suchText))).map((x) => x.id) : [];
    treffer.sort((a, b) => (norm(FORSCHUNG[b].name).includes(suchText) - norm(FORSCHUNG[a].name).includes(suchText)) || FORSCHUNG[a].spalte - FORSCHUNG[b].spalte);
    if (!suchText) { trefferEl.classList.add('versteckt'); bitte(); return; }
    trefferEl.replaceChildren(...(treffer.length ? treffer.slice(0, 30).map((x, i) => {
      const fo = FORSCHUNG[x];
      const nebenbei = !norm(fo.name).includes(suchText) ? fo.freischaltet.map((y) => freiInfo(y).titel).find((t) => norm(t).includes(suchText)) : null;
      return el('div.eintrag', { onclick: () => { trefferNr = i; springeTreffer(); trefferEl.classList.add('versteckt'); } }, symbol('zweig', fo.zweig, { px: 20 }),
        el('div', el('b', { text: fo.name }), el('span.klein', { text: ' · ' + B.zustaende[zust[x]] + (nebenbei ? ' · ' + nebenbei : '') })));
    }) : [el('div.klein', { text: B.keineTreffer, style: { padding: '6px' } })]));
    trefferEl.classList.remove('versteckt');
    bitte();
  }
  function springeTreffer() {
    if (!treffer.length) return;
    if (trefferNr < 0) trefferNr = 0;
    const id = treffer[trefferNr % treffer.length];
    waehle(id, true);
  }
  suchFeld.addEventListener('input', suche);
  suchFeld.addEventListener('focus', () => { if (suchText) trefferEl.classList.remove('versteckt'); });
  suchFeld.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); trefferNr = (trefferNr + 1) % Math.max(1, treffer.length); springeTreffer(); trefferEl.classList.add('versteckt'); }
    else if (e.key === 'Escape' && suchFeld.value) { e.stopPropagation(); suchFeld.value = ''; suche(); }
  });
  const ausserhalb = (e) => { if (!kopf.contains(e.target)) trefferEl.classList.add('versteckt'); };
  document.addEventListener('pointerdown', ausserhalb, true);
  abmelden.push(() => document.removeEventListener('pointerdown', ausserhalb, true));

  // ----- Ansicht -----
  function sichtBreite() { return detailEl && !detailEl.classList.contains('versteckt') && bw > 760 ? bw - detailEl.offsetWidth - 12 : bw; }
  function sichtHoehe() { return detailEl && !detailEl.classList.contains('versteckt') && bw <= 760 ? bh - detailEl.offsetHeight - 12 : bh; }
  function begrenze(v = ansicht) {
    v.s = Math.max(MIN_ZOOM, Math.min(1.8, v.s));
    const w = L.W * v.s, h = L.H * v.s;
    const rand = 80;
    v.ox = w + 2 * rand < bw ? (bw - w) / 2 : Math.min(rand, Math.max(bw - w - rand - (bw - sichtBreite()), v.ox));
    v.oy = h + 2 * 20 < bh ? (bh - h) / 2 : Math.min(20, Math.max(bh - h - 20 - (bh - sichtHoehe()), v.oy));
    return v;
  }
  function groesse() {
    const r = buehne.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    bw = Math.max(1, r.width); bh = Math.max(1, r.height);
    cv.width = Math.round(bw * dpr); cv.height = Math.round(bh * dpr);
    begrenze(); bitte();
  }
  function imBild(id) {
    const p = L.pos[id];
    const x = p.x * ansicht.s + ansicht.ox, y = p.y * ansicht.s + ansicht.oy;
    return x > 0 && y > 0 && x + NW * ansicht.s < sichtBreite() && y + NH * ansicht.s < sichtHoehe();
  }
  function ziel(id, s) {
    const p = L.pos[id];
    return begrenze({ s, ox: sichtBreite() / 2 - (p.x + NW / 2) * s, oy: sichtHoehe() / 2 - (p.y + NH / 2) * s });
  }
  function bewegeZu(z, sanft) {
    if (!sanft) { Object.assign(ansicht, z); bitte(); return; }
    const start = { ...ansicht }, t0 = performance.now(), dauer = 320;
    animation = (t) => {
      const k = Math.min(1, (t - t0) / dauer), e = 1 - (1 - k) ** 3;
      ansicht.s = start.s + (z.s - start.s) * e; ansicht.ox = start.ox + (z.ox - start.ox) * e; ansicht.oy = start.oy + (z.oy - start.oy) * e;
      if (k >= 1) animation = null;
    };
    bitte();
  }
  function zentriere(id, sanft) { bewegeZu(ziel(id, Math.max(ansicht.s, 0.75)), sanft); }
  function zoomUm(k, sx = sichtBreite() / 2, sy = bh / 2) {
    animation = null;
    const s2 = Math.max(MIN_ZOOM, Math.min(1.8, ansicht.s * k));
    const wx = (sx - ansicht.ox) / ansicht.s, wy = (sy - ansicht.oy) / ansicht.s;
    ansicht.s = s2; ansicht.ox = sx - wx * s2; ansicht.oy = sy - wy * s2;
    begrenze(); bitte();
  }
  function startId() {
    const fo = du()?.forschung;
    if (fo?.aktiv) return fo.aktiv;
    return FORSCHUNGEN.filter((x) => zust[x.id] === 'erforschbar').sort((a, b) => a.spalte - b.spalte)[0]?.id || FORSCHUNGEN[0].id;
  }
  function springeZuStart(sanft) { zentriere(startId(), sanft); }

  // ----- Zeichnen -----
  function bitte() { if (zeichnenAngefragt) return; zeichnenAngefragt = true; requestAnimationFrame(rahmen); }
  function rahmen(t) {
    zeichnenAngefragt = false;
    if (!offen) return;
    if (animation) { animation(t); bitte(); }
    zeichne();
  }
  function kuerze(text, max, font) {
    ctx.font = font;
    if (ctx.measureText(text).width <= max) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
    return t + '…';
  }
  const FONT_NAME = '700 15px Pixelify, Silkscreen, monospace';
  const FONT_GROSS = '700 26px Pixelify, Silkscreen, monospace';
  const FONT_KLEIN = '400 13px Pixelify, Silkscreen, monospace';
  function kurzName(id, gross) {
    const k = id + (gross ? '#g' : '');
    if (!namenKurz[k]) namenKurz[k] = gross ? kuerze(FORSCHUNG[id].name, NW - 50, FONT_GROSS) : kuerze(FORSCHUNG[id].name, NW - 40, FONT_NAME);
    return namenKurz[k];
  }
  function bild(img, x, y, box) {
    if (!img) return;
    const k = Math.min(box / img.width, box / img.height);
    const w = Math.round(img.width * k), h = Math.round(img.height * k);
    ctx.drawImage(img, x + Math.round((box - w) / 2), y + Math.round((box - h) / 2), w, h);
  }
  function zeichne() {
    if (!ctx) return;
    const { s, ox, oy } = ansicht;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0f121b'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    ctx.imageSmoothingEnabled = false;
    const wx0 = -ox / s, wx1 = (bw - ox) / s, wy0 = -oy / s, wy1 = (bh - oy) / s;
    // Zeitalter-Bänder
    const grenzen = [...SPALTEN_ZEITALTER, 45];
    for (let z = 0; z < ZEITALTER.length; z++) {
      const xa = z === 0 ? -4000 : PADX + grenzen[z] * CW - KANAL / 2, xb = z === ZEITALTER.length - 1 ? L.W + 4000 : PADX + grenzen[z + 1] * CW - KANAL / 2;
      if (xb < wx0 || xa > wx1) continue;
      ctx.globalAlpha = z % 2 ? 0.13 : 0.08;
      ctx.fillStyle = ZEITALTER[z].farbe; ctx.fillRect(xa, wy0, xb - xa, wy1 - wy0);
      ctx.globalAlpha = 0.55; ctx.fillRect(xa, wy0, 4, wy1 - wy0);
      ctx.globalAlpha = 1;
    }
    // Pixel-Raster als dezente Textur
    // Kanten
    const lw = Math.max(3, 2 / s);
    const dimmen = filterMenge || suchText;
    const gehoert = (id) => (!filterMenge || filterMenge.has(id)) && (!suchText || treffer.includes(id));
    const linie = (k, farbe, breite) => {
      const p = k.p;
      ctx.strokeStyle = farbe; ctx.lineWidth = breite;
      ctx.beginPath(); ctx.moveTo(p[0], p[1]);
      for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
      ctx.stroke();
      const x = p[p.length - 2], y = p[p.length - 1], a = Math.max(8, 5 / s);
      ctx.fillStyle = farbe; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - a, y - a * 0.75); ctx.lineTo(x - a, y + a * 0.75); ctx.closePath(); ctx.fill();
    };
    ctx.lineJoin = 'miter'; ctx.lineCap = 'butt';
    const oben = [];
    for (const k of L.kanten) {
      if (k.x1 < wx0 || k.x0 > wx1) continue;
      if (markiert && (markiert.vor.has(k.nach) || k.nach === auswahl) && (markiert.vor.has(k.von))) { oben.push([k, '#f1c40f']); continue; }
      if (markiert && k.von === auswahl) { oben.push([k, '#7fd0ff']); continue; }
      const zv = zust[k.von], zn = zust[k.nach];
      let farbe = zv === 'erforscht' && zn === 'erforscht' ? '#3f7a35' : zv === 'erforscht' || zv === 'aktiv' ? '#8a93ad' : '#3b4358';
      ctx.globalAlpha = dimmen && !(gehoert(k.von) && gehoert(k.nach)) ? 0.18 : 1;
      if (dimmen && gehoert(k.von) && gehoert(k.nach)) farbe = '#d8d0b8';
      linie(k, '#07080c', lw + 2 / s);
      linie(k, farbe, lw);
    }
    ctx.globalAlpha = 1;
    for (const [k, farbe] of oben) { linie(k, '#07080c', lw + 3 / s); linie(k, farbe, lw + 1 / s); }
    // Knoten
    const detail = s >= 0.48;
    for (const fo of FORSCHUNGEN) {
      const p = L.pos[fo.id];
      if (p.x + NW + 30 < wx0 || p.x - 30 > wx1 || p.y + NH + 30 < wy0 || p.y - 30 > wy1) continue;
      knoten(fo, p.x, p.y, detail, dimmen && !gehoert(fo.id), dimmen && gehoert(fo.id));
    }
    // Zeitalter-Namen oben angeheftet (Bildschirmkoordinaten)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (let z = 0; z < ZEITALTER.length; z++) {
      const xa = Math.max(0, (PADX + grenzen[z] * CW - KANAL / 2) * s + ox), xb = Math.min(bw, (z === ZEITALTER.length - 1 ? L.W : PADX + grenzen[z + 1] * CW - KANAL / 2) * s + ox);
      if (xb - xa < 30) continue;
      ctx.fillStyle = 'rgba(11,13,20,.82)'; ctx.fillRect(xa, 0, xb - xa, 28);
      ctx.fillStyle = ZEITALTER[z].farbe; ctx.fillRect(xa, 25, xb - xa, 3); ctx.fillRect(xa, 0, 3, 28);
      ctx.font = '700 15px Silkscreen, Pixelify, monospace'; ctx.textBaseline = 'middle';
      const name = ZEITALTER[z].name.toUpperCase();
      const tw = ctx.measureText(name).width;
      const mx = Math.max(xa + 10, Math.min(xb - tw - 10, (xa + xb) / 2 - tw / 2));
      ctx.fillStyle = '#000'; ctx.fillText(name, mx + 2, 15);
      ctx.fillStyle = ZEITALTER[z].farbe; ctx.fillText(name, mx, 13);
    }
    ctx.textBaseline = 'alphabetic';
  }
  function knoten(fo, x, y, detail, blass, treffer_) {
    const z = zust[fo.id], F = FARBE[z];
    const istAuswahl = auswahl === fo.id, istHover = hover === fo.id;
    const fo_ = du()?.forschung;
    ctx.globalAlpha = blass ? 0.16 : 1;
    // Schatten, Rahmen, Füllung im Pixelstil
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x + 4, y + 4, NW, NH);
    ctx.fillStyle = '#0b0d14'; ctx.fillRect(x - 3, y - 3, NW + 6, NH + 6);
    ctx.fillStyle = F.r; ctx.fillRect(x - 1, y - 1, NW + 2, NH + 2);
    ctx.fillStyle = F.f; ctx.fillRect(x + 2, y + 2, NW - 4, NH - 4);
    ctx.fillStyle = F.h; ctx.fillRect(x + 2, y + 2, NW - 4, 2); ctx.fillRect(x + 2, y + 2, 2, NH - 4);
    ctx.fillStyle = F.d; ctx.fillRect(x + 2, y + NH - 4, NW - 4, 2); ctx.fillRect(x + NW - 4, y + 2, 2, NH - 4);
    if (fo.wiederholbar) { ctx.fillStyle = '#a77de0'; ctx.fillRect(x + 2, y + 2, NW - 4, 3); }
    const zweig = sprite('zweig', fo.zweig);
    if (detail) {
      if (zweig) ctx.drawImage(zweig, x + 7, y + 7, 22, 22);
      ctx.font = FONT_NAME; ctx.textBaseline = 'alphabetic';
      const name = kurzName(fo.id, false);
      ctx.fillStyle = '#000'; ctx.fillText(name, x + 35, y + 25);
      ctx.fillStyle = F.t; ctx.fillText(name, x + 34, y + 24);
      // Freischaltungen
      if (z === 'gesperrt') ctx.globalAlpha = (blass ? 0.16 : 1) * 0.55;
      const bilder = symbole[fo.id];
      const max = bilder.length > 7 ? 6 : 7;
      for (let i = 0; i < Math.min(max, bilder.length); i++) {
        ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(x + 7 + i * 26, y + 33, 24, 24);
        bild(bilder[i], x + 8 + i * 26, y + 34, 22);
      }
      if (bilder.length > max) { ctx.font = FONT_KLEIN; ctx.fillStyle = F.t; ctx.fillText('+' + (bilder.length - max), x + 9 + max * 26, y + 50); }
      ctx.globalAlpha = blass ? 0.16 : 1;
      // Dauer / Status
      ctx.font = FONT_KLEIN;
      const uhr = sprite('ui', 'uhr');
      if (z !== 'erforscht') {
        if (uhr) ctx.drawImage(uhr, x + 7, y + 61, 14, 14);
        ctx.fillStyle = z === 'gesperrt' ? '#77748a' : '#c8c2ae';
        ctx.fillText(dauerText(z === 'aktiv' ? restMs(fo.id) : dauerMs(fo)), x + 25, y + 73);
      } else {
        const h = sprite('ui', 'haken'); if (h) ctx.drawImage(h, x + 7, y + 61, 14, 14);
        ctx.fillStyle = '#9fdc8c'; ctx.fillText(B.zustaende.erforscht, x + 25, y + 73);
      }
      let rechts = '';
      if (z === 'aktiv') rechts = Math.floor(forschungsFortschritt() * 100) + ' %';
      else if (fo_?.teil?.[fo.id]) rechts = Math.floor(fo_.teil[fo.id] * 100) + ' %';
      if (rechts) { ctx.fillStyle = F.t; const w = ctx.measureText(rechts).width; ctx.fillText(rechts, x + NW - 9 - w, y + 73); }
      if (z === 'aktiv') {
        ctx.fillStyle = '#0b0d14'; ctx.fillRect(x + 4, y + NH - 2, NW - 8, 7);
        ctx.fillStyle = '#ffe066'; ctx.fillRect(x + 5, y + NH - 1, Math.round((NW - 10) * forschungsFortschritt()), 5);
      }
    } else {
      if (zweig) ctx.drawImage(zweig, x + 8, y + 8, 32, 32);
      if (ansicht.s >= 0.3) {
        ctx.font = FONT_GROSS;
        const name = kurzName(fo.id, true);
        ctx.fillStyle = '#000'; ctx.fillText(name, x + 46, y + 34);
        ctx.fillStyle = F.t; ctx.fillText(name, x + 44, y + 32);
      }
      if (z === 'aktiv') { ctx.fillStyle = '#0b0d14'; ctx.fillRect(x + 6, y + NH - 22, NW - 12, 14); ctx.fillStyle = '#ffe066'; ctx.fillRect(x + 8, y + NH - 20, Math.round((NW - 16) * forschungsFortschritt()), 10); }
    }
    // Markierungen
    const badge = (text, farbe, rx) => {
      ctx.font = '700 14px Silkscreen, Pixelify, monospace';
      const w = Math.max(24, ctx.measureText(text).width + 12);
      const bx = x + NW - w + 6 - (rx || 0), by = y - 11;
      ctx.fillStyle = '#0b0d14'; ctx.fillRect(bx - 2, by - 2, w + 4, 24);
      ctx.fillStyle = farbe; ctx.fillRect(bx, by, w, 20);
      ctx.fillStyle = '#0b0d14'; ctx.fillText(text, bx + 6, by + 15);
      return w + 6;
    };
    let rx = 0;
    if (z === 'schlange') rx += badge(String(fo_.schlange.indexOf(fo.id) + (fo_.aktiv ? 2 : 1)), '#5aa0e6', rx);
    if (fo.wiederholbar && erforscht()[fo.id]) rx += badge(B.stufe(erforscht()[fo.id] + (z === 'aktiv' ? 1 : 0)), '#a77de0', rx);
    if (fo.schluessel) { const k = sprite('ui', 'krone'); if (k) { ctx.fillStyle = '#0b0d14'; ctx.fillRect(x + NW - 23 - rx, y - 11, 22, 22); ctx.drawImage(k, x + NW - 20 - rx, y - 8, 16, 16); } }
    if (treffer_ && !istAuswahl) {
      ctx.globalAlpha = 1; ctx.strokeStyle = '#f0952f'; ctx.lineWidth = Math.max(3, 2.5 / ansicht.s);
      ctx.strokeRect(x - 5, y - 5, NW + 10, NH + 10);
    }
    if (istAuswahl || istHover || (suchText && treffer[trefferNr] === fo.id)) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = istAuswahl ? '#ffffff' : (suchText && treffer[trefferNr] === fo.id) ? '#f0952f' : 'rgba(255,255,255,.55)';
      ctx.lineWidth = istAuswahl ? 4 : 3;
      ctx.strokeRect(x - 6, y - 6, NW + 12, NH + 12);
    }
    ctx.globalAlpha = 1;
  }

  // ----- Eingabe: Ziehen, Pinch, Rad, Tippen -----
  const zeiger = new Map();
  let ziehStart = null, pinch = null, bewegt = false;
  const lokal = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  function treffe(px, py) {
    const wx = (px - ansicht.ox) / ansicht.s, wy = (py - ansicht.oy) / ansicht.s;
    for (const fo of FORSCHUNGEN) { const p = L.pos[fo.id]; if (wx >= p.x - 4 && wx <= p.x + NW + 4 && wy >= p.y - 4 && wy <= p.y + NH + 4) return fo.id; }
    return null;
  }
  cv.addEventListener('pointerdown', (e) => {
    try { cv.setPointerCapture(e.pointerId); } catch { /* synthetisch oder schon weg */ }
    animation = null;
    const p = lokal(e);
    zeiger.set(e.pointerId, p);
    if (zeiger.size === 1) { ziehStart = { ...p, ox: ansicht.ox, oy: ansicht.oy, t: performance.now() }; bewegt = false; }
    else if (zeiger.size === 2) {
      const [a, b] = [...zeiger.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      bewegt = true;
    }
    if (document.activeElement === suchFeld) suchFeld.blur();
  });
  cv.addEventListener('pointermove', (e) => {
    const p = lokal(e);
    if (!zeiger.has(e.pointerId)) {
      if (e.pointerType === 'mouse') { const h = treffe(p.x, p.y); if (h !== hover) { hover = h; cv.classList.toggle('zeigt', !!h); bitte(); } }
      return;
    }
    zeiger.set(e.pointerId, p);
    if (zeiger.size >= 2 && pinch) {
      const [a, b] = [...zeiger.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      ansicht.ox += mx - pinch.mx; ansicht.oy += my - pinch.my;
      if (pinch.d > 10) zoomUm(d / pinch.d, mx, my);
      pinch = { d, mx, my };
      begrenze(); bitte();
    } else if (ziehStart) {
      const dx = p.x - ziehStart.x, dy = p.y - ziehStart.y;
      if (!bewegt && Math.hypot(dx, dy) > (e.pointerType === 'mouse' ? 4 : 10)) { bewegt = true; cv.classList.add('zieht'); }
      if (bewegt) { ansicht.ox = ziehStart.ox + dx; ansicht.oy = ziehStart.oy + dy; begrenze(); bitte(); }
    }
  });
  const loslassen = (e) => {
    if (!zeiger.has(e.pointerId)) return;
    const p = zeiger.get(e.pointerId);
    zeiger.delete(e.pointerId);
    if (zeiger.size < 2) pinch = null;
    if (zeiger.size === 1) { const q = [...zeiger.values()][0]; ziehStart = { ...q, ox: ansicht.ox, oy: ansicht.oy }; return; }
    if (zeiger.size === 0) {
      cv.classList.remove('zieht');
      if (!bewegt && e.type === 'pointerup') {
        const id = treffe(p.x, p.y);
        if (id) waehle(id, false); else schliesseDetail();
      }
      ziehStart = null;
    }
  };
  cv.addEventListener('pointerup', loslassen);
  cv.addEventListener('pointercancel', loslassen);
  cv.addEventListener('pointerleave', () => { if (hover) { hover = null; cv.classList.remove('zeigt'); bitte(); } });
  cv.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = lokal(e);
    if (!e.ctrlKey && Math.abs(e.deltaX) > Math.abs(e.deltaY)) { ansicht.ox -= e.deltaX; begrenze(); bitte(); return; }
    if (e.shiftKey) { ansicht.ox -= e.deltaY; begrenze(); bitte(); return; }
    const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    zoomUm(Math.exp(-d * (e.ctrlKey ? 0.01 : 0.0015)), p.x, p.y);
  }, { passive: false });

  // ----- Detailpanel -----
  let detailSchl = '', detailFortschritt = null;
  function schliesseDetail() {
    if (!auswahl) return;
    auswahl = null; markiert = null; detailSchl = '';
    detailEl.classList.add('versteckt');
    filterOptionen(); bitte();
  }
  function waehle(id, springen) {
    auswahl = id;
    markiert = { vor: alleVorgaenger(id) };
    filterOptionen();
    detailZeichnen(true);
    if (springen || !imBild(id)) zentriere(id, true);
    bitte();
  }
  function verweis(id) {
    const z = zust[id];
    return el('button.fb-verweis', { style: { borderLeftColor: FARBE[z].r }, onclick: () => waehle(id, true), tip: B.zustaende[z] }, symbol('zweig', FORSCHUNG[id].zweig), FORSCHUNG[id].name);
  }
  function detailZeichnen(erzwingen) {
    if (!auswahl) return;
    const fo = FORSCHUNG[auswahl], d = du(), fs = d?.forschung;
    const schl = JSON.stringify([auswahl, fs?.aktiv, fs?.schlange, fs?.erforscht?.[auswahl], Object.keys(fs?.erforscht || {}).length, Math.round(wissenschaft())]);
    if (!erzwingen && schl === detailSchl) { aktualisiereFortschritt(); return; }
    detailSchl = schl;
    const z = zust[auswahl];
    const zeitalter = ZEITALTER[fo.zeitalter];
    const e = [];
    e.push(el('div.fb-dkopf', symbol('zweig', fo.zweig, { px: 40 }),
      el('div', el('h2', { text: fo.name }),
        el('span.fb-marke', { text: zeitalter.name, style: { color: '#0b0d14', background: zeitalter.farbe } }),
        el('span.fb-marke', { text: B.zweige[fo.zweig] }),
        el('span.fb-marke', { text: B.zustaende[z], style: { background: FARBE[z].f, color: FARBE[z].t, borderColor: FARBE[z].r } })),
      el('button.knopf.klein', { onclick: schliesseDetail, 'aria-label': T.schliessen, tip: T.schliessen }, symbol('ui', 'schliessen'))));
    e.push(el('p.fb-besch', { text: fo.beschreibung }));
    if (fo.schluessel) e.push(el('p.klein', symbol('ui', 'krone'), ' ', B.schluessel));
    if (fo.wiederholbar) e.push(el('p.klein', symbol('ui', 'stern_voll'), ' ', B.wiederholbar(erforscht()[fo.id] || 0)));
    // Dauer
    const dauerZeile = el('p', symbol('ui', 'uhr'), ' ', el('b', { text: B.dauer + ': ' }), dauerText(dauerMs(fo)), el('span.klein', { text: ' ' + B.beiWissenschaft(Math.round(wissenschaft())) }));
    e.push(dauerZeile);
    detailFortschritt = null;
    if (z === 'aktiv' || fs?.teil?.[auswahl]) {
      const bal = balken(z === 'aktiv' ? forschungsFortschritt() : fs.teil[auswahl], 'gold');
      const txt = el('div.klein');
      detailFortschritt = { bal, txt, aktiv: z === 'aktiv' };
      e.push(bal, txt);
    }
    // Voraussetzungen / Nachfolger
    if (fo.voraussetzungen.length) e.push(el('h3', { text: B.voraussetzungen }), el('div.fb-verweise', fo.voraussetzungen.map(verweis)));
    else e.push(el('h3', { text: B.voraussetzungen }), el('p.klein', { text: B.keineVoraussetzungen }));
    const nach = NACHFOLGER[auswahl] || [];
    if (nach.length) e.push(el('h3', { text: B.ermoeglicht }), el('div.fb-verweise', nach.map(verweis)));
    // Freischaltungen
    e.push(el('h3', { text: B.freischaltungen }));
    for (const x of fo.freischaltet) {
      const i = freiInfo(x);
      e.push(el('div.fb-frei', symbol(i.kat, i.id, { ...(i.o || {}), px: 28 }), el('div', el('span.klein', { text: i.art }), el('b', { text: i.titel }), i.text ? el('span.klein', { text: i.text }) : null)));
    }
    // Weg und Knöpfe
    const knoepfe = el('div.fb-knoepfe');
    const kannNicht = z === 'erforscht' || (z === 'aktiv' && !fo.wiederholbar);
    if (!kannNicht && fs) {
      const w = weg(auswahl, fs.erforscht);
      const summe = w.reduce((a, x) => a + restMs(x), 0);
      if (w.length > 1) e.push(el('div.fb-weg', el('b', { text: B.wegTitel(w.length) }), el('div', { text: w.map((x) => FORSCHUNG[x].name).join(' → ') }), el('div.gold-t', { text: B.gesamt + ': ' + dauerText(summe) })));
      if (z !== 'aktiv') {
        knoepfe.append(el('button.knopf.gold', { onclick: () => forschen(auswahl) }, symbol('ui', 'forschung'), el('span', el('b', { text: w.length > 1 ? B.jetztKette(w.length) : B.jetzt }), el('span.klein', { text: B.dauert(dauerText(summe)) }))));
      }
      // Hinten anstellen
      const sim = { ...fs.erforscht }; if (fs.aktiv) sim[fs.aktiv] = 1; for (const x of fs.schlange || []) sim[x] = 1;
      const w2 = weg(auswahl, sim);
      if (w2.length && !(fs.schlange || []).includes(auswahl)) {
        const vorher = (fs.aktiv ? restMs(fs.aktiv) : 0) + (fs.schlange || []).reduce((a, x) => a + restMs(x), 0);
        const dazu = w2.reduce((a, x) => a + restMs(x), 0);
        knoepfe.append(el('button.knopf', { onclick: () => anstellen(auswahl) }, symbol('ui', 'plus'), el('span', el('b', { text: B.hintenAn }), el('span.klein', { text: B.fertigIn(dauerText(vorher + dazu)) }))));
        if (w2.length > 1) knoepfe.append(el('div.klein', { text: B.hintenKette(w2.map((x) => FORSCHUNG[x].name).join(' → ')) }));
      }
    }
    if ((fs?.schlange || []).includes(auswahl)) knoepfe.append(el('button.knopf.rot', { onclick: () => entfernen(auswahl) }, symbol('ui', 'kreuz'), B.ausSchlange));
    if (nach.length) knoepfe.append(el('button.knopf', { onclick: () => setzeFilter('braucht:' + auswahl) }, symbol('ui', 'auge_zu'), B.zeigeBraucht));
    e.push(knoepfe);
    detailEl.replaceChildren(...e);
    detailEl.classList.remove('versteckt');
    aktualisiereFortschritt();
  }
  function aktualisiereFortschritt() {
    if (!detailFortschritt) return;
    const fs = du()?.forschung;
    const p = detailFortschritt.aktiv ? forschungsFortschritt() : fs?.teil?.[auswahl] || 0;
    detailFortschritt.bal.firstChild.style.width = Math.round(p * 100) + '%';
    detailFortschritt.txt.textContent = detailFortschritt.aktiv ? B.fortschrittAktiv(Math.floor(p * 100), dauerText(restMs(auswahl))) : B.fortschrittTeil(Math.floor(p * 100));
  }

  // ----- Befehle -----
  async function forschen(id) {
    const r = await befehl({ art: 'forschen', id });
    if (!r?.ok) { fehler(r?.fehler || B.fehlgeschlagen); return; }
    toast(B.gestartet(FORSCHUNG[(r.weg && r.weg[0]) || id].name), 'erfolg', { symbol: 'forschung' });
  }
  async function anstellen(id) {
    const fs = du()?.forschung; if (!fs) return;
    const r = await befehl({ art: 'forschung_schlange', ids: [...(fs.schlange || []), id] });
    if (!r?.ok) fehler(r?.fehler || B.fehlgeschlagen);
  }
  async function entfernen(id) {
    const fs = du()?.forschung; if (!fs) return;
    // auch alles entfernen, was darauf aufbaut (sonst schaltet der Server es wieder davor)
    const weg_ = alleNachfolger(id); weg_.add(id);
    const r = await befehl({ art: 'forschung_schlange', ids: (fs.schlange || []).filter((x) => !weg_.has(x)) });
    if (!r?.ok) fehler(r?.fehler || B.fehlgeschlagen);
  }

  // ----- Leiste: aktuelle Forschung + Warteschlange -----
  let leisteSchl = '', leisteBalken = null;
  function leisteZeichnen() {
    const fs = du()?.forschung;
    const schl = JSON.stringify([fs?.aktiv, fs?.schlange]);
    if (schl === leisteSchl) { aktualisiereLeiste(); return; }
    leisteSchl = schl;
    const teile = [el('b.klein', { text: B.leisteTitel, style: { flex: 'none' } })];
    leisteBalken = null;
    if (fs?.aktiv) {
      const fo = FORSCHUNG[fs.aktiv];
      const bal = balken(forschungsFortschritt(), 'gold'), txt = el('span.klein');
      leisteBalken = { bal, txt };
      teile.push(el('div.fb-chip.aktiv', { onclick: () => waehle(fo.id, true), tip: B.aktivTip }, symbol('zweig', fo.zweig, { px: 20 }), el('div', el('b', { text: fo.name }), el('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, bal, txt))));
    } else teile.push(el('span.gold-t', { text: B.keineAktiv }));
    (fs?.schlange || []).forEach((id, i) => {
      const fo = FORSCHUNG[id];
      teile.push(symbol('ui', 'pfeil_rechts'));
      teile.push(el('div.fb-chip', { onclick: () => waehle(id, true) }, el('span.nr', { text: String(i + (fs.aktiv ? 2 : 1)) }), symbol('zweig', fo.zweig, { px: 20 }), el('span', { text: fo.name }),
        el('button.knopf.klein.rot', { 'aria-label': B.entfernen, tip: B.entfernen, onclick: (e) => { e.stopPropagation(); entfernen(id); } }, symbol('ui', 'kreuz'))));
    });
    if (fs?.schlange?.length) {
      const summe = (fs.aktiv ? restMs(fs.aktiv) : 0) + fs.schlange.reduce((a, x) => a + restMs(x), 0);
      teile.push(el('span.klein', { text: B.schlangeGesamt(dauerText(summe)), style: { flex: 'none', marginLeft: '6px' } }));
    } else if (fs?.aktiv) teile.push(el('span.klein', { text: B.schlangeLeer, style: { flex: 'none' } }));
    schlangeEl.replaceChildren(...teile);
    aktualisiereLeiste();
  }
  function aktualisiereLeiste() {
    if (!leisteBalken) return;
    const fs = du()?.forschung; if (!fs?.aktiv) return;
    const p = forschungsFortschritt();
    leisteBalken.bal.firstChild.style.width = Math.round(p * 100) + '%';
    leisteBalken.txt.textContent = Math.floor(p * 100) + ' % · ' + dauerText(restMs(fs.aktiv));
  }

  // ----- Live-Aktualisierung -----
  function aktualisieren() {
    if (!offen) return;
    zustaendeNeu();
    if (filter === 'erforschbar' || filter === 'offen') setzeFilter(filter, false);
    leisteZeichnen();
    detailZeichnen(false);
    bitte();
  }
  abmelden.push(an('aenderung', aktualisieren));
  const takt = setInterval(() => { if (!offen) return; aktualisiereLeiste(); aktualisiereFortschritt(); if (du()?.forschung?.aktiv) bitte(); }, 1000);
  abmelden.push(() => clearInterval(takt));
  const ro = new ResizeObserver(() => groesse());
  ro.observe(buehne);
  abmelden.push(() => ro.disconnect());
  document.fonts?.load?.(FONT_NAME).then(() => { for (const k in namenKurz) delete namenKurz[k]; bitte(); }).catch(() => {});

  offen = { waehle, fenster: f };
  groesse();
  ansicht.s = Math.max(0.6, Math.min(1, bh / L.H));
  leisteZeichnen();
  if (id && FORSCHUNG[id]) { waehle(id, false); bewegeZu(ziel(id, ansicht.s), false); }
  else bewegeZu(ziel(startId(), ansicht.s), false);
}
