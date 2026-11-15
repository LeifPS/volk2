// Geführtes, interaktives Tutorial: kleine, nicht-modale Pixel-Sprechblase am unteren Rand mit Markierung des
// relevanten Bedienelements. Erkennt Fortschritt über Zustandsänderungen und Ereignisse, ist jederzeit überspringbar
// und speichert den Stand auf dem Server (befehl 'tutorial'). Blockiert das Spiel nie.
import { el, symbol, toast, fensterOffen, dauerText } from './basis.js';
import { T } from '../texte.js';
import { Z, an, du, eigeneStaedte, eigeneEinheiten, aktuellesFeld, serverJetzt } from '../kern/zustand.js';
import { befehl } from '../kern/netz.js';
import { kamera } from '../karte/render.js';
import { EINHEIT } from '../../shared/daten/index.js';
import { ton } from '../audio.js';
import { anwenden as einstellungenAnwenden } from './einstellungen.js';
import { springe, waehle } from './hud.js';
import * as F from './fenster.js';

const TT = T.tut, S = T.tut.schritte;

const CSS = `
#tut-blase { position: fixed; z-index: 46; left: 50%; transform: translateX(-50%); bottom: calc(112px + var(--sicher-unten)); width: min(400px, calc(100vw - 24px)); padding: 10px 12px 10px; pointer-events: auto; animation: tut-rein .3s ease-out; }
#tut-blase.fenster-offen { left: calc(8px + var(--sicher-links)); transform: none; bottom: calc(8px + var(--sicher-unten)); width: min(330px, calc(100vw - 24px)); }
#tut-blase.klein { width: auto; padding: 4px; }
#tut-blase .kopf { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
#tut-blase .kopf h2 { flex: 1; margin: 0; font-size: 15px; color: var(--akzent); }
#tut-blase .zaehler { font-size: 11px; color: var(--text2); font-family: var(--kopf); }
#tut-blase .text { font-size: 15px; line-height: 1.45; margin: 0 0 10px; }
#tut-blase .knoepfe { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
#tut-blase .knoepfe .links { margin-right: auto; }
#tut-blase .geschafft { color: var(--gruen); font-family: var(--kopf); font-size: 14px; margin: 0 0 8px; }
#tut-blase .punkte { display: flex; gap: 3px; margin: -2px 0 8px; }
#tut-blase .punkte i { width: 10px; height: 4px; background: #0b0d14; display: block; }
#tut-blase .punkte i.an { background: var(--akzent); }
#tut-rahmen { position: fixed; z-index: 44; pointer-events: none; border: 3px solid var(--gold); box-shadow: 0 0 0 3px rgba(0,0,0,.6), 0 0 14px 4px rgba(241,196,15,.7); animation: tut-puls 1s ease-in-out infinite; }
#tut-pfeil { position: fixed; z-index: 45; pointer-events: none; width: 44px; height: 40px; image-rendering: pixelated; }
#tut-pfeil.unten { animation: tut-hoch 0.8s ease-in-out infinite; }
#tut-pfeil.oben { animation: tut-runter 0.8s ease-in-out infinite; transform: rotate(180deg); }
@keyframes tut-puls { 0%,100% { opacity: 1; } 50% { opacity: .45; } }
@keyframes tut-hoch { 0%,100% { margin-top: 0; } 50% { margin-top: -8px; } }
@keyframes tut-runter { 0%,100% { margin-top: 0; } 50% { margin-top: 8px; } }
@keyframes tut-rein { from { opacity: 0; margin-bottom: -10px; } to { opacity: 1; margin-bottom: 0; } }
@media (max-width: 900px) { #tut-blase:not(.fenster-offen) { left: auto; right: calc(156px + var(--sicher-rechts)); transform: none; bottom: calc(112px + var(--sicher-unten)); width: min(360px, calc(100vw - 180px)); } }`;
function stil() { if (!document.getElementById('tut-stil')) document.head.append(el('style#tut-stil', { text: CSS })); }

// ---------- Hilfsfunktionen für die Schritte ----------
const aktKnopf = (text) => [...document.querySelectorAll('#aktionen button')].find((b) => b.textContent.trim() === text) || null;
const menueKnopf = (text) => document.querySelector(`#menue button[aria-label="${CSS_ESC(text)}"]`);
const CSS_ESC = (s) => String(s).replace(/"/g, '\\"');
const istSiedler = (e) => e.typ === 'siedler' || EINHEIT[e.typ]?.faehigkeiten?.includes('gruenden');
const istSpaeher = (e) => EINHEIT[e.typ]?.klasse === 'spaeher';
const istMilitaer = (e) => { const k = EINHEIT[e.typ]?.klasse; return k && !['zivil', 'spaeher', 'haendler', 'see_zivil', 'sanitaeter'].includes(k); };
const gewaehlt = (art, pruef) => { const a = Z.auswahl; if (!a || a.art !== art) return false; const x = art === 'einheit' ? Z.ansicht?.einheiten?.[a.id] : Z.ansicht?.staedte?.[a.id]; return !!x && x.volk === Z.volk && (!pruef || pruef(x)); };
function zeigeEinheit(pruef) { const e = eigeneEinheiten().find(pruef); if (!e) return; waehle({ art: 'einheit', id: e.id }); springe(aktuellesFeld(e)); }
function zeigeStadt() { const s = eigeneStaedte().find((x) => x.hauptstadt) || eigeneStaedte()[0]; if (!s) return; waehle({ art: 'stadt', id: s.id }); springe(s.feld); }

let kamStart = null;
const kameraBewegt = () => kamStart && (Math.hypot(kamera.x - kamStart.x, kamera.y - kamStart.y) > 120 || Math.abs(kamera.zoom - kamStart.zoom) > 0.01);

/** Die Schritte. inhalt() liefert {titel, text, knopf?, aktion?}, ziel() das zu markierende Element, fertig() ob erledigt. */
const SCHRITTE = [
  { id: 'willkommen', inhalt: () => S.willkommen },
  { id: 'karte', start: () => { kamStart = { x: kamera.x, y: kamera.y, zoom: kamera.zoom }; }, fertig: kameraBewegt, inhalt: () => S.karte },
  { id: 'gruenden', ereignis: 'stadt_gegruendet', fertig: () => eigeneStaedte().length > 0,
    inhalt: () => (aktKnopf(T.befehle.gruenden) ? S.gruendenKnopf : { ...S.gruenden, aktion: eigeneEinheiten().some(istSiedler) ? () => zeigeEinheit(istSiedler) : null }),
    ziel: () => aktKnopf(T.befehle.gruenden) },
  { id: 'bau', fertig: () => eigeneStaedte().some((s) => (s.bau || []).length || (s.schlange || []).length),
    inhalt: () => (fensterOffen() ? S.bauFenster : gewaehlt('stadt') ? S.bauKnopf : { ...S.bau, aktion: eigeneStaedte().length ? zeigeStadt : null }),
    ziel: () => (fensterOffen() ? null : gewaehlt('stadt') ? aktKnopf('Bauen') : null) },
  { id: 'forschung', fertig: () => !!du()?.forschung?.aktiv, inhalt: () => S.forschung, ziel: () => (fensterOffen() ? null : document.getElementById('forschungsanzeige')) },
  { id: 'bewegen', ereignis: 'bewegt', fertig: () => eigeneEinheiten().some((e) => istMilitaer(e) && e.pfad?.length),
    inhalt: () => ({ ...S.bewegen, aktion: eigeneEinheiten().some(istMilitaer) ? () => zeigeEinheit(istMilitaer) : null }) },
  { id: 'erkunden', fertig: () => !eigeneEinheiten().some(istSpaeher) || eigeneEinheiten().some((e) => istSpaeher(e) && e.modus === 'erkunden'),
    inhalt: () => (gewaehlt('einheit', istSpaeher) ? S.erkundenKnopf : { ...S.erkunden, aktion: () => zeigeEinheit(istSpaeher) }),
    ziel: () => (gewaehlt('einheit', istSpaeher) ? aktKnopf(T.befehle.erkunden) : null) },
  { id: 'kampf', ereignis: 'kampf', inhalt: () => S.kampf },
  { id: 'handel', inhalt: () => ({ ...S.handel, aktion: () => F.diplomatie() }), ziel: () => (fensterOffen() ? null : menueKnopf(T.menue.diplomatie)) },
  { id: 'schutz', inhalt: () => { const rest = (du()?.schutz_bis || 0) - serverJetzt(); return rest > 0 ? { ...S.schutz, text: S.schutz.text + ' ' + TT.schutzRest(dauerText(rest)) } : S.schutz; } },
  { id: 'hilfe', inhalt: () => S.hilfe, ziel: () => (fensterOffen() ? null : menueKnopf(T.menue.hilfe)) },
  { id: 'ende', inhalt: () => S.ende },
];

// ---------- Zustand und Darstellung ----------
let aktiv = false, nr = 0, erledigt = false, klein = false, blase = null, rahmen = null, pfeil = null, schleife = null, letzterSchluessel = '', weiterTimer = null;

function speichern(fertig = false) { befehl({ art: 'tutorial', schritt: nr, fertig }).catch?.(() => {}); }

function pfeilCanvas() {
  const c = document.createElement('canvas'); c.width = 11; c.height = 10; c.id = 'tut-pfeil';
  const g = c.getContext('2d');
  const form = ['...XXXXX...', '...XXXXX...', '...XXXXX...', '.XXXXXXXXX.', '..XXXXXXX..', '...XXXXX...', '....XXX....', '.....X.....'];
  const male = (dx, dy, farbe) => { g.fillStyle = farbe; form.forEach((z, y) => [...z].forEach((p, x) => { if (p === 'X') g.fillRect(x + dx, y + dy + 1, 1, 1); })); };
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) male(dx, dy, '#0b0d14');
  male(0, 0, '#f1c40f');
  g.fillStyle = '#fff3a0'; g.fillRect(4, 1, 1, 3);
  return c;
}

function aufbauen() {
  stil();
  if (!blase) { blase = el('div#tut-blase.pix', { role: 'dialog', 'aria-label': TT.titel }); document.body.append(blase); }
  if (!rahmen) { rahmen = el('div#tut-rahmen.versteckt'); document.body.append(rahmen); }
  if (!pfeil) { pfeil = pfeilCanvas(); pfeil.classList.add('versteckt'); document.body.append(pfeil); }
  if (!schleife) schleife = setInterval(takt, 250);
}
function abbauen() {
  aktiv = false;
  clearInterval(schleife); schleife = null; clearTimeout(weiterTimer);
  blase?.remove(); rahmen?.remove(); pfeil?.remove();
  blase = rahmen = pfeil = null; letzterSchluessel = '';
}

function schritt() { return SCHRITTE[nr]; }

function gehe(n) {
  clearTimeout(weiterTimer);
  nr = Math.max(0, Math.min(SCHRITTE.length - 1, n));
  erledigt = false; klein = false; letzterSchluessel = '';
  schritt().start?.();
  speichern(false);
  // schon erfüllt (z. B. Stadt existiert bereits)? Dann gleich weiter.
  if (schritt().fertig?.()) { gehe(nr + 1); return; }
  zeichne();
}
function weiter() {
  if (nr >= SCHRITTE.length - 1) { beenden(true); return; }
  gehe(nr + 1);
}
function geschafft() {
  if (erledigt) return;
  erledigt = true; letzterSchluessel = '';
  try { ton('forschung'); } catch { /* egal */ }
  zeichne();
  weiterTimer = setTimeout(weiter, 1600);
}
function beenden(fertig) {
  speichern(true);
  abbauen();
  if (!fertig) toast(TT.ueberspringenFrage, 'info', { symbol: 'hilfe', dauer: 7000 });
}

function zeichne() {
  if (!aktiv || !blase) return;
  const s = schritt();
  const inh = s.inhalt();
  const offen = fensterOffen();
  const schl = [nr, erledigt, klein, offen, inh.titel, inh.text, !!inh.aktion].join('|');
  if (schl === letzterSchluessel) return;
  letzterSchluessel = schl;
  blase.classList.toggle('fenster-offen', offen);
  blase.classList.toggle('klein', klein);
  if (klein) {
    blase.replaceChildren(el('button.knopf.gold', { onclick: () => { klein = false; letzterSchluessel = ''; zeichne(); }, tip: inh.titel }, symbol('ui', 'hilfe'), `${TT.titel} ${TT.schritt(nr + 1, SCHRITTE.length)}`));
    return;
  }
  const letzter = nr === SCHRITTE.length - 1;
  const mussHandeln = !!(s.fertig || s.ereignis) && s.id !== 'kampf';
  blase.replaceChildren(...[
    el('div.kopf', symbol('ui', erledigt ? 'haken' : 'hilfe', { px: 20 }), el('h2', { text: inh.titel }), el('span.zaehler', { text: TT.schritt(nr + 1, SCHRITTE.length) }),
      el('button.knopf.klein', { onclick: () => { klein = true; letzterSchluessel = ''; zeichne(); }, 'aria-label': 'Verkleinern', tip: 'Verkleinern' }, symbol('ui', 'minus'))),
    el('div.punkte', SCHRITTE.map((_, i) => el('i' + (i <= nr ? '.an' : '')))),
    erledigt ? el('p.geschafft', { text: '✓ ' + (inh.ok || TT.geschafft) }) : null,
    el('p.text', { text: inh.text }),
    el('div.knoepfe',
      letzter ? null : el('button.knopf.klein.links', { onclick: () => beenden(false), text: TT.ueberspringen }),
      inh.aktion && !erledigt ? el('button.knopf' + (mussHandeln ? '.gold' : ''), { onclick: () => { inh.aktion(); letzterSchluessel = ''; } }, symbol('ui', 'sicht'), inh.knopf || TT.zeigMir) : null,
      el('button.knopf' + (mussHandeln && !erledigt ? '' : '.gold'), { onclick: weiter }, letzter ? TT.fertig : TT.weiter, letzter ? null : symbol('ui', 'pfeil_rechts')),
    ),
  ].filter(Boolean));
}

function markieren(ziel) {
  if (!rahmen || !pfeil) return;
  const r = ziel && ziel.isConnected ? ziel.getBoundingClientRect() : null;
  if (blase) blase.style.bottom = '';
  if (!r || !r.width || klein || erledigt) { rahmen.classList.add('versteckt'); pfeil.classList.add('versteckt'); return; }
  Object.assign(rahmen.style, { left: r.left - 5 + 'px', top: r.top - 5 + 'px', width: r.width + 10 + 'px', height: r.height + 10 + 'px' });
  rahmen.classList.remove('versteckt');
  const untenHaelfte = r.top + r.height / 2 > innerHeight / 2;
  pfeil.classList.toggle('unten', untenHaelfte); pfeil.classList.toggle('oben', !untenHaelfte);
  pfeil.style.left = Math.round(r.left + r.width / 2 - 22) + 'px';
  pfeil.style.top = Math.round(untenHaelfte ? r.top - 52 : r.bottom + 12) + 'px';
  pfeil.classList.remove('versteckt');
  // Die Blase darf Ziel und Pfeil nicht verdecken: notfalls darüber schieben.
  if (blase && untenHaelfte) {
    const b = blase.getBoundingClientRect();
    const oben = r.top - 60;
    if (b.bottom > oben && b.right > r.left - 50 && b.left < r.right + 50) blase.style.bottom = Math.round(innerHeight - oben + 6) + 'px';
  }
}

function takt() {
  if (!aktiv || !Z.ansicht) return;
  const s = schritt();
  if (!erledigt && s.fertig?.()) geschafft();
  zeichne();
  let ziel = null;
  try { ziel = s.ziel?.() || null; } catch { ziel = null; }
  markieren(ziel);
}

// ---------- Öffentliche Schnittstelle ----------
/** Startet das Tutorial von vorn (z. B. aus der Hilfe). */
export function starten() {
  aufbauen();
  aktiv = true;
  gehe(0);
}

/** Ereignisse aus dem Spiel: 'start' {neu}, 'stadt_gegruendet', 'verbesserung', 'bewegt', 'kampf', 'feld_angeklickt'. */
export function ereignis(art, daten) {
  if (art === 'start') {
    const t = du()?.tutorial;
    if (t?.fertig) return;
    setTimeout(() => {
      if (aktiv) return;
      aufbauen(); aktiv = true;
      gehe(daten?.neu ? 0 : Math.min(SCHRITTE.length - 1, t?.schritt || 0));
    }, 900);
    return;
  }
  if (!aktiv || erledigt) return;
  const s = schritt();
  if (s.ereignis === art) geschafft();
}

// Gespeicherte Einstellungen (Tag/Nacht, Wetter, Ton) beim Start anwenden: Dieses Modul wird früh geladen.
let eingestellt = false;
const versuchAnwenden = () => { if (eingestellt || !du()) return; eingestellt = true; try { einstellungenAnwenden(); } catch (e) { console.error(e); } };
// Rückfall: Falls das 'start'-Ereignis vor dem Laden dieses Moduls kam, startet das Tutorial hier selbst.
let autoGeprueft = false;
function autoStart() {
  if (autoGeprueft || !du() || !document.getElementById('leiste')) return;
  autoGeprueft = true;
  if (Z.demo || du().tutorial?.fertig) return;
  setTimeout(() => { if (!aktiv && !du()?.tutorial?.fertig) ereignis('start', { neu: false }); }, 2500);
}
versuchAnwenden(); autoStart();
an('aenderung', () => { versuchAnwenden(); autoStart(); });
