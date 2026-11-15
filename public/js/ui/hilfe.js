// "Was soll ich jetzt tun?": analysiert den Zustand des eigenen Volkes und gibt 3 bis 6 konkrete, anklickbare Tipps.
import { el, symbol, fenster, dauerText, alleFensterZu } from './basis.js';
import { T } from '../texte.js';
import { Z, du, volk, eigeneStaedte, eigeneEinheiten, aktuellesFeld, aktuellesGold, serverJetzt } from '../kern/zustand.js';
import { EINHEIT, FREIGESCHALTET_DURCH, WUNDER } from '../../shared/daten/index.js';
import { abstand } from '../../shared/hex.js';
import { springe, waehle, einkommenFenster } from './hud.js';
import * as F from './fenster.js';

const H = T.hilfe;
const ZIVIL = new Set(['zivil', 'spaeher', 'haendler', 'see_zivil', 'sanitaeter']);

const CSS = `
.hilfe-tipps { display: flex; flex-direction: column; gap: 6px; margin: 8px 0 4px; }
.hilfe-tipp { display: flex; gap: 12px; align-items: center; background: var(--panel2); border: 2px solid var(--rand); padding: 8px 10px; cursor: pointer; text-align: left; color: var(--text); font-family: var(--schrift); font-size: 15px; width: 100%; }
.hilfe-tipp:hover { background: #283048; }
.hilfe-tipp.wichtig { border-color: #8a6420; box-shadow: inset 3px 0 0 var(--gold); }
.hilfe-tipp .sym { flex: none; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: #161a26; border: 2px solid var(--rand); }
.hilfe-tipp .sym canvas { width: 36px; height: 36px; object-fit: contain; }
.hilfe-tipp .txt { flex: 1; min-width: 0; }
.hilfe-tipp .txt b { display: block; margin-bottom: 2px; font-size: 16px; }
.hilfe-tipp .txt span { font-size: 13px; color: var(--text2); line-height: 1.35; display: block; }
.hilfe-tipp .los { flex: none; white-space: nowrap; }
.hilfe-tasten { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px; }
.hilfe-tasten > div { min-width: 0; }
.hilfe-tasten table { width: 100%; border-collapse: collapse; }
.hilfe-tasten table td { padding: 5px 6px; border-bottom: 1px solid #353d52; vertical-align: middle; }
.hilfe-tasten table td:first-child { width: 42%; }
.hilfe-tasten kbd { display: inline-block; font-family: var(--kopf); font-size: 11px; background: #3a4561; border: 2px solid var(--rand); box-shadow: inset 1px 1px 0 #56638a; padding: 3px 6px; line-height: 1.3; }
@media (max-width: 560px) { .hilfe-tipp .los { display: none; } }`;
function stil() { if (!document.getElementById('hilfe-stil')) document.head.append(el('style#hilfe-stil', { text: CSS })); }

/** Wählt eine Einheit aus und springt zu ihr. */
function zuEinheit(e) { alleFensterZu(); waehle({ art: 'einheit', id: e.id }); springe(aktuellesFeld(e)); }
function zuStadt(s, reiter) { alleFensterZu(); waehle({ art: 'stadt', id: s.id }); springe(s.feld); if (reiter !== undefined) F.stadt(s.id, reiter); }
const istFrei = (art, id) => { const f = FREIGESCHALTET_DURCH[art + ':' + id]; return !f || !!du()?.forschung?.erforscht?.[f]; };
const untaetig = (e) => !e.pfad?.length && !e.arbeit && !e.route && !e.in && !e.einsatz && !['schlafen', 'befestigt', 'erkunden', 'auto_arbeit'].includes(e.modus);
const baut = (s, id) => [...(s.bau || []), ...(s.schlange || [])].some((b) => b.id === id);

/** Sammelt Tipps: { prio (höher = wichtiger), sym: [kategorie, id, opt], titel, text, knopf, aktion, wichtig } */
export function tippsSammeln() {
  const d = du(); if (!d) return [];
  const tipps = [];
  const add = (prio, sym, t, aktion, wichtig = false) => tipps.push({ prio, sym, ...t, aktion, wichtig });
  const staedte = eigeneStaedte();
  const einheiten = eigeneEinheiten();
  const farbe = d.farbe;
  const jetzt = serverJetzt();

  // Keine Stadt
  const siedler = einheiten.filter((e) => e.typ === 'siedler' || EINHEIT[e.typ]?.faehigkeiten?.includes('gruenden'));
  if (!staedte.length) {
    if (siedler.length) add(100, ['einheit', siedler[0].typ, { farbe }], H.t.gruenden, () => zuEinheit(siedler[0]), true);
    else add(100, ['ui', 'einstellungen'], H.t.neuanfang, () => { alleFensterZu(); F.einstellungen(); }, true);
  }
  // Keine Forschung
  if (!d.forschung?.aktiv) add(95, ['ui', 'forschung'], H.t.forschung, () => { alleFensterZu(); F.forschung(); }, true);
  // Städte ohne Bauauftrag
  const ohneBau = staedte.filter((s) => !(s.bau || []).length && !(s.schlange || []).length);
  if (ohneBau.length) add(90, ['stadt', 'stadt', { farbe, zeitalter: d.zeitalter || 0, groesse: 1 }], H.t.bau(ohneBau.length, ohneBau[0].name), () => zuStadt(ohneBau[0], 'bauen'), true);
  // Gold negativ
  const rate = d.raten?.gold || 0;
  if (rate < 0 && aktuellesGold() < -rate * 12) add(88, ['ui', 'gold'], H.t.gold(Math.abs(Math.round(rate))), () => { alleFensterZu(); einkommenFenster(); }, true);
  // Offene Angebote an mich
  const angebote = Object.values(Z.ansicht?.angebote || {}).filter((a) => a.an === Z.volk || (a.parteien && a.parteien.includes?.(Z.volk) && a.von !== Z.volk && !a.zustimmung?.[Z.volk]));
  if (angebote.length) {
    const a = angebote[0];
    const andere = a.an === Z.volk && a.von != null ? a.von : (a.parteien || []).find((x) => x !== Z.volk) ?? a.von;
    add(85, ['ui', 'handel'], H.t.angebot(volk(andere)?.name || '?'), () => { alleFensterZu(); F.diplomatie(andere); }, true);
  }
  // Krieg
  const kriege = Object.entries(Z.ansicht?.diplomatie || {}).filter(([, x]) => x.krieg).map(([id]) => volk(id)).filter((v) => v && v.art !== 'barbar' && v.art !== 'tiere');
  if (kriege.length) add(70, ['ui', 'krieg'], H.t.krieg(kriege[0].name), () => { alleFensterZu(); F.diplomatie(kriege[0].id); });
  // Unzufriedene Städte
  const unzufrieden = staedte.filter((s) => (s.raten?.zufriedenheit ?? 0) < 0).sort((a, b) => a.raten.zufriedenheit - b.raten.zufriedenheit);
  if (unzufrieden.length) add(65, ['ui', 'unzufrieden'], H.t.unzufrieden(unzufrieden[0].name, unzufrieden[0].raten.zufriedenheit), () => zuStadt(unzufrieden[0], 'bauen'));
  // Siedler unterwegs ohne Ziel (wenn schon Städte da sind)
  if (staedte.length) { const s = siedler.find(untaetig); if (s) add(72, ['einheit', s.typ, { farbe }], H.t.siedlerDa, () => zuEinheit(s)); }
  // Späher untätig
  const spaeher = einheiten.find((e) => EINHEIT[e.typ]?.klasse === 'spaeher' && untaetig(e));
  if (spaeher) add(68, ['einheit', spaeher.typ, { farbe }], H.t.spaeher, () => zuEinheit(spaeher));
  // Arbeiter ohne Auftrag
  const arbeiter = einheiten.filter((e) => { const f = EINHEIT[e.typ]?.faehigkeiten || []; return (f.includes('arbeiten') || f.includes('see_arbeiten')) && untaetig(e); });
  if (arbeiter.length && staedte.length) add(66, ['einheit', arbeiter[0].typ, { farbe }], H.t.arbeiter(arbeiter.length), () => zuEinheit(arbeiter[0]));
  // Beförderung möglich
  const bef = einheiten.find((e) => e.befoerderbar);
  if (bef) add(62, ['ui', 'befoerderung'], H.t.befoerdern(EINHEIT[bef.typ]?.name || '?'), () => zuEinheit(bef));
  // Karawane ohne Route
  const karawane = einheiten.find((e) => EINHEIT[e.typ]?.faehigkeiten?.includes('handel') && !e.route && untaetig(e));
  if (karawane) add(60, ['einheit', karawane.typ, { farbe }], H.t.karawane, () => zuEinheit(karawane));
  // Untätige Militäreinheiten
  const mil = einheiten.filter((e) => { const k = EINHEIT[e.typ]?.klasse; return k && !ZIVIL.has(k) && untaetig(e); });
  if (mil.length) add(50, ['einheit', mil[0].typ, { farbe }], H.t.untaetig(mil.length, EINHEIT[mil[0].typ].name), () => zuEinheit(mil[0]));
  // Barbarenlager nahe den eigenen Städten
  const lager = Object.values(Z.ansicht?.lager || {}).map((l) => ({ l, d: Math.min(99, ...staedte.map((s) => abstand(s.feld, l.feld))) })).filter((x) => x.d <= 9).sort((a, b) => a.d - b.d)[0];
  if (lager) add(58, ['ui', 'pluendern'], H.t.lager, () => { alleFensterZu(); springe(lager.l.feld); });
  // Neulingsschutz endet bald
  const rest = (d.schutz_bis || 0) - jetzt;
  if (rest > 0 && rest < 4 * 3600000) add(56, ['ui', 'schild'], H.t.schutz(dauerText(rest)), () => F.lexikon('regel', 'neulingsschutz'));
  // Weitere Städte gründen
  const hauptstadt = staedte.find((s) => s.hauptstadt) || staedte[0];
  if (hauptstadt && staedte.length < 4 && !siedler.length && !staedte.some((s) => baut(s, 'siedler'))) add(54, ['einheit', 'siedler', { farbe }], H.t.siedler, () => zuStadt(hauptstadt, 'bauen'));
  // Handelsroute möglich
  if (hauptstadt && !karawane && (d.routenKapazitaet || 0) > (d.routen || 0) && istFrei('einheit', 'karawane') && !einheiten.some((e) => EINHEIT[e.typ]?.faehigkeiten?.includes('handel') && !e.route) && !staedte.some((s) => baut(s, 'karawane'))) {
    add(48, ['einheit', 'karawane', { farbe }], H.t.handel, () => zuStadt(hauptstadt, 'bauen'));
  }
  // Stadtstaat befreunden
  const ss = Object.values(Z.ansicht?.voelker || {}).filter((v) => v.art === 'stadtstaat' && v.bekannt && (v.einfluss || 0) < 30).sort((a, b) => (b.einfluss || 0) - (a.einfluss || 0))[0];
  if (ss && staedte.length && aktuellesGold() > 120) add(40, ['stadt', 'stadtstaat', { farbe: ss.farbe }], H.t.stadtstaat(ss.name), () => { alleFensterZu(); F.diplomatie(ss.id); });
  // Allgemeine Ideen (immer mögliche Füller)
  add(20, ['ui', 'erkunden'], H.t.erkunden, () => F.lexikon('regel', 'bewegung'));
  const wunderFrei = WUNDER.some((w) => !Z.ansicht?.wunder?.[w.id]?.fertig && istFrei('wunder', w.id));
  if (wunderFrei && staedte.length >= 2) add(18, ['ui', 'wunder'], H.t.wunder, () => F.lexikon('wunder', null));
  add(15, ['ui', 'lexikon'], H.t.regeln, () => F.lexikon('regel', null));
  add(12, ['ui', 'rangliste'], H.t.rangliste, () => { alleFensterZu(); F.rangliste(); });
  return tipps.sort((a, b) => b.prio - a.prio);
}

function tippKnopf(t) {
  const [kat, id, o] = t.sym;
  return el('button.hilfe-tipp' + (t.wichtig ? '.wichtig' : ''), { onclick: () => t.aktion() },
    el('div.sym', symbol(kat, id, { ...(o || {}), px: 36 })),
    el('div.txt', el('b', { text: t.titel }), el('span', { text: t.text })),
    el('span.los.knopf.klein' + (t.wichtig ? '.gold' : ''), t.knopf, ' ›'));
}

export function oeffneHilfe() {
  stil();
  let liste = tippsSammeln();
  const dringend = liste.filter((t) => t.prio >= 40);
  const anzahl = Math.max(3, Math.min(6, dringend.length));
  liste = liste.slice(0, anzahl);
  const f = fenster(H.titel, (i) => {
    i.append(el('p', { text: dringend.length ? H.einleitung : H.allesGut, style: { marginTop: 0 } }));
    i.append(el('div.hilfe-tipps', liste.map(tippKnopf)));
  }, { breite: 'mittel', fuss: true, symbol: symbol('ui', 'hilfe', { px: 24 }) });
  f.fuss.style.justifyContent = 'flex-start';
  f.fuss.append(
    el('button.knopf', { onclick: async () => { f.schliessen(); (await import('./tutorial.js')).starten(); } }, symbol('ui', 'haken'), H.tutorial),
    el('button.knopf', { onclick: () => F.lexikon() }, symbol('ui', 'lexikon'), H.lexikon),
    el('button.knopf', { onclick: tastenFenster }, symbol('ui', 'menue'), H.tasten),
  );
  return f;
}

export function tastenFenster() {
  stil();
  const tab = (titel, l) => el('div', el('h3', { text: titel }), el('table', l.map(([k, t]) => el('tr', el('td', el('kbd', { text: k })), el('td', { text: t })))));
  fenster(H.tastenTitel, (i) => i.append(el('div.hilfe-tasten', tab(H.tastatur, H.tastenListe), tab(H.maus, H.mausListe), tab(H.touch, H.touchListe))), { breite: 'mittel', symbol: symbol('ui', 'menue', { px: 24 }) });
}
