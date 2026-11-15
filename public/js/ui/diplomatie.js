// Diplomatie-Fenster: Liste der Völker, Detailansicht mit Aktionen, Angebote, Tausch-Editor, Schutzregeln.
import { el, symbol, fenster, frageJaNein, toast, fehler, zahl, dauerText, balken } from './basis.js';
import { T } from '../texte.js';
import { Z, an, du, volk, serverJetzt, aktuellesGold, aktuellesLager } from '../kern/zustand.js';
import { befehl } from '../kern/netz.js';
import { FORSCHUNG, FREIGESCHALTET_DURCH, STADTSTAATEN, KI_VOELKER, ZEITALTER } from '../../shared/daten/index.js';
import { ROHSTOFFE, LAGERGUETER, LAGER_NAMEN, ROHSTOFF_NACH_ID } from '../../shared/daten/rohstoffe.js';
import { STADTSTAAT, SCHUTZ, FORSCHUNGSABKOMMEN } from '../../shared/regeln.js';
import * as fenster_ from './fenster.js';

const D = () => T.diplo;
const LUXUS = ROHSTOFFE.filter((r) => r.art === 'luxus');
const ARTEN = ['spieler', 'ki', 'stadtstaat'];

let stilDa = false;
function stil() {
  if (stilDa) return; stilDa = true;
  document.head.append(el('style', { text: `
.diplo-fenster { height: min(860px, 100%); }
.diplo-fenster > .inhalt { display: flex; padding: 0; overflow: hidden; }
.diplo-wurzel { display: grid; grid-template-columns: 330px 1fr; flex: 1; min-height: 0; width: 100%; }
.diplo-liste { overflow: auto; padding: 8px; border-right: 3px solid var(--rand); background: #20263a; display: flex; flex-direction: column; gap: 5px; }
.diplo-detail { overflow: auto; padding: 10px 14px; min-width: 0; }
.diplo-liste > * { flex: none; }
.diplo-gruppe { font-family: var(--kopf); font-size: 12px; color: var(--text2); margin: 8px 2px 0; display: flex; justify-content: space-between; }
.diplo-eintrag { background: var(--panel2); border: 2px solid var(--rand); padding: 6px 7px; cursor: pointer; display: grid; grid-template-columns: 14px 1fr auto; gap: 3px 8px; align-items: center; min-height: 44px; text-align: left; color: var(--text); width: 100%; font: inherit; }
.diplo-eintrag:hover { background: #283048; }
.diplo-eintrag.an { border-color: var(--akzent); background: #2d3550; box-shadow: inset 0 0 0 1px var(--akzent); }
.diplo-eintrag.unbekannt { opacity: .6; cursor: default; }
.diplo-eintrag .unter { grid-column: 2 / 4; font-size: 12px; color: var(--text2); display: flex; flex-wrap: wrap; gap: 3px 8px; align-items: center; }
.diplo-farbe { width: 14px; height: 14px; border: 2px solid var(--rand); display: inline-block; flex: none; }
.diplo-farbe.gross { width: 28px; height: 28px; border-width: 3px; }
.diplo-name { font-family: var(--kopf); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.diplo-punkt { width: 9px; height: 9px; display: inline-block; border: 1px solid #000; background: #59606f; flex: none; }
.diplo-punkt.on { background: #5fdd4a; box-shadow: 0 0 4px #5fdd4a; }
.diplo-marke { font-size: 11px; font-family: var(--kopf); padding: 1px 5px; border: 1px solid var(--rand); background: #343c52; white-space: nowrap; display: inline-flex; align-items: center; gap: 3px; }
.diplo-marke.krieg { background: #6a2218; color: #ffd0c8; } .diplo-marke.ruhe { background: #3a3550; color: #d6c8ff; }
.diplo-marke.frieden { background: #2b4430; color: #c8f0c0; } .diplo-marke.grenzen { background: #24405a; color: #c8e4ff; }
.diplo-marke.buendnis { background: #5a4818; color: #ffe9a8; } .diplo-marke.schutz { background: #203a5a; color: #bfe0ff; }
.diplo-marke.freund { background: #2b4430; color: #c8f0c0; }
.diplo-ein { position: relative; height: 12px; background: #0b0d14; border: 2px solid var(--rand); margin: 3px 0; }
.diplo-ein > i { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(#7fd36a, #4a9c3a); }
.diplo-ein > i.neg { background: linear-gradient(#ff7a66, #b8341f); }
.diplo-ein > b { position: absolute; top: -3px; bottom: -3px; width: 2px; background: var(--gold); }
.diplo-ein.klein { height: 8px; border-width: 1px; margin: 1px 0; width: 100%; }
.diplo-ein.klein > b { top: 0; bottom: 0; width: 1px; }
.diplo-kopf { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; }
.diplo-kopf h2 { margin: 0; font-size: 20px; }
.diplo-box { background: var(--panel2); border: 2px solid var(--rand); padding: 8px 10px; margin: 8px 0; }
.diplo-box.regeln { background: #1f2a3a; }
.diplo-box.regeln li { margin: 3px 0; }
.diplo-box ul { margin: 4px 0; padding-left: 18px; }
.diplo-aktionen { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 6px; }
.diplo-aktion { display: flex; flex-direction: column; gap: 3px; }
.diplo-aktion .knopf { justify-content: flex-start; width: 100%; text-align: left; }
.diplo-aktion .grund { font-size: 12px; color: var(--text2); }
.diplo-aktion .grund a { color: var(--blau); cursor: pointer; text-decoration: underline; }
.diplo-angebot { background: var(--panel2); border: 2px solid var(--rand); padding: 7px 9px; margin: 5px 0; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.diplo-angebot .text { flex: 1; min-width: 220px; }
.diplo-angebot .knoepfe { display: flex; gap: 5px; flex-wrap: wrap; }
.diplo-angebot.auto { border-color: #7a6220; }
.diplo-zahl { background: #0e1119; color: var(--text); border: 2px solid var(--rand); box-shadow: inset 2px 2px 0 #000; padding: 5px 6px; width: 90px; min-height: 34px; }
.diplo-regler { width: 100%; accent-color: var(--akzent); min-height: 30px; }
.diplo-zwei { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.diplo-tausch-seite { background: var(--panel2); border: 2px solid var(--rand); padding: 8px; min-width: 0; }
.diplo-tausch-seite h2 { display: flex; gap: 6px; align-items: center; }
.diplo-gueter { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 4px; }
.diplo-gut { display: flex; align-items: center; gap: 5px; padding: 2px 4px; background: #191e2c; }
.diplo-gut span { flex: 1; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.diplo-gut .diplo-zahl { width: 70px; }
.diplo-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.diplo-chips .knopf { font-size: 13px; }
.diplo-zeile { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.diplo-detail h3, .diplo-tausch-seite h3 { margin-top: 12px; }
.diplo-zusammen { flex: 1; min-width: 240px; font-size: 13px; align-self: center; }
@media (max-width: 860px) {
  .diplo-wurzel { grid-template-columns: 250px 1fr; }
  .diplo-zwei { grid-template-columns: 1fr; }
}
@media (max-width: 620px) {
  .diplo-fenster > .inhalt { overflow: auto; display: block; }
  .diplo-wurzel { grid-template-columns: 1fr; }
  .diplo-liste { border-right: 0; border-bottom: 3px solid var(--rand); max-height: 40vh; }
}
` }));
}

// ---------- Hilfen ----------
const jetzt = () => serverJetzt();
const diploMit = (id) => Z.ansicht?.diplomatie?.[id] || {};
const hatOption = (opt) => { const f = FREIGESCHALTET_DURCH['option:' + opt]; return !f || !!du()?.forschung?.erforscht?.[f]; };
const fehlendeForschung = (opt) => { const f = FREIGESCHALTET_DURCH['option:' + opt]; return f && !du()?.forschung?.erforscht?.[f] ? f : null; };
const kiVorlage = (o) => KI_VOELKER.find((k) => k.id === o.vorlage || k.name === o.name);
const ssVorlage = (o) => STADTSTAATEN.find((s) => s.id === o.vorlage);
const farbe = (o, gross) => el('span.diplo-farbe' + (gross ? '.gross' : ''), { style: { background: o?.farbe || '#555' } });
const punkt = (o) => el('span.diplo-punkt' + (o.online ? '.on' : ''), { tip: o.online ? D().online : D().offline });
const marke = (text, art, sym) => el('span.diplo-marke' + (art ? '.' + art : ''), sym ? symbol('ui', sym, { px: 12 }) : null, text);

/** Status-Marken eines Volkes aus Sicht des Spielers. */
function statusMarken(o) {
  const d = diploMit(o.id), m = [];
  if (o.schutz_bis > jetzt()) m.push(marke(D().status.schutz, 'schutz', 'schild'));
  if (d.krieg) m.push(o.angreifbar ? marke(D().status.krieg, 'krieg', 'krieg') : marke(D().status.waffenruhe, 'ruhe', 'schlafen'));
  else if (d.buendnis) m.push(marke(D().status.buendnis, 'buendnis', 'buendnis'));
  else if (d.offene_grenzen) m.push(marke(D().status.grenzen, 'grenzen', 'offene_grenzen'));
  else m.push(marke(D().status.frieden, 'frieden', 'frieden'));
  if (o.art === 'stadtstaat') {
    if (o.verbuendet === Z.volk) m.push(marke(D().ss.verbuendet, 'buendnis', 'krone'));
    else if ((o.einfluss || 0) >= STADTSTAAT.freund) m.push(marke(D().ss.freund, 'freund', 'zufriedenheit'));
  }
  return m;
}

function stimmungText(s) {
  const st = D().stimmung;
  if (s >= 25) return [st.freundlich, 'gruen-t'];
  if (s >= -5) return [st.neutral, ''];
  if (s >= -40) return [st.misstrauisch, 'gold-t'];
  return [st.feindselig, 'rot-t'];
}

/** Einfluss-Balken (0..100 sichtbar) mit Schwellen 30 und 60. */
function einflussBalken(wert, klein) {
  const w = Math.max(-60, Math.min(150, wert || 0));
  const breite = Math.min(100, Math.abs(w));
  return el('div.diplo-ein' + (klein ? '.klein' : ''),
    el('i' + (w < 0 ? '.neg' : ''), { style: { width: breite + '%' } }),
    el('b', { style: { left: STADTSTAAT.freund + '%' } }), el('b', { style: { left: STADTSTAAT.verbuendet + '%' } }));
}

function boniText(b) { return Object.entries(b || {}).map(([k, x]) => (D().boni[k] ? D().boni[k](x) : `${k}: ${x}`)); }

function angebotsArtName(art) { return D().arten[art] || art; }

/** Beschreibt eine Tausch-Seite als Text. */
function tauschText(t) {
  if (!t) return D().nichts;
  const teile = [];
  if (t.gold) teile.push(`${zahl(t.gold)} ${LAGER_NAMEN.gold}`);
  for (const [g, n] of Object.entries(t.lager || {})) teile.push(`${zahl(n)} ${LAGER_NAMEN[g] || g}`);
  for (const l of t.luxus || []) teile.push(ROHSTOFF_NACH_ID[l]?.name || l);
  if (t.karte) teile.push(D().tausch.karte);
  return teile.length ? teile.join(', ') : D().nichts;
}

/** Kann ich das Angebot (art) an o gerade machen? Liefert null oder Grund. */
function angebotLiegtVor(o, art) { return Object.values(Z.ansicht?.angebote || {}).some((a) => a.von === Z.volk && a.an === o.id && a.art === art); }

async function sende(b, erfolgText) {
  const r = await befehl(b);
  if (!r?.ok) { fehler(r?.fehler || D().unbekannterFehler); return null; }
  if (erfolgText) toast(erfolgText, 'erfolg', { symbol: 'diplomatie' });
  return r;
}

// ---------- Hauptfenster ----------
export function oeffneDiplomatie(volkId) {
  stil();
  const zustand = { auswahl: volkId != null && volk(volkId) ? +volkId : 'uebersicht', geschenk: 100 };
  let liste, detail, aus;
  const f = fenster(D().titel, (innen) => {
    liste = el('div.diplo-liste');
    detail = el('div.diplo-detail');
    innen.append(el('div.diplo-wurzel', liste, detail));
  }, { symbol: symbol('ui', 'diplomatie', { px: 22 }), beiSchliessen: () => aus?.() });
  f.element.classList.add('diplo-fenster');

  const zeichne = (nurListe) => {
    if (!Z.ansicht) return;
    listeZeichnen(liste, zustand, () => zeichne());
    if (nurListe) return;
    const st = detail.scrollTop;
    if (zustand.auswahl === 'uebersicht' || !volk(zustand.auswahl)) uebersichtZeichnen(detail);
    else detailZeichnen(detail, volk(zustand.auswahl), zustand, () => zeichne());
    detail.scrollTop = st;
  };
  zeichne();
  aus = an('aenderung', (x) => {
    if (!f.element.isConnected) return;
    if (!(x.voll || ['voelker', 'diplomatie', 'angebote', 'welt'].some((g) => x.gruppen?.has(g)))) return;
    // Nicht mitten in einer Eingabe neu zeichnen
    const fokus = document.activeElement;
    zeichne(fokus && detail.contains(fokus) && fokus.tagName === 'INPUT');
  });
}

function listeZeichnen(liste, zustand, neu) {
  const ich = Z.volk;
  const alle = Object.values(Z.ansicht.voelker || {}).filter((o) => o.id !== ich && ARTEN.includes(o.art));
  const angebote = Object.values(Z.ansicht.angebote || {});
  const offen = angebote.filter((a) => (a.an === ich) || (a.auto && !a.zustimmung?.[ich])).length;
  const kinder = [];
  kinder.push(el('div.diplo-eintrag' + (zustand.auswahl === 'uebersicht' ? '.an' : ''), { role: 'button', tabindex: 0, onclick: () => { zustand.auswahl = 'uebersicht'; neu(); } },
    symbol('ui', 'meldung', { px: 14 }), el('span.diplo-name', { text: D().uebersicht }),
    offen ? el('span.diplo-marke.buendnis', { text: D().neu(offen) }) : el('span'),
    el('span.unter', { text: D().uebersichtUnter(angebote.length) })));
  for (const art of ARTEN) {
    const bekannt = alle.filter((o) => o.art === art && o.bekannt).sort((a, b) => a.name.localeCompare(b.name, 'de'));
    const unbekannt = alle.filter((o) => o.art === art && !o.bekannt).length;
    if (!bekannt.length && !unbekannt) continue;
    kinder.push(el('div.diplo-gruppe', el('span', { text: D().gruppen[art] }), el('span', { text: `${bekannt.length}/${bekannt.length + unbekannt}` })));
    for (const o of bekannt) {
      const unter = [el('span', { text: ZEITALTER[o.zeitalter]?.name || '' }), ...statusMarken(o)];
      if (o.art === 'ki') { const [t, k] = stimmungText(o.stimmung || 0); unter.push(el('span', { class: k, text: t })); }
      const zeile = el('div.diplo-eintrag' + (zustand.auswahl === o.id ? '.an' : ''), { role: 'button', tabindex: 0, onclick: () => { zustand.auswahl = o.id; neu(); } },
        farbe(o), el('span.diplo-name', { text: o.name }), punkt(o), el('span.unter', unter));
      if (o.art === 'stadtstaat') zeile.append(el('span.unter', { style: { display: 'block' } }, einflussBalken(o.einfluss, true)));
      kinder.push(zeile);
    }
    if (unbekannt) kinder.push(el('div.diplo-eintrag.unbekannt', { tip: D().unbekanntTip },
      el('span.diplo-farbe', { style: { background: '#2a2f3c' } }), el('span.diplo-name', { text: '???' }), el('span'),
      el('span.unter', { text: D().unbekannt(unbekannt, art) })));
  }
  liste.replaceChildren(...kinder);
  liste.onkeydown = (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.getAttribute?.('role') === 'button') { e.preventDefault(); e.target.click(); } };
}

// ---------- Übersicht: Angebote + Regeln ----------
function uebersichtZeichnen(ziel) {
  const d = du();
  const k = [el('h2', { text: D().angebote })];
  const angebote = Object.values(Z.ansicht.angebote || {}).sort((a, b) => (b.t || 0) - (a.t || 0));
  k.push(...angeboteBloecke(angebote, true));
  // Eigener Status
  const status = [];
  if (d.schutz_bis > jetzt()) status.push(el('div', symbol('ui', 'schild'), ' ', T.neulingsschutz(dauerText(d.schutz_bis - jetzt()))));
  if (d.abkommen_bis > jetzt()) status.push(el('div', symbol('ui', 'forschungsabkommen'), ' ', D().abkommenLaeuft(dauerText(d.abkommen_bis - jetzt()), FORSCHUNGSABKOMMEN.bonus)));
  for (const t of Z.ansicht.welt?.tribute || []) {
    const v = t.von === Z.volk ? volk(t.an) : volk(t.von);
    status.push(el('div', symbol('ui', 'tribut'), ' ', t.an === Z.volk ? D().tributBekommst(v?.name, t.gold, dauerText(t.bis - jetzt())) : D().tributZahlst(v?.name, t.gold, dauerText(t.bis - jetzt()))));
  }
  if (status.length) k.push(el('h3', { text: D().deinStatus }), el('div.diplo-box', status));
  k.push(regelBox());
  ziel.replaceChildren(...k);
}

function regelBox() {
  const r = D().regeln;
  return el('div.diplo-box.regeln', el('h3', symbol('ui', 'schild'), ' ', r.titel), el('ul', r.punkte.map((p) => el('li', { text: p }))));
}

/** Angebots-Abschnitte (eingehend, ausgehend, Friedensvorschläge). mitLeer: Hinweis, wenn nichts da ist. */
function angeboteBloecke(angebote, mitLeer) {
  const ich = Z.volk;
  const auto = angebote.filter((a) => a.auto);
  const ein = angebote.filter((a) => !a.auto && a.an === ich);
  const ausg = angebote.filter((a) => !a.auto && a.von === ich);
  const k = [];
  if (auto.length) k.push(el('h3', { text: D().autoTitel }), ...auto.map(autoAngebot));
  if (ein.length || mitLeer) k.push(el('h3', { text: D().eingehend }), ...(ein.length ? ein.map((a) => angebotZeile(a, true)) : [el('p.klein', { text: D().keineEingehend })]));
  if (ausg.length || mitLeer) k.push(el('h3', { text: D().ausgehend }), ...(ausg.length ? ausg.map((a) => angebotZeile(a, false)) : [el('p.klein', { text: D().keineAusgehend })]));
  return k;
}

function seit(t) { return t ? D().vor(dauerText(jetzt() - t)) : ''; }

function angebotZeile(a, eingehend) {
  const anderer = volk(eingehend ? a.von : a.an);
  const name = anderer?.name || '???';
  const text = el('div.text');
  text.append(el('div', farbe(anderer), ' ', el('b', { text: eingehend ? D().vonVolk(name) : D().anVolk(name) }), ' · ', el('span.gold-t', { text: angebotsArtName(a.art) }), el('span.klein', { text: '  ' + seit(a.t) })));
  if (a.art === 'tausch') {
    const bekomme = eingehend ? a.gibt : a.will, gebe = eingehend ? a.will : a.gibt;
    text.append(el('div.klein', el('span.gruen-t', { text: D().duBekommst + ': ' }), tauschText(bekomme)), el('div.klein', el('span.rot-t', { text: D().duGibst + ': ' }), tauschText(gebe)));
  } else if (a.art === 'forschungsabkommen') text.append(el('div.klein', { text: D().abkommenKosten(a.kosten, FORSCHUNGSABKOMMEN.bonus) }));
  else if (D().artErklaerung[a.art]) text.append(el('div.klein', { text: D().artErklaerung[a.art] }));
  const knoepfe = el('div.knoepfe');
  if (eingehend) {
    knoepfe.append(
      el('button.knopf.gruen', { onclick: () => sende({ art: 'angebot_antwort', id: a.id, annehmen: true }, D().angenommen) }, symbol('ui', 'haken'), D().annehmen),
      el('button.knopf.rot', { onclick: () => sende({ art: 'angebot_antwort', id: a.id, annehmen: false }, D().abgelehnt) }, symbol('ui', 'kreuz'), D().ablehnen));
  } else {
    knoepfe.append(el('button.knopf', { onclick: () => sende({ art: 'angebot_zurueckziehen', id: a.id }, D().zurueckgezogen) }, symbol('ui', 'pfeil_links'), D().zurueckziehen));
  }
  return el('div.diplo-angebot', symbol('ui', symbolFuer(a.art), { px: 24 }), text, knoepfe);
}

function symbolFuer(art) { return { frieden: 'frieden', offene_grenzen: 'offene_grenzen', buendnis: 'buendnis', forschungsabkommen: 'forschungsabkommen', tausch: 'handel', tribut: 'tribut' }[art] || 'diplomatie'; }

function autoAngebot(a) {
  const ich = Z.volk;
  const anderer = volk(a.parteien.find((x) => x !== ich));
  const zust = a.parteien.map((x) => {
    const v = x === ich ? { name: D().du, farbe: du().farbe } : volk(x);
    const ok = !!a.zustimmung?.[x];
    return el('span.diplo-marke' + (ok ? '.frieden' : ''), symbol('ui', ok ? 'haken' : 'uhr', { px: 12 }), `${v?.name || '???'}: ${ok ? D().zugestimmt : D().wartet}`);
  });
  const text = el('div.text',
    el('div', el('b', { text: D().autoText(anderer?.name || '???') }), el('span.klein', { text: '  ' + seit(a.t) })),
    el('div.klein', { text: D().autoErklaerung }),
    el('div.diplo-zeile', { style: { marginTop: '4px' } }, zust));
  const knoepfe = el('div.knoepfe');
  if (!a.zustimmung?.[ich]) knoepfe.append(
    el('button.knopf.gruen', { onclick: () => sende({ art: 'angebot_antwort', id: a.id, annehmen: true }, D().zustimmungGesendet) }, symbol('ui', 'frieden'), D().zustimmen),
    el('button.knopf.rot', { onclick: async () => { if (await frageJaNein(D().ablehnenTitel, D().autoAblehnenFrage, D().ablehnen)) sende({ art: 'angebot_antwort', id: a.id, annehmen: false }); } }, symbol('ui', 'krieg'), D().ablehnen));
  else knoepfe.append(el('span.klein', { text: D().wartetAuf(anderer?.name || '???') }));
  return el('div.diplo-angebot.auto', symbol('ui', 'frieden', { px: 24 }), text, knoepfe);
}

// ---------- Detailansicht ----------
function detailZeichnen(ziel, o, zustand, neu) {
  const d = diploMit(o.id);
  const k = [];
  const unterzeile = [el('span', { text: D().arten_volk[o.art] }), ' · ', el('span', { text: `${T.zeitalter}: ${ZEITALTER[o.zeitalter]?.name || ''}` }), ' · ', punkt(o), ' ', el('span', { text: o.online ? D().online : D().offline })];
  k.push(el('div.diplo-kopf', farbe(o, true), el('div', { style: { flex: 1, minWidth: 0 } }, el('h2', { text: o.name }), el('div.klein', unterzeile)), el('div.diplo-zeile', statusMarken(o))));

  // Beziehung
  const bez = [];
  if (d.krieg) {
    bez.push(el('div', el('b.rot-t', { text: D().imKrieg }), d.seit ? ` ${D().seit(dauerText(jetzt() - d.seit))}` : ''));
    if (d.letzter_kampf) {
      const rest = SCHUTZ.friedensvorschlagNach - (jetzt() - d.letzter_kampf);
      bez.push(el('div.klein', { text: D().letzterKampf(dauerText(jetzt() - d.letzter_kampf)) + ' ' + (rest > 0 ? D().vorschlagIn(dauerText(rest)) : D().vorschlagBald) }));
    }
    if (!o.angreifbar) bez.push(el('div.lila-t', { text: D().waffenruheText(o.name) }));
  } else if (d.buendnis) bez.push(el('div.gold-t', { text: D().buendnisText }));
  else if (d.offene_grenzen) bez.push(el('div.blau-t', { text: D().grenzenText }));
  else bez.push(el('div.gruen-t', { text: D().friedenText }));
  if (o.schutz_bis > jetzt()) bez.push(el('div.blau-t', { text: D().schutzAndere(o.name, dauerText(o.schutz_bis - jetzt())) }));

  if (o.art === 'ki') {
    const v = kiVorlage(o);
    const p = D().persoenlichkeiten[o.persoenlichkeit] || { name: o.persoenlichkeit || '–', text: '' };
    const [st, sk] = stimmungText(o.stimmung || 0);
    k.push(el('div.diplo-box',
      el('div', el('b', { text: D().herrscher + ': ' }), o.herrscher || v?.herrscher || '–'),
      el('div', el('b', { text: D().persoenlichkeit + ': ' }), p.name, el('span.klein', { text: p.text ? ' – ' + p.text : '' })),
      el('div', el('b', { text: D().stimmungLabel + ': ' }), el('span', { class: sk, text: `${st} (${o.stimmung > 0 ? '+' : ''}${o.stimmung || 0})` })),
      v?.beschreibung ? el('p.klein', { style: { margin: '6px 0 0' }, text: v.beschreibung }) : null));
  }
  if (o.art === 'stadtstaat') k.push(stadtstaatBox(o));
  k.push(el('div.diplo-box', bez));

  // Aktionen
  k.push(el('h3', { text: D().aktionen }), el('div.diplo-aktionen', aktionen(o, d, zustand, neu)));

  // Angebote mit diesem Volk
  const mit = Object.values(Z.ansicht.angebote || {}).filter((a) => a.von === o.id || a.an === o.id || a.parteien?.includes(o.id));
  if (mit.length) k.push(el('h3', { text: D().angeboteMit(o.name) }), ...angeboteBloecke(mit, false));
  ziel.replaceChildren(...k);
}

function stadtstaatBox(o) {
  const v = ssVorlage(o);
  const e = o.einfluss || 0;
  const freund = e >= STADTSTAAT.freund, verb = o.verbuendet === Z.volk;
  const verbName = o.verbuendet == null ? D().ss.niemand : o.verbuendet === Z.volk ? D().du : (volk(o.verbuendet)?.bekannt ? volk(o.verbuendet).name : '???');
  const naechste = e < STADTSTAAT.freund ? D().ss.bisFreund(Math.ceil((STADTSTAAT.freund - e) * STADTSTAAT.goldJeEinfluss)) : e < STADTSTAAT.verbuendet ? D().ss.bisBuendnis(Math.ceil((STADTSTAAT.verbuendet - e) * STADTSTAAT.goldJeEinfluss)) : '';
  const bonusListe = (titel, b, aktiv) => el('div', { style: { opacity: aktiv ? 1 : 0.65 } }, el('b', { class: aktiv ? 'gruen-t' : '', text: titel + (aktiv ? ' ✓' : '') }), el('ul', boniText(b).map((x) => el('li', { text: x }))));
  const fehltSS = fehlendeForschung('stadtstaat_buendnis');
  return el('div.diplo-box',
    v?.beschreibung ? el('p', { style: { margin: '0 0 6px' }, text: v.beschreibung }) : null,
    el('div.diplo-zeile', el('b', { text: D().ss.einfluss + ': ' }), el('span', { class: e < 0 ? 'rot-t' : freund ? 'gruen-t' : '', text: zahl(e, 0) }), el('span.klein', { text: D().ss.schwellen(STADTSTAAT.freund, STADTSTAAT.verbuendet) })),
    einflussBalken(e),
    el('div.klein', { text: [naechste, D().ss.verfall(STADTSTAAT.verfallProStunde)].filter(Boolean).join(' ') }),
    el('div.diplo-zwei', { style: { marginTop: '6px' } }, bonusListe(D().ss.bonusFreund, v?.bonus, freund), bonusListe(D().ss.bonusBuendnis, v?.buendnis_bonus, verb)),
    fehltSS ? el('div.klein.gold-t', { text: D().ss.fehltBuendnis(FORSCHUNG[fehltSS]?.name) }) : null,
    el('div', el('b', { text: D().ss.verbuendeterLabel + ': ' }), el('span', { class: verb ? 'gold-t' : '', text: verbName })));
}

/** Aktions-Knopf mit Begründung, warum er gerade nicht geht. */
function aktion(sym, text, art, onclick, o = {}) {
  const fehlt = o.option ? fehlendeForschung(o.option) : null;
  const grund = fehlt ? el('span.grund', D().fehltForschung + ' ', el('a', { text: FORSCHUNG[fehlt]?.name || fehlt, onclick: () => fenster_.forschung(fehlt) })) : o.grund ? el('span.grund', { text: o.grund }) : o.info ? el('span.grund', { text: o.info }) : null;
  const aus = !!(fehlt || o.grund);
  return el('div.diplo-aktion', el('button.knopf' + (art ? '.' + art : ''), { disabled: aus, onclick: aus ? null : onclick, tip: o.tip }, symbol('ui', sym), text), grund, o.extra || null);
}

function aktionen(o, d, zustand, neu) {
  const l = [];
  const dd = du();
  const istSS = o.art === 'stadtstaat';
  if (!d.krieg) {
    let grund = null;
    if (o.schutz_bis > jetzt()) grund = D().gruende.schutz(dauerText(o.schutz_bis - jetzt()));
    else if (o.art === 'spieler' && !o.online) grund = D().gruende.offline;
    l.push(aktion('krieg', D().knoepfe.krieg, 'rot', () => kriegErklaeren(o), { option: 'krieg', grund, info: dd.schutz_bis > jetzt() ? D().gruende.eigenerSchutz : null }));
  } else {
    l.push(aktion('frieden', D().knoepfe.frieden, 'gruen', () => sende({ art: 'diplomatie_angebot', an: o.id, typ: 'frieden' }, D().gesendet), { option: 'frieden', grund: angebotLiegtVor(o, 'frieden') ? D().gruende.liegtVor : null, info: D().gruende.friedenInfo }));
  }
  if (!istSS) {
    if (!d.krieg && !d.offene_grenzen) l.push(aktion('offene_grenzen', D().knoepfe.grenzen, '', () => sende({ art: 'diplomatie_angebot', an: o.id, typ: 'offene_grenzen' }, D().gesendet), { option: 'offene_grenzen', grund: angebotLiegtVor(o, 'offene_grenzen') ? D().gruende.liegtVor : null, info: D().artErklaerung.offene_grenzen }));
    if (!d.krieg && !d.buendnis) l.push(aktion('buendnis', D().knoepfe.buendnis, '', () => sende({ art: 'diplomatie_angebot', an: o.id, typ: 'buendnis' }, D().gesendet), { option: 'buendnis', grund: angebotLiegtVor(o, 'buendnis') ? D().gruende.liegtVor : null, info: D().artErklaerung.buendnis }));
    if (!d.krieg) {
      const kosten = FORSCHUNGSABKOMMEN.kostenJeZeitalter * (1 + Math.max(dd.zeitalter || 0, o.zeitalter || 0));
      let grund = null;
      if (dd.abkommen_bis > jetzt()) grund = D().gruende.abkommenLaeuft(dauerText(dd.abkommen_bis - jetzt()));
      else if (angebotLiegtVor(o, 'forschungsabkommen')) grund = D().gruende.liegtVor;
      else if (aktuellesGold() < kosten) grund = D().gruende.zuWenigGold(kosten);
      l.push(aktion('forschungsabkommen', D().knoepfe.abkommen, '', () => sende({ art: 'diplomatie_angebot', an: o.id, typ: 'forschungsabkommen' }, D().gesendet), { option: 'forschungsabkommen', grund, info: D().abkommenKosten(kosten, FORSCHUNGSABKOMMEN.bonus) }));
    }
  }
  if ((o.art === 'ki' || istSS) && !d.krieg) {
    const zahlt = (Z.ansicht.welt?.tribute || []).some((t) => t.von === o.id && t.an === Z.volk && t.bis > jetzt());
    l.push(aktion('tribut', D().knoepfe.tribut, '', () => tributFordern(o), { option: 'tribut', grund: zahlt ? D().gruende.zahltSchon : null, info: D().gruende.tributInfo }));
  }
  if (!d.krieg) l.push(aktion('handel', D().knoepfe.tausch, 'gold', () => tauschEditor(o), { option: 'tausch', info: D().gruende.tauschInfo }));
  if (istSS && !d.krieg) l.push(geschenk(o, zustand));
  return l;
}

function geschenk(o, zustand) {
  const gold = Math.floor(aktuellesGold());
  const max = Math.max(25, Math.min(gold, 2000));
  zustand.geschenk = Math.max(25, Math.min(max, zustand.geschenk));
  const wert = el('b.gold-t');
  const wirkung = el('span.klein');
  const knopf = el('button.knopf.gold', { onclick: async () => { const r = await sende({ art: 'stadtstaat_geschenk', stadtstaat: o.id, gold: zustand.geschenk }); if (r) toast(D().geschenkDanke(o.name, zahl(r.einfluss ?? 0)), 'erfolg', { symbol: 'gold' }); } }, symbol('ui', 'gold'), D().knoepfe.schenken);
  const regler = el('input.diplo-regler', { type: 'range', min: 25, max, step: 25, value: zustand.geschenk });
  const zeige = () => {
    zustand.geschenk = +regler.value;
    wert.textContent = `${zahl(zustand.geschenk)} ${LAGER_NAMEN.gold}`;
    const neuE = Math.min(150, (o.einfluss || 0) + zustand.geschenk / STADTSTAAT.goldJeEinfluss);
    wirkung.textContent = D().geschenkWirkung(zahl(zustand.geschenk / STADTSTAAT.goldJeEinfluss, 1), zahl(neuE, 0));
    knopf.disabled = gold < 25;
  };
  regler.addEventListener('input', zeige);
  regler.addEventListener('change', () => regler.blur());
  zeige();
  return el('div.diplo-aktion.diplo-box', { style: { gridColumn: '1 / -1', margin: 0 } },
    el('div.diplo-zeile', symbol('ui', 'gold'), el('b', { text: D().geschenkTitel }), wert),
    regler, wirkung, gold < 25 ? el('span.grund', { text: D().gruende.geschenkMin }) : null, el('div', knopf));
}

async function kriegErklaeren(o) {
  const dd = du();
  const teile = [D().kriegFrage(o.name)];
  if (dd.schutz_bis > jetzt()) teile.push(D().kriegSchutzWarnung(dauerText(dd.schutz_bis - jetzt())));
  if (diploMit(o.id).buendnis) teile.push(D().kriegBuendnisWarnung);
  if (o.art === 'spieler') teile.push(D().kriegSpielerHinweis);
  if (!(await frageJaNein(D().kriegTitel, teile.join(' '), D().knoepfe.kriegJa))) return;
  sende({ art: 'krieg_erklaeren', volk: o.id, bestaetigt: true }, D().kriegErklaert(o.name));
}

async function tributFordern(o) {
  if (!(await frageJaNein(D().tributTitel, D().tributFrage(o.name), D().knoepfe.tribut))) return;
  const r = await sende({ art: 'tribut_fordern', an: o.id });
  if (r && r.angenommen === true) toast(D().tributJa(o.name, r.gold), 'erfolg', { symbol: 'tribut' });
  else if (r && r.angenommen === false) toast(D().tributNein(o.name), 'warnung', { symbol: 'tribut' });
}

// ---------- Tausch-Editor ----------
function tauschEditor(o) {
  stil();
  const t = { gibt: { gold: 0, lager: {}, luxus: new Set(), karte: false }, will: { gold: 0, lager: {}, luxus: new Set(), karte: false } };
  const zusammenfassung = el('div.diplo-zusammen');
  let senden;
  const aktualisiere = () => {
    const g = saeubern(t.gibt), w = saeubern(t.will);
    zusammenfassung.replaceChildren(
      el('div', el('span.rot-t', { text: D().duGibst + ': ' }), tauschText(g)),
      el('div', el('span.gruen-t', { text: D().duBekommst + ': ' }), tauschText(w)),
      o.art !== 'spieler' ? el('div.klein', { text: D().tausch.kiHinweis }) : el('div.klein', { text: D().tausch.spielerHinweis(o.name) }));
    if (senden) senden.disabled = leer(g) && leer(w);
  };
  const f = fenster(D().tausch.titel(o.name), (innen) => {
    innen.append(
      el('p.klein', { style: { marginTop: 0 }, text: D().tausch.erklaerung }),
      el('div.diplo-zwei', seite(t.gibt, true, o, aktualisiere), seite(t.will, false, o, aktualisiere)));
  }, { fuss: true, symbol: symbol('ui', 'handel', { px: 22 }) });
  f.element.style.maxWidth = '1000px';
  senden = el('button.knopf.gold', { onclick: async () => {
    const r = await sende({ art: 'tausch_angebot', an: o.id, gibt: saeubern(t.gibt), will: saeubern(t.will) }, D().tausch.gesendet(o.name));
    if (r) f.schliessen();
  } }, symbol('ui', 'handel'), D().tausch.senden);
  f.fuss.append(zusammenfassung, el('button.knopf', { text: T.abbrechen, onclick: () => f.schliessen() }), senden);
  aktualisiere();
}

function saeubern(s) {
  const r = {};
  if (s.gold > 0) r.gold = Math.floor(s.gold);
  const lager = Object.fromEntries(Object.entries(s.lager).filter(([, n]) => n > 0).map(([k, n]) => [k, Math.floor(n)]));
  if (Object.keys(lager).length) r.lager = lager;
  if (s.luxus.size) r.luxus = [...s.luxus];
  if (s.karte) r.karte = true;
  return r;
}
const leer = (t) => !t.gold && !t.lager && !t.luxus && !t.karte;

function zahlFeld(wert, max, setze) {
  const i = el('input.diplo-zahl', { type: 'number', min: 0, max: max ?? undefined, step: 1, value: wert || '', placeholder: '0', inputmode: 'numeric' });
  i.addEventListener('input', () => {
    let n = Math.floor(+i.value || 0);
    if (n < 0) n = 0;
    if (max != null && n > max) { n = max; i.value = String(max); }
    setze(n);
  });
  return i;
}

function seite(s, gebe, o, aktualisiere) {
  const tt = D().tausch;
  const k = [el('h2', symbol('ui', gebe ? 'pfeil_rechts' : 'pfeil_links'), gebe ? tt.ichGebe : tt.ichWill)];
  // Gold
  const gold = Math.floor(aktuellesGold());
  k.push(el('h3', { text: LAGER_NAMEN.gold }), el('div.diplo-zeile', symbol('ui', 'gold'), zahlFeld(s.gold, gebe ? gold : 1e7, (n) => { s.gold = n; aktualisiere(); }), el('span.klein', { text: gebe ? tt.vorrat(zahl(gold)) : tt.unbekannteMenge })));
  // Lagergüter
  const gueter = gebe ? LAGERGUETER.filter((g) => aktuellesLager(g) >= 1) : LAGERGUETER;
  k.push(el('h3', { text: tt.lager }));
  if (!gueter.length) k.push(el('p.klein', { text: tt.keinLager }));
  else k.push(el('div.diplo-gueter', gueter.map((g) => {
    const vor = Math.floor(aktuellesLager(g));
    return el('label.diplo-gut', { tip: gebe ? tt.vorrat(zahl(vor)) : LAGER_NAMEN[g] }, symbol('ui', g), el('span', { text: LAGER_NAMEN[g] + (gebe ? ` (${zahl(vor)})` : '') }), zahlFeld(s.lager[g], gebe ? vor : 1e6, (n) => { s.lager[g] = n; aktualisiere(); }));
  })));
  // Luxusgüter
  k.push(el('h3', { text: tt.luxus }));
  const eigene = du().raten?.luxus || {};
  const lux = gebe ? LUXUS.filter((r) => (eigene[r.id] || 0) >= 1) : LUXUS;
  if (!lux.length) k.push(el('p.klein', { text: tt.keinLuxus }));
  else {
    k.push(el('div.diplo-chips', lux.map((r) => {
      const b = el('button.knopf.klein' + (s.luxus.has(r.id) ? '.an' : ''), { tip: r.zweck || r.name }, symbol('rohstoff', r.id), r.name + (gebe && eigene[r.id] > 1 ? ` ×${eigene[r.id]}` : ''));
      b.addEventListener('click', () => { if (s.luxus.has(r.id)) s.luxus.delete(r.id); else s.luxus.add(r.id); b.classList.toggle('an', s.luxus.has(r.id)); b.classList.toggle('gold', s.luxus.has(r.id)); aktualisiere(); });
      if (s.luxus.has(r.id)) b.classList.add('gold');
      return b;
    })));
    k.push(el('p.klein', { text: gebe ? tt.luxusGebeHinweis : tt.luxusWillHinweis(o.name) }));
  }
  // Karte
  k.push(el('h3', { text: tt.karteTitel }));
  const fehlt = gebe ? fehlendeForschung('karten_tausch') : null;
  const kb = el('button.knopf.klein', { disabled: !!fehlt }, symbol('ui', 'karte_tausch'), gebe ? tt.karteGeben : tt.karteWollen);
  kb.addEventListener('click', () => { s.karte = !s.karte; kb.classList.toggle('an', s.karte); kb.classList.toggle('gold', s.karte); aktualisiere(); });
  k.push(el('div', kb), el('p.klein', { text: fehlt ? D().fehltForschung + ' ' + (FORSCHUNG[fehlt]?.name || fehlt) : gebe ? tt.karteGebenHinweis : tt.karteWollenHinweis }));
  return el('div.diplo-tausch-seite', k);
}
