// Lexikon: automatisch aus den Spieldaten erzeugte Enzyklopädie (Einheiten, Gebäude, Wunder, Forschungen, Rohstoffe,
// Gelände, Verbesserungen, Beförderungen, Zeitalter, Akteure) plus handgeschriebene Regeln. Suche, Querverweise, große Sprites.
import { el, symbol, fenster, zahl, dauerText } from './basis.js';
import { T } from '../texte.js';
import { Z, du, volk } from '../kern/zustand.js';
import {
  EINHEITEN, EINHEIT, GEBAEUDE, GEB, WUNDER, WUNDER_NACH_ID, FORSCHUNGEN, FORSCHUNG, ROHSTOFFE, ROHSTOFF, VERBESSERUNGEN, VERBESSERUNG,
  GELAENDE, GELAENDE_ID, BEFOERDERUNGEN, BEFOERDERUNG, ZEITALTER, KI_VOELKER, STADTSTAATEN, BARBARENLAGER, FREIGESCHALTET_DURCH, NACHFOLGER,
} from '../../shared/daten/index.js';
import { FLUSS } from '../../shared/daten/gelaende.js';
import { LAGER_NAMEN } from '../../shared/daten/rohstoffe.js';
import * as R from '../../shared/regeln.js';
import * as F from './fenster.js';

const L = T.lexikon;
const REIHENFOLGE = ['regel', 'einheit', 'gebaeude', 'wunder', 'forschung', 'rohstoff', 'gelaende', 'verbesserung', 'befoerderung', 'zeitalter', 'akteur'];
const KAT_SYM = { regel: ['ui', 'lexikon'], einheit: ['einheit', 'krieger'], gebaeude: ['gebaeude', 'bibliothek'], wunder: ['ui', 'wunder'], forschung: ['ui', 'forschung'], rohstoff: ['rohstoff', 'eisen'], gelaende: ['deko', 'wald'], verbesserung: ['verbesserung', 'farm'], befoerderung: ['ui', 'befoerderung'], zeitalter: ['ui', 'zeitalter'], akteur: ['ui', 'diplomatie'] };

const CSS = `
.lex-fenster > .inhalt { padding: 0 !important; overflow: hidden !important; display: flex; }
.lex { display: grid; grid-template-columns: 236px 1fr; flex: 1; min-height: 0; width: 100%; }
.lex-seite { background: var(--panel2); border-right: 3px solid var(--rand); display: flex; flex-direction: column; min-height: 0; }
.lex-suche { margin: 8px; background: #0e1119; color: var(--text); border: 2px solid var(--rand); box-shadow: inset 2px 2px 0 #000; padding: 9px; min-height: 40px; }
.lex-kats { overflow: auto; flex: 1; padding: 0 6px 8px; display: flex; flex-direction: column; gap: 3px; }
.lex-kat { display: flex; align-items: center; gap: 8px; padding: 6px 8px; min-height: 40px; cursor: pointer; border: 2px solid transparent; background: none; color: var(--text); text-align: left; font-family: var(--schrift); font-size: 15px; }
.lex-kat:hover { background: #283048; }
.lex-kat.an { background: #3a4561; border-color: var(--rand); box-shadow: inset 2px 2px 0 #56638a; }
.lex-kat .n { margin-left: auto; font-size: 11px; color: var(--text2); }
.lex-kat canvas { width: 24px; height: 24px; object-fit: contain; flex: none; }
.lex-haupt { display: flex; flex-direction: column; min-height: 0; min-width: 0; }
.lex-leiste { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-bottom: 2px solid var(--rand); min-height: 48px; }
.lex-pfad { font-size: 13px; color: var(--text2); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.lex-pfad a { color: var(--blau); cursor: pointer; }
.lex-inhalt { overflow: auto; padding: 12px 16px 24px; flex: 1; -webkit-user-select: text; user-select: text; }
.lex-ref { color: #8cc4ff; cursor: pointer; text-decoration: underline; text-decoration-color: rgba(140,196,255,.4); text-underline-offset: 2px; }
.lex-ref:hover { color: #c2e0ff; }
.lex-kopf { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; }
.lex-kopf h2 { overflow-wrap: anywhere; }
.lex-bild { flex: none; width: 152px; height: 152px; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at 50% 60%, #2e3a52, #161a26); border: 3px solid var(--rand); box-shadow: inset 2px 2px 0 var(--hell), inset -2px -2px 0 #10131c; }
.lex-bild canvas { image-rendering: pixelated; }
.lex-kopf h2 { font-size: 24px; margin: 0 0 4px; }
.lex-kopf .unter { color: var(--text2); font-size: 13px; margin-bottom: 8px; }
.lex-kopf .beschr { font-size: 16px; line-height: 1.45; max-width: 640px; }
.lex-werte { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 12px; }
.lex-wert { background: var(--panel2); border: 2px solid var(--rand); padding: 6px 10px; display: flex; gap: 8px; align-items: center; min-width: 108px; }
.lex-wert canvas { width: 20px; height: 20px; }
.lex-wert b { font-family: var(--kopf); font-size: 16px; }
.lex-wert .klein { display: block; }
.lex-abschnitt { margin: 14px 0 6px; }
.lex-abschnitt h3 { margin: 0 0 6px; font-size: 13px; color: var(--akzent); text-transform: uppercase; }
.lex-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.lex-chip { display: inline-flex; align-items: center; gap: 6px; background: var(--panel2); border: 2px solid var(--rand); padding: 3px 8px 3px 4px; min-height: 34px; cursor: pointer; color: var(--text); font-size: 14px; }
.lex-chip:hover { background: #2c3550; }
.lex-chip.aktuell { border-color: var(--akzent); }
.lex-chip canvas { width: 24px; height: 24px; object-fit: contain; }
.lex-chip.text { cursor: default; padding-left: 8px; }
.lex-pfeil { color: var(--text2); align-self: center; }
.lex-liste { margin: 0; padding-left: 20px; line-height: 1.6; }
.lex-absatz { font-size: 16px; line-height: 1.55; margin: 0 0 12px; max-width: 760px; }
.lex-gruppe { margin: 14px 0 6px; color: var(--akzent); font-family: var(--kopf); font-size: 13px; text-transform: uppercase; }
.lex-karten { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 6px; }
.lex-karten .eintrag { align-items: center; min-height: 54px; }
.lex-karten .eintrag canvas { width: 40px; height: 40px; object-fit: contain; }
.lex-karten .eintrag .klein { margin-top: 2px; }
.lex-start-kats { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; margin: 12px 0; }
.lex-start-kats .eintrag { flex-direction: column; align-items: center; text-align: center; padding: 12px 8px; }
.lex-start-kats canvas { width: 48px; height: 48px; object-fit: contain; }
.lex-status { display: inline-block; padding: 3px 8px; border: 2px solid var(--rand); font-size: 13px; margin: 0 0 8px; }
.lex-farbe { display: inline-block; width: 14px; height: 14px; border: 2px solid var(--rand); vertical-align: -2px; margin-right: 6px; }
.lex-tab td { padding: 4px 8px 4px 0; vertical-align: top; }
.lex-tab td:first-child { color: var(--text2); white-space: nowrap; }
@media (max-width: 760px) {
  .lex { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
  .lex-seite { border-right: 0; border-bottom: 3px solid var(--rand); }
  .lex-kats { flex-direction: row; overflow-x: auto; overflow-y: hidden; padding-bottom: 6px; }
  .lex-kat { flex: none; }
  .lex-kat .n { display: none; }
  .lex-bild { width: 112px; height: 112px; }
}`;

function stil() { if (!document.getElementById('lex-stil')) document.head.append(el('style#lex-stil', { text: CSS })); }

// ---------- kleine Helfer ----------
const farbe = () => du()?.farbe || '#3a7bd5';
const dz = (x) => String(x).replace('.', ',');
const zName = (z) => ZEITALTER[z]?.name || '';

function bild(art, id, px) {
  switch (art) {
    case 'einheit': return symbol('einheit', id, { farbe: farbe(), px });
    case 'gebaeude': return symbol('gebaeude', id, { farbe: farbe(), px });
    case 'wunder': return symbol('wunder', id, { px });
    case 'forschung': { const f = FORSCHUNG[id]; return symbol('zweig', f?.zweig || 'wissen', { px }); }
    case 'rohstoff': return symbol('rohstoff', id, { px });
    case 'gelaende': return id === 'fluss' ? symbol('ui', 'see', { px }) : symbol('deko', id, { px, variante: 0 });
    case 'verbesserung': return symbol('verbesserung', id, { farbe: farbe(), px });
    case 'befoerderung': return symbol('ui', 'befoerderung', { px });
    case 'zeitalter': { const i = ZEITALTER.findIndex((z) => z.id === id); return symbol('stadt', 'stadt', { zeitalter: Math.max(0, i), groesse: 2, farbe: farbe(), px }); }
    case 'akteur': return akteurBild(id, px);
    case 'regel': { const r = L.regeln.find((x) => x.id === id); const s = r?.sym || 'lexikon'; return Array.isArray(s) ? symbol(s[0], s[1], { px }) : symbol('ui', s, { px }); }
    case 'kat': { const [k, i] = KAT_SYM[id] || ['ui', 'lexikon']; return symbol(k, i, { px, farbe: farbe() }); }
  }
  return symbol('ui', 'lexikon', { px });
}

function akteurBild(id, px) {
  const ki = KI_VOELKER.find((x) => x.id === id); if (ki) return symbol('stadt', 'stadt', { farbe: ki.farbe, zeitalter: 2, groesse: 2, px });
  const ss = STADTSTAATEN.find((x) => x.id === id); if (ss) return symbol('stadt', 'stadtstaat', { farbe: ss.farbe, px });
  const b = BARBARENLAGER.find((x) => x.id === id); if (b) { const e = b.einheiten_je_zeitalter[0]?.[0] || 'krieger'; return symbol('einheit', e, { farbe: '#5a3a2a', px }); }
  if (id.startsWith('tier_')) return symbol('tier', id.slice(5), { px });
  return symbol('ui', 'diplomatie', { px });
}

function name(art, id) {
  switch (art) {
    case 'einheit': return EINHEIT[id]?.name;
    case 'gebaeude': return GEB[id]?.name;
    case 'wunder': return WUNDER_NACH_ID[id]?.name;
    case 'forschung': return FORSCHUNG[id]?.name;
    case 'rohstoff': return ROHSTOFF[id]?.name;
    case 'gelaende': return id === 'fluss' ? L.fluss : GELAENDE_ID[id]?.name;
    case 'verbesserung': return VERBESSERUNG[id]?.name;
    case 'befoerderung': return BEFOERDERUNG[id]?.name;
    case 'zeitalter': return ZEITALTER.find((z) => z.id === id)?.name;
    case 'akteur': return akteurDaten(id)?.name;
    case 'regel': return L.regeln.find((r) => r.id === id)?.titel;
    case 'kat': return L.kategorien[id];
  }
  return null;
}
function akteurDaten(id) {
  if (id.startsWith('tier_')) { const t = L.tiere[id.slice(5)]; return t ? { ...t, art: 'tier' } : null; }
  const ki = KI_VOELKER.find((x) => x.id === id); if (ki) return { ...ki, art: 'ki' };
  const ss = STADTSTAATEN.find((x) => x.id === id); if (ss) return { ...ss, art: 'stadtstaat' };
  const b = BARBARENLAGER.find((x) => x.id === id); if (b) return { ...b, art: 'barbar' };
  return null;
}

/** Anklickbarer Querverweis. */
function ref(art, id, text) {
  const n = text || name(art, id);
  if (!n) return el('span', { text: text || id });
  return el('a.lex-ref', { onclick: (e) => { e.stopPropagation(); gehe(art, id); }, text: n });
}
/** Verweis als Kärtchen mit kleinem Bild. */
function chip(art, id, o = {}) {
  const n = name(art, id);
  if (!n) return el('span.lex-chip.text', { text: id });
  return el('button.lex-chip' + (o.aktuell ? '.aktuell' : ''), { onclick: () => gehe(art, id), tip: o.tip }, bild(art, id, 24), el('span', { text: n + (o.zusatz || '') }));
}
const chips = (liste) => el('div.lex-chips', liste);
function abschnitt(titel, ...inhalt) { const k = inhalt.flat().filter((x) => x != null && x !== false); if (!k.length) return null; return el('div.lex-abschnitt', el('h3', { text: titel }), ...k); }
function wert(sym, zahlText, beschr) { return el('div.lex-wert', symbol('ui', sym), el('div', el('b', { text: zahlText }), el('span.klein', { text: beschr }))); }

/** Wandelt [[art:id|Text]] und **fett** in Knoten um. */
function markup(text) {
  const out = [];
  const re = /\[\[([a-z]+):([a-z0-9_]+)(?:\|([^\]]+))?\]\]|\*\*([^*]+)\*\*/g;
  let i = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > i) out.push(text.slice(i, m.index));
    if (m[4]) out.push(el('b', { text: m[4] }));
    else out.push(ref(m[1], m[2], m[3]));
    i = re.lastIndex;
  }
  if (i < text.length) out.push(text.slice(i));
  return out;
}

/** Absatz; beginnt er mit "•", wird daraus eine Aufzählung. */
function absatz(t) {
  if (!t.trim().startsWith('•')) return el('p.lex-absatz', markup(t));
  return el('ul.lex-liste.lex-absatz', t.split('•').map((x) => x.trim()).filter(Boolean).map((x) => el('li', markup(x))));
}

function kostenChips(k) {
  const teile = [];
  for (const [gut, n] of Object.entries(k || {})) {
    if (gut === 'zeit' || !n) continue;
    const r = ROHSTOFF[gut];
    teile.push(el(r ? 'button.lex-chip' : 'span.lex-chip.text', { onclick: r ? () => gehe('rohstoff', gut) : null }, symbol('ui', gut, { px: 20 }), el('b', { text: zahl(n) }), el('span', { text: LAGER_NAMEN[gut] || gut })));
  }
  if (k?.zeit) teile.push(el('span.lex-chip.text', symbol('ui', 'zeit', { px: 20 }), el('span', { text: dauerText(k.zeit * 1000) })));
  return teile.length ? chips(teile) : el('div', { text: L.keine });
}
function freiDurch(art, id) {
  const f = FREIGESCHALTET_DURCH[art + ':' + id];
  if (!f) return el('div', { text: L.freiStart });
  return chips([chip('forschung', f, { zusatz: ' · ' + zName(FORSCHUNG[f].zeitalter) })]);
}
function wirkungListe(w) {
  const z = [];
  for (const [k, v] of Object.entries(w || {})) {
    if (k === 'pro_einwohner') { for (const [kk, vv] of Object.entries(v)) z.push(`+${dz(vv)} ${L.proEinwohner[kk] || kk} je Einwohner`); continue; }
    if (k === 'material') { for (const [kk, vv] of Object.entries(v)) z.push(`+${dz(vv)} ${LAGER_NAMEN[kk] || kk} pro Stunde ins Reichslager`); continue; }
    const f = L.wirkungText[k] || L.bonusText[k];
    z.push(f ? f(dz(v)) : `${k}: ${v}`);
  }
  return z.length ? el('ul.lex-liste', z.map((t) => el('li', { text: t }))) : null;
}
function bonusListe(b) {
  const z = Object.entries(b || {}).map(([k, v]) => (L.bonusText[k] ? L.bonusText[k](dz(v)) : `${k}: ${v}`));
  return z.length ? el('ul.lex-liste', z.map((t) => el('li', { text: t }))) : null;
}
function ertragText(e) { return Object.entries(e || {}).filter(([, v]) => v).map(([k, v]) => `${v > 0 ? '+' : ''}${dz(v)} ${L.ertragNamen[k] || k}`).join(', '); }
function ertragWerte(e) {
  const sym = { n: 'nahrung', p: 'produktion', g: 'gold', w: 'wissenschaft', k: 'kultur' };
  return Object.entries(e || {}).filter(([, v]) => v).map(([k, v]) => wert(sym[k] || 'plus', (v > 0 ? '+' : '') + dz(v), L.ertragNamen[k] || k));
}
function kopf(art, id, titel, unter, beschr, o = {}) {
  return el('div.lex-kopf', el('div.lex-bild', bild(art, id, o.px || 128)), el('div', { style: { flex: '1', minWidth: '240px' } }, el('h2', { text: titel }), unter ? el('div.unter', { text: unter }) : null, o.status || null, beschr ? el('div.beschr', markup(beschr)) : null));
}
function kette(liste, art, aktuell) {
  if (liste.length < 2) return null;
  const k = [];
  liste.forEach((x, i) => { if (i) k.push(el('span.lex-pfeil', { text: '→' })); k.push(chip(art, x.id, { aktuell: x.id === aktuell })); });
  return chips(k);
}

// ---------- Kategorien: Listen ----------
function eintraege(kat) {
  switch (kat) {
    case 'regel': return L.regeln.map((r) => ({ id: r.id, name: r.titel, kurz: '', text: r.absaetze(R).join(' ') }));
    case 'einheit': return EINHEITEN.map((e) => ({ id: e.id, name: e.name, gruppe: zName(e.zeitalter), kurz: `${L.klassen[e.klasse] || e.klasse} · ${L.staerke} ${e.staerke}${e.fern ? ' · ' + L.fern + ' ' + e.fern : ''}`, text: e.beschreibung }));
    case 'gebaeude': return GEBAEUDE.map((g) => ({ id: g.id, name: g.name, gruppe: zName(g.zeitalter), kurz: L.gebKategorien[g.kategorie] || '', text: g.beschreibung }));
    case 'wunder': return WUNDER.map((w) => ({ id: w.id, name: w.name, gruppe: zName(w.zeitalter), kurz: zName(w.zeitalter), text: w.beschreibung }));
    case 'forschung': return FORSCHUNGEN.map((f) => ({ id: f.id, name: f.name, gruppe: zName(f.zeitalter), kurz: `${L.zweige[f.zweig] || f.zweig} · ${dauerText(f.dauer * 1000)}`, text: f.beschreibung }));
    case 'rohstoff': return ROHSTOFFE.map((r) => ({ id: r.id, name: r.name, gruppe: L.rohstoffArten[r.art], kurz: r.zweck, text: r.zweck }));
    case 'gelaende': return [...GELAENDE.map((g) => ({ id: g.id, name: g.name, gruppe: g.wasser ? 'Wasser' : 'Land', kurz: g.beschreibung, text: g.beschreibung })), { id: 'fluss', name: L.fluss, gruppe: 'Land', kurz: FLUSS.beschreibung, text: FLUSS.beschreibung }];
    case 'verbesserung': return VERBESSERUNGEN.map((v) => ({ id: v.id, name: v.name, gruppe: v.schicht === 'weg' ? 'Wege' : v.verteidigung || v.sicht ? 'Militär' : 'Felder', kurz: v.beschreibung, text: v.beschreibung }));
    case 'befoerderung': return BEFOERDERUNGEN.map((b) => ({ id: b.id, name: b.name, gruppe: b.klassen.slice(0, 2).map((k) => L.klassen[k]).join(', ') + (b.klassen.length > 2 ? ' …' : ''), kurz: b.beschreibung, text: b.beschreibung }));
    case 'zeitalter': return ZEITALTER.map((z) => ({ id: z.id, name: z.name, kurz: z.beschreibung, text: z.beschreibung }));
    case 'akteur': return [
      ...KI_VOELKER.map((x) => ({ id: x.id, name: x.name, gruppe: L.ki, kurz: L.persoenlichkeiten[x.persoenlichkeit] + ' · ' + x.herrscher, text: x.beschreibung })),
      ...STADTSTAATEN.map((x) => ({ id: x.id, name: x.name, gruppe: L.stadtstaaten, kurz: L.schwerpunkte[x.schwerpunkt], text: x.beschreibung })),
      ...BARBARENLAGER.map((x) => ({ id: x.id, name: x.name, gruppe: L.barbaren, kurz: x.beschreibung, text: x.beschreibung })),
      ...Object.entries(L.tiere).map(([id, t]) => ({ id: 'tier_' + id, name: t.name, gruppe: L.raubtiere, kurz: t.wo, text: t.wo })),
    ];
  }
  return [];
}
const cache = {};
const alle = (kat) => (cache[kat] ||= eintraege(kat));

function listeAnsicht(kat) {
  const l = alle(kat);
  const box = el('div');
  box.append(el('p.lex-absatz', { text: L.kategorieText[kat] }));
  let gruppe = null, karten = null;
  for (const x of l) {
    if (x.gruppe !== gruppe || !karten) { gruppe = x.gruppe; if (gruppe) box.append(el('div.lex-gruppe', { text: gruppe })); karten = el('div.lex-karten'); box.append(karten); }
    karten.append(karte(kat, x));
  }
  return box;
}
function karte(kat, x) {
  return el('div.eintrag', { onclick: () => gehe(kat, x.id) }, bild(kat, x.id, 40), el('div', { style: { minWidth: 0 } }, el('b', { text: x.name }), x.kurz ? el('div.klein', { text: x.kurz.length > 90 ? x.kurz.slice(0, 88) + '…' : x.kurz }) : null));
}

function suchAnsicht(q) {
  const s = q.toLowerCase().trim();
  const box = el('div');
  let n = 0;
  for (const kat of REIHENFOLGE) {
    const l = alle(kat);
    const treffer = l.filter((x) => x.name.toLowerCase().includes(s)).concat(l.filter((x) => !x.name.toLowerCase().includes(s) && ((x.kurz || '') + ' ' + (x.text || '')).toLowerCase().includes(s)));
    if (!treffer.length) continue;
    n += treffer.length;
    box.append(el('div.lex-gruppe', { text: `${L.kategorien[kat]} (${treffer.length})` }), el('div.lex-karten', treffer.slice(0, 40).map((x) => karte(kat, x))));
  }
  box.prepend(el('p.klein', { text: n ? L.treffer(n) : L.keineTreffer }));
  return box;
}

function startAnsicht() {
  return el('div',
    el('p.lex-absatz', { text: L.start }),
    el('div.lex-start-kats', REIHENFOLGE.map((k) => el('div.eintrag', { onclick: () => gehe(k, null) }, bild('kat', k, 48), el('b', { text: L.kategorien[k] }), el('div.klein', { text: L.kategorieText[k] })))),
    el('div.lex-gruppe', { text: L.startTipp }),
    chips(L.startRegeln.map((id) => chip('regel', id))),
  );
}

// ---------- Detailansichten ----------
function detail(art, id) {
  switch (art) {
    case 'einheit': return einheitDetail(EINHEIT[id]);
    case 'gebaeude': return gebaeudeDetail(GEB[id]);
    case 'wunder': return wunderDetail(WUNDER_NACH_ID[id]);
    case 'forschung': return forschungDetail(FORSCHUNG[id]);
    case 'rohstoff': return rohstoffDetail(ROHSTOFF[id]);
    case 'gelaende': return gelaendeDetail(id);
    case 'verbesserung': return verbesserungDetail(VERBESSERUNG[id]);
    case 'befoerderung': return befoerderungDetail(BEFOERDERUNG[id]);
    case 'zeitalter': return zeitalterDetail(id);
    case 'akteur': return akteurDetail(id);
    case 'regel': return regelDetail(id);
  }
  return el('p', { text: L.keineTreffer });
}

function einheitDetail(d) {
  if (!d) return el('p', { text: L.keineTreffer });
  const aus = EINHEITEN.filter((x) => x.upgrade === d.id);
  return el('div',
    kopf('einheit', d.id, d.name, `${zName(d.zeitalter)} · ${L.klassen[d.klasse] || d.klasse}`, d.beschreibung),
    el('div.lex-werte',
      wert('staerke', String(d.staerke), L.staerke),
      d.fern ? wert('fernkampf', String(d.fern), L.fern) : null,
      d.reichweite ? wert('reichweite', String(d.reichweite), L.reichweite) : null,
      d.tempo ? wert('tempo', String(d.tempo), L.tempo) : null,
      wert('sicht', String(d.sicht || 2), L.sicht),
      wert('hp', '100', L.lp),
      wert('gold', dz(d.unterhalt || 0), L.unterhalt + ' ' + L.proStunde),
      d.abklingzeit ? wert('zeit', dauerText(d.abklingzeit * 1000), L.abklingzeit) : null,
    ),
    abschnitt(L.kosten, kostenChips(d.kosten)),
    abschnitt(L.faehigkeiten, d.faehigkeiten.length ? el('ul.lex-liste', d.faehigkeiten.map((f) => el('li', { text: L.faehigkeitText[f] || f }))) : null),
    abschnitt(L.boni, d.boni.length ? el('ul.lex-liste', d.boni.map((b) => el('li', { text: `${b.wert > 0 ? '+' : ''}${b.wert} Stärke gegen ${L.gegen[b.gegen] || L.klassen[b.gegen] || b.gegen}` }))) : null),
    abschnitt(L.upgrade, d.upgrade ? chips([chip('einheit', d.upgrade, { zusatz: ' · ' + zName(EINHEIT[d.upgrade]?.zeitalter) })]) : null),
    abschnitt(L.upgradeAus, aus.length ? chips(aus.map((x) => chip('einheit', x.id))) : null),
    abschnitt(L.freiDurch, freiDurch('einheit', d.id)),
    el('p.klein', markup('[[regel:kampf|Kampf]] · [[regel:modifikatoren|Modifikatoren]] · [[regel:unterhalt|Unterhalt]]')),
  );
}

function gebaeudeKette(g) {
  let wurzel = g; const gesehen = new Set();
  while (wurzel.ersetzt && GEB[wurzel.ersetzt] && !gesehen.has(wurzel.id)) { gesehen.add(wurzel.id); wurzel = GEB[wurzel.ersetzt]; }
  const l = [wurzel];
  for (let n = wurzel, k = 0; k < 10; k++) { const x = GEBAEUDE.find((y) => y.ersetzt === n.id); if (!x) break; l.push(x); n = x; }
  return l;
}
function gebaeudeDetail(g) {
  if (!g) return el('p', { text: L.keineTreffer });
  const benoetigt = (g.benoetigt || []).filter((b) => b !== g.ersetzt);
  return el('div',
    kopf('gebaeude', g.id, g.name, `${zName(g.zeitalter)} · ${L.gebKategorien[g.kategorie] || ''}`, g.beschreibung),
    abschnitt(L.wirkung, wirkungListe(g.wirkung)),
    abschnitt(L.kosten, kostenChips(g.kosten)),
    el('div.lex-werte', wert('gold', dz(g.unterhalt || 0), L.unterhalt + ' ' + L.proStunde)),
    abschnitt(L.voraussetzungen,
      benoetigt.length ? el('div', el('div.klein', { text: L.braucht }), chips(benoetigt.map((b) => chip('gebaeude', b)))) : null,
      g.ersetzt ? el('div', el('div.klein', { text: L.ersetzt }), chips([chip('gebaeude', g.ersetzt)])) : null,
      g.braucht_kueste ? el('div', { text: '• ' + L.kueste }) : null,
      g.braucht_fluss ? el('div', { text: '• ' + L.fluss }) : null),
    abschnitt(L.kette, kette(gebaeudeKette(g), 'gebaeude', g.id)),
    abschnitt(L.freiDurch, g.id === 'palast' ? el('div', { text: g.beschreibung }) : freiDurch('gebaeude', g.id)),
  );
}

function wunderDetail(w) {
  if (!w) return el('p', { text: L.keineTreffer });
  const st = Z.ansicht?.wunder?.[w.id];
  const imBau = (Z.ansicht?.welt?.im_bau || []).filter((x) => x.wunder === w.id).map((x) => volk(x.volk)?.name).filter(Boolean);
  const status = st?.fertig ? L.status.gebaut(volk(st.volk)?.name || '?') : imBau.length ? L.status.imBau(imBau.join(', ')) : Z.ansicht ? L.status.frei : null;
  return el('div',
    kopf('wunder', w.id, w.name, `${zName(w.zeitalter)} · ${L.kategorien.wunder}`, w.beschreibung, { status: status ? el('div.lex-status', { class: st?.fertig ? 'rot-t' : 'gruen-t', text: status }) : null }),
    abschnitt(L.reichWirkung, bonusListe(w.reich)),
    abschnitt(L.stadtWirkung, wirkungListe(w.wirkung)),
    abschnitt(L.kosten, kostenChips(w.kosten)),
    abschnitt(L.voraussetzungen, (w.benoetigt || []).length ? chips(w.benoetigt.map((b) => chip('gebaeude', b))) : null, w.braucht_kueste ? el('div', { text: '• ' + L.kueste }) : null),
    abschnitt(L.freiDurch, freiDurch('wunder', w.id)),
    el('p.klein', markup('[[regel:wunder|Wie funktionieren Weltwunder?]]')),
  );
}

function forschungStatus(f) {
  const d = du(); if (!d?.forschung) return null;
  const fo = d.forschung;
  if (fo.erforscht?.[f.id] && !f.wiederholbar) return el('div.lex-status.gruen-t', { text: L.status.erforscht });
  if (fo.aktiv === f.id) return el('div.lex-status.blau-t', { text: L.status.aktiv });
  if (f.voraussetzungen.every((v) => fo.erforscht?.[v])) return el('div.lex-status.gold-t', { text: L.status.moeglich });
  return el('div.lex-status.klein', { text: L.status.gesperrt });
}
function freischaltungChip(x) {
  if (x.art === 'option') return el('span.lex-chip.text', symbol('ui', 'haken', { px: 20 }), el('span', { text: L.optionText[x.id] || x.id }));
  if (x.art === 'bonus') return el('span.lex-chip.text', symbol('ui', 'plus', { px: 20 }), el('span', { text: L.bonusText[x.id] ? L.bonusText[x.id](dz(x.wert)) : `${x.id} ${x.wert}` }));
  if (x.art === 'rohstoff') return chip('rohstoff', x.id, { zusatz: ' (sichtbar)' });
  return chip(x.art, x.id);
}
function forschungDetail(f) {
  if (!f) return el('p', { text: L.keineTreffer });
  const w = du()?.raten?.wissenschaft || 0;
  const jetzt = Z.ansicht ? f.dauer * 1000 / R.forschungsTempo(w) : null;
  return el('div',
    kopf('forschung', f.id, f.name, `${zName(f.zeitalter)} · ${L.zweig}: ${L.zweige[f.zweig] || f.zweig}`, f.beschreibung, { px: 112, status: forschungStatus(f) }),
    el('div.lex-werte', wert('zeit', dauerText(f.dauer * 1000), L.dauer), jetzt ? wert('wissenschaft', dauerText(jetzt), L.dauerJetzt) : null),
    f.schluessel ? el('p.gold-t', { text: '★ ' + L.schluessel }) : null,
    f.wiederholbar ? el('p.blau-t', { text: L.wiederholbar }) : null,
    abschnitt(L.schaltetFrei, f.freischaltet.length ? chips(f.freischaltet.map(freischaltungChip)) : null),
    abschnitt(L.voraussetzungen, f.voraussetzungen.length ? chips(f.voraussetzungen.map((v) => chip('forschung', v))) : el('div', { text: L.freiStart })),
    abschnitt(L.nachfolger, (NACHFOLGER[f.id] || []).length ? chips(NACHFOLGER[f.id].map((v) => chip('forschung', v))) : null),
    el('div', { style: { marginTop: '14px' } }, el('button.knopf.gold', { onclick: () => { fensterObj?.schliessen(); F.forschung(f.id); } }, symbol('ui', 'forschung'), L.imBaum)),
  );
}

const kettenStufen = (k) => VERBESSERUNGEN.filter((v) => v.kette === k).sort((a, b) => a.stufe - b.stufe);
function rohstoffDetail(r) {
  if (!r) return el('p', { text: L.keineTreffer });
  const nutzer = [];
  for (const e of EINHEITEN) if (e.kosten?.[r.id]) nutzer.push(['einheit', e.id]);
  for (const g of GEBAEUDE) if (g.kosten?.[r.id]) nutzer.push(['gebaeude', g.id]);
  for (const w of WUNDER) if (w.kosten?.[r.id]) nutzer.push(['wunder', w.id]);
  const stufen = kettenStufen(r.verbesserung);
  return el('div',
    kopf('rohstoff', r.id, r.name, `${L.art}: ${L.rohstoffArten[r.art]}`, r.zweck, { px: 96 }),
    el('p.lex-absatz.klein', { text: L.rohstoffArtText[r.art] }),
    el('div.lex-werte', ...ertragWerte(r.ertrag), r.glueck ? wert('zufriedenheit', '+' + r.glueck, L.glueck) : null,
      ...Object.entries(r.liefert || {}).map(([g, n]) => wert(g, '+' + dz(n) + '/h', L.liefert))),
    abschnitt(L.vorkommen, chips((r.gelaende || []).map((g) => chip('gelaende', g)))),
    abschnitt(L.erschliessen, stufen.length ? kette(stufen, 'verbesserung', null) || chips(stufen.map((v) => chip('verbesserung', v.id))) : null),
    abschnitt(L.sichtbarAb, r.sichtbar_durch ? chips([chip('forschung', r.sichtbar_durch)]) : el('div', { text: L.immerSichtbar })),
    abschnitt(L.gebrauchtVon, nutzer.length ? chips(nutzer.slice(0, 40).map(([a, i]) => chip(a, i))) : null),
  );
}

function gelaendeDetail(id) {
  if (id === 'fluss') {
    return el('div', kopf('gelaende', 'fluss', L.fluss, '', FLUSS.beschreibung, { px: 96 }), el('div.lex-werte', ...ertragWerte(FLUSS.ertrag), wert('angriff', '−' + R.KAMPF.flussMalus, 'Angriff aus dem Fluss')),
      abschnitt(L.verbesserungenHier, chips(VERBESSERUNGEN.filter((v) => v.fluss || v.schicht === 'bruecke').map((v) => chip('verbesserung', v.id)))));
  }
  const g = GELAENDE_ID[id];
  if (!g) return el('p', { text: L.keineTreffer });
  const roh = ROHSTOFFE.filter((r) => (r.gelaende || []).includes(id));
  const verb = VERBESSERUNGEN.filter((v) => (v.gelaende?.length ? v.gelaende.includes(id) : !g.wasser && !v.wasser) && v.schicht !== 'weg' && (!v.stufe || v.stufe === 1));
  const tiere = Object.entries(L.tiere).filter(([, t]) => t.gel.includes(id));
  return el('div',
    kopf('gelaende', id, g.name, g.wasser ? L.wasser : '', g.beschreibung),
    el('div.lex-werte', ...ertragWerte(g.ertrag),
      ...Object.entries(g.material || {}).map(([m, n]) => wert(m, '+' + n, L.material)),
      wert('tempo', g.bewegung ? '×' + g.bewegung : '–', g.bewegung ? L.bewegung : L.unpassierbar),
      wert('schild', (g.verteidigung > 0 ? '+' : '') + (g.verteidigung || 0), L.verteidigung),
      g.sicht ? wert('sicht', '+' + g.sicht, L.sicht) : null),
    abschnitt(L.rohstoffeHier, roh.length ? chips(roh.map((r) => chip('rohstoff', r.id))) : null),
    abschnitt(L.verbesserungenHier, verb.length ? chips(verb.map((v) => chip('verbesserung', v.id))) : null),
    abschnitt(L.raubtiere, tiere.length ? chips(tiere.map(([t]) => chip('akteur', 'tier_' + t))) : null),
    el('p.klein', markup('[[regel:bewegung|Bewegung]] · [[regel:modifikatoren|Modifikatoren]]')),
  );
}

function verbesserungDetail(v) {
  if (!v) return el('p', { text: L.keineTreffer });
  const stufen = kettenStufen(v.kette);
  const roh = ROHSTOFFE.filter((r) => r.verbesserung === v.kette);
  return el('div',
    kopf('verbesserung', v.id, v.name, v.stufe ? `Stufe ${v.stufe}` : '', v.beschreibung),
    el('div.lex-werte', ...ertragWerte(v.ertrag),
      ...Object.entries(v.material || {}).map(([m, n]) => wert(m, '+' + n + '/h', L.material)),
      wert('zeit', dauerText((v.bauzeit || 0) * 1000), L.bauzeit),
      v.bewegung != null ? wert('tempo', '×' + dz(v.bewegung), L.bewegung) : null,
      v.verteidigung ? wert('schild', '+' + v.verteidigung, L.verteidigung) : null,
      v.sicht ? wert('sicht', '+' + v.sicht, L.sicht) : null),
    v.schicht === 'weg' ? el('p.klein', { text: L.weg }) : v.schicht === 'bruecke' ? el('p.klein', { text: L.bruecke }) : null,
    abschnitt(L.vorkommen,
      v.gelaende?.length ? chips(v.gelaende.map((g) => chip('gelaende', g))) : el('div', { text: L.ueberall }),
      v.rohstoff_pflicht?.length ? el('div', el('div.klein', { text: L.nurAuf }), chips(v.rohstoff_pflicht.map((r) => chip('rohstoff', r)))) : null,
      v.fluss ? el('div', { text: '• ' + L.brauchtFluss }) : null, v.kueste ? el('div', { text: '• ' + L.brauchtKueste }) : null),
    abschnitt(L.kette, kette(stufen, 'verbesserung', v.id)),
    abschnitt(L.erschliessen.replace('durch', '') + ' – Rohstoffe', roh.length ? chips(roh.map((r) => chip('rohstoff', r.id))) : null),
    abschnitt(L.freiDurch, freiDurch('verbesserung', v.id)),
  );
}

function befoerderungDetail(b) {
  if (!b) return el('p', { text: L.keineTreffer });
  const W = L.befWirkung, z = [];
  for (const [k, v] of Object.entries(b.wirkung)) {
    if (k === 'gelaende') { const gruppen = {}; for (const [g, n] of Object.entries(v)) (gruppen[n] ||= []).push(GELAENDE_ID[g]?.name || g); for (const [n, l] of Object.entries(gruppen)) z.push(W.gelaende(l.join(', '), n)); }
    else if (k === 'gegen') for (const [g, n] of Object.entries(v)) z.push(W.gegen(L.gegen[g] || L.klassen[g] || g, n));
    else z.push(W[k] ? W[k](v) : `${k}: ${v}`);
  }
  const danach = BEFOERDERUNGEN.filter((x) => x.voraussetzung === b.id);
  return el('div',
    kopf('befoerderung', b.id, b.name, '', b.beschreibung, { px: 96 }),
    abschnitt(L.wirkung, el('ul.lex-liste', z.map((t) => el('li', { text: t })))),
    abschnitt(L.klassenBef, chips(b.klassen.map((k) => el('span.lex-chip.text', { text: L.klassen[k] || k })))),
    abschnitt(L.vorBef, b.voraussetzung ? chips([chip('befoerderung', b.voraussetzung)]) : null),
    abschnitt(L.danachBef, danach.length ? chips(danach.map((x) => chip('befoerderung', x.id))) : null),
    el('p.klein', markup('[[regel:erfahrung|Wie bekommt man Beförderungen?]]')),
  );
}

function zeitalterDetail(id) {
  const i = ZEITALTER.findIndex((z) => z.id === id);
  const z = ZEITALTER[i];
  if (!z) return el('p', { text: L.keineTreffer });
  const fo = FORSCHUNGEN.filter((f) => f.zeitalter === i);
  const sch = fo.find((f) => f.schluessel);
  return el('div',
    kopf('zeitalter', id, z.name, `${L.zeitalterName} ${i + 1} von ${ZEITALTER.length}`, z.beschreibung),
    abschnitt(L.optik, el('div', { style: { display: 'flex', gap: '12px', alignItems: 'flex-end' } }, [1, 2, 3].map((gr) => el('div.lex-bild', { style: { width: '108px', height: '108px' } }, symbol('stadt', 'stadt', { zeitalter: i, groesse: gr, farbe: farbe(), px: 88 }))))),
    el('div.lex-werte', wert('forschung', String(fo.length), L.forschungenZeit)),
    abschnitt(L.schluesselZeit, sch ? chips([chip('forschung', sch.id)]) : null),
    abschnitt(L.einheitenZeit, chips(EINHEITEN.filter((e) => e.zeitalter === i).map((e) => chip('einheit', e.id)))),
    abschnitt(L.gebaeudeZeit, chips(GEBAEUDE.filter((g) => g.zeitalter === i).map((g) => chip('gebaeude', g.id)))),
    abschnitt(L.kategorien.wunder, (() => { const w = WUNDER.filter((x) => x.zeitalter === i); return w.length ? chips(w.map((x) => chip('wunder', x.id))) : null; })()),
    el('p.klein', markup('[[regel:zeitalter|Wie steigt man auf?]]')),
  );
}

function akteurDetail(id) {
  const a = akteurDaten(id);
  if (!a) return el('p', { text: L.keineTreffer });
  if (a.art === 'tier') {
    return el('div', kopf('akteur', id, a.name, L.raubtiere, L.tierText, { px: 112 }), abschnitt(L.vorkommen, chips(a.gel.map((g) => chip('gelaende', g)))));
  }
  const swatch = el('span.lex-farbe', { style: { background: a.farbe } });
  if (a.art === 'ki') {
    return el('div', kopf('akteur', id, a.name, L.ki, a.beschreibung),
      el('table.lex-tab', el('tr', el('td', { text: L.herrscher }), el('td', { text: a.herrscher })), el('tr', el('td', { text: L.persoenlichkeit }), el('td', { text: L.persoenlichkeiten[a.persoenlichkeit] || a.persoenlichkeit })), el('tr', el('td', { text: 'Farbe' }), el('td', swatch))),
      el('p.lex-absatz', markup(L.kiAllgemein)));
  }
  if (a.art === 'stadtstaat') {
    const v = Object.values(Z.ansicht?.voelker || {}).find((x) => x.art === 'stadtstaat' && (x.vorlage === id || x.name === a.name));
    return el('div', kopf('akteur', id, a.name, `${L.stadtstaaten} · ${L.schwerpunkte[a.schwerpunkt] || a.schwerpunkt}`, a.beschreibung, { status: v ? el('div.lex-status.blau-t', { text: L.einfluss(Math.round(v.einfluss || 0)) }) : Z.ansicht ? el('div.lex-status.klein', { text: L.unbekannt }) : null }),
      el('table.lex-tab', el('tr', el('td', { text: 'Farbe' }), el('td', swatch))),
      abschnitt(L.bonusFreund, bonusListe(a.bonus)),
      abschnitt(L.bonusBund, bonusListe(a.buendnis_bonus)),
      el('p.lex-absatz', markup(L.ssAllgemein)));
  }
  // Barbarenlager
  return el('div', kopf('akteur', id, a.name, L.barbaren, a.beschreibung),
    el('div.lex-werte', wert('gold', '+' + a.belohnung_gold, L.belohnung)),
    abschnitt(L.lagerGelaende, chips(a.gelaende.map((g) => chip('gelaende', g)))),
    abschnitt(L.truppen, el('table.lex-tab', a.einheiten_je_zeitalter.map((l, i) => el('tr', el('td', { text: zName(i) }), el('td', chips(l.map((e) => chip('einheit', e)))))))),
    el('p.lex-absatz', markup(L.barbAllgemein)));
}

function regelDetail(id) {
  const r = L.regeln.find((x) => x.id === id);
  if (!r) return el('p', { text: L.keineTreffer });
  const i = L.regeln.indexOf(r);
  const nachbarn = [L.regeln[i - 1], L.regeln[i + 1]].filter(Boolean);
  return el('div',
    el('div.lex-kopf', el('div.lex-bild', { style: { width: '88px', height: '88px' } }, bild('regel', id, 64)), el('div', { style: { flex: '1', minWidth: '0' } }, el('h2', { text: r.titel }), el('div.unter', { text: L.kategorien.regel }))),
    r.absaetze(R).map(absatz),
    el('div', { style: { display: 'flex', gap: '6px', marginTop: '16px', flexWrap: 'wrap' } }, nachbarn.map((n, k) => el('button.knopf', { onclick: () => gehe('regel', n.id) }, (k === 0 && i > 0 ? '← ' : '') + n.titel + (k === nachbarn.length - 1 && i < L.regeln.length - 1 ? ' →' : '')))),
  );
}

// ---------- Fenster und Navigation ----------
let fensterObj = null, ansicht = { art: null, id: null }, verlauf = [], suchFeld, katEl, inhaltEl, pfadEl, zurueckKnopf, suchText = '';

function gehe(art, id, merken = true) {
  if (merken && (ansicht.art !== art || ansicht.id !== id || suchText)) verlauf.push({ ...ansicht, suche: suchText });
  ansicht = { art, id };
  suchText = ''; if (suchFeld) suchFeld.value = '';
  zeichne();
}
function zurueck() {
  const v = verlauf.pop(); if (!v) return;
  ansicht = { art: v.art, id: v.id };
  suchText = v.suche || ''; if (suchFeld) suchFeld.value = suchText;
  zeichne();
}

function zeichne() {
  if (!fensterObj) return;
  const { art, id } = ansicht;
  for (const b of katEl.children) b.classList.toggle('an', b.dataset.kat === (art || '') && !suchText);
  zurueckKnopf.disabled = !verlauf.length;
  const pfad = [el('a', { text: L.titel, onclick: () => gehe(null, null) })];
  if (suchText) pfad.push(' › ', el('span', { text: `„${suchText}“` }));
  else if (art) { pfad.push(' › ', el('a', { text: L.kategorien[art], onclick: () => gehe(art, null) })); if (id) pfad.push(' › ', el('span', { text: name(art, id) || id })); }
  pfadEl.replaceChildren(...pfad);
  let inhalt;
  try { inhalt = suchText ? suchAnsicht(suchText) : !art ? startAnsicht() : id == null ? listeAnsicht(art) : detail(art, id); } catch (e) { console.error(e); inhalt = el('p.rot-t', { text: 'Fehler: ' + e.message }); }
  inhaltEl.replaceChildren(inhalt);
  inhaltEl.scrollTop = 0;
}

export function oeffneLexikon(art, id) {
  stil();
  if (art === 'kategorie') { art = id; id = null; }
  if (art && !REIHENFOLGE.includes(art)) art = null;
  if (fensterObj) { gehe(art || null, id ?? null); return fensterObj; }
  verlauf = []; ansicht = { art: art || null, id: id ?? null }; suchText = '';
  fensterObj = fenster(L.titel, (innen, f) => {
    f.element.classList.add('lex-fenster');
    suchFeld = el('input.lex-suche', { type: 'search', placeholder: L.suche, 'aria-label': L.suche });
    let timer = null;
    suchFeld.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { const t = suchFeld.value.trim(); if (t && !suchText) verlauf.push({ ...ansicht }); suchText = t; zeichne(); }, 150); });
    suchFeld.addEventListener('keydown', (e) => { if (e.key === 'Escape' && suchFeld.value) { e.stopPropagation(); suchFeld.value = ''; suchText = ''; zeichne(); } });
    katEl = el('div.lex-kats', REIHENFOLGE.map((k) => el('button.lex-kat', { 'data-kat': k, onclick: () => gehe(k, null) }, bild('kat', k, 24), el('span', { text: L.kategorien[k] }), el('span.n', { text: String(alle(k).length) }))));
    zurueckKnopf = el('button.knopf.klein', { onclick: zurueck, tip: L.zurueck, 'aria-label': L.zurueck }, symbol('ui', 'pfeil_links'), L.zurueck);
    pfadEl = el('div.lex-pfad');
    inhaltEl = el('div.lex-inhalt');
    innen.append(el('div.lex', el('div.lex-seite', suchFeld, katEl), el('div.lex-haupt', el('div.lex-leiste', zurueckKnopf, pfadEl), inhaltEl)));
  }, { breite: 'voll', symbol: symbol('ui', 'lexikon', { px: 24 }), beiSchliessen: () => { fensterObj = null; } });
  zeichne();
  if (matchMedia('(pointer: fine)').matches && !art) setTimeout(() => suchFeld?.focus(), 50);
  return fensterObj;
}
