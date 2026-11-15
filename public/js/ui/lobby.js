// Lobby: Partien-Liste, neue Partie, Wartezimmer mit Einstellungen (Host) und Start.
import * as netz from '../kern/netz.js';
import { el } from './basis.js';
import { SPIELTEMPO, KI_STUFEN, PARTIE, STD } from '../../shared/regeln.js';
import { FARB_VORSCHLAEGE, farbAbstand, volksnameFehler } from '../../shared/namen.js';

const KI_ANZAHL_MAX = 5, STADTSTAATEN_MAX = 12;
const stufeText = (s) => s.id === 'leicht' ? 'Leicht: baut und forscht langsamer, beginnt keine Kriege'
  : s.id === 'normal' ? 'Normal: spielt fair' : s.id === 'schwer' ? 'Schwer: kämpft aggressiver, greift früher an'
  : `${s.name}: wie Schwer, dazu +${s.bau}% Bau, +${s.forschung}% Forschung, +${s.gold}% Gold, +${s.kampf} Kampfstärke`;
const wert = (x, std) => (x == null ? std : x);

/** Einstellungs-Formular. start: Einstellungen (wie vom Server), gesperrt: nur lesen. Liefert { element, lesen() }. */
export function einstellungsFormular(start = {}, gesperrt = false) {
  const z = start.zugzeit || {};
  const tempo = el('select', { disabled: gesperrt }, ...Object.entries(SPIELTEMPO).map(([id, t]) => el('option', { value: id, text: `${t.name} (${t.rundeMs / 60000 / 60} Std Spielzeit je Runde)`, selected: id === wert(start.tempo, PARTIE.tempo) })));
  const limit = el('input', { type: 'number', min: 0, max: 1000, value: wert(start.rundenlimit, PARTIE.rundenlimit), disabled: gesperrt });
  const haken = (text, an) => { const i = el('input', { type: 'checkbox', checked: an, disabled: gesperrt }); return { i, el: el('label', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, i, text) }; };
  const sE = haken('Eroberung (letztes Volk gewinnt)', wert(start.siege?.eroberung, true));
  const sW = haken('Wissenschaft (als Erster Fusionsforschung)', wert(start.siege?.wissenschaft, true));
  const sP = haken('Punkte beim Rundenlimit', wert(start.siege?.punkte, true));
  const zA = haken('Zugzeit-Konto (nur bei mehreren Menschen)', wert(z.aktiv, true));
  const num = (v, min, max) => el('input', { type: 'number', min, max, value: v, disabled: gesperrt, style: { width: '80px' } });
  const zStart = num(Math.round(wert(z.start, PARTIE.zugzeit.start) / STD), 1, 168), zPlus = num(Math.round(wert(z.plus, PARTIE.zugzeit.plus) / STD), 0, 48), zMax = num(Math.round(wert(z.max, PARTIE.zugzeit.max) / STD), 1, 168), zVerp = num(wert(z.verpasstMax, PARTIE.zugzeit.verpasstMax), 1, 20);
  const maxS = num(wert(start.maxSpieler, 4), 1, PARTIE.maxSpieler);
  const staat = num(wert(start.stadtstaaten, PARTIE.stadtstaaten), 0, STADTSTAATEN_MAX);
  const barb = haken('Barbaren', wert(start.barbaren, true));
  const tiere = haken('Wilde Tiere', wert(start.tiere, true));
  let ki = (start.ki || [{ stufe: 'normal' }, { stufe: 'normal' }]).map((k) => ({ stufe: k.stufe }));
  const kiListe = el('div', { style: { display: 'grid', gap: '6px', gridTemplateColumns: 'minmax(0, 1fr)' } });
  const zeichneKi = () => {
    kiListe.replaceChildren(...ki.map((k, i) => el('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } },
      el('span', { text: `KI ${i + 1}`, style: { minWidth: '44px' } }),
      el('select', { disabled: gesperrt, style: { flex: 1, minWidth: 0 }, onchange: (ev) => { k.stufe = ev.target.value; } }, ...KI_STUFEN.map((s) => el('option', { value: s.id, text: stufeText(s), selected: s.id === k.stufe }))),
      gesperrt ? null : el('button.knopf.klein', { type: 'button', text: '✕', onclick: () => { ki.splice(i, 1); zeichneKi(); } }))));
    if (!gesperrt && ki.length < KI_ANZAHL_MAX) kiListe.append(el('button.knopf.klein', { type: 'button', text: '+ KI-Gegner hinzufügen', onclick: () => { ki.push({ stufe: 'normal' }); zeichneKi(); } }));
  };
  zeichneKi();
  const zeile = (label, inhalt, hinweis) => el('div.formzeile', el('label', { text: label }), inhalt, hinweis ? el('div.klein', { text: hinweis }) : null);
  const element = el('div', { style: { display: 'grid', gap: '2px', gridTemplateColumns: 'minmax(0, 1fr)' } },
    zeile('Spieltempo', tempo, 'Bei längeren Runden vergeht pro Runde mehr Spielzeit: Bauen, Forschen und Wachsen dauern dann weniger Runden.'),
    zeile('Rundenlimit (0 = keines)', limit),
    zeile('Siegarten', el('div', { style: { display: 'grid', gap: '4px' } }, sE.el, sW.el, sP.el)),
    zeile('KI-Gegner', kiListe),
    zeile('Plätze für Menschen', maxS),
    zeile('Stadtstaaten', staat),
    zeile('Welt', el('div', { style: { display: 'grid', gap: '4px' } }, barb.el, tiere.el)),
    zeile('Zugzeit', el('div', { style: { display: 'grid', gap: '6px' } }, zA.el,
      el('div.klein', { text: 'Jeder hat ein Konto in Stunden, das nur im eigenen Zug läuft. Pro beendetem Zug gibt es etwas dazu, bis zum Maximum.' }),
      el('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' } }, 'Start', zStart, 'Std · Plus je Zug', zPlus, 'Std · Maximum', zMax, 'Std'),
      el('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } }, 'KI übernimmt nach', zVerp, 'verpassten Zügen'))),
  );
  return {
    element,
    lesen: () => ({
      tempo: tempo.value, rundenlimit: +limit.value, siege: { eroberung: sE.i.checked, wissenschaft: sW.i.checked, punkte: sP.i.checked },
      ki, maxSpieler: +maxS.value, stadtstaaten: +staat.value, barbaren: barb.i.checked, tiere: tiere.i.checked,
      zugzeit: { aktiv: zA.i.checked, startH: +zStart.value, plusH: +zPlus.value, maxH: +zMax.value, verpasstMax: +zVerp.value },
    }),
  };
}

/** Volksname und Farbe wählen. belegt: bereits vergebene Farben. Liefert { element, lesen(), fehler() }. */
function volkFormular(belegt = [], start = {}) {
  let gewaehlt = start.farbe || FARB_VORSCHLAEGE.find((f) => !belegt.some((b) => farbAbstand(f, b) < 100)) || '#e63946';
  const name = el('input', { type: 'text', maxlength: 24, placeholder: 'z. B. Die Bergleute', value: start.name || '' });
  const eigene = el('input', { type: 'color', value: gewaehlt, onchange: () => { gewaehlt = eigene.value; zeichne(); } });
  const farben = el('div.farbwahl');
  const meld = el('div.fehlertext');
  const zeichne = () => farben.replaceChildren(...FARB_VORSCHLAEGE.map((f) => {
    const zuNah = belegt.some((b) => farbAbstand(f, b) < 100);
    return el('button' + (f === gewaehlt ? '.an' : '') + (zuNah ? '.belegt' : ''), { type: 'button', style: { background: f }, 'aria-label': f, onclick: () => { if (zuNah) { meld.textContent = 'Diese Farbe ist schon vergeben oder zu ähnlich.'; return; } gewaehlt = f; eigene.value = f; meld.textContent = ''; zeichne(); } });
  }));
  zeichne();
  return {
    element: el('div', el('div.formzeile', el('label', { text: 'Name deines Volkes' }), name),
      el('div.formzeile', el('label', { text: 'Farbe' }), farben, el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, el('span.klein', { text: 'Eigene Farbe' }), eigene), meld)),
    lesen: () => ({ name: name.value.trim(), farbe: gewaehlt }),
    fehler: () => volksnameFehler(name.value),
    meldung: (t) => { meld.textContent = t; },
  };
}

const statusText = (p) => p.status === 'lobby' ? 'Wartezimmer' : p.status === 'beendet' ? 'Beendet' : `Runde ${p.runde}`;
const siegText = { eroberung: 'Eroberungssieg', wissenschaft: 'Wissenschaftssieg', punkte: 'Sieg nach Punkten', niederlage: 'Alle Menschen sind ausgeschieden' };

/**
 * Zeigt die Lobby. a: { zeige(...inhalt), spielen(partieId), abmelden(), konto }
 */
export async function zeigeLobby(a, meldung = '') {
  const r = await netz.partienListe();
  if (!r.ok) { a.zeige(el('p.fehlertext', { text: r.fehler || 'Die Partien konnten nicht geladen werden.' }), el('button.knopf', { text: 'Erneut versuchen', onclick: () => zeigeLobby(a) }), el('button.knopf', { text: 'Abmelden', onclick: a.abmelden })); return; }
  const liste = r.partien;
  const eintrag = (p) => {
    const dran = p.am_zug && p.status === 'laeuft';
    const info = el('div', { style: { flex: 1, minWidth: 0 } },
      el('div', { text: p.name, style: { fontWeight: 'bold' } }),
      el('div.klein', { text: `${statusText(p)} · ${p.spieler.map((s) => s.volk).join(', ')}${p.einstellungen.ki.length ? ` · ${p.einstellungen.ki.length} KI` : ''}` }),
      p.status === 'beendet' && p.siegart ? el('div.klein', { text: `${siegText[p.siegart] || p.siegart}${p.sieger ? ' – ' + p.sieger : ''}` }) : null,
      dran ? el('div.gold-t', { text: 'Du bist am Zug!' }) : null);
    const knopf = p.status === 'laeuft' || p.status === 'beendet'
      ? el('button.knopf' + (dran ? '.gold' : ''), { text: p.status === 'beendet' ? 'Ansehen' : 'Spielen', onclick: () => a.spielen(p.id) })
      : el('button.knopf' + (p.ich_dabei ? '' : '.gold'), { text: p.ich_dabei ? 'Wartezimmer' : 'Beitreten', onclick: () => wartezimmer(a, p) });
    return el('div.eintrag', { style: { cursor: 'default', alignItems: 'center' } }, info, knopf);
  };
  a.zeige(
    el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' } }, el('h2', { text: 'Deine Partien', style: { margin: 0 } }), el('span.klein', { text: a.konto })),
    meldung ? el('div.fehlertext', { text: meldung }) : null,
    el('div', { style: { display: 'grid', gap: '6px', margin: '10px 0' } }, ...(liste.length ? liste.map(eintrag) : [el('p.klein', { text: 'Noch keine Partie. Erstelle eine neue oder tritt einer offenen bei.' })])),
    el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
      el('button.knopf.gold', { text: 'Neue Partie', onclick: () => neuePartie(a) }),
      el('button.knopf', { text: 'Aktualisieren', onclick: () => zeigeLobby(a) }),
      el('button.knopf', { text: 'Abmelden', onclick: a.abmelden })),
  );
}

function neuePartie(a) {
  const name = el('input', { type: 'text', maxlength: 30, placeholder: 'z. B. Familienrunde' });
  const volk = volkFormular();
  const form = einstellungsFormular({ ki: [{ stufe: 'normal' }, { stufe: 'normal' }], maxSpieler: 4 });
  const meld = el('div.fehlertext');
  const los = async () => {
    const nf = volk.fehler();
    if (nf) { meld.textContent = nf; return; }
    meld.textContent = '…';
    const r = await netz.partieNeu(name.value.trim(), volk.lesen(), form.lesen());
    if (!r.ok) { meld.textContent = r.fehler; return; }
    wartezimmer(a, r.partie);
  };
  a.zeige(el('h2', { text: 'Neue Partie' }),
    el('div.formzeile', el('label', { text: 'Name der Partie' }), name),
    volk.element, el('h3', { text: 'Einstellungen' }), form.element, meld,
    el('div', { style: { display: 'flex', gap: '8px' } }, el('button.knopf', { text: 'Zurück', onclick: () => zeigeLobby(a) }), el('button.knopf.gold', { text: 'Partie erstellen', style: { flex: 1 }, onclick: los })));
}

async function wartezimmer(a, p) {
  const frisch = await netz.partienListe();
  p = frisch.ok ? (frisch.partien.find((x) => x.id === p.id) || p) : p;
  if (p.status !== 'lobby') { zeigeLobby(a); return; }
  const meld = el('div.fehlertext');
  const spielerListe = el('div', { style: { display: 'grid', gap: '4px' } }, ...p.spieler.map((s) => el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, el('span', { style: { width: '14px', height: '14px', background: s.farbe || '#888', border: '2px solid #000', display: 'inline-block' } }), `${s.volk} `, el('span.klein', { text: `(${s.konto})` }))));
  const teile = [el('h2', { text: p.name }), el('p.klein', { text: `Host: ${p.host}. Gib den Namen der Partie an Mitspieler weiter, sie sehen sie dann in ihrer Liste.` }), el('h3', { text: `Menschen (${p.spieler.length}/${p.einstellungen.maxSpieler})` }), spielerListe];
  if (!p.ich_dabei) {
    const belegt = p.spieler.map((s) => s.farbe).filter(Boolean);
    const volk = volkFormular(belegt);
    const los = async () => {
      const nf = volk.fehler(); if (nf) { volk.meldung(nf); return; }
      const r = await netz.partieBeitreten(p.id, volk.lesen());
      if (!r.ok) { volk.meldung(r.fehler); return; }
      wartezimmer(a, r.partie);
    };
    a.zeige(...teile, el('h3', { text: 'Dein Volk' }), volk.element, el('div', { style: { display: 'flex', gap: '8px' } }, el('button.knopf', { text: 'Zurück', onclick: () => zeigeLobby(a) }), el('button.knopf.gold', { text: 'Beitreten', style: { flex: 1 }, onclick: los })));
    return;
  }
  const form = einstellungsFormular(p.einstellungen, !p.ich_host);
  teile.push(el('h3', { text: 'Einstellungen' }), form.element, meld);
  const knoepfe = [el('button.knopf', { text: 'Zurück', onclick: () => zeigeLobby(a) }), el('button.knopf', { text: 'Aktualisieren', onclick: () => wartezimmer(a, p) })];
  if (p.ich_host) {
    knoepfe.push(el('button.knopf', { text: 'Einstellungen speichern', onclick: async () => { const r = await netz.partieEinstellungen(p.id, form.lesen()); if (!r.ok) meld.textContent = r.fehler; else wartezimmer(a, r.partie); } }));
    knoepfe.push(el('button.knopf.gold', { text: 'Partie starten', onclick: async () => {
      meld.textContent = 'Die Welt wird erschaffen …';
      const sp = await netz.partieEinstellungen(p.id, form.lesen());
      if (!sp.ok) { meld.textContent = sp.fehler; return; }
      const r = await netz.partieStarten(p.id);
      if (!r.ok) { meld.textContent = r.fehler; return; }
      a.spielen(p.id);
    } }));
    knoepfe.push(el('button.knopf.rot', { text: 'Löschen', onclick: async () => { if (confirm('Partie wirklich löschen?')) { await netz.partieLoeschen(p.id); zeigeLobby(a); } } }));
  } else {
    knoepfe.push(el('button.knopf.rot', { text: 'Verlassen', onclick: async () => { await netz.partieVerlassen(p.id); zeigeLobby(a); } }));
    teile.push(el('p.klein', { text: 'Warte, bis der Host die Partie startet. Dann erscheint sie bei „Spielen“.' }));
  }
  a.zeige(...teile, el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, ...knoepfe));
}
