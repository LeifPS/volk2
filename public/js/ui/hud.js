// Spielansicht: Ressourcenleiste, Forschungsanzeige, Auswahlpanel, Aktionsleiste, Minikarte, Meldungen, "Nächste Aktion".
import { el, symbol, toast, fehler, zahl, vorzeichen, dauerText, uhrzeit, balken, fenster, frageJaNein, tip } from './basis.js';
import { T } from '../texte.js';
import { Z, an, du, volk, einheit, stadt, feldInfo, eigeneEinheiten, eigeneStaedte, aktuellesFeld, aktuelleHp, aktuellesGold, aktuellesLager, forschungsFortschritt, serverJetzt, stadtAuf, einheitenAuf, besitzerVon, erkundet } from '../kern/zustand.js';
import { befehl, frage } from '../kern/netz.js';
import { EINHEIT, GEB, FORSCHUNG, VERBESSERUNG, BEFOERDERUNG, BEFOERDERUNGEN, ROHSTOFF } from '../../shared/daten/index.js';
import { GELAENDE } from '../../shared/daten/gelaende.js';
import { LAGER_NAMEN } from '../../shared/daten/rohstoffe.js';
import { ZEITALTER } from '../../shared/daten/zeitalter.js';
import { karte } from '../../shared/karte.js';
import { BREITE, HOEHE, idx, abstand, umkreis, feldMitte } from '../../shared/hex.js';
import { kamera, zentriereAuf, neuZeichnen, overlay, volkFarbe } from '../karte/render.js';
import { R, WELT_B, WELT_H } from '../karte/gelaende.js';
import { ton } from '../audio.js';
import * as fenster_ from './fenster.js';

const ZIVIL = new Set(['zivil', 'spaeher', 'haendler', 'see_zivil', 'sanitaeter']);
const LUFT = new Set(['jaeger', 'bomber', 'rakete', 'atom']);
const SEE = new Set(['see_zivil', 'see_nah', 'see_fern', 'u_boot', 'traeger', 'transport']);

let leiste, ressourcen, forschungsEl, auswahlEl, aktionenEl, miniEl, miniCv, naechsteEl;

export function aufbauen() {
  leiste = el('div#leiste');
  ressourcen = el('div#ressourcen.pix');
  const menue = el('div#menue.pix',
    knopf('forschung', T.menue.forschung, () => fenster_.forschung()),
    knopf('stadt', T.menue.staedte, () => fenster_.reich()),
    knopf('diplomatie', T.menue.diplomatie, () => fenster_.diplomatie()),
    knopf('rangliste', T.menue.rangliste, () => fenster_.rangliste()),
    knopf('lexikon', T.menue.lexikon, () => fenster_.lexikon()),
    knopf('meldung', T.menue.meldungen, () => meldungsListe()),
    knopf('hilfe', T.menue.hilfe, () => fenster_.hilfe()),
    knopf('einstellungen', T.menue.einstellungen, () => fenster_.einstellungen()),
  );
  leiste.append(ressourcen, menue);
  forschungsEl = el('div#forschungsanzeige.pix', { onclick: () => fenster_.forschung() });
  auswahlEl = el('div#auswahl.pix.versteckt');
  aktionenEl = el('div#aktionen');
  miniCv = el('canvas', { width: BREITE, height: HOEHE });
  miniEl = el('div#minikarte.pix', miniCv);
  naechsteEl = el('button#naechste.knopf.gold', { onclick: naechsteAktion, tip: T.naechsteTip }, symbol('ui', 'pfeil_rechts'), T.naechste);
  document.body.append(leiste, forschungsEl, auswahlEl, aktionenEl, miniEl, naechsteEl, el('div#meldungsleiste'));
  minikarteEingabe();
  an('aenderung', (x) => { aktualisieren(); if (!x.gruppen || x.gruppen.has('nebel') || x.gruppen.has('felder') || x.gruppen.has('staedte') || x.voll) minikarteZeichnen(); });
  an('meldungen', (l) => { for (const m of l) { toast(m.text, m.art === 'warnung' || m.art === 'krieg' ? 'warnung' : 'info', { onclick: m.feld != null ? () => springe(m.feld) : null }); ton(m.art === 'forschung' ? 'forschung' : m.art === 'bau' ? 'bau' : m.art === 'kampf' || m.art === 'krieg' ? 'warnung' : m.art === 'stadt' ? 'gruendung' : 'meldung'); } });
  setInterval(() => { if (Z.ansicht) { leisteZeichnen(); forschungZeichnen(); if (Z.auswahl) auswahlZeichnen(false); } }, 1000);
  setInterval(() => { if (Z.ansicht) minikarteRahmen(); }, 300);
  minikarteZeichnen();
}

function knopf(sym, text, f) { return el('button.knopf.klein', { onclick: f, tip: text, 'aria-label': text }, symbol('ui', sym, { px: 20 })); }

export function aktualisieren() {
  if (!Z.ansicht) return;
  leisteZeichnen(); forschungZeichnen(); auswahlZeichnen(true);
}

// ---------- Leiste ----------
function leisteZeichnen() {
  const d = du(); if (!d) return;
  const r = d.raten;
  const teile = [];
  const res = (sym, wert, rate, tipText, farbe, onclick) => el('span.res', { tip: tipText, onclick }, symbol('ui', sym), el('span', { class: farbe || '', text: wert }), rate != null ? el('span.rate.' + (rate >= 0 ? 'gruen-t' : 'rot-t'), { text: '(' + vorzeichen(rate, Math.abs(rate) < 10 ? 1 : 0) + ')' }) : null);
  teile.push(res('gold', zahl(aktuellesGold()), r.gold, () => einkommenTip(), 'gold-t', () => einkommenFenster()));
  teile.push(res('wissenschaft', zahl(r.wissenschaft, 0), null, T.wissenschaftTip, 'blau-t', () => fenster_.forschung()));
  teile.push(res('kultur', zahl(r.kultur, 0) + '/h', null, T.kulturTip, 'lila-t'));
  const staedte = eigeneStaedte();
  if (staedte.length) {
    const z = Math.round(staedte.reduce((a, s) => a + (s.raten?.zufriedenheit || 0), 0) / staedte.length);
    teile.push(res(z >= 0 ? 'zufriedenheit' : 'unzufrieden', String(z), null, 'Durchschnittliche Zufriedenheit deiner Städte. Luxusgüter, Tempel und Theater heben sie. Unter 0 wachsen Städte langsamer.', z >= 0 ? 'gruen-t' : 'rot-t', () => fenster_.reich()));
  }
  for (const gut of ['holz', 'stein', 'marmor', 'lehm', 'salz', 'kupfer', 'zinn', 'eisen', 'pferde', 'salpeter', 'kohle', 'oel', 'aluminium', 'uran', 'elefanten']) {
    const menge = aktuellesLager(gut), rate = r.material[gut] || 0;
    if (!menge && !rate && !['holz', 'stein'].includes(gut)) continue;
    teile.push(res(gut, zahl(Math.floor(menge)), rate ? rate : null, T.lagerTip(LAGER_NAMEN[gut], r.kapazitaet[gut]), menge >= r.kapazitaet[gut] - 0.5 ? 'gold-t' : ''));
  }
  teile.push(el('span.res', { tip: ZEITALTER[d.zeitalter].beschreibung }, symbol('ui', 'zeitalter'), ZEITALTER[d.zeitalter].name));
  if (d.schutz_bis > serverJetzt()) teile.push(el('span.res', { tip: T.neulingsschutz(dauerText(d.schutz_bis - serverJetzt())) }, symbol('ui', 'schild'), el('span.blau-t', { text: dauerText(d.schutz_bis - serverJetzt()) })));
  if (!Z.verbunden && !Z.demo) teile.push(el('span.res.rot-t', { text: '⚠ offline' }));
  ressourcen.replaceChildren(...teile);
}

function einkommenTip() {
  const r = du().raten;
  return `Einkommen pro Stunde: ${vorzeichen(r.gold, 1)} (Einnahmen ${zahl(r.einnahmen, 1)}, Unterhalt ${zahl(r.unterhaltEinheiten + r.unterhaltGebaeude, 1)}). Klicken für Details.`;
}
export function einkommenFenster() {
  const d = du(), r = d.raten;
  fenster('Einkommen pro Stunde', (i) => {
    i.append(
      el('p', el('b', { text: `Einkommen pro Stunde: ${vorzeichen(r.gold, 1)} Gold` })),
      el('table.tabelle',
        el('tr', el('td', 'Einnahmen aus Städten'), el('td.gruen-t', { text: '+' + zahl(r.einnahmen - r.handel, 1) })),
        el('tr', el('td', 'Handelsrouten und Tribut'), el('td.gruen-t', { text: vorzeichen(r.handel, 1) })),
        el('tr', el('td', 'Unterhalt Einheiten (die ersten sind gratis)'), el('td.rot-t', { text: '−' + zahl(r.unterhaltEinheiten, 1) })),
        el('tr', el('td', 'Unterhalt Gebäude (ein Grundkontingent je Stadt ist gratis)'), el('td.rot-t', { text: '−' + zahl(r.unterhaltGebaeude, 1) })),
      ),
      el('h3', { text: 'Städte' }),
      el('table.tabelle', eigeneStaedte().map((s) => el('tr', el('td', s.name), el('td.gold-t', { text: '+' + zahl(s.raten?.g || 0, 1) }), el('td.rot-t', { text: s.raten?.unterhalt ? '−' + zahl(s.raten.unterhalt, 1) : '' })))),
      el('p.klein', { text: 'Ist das Einkommen negativ und die Kasse leer, wirst du gewarnt. Erst wenn du online bist und nach einer Gnadenfrist werden schwache Einheiten geschwächt. Solange du offline bist, passiert nichts: Der Unterhalt friert bei 0 Gold einfach ein.' }),
    );
  }, { breite: 'schmal' });
}

// ---------- Forschung ----------
function forschungZeichnen() {
  const f = du()?.forschung; if (!f) return;
  if (!f.aktiv) { forschungsEl.replaceChildren(el('div.zeile', symbol('ui', 'forschung', { px: 24 }), el('b.gold-t', { text: T.keineForschung }))); forschungsEl.classList.add('blink'); return; }
  const fo = FORSCHUNG[f.aktiv];
  const p = forschungsFortschritt();
  const rest = f.fertig_um ? f.fertig_um - serverJetzt() : null;
  forschungsEl.replaceChildren(el('div.zeile', symbol('ui', 'forschung', { px: 24 }), el('div', { style: { flex: 1, minWidth: 0 } }, el('div', { style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, el('b', { text: fo.name })), balken(p, 'blau'), el('div.klein', { text: `${Math.floor(p * 100)} % · fertig in ${dauerText(rest)}` }))));
}

// ---------- Auswahl ----------
export function waehle(a) {
  Z.auswahl = a;
  Z.zielmodus = null;
  overlay.reichweite = null; overlay.ziele = null; overlay.pfad = null;
  if (a?.art === 'einheit') {
    const e = einheit(a.id);
    const d = e && EINHEIT[e.typ];
    if (d && d.fern && d.reichweite && e.volk === Z.volk && !LUFT.has(d.klasse)) overlay.reichweite = umkreis(aktuellesFeld(e), d.reichweite).filter((i) => i !== aktuellesFeld(e));
  }
  auswahlZeichnen(true);
  neuZeichnen();
}

let letzteAuswahlZeichnung = '';
function auswahlZeichnen(voll) {
  const a = Z.auswahl;
  if (!a) { auswahlEl.classList.add('versteckt'); aktionenEl.replaceChildren(); return; }
  if (a.art === 'einheit') {
    const e = einheit(a.id);
    if (!e) { Z.auswahl = null; return auswahlZeichnen(true); }
    const schl = JSON.stringify(e) + Math.floor(serverJetzt() / 1000);
    if (!voll && schl === letzteAuswahlZeichnung) return;
    letzteAuswahlZeichnung = schl;
    einheitPanel(e);
    if (voll) einheitAktionen(e);
  } else if (a.art === 'stadt') {
    const s = stadt(a.id);
    if (!s) { Z.auswahl = null; return auswahlZeichnen(true); }
    stadtPanel(s);
    if (voll) stadtAktionen(s);
  } else if (a.art === 'feld') {
    feldPanel(a.id);
    if (voll) aktionenEl.replaceChildren();
  }
  auswahlEl.classList.remove('versteckt');
}

function zeile(sym, text, tipText) { return el('div', { tip: tipText, style: { display: 'flex', gap: '6px', alignItems: 'center', margin: '2px 0' } }, sym ? symbol('ui', sym) : null, el('span', { text })); }

function einheitPanel(e) {
  const d = EINHEIT[e.typ] || { name: e.tier || '?', staerke: 16 };
  const v = volk(e.volk);
  const eigen = e.volk === Z.volk;
  const hp = aktuelleHp(e);
  const kinder = [
    el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, symbol(e.tier ? 'tier' : 'einheit', e.tier || e.typ, { farbe: v?.farbe, px: 48 }), el('div', el('h2', { text: e.tier ? { wolf: 'Wolfsrudel', baer: 'Bär', tiger: 'Tiger', jaguar: 'Jaguar', krokodil: 'Krokodil', schneeleopard: 'Schneeleopard' }[e.tier] || 'Raubtier' : d.name, style: { margin: 0 } }), el('div.klein', { text: (v?.name || '') + (eigen ? '' : v?.art === 'spieler' ? ' (Spieler)' : '') }))),
    el('div', { style: { margin: '6px 0' } }, balken(hp / 100, hp > 60 ? '' : hp > 30 ? 'gold' : 'rot'), el('div.klein', { text: `Lebenspunkte ${Math.round(hp)}/100` + (eigen && e.heilrate && hp < 100 ? ` · heilt ${Math.round(e.heilrate)}/h` : '') })),
    eigen && e.mpMax != null ? el('div.klein', { class: e.mp > 0.01 ? 'gruen-t' : 'rot-t', text: `Bewegung: ${Math.round(e.mp * 10) / 10} von ${e.mpMax}${e.pfad?.length ? ' · marschiert weiter' : ''}`, tip: 'Bewegungspunkte in dieser Runde. Gelände kostet unterschiedlich viel; ein Angriff beendet die Bewegung. Zu weite Ziele erreichst du über mehrere Runden.' }) : null,
    el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 8px' } },
      zeile('staerke', 'Stärke ' + d.staerke, 'Kampfstärke: gilt im Nahkampf und bei der Verteidigung.'),
      d.fern ? zeile('fernkampf', 'Fern ' + d.fern, 'Fernkampfstärke: nur beim Fernangriff.') : null,
      d.reichweite ? zeile('reichweite', 'Reichweite ' + d.reichweite, 'So viele Felder weit kann die Einheit angreifen.') : null,
      d.tempo ? zeile('tempo', 'Tempo ' + d.tempo, 'Bewegungspunkte: je höher, desto schneller marschiert sie.') : null,
      zeile('sicht', 'Sicht ' + (e.sicht || d.sicht || 2), 'So viele Felder deckt die Einheit auf.'),
    ),
  ];
  if (eigen) {
    if (e.pfad?.length) kinder.push(zeile('zeit', 'Ankunft: ' + uhrzeit(e.pfad[e.pfad.length - 1].t) + ' (in ' + dauerText(e.pfad[e.pfad.length - 1].t - serverJetzt()) + ')'));
    if (e.arbeit) kinder.push(el('div', zeile('arbeiten', 'Baut ' + VERBESSERUNG[e.arbeit.id]?.name), balken((serverJetzt() - e.arbeit.start) / (e.arbeit.fertig_um - e.arbeit.start), 'gold'), el('div.klein', { text: 'fertig in ' + dauerText(e.arbeit.fertig_um - serverJetzt()) })));
    if (e.abkling_bis > serverJetzt()) kinder.push(zeile('zeit', 'Erholt sich vom Kampf: noch ' + dauerText(e.abkling_bis - serverJetzt()), 'Nach einem Angriff braucht jede Einheit eine Pause.'));
    if (e.route) kinder.push(zeile('handel', `Handelsroute ${stadt(e.route.von)?.name || '?'} ↔ ${stadt(e.route.nach)?.name || '?'}` + (e.route.aktiv ? '' : ' (unterwegs)')));
    if (e.ep != null) kinder.push(zeile('befoerderung', `Erfahrung ${e.ep}` + (e.bef?.length ? ' · ' + e.bef.map((b) => BEFOERDERUNG[b]?.name).join(', ') : '')));
    if (e.unterversorgt) kinder.push(el('div.rot-t', { text: 'Unterversorgt (Goldmangel): schwächer, heilt nicht.' }));
    if (d.unterhalt) kinder.push(el('div.klein', { text: `Unterhalt ${zahl(d.unterhalt, 1)} Gold/h (ein Grundkontingent an Einheiten ist gratis)` }));
  }
  kinder.push(el('div.klein', { style: { marginTop: '4px' } }, d.beschreibung || ''));
  auswahlEl.replaceChildren(...kinder);
}

function aktKnopf(sym, text, f, o = {}) {
  return el('button.knopf' + (o.gold ? '.gold' : '') + (o.rot ? '.rot' : ''), { onclick: f, tip: o.tip || text, disabled: o.aus || null }, symbol('ui', sym), el('span', { text }));
}

/** Civ-Tastenkürzel für die ausgewählte eigene Einheit: F befestigen, E erkunden, B Stadt gründen. */
export async function einheitenTaste(taste) {
  const a = Z.auswahl;
  if (a?.art !== 'einheit') return false;
  const e = Z.ansicht?.einheiten?.[a.id];
  if (!e || e.volk !== Z.volk) return false;
  const d = EINHEIT[e.typ]; if (!d) return false;
  if (taste === 'f' && d.klasse && !ZIVIL.has(d.klasse)) { await ausfuehren({ art: 'modus', einheit: e.id, modus: 'befestigt' }); return true; }
  if (taste === 'e' && (d.klasse === 'spaeher' || d.faehigkeiten?.includes('erkunden'))) { await ausfuehren({ art: 'modus', einheit: e.id, modus: 'erkunden' }); return true; }
  if (taste === 'b' && d.faehigkeiten?.includes('gruenden')) { await ausfuehren({ art: 'stadt_gruenden', einheit: e.id }); return true; }
  return false;
}

async function ausfuehren(b, erfolgText) {
  const r = await befehl(b);
  if (!r.ok) { fehler(r.fehler); ton('fehler'); return null; }
  if (erfolgText) toast(erfolgText, 'erfolg');
  ton('klick');
  return r;
}

function einheitAktionen(e) {
  if (e.volk !== Z.volk) { aktionenEl.replaceChildren(); return; }
  const d = EINHEIT[e.typ];
  const k = [];
  const B = T.befehle, BT = T.befehlTips;
  if (d.faehigkeiten?.includes('gruenden')) k.push(aktKnopf('gruenden', B.gruenden, async () => { const r = await ausfuehren({ art: 'stadt_gruenden', einheit: e.id }); if (r) { ton('gruendung'); waehle({ art: 'stadt', id: r.stadt }); fenster_.tutorialEreignis('stadt_gegruendet'); } }, { gold: true, tip: BT.gruenden }));
  if (d.faehigkeiten?.includes('arbeiten') || d.faehigkeiten?.includes('see_arbeiten')) {
    k.push(aktKnopf('arbeiten', B.arbeiten, () => verbesserungWaehlen(e), { tip: BT.arbeiten }));
    k.push(aktKnopf('auto_arbeit' in {} ? 'arbeiten' : 'arbeiten', B.auto_arbeit, () => ausfuehren({ art: 'modus', einheit: e.id, modus: 'auto_arbeit' }, 'Der Arbeiter arbeitet jetzt selbstständig.'), { tip: BT.auto_arbeit }));
    if (e.arbeit) k.push(aktKnopf('kreuz', 'Bau abbrechen', () => ausfuehren({ art: 'arbeit_abbrechen', einheit: e.id })));
  }
  if (d.faehigkeiten?.includes('handel')) k.push(aktKnopf('handel', B.handel, () => zielmodus('handel', e), { tip: BT.handel }));
  if (LUFT.has(d.klasse)) {
    if (d.klasse === 'atom') k.push(aktKnopf('atom', B.atomschlag, () => zielmodus('atomschlag', e), { rot: true }));
    else k.push(aktKnopf('angriff', B.luftangriff, () => zielmodus('luftangriff', e)));
    k.push(aktKnopf('luft', B.verlegen, () => zielmodus('verlegen', e)));
  } else {
    if (e.pfad?.length) k.push(aktKnopf('kreuz', B.anhalten, () => ausfuehren({ art: 'anhalten', einheit: e.id })));
    if (d.klasse === 'spaeher' || d.faehigkeiten?.includes('erkunden')) k.push(aktKnopf('erkunden', B.erkunden, () => ausfuehren({ art: 'modus', einheit: e.id, modus: 'erkunden' }, 'Die Einheit erkundet jetzt selbstständig.'), { tip: BT.erkunden }));
    if (!ZIVIL.has(d.klasse)) {
      k.push(aktKnopf('befestigen', B.befestigen, () => ausfuehren({ art: 'modus', einheit: e.id, modus: 'befestigt' }), { tip: BT.befestigen }));
      const f = feldInfo(aktuellesFeld(e));
      if (f?.v && besitzerVon(aktuellesFeld(e)) && besitzerVon(aktuellesFeld(e)) !== Z.volk) k.push(aktKnopf('pluendern', B.pluendern, () => ausfuehren({ art: 'pluendern', einheit: e.id }), { tip: BT.pluendern }));
    }
    k.push(aktKnopf(e.modus === 'schlafen' ? 'tag' : 'schlafen', e.modus === 'schlafen' ? B.wach : B.schlafen, () => ausfuehren({ art: 'modus', einheit: e.id, modus: e.modus === 'schlafen' ? 'wach' : 'schlafen' }), { tip: BT.schlafen }));
  }
  if (e.befoerderbar) k.push(aktKnopf('befoerderung', B.befoerdern, () => befoerderungWaehlen(e), { gold: true }));
  if (e.aufruesten) k.push(aktKnopf('aufruesten', B.aufruesten + ' (' + Object.entries(e.aufruesten).map(([g, n]) => n + ' ' + (LAGER_NAMEN[g] || g)).join(', ') + ')', () => ausfuehren({ art: 'aufruesten', einheit: e.id }), { tip: BT.aufruesten }));
  k.push(aktKnopf('aufloesen', B.aufloesen, async () => { if (await frageJaNein('Einheit auflösen?', `${d.name} wird aufgelöst. Du bekommst einen kleinen Teil des Goldes zurück.`, 'Auflösen')) ausfuehren({ art: 'aufloesen', einheit: e.id }); }, { tip: BT.aufloesen }));
  aktionenEl.replaceChildren(...k);
}

async function verbesserungWaehlen(e) {
  let l;
  try { l = (await frage({ art: 'verbesserungen', einheit: e.id })).liste; } catch (err) { return fehler(err.message); }
  const f = fenster('Was soll hier gebaut werden?', (i) => {
    if (!l.length) i.append(el('p', { text: 'Hier kann dieser Arbeiter gerade nichts bauen. Felder müssen in deinen Grenzen liegen; viele Verbesserungen brauchen erst eine Forschung.' }));
    i.append(el('div.karte-liste', l.map((x) => el('div.eintrag' + (x.grund ? '.aus' : ''), { onclick: async () => { if (x.grund) return fehler(x.grund); f.schliessen(); const r = await ausfuehren({ art: 'arbeiten', einheit: e.id, verbesserung: x.id }, VERBESSERUNG[x.id].name + ' wird gebaut.'); if (r) fenster_.tutorialEreignis('verbesserung'); } },
      symbol('verbesserung', x.id, { px: 48, farbe: du().farbe }), el('div', el('b', { text: VERBESSERUNG[x.id].name }), el('div.klein', { text: VERBESSERUNG[x.id].beschreibung }), el('div.klein', { text: x.grund || 'Dauer: ' + dauerText(x.dauer) }))))));
  }, { breite: 'mittel' });
}

function befoerderungWaehlen(e) {
  const d = EINHEIT[e.typ];
  const l = BEFOERDERUNGEN.filter((p) => p.klassen.includes(d.klasse) && !(e.bef || []).includes(p.id) && (!p.voraussetzung || (e.bef || []).includes(p.voraussetzung)));
  const f = fenster('Beförderung wählen', (i) => {
    i.append(el('p.klein', { text: 'Erfahrene Einheiten werden befördert. Jede Beförderung heilt außerdem 25 Lebenspunkte.' }));
    i.append(el('div.karte-liste', l.map((p) => el('div.eintrag', { onclick: async () => { f.schliessen(); await ausfuehren({ art: 'befoerdern', einheit: e.id, befoerderung: p.id }, p.name + '!'); } }, symbol('ui', 'befoerderung', { px: 24 }), el('div', el('b', { text: p.name }), el('div.klein', { text: p.beschreibung }))))));
  }, { breite: 'mittel' });
}

function stadtPanel(s) {
  const v = volk(s.volk);
  const eigen = s.volk === Z.volk;
  const k = [el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, symbol('stadt', v?.art === 'stadtstaat' ? 'stadtstaat' : 'stadt', { farbe: v?.farbe, zeitalter: s.zeitalter || 0, groesse: 1, px: 56 }), el('div', el('h2', { text: s.name, style: { margin: 0 } }), el('div.klein', { text: (v?.name || '') + ' · ' + s.bev + ' Einwohner' })))];
  if (s.hp != null) k.push(el('div', balken(s.hp / s.maxhp, s.hp / s.maxhp > 0.5 ? '' : 'rot'), el('div.klein', { text: `Stadt-Lebenspunkte ${s.hp}/${s.maxhp}` + (s.staerke ? ` · Stärke ${s.staerke}` : '') })));
  if (eigen) {
    const r = s.raten || {};
    k.push(el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 8px' } },
      zeile('nahrung', `${vorzeichen(r.ueberschuss || 0, 1)}/h`, 'Nahrungsüberschuss: lässt die Stadt wachsen.'),
      zeile('produktion', `${zahl(r.p || 0, 1)}`, 'Produktion: beschleunigt alle Bauaufträge dieser Stadt (je Punkt +4 %).'),
      zeile('gold', `+${zahl(r.g || 0, 1)}/h`, 'Gold dieser Stadt pro Stunde.'),
      zeile('wissenschaft', `${zahl(r.w || 0, 1)}`, 'Wissenschaft dieser Stadt.'),
      zeile(r.zufriedenheit >= 0 ? 'zufriedenheit' : 'unzufrieden', `${r.zufriedenheit}`, 'Zufriedenheit dieser Stadt.'),
      zeile('kultur', `${zahl(r.k || 0, 1)}/h`, 'Kultur: lässt die Grenzen wachsen.'),
    ));
    if (s.wachstum_um) k.push(el('div.klein', { class: (s.raten?.ueberschuss || 0) < 0 ? 'rot-t' : '', text: ((s.raten?.ueberschuss || 0) < 0 ? 'Hunger! Schrumpft in ' : 'Wächst in ') + dauerText(s.wachstum_um - serverJetzt()) }));
    for (const b of s.bau || []) k.push(el('div', el('div.klein', { text: 'Baut: ' + bauName(b) + ' · noch ' + dauerText(b.fertig_um - serverJetzt()) }), balken((serverJetzt() - b.start) / (b.fertig_um - b.start), 'gold')));
    if (!(s.bau || []).length) k.push(el('div.gold-t', { text: 'Kein Bauauftrag! Öffne die Stadt und wähle etwas.' }));
    if (s.zerstoert_bis > serverJetzt()) k.push(el('div.rot-t', { text: 'Zerstört: noch ' + dauerText(s.zerstoert_bis - serverJetzt()) + ' unproduktiv.' }));
  } else if (v?.art === 'stadtstaat') {
    k.push(el('div.klein', { text: `Stadtstaat. Dein Einfluss: ${Math.round(v.einfluss || 0)} (ab 30 befreundet, ab 60 verbündet).` }));
  }
  auswahlEl.replaceChildren(...k);
}
export function bauName(b) { const d = b.art === 'gebaeude' ? GEB[b.id] : b.art === 'einheit' ? EINHEIT[b.id] : fenster_.wunderDaten(b.id); return d?.name || b.id; }

function stadtAktionen(s) {
  if (s.volk !== Z.volk) {
    const v = volk(s.volk);
    const k = [];
    if (v?.art === 'stadtstaat') k.push(aktKnopf('tribut', 'Geschenk machen', () => fenster_.diplomatie(v.id)));
    else if (v && v.art !== 'barbar') k.push(aktKnopf('diplomatie', 'Diplomatie', () => fenster_.diplomatie(v.id)));
    aktionenEl.replaceChildren(...k);
    return;
  }
  aktionenEl.replaceChildren(
    aktKnopf('stadt', 'Stadt öffnen', () => fenster_.stadt(s.id), { gold: true, tip: 'Bauaufträge, Gebäude und Felder dieser Stadt (Doppelklick auf die Stadt).' }),
    aktKnopf('bau', 'Bauen', () => fenster_.stadt(s.id, 'bauen')),
    aktKnopf('angriff', 'Stadt schießt', () => zielmodus('stadt_angriff', s), { tip: 'Die Stadt beschießt eine feindliche Einheit in Reichweite.' }),
  );
}

function feldPanel(i) {
  const k = karte();
  const g = GELAENDE[k.gelaende[i]];
  if (!erkundet(i)) { auswahlEl.replaceChildren(el('h2', { text: 'Unerforscht' }), el('p.klein', { text: 'Schicke einen Späher hierher, um das Land zu erkunden.' })); return; }
  const f = feldInfo(i);
  const rn = k.rohstoff[i];
  const r = rn ? fenster_.rohstoffDaten(rn) : null;
  const sichtbarR = r && (!r.sichtbar_durch || du().forschung.erforscht[r.sichtbar_durch]);
  const bes = besitzerVon(i);
  const kinder = [
    el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, symbol('deko', g.id, { px: 48 }), el('div', el('h2', { text: g.name, style: { margin: 0 } }), el('div.klein', { text: bes ? 'Gebiet von ' + (volk(bes)?.name || '?') : 'Niemandsland' }))),
    el('div.klein', { text: g.beschreibung }),
    el('div', { style: { display: 'flex', gap: '10px', margin: '4px 0' } }, zeile('nahrung', String(g.ertrag.n)), zeile('produktion', String(g.ertrag.p)), zeile('gold', String(g.ertrag.g + (k.fluss[i] && !g.wasser ? 1 : 0)))),
    el('div.klein', { text: `Bewegung ×${g.bewegung}` + (g.verteidigung ? ` · Verteidigung ${g.verteidigung > 0 ? '+' : ''}${g.verteidigung}` : '') + (k.fluss[i] ? ' · Fluss' : '') }),
  ];
  if (sichtbarR) kinder.push(el('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' } }, symbol('rohstoff', r.id), el('div', el('b', { text: r.name }), el('div.klein', { text: r.zweck }))));
  if (f?.v) kinder.push(zeile('arbeiten', VERBESSERUNG[f.v]?.name + (f.pl > serverJetzt() ? ' (geplündert)' : '')));
  if (f?.w) kinder.push(zeile('bewegen', VERBESSERUNG[f.w]?.name));
  auswahlEl.replaceChildren(...kinder);
}

// ---------- Zielmodus (Handel, Luftangriff, Verlegen, Atomschlag, Stadtangriff) ----------
function zielmodus(art, obj) {
  Z.zielmodus = { art, id: obj.id };
  const texte = { handel: 'Wähle die Zielstadt der Handelsroute (Linksklick auf eine Stadt).', luftangriff: 'Wähle das Ziel des Luftangriffs.', verlegen: 'Wähle die Stadt (oder den Träger), in die das Flugzeug verlegt wird.', atomschlag: 'Wähle das Ziel. Achtung: Wirkung im Umkreis von 2 Feldern!', stadt_angriff: 'Wähle die feindliche Einheit, die beschossen werden soll.' };
  toast(texte[art] + ' Esc bricht ab.', 'info', { symbol: 'reichweite' });
  if (art === 'luftangriff' || art === 'atomschlag') { const e = einheit(obj.id); overlay.reichweite = umkreis(aktuellesFeld(e), EINHEIT[e.typ].reichweite || 6); }
  if (art === 'stadt_angriff') overlay.reichweite = umkreis(obj.feld, obj.reichweite || 2);
  neuZeichnen();
}
export async function zielGewaehlt(feld) {
  const zm = Z.zielmodus; Z.zielmodus = null; overlay.reichweite = null; neuZeichnen();
  if (!zm) return false;
  if (zm.art === 'handel') { const s = stadtAuf(feld); if (!s) { fehler('Dort ist keine Stadt.'); return true; } const r = await ausfuehren({ art: 'handelsroute', einheit: zm.id, stadt: s.id }); if (r) toast(`Die Karawane macht sich auf den Weg nach ${s.name}. Ankunft ${uhrzeit(r.ankunft)}.`, 'erfolg'); return true; }
  if (zm.art === 'luftangriff') { await ausfuehren({ art: 'luftangriff', einheit: zm.id, ziel: feld }); return true; }
  if (zm.art === 'atomschlag') { if (await frageJaNein('Atomschlag', 'Wirklich eine Atomwaffe einsetzen? Alles im Umkreis von 2 Feldern wird schwer beschädigt.', 'Einsetzen')) await ausfuehren({ art: 'atomschlag', einheit: zm.id, ziel: feld }); return true; }
  if (zm.art === 'verlegen') { const s = stadtAuf(feld); const tr = einheitenAuf(feld).find((x) => x.volk === Z.volk && EINHEIT[x.typ]?.faehigkeiten?.includes('traeger')); await ausfuehren({ art: 'verlegen', einheit: zm.id, stadt: s?.id, traeger: tr?.id }, 'Das Flugzeug wird verlegt.'); return true; }
  if (zm.art === 'stadt_angriff') { await ausfuehren({ art: 'stadt_angriff', stadt: zm.id, ziel: feld }); return true; }
  return false;
}

// ---------- Rechtsklick / langes Drücken: Befehl ----------
export async function befehlAufFeld(feld) {
  const a = Z.auswahl;
  if (!a) return;
  if (a.art === 'stadt') { const s = stadt(a.id); if (s?.volk === Z.volk && einheitenAuf(feld).some((e) => e.volk !== Z.volk)) { Z.zielmodus = { art: 'stadt_angriff', id: s.id }; return zielGewaehlt(feld); } return; }
  if (a.art !== 'einheit') return;
  const e = einheit(a.id);
  if (!e || e.volk !== Z.volk) return;
  const d = EINHEIT[e.typ];
  if (LUFT.has(d.klasse)) { const fremd = einheitenAuf(feld).some((x) => x.volk !== Z.volk) || (stadtAuf(feld) && stadtAuf(feld).volk !== Z.volk); if (fremd) { Z.zielmodus = { art: 'luftangriff', id: e.id }; return zielGewaehlt(feld); } Z.zielmodus = { art: 'verlegen', id: e.id }; return zielGewaehlt(feld); }
  const fremdeEinheit = einheitenAuf(feld).find((x) => x.volk !== Z.volk && !Z.ansicht.diplomatie[x.volk]?.buendnis);
  const fremdeStadt = stadtAuf(feld) && stadtAuf(feld).volk !== Z.volk ? stadtAuf(feld) : null;
  const lager = Object.values(Z.ansicht.lager || {}).find((l) => l.feld === feld);
  if ((fremdeEinheit || fremdeStadt || lager) && !ZIVIL.has(d.klasse)) return angriffMitVorschau(e, feld);
  if (fremdeStadt && d.faehigkeiten?.includes('handel')) { Z.zielmodus = { art: 'handel', id: e.id }; return zielGewaehlt(feld); }
  // Bewegen: Vorschau mit Ankunftszeit
  let w;
  try { w = await frage({ art: 'weg', einheit: e.id, ziel: feld }); } catch (err) { return fehler(err.message); }
  if (!w.pfad) { overlay.pfad = { felder: [feld], ok: false }; neuZeichnen(); fehler('Dorthin gibt es keinen Weg (fremdes Gebiet braucht offene Grenzen, Wasser eine Forschung).'); return; }
  overlay.pfad = { felder: w.pfad, ok: true }; neuZeichnen();
  const r = await ausfuehren({ art: 'bewegen', einheit: e.id, ziel: feld });
  overlay.pfad = null; neuZeichnen();
  if (r) { toast(`${d.name}: Ankunft ${uhrzeit(r.ankunft)} (in ${dauerText(r.ankunft - serverJetzt())}).`, 'info', { symbol: 'zeit', dauer: 4000 }); fenster_.tutorialEreignis('bewegt'); }
}

async function angriffMitVorschau(e, feld) {
  let v;
  try { v = await frage({ art: 'kampfvorschau', einheit: e.id, ziel: feld }); } catch (err) { return fehler(err.message); }
  if (v.zivil || v.lager) {
    if (!v.ok && v.grund) return fehler(v.grund);
    if (await frageJaNein(T.kampfvorschau, v.text, T.angriffBestaetigen)) { await ausfuehren({ art: 'angreifen', einheit: e.id, ziel: feld }); fenster_.tutorialEreignis('kampf'); }
    return;
  }
  const d = EINHEIT[e.typ];
  const f = fenster(T.kampfvorschau, (i) => {
    const seite = (titel, s, schaden, hp, farbe) => el('div.pix', { style: { padding: '8px', flex: 1, minWidth: '220px' } }, el('h2', { text: titel }), el('div', { text: `Stärke ${s.wert}` }), el('table.tabelle', s.liste.map((m) => el('tr', el('td.klein', { text: m.text }), el('td', { class: m.wert >= 0 ? 'gruen-t' : 'rot-t', text: (m.wert >= 0 ? '+' : '') + m.wert })))), el('div', { style: { marginTop: '6px' } }, `${T.erwarteterSchaden}: `, el('b', { class: farbe, text: String(schaden) }), ` (von ${Math.round(hp)} LP)`), balken(Math.max(0, hp - schaden) / (titel.includes(v.zielName) && v.stadt ? (stadtAuf(feld)?.maxhp || 100) : 100), 'rot'));
    i.append(el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, seite('Dein ' + d.name, v.angreifer, v.schadenAnAngreifer, v.eigenHp, 'rot-t'), seite(v.zielName, v.verteidiger, v.schadenAnVerteidiger, v.zielHp, 'gruen-t')));
    i.append(el('p', { text: v.fern ? 'Fernangriff: Dein Ziel nimmt Schaden, du selbst kaum oder gar nicht.' : 'Nahkampf: Beide Seiten verlieren Lebenspunkte.' }));
    if (v.sieg) i.append(el('p.gruen-t', { text: v.stadt ? 'Die Stadt fällt wahrscheinlich – eine Nahkampfeinheit kann sie dann einnehmen.' : 'Der Gegner wird diesen Angriff wahrscheinlich nicht überleben.' }));
    if (v.tod) i.append(el('p.rot-t', { text: 'Achtung: Deine Einheit würde diesen Angriff wahrscheinlich nicht überleben!' }));
    if (!v.ok) i.append(el('p.rot-t', { text: v.grund }));
    i.append(el('p.klein', { text: 'Der Schaden schwankt zufällig um ±20 %. Nach dem Angriff braucht die Einheit eine Pause.' }));
  }, { breite: 'mittel', fuss: true });
  f.fuss.append(el('button.knopf', { text: T.abbrechen, onclick: () => f.schliessen() }), el('button.knopf.rot', { text: T.angriffBestaetigen, disabled: !v.ok || null, onclick: async () => { f.schliessen(); ton('kampf'); const r = await ausfuehren({ art: 'angreifen', einheit: e.id, ziel: feld }); if (r) { fenster_.tutorialEreignis('kampf'); if (r.marsch) toast('Die Einheit marschiert zum Ziel und greift dort an. Ankunft ' + uhrzeit(r.ankunft) + '.', 'info'); } } }));
}

// ---------- Nächste Aktion ----------
let naechsteIndex = 0;
export function naechsteAktion() {
  const kand = [];
  for (const s of eigeneStaedte()) if (!(s.bau || []).length && !(s.schlange || []).length) kand.push({ art: 'stadt', id: s.id, feld: s.feld });
  for (const e of eigeneEinheiten()) {
    if (e.pfad?.length || e.arbeit || e.route || e.in || e.einsatz) continue;
    if (['schlafen', 'befestigt', 'erkunden', 'auto_arbeit'].includes(e.modus) && !e.befoerderbar) continue;
    kand.push({ art: 'einheit', id: e.id, feld: e.feld });
  }
  if (!du()?.forschung?.aktiv) { fenster_.forschung(); return; }
  if (!kand.length) { toast('Alles hat zu tun. Schau später wieder vorbei – oder sieh dir die Hilfe an (H).', 'info', { symbol: 'haken' }); return; }
  naechsteIndex = (naechsteIndex + 1) % kand.length;
  const k = kand[naechsteIndex];
  waehle({ art: k.art, id: k.id });
  zentriereAuf(k.feld, true);
}
export function springe(feld) { zentriereAuf(feld, true); overlay.markierung = { feld, bis: performance.now() + 2500 }; neuZeichnen(); }

// ---------- Meldungen ----------
export function meldungsListe() {
  const d = du();
  fenster('Meldungen', (i) => {
    const l = (d.meldungen || []).slice().reverse();
    if (!l.length) i.append(el('p', { text: 'Noch keine Meldungen.' }));
    for (const m of l) i.append(el('div.eintrag', { onclick: m.feld != null ? () => { i.closest('.fenster'); springe(m.feld); } : null }, el('div.klein', { text: uhrzeit(m.t), style: { minWidth: '90px' } }), el('div', { class: m.art === 'warnung' || m.art === 'krieg' ? 'rot-t' : '', text: m.text })));
    befehl({ art: 'meldungen_gelesen', bis: Math.max(0, ...l.map((m) => m.id)) });
  }, { breite: 'mittel' });
}

// ---------- Minikarte ----------
let miniBasis = null;
function minikarteZeichnen() {
  if (!Z.ansicht) return;
  const k = karte();
  const ctx = miniCv.getContext('2d');
  const img = ctx.createImageData(BREITE, HOEHE);
  const farben = GELAENDE.map((g) => { const n = parseInt(g.farben[0].slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; });
  const besitz = {};
  for (const [i, f] of Object.entries(Z.ansicht.felder)) if (f.s) { const s = Z.ansicht.staedte[f.s]; if (s) besitz[i] = volkFarbe(s.volk); }
  for (let i = 0; i < BREITE * HOEHE; i++) {
    const o = i * 4;
    if (!erkundet(i)) { img.data[o] = 11; img.data[o + 1] = 13; img.data[o + 2] = 20; img.data[o + 3] = 255; continue; }
    let c = farben[k.gelaende[i]];
    if (besitz[i]) { const n = parseInt(besitz[i].slice(1), 16); c = [(c[0] + ((n >> 16) & 255) * 2) / 3, (c[1] + ((n >> 8) & 255) * 2) / 3, (c[2] + (n & 255) * 2) / 3]; }
    img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
  }
  for (const s of Object.values(Z.ansicht.staedte)) { if (!erkundet(s.feld)) continue; const o = s.feld * 4; img.data[o] = 255; img.data[o + 1] = 255; img.data[o + 2] = 255; }
  miniBasis = img;
  minikarteRahmen();
}
function minikarteRahmen() {
  if (!miniBasis) return;
  const ctx = miniCv.getContext('2d');
  ctx.putImageData(miniBasis, 0, 0);
  // eigene Einheiten
  for (const e of eigeneEinheiten()) { const f = aktuellesFeld(e); ctx.fillStyle = '#ffe066'; ctx.fillRect(f % BREITE, Math.floor(f / BREITE), 1, 1); }
  const sx = BREITE / WELT_B, sy = HOEHE / WELT_H;
  const bw = innerWidth / kamera.zoom * sx, bh = innerHeight / kamera.zoom * sy;
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
  ctx.strokeRect(Math.round(kamera.x * sx - bw / 2) + 0.5, Math.round(kamera.y * sy - bh / 2) + 0.5, Math.round(bw), Math.round(bh));
}
function minikarteEingabe() {
  let ziehen = false;
  const gehe = (ev) => {
    const r = miniCv.getBoundingClientRect();
    const fx = (ev.clientX - r.left) / r.width * BREITE, fy = (ev.clientY - r.top) / r.height * HOEHE;
    const i = idx(Math.max(0, Math.min(BREITE - 1, Math.floor(fx))), Math.max(0, Math.min(HOEHE - 1, Math.floor(fy))));
    zentriereAuf(i);
  };
  miniCv.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); ziehen = true; miniCv.setPointerCapture(ev.pointerId); gehe(ev); });
  miniCv.addEventListener('pointermove', (ev) => { if (ziehen) gehe(ev); });
  miniCv.addEventListener('pointerup', () => { ziehen = false; });
}
