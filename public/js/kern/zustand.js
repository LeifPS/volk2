// Client-Zustand: die vom Server gelieferte Ansicht, Nebel, Auswahl und ein kleiner Ereignisbus.
// Der Client legt nie Spielwerte fest; Fortschritte werden nur aus Server-Zeitstempeln berechnet.
import { ANZAHL } from '../../shared/hex.js';
import { setzeUhr, jetzt } from '../../shared/uhr.js';

export const Z = {
  ansicht: null,        // letzte vollständige Ansicht (mit eingespielten Deltas)
  nebel: new Uint8Array(Math.ceil(ANZAHL / 8)),
  konto: null,
  volk: null,
  versatz: 0,           // Serverzeit - lokale Zeit
  auswahl: null,        // { art: 'einheit'|'stadt'|'feld', id }
  demo: false,
  verbunden: false,
};

const hoerer = new Map();
export function an(ereignis, fn) { if (!hoerer.has(ereignis)) hoerer.set(ereignis, new Set()); hoerer.get(ereignis).add(fn); return () => hoerer.get(ereignis).delete(fn); }
export function melde(ereignis, daten) { for (const fn of hoerer.get(ereignis) || []) { try { fn(daten); } catch (e) { console.error(e); } } }

/** Serverzeit (abgeglichen). */
export function serverJetzt() { return jetzt(); }
export function setzeVersatz(v) { Z.versatz = v; setzeUhr(() => (Z.ansicht?.partie ? Z.ansicht.t : Date.now() + Z.versatz)); }
/** Echte Server-Uhrzeit (für das Zugzeit-Konto), unabhängig von der angehaltenen Spielzeit. */
export function echtJetzt() { return Date.now() + Z.versatz; }
export const partie = () => Z.ansicht?.partie || null;
export const amZug = () => { const p = partie(); return !!p && p.status === 'laeuft' && p.dran === Z.volk; };

export function nebelSetzen(b64) {
  const s = atob(b64);
  const n = new Uint8Array(Math.ceil(ANZAHL / 8));
  for (let i = 0; i < Math.min(n.length, s.length); i++) n[i] = s.charCodeAt(i);
  Z.nebel = n;
}
export function erkundet(i) { return (Z.nebel[i >> 3] & (1 << (i & 7))) !== 0; }

export function vollSetzen(ansicht, nebel) {
  Z.ansicht = ansicht;
  setzeVersatz(Z.versatz);
  if (nebel) nebelSetzen(nebel);
  melde('aenderung', { voll: true });
}

export function deltaAnwenden(m) {
  const a = Z.ansicht;
  if (!a) return;
  const d = m.d;
  const gruppen = new Set();
  if (d) {
    for (const k of ['voelker', 'diplomatie', 'staedte', 'einheiten', 'felder', 'lager', 'wunder', 'angebote']) {
      if (!d[k]) continue;
      gruppen.add(k);
      a[k] = a[k] || {};
      for (const [id, x] of Object.entries(d[k].set || {})) a[k][id] = x;
      for (const id of d[k].del || []) delete a[k][id];
    }
    if (d.du) { const alt = a.du; a.du = d.du; gruppen.add('du'); neueMeldungen(alt, a.du); }
    if (d.welt) { a.welt = d.welt; gruppen.add('welt'); }
    if (d.partie) { a.partie = d.partie; gruppen.add('partie'); }
    if (d.t) a.t = d.t;
  }
  for (const i of m.erkundet || []) Z.nebel[i >> 3] |= 1 << (i & 7);
  if ((m.erkundet || []).length) gruppen.add('nebel');
  if (m.kaempfe?.length) melde('kampf', m.kaempfe);
  melde('aenderung', { gruppen });
}

function neueMeldungen(alt, neu) {
  const altMax = Math.max(0, ...(alt?.meldungen || []).map((x) => x.id));
  const frisch = (neu.meldungen || []).filter((x) => x.id > altMax);
  if (frisch.length) melde('meldungen', frisch);
}

// ---------- bequeme Zugriffe ----------
export const du = () => Z.ansicht?.du;
export const volk = (id) => Z.ansicht?.voelker?.[id];
export const einheit = (id) => Z.ansicht?.einheiten?.[id];
export const stadt = (id) => Z.ansicht?.staedte?.[id];
export const feldInfo = (i) => Z.ansicht?.felder?.[i];
export function eigeneEinheiten() { const v = Z.volk; return Object.values(Z.ansicht?.einheiten || {}).filter((e) => e.volk === v); }
export function eigeneStaedte() { const v = Z.volk; return Object.values(Z.ansicht?.staedte || {}).filter((s) => s.volk === v); }
export function stadtAuf(i) { for (const s of Object.values(Z.ansicht?.staedte || {})) if (s.feld === i) return s; return null; }
export function einheitenAuf(i) { return Object.values(Z.ansicht?.einheiten || {}).filter((e) => !e.in && aktuellesFeld(e) === i); }
export function besitzerVon(i) { const f = feldInfo(i); if (!f || !f.s) return null; const s = stadt(f.s); return s ? s.volk : null; }

/** Aktuelles Feld einer Einheit unter Berücksichtigung ihres Marschs (lokal interpoliert aus Server-Zeitstempeln). */
export function aktuellesFeld(e) {
  if (!e.pfad || !e.pfad.length || Z.ansicht?.partie) return e.feld; // Runden: Einheiten stehen zwischen den Zügen auf ihrem Feld
  const t = serverJetzt();
  let f = e.feld;
  for (const p of e.pfad) { if (p.t <= t) f = p.f; else break; }
  return f;
}

/** Aktuelle Lebenspunkte (lokal hochgerechnet aus Heilrate). */
export function aktuelleHp(e) {
  if (!e.heilrate) return e.hp;
  return Math.min(100, e.hp + e.heilrate * Math.max(0, serverJetzt() - (e.hp_um || 0)) / 3600000);
}

/** Aktuelles Gold/Lager (aus Rate × Zeit). */
export function aktuellesGold() {
  const d = du(); if (!d) return 0;
  return Math.max(0, d.gold + d.raten.gold * Math.max(0, serverJetzt() - d.stand_um) / 3600000);
}
export function aktuellesLager(gut) {
  const d = du(); if (!d) return 0;
  const alt = d.lager[gut] || 0, rate = d.raten.material[gut] || 0, cap = d.raten.kapazitaet[gut] || Infinity;
  if (alt >= cap) return alt;
  return Math.min(cap, alt + rate * Math.max(0, serverJetzt() - d.stand_um) / 3600000);
}
export function forschungsFortschritt() {
  const f = du()?.forschung; if (!f || !f.aktiv || !f.dauer_ms) return 0;
  return Math.min(1, f.fortschritt + Math.max(0, serverJetzt() - du().stand_um) / f.dauer_ms);
}
