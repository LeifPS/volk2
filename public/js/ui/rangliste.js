// Rangliste: Spieler nach Kategorien, KI-Völker und Stadtstaaten getrennt darunter (einklappbar). Nur zum Spaß.
import { el, symbol, fenster, fehler, zahl } from './basis.js';
import { T } from '../texte.js';
import { Z, volk } from '../kern/zustand.js';
import { frage } from '../kern/netz.js';
import { ZEITALTER } from '../../shared/daten/index.js';

const KATEGORIEN = [
  { id: 'gesamt', sym: 'rangliste' }, { id: 'gold', sym: 'gold' }, { id: 'militaer', sym: 'staerke' }, { id: 'staedte', sym: 'stadt' },
  { id: 'bevoelkerung', sym: 'bevoelkerung' }, { id: 'forschungen', sym: 'forschung' }, { id: 'gebiet', sym: 'karte' }, { id: 'kultur', sym: 'kultur' }, { id: 'wunder', sym: 'wunder' },
];
const R = () => T.rang;
const merk = { kategorie: 'gesamt', offen: { ki: false, stadtstaat: false } };

let stilDa = false;
function stil() {
  if (stilDa) return; stilDa = true;
  document.head.append(el('style', { text: `
.rang-hinweis { background: #1f2a3a; border: 2px solid var(--rand); padding: 6px 10px; margin-bottom: 8px; display: flex; gap: 8px; align-items: center; }
.rang-reiter .knopf { font-size: 13px; }
.rang-tab td { height: 38px; }
.rang-tab td.platz { width: 46px; font-family: var(--kopf); text-align: center; }
.rang-tab td.wert { text-align: right; font-family: var(--kopf); white-space: nowrap; width: 110px; }
.rang-tab td.balk { width: 26%; }
.rang-tab td.za { color: var(--text2); font-size: 13px; width: 120px; }
.rang-tab tr.ich td { background: #2d3550; }
.rang-tab tr.ich td:first-child { box-shadow: inset 3px 0 0 var(--akzent); }
.rang-farbe { width: 14px; height: 14px; border: 2px solid var(--rand); display: inline-block; vertical-align: -2px; margin-right: 6px; }
.rang-punkt { width: 8px; height: 8px; display: inline-block; border: 1px solid #000; background: #59606f; margin-left: 6px; vertical-align: 1px; }
.rang-punkt.on { background: #5fdd4a; }
.rang-name { font-family: var(--kopf); font-size: 13px; }
.rang-gruppe { margin-top: 12px; border: 2px solid var(--rand); background: var(--panel2); }
.rang-gruppe > summary { cursor: pointer; padding: 8px 10px; font-family: var(--kopf); font-size: 14px; color: var(--akzent); min-height: 38px; display: flex; align-items: center; gap: 8px; list-style: none; }
.rang-gruppe > summary::-webkit-details-marker { display: none; }
.rang-gruppe > summary::before { content: '▶'; font-size: 11px; transition: transform .15s; }
.rang-gruppe[open] > summary::before { transform: rotate(90deg); }
.rang-gruppe > div { padding: 0 8px 8px; }
@media (max-width: 760px) { .rang-tab td.balk, .rang-tab td.za { display: none; } }
` }));
}

export function oeffneRangliste() {
  stil();
  let daten = null, stand = null, ziel;
  const f = fenster(R().titel, (innen) => { ziel = innen; }, { breite: 'mittel', fuss: true, symbol: symbol('ui', 'rangliste', { px: 22 }) });
  f.element.style.maxWidth = '940px';
  const standEl = el('span.klein', { style: { marginRight: 'auto', alignSelf: 'center' } });
  const laden = async () => {
    try { daten = await frage({ art: 'rangliste' }); stand = new Date(); zeichne(); }
    catch (e) { fehler(e.message || R().fehler); if (!daten) ziel.replaceChildren(el('p.rot-t', { text: R().fehler })); }
  };
  f.fuss.append(standEl, el('button.knopf', { onclick: laden }, symbol('ui', 'uhr'), R().aktualisieren), el('button.knopf', { text: T.schliessen, onclick: () => f.schliessen() }));
  ziel.append(el('p.klein', { text: R().laedt }));

  function zeichne() {
    if (!daten) return;
    const kat = merk.kategorie;
    standEl.textContent = R().stand(stand.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));
    const reiter = el('div.reiter.rang-reiter', KATEGORIEN.map((k) => el('button.knopf.klein' + (k.id === kat ? '.an.gold' : ''), { onclick: () => { merk.kategorie = k.id; zeichne(); }, tip: R().erklaerung[k.id] }, symbol('ui', k.sym), R().kategorien[k.id])));
    const spieler = daten.spieler || [];
    const ki = (daten.ki || []).filter((x) => x.art !== 'stadtstaat');
    const ss = (daten.ki || []).filter((x) => x.art === 'stadtstaat');
    const gruppe = (art, liste, titel) => {
      const d = el('details.rang-gruppe', { open: merk.offen[art] || null }, el('summary', symbol('ui', art === 'ki' ? 'diplomatie' : 'stadt'), `${titel} (${liste.length})`), el('div', tabelle(liste, kat)));
      d.addEventListener('toggle', () => { merk.offen[art] = d.open; });
      return d;
    };
    ziel.replaceChildren(
      el('div.rang-hinweis', symbol('ui', 'stern_voll', { px: 20 }), el('span', { text: R().hinweis })),
      reiter,
      el('p.klein', { style: { margin: '0 0 6px' }, text: R().erklaerung[kat] }),
      el('h2', { text: R().spieler }),
      spieler.length ? tabelle(spieler, kat) : el('p.klein', { text: R().keineSpieler }),
      ki.length ? gruppe('ki', ki, R().ki) : null,
      ss.length ? gruppe('stadtstaat', ss, R().stadtstaaten) : null,
    );
  }
  laden();
}

function tabelle(liste, kat) {
  const sortiert = [...liste].sort((a, b) => (b[kat] || 0) - (a[kat] || 0) || a.name.localeCompare(b.name, 'de'));
  const max = Math.max(1, ...sortiert.map((x) => x[kat] || 0));
  let platz = 0, letzter = null;
  return el('table.tabelle.rang-tab', sortiert.map((x, i) => {
    const w = x[kat] || 0;
    if (w !== letzter) { platz = i + 1; letzter = w; }
    const ich = x.id === Z.volk;
    const bekannt = ich || x.art === 'spieler' || volk(x.id)?.bekannt !== false;
    const p = platz <= 3 && w > 0 ? el('span', { class: ['gold-t', '', 'gold-t'][platz - 1] || '', style: { color: ['#f1c40f', '#c9d1d9', '#d08a4a'][platz - 1] }, text: platz + '.' }) : platz + '.';
    return el('tr' + (ich ? '.ich' : ''),
      el('td.platz', platz === 1 && w > 0 ? symbol('ui', 'krone', { px: 18 }) : p),
      el('td', el('span.rang-farbe', { style: { background: bekannt ? x.farbe : '#2a2f3c' } }), el('span.rang-name', { text: bekannt ? x.name : '???' }), ich ? el('span.gold-t.klein', { text: ' ' + R().du }) : null, el('span.rang-punkt' + (x.online ? '.on' : ''), { tip: x.online ? R().online : R().offline })),
      el('td.za', { text: ZEITALTER[x.zeitalter]?.name || '' }),
      el('td.balk', el('div.balken.' + (ich ? 'gold' : 'blau'), el('i', { style: { width: Math.round(w / max * 100) + '%' } }))),
      el('td.wert', { text: zahl(w) }));
  }));
}
