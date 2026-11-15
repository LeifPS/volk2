// Stadtfenster: Übersicht (Erträge, Wachstum, Grenzen, Zufriedenheit, Verteidigung, Unterhalt), Bauen, Gebäude, Felder.
import { el as basisEl, symbol, fenster, frageJaNein, toast, fehler, zahl, vorzeichen, dauerText, uhrzeit, balken, tip } from './basis.js';
import { T } from '../texte.js';
import { Z, an, du, stadt as stadtVon, feldInfo, eigeneStaedte, aktuellesGold, aktuellesLager, serverJetzt, erkundet } from '../kern/zustand.js';
import { befehl, frage } from '../kern/netz.js';
import { EINHEIT, GEB, WUNDER_NACH_ID, VERBESSERUNG, ROHSTOFFE, GELAENDE, ZEITALTER } from '../../shared/daten/index.js';
import { LAGER_NAMEN } from '../../shared/daten/rohstoffe.js';
import { karte } from '../../shared/karte.js';
import { abstand, umkreis, xVon, yVon } from '../../shared/hex.js';
import * as REGELN from '../../shared/regeln.js';
import { ERTRAG_FAKTOR as F, STD, bauTempo, zufriedenheitsFaktor, stadtUnzufriedenheit, freierGebaeudeUnterhalt, STADT_RADIUS_ARBEIT, ABBRUCH_ERSTATTUNG } from '../../shared/regeln.js';
import { sprite } from '../grafik/sprites.js';
import { ton } from '../audio.js';

/** el() mit zusammengeführtem class-Attribut (sonst würde es die Klassen aus dem Tag überschreiben). */
function el(tag, attr, ...kinder) {
  if (attr && typeof attr === 'object' && !(attr instanceof Node) && !Array.isArray(attr) && 'class' in attr) {
    const c = String(attr.class || '').trim();
    if (c) tag += '.' + c.split(/\s+/).join('.');
    attr = { ...attr, class: undefined };
  }
  return basisEl(tag, attr, ...kinder);
}


const S = () => T.stadt;
const REITER = ['uebersicht', 'bauen', 'gebaeude', 'felder'];
const ERTRAEGE = ['n', 'p', 'g', 'w', 'k'];
const ERTRAG_SYM = { n: 'nahrung', p: 'produktion', g: 'gold', w: 'wissenschaft', k: 'kultur' };
const GF = REGELN.GOLD_FAKTOR ?? F, WJE = REGELN.WISSEN_JE_EINWOHNER ?? 0.5;
/** Faktor von Grundwert zu "pro Stunde" je Ertragsart (wie in der Engine). */
const FAK = { n: F, p: 1, g: GF, w: 1, k: F };
const MIT_FAKTOR = { n: true, g: true, k: true };

// ---------- gemeinsame Helfer (auch von reich.js genutzt) ----------
export const bauDaten = (art, id) => (art === 'gebaeude' ? GEB[id] : art === 'wunder' ? WUNDER_NACH_ID[id] : EINHEIT[id]);
export const bauName = (b) => bauDaten(b.art, b.id)?.name || b.id;
export function bauSymbol(art, id, px) {
  if (art === 'einheit') return symbol('einheit', id, { farbe: du()?.farbe, px });
  if (art === 'wunder') return symbol('wunder', id, { px });
  return symbol('gebaeude', id, { px, zeitalter: du()?.zeitalter || 0 });
}
const z1 = (x) => zahl(x, Math.abs(x) < 10 && Math.round(x) !== x ? 1 : 0);

/** Wirkung eines Gebäudes/Wunders als Liste kurzer Klartext-Sätze (Werte pro Stunde, wie sie in der Stadt ankommen). */
export function wirkungListe(wk = {}) {
  const W = S().wirkung, l = [];
  for (const [k, x] of Object.entries(wk || {})) {
    if (!x) continue;
    if (k === 'pro_einwohner') { for (const [a, y] of Object.entries(x)) if (y) l.push(S().proEinwohner(z1(y * (FAK[a] || 1)), S().ertragName[a])); continue; }
    if (k === 'material') { for (const [g, y] of Object.entries(x)) l.push(`+${z1(y * F)} ${LAGER_NAMEN[g] || g}/h`); continue; }
    const f = W[k];
    l.push(f ? f(z1(k === 'gold' ? x * GF : ['nahrung', 'kultur'].includes(k) ? x * F : x), x) : `${k}: ${x}`);
  }
  return l;
}
/** Reichsweite Boni (Bonus-Schlüssel) als Klartext. */
export function boniListe(b = {}) {
  const B = T.reich.boni, l = [];
  for (const [k, x] of Object.entries(b || {})) if (x) l.push(B[k] ? B[k](x) : `${k}: ${x}`);
  return l;
}
function kostenEl(kosten, fehlt) {
  return el('div.st-kosten', Object.entries(kosten || {}).filter(([g, n]) => g !== 'zeit' && n).map(([g, n]) => {
    const hat = g === 'gold' ? aktuellesGold() : aktuellesLager(g);
    return el('span' + (fehlt?.[g] ? '.rot-t' : ''), { tip: S().kostenTip(LAGER_NAMEN[g] || g, n, Math.floor(hat)) }, symbol('ui', g), zahl(n));
  }));
}

// ---------- Ertrag eines Feldes (Nachbildung der Engine-Formel, nur für die Anzeige) ----------
function rohstoffAuf(i) {
  const rn = karte().rohstoff[i]; if (!rn) return null;
  const r = ROHSTOFFE[rn - 1];
  if (r.sichtbar_durch && !du()?.forschung?.erforscht?.[r.sichtbar_durch]) return null;
  return r;
}
function erschlossen(i, r) {
  const f = feldInfo(i);
  if (!r || !f?.v || f.pl > serverJetzt()) return false;
  const vb = VERBESSERUNG[f.v];
  return !!vb && (vb.kette === r.verbesserung || !!r.verbesserung_alt?.includes(vb.kette));
}
export function feldErtrag(i, mitMaterial = true) {
  const k = karte(), g = GELAENDE[k.gelaende[i]], jetzt = serverJetzt();
  const e = { n: g.ertrag.n, p: g.ertrag.p, g: g.ertrag.g, w: g.wissen || 0, k: g.kultur || 0, material: {} };
  const f = feldInfo(i) || {};
  if (f.fo > jetzt) return { n: 0, p: 0, g: 0, w: 0, k: 0, material: {} };
  if (k.fluss[i] && !g.wasser) e.g += 1;
  if (mitMaterial && g.material) for (const [m, x] of Object.entries(g.material)) e.material[m] = (e.material[m] || 0) + x;
  if (f.v && !(f.pl > jetzt)) {
    const vb = VERBESSERUNG[f.v];
    if (vb) { for (const x of ERTRAEGE) e[x] += vb.ertrag?.[x] || 0; if (mitMaterial && vb.material) for (const [m, x] of Object.entries(vb.material)) e.material[m] = (e.material[m] || 0) + x; }
  }
  if (f.w) { const w = VERBESSERUNG[f.w]; if (w) for (const x of ERTRAEGE) e[x] += w.ertrag?.[x] || 0; }
  const r = rohstoffAuf(i);
  if (r && erschlossen(i, r)) for (const x of ERTRAEGE) e[x] += r.ertrag?.[x] || 0;
  return e;
}
function zentrumErtrag(s) {
  const z = feldErtrag(s.feld, false);
  z.n = Math.max(z.n, 2) + 1; z.p = Math.max(z.p, 1) + 1; z.g = Math.max(z.g, 1) + 1;
  return z;
}

// ---------- Stil ----------
let stilDa = false;
function stil() {
  if (stilDa) return; stilDa = true;
  document.head.append(el('style', { text: `
.st-kopf { display: flex; gap: 4px; align-items: center; }
.st-sub { font-size: 12px; color: var(--text2); font-family: var(--schrift); margin-left: 6px; }
.st-reiter .knopf { min-width: 110px; }
.st-raster { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 10px; align-items: start; }
.st-box { background: var(--panel2); border: 2px solid var(--rand); padding: 8px 10px; }
.st-box > h2 { font-size: 14px; display: flex; gap: 6px; align-items: center; margin-bottom: 6px; }
.st-box.breit { grid-column: 1 / -1; }
.st-zeile { display: flex; gap: 6px; align-items: center; margin: 3px 0; }
.st-zeile .r { margin-left: auto; font-family: var(--kopf); font-size: 13px; }
.st-tab td.z, .st-tab th.z { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.st-tab th { cursor: default; }
.st-tab td.summe { font-weight: 700; font-size: 16px; }
.st-tab tr.fuss td { border-top: 2px solid #4a5470; }
.st-warn { background: #4a1f1a; border: 2px solid #6a1f12; padding: 8px 10px; margin-bottom: 10px; display: flex; gap: 8px; align-items: center; }
.st-hinweis { background: #3a3220; border: 2px solid #6a5420; padding: 6px 8px; display: flex; gap: 8px; align-items: center; margin: 6px 0; }
.st-bau { display: grid; grid-template-columns: minmax(280px, 360px) 1fr; gap: 12px; align-items: start; }
@media (max-width: 1000px) { .st-bau { grid-template-columns: 1fr; } }
.st-platz { display: flex; gap: 8px; align-items: center; padding: 6px; background: var(--panel2); border: 2px solid var(--rand); margin-bottom: 6px; }
.st-platz.frei { border-style: dashed; color: var(--text2); justify-content: center; min-height: 54px; }
.st-platz .mitte { flex: 1; min-width: 0; }
.st-platz .name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.st-nr { font-family: var(--kopf); color: var(--text2); width: 16px; text-align: center; }
.st-hoch canvas { transform: rotate(90deg); }
.st-steuer { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 8px; }
.st-steuer select { background: #0e1119; color: var(--text); border: 2px solid var(--rand); padding: 6px; min-height: 38px; }
.st-chk { display: inline-flex; gap: 6px; align-items: center; min-height: 38px; cursor: pointer; }
.st-chk input { width: 20px; height: 20px; }
.st-liste { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 6px; margin-bottom: 12px; }
.st-eintrag { min-height: 74px; }
.st-eintrag .mitte { flex: 1; min-width: 0; }
.st-eintrag .kopfz { display: flex; gap: 6px; align-items: baseline; }
.st-eintrag .kopfz b { flex: 1; }
.st-eintrag.fehlt { border-color: #6a5420; }
.st-eintrag.wunder { background: #2a2540; }
.st-kosten { display: flex; flex-wrap: wrap; gap: 2px 9px; font-size: 13px; margin-top: 3px; }
.st-kosten > span { display: inline-flex; align-items: center; gap: 3px; }
.st-gruppe { display: flex; align-items: center; gap: 8px; margin: 8px 0 6px; }
.st-gruppe h3 { margin: 0; }
.st-gruppe::after { content: ''; flex: 1; border-bottom: 2px solid #353d52; }
.st-geb { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 6px; margin-bottom: 10px; }
.st-geb .eintrag { cursor: default; }
.st-geb ul { margin: 3px 0 0; padding-left: 16px; font-size: 13px; }
.st-felder { display: flex; gap: 14px; flex-wrap: wrap; align-items: flex-start; }
.st-karte { position: relative; flex: none; background: #0b0d14; border: 3px solid var(--rand); }
.st-karte canvas { display: block; }
.st-hex { position: absolute; background: transparent; border: 0; padding: 0; margin: 0; cursor: pointer; clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%); }
.st-hex:hover { background: rgba(255,255,255,.18); }
.st-hex.gewaehlt { background: rgba(255,240,160,.25); }
.st-hex.tot { cursor: default; }
.st-hex.tot:hover { background: transparent; }
.st-seite { flex: 1; min-width: 260px; max-width: 420px; display: flex; flex-direction: column; gap: 10px; }
.st-legende { display: grid; grid-template-columns: 22px 1fr; gap: 4px 8px; align-items: center; font-size: 13px; }
.st-legende i { width: 18px; height: 18px; display: inline-block; border: 2px solid var(--rand); }
.st-ertr { display: inline-flex; gap: 8px; flex-wrap: wrap; }
.st-ertr span { display: inline-flex; gap: 3px; align-items: center; }
` }));
}

// ---------- Fenster ----------
let offen = null;

export function oeffneStadt(id, reiter) {
  stil();
  if (reiter === 'bau') reiter = 'bauen';
  const s = stadtVon(id);
  if (!s || s.volk !== Z.volk) { fehler(S().nichtDeine); return; }
  if (offen) { offen.id = id; if (reiter) offen.reiter = reiter; offen.liste = null; offen.feld = null; zeichne(); return; }
  const z = { id, reiter: REITER.includes(reiter) ? reiter : 'uebersicht', liste: null, listeFuer: null, listeZeit: 0, filter: 'alle', sort: 'standard', alle: false, feld: null, schl: '', live: [] };
  offen = z;
  z.symbolEl = el('span');
  const kn = (sym, text, f) => el('button.knopf.klein', { onclick: f, tip: text, 'aria-label': text }, symbol('ui', sym));
  const kopf = el('div.st-kopf',
    kn('pfeil_links', S().vorige, () => blaettern(-1)),
    kn('pfeil_rechts', S().naechste, () => blaettern(1)),
    el('button.knopf.klein', { onclick: () => umbenennen(), tip: S().umbenennenTip }, symbol('ui', 'stadt'), S().umbenennen),
  );
  const ab = an('aenderung', (x) => aenderung(x));
  const uhr = setInterval(() => { for (const fn of z.live) { try { fn(); } catch { /* egal */ } } }, 1000);
  z.f = fenster(s.name, null, { breite: 'voll', kopf, symbol: z.symbolEl, beiSchliessen: () => { ab(); clearInterval(uhr); offen = null; } });
  zeichne();
}

function blaettern(r) {
  const l = eigeneStaedte().sort((a, b) => a.id - b.id || String(a.id).localeCompare(String(b.id)));
  if (l.length < 2) return;
  const i = l.findIndex((s) => s.id === offen.id);
  offen.id = l[(i + r + l.length) % l.length].id;
  offen.liste = null; offen.feld = null;
  zeichne();
}

function schluessel(s) {
  let x = JSON.stringify(s);
  if (offen.reiter === 'felder') for (const i of s.gebiet || []) { const f = feldInfo(i); if (f) x += i + JSON.stringify(f); }
  return x;
}

function aenderung(x) {
  const z = offen; if (!z) return;
  const s = stadtVon(z.id);
  if (!s || s.volk !== Z.volk) { z.f.schliessen(); return; }
  const neu = schluessel(s);
  if (neu !== z.schl) { if (z.reiter === 'bauen') z.liste = null; zeichne(); return; }
  if (z.reiter === 'bauen' && (x?.voll || x?.gruppen?.has('du')) && Date.now() - z.listeZeit > 4000) ladeListe(true);
}

function zeichne() {
  const z = offen; if (!z) return;
  const s = stadtVon(z.id); if (!s) return;
  z.schl = schluessel(s);
  z.live = [];
  const f = z.f;
  const scroll = f.inhalt.scrollTop;
  f.element.querySelector('.kopf h1').replaceChildren(s.name, el('span.st-sub', { text: (s.hauptstadt ? S().hauptstadt + ' · ' : '') + S().einwohner(s.bev) }));
  z.symbolEl.replaceChildren(symbol('stadt', 'stadt', { farbe: du()?.farbe, zeitalter: s.zeitalter || 0, groesse: s.bev >= 12 ? 3 : s.bev >= 6 ? 2 : 1, px: 40 }));
  const reiter = el('div.reiter.st-reiter', REITER.map((r) => el('button.knopf' + (r === z.reiter ? '.gold' : ''), { onclick: () => { z.reiter = r; z.schl = ''; zeichne(); f.inhalt.scrollTop = 0; } }, symbol('ui', { uebersicht: 'stadt', bauen: 'bau', gebaeude: 'lager', felder: 'karte' }[r]), S().reiter[r])));
  const koerper = el('div');
  f.inhalt.replaceChildren(reiter, koerper);
  if (s.zerstoert_bis > serverJetzt()) koerper.append(el('div.st-warn', symbol('ui', 'warnung', { px: 24 }), el('div', el('b', { text: S().zerstoert }), el('div.klein', { text: S().zerstoertText(dauerText(s.zerstoert_bis - serverJetzt()), uhrzeit(s.zerstoert_bis)) }))));
  if (z.reiter === 'uebersicht') uebersicht(s, koerper);
  else if (z.reiter === 'bauen') bauen(s, koerper);
  else if (z.reiter === 'gebaeude') gebaeude(s, koerper);
  else felder(s, koerper);
  f.inhalt.scrollTop = scroll;
}

/** Lebendiger Fortschrittsbalken + Resttext aus Server-Zeitstempeln. */
function fortschritt(start, ende, art = 'gold', textFn) {
  const b = balken(0, art), t = el('div.klein');
  const upd = () => {
    const j = serverJetzt();
    b.firstChild.style.width = Math.round(Math.max(0, Math.min(1, (j - start) / Math.max(1, ende - start))) * 100) + '%';
    t.textContent = textFn ? textFn(ende - j) : S().nochBis(dauerText(ende - j), uhrzeit(ende));
  };
  upd(); offen.live.push(upd);
  return [b, t];
}

// ---------- Übersicht ----------
function box(sym, titel, ...kinder) { return el('div.st-box', el('h2', sym ? symbol('ui', sym) : null, titel), ...kinder); }
function zeileEl(sym, text, wert, tipText, klasse) { return el('div.st-zeile', { tip: tipText }, sym ? symbol('ui', sym) : null, el('span', { text }), el('span.r' + (klasse ? '.' + klasse : ''), { text: wert })); }

function uebersicht(s, k) {
  const r = s.raten || {};
  const d = du();
  const jetzt = serverJetzt();
  const stunden = Math.max(0, jetzt - (d.stand_um || jetzt)) / STD;
  const zerstoert = s.zerstoert_bis > jetzt;

  // --- Erträge mit Aufschlüsselung ---
  const q = { zentrum: zentrumErtrag(s), felder: { n: 0, p: 0, g: 0, w: 0, k: 0 }, einwohner: { n: 0, p: 0, g: 0, w: s.bev * WJE, k: 1 }, gebaeude: { n: 0, p: 0, g: 0, w: 0, k: 0 }, wunder: { n: 0, p: 0, g: 0, w: 0, k: 0 } };
  for (const i of s.arbeit || []) { const e = feldErtrag(i); for (const x of ERTRAEGE) q.felder[x] += e[x]; }
  for (const gid of s.gebaeude || []) {
    const wk = GEB[gid]?.wirkung || {};
    q.gebaeude.n += wk.nahrung || 0; q.gebaeude.p += wk.produktion || 0; q.gebaeude.g += wk.gold || 0; q.gebaeude.w += wk.wissenschaft || 0; q.gebaeude.k += wk.kultur || 0;
    const pe = wk.pro_einwohner || {};
    q.gebaeude.w += (pe.w || 0) * s.bev; q.gebaeude.g += (pe.g || 0) * s.bev; q.gebaeude.k += (pe.k || 0) * s.bev; q.gebaeude.p += (pe.p || 0) * s.bev;
  }
  const wunderHier = Object.entries(Z.ansicht.wunder || {}).filter(([, w]) => w.stadt === s.id && w.fertig).map(([wid]) => wid);
  for (const wid of wunderHier) { const wk = WUNDER_NACH_ID[wid]?.wirkung || {}; q.wunder.n += wk.nahrung || 0; q.wunder.p += wk.produktion || 0; q.wunder.g += wk.gold || 0; q.wunder.w += wk.wissenschaft || 0; q.wunder.k += wk.kultur || 0; }
  const spalten = ['zentrum', 'felder', 'einwohner', 'gebaeude', 'wunder'].filter((sp) => sp !== 'wunder' || wunderHier.length);
  const Q = S().quellen;
  const tab = el('table.tabelle.st-tab',
    el('tr', el('th', ''), spalten.map((sp) => el('th.z', { text: Q[sp], tip: S().quellenTip[sp] })), el('th.z', { text: Q.boni, tip: S().quellenTip.boni }), el('th.z', { text: Q.summe })),
    ERTRAEGE.map((x) => {
      const fk = FAK[x];
      const werte = spalten.map((sp) => q[sp][x] * fk);
      const summe = r[x] || 0;
      const rest = summe - werte.reduce((a, b) => a + b, 0);
      const zelle = (v) => el('td.z' + (Math.abs(v) < 0.05 ? '.klein' : v < 0 ? '.rot-t' : ''), { text: Math.abs(v) < 0.05 ? '·' : (v < 0 ? '−' : '') + z1(Math.abs(v)) });
      return el('tr', { tip: S().ertragTip[x] }, el('td', el('span.st-zeile', symbol('ui', ERTRAG_SYM[x]), S().ertragName[x] + (MIT_FAKTOR[x] ? ' /h' : ''))), werte.map(zelle), zelle(rest), el('td.z.summe', { class: { n: 'gruen-t', p: '', g: 'gold-t', w: 'blau-t', k: 'lila-t' }[x], text: z1(summe) }));
    }),
  );
  const ertragBox = box('produktion', S().ertraege, tab,
    el('div.klein', { style: { marginTop: '6px' }, text: S().ertraegeHinweis(zahl(bauTempo(r.p || 0) * 100 - 100), zahl(r.w || 0)) }),
  );
  const mat = Object.entries(r.material || {}).filter(([, x]) => x > 0.01);
  if (mat.length) ertragBox.append(el('div.st-zeile', { style: { flexWrap: 'wrap', marginTop: '6px' }, tip: S().materialTip }, el('span.klein', { text: S().material + ':' }), mat.map(([g, x]) => el('span.st-zeile', { style: { margin: '0 6px 0 0' } }, symbol('ui', g), `+${z1(x)}/h`))));
  ertragBox.classList.add('breit');

  // --- Wachstum ---
  const ueb = r.ueberschuss || 0;
  const nJetzt = () => Math.max(0, Math.min(s.bedarf, (s.nahrung || 0) + ueb * (Math.max(0, serverJetzt() - (d.stand_um || serverJetzt())) / STD)));
  const nb = balken(nJetzt() / s.bedarf, ueb < 0 ? 'rot' : ''), nt = el('div.klein'), nz = el('div');
  const updN = () => {
    const n = nJetzt();
    nb.firstChild.style.width = Math.round(Math.min(1, n / s.bedarf) * 100) + '%';
    nt.textContent = S().nahrungStand(zahl(n), zahl(s.bedarf));
    if (zerstoert && ueb >= 0) nz.replaceChildren(el('span.klein', { text: S().keinWachstumZerstoert }));
    else if (ueb > 0.01) { const t = s.wachstum_um || (serverJetzt() + (s.bedarf - n) / ueb * STD); nz.replaceChildren(el('span.gruen-t', { text: S().waechstIn(dauerText(t - serverJetzt()), uhrzeit(t)) })); }
    else if (ueb < -0.01) { const t = serverJetzt() + n / -ueb * STD; nz.replaceChildren(el('span.rot-t', { text: s.bev > 1 ? S().hungerIn(dauerText(t - serverJetzt()), uhrzeit(t)) : S().hungerKlein })); }
    else nz.replaceChildren(el('span.gold-t', { text: S().stillstand }));
  };
  updN(); offen.live.push(updN);
  const wachstum = box('bevoelkerung', S().wachstum,
    el('div.st-zeile', el('b', { text: S().einwohner(s.bev) })),
    nb, nt,
    zeileEl('nahrung', S().produziert, '+' + z1(r.n || 0) + '/h', S().ertragTip.n),
    zeileEl('bevoelkerung', S().verbrauch, '−' + z1(r.verbrauch || 0) + '/h', S().verbrauchTip),
    zeileEl(null, S().ueberschuss, vorzeichen(ueb, 1) + '/h', S().ueberschussTip, ueb >= 0 ? 'gruen-t' : 'rot-t'),
    nz,
  );

  // --- Grenzen ---
  const gr = r.grenzKultur || 0;
  const kJetzt = () => Math.min(s.grenzkosten, (s.kultur || 0) + gr * (Math.max(0, serverJetzt() - (d.stand_um || serverJetzt())) / STD));
  const kb = balken(kJetzt() / s.grenzkosten, 'blau'), kt = el('div.klein'), kz = el('div');
  const updK = () => {
    const kk = kJetzt();
    kb.firstChild.style.width = Math.round(Math.min(1, kk / s.grenzkosten) * 100) + '%';
    kt.textContent = S().kulturStand(zahl(kk), zahl(s.grenzkosten));
    const t = s.grenze_um || (gr > 0 ? serverJetzt() + (s.grenzkosten - kk) / gr * STD : null);
    kz.replaceChildren(t ? el('span.lila-t', { text: S().grenzeIn(dauerText(t - serverJetzt()), uhrzeit(t)) }) : el('span.klein', { text: S().grenzeStill }));
  };
  updK(); offen.live.push(updK);
  const grenze = box('kultur', S().grenzen, kb, kt, zeileEl('kultur', S().grenzKultur, '+' + z1(gr) + '/h', S().grenzKulturTip), zeileEl('karte', S().gebiet, String((s.gebiet || []).length), S().gebietTip), kz);

  // --- Zufriedenheit ---
  const zuf = r.zufriedenheit || 0;
  const zl = [[S().zuf.grund, 3]];
  const lux = Object.keys(d.raten.luxus || {}).length;
  if (lux) zl.push([S().zuf.luxus(lux), lux]);
  if (d.raten.boni?.zufriedenheit) zl.push([S().zuf.reich, d.raten.boni.zufriedenheit]);
  let gz = 0; for (const gid of s.gebaeude || []) gz += GEB[gid]?.wirkung?.zufriedenheit || 0;
  if (gz) zl.push([S().zuf.gebaeude, gz]);
  let wz = 0; for (const wid of wunderHier) wz += WUNDER_NACH_ID[wid]?.wirkung?.zufriedenheit || 0;
  if (wz) zl.push([S().zuf.wunder, wz]);
  const unz = stadtUnzufriedenheit(s.bev, eigeneStaedte().length);
  if (unz) zl.push([S().zuf.groesse, -unz]);
  const rest = zuf - zl.reduce((a, [, x]) => a + x, 0);
  if (Math.abs(rest) >= 1) zl.push([S().zuf.sonstiges, rest]);
  const zf = zufriedenheitsFaktor(zuf);
  const zufBox = box(zuf >= 0 ? 'zufriedenheit' : 'unzufrieden', S().zufriedenheit,
    el('div.st-zeile', el('b', { class: zuf >= 0 ? 'gruen-t' : 'rot-t', text: (zuf > 0 ? '+' : '') + zuf }), el('span.klein', { text: S().zufFaktor(Math.round((zf - 1) * 100)) })),
    el('table.tabelle.st-tab', zl.map(([t, x]) => el('tr', el('td.klein', { text: t }), el('td.z', { class: x >= 0 ? 'gruen-t' : 'rot-t', text: (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x) })))),
    zuf < 0 ? el('div.rot-t.klein', { style: { marginTop: '4px' }, text: S().zufNegativ }) : el('div.klein', { style: { marginTop: '4px' }, text: S().zufTipp }),
  );

  // --- Verteidigung ---
  const hpA = s.maxhp ? s.hp / s.maxhp : 1;
  const mauern = ['', 'stadtmauer_holz', 'stadtmauer_stein', 'festungsmauer', 'betonbunker'];
  const vert = box('schild', S().verteidigung,
    balken(hpA, hpA > 0.5 ? '' : hpA > 0.25 ? 'gold' : 'rot'),
    el('div.klein', { text: S().hp(s.hp, s.maxhp) }),
    zeileEl('staerke', S().staerke, String(s.staerke ?? '–'), S().staerkeTip),
    zeileEl('reichweite', S().reichweite, String(s.reichweite ?? 2), S().reichweiteTip),
    zeileEl('befestigen', S().mauer, s.mauer ? GEB[mauern[s.mauer]]?.name || String(s.mauer) : S().keineMauer),
    s.abkling_bis > jetzt ? zeileEl('zeit', S().stadtAngriffBereit, dauerText(s.abkling_bis - jetzt)) : null,
  );

  // --- Unterhalt ---
  let brutto = 0; for (const gid of s.gebaeude || []) brutto += GEB[gid]?.unterhalt || 0;
  const frei = freierGebaeudeUnterhalt(s.bev);
  const unterhalt = box('gold', S().unterhalt,
    zeileEl('lager', S().unterhaltBrutto, '−' + z1(brutto) + '/h'),
    zeileEl('plus', S().unterhaltFrei, '+' + z1(Math.min(brutto, frei)) + '/h', S().unterhaltFreiTip(z1(frei))),
    zeileEl('gold', S().unterhaltNetto, (r.unterhalt ? '−' + z1(r.unterhalt) : '0') + '/h', S().unterhaltNettoTip, r.unterhalt ? 'rot-t' : 'gruen-t'),
    el('div.klein', { style: { marginTop: '4px' }, text: S().unterhaltHinweis }),
  );

  // --- Bau kurz ---
  const bauKurz = box('bau', S().bauKurz);
  for (const b of s.bau || []) bauKurz.append(el('div.st-zeile', bauSymbol(b.art, b.id, 24), el('div', { style: { flex: 1, minWidth: 0 } }, el('div', { text: bauName(b) }), ...fortschritt(b.start, b.fertig_um))));
  if (!(s.bau || []).length) bauKurz.append(el('div.gold-t', { text: S().keinBau }));
  if ((s.schlange || []).length) bauKurz.append(el('div.klein', { text: S().inSchlange(s.schlange.length) }));
  bauKurz.append(el('button.knopf.gold', { style: { marginTop: '6px' }, onclick: () => { offen.reiter = 'bauen'; zeichne(); } }, symbol('ui', 'bau'), S().zumBauen));

  k.append(el('div.st-raster', ertragBox, wachstum, grenze, zufBox, bauKurz, vert, unterhalt));
}

// ---------- Bauen ----------
function bauen(s, k) {
  const z = offen;
  const links = el('div', platzListe(s), schlangeListe(s));
  z.listeEl = el('div');
  const steuer = el('div.st-steuer',
    ['alle', 'gebaeude', 'einheit', 'wunder'].map((g) => el('button.knopf.klein' + (z.filter === g ? '.gold' : ''), { onclick: () => { z.filter = g; zeichne(); } }, S().filter[g])),
    el('span', { style: { flex: 1 } }),
    el('label.st-chk', { tip: S().sortTip }, symbol('ui', 'menue'), (() => { const sel = el('select', { onchange: (e) => { z.sort = e.target.value; listeZeichnen(stadtVon(z.id)); } }, Object.entries(S().sortierung).map(([w, t]) => el('option', { value: w, text: t, selected: w === z.sort || null }))); return sel; })()),
    el('label.st-chk', { tip: S().alleTip }, (() => { const c = el('input', { type: 'checkbox', checked: z.alle || null, onchange: (e) => { z.alle = e.target.checked; z.liste = null; ladeListe(); } }); return c; })(), S().alleZeigen),
  );
  k.append(el('div.st-bau', links, el('div', steuer, z.listeEl)));
  if (z.liste && z.listeFuer === s.id) listeZeichnen(s); else ladeListe();
}

async function ladeListe(still) {
  const z = offen; if (!z) return;
  const id = z.id;
  if (!still && z.listeEl) z.listeEl.replaceChildren(el('div.klein', { text: S().lade }));
  z.listeZeit = Date.now();
  let l;
  try { l = (await frage({ art: 'bauliste', stadt: id, alle: z.alle || undefined })).liste; } catch (e) { if (z.listeEl) z.listeEl.replaceChildren(el('div.rot-t', { text: e.message })); return; }
  if (offen !== z || z.id !== id || z.reiter !== 'bauen') return;
  const neu = JSON.stringify(l);
  if (still && neu === JSON.stringify(z.liste)) return;
  z.liste = l; z.listeFuer = id;
  listeZeichnen(stadtVon(id));
}

function sortiere(l, art) {
  const so = offen.sort;
  const gold = (x) => x.kosten?.gold || 0;
  const za = (x) => bauDaten(x.art, x.id)?.zeitalter || 0;
  const name = (x) => bauDaten(x.art, x.id)?.name || x.id;
  const f = {
    standard: (a, b) => (!!a.grund - !!b.grund) || (!!a.fehlt - !!b.fehlt) || za(b) - za(a) || name(a).localeCompare(name(b), 'de'),
    name: (a, b) => name(a).localeCompare(name(b), 'de'),
    dauer: (a, b) => a.dauer - b.dauer,
    gold: (a, b) => gold(a) - gold(b),
    zeitalter: (a, b) => za(b) - za(a) || name(a).localeCompare(name(b), 'de'),
    staerke: (a, b) => (art === 'einheit' ? (EINHEIT[b.id]?.staerke || 0) - (EINHEIT[a.id]?.staerke || 0) : 0) || name(a).localeCompare(name(b), 'de'),
  }[so] || (() => 0);
  return l.slice().sort(f);
}

function listeZeichnen(s) {
  const z = offen; if (!z || !z.listeEl || !s) return;
  const l = (z.liste || []).filter((x) => !(x.art === 'gebaeude' && x.id === 'palast'));
  const teile = [];
  for (const art of ['gebaeude', 'einheit', 'wunder']) {
    if (z.filter !== 'alle' && z.filter !== art) continue;
    const g = sortiere(l.filter((x) => x.art === art), art);
    teile.push(el('div.st-gruppe', el('h3', { text: S().gruppe[art] + ' (' + g.length + ')' })));
    if (art === 'wunder') teile.push(el('div.st-hinweis', symbol('ui', 'wunder', { px: 20 }), el('span.klein', { text: S().wunderHinweis })));
    if (!g.length) teile.push(el('div.klein', { style: { marginBottom: '10px' }, text: S().nichtsBaubar[art] }));
    else teile.push(el('div.st-liste', g.map((x) => eintragEl(x, s))));
  }
  z.listeEl.replaceChildren(...teile);
}

function kurzInfo(x) {
  const d = bauDaten(x.art, x.id);
  if (!d) return '';
  if (x.art === 'einheit') {
    return el('div.st-ertr.klein',
      el('span', { tip: S().staerkeEinheitTip }, symbol('ui', 'staerke'), String(d.staerke)),
      d.fern ? el('span', { tip: S().fernTip }, symbol('ui', 'fernkampf'), String(d.fern)) : null,
      d.reichweite ? el('span', { tip: S().reichweiteEinheitTip }, symbol('ui', 'reichweite'), String(d.reichweite)) : null,
      d.tempo ? el('span', { tip: S().tempoTip }, symbol('ui', 'tempo'), String(d.tempo)) : null,
      d.unterhalt ? el('span', { tip: S().unterhaltEinheitTip }, symbol('ui', 'gold'), '−' + z1(d.unterhalt) + '/h') : null,
    );
  }
  const l = x.art === 'wunder' ? [...boniListe(d.reich), ...wirkungListe(d.wirkung)] : wirkungListe(d.wirkung);
  if (d.unterhalt) l.push(S().unterhaltKurz(z1(d.unterhalt)));
  return el('div.klein', { text: l.slice(0, 3).join(' · ') + (l.length > 3 ? ' …' : '') });
}

function eintragEl(x, s) {
  const d = bauDaten(x.art, x.id) || { name: x.id };
  const tipText = () => el('div', el('b', { text: d.name }), el('div', { text: d.beschreibung || '' }), x.art !== 'einheit' ? el('div.gruen-t', { text: (x.art === 'wunder' ? [...boniListe(d.reich), ...wirkungListe(d.wirkung)] : wirkungListe(d.wirkung)).join(', ') }) : null);
  return el('div.eintrag.st-eintrag' + (x.grund ? '.aus' : x.fehlt ? '.fehlt' : '') + (x.art === 'wunder' ? '.wunder' : ''), { onclick: () => bestellen(x, s), tip: tipText, role: 'button' },
    bauSymbol(x.art, x.id, x.art === 'wunder' ? 56 : 44),
    el('div.mitte',
      el('div.kopfz', el('b', { text: d.name }), el('span.klein', { style: { whiteSpace: 'nowrap' } }, symbol('ui', 'zeit'), ' ' + dauerText(x.dauer))),
      kurzInfo(x),
      kostenEl(x.kosten, x.fehlt),
      x.grund ? el('div.rot-t.klein', { text: x.grund }) : x.fehlt ? el('div.gold-t.klein', { text: S().fehltKurz }) : null,
    ),
  );
}

function fehltText(fehlt) { return Object.entries(fehlt || {}).map(([g, n]) => `${n} ${LAGER_NAMEN[g] || g}`).join(', '); }

async function senden(b, name) {
  const r = await befehl(b);
  if (!r.ok) { fehler(r.fehler); ton('fehler'); return false; }
  ton('klick');
  toast(b.vormerken ? S().vorgemerkt(name) : S().inAuftrag(name), 'erfolg', { symbol: 'bau' });
  if (offen) { offen.liste = null; if (offen.reiter === 'bauen') { offen.schl = ''; zeichne(); } }
  return true;
}

function bestellen(x, s) {
  const d = bauDaten(x.art, x.id);
  if (x.grund) { fehler(x.grund); ton('fehler'); return; }
  if (x.art === 'wunder') { wunderDialog(x, s); return; }
  const b = { art: 'bauen', stadt: s.id, typ: x.art, id: x.id };
  const sofort = (s.bau || []).length < (s.bauplaetze || 1) && !(s.schlange || []).length;
  if (x.fehlt && !sofort) return senden(b, d.name);
  if (x.fehlt) {
    const f = fenster(S().materialFehlt, (i) => i.append(
      el('div.st-zeile', bauSymbol(x.art, x.id, 44), el('b', { text: d.name })),
      el('p', { text: S().fehltLang(fehltText(x.fehlt)) }),
      kostenEl(x.kosten, x.fehlt),
      el('p.klein', { text: S().vormerkenText }),
    ), { breite: 'schmal', fuss: true });
    f.fuss.append(el('button.knopf', { text: T.abbrechen, onclick: () => f.schliessen() }), el('button.knopf.gold', { onclick: async () => { f.schliessen(); await senden({ ...b, vormerken: true }, d.name); } }, symbol('ui', 'uhr'), S().vormerken));
    return;
  }
  return senden(b, d.name);
}

function wunderDialog(x, s) {
  const d = WUNDER_NACH_ID[x.id];
  let geheim = false;
  const imBau = (Z.ansicht.welt?.im_bau || []).filter((w) => w.wunder === x.id && w.volk !== Z.volk);
  const f = fenster(d.name, (i) => i.append(...[
    el('div', { style: { display: 'flex', gap: '12px', alignItems: 'flex-start' } }, symbol('wunder', x.id, { px: 96 }), el('div',
      el('div.klein', { text: ZEITALTER[d.zeitalter]?.name || '' }),
      el('p', { style: { margin: '4px 0' }, text: d.beschreibung }),
      el('div.gruen-t', { text: [...boniListe(d.reich), ...wirkungListe(d.wirkung)].join(' · ') }),
    )),
    el('div.st-hinweis', symbol('ui', 'krone', { px: 20 }), el('span', { text: S().wunderEinmalig })),
    imBau.length ? el('div.st-hinweis', symbol('ui', 'warnung', { px: 20 }), el('span', { text: S().wunderKonkurrenz(imBau.map((w) => Z.ansicht.voelker[w.volk]?.name || '?').join(', ')) })) : null,
    el('div.st-zeile', symbol('ui', 'zeit'), S().dauer + ': ' + dauerText(x.dauer)),
    kostenEl(x.kosten, x.fehlt),
    x.fehlt ? el('p.gold-t', { text: S().fehltLang(fehltText(x.fehlt)) + ' ' + S().vormerkenText }) : null,
    el('label.st-chk', { tip: S().geheimTip }, el('input', { type: 'checkbox', onchange: (e) => { geheim = e.target.checked; } }), symbol('ui', 'auge_zu'), S().geheim),
    el('div.klein', { text: S().geheimText }),
  ].filter(Boolean)), { breite: 'schmal', fuss: true });
  f.fuss.append(el('button.knopf', { text: T.abbrechen, onclick: () => f.schliessen() }),
    el('button.knopf.gold', { onclick: async () => { f.schliessen(); await senden({ art: 'bauen', stadt: s.id, typ: 'wunder', id: x.id, geheim: geheim || undefined, vormerken: x.fehlt ? true : undefined }, d.name); } }, symbol('ui', x.fehlt ? 'uhr' : 'wunder'), x.fehlt ? S().vormerken : S().wunderBauen));
}

function platzListe(s) {
  const n = Math.max(s.bauplaetze || 1, (s.bau || []).length);
  const kinder = [el('h2', symbol('ui', 'bau'), S().bauplaetze((s.bau || []).length, n))];
  for (let k = 0; k < n; k++) {
    const b = (s.bau || [])[k];
    if (!b) { kinder.push(el('div.st-platz.frei', { text: (s.schlange || []).length ? S().platzWartet : S().platzFrei })); continue; }
    kinder.push(el('div.st-platz',
      bauSymbol(b.art, b.id, 40),
      el('div.mitte', el('div.name', bauName(b), b.geheim ? el('span.lila-t.klein', { text: ' (' + S().geheimKurz + ')' }) : null), ...fortschritt(b.start, b.fertig_um)),
      el('button.knopf.klein.rot', { tip: S().abbrechenTip, 'aria-label': S().abbrechen, onclick: async () => {
        if (!(await frageJaNein(S().abbrechenTitel, S().abbrechenFrage(bauName(b), Math.round(ABBRUCH_ERSTATTUNG * 100)), S().abbrechenJa, S().weiterbauen))) return;
        const r = await befehl({ art: 'bau_abbrechen', stadt: s.id, liste: 'bau', nr: k });
        if (!r.ok) fehler(r.fehler); else { ton('klick'); if (offen) offen.liste = null; }
      } }, symbol('ui', 'kreuz')),
    ));
  }
  kinder.push(el('div.klein', { text: S().abbruchHinweis(Math.round(ABBRUCH_ERSTATTUNG * 100)) }));
  return el('div.st-box', { style: { marginBottom: '10px' } }, ...kinder);
}

function schlangeListe(s) {
  const l = s.schlange || [];
  const kinder = [el('h2', symbol('ui', 'menue'), S().schlange(l.length))];
  if (!l.length) kinder.push(el('div.klein', { text: S().schlangeLeer }));
  if (l.length && s.warte_um) kinder.push(el('div.st-hinweis', symbol('ui', 'uhr', { px: 20 }), el('span.klein', { text: S().warteMaterial(uhrzeit(s.warte_um)) })));
  l.forEach((b, k) => {
    kinder.push(el('div.st-platz',
      el('span.st-nr', { text: String(k + 1) }),
      bauSymbol(b.art, b.id, 32),
      el('div.mitte', el('div.name', bauName(b)), b.geheim ? el('div.lila-t.klein', { text: S().geheimKurz }) : null),
      el('button.knopf.klein.st-hoch', { disabled: k === 0 || null, tip: S().hochTip, 'aria-label': S().hochTip, onclick: async () => { const r = await befehl({ art: 'bau_hoch', stadt: s.id, nr: k }); if (!r.ok) fehler(r.fehler); else ton('klick'); } }, symbol('ui', 'pfeil_links')),
      el('button.knopf.klein.rot', { tip: S().entfernenTip, 'aria-label': S().entfernenTip, onclick: async () => { const r = await befehl({ art: 'bau_abbrechen', stadt: s.id, liste: 'schlange', nr: k }); if (!r.ok) fehler(r.fehler); else { ton('klick'); if (offen) offen.liste = null; } } }, symbol('ui', 'kreuz')),
    ));
  });
  kinder.push(el('div.klein', { style: { marginTop: '4px' }, text: S().schlangeHinweis }));
  return el('div.st-box', ...kinder);
}

// ---------- Gebäude ----------
function gebaeude(s, k) {
  const l = (s.gebaeude || []).map((id) => GEB[id]).filter(Boolean);
  const wunderHier = Object.entries(Z.ansicht.wunder || {}).filter(([, w]) => w.stadt === s.id && w.fertig).map(([wid]) => WUNDER_NACH_ID[wid]).filter(Boolean);
  if (!l.length && !wunderHier.length) { k.append(el('p', { text: S().keineGebaeude })); return; }
  let unterhalt = 0; for (const d of l) unterhalt += d.unterhalt || 0;
  k.append(el('div.st-zeile', { style: { marginBottom: '6px' } }, el('span', { text: S().gebaeudeAnzahl(l.length) }), el('span.klein', { text: ' · ' + S().unterhaltSumme(z1(unterhalt)) })));
  const karte_ = (d, art) => el('div.eintrag', { tip: d.beschreibung || '' }, bauSymbol(art, d.id, art === 'wunder' ? 64 : 48), el('div', { style: { flex: 1, minWidth: 0 } },
    el('div.st-zeile', el('b', { text: d.name }), el('span.klein', { style: { marginLeft: 'auto', whiteSpace: 'nowrap' }, text: art === 'wunder' ? S().gruppe.wunder : S().kategorie[d.kategorie] || '' })),
    el('ul', [...(art === 'wunder' ? boniListe(d.reich).map((t) => t + ' ' + S().imReich) : []), ...wirkungListe(d.wirkung)].map((t) => el('li', { text: t }))),
    d.unterhalt ? el('div.klein', { text: S().unterhaltKurz(z1(d.unterhalt)) + ' Gold' }) : null,
  ));
  const kn = (d) => S().kategorie[d.kategorie] || d.kategorie || '';
  l.sort((a, b) => kn(a).localeCompare(kn(b), 'de') || a.zeitalter - b.zeitalter || a.name.localeCompare(b.name, 'de'));
  k.append(el('div.st-geb', wunderHier.map((d) => karte_(d, 'wunder')), l.map((d) => karte_(d, 'gebaeude'))));
  k.append(el('p.klein', { text: S().gebaeudeHinweis }));
}

// ---------- Felder ----------
const RH = 28, WH = Math.sqrt(3) * RH;
function hexFuellen(ctx, cx, cy, R, farbe) {
  ctx.fillStyle = farbe;
  const hw = Math.sqrt(3) / 2 * R;
  for (let dy = -R; dy < R; dy++) {
    const a = Math.abs(dy + 0.5);
    const w = a <= R / 2 ? hw : hw * (R - a) / (R / 2);
    const x0 = Math.round(cx - w), x1 = Math.round(cx + w);
    if (x1 > x0) ctx.fillRect(x0, cy + dy, x1 - x0, 1);
  }
}
function zeichneSprite(ctx, kat, id, x, y, o = {}) { const c = sprite(kat, id, o); if (c) ctx.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height / 2)); return c; }

function ertragZeile(e) {
  return el('span.st-ertr', ERTRAEGE.filter((x) => e[x] || x === 'n' || x === 'p' || x === 'g').map((x) => el('span', symbol('ui', ERTRAG_SYM[x]), z1(e[x] * FAK[x]))), Object.entries(e.material || {}).filter(([, y]) => y).map(([g, y]) => el('span', symbol('ui', g), z1(y * F))));
}

function feldInfoEl(s, i) {
  const k = karte(), g = GELAENDE[k.gelaende[i]];
  if (!erkundet(i)) return el('div', el('b', { text: S().unerforscht }));
  const f = feldInfo(i) || {};
  const r = rohstoffAuf(i);
  const zentrum = i === s.feld;
  const e = zentrum ? zentrumErtrag(s) : feldErtrag(i);
  const status = zentrum ? S().feldZentrum : !(s.gebiet || []).includes(i) ? S().feldAussen : abstand(s.feld, i) > STADT_RADIUS_ARBEIT ? S().feldZuWeit : (s.arbeit || []).includes(i) ? S().feldBewirtschaftet : S().feldFrei;
  return el('div',
    el('div.st-zeile', el('b', { text: g.name + (k.fluss[i] && !g.wasser ? ' · ' + S().fluss : '') })),
    el('div', ertragZeile(e)),
    el('div.klein', { text: S().proStunde }),
    r ? el('div.st-zeile', symbol('rohstoff', r.id), el('span', { text: r.name + (erschlossen(i, r) ? '' : ' ' + S().nichtErschlossen) })) : null,
    r && r.liefert && erschlossen(i, r) ? el('div.klein', { text: S().liefert(Object.entries(r.liefert).map(([gg, n]) => `${n * (['holz', 'stein', 'marmor', 'lehm', 'salz'].includes(gg) ? F : 1)} ${LAGER_NAMEN[gg] || gg}/h`).join(', ')) }) : null,
    f.v ? el('div.st-zeile', symbol('ui', 'arbeiten'), el('span', { text: (VERBESSERUNG[f.v]?.name || f.v) + (f.pl > serverJetzt() ? ' ' + S().gepluendert : '') })) : null,
    f.w ? el('div.st-zeile', symbol('ui', 'bewegen'), el('span', { text: VERBESSERUNG[f.w]?.name || f.w })) : null,
    el('div.klein', { class: (s.arbeit || []).includes(i) ? 'gold-t' : '', text: status }),
  );
}

function felder(s, k) {
  const z = offen;
  const kk = karte();
  const gebiet = new Set(s.gebiet || []);
  const arbeit = new Set(s.arbeit || []);
  let rad = STADT_RADIUS_ARBEIT; for (const i of gebiet) rad = Math.max(rad, abstand(s.feld, i)); rad = Math.min(rad, 5);
  const liste = umkreis(s.feld, rad);
  const pos = (i) => [WH * (xVon(i) + 0.5 * (yVon(i) & 1)), 1.5 * RH * yVon(i)];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const i of liste) { const [x, y] = pos(i); minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  const rand = 4;
  const cw = Math.ceil(maxX - minX + WH + 2 * rand), ch = Math.ceil(maxY - minY + 2 * RH + 2 * rand);
  const mitte = (i) => { const [x, y] = pos(i); return [Math.round(x - minX + WH / 2 + rand), Math.round(y - minY + RH + rand)]; };
  const cv = el('canvas', { width: cw, height: ch });
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const jetzt = serverJetzt();
  // Gelände
  for (const i of liste) {
    const [cx, cy] = mitte(i);
    if (!erkundet(i)) { hexFuellen(ctx, cx, cy, RH - 1, '#05060a'); continue; }
    const g = GELAENDE[kk.gelaende[i]];
    hexFuellen(ctx, cx, cy, RH - 1, g.seite || '#000');
    hexFuellen(ctx, cx, cy, RH - 3, g.farben[i % g.farben.length]);
  }
  // Inhalt
  for (const i of liste) {
    if (!erkundet(i)) continue;
    const [cx, cy] = mitte(i);
    const g = GELAENDE[kk.gelaende[i]];
    const f = feldInfo(i) || {};
    if (i === s.feld) { zeichneSprite(ctx, 'stadt', 'stadt', cx, cy - 4, { farbe: du()?.farbe, zeitalter: s.zeitalter || 0, groesse: s.bev >= 12 ? 3 : s.bev >= 6 ? 2 : 1 }); continue; }
    if (f.v && !(f.pl > jetzt)) zeichneSprite(ctx, 'verbesserung', f.v, cx, cy + 2, { farbe: du()?.farbe });
    else zeichneSprite(ctx, 'deko', g.id, cx, cy, { variante: i % 4 });
    if (kk.fluss[i] && !g.wasser) { ctx.fillStyle = '#58a6e0'; ctx.fillRect(cx - 14, cy + RH - 8, 28, 2); }
    const r = rohstoffAuf(i);
    if (r) { ctx.fillStyle = 'rgba(11,13,20,.75)'; ctx.fillRect(cx + 4, cy + 4, 18, 18); zeichneSprite(ctx, 'rohstoff', r.id, cx + 13, cy + 13); }
  }
  // Abdunkeln außerhalb, Rahmen für bewirtschaftete Felder
  for (const i of liste) {
    const [cx, cy] = mitte(i);
    if (!gebiet.has(i) && i !== s.feld) { ctx.globalAlpha = 0.6; hexFuellen(ctx, cx, cy, RH - 1, '#05060a'); ctx.globalAlpha = 1; }
    else if (abstand(s.feld, i) > STADT_RADIUS_ARBEIT) { ctx.globalAlpha = 0.3; hexFuellen(ctx, cx, cy, RH - 1, '#05060a'); ctx.globalAlpha = 1; }
  }
  for (const i of arbeit) {
    if (!liste.includes(i)) continue;
    const [cx, cy] = mitte(i);
    // goldener Rahmen: äußerer Ring
    const tmp = document.createElement('canvas'); tmp.width = cw; tmp.height = ch;
    const t = tmp.getContext('2d');
    hexFuellen(t, cx, cy, RH - 1, '#f1c40f');
    t.globalCompositeOperation = 'destination-out'; hexFuellen(t, cx, cy, RH - 4, '#000');
    ctx.drawImage(tmp, 0, 0);
    ctx.fillStyle = 'rgba(11,13,20,.8)'; ctx.fillRect(cx - 9, cy - RH + 4, 18, 18);
    zeichneSprite(ctx, 'ui', 'bevoelkerung', cx, cy - RH + 13);
  }
  // Skalierung passend zum Platz
  const platzB = Math.max(300, Math.min(window.innerWidth - 60, 1600) - 320), platzH = Math.max(260, window.innerHeight - 200);
  let sk = 1;
  for (const v of [2, 1.5, 1.25, 1, 0.85, 0.7, 0.6]) { sk = v; if (cw * v <= platzB && ch * v <= platzH) break; }
  cv.style.width = Math.round(cw * sk) + 'px'; cv.style.height = Math.round(ch * sk) + 'px';
  const wrap = el('div.st-karte', cv);
  const info = el('div.st-box');
  const zeigeInfo = (i) => info.replaceChildren(el('h2', symbol('ui', 'karte'), S().feldInfo), feldInfoEl(s, i));
  for (const i of liste) {
    const [cx, cy] = mitte(i);
    const nutzbar = gebiet.has(i) && i !== s.feld && abstand(s.feld, i) <= STADT_RADIUS_ARBEIT && erkundet(i);
    const b = el('button.st-hex' + (nutzbar ? '' : '.tot') + (z.feld === i ? '.gewaehlt' : ''), {
      style: { left: Math.round((cx - WH / 2) * sk) + 'px', top: Math.round((cy - RH) * sk) + 'px', width: Math.round(WH * sk) + 'px', height: Math.round(2 * RH * sk) + 'px' },
      'aria-label': GELAENDE[kk.gelaende[i]].name,
      'data-feld': i,
      tip: () => feldInfoEl(s, i),
      onclick: async () => {
        z.feld = i;
        wrap.querySelectorAll('.st-hex.gewaehlt').forEach((x) => x.classList.remove('gewaehlt'));
        b.classList.add('gewaehlt');
        zeigeInfo(i);
        if (i === s.feld || !erkundet(i)) return;
        if (!gebiet.has(i)) { fehler(S().feldNichtImGebiet); return; }
        if (abstand(s.feld, i) > STADT_RADIUS_ARBEIT) { fehler(S().feldZuWeitFehler(STADT_RADIUS_ARBEIT)); return; }
        const r = await befehl({ art: 'feld_bewirtschaften', stadt: s.id, feld: i, an: !arbeit.has(i) });
        if (!r.ok) { fehler(r.fehler); ton('fehler'); } else ton('klick');
      },
    });
    b.addEventListener('pointerenter', (ev) => { if (ev.pointerType === 'mouse') zeigeInfo(i); });
    wrap.append(b);
  }
  wrap.addEventListener('pointerleave', () => zeigeInfo(z.feld ?? s.feld));
  zeigeInfo(z.feld ?? s.feld);
  const seite = el('div.st-seite',
    el('div.st-box',
      el('h2', symbol('ui', 'bevoelkerung'), S().bewirtschaftung),
      el('div.st-zeile', el('span', { text: S().arbeiter(arbeit.size, s.bev) })),
      el('div.klein', { text: s.manuell ? S().manuell : S().automatisch }),
      el('p.klein', { text: S().felderHilfe(STADT_RADIUS_ARBEIT) }),
      el('button.knopf' + (s.manuell ? '.gold' : ''), { onclick: async () => { const r = await befehl({ art: 'auto_bewirtschaften', stadt: s.id }); if (!r.ok) fehler(r.fehler); else { ton('klick'); toast(S().autoGesetzt, 'erfolg'); } }, tip: S().autoTip }, symbol('ui', 'haken'), S().auto),
    ),
    info,
    el('div.st-box', el('h2', symbol('ui', 'hilfe'), S().legende), el('div.st-legende',
      el('i', { style: { borderColor: '#f1c40f', background: 'transparent' } }), el('span', { text: S().legBewirtschaftet }),
      el('i', { style: { background: '#4a8c44' } }), el('span', { text: S().legNutzbar }),
      el('i', { style: { background: '#2e4a2c' } }), el('span', { text: S().legZuWeit(STADT_RADIUS_ARBEIT) }),
      el('i', { style: { background: '#1a2218' } }), el('span', { text: S().legAussen }),
      symbol('rohstoff', 'weizen'), el('span', { text: S().legRohstoff }),
    )),
  );
  k.append(el('div.st-felder', wrap, seite));
}

// ---------- Umbenennen ----------
function umbenennen() {
  const s = stadtVon(offen?.id); if (!s) return;
  const inp = el('input', { type: 'text', value: s.name, maxlength: 24 });
  const f = fenster(S().umbenennenTitel, (i) => i.append(el('div.formzeile', el('label', { text: S().neuerName }), inp)), { breite: 'schmal', fuss: true });
  const ok = async () => {
    const name = inp.value.trim();
    if (!name || name === s.name) { f.schliessen(); return; }
    const r = await befehl({ art: 'stadt_umbenennen', stadt: s.id, name });
    if (!r.ok) { fehler(r.fehler); return; }
    f.schliessen(); toast(S().umbenannt(name), 'erfolg');
  };
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
  f.fuss.append(el('button.knopf', { text: T.abbrechen, onclick: () => f.schliessen() }), el('button.knopf.gold', { text: T.ok, onclick: ok }));
  setTimeout(() => { inp.focus(); inp.select(); }, 30);
}
