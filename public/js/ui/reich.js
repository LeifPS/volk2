// Reichsübersicht: Städte, Einheiten, Wirtschaft (Einkommen, Lager, Luxus, Handel, Boni) und Weltwunder.
import { el as basisEl, symbol, fenster, zahl, vorzeichen, dauerText, uhrzeit, balken } from './basis.js';
import { T } from '../texte.js';
import { Z, an, du, volk, stadt as stadtVon, eigeneStaedte, eigeneEinheiten, aktuellesFeld, aktuelleHp, aktuellesGold, aktuellesLager, serverJetzt } from '../kern/zustand.js';
import { EINHEIT, VERBESSERUNG, ROHSTOFF, WUNDER, ZEITALTER } from '../../shared/daten/index.js';
import { LAGERGUETER, LAGER_NAMEN } from '../../shared/daten/rohstoffe.js';
import { abstand, xVon, yVon } from '../../shared/hex.js';
import { freieEinheiten } from '../../shared/regeln.js';
import { springe, waehle } from './hud.js';
import * as fenster_ from './fenster.js';
import { bauName, bauSymbol, boniListe, wirkungListe } from './stadt.js';

/** el() mit zusammengeführtem class-Attribut (sonst würde es die Klassen aus dem Tag überschreiben). */
function el(tag, attr, ...kinder) {
  if (attr && typeof attr === 'object' && !(attr instanceof Node) && !Array.isArray(attr) && 'class' in attr) {
    const c = String(attr.class || '').trim();
    if (c) tag += '.' + c.split(/\s+/).join('.');
    attr = { ...attr, class: undefined };
  }
  return basisEl(tag, attr, ...kinder);
}


const R = () => T.reich;
const REITER = ['staedte', 'einheiten', 'wirtschaft', 'wunder'];
const z1 = (x) => zahl(x, Math.abs(x) < 10 && Math.round(x) !== x ? 1 : 0);

let stilDa = false;
function stil() {
  if (stilDa) return; stilDa = true;
  document.head.append(el('style', { text: `
.re-reiter .knopf { min-width: 120px; }
.re-tab tr.klick { cursor: pointer; }
.re-tab tr.klick:hover td { background: #283048; }
.re-tab th { white-space: nowrap; user-select: none; }
.re-tab th.an { color: var(--akzent); }
.re-tab td.z, .re-tab th.z { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.re-tab td .re-n { display: inline-flex; gap: 6px; align-items: center; }
.re-raster { grid-auto-flow: dense; display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 10px; align-items: start; }
.re-box { background: var(--panel2); border: 2px solid var(--rand); padding: 8px 10px; }
.re-box > h2 { font-size: 14px; display: flex; gap: 6px; align-items: center; margin-bottom: 6px; }
.re-box.breit { grid-column: 1 / -1; }
.re-box.doppelt { grid-column: span 2; }
@media (max-width: 1250px) { .re-box.doppelt { grid-column: auto; } }
.re-boni { margin: 0; padding-left: 18px; column-width: 280px; column-gap: 24px; }
.re-boni li { break-inside: avoid; margin: 1px 0; }
.re-summe { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 8px; }
.re-summe span { display: inline-flex; gap: 5px; align-items: center; font-family: var(--kopf); font-size: 13px; }
.re-wunder { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 8px; }
.re-wunder .eintrag { cursor: default; align-items: center; }
.re-wunder .eintrag.mein { border-color: var(--akzent); background: #2e2a1c; }
.re-wunder .eintrag.weg { opacity: .8; }
.re-status { font-family: var(--kopf); font-size: 12px; margin: 3px 0; }
.re-bar { width: 90px; display: inline-block; vertical-align: middle; }
.re-leer { color: var(--text2); padding: 10px 0; }
` }));
}

let offen = null;

export function oeffneReich(reiter) {
  stil();
  if (offen) { if (reiter) offen.reiter = reiter; zeichne(); return; }
  const z = { reiter: REITER.includes(reiter) ? reiter : 'staedte', sort: { staedte: { k: 'name', ab: false }, einheiten: { k: 'typ', ab: false } }, live: [], schl: '' };
  offen = z;
  const ab = an('aenderung', () => { const s = schluessel(); if (s !== z.schl) zeichne(); });
  const uhr = setInterval(() => { for (const fn of z.live) { try { fn(); } catch { /* egal */ } } }, 1000);
  z.f = fenster(R().titel, null, { breite: 'voll', symbol: symbol('ui', 'krone', { px: 24 }), beiSchliessen: () => { ab(); clearInterval(uhr); offen = null; } });
  zeichne();
}

function schluessel() {
  const a = Z.ansicht; if (!a) return '';
  const r = offen.reiter;
  if (r === 'staedte') return JSON.stringify(eigeneStaedte());
  if (r === 'einheiten') return JSON.stringify(eigeneEinheiten());
  if (r === 'wunder') return JSON.stringify([a.wunder, a.welt?.im_bau]);
  const d = du(); return JSON.stringify([d.raten, d.lager, d.routen, d.routenKapazitaet]);
}

function zeichne() {
  const z = offen; if (!z || !Z.ansicht) return;
  z.schl = schluessel(); z.live = [];
  const f = z.f, scroll = f.inhalt.scrollTop;
  const reiter = el('div.reiter.re-reiter', REITER.map((r) => el('button.knopf' + (r === z.reiter ? '.gold' : ''), { onclick: () => { z.reiter = r; zeichne(); f.inhalt.scrollTop = 0; } }, symbol('ui', { staedte: 'stadt', einheiten: 'einheit', wirtschaft: 'gold', wunder: 'wunder' }[r]), R().reiter[r])));
  const k = el('div');
  f.inhalt.replaceChildren(reiter, k);
  ({ staedte, einheiten, wirtschaft, wunder })[z.reiter](k);
  f.inhalt.scrollTop = scroll;
}

/** Sortierbare Tabelle. spalten: [{k, titel, wert(x), zelle(x), z?:rechtsbündig, tip?}] */
function tabelle(art, spalten, zeilen, klick) {
  const so = offen.sort[art];
  const sp = spalten.find((s) => s.k === so.k) || spalten[0];
  const l = zeilen.slice().sort((a, b) => {
    const x = sp.wert(a), y = sp.wert(b);
    const c = typeof x === 'string' ? x.localeCompare(y, 'de') : (x ?? -Infinity) - (y ?? -Infinity);
    return so.ab ? -c : c;
  });
  return el('table.tabelle.re-tab',
    el('tr', spalten.map((s) => el('th' + (s.z ? '.z' : '') + (s.k === so.k ? '.an' : ''), { tip: s.tip || R().sortTip, onclick: () => { if (so.k === s.k) so.ab = !so.ab; else { so.k = s.k; so.ab = !!s.z; } zeichne(); } }, s.titel + (s.k === so.k ? (so.ab ? ' ▼' : ' ▲') : '')))),
    l.map((x) => el('tr.klick', { onclick: () => klick(x) }, spalten.map((s) => { const v = s.zelle ? s.zelle(x) : s.wert(x); return el('td' + (s.z ? '.z' : ''), v instanceof Node ? v : { text: v == null ? '–' : String(v) }); }))),
  );
}

// ---------- Städte ----------
function staedte(k) {
  const l = eigeneStaedte();
  if (!l.length) { k.append(el('p.re-leer', { text: R().keineStaedte })); return; }
  const sum = (f) => l.reduce((a, s) => a + (f(s) || 0), 0);
  k.append(el('div.re-summe',
    el('span', symbol('ui', 'stadt'), R().anzahlStaedte(l.length)),
    el('span', symbol('ui', 'bevoelkerung'), R().einwohnerGesamt(sum((s) => s.bev))),
    el('span.gold-t', symbol('ui', 'gold'), '+' + z1(sum((s) => s.raten?.g)) + '/h'),
    el('span.blau-t', symbol('ui', 'wissenschaft'), z1(sum((s) => s.raten?.w))),
    el('span.lila-t', symbol('ui', 'kultur'), z1(sum((s) => s.raten?.k)) + '/h'),
  ));
  const bauRest = (s) => { const b = (s.bau || [])[0]; return b ? b.fertig_um - serverJetzt() : null; };
  const zahlZelle = (wert, fn, klasse) => (s) => el('span', { class: klasse ? klasse(s) : '' , text: fn(wert(s)) });
  const sp = R().spalten;
  k.append(tabelle('staedte', [
    { k: 'name', titel: sp.name, wert: (s) => s.name, zelle: (s) => el('span.re-n', symbol('stadt', 'stadt', { farbe: du()?.farbe, zeitalter: s.zeitalter || 0, groesse: s.bev >= 12 ? 3 : s.bev >= 6 ? 2 : 1, px: 32 }), el('b', { text: s.name }), s.hauptstadt ? symbol('ui', 'krone') : null, s.zerstoert_bis > serverJetzt() ? el('span.rot-t.klein', { text: R().zerstoert }) : null) },
    { k: 'bev', titel: sp.bev, z: true, wert: (s) => s.bev },
    { k: 'n', titel: sp.nahrung, z: true, tip: R().nahrungTip, wert: (s) => s.raten?.ueberschuss || 0, zelle: zahlZelle((s) => s.raten?.ueberschuss || 0, (x) => vorzeichen(x, 1), (s) => ((s.raten?.ueberschuss || 0) >= 0 ? 'gruen-t' : 'rot-t')) },
    { k: 'p', titel: sp.produktion, z: true, wert: (s) => s.raten?.p || 0, zelle: zahlZelle((s) => s.raten?.p || 0, z1) },
    { k: 'g', titel: sp.gold, z: true, wert: (s) => s.raten?.g || 0, zelle: zahlZelle((s) => s.raten?.g || 0, (x) => '+' + z1(x), () => 'gold-t') },
    { k: 'w', titel: sp.wissenschaft, z: true, wert: (s) => s.raten?.w || 0, zelle: zahlZelle((s) => s.raten?.w || 0, z1, () => 'blau-t') },
    { k: 'zuf', titel: sp.zufriedenheit, z: true, wert: (s) => s.raten?.zufriedenheit || 0, zelle: (s) => { const x = s.raten?.zufriedenheit || 0; return el('span.re-n', symbol('ui', x >= 0 ? 'zufriedenheit' : 'unzufrieden'), el('span', { class: x >= 0 ? 'gruen-t' : 'rot-t', text: (x > 0 ? '+' : '') + x })); } },
    { k: 'bau', titel: sp.bau, wert: (s) => bauRest(s) ?? Infinity, zelle: (s) => {
      const b = (s.bau || [])[0];
      if (!b) return el('span.gold-t', { text: (s.schlange || []).length ? R().wartet : R().keinBau });
      const bar = balken(0, 'gold'), t = el('span.klein');
      const upd = () => { const j = serverJetzt(); bar.firstChild.style.width = Math.round(Math.max(0, Math.min(1, (j - b.start) / Math.max(1, b.fertig_um - b.start))) * 100) + '%'; t.textContent = ' ' + dauerText(b.fertig_um - j); };
      upd(); offen.live.push(upd);
      return el('span.re-n', bauSymbol(b.art, b.id, 24), el('span', { text: bauName(b) + ((s.bau || []).length > 1 ? ` (+${s.bau.length - 1})` : '') }), el('span.re-bar', bar), t);
    } },
  ], l, (s) => fenster_.stadt(s.id)));
  k.append(el('p.klein', { text: R().staedteHinweis }));
}

// ---------- Einheiten ----------
function ortVon(e) {
  if (e.in) { const tr = Z.ansicht.einheiten[e.in]; return R().anBord(tr ? EINHEIT[tr.typ]?.name || '?' : '?'); }
  const f = aktuellesFeld(e);
  let best = null, bd = Infinity;
  for (const s of Object.values(Z.ansicht.staedte || {})) { const d = abstand(f, s.feld); if (d < bd) { bd = d; best = s; } }
  if (best && bd === 0) return R().inStadt(best.name);
  if (best && bd <= 6) return R().beiStadt(bd, best.name);
  return R().feld(xVon(f), yVon(f));
}
function statusVon(e) {
  const S = R().status;
  if (e.unterversorgt) return [S.unterversorgt, 'rot-t'];
  if (e.pfad?.length) return [S.unterwegs(dauerText(e.pfad[e.pfad.length - 1].t - serverJetzt())), 'blau-t'];
  if (e.arbeit) return [S.baut(VERBESSERUNG[e.arbeit.id]?.name || e.arbeit.id, dauerText(e.arbeit.fertig_um - serverJetzt())), ''];
  if (e.route) return [e.route.aktiv ? S.handel : S.handelUnterwegs, 'gold-t'];
  if (e.einsatz) return [S.einsatz, ''];
  if (e.befoerderbar) return [S.befoerderbar, 'gold-t'];
  if (S.modus[e.modus]) return [S.modus[e.modus], ''];
  return [S.wartet, 'gold-t'];
}
function einheiten(k) {
  const l = eigeneEinheiten();
  if (!l.length) { k.append(el('p.re-leer', { text: R().keineEinheiten })); return; }
  const r = du().raten;
  const bezahlt = l.filter((e) => (EINHEIT[e.typ]?.unterhalt || 0) > 0).length;
  k.append(el('div.re-summe',
    el('span', symbol('ui', 'einheit'), R().anzahlEinheiten(l.length)),
    el('span', symbol('ui', 'haken'), R().freiKontingent(freieEinheiten(eigeneStaedte().length), bezahlt)),
    el('span', { class: r.unterhaltEinheiten > 0.05 ? 'rot-t' : 'gruen-t' }, symbol('ui', 'gold'), R().unterhaltEinheiten(r.unterhaltEinheiten > 0.05 ? '−' + z1(r.unterhaltEinheiten) : '0')),
  ));
  const sp = R().spalten;
  k.append(tabelle('einheiten', [
    { k: 'typ', titel: sp.typ, wert: (e) => EINHEIT[e.typ]?.name || e.typ, zelle: (e) => el('span.re-n', symbol('einheit', e.typ, { farbe: du()?.farbe, px: 32 }), el('b', { text: EINHEIT[e.typ]?.name || e.typ }), e.bef?.length ? el('span.klein', { text: '★' + e.bef.length }) : null) },
    { k: 'ort', titel: sp.ort, wert: ortVon },
    { k: 'hp', titel: sp.lp, z: true, wert: (e) => aktuelleHp(e), zelle: (e) => { const hp = aktuelleHp(e); return el('span.re-n', el('span.re-bar', { style: { width: '60px' } }, balken(hp / 100, hp > 60 ? '' : hp > 30 ? 'gold' : 'rot')), el('span', { text: String(Math.round(hp)) })); } },
    { k: 'status', titel: sp.status, wert: (e) => statusVon(e)[0], zelle: (e) => { const [t, c] = statusVon(e); return el('span', { class: c, text: t }); } },
    { k: 'unterhalt', titel: sp.unterhalt, z: true, wert: (e) => EINHEIT[e.typ]?.unterhalt || 0, zelle: (e) => { const u = EINHEIT[e.typ]?.unterhalt || 0; return u ? z1(u) + '/h' : '–'; } },
  ], l, (e) => { offen?.f.schliessen(); springe(aktuellesFeld(e)); waehle({ art: 'einheit', id: e.id }); }));
  k.append(el('p.klein', { text: R().einheitenHinweis }));
}

// ---------- Wirtschaft ----------
function box(sym, titel, ...kinder) { return el('div.re-box', el('h2', symbol('ui', sym), titel), ...kinder); }
function wirtschaft(k) {
  const d = du(), r = d.raten;
  const W = R().wirtschaft;
  const goldNow = el('b.gold-t');
  const upd = () => { goldNow.textContent = zahl(Math.floor(aktuellesGold())); };
  upd(); offen.live.push(upd);
  const zeile = (text, wert, klasse) => el('tr', el('td', { text }), el('td.z', { class: klasse, text: wert }));
  const einkommen = box('gold', W.einkommen,
    el('div', { style: { marginBottom: '6px' } }, W.kasse + ': ', goldNow, ' · ', el('b', { class: r.gold >= 0 ? 'gruen-t' : 'rot-t', text: vorzeichen(r.gold, 1) + '/h' })),
    el('table.tabelle.re-tab',
      zeile(W.staedte, '+' + z1(r.einnahmen - r.handel), 'gruen-t'),
      zeile(W.handel, vorzeichen(r.handel, 1), r.handel >= 0 ? 'gruen-t' : 'rot-t'),
      zeile(W.unterhaltEinheiten, r.unterhaltEinheiten > 0.05 ? '−' + z1(r.unterhaltEinheiten) : '0', r.unterhaltEinheiten > 0.05 ? 'rot-t' : ''),
      zeile(W.unterhaltGebaeude, r.unterhaltGebaeude > 0.05 ? '−' + z1(r.unterhaltGebaeude) : '0', r.unterhaltGebaeude > 0.05 ? 'rot-t' : ''),
      el('tr', el('td', el('b', { text: W.summe })), el('td.z', el('b', { class: r.gold >= 0 ? 'gruen-t' : 'rot-t', text: vorzeichen(r.gold, 1) + '/h' }))),
    ),
    r.gold < 0 ? el('p.rot-t.klein', { text: W.negativ(aktuellesGold() > 0 ? dauerText(aktuellesGold() / -r.gold * 3600000) : '0') }) : null,
    el('h3', { style: { marginTop: '8px' }, text: W.jeStadt }),
    el('table.tabelle.re-tab', eigeneStaedte().sort((a, b) => (b.raten?.g || 0) - (a.raten?.g || 0)).map((s) => el('tr.klick', { onclick: () => fenster_.stadt(s.id) }, el('td', { text: s.name }), el('td.z.gold-t', { text: '+' + z1(s.raten?.g || 0) }), el('td.z.rot-t', { text: s.raten?.unterhalt ? '−' + z1(s.raten.unterhalt) : '' })))),
  );
  // Lager
  const lagerZeilen = [];
  for (const gut of LAGERGUETER) {
    const rate = r.material?.[gut] || 0, cap = r.kapazitaet?.[gut] || 0;
    if (!(d.lager?.[gut] > 0) && !rate && !['holz', 'stein'].includes(gut)) continue;
    const m = el('span'), bar = balken(0, 'gold'), voll = el('span.klein');
    const u = () => {
      const x = aktuellesLager(gut);
      m.textContent = zahl(Math.floor(x));
      bar.firstChild.style.width = Math.round(Math.min(1, cap ? x / cap : 0) * 100) + '%';
      bar.className = 'balken ' + (x >= cap - 0.5 ? 'rot' : 'gold');
      voll.textContent = x >= cap - 0.5 ? W.voll : rate > 0 ? W.vollIn(dauerText((cap - x) / rate * 3600000)) : '';
      voll.className = x >= cap - 0.5 ? 'rot-t klein' : 'klein';
    };
    u(); offen.live.push(u);
    lagerZeilen.push(el('tr', el('td', el('span.re-n', symbol('ui', gut), LAGER_NAMEN[gut] || gut)), el('td.z', m), el('td.z.klein', { text: '/ ' + zahl(cap) }), el('td', el('span.re-bar', bar)), el('td.z', { class: rate > 0 ? 'gruen-t' : '', text: rate ? vorzeichen(rate, 1) + '/h' : '–' }), el('td', voll)));
  }
  const lager = box('lager', W.lager, el('table.tabelle.re-tab', el('tr', el('th', W.gut), el('th.z', W.bestand), el('th.z', W.kapazitaet), el('th', ''), el('th.z', W.rate), el('th', '')), lagerZeilen), el('p.klein', { text: W.lagerHinweis }));
  // Luxus
  const lux = Object.entries(r.luxus || {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const luxBox = box('zufriedenheit', W.luxus,
    lux.length ? el('table.tabelle.re-tab', lux.map(([id, n]) => { const ro = ROHSTOFF[id]; return el('tr', { tip: ro?.zweck }, el('td', el('span.re-n', symbol('rohstoff', id), ro?.name || id)), el('td.z', { text: '×' + n }), el('td', { class: n > 1 ? 'gold-t' : 'gruen-t', text: n > 1 ? W.ueberschuss(n - 1) : W.wirksam })); })) : el('p.klein', { text: W.keinLuxus }),
    el('p.klein', { text: W.luxusHinweis(lux.length) }),
    (d.luxus_handel || []).filter((l) => l.bis > serverJetzt()).length ? el('p.klein', { text: W.luxusImport((d.luxus_handel || []).filter((l) => l.bis > serverJetzt()).length) }) : null,
  );
  // Handel
  const kap = d.routenKapazitaet || 0;
  const handel = box('handel', W.routen,
    el('div', el('b', { text: `${d.routen || 0} / ${kap}` }), ' ' + W.routenAktiv),
    balken(kap ? (d.routen || 0) / kap : 0, 'gold'),
    el('div.klein', { style: { marginTop: '4px' }, text: W.routenErtrag(vorzeichen(r.handel, 1)) }),
    el('p.klein', { text: (d.routen || 0) < kap ? W.routenFrei(kap - (d.routen || 0)) : W.routenVoll }),
  );
  // Boni
  const bl = boniListe(Object.fromEntries(Object.entries(r.boni || {}).filter(([, x]) => x)));
  const boni = box('stern_voll', W.boni, bl.length ? el('ul.re-boni', bl.map((t) => el('li', { text: t }))) : el('p.klein', { text: W.keineBoni }), el('p.klein', { text: W.boniHinweis }));
  lager.classList.add('doppelt'); boni.classList.add('breit');
  k.append(el('div.re-raster', einkommen, lager, luxBox, handel, boni));
}

// ---------- Wunder ----------
function wunder(k) {
  const a = Z.ansicht;
  const W = R().wunderT;
  k.append(el('p.klein', { text: W.hinweis }));
  k.append(el('div.re-wunder', WUNDER.map((w) => {
    const b = a.wunder?.[w.id];
    const fertig = b?.fertig;
    const imBau = (a.welt?.im_bau || []).filter((x) => x.wunder === w.id);
    let status, klasse = '';
    if (fertig) {
      const mein = b.volk === Z.volk;
      klasse = mein ? '.mein' : '.weg';
      const st = stadtVon(b.stadt);
      status = el('div.re-status', { class: mein ? 'gold-t' : 'rot-t' }, symbol('ui', mein ? 'krone' : 'kreuz'), ' ', mein ? W.deins(st?.name || '?') : W.gebautVon(volk(b.volk)?.name || W.unbekannt, st?.name));
    } else if (imBau.length) {
      const teile = imBau.map((x) => {
        if (x.volk === Z.volk) {
          const st = eigeneStaedte().find((s) => (s.bau || []).some((bb) => bb.art === 'wunder' && bb.id === w.id));
          return el('div.gold-t', { text: W.beiDir(st?.name || '?', x.fertig_um ? dauerText(x.fertig_um - serverJetzt()) : '?') });
        }
        return el('div.blau-t', { text: W.beiAnderen(volk(x.volk)?.name || W.unbekannt) });
      });
      status = el('div.re-status', symbol('ui', 'bau'), ' ', W.imBau, ...teile);
    } else status = el('div.re-status.gruen-t', symbol('ui', 'haken'), ' ', W.frei);
    return el('div.eintrag' + klasse,
      symbol('wunder', w.id, { px: 96 }),
      el('div', { style: { flex: 1, minWidth: 0 } },
        el('b', { text: w.name }), el('div.klein', { text: ZEITALTER[w.zeitalter]?.name || '' }),
        status,
        el('div.klein', { text: w.beschreibung }),
        el('div.gruen-t.klein', { style: { marginTop: '3px' }, text: [...boniListe(w.reich), ...wirkungListe(w.wirkung)].join(' · ') }),
      ),
    );
  })));
}
