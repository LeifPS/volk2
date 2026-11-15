// Runden-Anzeige: wer ist am Zug, Zugzeit-Konto, "Zug beenden", Spielende.
import { Z, an, du, partie, amZug, echtJetzt, eigeneStaedte, eigeneEinheiten } from '../kern/zustand.js';
import * as netz from '../kern/netz.js';
import { el, toast, dauerText, frageJaNein } from './basis.js';
import { ton } from '../audio.js';

let leiste, knopf, ende = null, zurueck = null, warAmZug = null, letzteRunde = 0;
const SIEG = { eroberung: 'Eroberungssieg', wissenschaft: 'Wissenschaftssieg', punkte: 'Sieg nach Punkten', niederlage: 'Alle Menschen sind ausgeschieden' };

/** Wie viele Einheiten und Städte warten noch auf einen Befehl? */
function offeneArbeit() {
  let n = 0;
  for (const s of eigeneStaedte()) if (!(s.bau || []).length && !(s.schlange || []).length) n++;
  for (const e of eigeneEinheiten()) {
    if (e.pfad?.length || e.arbeit || e.route || e.in || e.einsatz) continue;
    if (['schlafen', 'befestigt', 'erkunden', 'auto_arbeit'].includes(e.modus)) continue;
    if (e.mp != null && e.mp <= 1e-6) continue;
    n++;
  }
  if (!du()?.forschung?.aktiv) n++;
  return n;
}

async function zugBeenden() {
  const offen = offeneArbeit();
  if (offen > 0 && !(await frageJaNein('Zug beenden?', `Es gibt noch ${offen} ${offen === 1 ? 'Stadt, Einheit oder Forschung' : 'Städte, Einheiten oder Forschungen'} ohne Befehl. Trotzdem beenden?`, 'Zug beenden', 'Weiterspielen'))) return;
  knopf.disabled = true;
  const r = await netz.befehl({ art: 'zug_beenden' });
  if (!r.ok) toast(r.fehler || 'Der Zug konnte nicht beendet werden.', 'warnung');
  zeichne();
}

export function init(zurueckZurLobby) {
  zurueck = zurueckZurLobby;
  leiste = el('div#rundenleiste.pix');
  knopf = el('button#zugbeenden.knopf.gold', { text: 'Zug beenden', onclick: zugBeenden });
  document.body.append(leiste, knopf);
  an('aenderung', zeichne);
  setInterval(zeichne, 1000);
  zeichne();
}

function kontoText(p) {
  const ich = p.reihe.find((v) => v.id === Z.volk);
  if (!p.zeit.aktiv || !ich || ich.bank == null) return null;
  if (p.dran === Z.volk && p.frist) return `Zugzeit: ${dauerText(Math.max(0, p.frist - echtJetzt()), true)}`;
  return `Zugzeit-Konto: ${dauerText(ich.bank, true)}`;
}

function zeichne() {
  const p = partie();
  if (!p || !leiste) return;
  const dran = p.reihe.find((v) => v.id === p.dran);
  const ich = amZug();
  leiste.classList.toggle('dran', ich);
  const teile = [el('span', { text: `Runde ${p.runde}${p.rundenlimit ? ' / ' + p.rundenlimit : ''}` })];
  if (p.status === 'laeuft') {
    teile.push(el('span', { class: ich ? 'gold-t' : '', text: ich ? 'Du bist am Zug' : (dran ? `${dran.name} ist am Zug` : '…') }));
    const k = kontoText(p); if (k) teile.push(el('span.klein', { text: k }));
  }
  teile.push(el('span.klein', { text: `1 Runde = ${p.rundeMs / 3600000} Std Spielzeit`, tip: 'So viel Spielzeit vergeht in der Welt, wenn alle gezogen haben. Bau, Forschung und Wachstum laufen in dieser Zeit weiter.' }));
  if (zurueck) teile.push(el('button.knopf.klein', { text: 'Partien', onclick: zurueck }));
  leiste.replaceChildren(...teile);
  knopf.style.display = ich ? '' : 'none';
  knopf.disabled = false;
  if (warAmZug === false && ich) { toast('Du bist am Zug!', 'erfolg'); ton('meldung'); try { document.title = 'Du bist dran – Volk'; } catch { /* egal */ } }
  if (ich === false) { try { document.title = 'Volk'; } catch { /* egal */ } }
  if (letzteRunde && p.runde > letzteRunde && !ich) { /* neue Runde, anderer am Zug */ }
  warAmZug = ich; letzteRunde = p.runde;
  if (p.status === 'beendet' && !ende) zeigeEnde(p);
}

function zeigeEnde(p) {
  const sieger = p.reihe.find((v) => v.id === p.sieger);
  const gewonnen = sieger && sieger.id === Z.volk;
  ende = el('div#spielende', el('div.pix',
    el('h2', { text: gewonnen ? 'Sieg!' : 'Die Partie ist zu Ende' }),
    el('p', { text: `${SIEG[p.siegart] || 'Ende'} in Runde ${p.runde}.` }),
    sieger ? el('p', { text: `Sieger: ${sieger.name}` }) : null,
    el('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center' } },
      el('button.knopf', { text: 'Weiter ansehen', onclick: () => { ende.classList.add('versteckt'); } }),
      zurueck ? el('button.knopf.gold', { text: 'Zu den Partien', onclick: () => zurueck() }) : null)));
  document.body.append(ende);
}
