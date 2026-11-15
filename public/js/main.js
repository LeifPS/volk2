// Start des Clients: Anmeldung/Registrierung, Volk gründen, Spielansicht aufbauen. Mit ?demo=1 läuft alles ohne Server.
import { Z, an, du, eigeneStaedte, eigeneEinheiten, volk } from './kern/zustand.js';
import * as netz from './kern/netz.js';
import { el, toast, fehler, fenster, dauerText, uhrzeit } from './ui/basis.js';
import { T } from './texte.js';
import { karte } from '../shared/karte.js';
import { FARB_VORSCHLAEGE, farbAbstand, volksnameFehler } from '../shared/namen.js';
import './grafik/alle.js';
import * as render from './karte/render.js';
import * as eingabe from './eingabe.js';
import * as hud from './ui/hud.js';
import * as F from './ui/fenster.js';
import { tonStarten, ton, musikZeitalter, einstellungenSetzen } from './audio.js';

const params = new URLSearchParams(location.search);
let spielAufgebaut = false;

async function start() {
  karte(); // Karte einmal erzeugen (deterministisch aus dem Seed)
  render.init(document.getElementById('karte'));
  if (params.get('demo')) { const demo = await import('./demo.js'); await demo.starteDemo(params); return; }
  const token = netz.gespeichertesToken();
  if (token) {
    zeigeStart(el('p', { text: T.verbinde }));
    try { await verbindenMit(token); return; } catch (e) { netz.tokenSpeichern(null); }
  }
  anmeldeMaske();
}

function zeigeStart(...inhalt) {
  let s = document.getElementById('start');
  if (!s) { s = el('div#start'); document.body.append(s); }
  s.classList.remove('versteckt');
  s.replaceChildren(el('div.pix', el('h1', { text: T.spielname }), el('p.klein', { text: T.untertitel, style: { textAlign: 'center', marginTop: 0 } }), ...inhalt));
}
function startWeg() { document.getElementById('start')?.classList.add('versteckt'); }

function anmeldeMaske(modus = 'anmelden', fehlertext = '') {
  const name = el('input', { type: 'text', autocomplete: 'username', maxlength: 20 });
  const pw = el('input', { type: 'password', autocomplete: modus === 'anmelden' ? 'current-password' : 'new-password', maxlength: 200 });
  const meld = el('div.fehlertext', { text: fehlertext });
  const los = async (ev) => {
    ev?.preventDefault();
    tonStarten();
    meld.textContent = '…';
    const r = modus === 'anmelden' ? await netz.anmelden(name.value.trim(), pw.value) : await netz.registrieren(name.value.trim(), pw.value);
    if (!r.ok) { meld.textContent = r.fehler; return; }
    netz.tokenSpeichern(r.token);
    try { await verbindenMit(r.token); } catch (e) { meld.textContent = e.message; }
  };
  const form = el('form', { onsubmit: los },
    el('div.formzeile', el('label', { text: T.benutzername }), name),
    el('div.formzeile', el('label', { text: T.passwort }), pw, el('div.klein', { text: modus === 'registrieren' ? T.passwortHinweis : '' })),
    meld,
    el('button.knopf.gold', { type: 'submit', style: { width: '100%' } }, modus === 'anmelden' ? T.anmelden : T.registrieren),
  );
  zeigeStart(
    el('div.reiter', el('button.knopf' + (modus === 'anmelden' ? '.an' : ''), { text: T.anmelden, onclick: () => anmeldeMaske('anmelden') }), el('button.knopf' + (modus === 'registrieren' ? '.an' : ''), { text: T.registrieren, onclick: () => anmeldeMaske('registrieren') })),
    modus === 'registrieren' ? el('p.klein', { text: T.kontoHinweis }) : null,
    form,
    el('p', { style: { textAlign: 'center' } }, el('a', { href: '?demo=1', style: { color: 'var(--text2)' }, text: T.demo })),
  );
  setTimeout(() => name.focus(), 50);
}

async function verbindenMit(token) {
  const hallo = await netz.verbinden(token);
  an('sitzung_ungueltig', () => { netz.tokenSpeichern(null); anmeldeMaske('anmelden', T.sitzungAbgelaufen); });
  an('verbindung', (ok) => { if (spielAufgebaut) toast(ok ? T.verbindungDa : T.verbindungWeg, ok ? 'erfolg' : 'warnung'); });
  if (!hallo.volk) volkMaske(hallo.farben || []);
  else warteAufAnsicht();
}

function volkMaske(belegt, fehlertext = '') {
  let gewaehlt = FARB_VORSCHLAEGE.find((f) => !belegt.some((b) => farbAbstand(f, b) < 100)) || '#e63946';
  const name = el('input', { type: 'text', maxlength: 24, placeholder: 'z. B. Die Bergleute' });
  const meld = el('div.fehlertext', { text: fehlertext });
  const eigene = el('input', { type: 'color', value: gewaehlt, onchange: () => { gewaehlt = eigene.value; zeichneFarben(); } });
  const farben = el('div.farbwahl');
  const zeichneFarben = () => farben.replaceChildren(...FARB_VORSCHLAEGE.map((f) => {
    const zuNah = belegt.some((b) => farbAbstand(f, b) < 100);
    return el('button' + (f === gewaehlt ? '.an' : '') + (zuNah ? '.belegt' : ''), { type: 'button', style: { background: f }, 'aria-label': f, onclick: () => { if (zuNah) { meld.textContent = 'Diese Farbe ist schon vergeben oder zu ähnlich.'; return; } gewaehlt = f; eigene.value = f; zeichneFarben(); } });
  }));
  zeichneFarben();
  const los = async (ev) => {
    ev.preventDefault();
    const nf = volksnameFehler(name.value);
    if (nf) { meld.textContent = nf; return; }
    meld.textContent = '…';
    const r = await netz.volkGruenden(name.value.trim(), gewaehlt);
    if (!r.ok) { meld.textContent = r.fehler; return; }
    Z.volk = r.volk;
    warteAufAnsicht(true);
  };
  zeigeStart(el('h2', { text: T.volkGruenden }), el('form', { onsubmit: los },
    el('div.formzeile', el('label', { text: T.volksname }), name, el('div.klein', { text: T.volksnameHinweis })),
    el('div.formzeile', el('label', { text: T.farbe }), farben, el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, el('span.klein', { text: T.eigeneFarbe }), eigene), el('div.klein', { text: T.farbeHinweis })),
    meld, el('button.knopf.gold', { type: 'submit', style: { width: '100%' } }, T.losGehts)));
  setTimeout(() => name.focus(), 50);
}

function warteAufAnsicht(neu = false) {
  if (Z.ansicht && Z.ansicht.du) return spielAufbauen(neu);
  const weg = an('aenderung', () => { if (Z.ansicht?.du) { weg(); spielAufbauen(neu); } });
  netz.vollAnfordern();
}

export function spielAufbauen(neu = false) {
  if (spielAufgebaut) return;
  spielAufgebaut = true;
  startWeg();
  Z.volk = Z.volk || du().id;
  hud.aufbauen();
  eingabe.init(document.getElementById('karte'));
  einstellungenSetzen(du().einstellungen || {});
  musikZeitalter(du().zeitalter || 0);
  an('aenderung', () => { const z = du()?.zeitalter || 0; musikZeitalter(z); });
  // Kamera auf die Hauptstadt oder die erste Einheit
  const st = eigeneStaedte().find((s) => s.hauptstadt) || eigeneStaedte()[0];
  const e = eigeneEinheiten().find((x) => x.typ === 'siedler') || eigeneEinheiten()[0];
  if (st) render.zentriereAuf(st.feld); else if (e) { render.zentriereAuf(e.feld); hud.waehle({ art: 'einheit', id: e.id }); } else if (du().startfeld != null) render.zentriereAuf(du().startfeld);
  hud.aktualisieren();
  if (!Z.demo) {
    const d = du();
    if (!d.tutorial?.fertig) F.tutorialEreignis('start', { neu });
    else if (d.zuletzt_gesehen) waehrendWeg(d.zuletzt_gesehen);
  }
}

function waehrendWeg(seit) {
  const l = (du().meldungen || []).filter((m) => m.t > seit);
  if (!l.length) return;
  const wichtig = l.filter((m) => m.wichtig || ['kampf', 'krieg', 'forschung', 'wunder', 'diplomatie', 'handel', 'zeitalter'].includes(m.art));
  fenster(T.waehrendWeg, (i) => {
    i.append(el('p', { text: `Du warst ${dauerText(Date.now() - seit)} weg. Das ist inzwischen passiert:` }));
    for (const m of (wichtig.length ? wichtig : l).slice(-25).reverse()) i.append(el('div.eintrag', { onclick: m.feld != null ? () => hud.springe(m.feld) : null }, el('div.klein', { text: uhrzeit(m.t), style: { minWidth: '92px' } }), el('div', { text: m.text })));
    if (l.length > wichtig.length) i.append(el('p.klein', { text: `Dazu ${l.length - wichtig.length} kleinere Meldungen (Glocke oben).` }));
  }, { breite: 'mittel' });
}

start().catch((e) => { console.error(e); zeigeStart(el('p.fehlertext', { text: 'Fehler beim Start: ' + e.message })); });
