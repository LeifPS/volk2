// Einstellungen: Ton, Musik, Lautstärke, Tag/Nacht- und Wetter-Optik, Abmelden, Neuanfang, Info.
// Gespeichert auf dem Server (befehl 'einstellungen') und zusätzlich im localStorage als Rückfall.
import { el, symbol, fenster, toast, fehler, frageJaNein } from './basis.js';
import { T } from '../texte.js';
import { Z, du, eigeneStaedte, eigeneEinheiten } from '../kern/zustand.js';
import { befehl, abmelden } from '../kern/netz.js';
import { optionen, neuZeichnen, zentriereAuf } from '../karte/render.js';
import { einstellungenSetzen, ton } from '../audio.js';
import { EINHEIT } from '../../shared/daten/index.js';
import { waehle } from './hud.js';

const E = T.einst;
const SCHLUESSEL = 'volk_einstellungen';
const STANDARD = { ton: true, musik: true, lautstaerke: 0.6, tagnacht: true, wetter: true };

const CSS = `
.einst-gruppe { margin: 4px 0 14px; }
.einst-gruppe h3 { color: var(--akzent); margin-bottom: 6px; }
.einst-zeile { display: flex; align-items: center; gap: 10px; padding: 8px 4px; border-bottom: 1px solid #353d52; }
.einst-zeile > canvas { width: 24px; height: 24px; flex: none; }
.einst-zeile .txt { flex: 1; min-width: 0; }
.einst-zeile .txt b { display: block; }
.einst-schalter { min-width: 76px; }
.einst-schalter.an { background: #3c7a2c; box-shadow: inset 2px 2px 0 #62aa48, inset -2px -2px 0 #24501a; }
.einst-regler { width: 180px; max-width: 40vw; accent-color: var(--akzent); height: 32px; }
.einst-info { font-size: 13px; color: var(--text2); line-height: 1.5; }
.einst-knoepfe { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px; }`;
function stil() { if (!document.getElementById('einst-stil')) document.head.append(el('style#einst-stil', { text: CSS })); }

function lokalLesen() { try { return JSON.parse(localStorage.getItem(SCHLUESSEL) || '{}') || {}; } catch { return {}; } }
function lokalSchreiben(w) { try { localStorage.setItem(SCHLUESSEL, JSON.stringify(w)); } catch { /* egal */ } }

/** Aktuelle Werte: Standard < localStorage < Server. */
export function werte() { return { ...STANDARD, ...lokalLesen(), ...(du()?.einstellungen || {}) }; }

/** Wendet Einstellungen auf Karte und Ton an (auch beim Start aufrufbar). */
export function anwenden(w = werte()) {
  optionen.tagnacht = w.tagnacht !== false;
  optionen.wetter = w.wetter !== false;
  neuZeichnen();
  try { einstellungenSetzen(w); } catch (e) { console.error(e); }
}

let speicherTimer = null;
function setzen(neu) {
  const w = { ...werte(), ...neu };
  lokalSchreiben(w);
  anwenden(w);
  clearTimeout(speicherTimer);
  speicherTimer = setTimeout(async () => {
    const r = await befehl({ art: 'einstellungen', werte: w });
    if (r && !r.ok && r.fehler) fehler(r.fehler);
  }, 400);
  return w;
}

function schalter(sym, titel, text, key) {
  const k = el('button.knopf.einst-schalter', { onclick: () => { const w = setzen({ [key]: !werte()[key] }); zeichne(w[key]); ton('klick'); } });
  const zeichne = (an) => { k.classList.toggle('an', !!an); k.textContent = an ? E.an : E.aus; k.setAttribute('aria-pressed', an ? 'true' : 'false'); };
  zeichne(werte()[key]);
  return el('div.einst-zeile', symbol('ui', sym), el('div.txt', el('b', { text: titel }), el('span.klein', { text })), k);
}

export function oeffneEinstellungen() {
  stil();
  const w = werte();
  return fenster(E.titel, (i, f) => {
    // Klang
    const zahlEl = el('span', { text: Math.round(w.lautstaerke * 100) + ' %', style: { minWidth: '48px', textAlign: 'right' } });
    const regler = el('input.einst-regler', { type: 'range', min: 0, max: 100, step: 5, value: Math.round(w.lautstaerke * 100), 'aria-label': E.lautstaerke });
    regler.addEventListener('input', () => { zahlEl.textContent = regler.value + ' %'; setzen({ lautstaerke: regler.value / 100 }); });
    regler.addEventListener('change', () => ton('klick'));
    i.append(el('div.einst-gruppe', el('h3', { text: E.klang }),
      schalter('ton_an', E.ton, E.tonText, 'ton'),
      schalter('ton_an', E.musik, E.musikText, 'musik'),
      el('div.einst-zeile', symbol('ui', 'ton_an'), el('div.txt', el('b', { text: E.lautstaerke })), regler, zahlEl)));
    // Darstellung
    i.append(el('div.einst-gruppe', el('h3', { text: E.darstellung }),
      schalter('nacht', E.tagnacht, E.tagnachtText, 'tagnacht'),
      schalter('regen', E.wetter, E.wetterText, 'wetter')));
    // Konto
    const d = du();
    const kannNeu = !!d && !eigeneStaedte().length && !eigeneEinheiten().some((e) => e.typ === 'siedler' || EINHEIT[e.typ]?.faehigkeiten?.includes('gruenden'));
    const neuKnopf = el('button.knopf.rot', { disabled: !kannNeu || Z.demo || null, tip: kannNeu ? E.neuanfangText : E.neuanfangGesperrt, onclick: async () => {
      if (!(await frageJaNein(E.neuanfang, E.neuanfangFrage, E.neuanfang))) return;
      const r = await befehl({ art: 'neuanfang' });
      if (!r.ok) { fehler(r.fehler); return; }
      f.schliessen();
      toast(E.neuanfangOk, 'erfolg', { symbol: 'gruenden' });
      setTimeout(() => { const s = eigeneEinheiten().find((e) => e.typ === 'siedler'); if (s) { waehle({ art: 'einheit', id: s.id }); zentriereAuf(s.feld, true); } else if (r.feld != null) zentriereAuf(r.feld, true); }, 300);
    } }, symbol('ui', 'gruenden'), E.neuanfang);
    const abKnopf = el('button.knopf', { onclick: async () => {
      if (Z.demo) { location.href = location.pathname; return; }
      if (!(await frageJaNein(E.abmelden, E.abmeldenFrage, E.abmelden))) return;
      try { abmelden(); } catch (e) { console.error(e); }
      setTimeout(() => location.reload(), 150);
    } }, symbol('ui', 'pfeil_links'), Z.demo ? E.demoVerlassen : E.abmelden);
    i.append(el('div.einst-gruppe', el('h3', { text: E.konto }),
      d ? el('div.einst-info', el('span.lex-farbe', { style: { display: 'inline-block', width: '14px', height: '14px', border: '2px solid var(--rand)', background: d.farbe, verticalAlign: '-2px', marginRight: '6px' } }), el('b', { text: d.name || '' }), Z.konto && !Z.demo ? ` · ${E.angemeldet} ${typeof Z.konto === 'object' ? Z.konto.name || '' : Z.konto}` : '') : null,
      Z.demo ? el('div.einst-info.gold-t', { text: E.demo }) : null,
      el('div.einst-knoepfe', abKnopf, neuKnopf),
      el('div.einst-info', { text: E.neuanfangText, style: { marginTop: '6px' } })));
    // Info
    i.append(el('div.einst-gruppe', el('h3', { text: E.info }),
      el('div.einst-info', el('b', { text: `${T.spielname} · ${E.version} ${E.versionText}` }), el('br'), E.infoText)));
  }, { breite: 'schmal', symbol: symbol('ui', 'einstellungen', { px: 24 }) });
}
