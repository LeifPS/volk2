// Start des Clients: Anmeldung/Registrierung, Volk gründen, Spielansicht aufbauen. Mit ?demo=1 läuft alles ohne Server.
import { Z, an, du, eigeneStaedte, eigeneEinheiten, volk, partie } from './kern/zustand.js';
import * as netz from './kern/netz.js';
import { zeigeLobby } from './ui/lobby.js';
import * as rundenUi from './ui/runden.js';
import { setzePartieQuelle } from './ui/basis.js';
import { el, toast } from './ui/basis.js';
import { T } from './texte.js';
import { karte } from '../shared/karte.js';
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
  setzePartieQuelle(() => partie());
  const token = netz.gespeichertesToken();
  let partieId = null;
  try { partieId = sessionStorage.getItem('volk_partie'); } catch { /* egal */ }
  if (token && partieId) {
    zeigeStart(el('p', { text: T.verbinde }));
    try { await verbindenMit(token, partieId); return; } catch (e) { try { sessionStorage.removeItem('volk_partie'); } catch { /* egal */ } }
  }
  if (token) {
    zeigeStart(el('p', { text: T.verbinde }));
    const r = await netz.partienListe();
    if (r.ok) { lobby(); return; }
    netz.tokenSpeichern(null);
  }
  anmeldeMaske();
}

function zeigeStart(...inhalt) {
  let s = document.getElementById('start');
  if (!s) { s = el('div#start'); document.body.append(s); }
  s.classList.remove('versteckt');
  s.replaceChildren(el('div.pix.breit', el('h1', { text: T.spielname }), el('p.klein', { text: T.untertitel, style: { textAlign: 'center', marginTop: 0 } }), ...inhalt));
}

/** Lobby: Liste der Partien. */
function lobby(meldung = '') {
  zeigeLobby({ zeige: zeigeStart, spielen: partieOeffnen, abmelden: () => { netz.abmelden(); anmeldeMaske(); }, konto: Z.konto || '' }, meldung);
}

/** Verbindet mit einer laufenden Partie. Die Seite wird dafür neu geladen, damit der Zustand sauber ist. */
function partieOeffnen(id) {
  try { sessionStorage.setItem('volk_partie', id); } catch { /* egal */ }
  location.reload();
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
    Z.konto = r.name || name.value.trim();
    lobby();
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

async function verbindenMit(token, partieId) {
  await netz.verbinden(token, partieId);
  an('sitzung_ungueltig', () => { netz.tokenSpeichern(null); anmeldeMaske('anmelden', T.sitzungAbgelaufen); });
  an('verbindung', (ok) => { if (spielAufgebaut) toast(ok ? T.verbindungDa : T.verbindungWeg, ok ? 'erfolg' : 'warnung'); });
  warteAufAnsicht();
}

function zurueckZurLobby() {
  try { sessionStorage.removeItem('volk_partie'); } catch { /* egal */ }
  location.reload();
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
  if (partie()) rundenUi.init(zurueckZurLobby);
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

  }
}

start().catch((e) => { console.error(e); zeigeStart(el('p.fehlertext', { text: 'Fehler beim Start: ' + e.message })); });
