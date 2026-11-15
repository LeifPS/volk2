// Kern der Spiel-Engine: Zustand, Ereignisschleife, Befehle.
// Nichts tickt: Jede Wartezeit ist ein Zielzeitpunkt; fällige Ereignisse werden in zeitlicher Reihenfolge abgearbeitet,
// wenn jemand etwas anfragt oder der Alarm des Durable Objects feuert. Erträge werden als Rate × Zeit integriert.
import { jetzt } from '../uhr.js';
import { zufallsquelle } from '../zufall.js';
import { STD } from '../regeln.js';
import { wirtschaft } from './wirtschaft.js';
import { bau } from './bau.js';
import { forschung } from './forschung.js';
import { einheiten } from './einheiten.js';
import { kampf } from './kampf.js';
import { diplomatie } from './diplomatie.js';
import { akteure } from './akteure.js';
import { ansicht } from './ansicht.js';
import { start } from './start.js';

export class SpielFehler extends Error {}
/** Wirft einen verständlichen Fehler für den Spieler, wenn die Bedingung nicht erfüllt ist. */
export function pruefe(bedingung, text) { if (!bedingung) throw new SpielFehler(text); }

export const ZUSTAND_VERSION = 1;

export function leererZustand(t = jetzt()) {
  return {
    version: ZUSTAND_VERSION, zeit: t, erstellt: t, naechsteId: 1, zufall: 1234567,
    voelker: {}, staedte: {}, einheiten: {}, felder: {}, diplomatie: {}, angebote: {}, wunder: {}, lager: {},
    global: { initialisiert: false },
  };
}

export class Spiel {
  constructor(zustand) {
    this.z = zustand || leererZustand();
    this.t = this.z.zeit;
    this.schmutzig = new Set();   // geänderte Schlüssel für die Speicherung
    this.geaendert = true;        // irgendetwas Sichtbares hat sich geändert (für Ansichts-Deltas)
    this._raten = {};             // Cache der Ertragsraten je Volk
    this._pos = null;             // Feld -> Einheiten-IDs
    this._stadtPos = null;        // Feld -> Stadt-ID
    this._nebel = {};             // Volk -> Uint8Array erkundet (dekodiert)
    this.ausgehend = [];          // Ereignisse für Clients (z. B. Kampf-Animationen)
  }

  // ---------- Grundlagen ----------
  zufall() {
    const q = zufallsquelle(this.z.zufall);
    const r = q();
    this.z.zufall = q.zustand();
    this.markiere('g');
    return r;
  }
  neueId() { const id = this.z.naechsteId++; this.markiere('g'); return id; }
  markiere(k) { this.schmutzig.add(k); this.geaendert = true; }

  volk(id) { return this.z.voelker[id]; }
  stadt(id) { return this.z.staedte[id]; }
  einheit(id) { return this.z.einheiten[id]; }
  alleVoelker() { return Object.values(this.z.voelker); }
  alleStaedte() { return Object.values(this.z.staedte); }
  alleEinheiten() { return Object.values(this.z.einheiten); }
  staedteVon(vid) { return this.alleStaedte().filter((s) => s.volk === vid); }
  einheitenVon(vid) { return this.alleEinheiten().filter((e) => e.volk === vid); }

  feld(i) { return this.z.felder[i] || null; }
  setzeFeld(i, patch) {
    const f = { ...(this.z.felder[i] || {}), ...patch };
    for (const k of Object.keys(f)) if (f[k] === null || f[k] === undefined || f[k] === false) delete f[k];
    if (Object.keys(f).length) this.z.felder[i] = f; else delete this.z.felder[i];
    this.markiere('f' + i);
  }
  /** Stadt-ID, der das Feld gehört (oder undefined). */
  feldStadt(i) { const f = this.z.felder[i]; return f ? f.s : undefined; }
  /** Volk-ID, dem das Feld gehört (oder undefined). */
  besitzer(i) { const s = this.feldStadt(i); return s ? this.z.staedte[s]?.volk : undefined; }

  positionenNeu() { this._pos = null; this._stadtPos = null; }
  einheitenAuf(i) {
    if (!this._pos) {
      this._pos = new Map();
      for (const e of this.alleEinheiten()) {
        if (e.in) continue; // verladen (Transport/Träger)
        const l = this._pos.get(e.feld); if (l) l.push(e.id); else this._pos.set(e.feld, [e.id]);
      }
    }
    return (this._pos.get(i) || []).map((id) => this.z.einheiten[id]).filter(Boolean);
  }
  stadtAuf(i) {
    if (!this._stadtPos) { this._stadtPos = new Map(); for (const s of this.alleStaedte()) this._stadtPos.set(s.feld, s.id); }
    const id = this._stadtPos.get(i);
    return id ? this.z.staedte[id] : null;
  }

  /** Meldung für ein Volk (Benachrichtigungsliste, "Während du weg warst"). */
  meldung(vid, text, o = {}) {
    const v = this.z.voelker[vid];
    if (!v || v.art !== 'spieler') return;
    v.meldungen = v.meldungen || [];
    v.meldungen.push({ id: this.neueId(), t: this.t, text, art: o.art || 'info', feld: o.feld ?? null, wichtig: !!o.wichtig });
    if (v.meldungen.length > 120) v.meldungen.splice(0, v.meldungen.length - 120);
    this.markiere('v' + vid);
  }

  // ---------- Ereignisschleife ----------
  /** Arbeitet alle Ereignisse bis zum Zeitpunkt `bis` in zeitlicher Reihenfolge ab. */
  verarbeite(bis = jetzt()) {
    let n = 0, letztes = null, gleich = 0;
    for (;;) {
      const e = this.naechstesEreignis();
      if (!e || e.t > bis) break;
      if (e.t > this.t) this.t = e.t;
      // Schutz gegen ein Ereignis, das sich nicht selbst erledigt
      if (letztes && letztes.schluessel === e.schluessel && letztes.t === e.t) { if (++gleich > 3) { this.fehlerProtokoll('Ereignis hängt: ' + e.schluessel); e.notbremse?.(); if (gleich > 6) break; } } else gleich = 0;
      letztes = e;
      try { e.f(); } catch (err) {
        if (err instanceof SpielFehler) this.fehlerProtokoll('Ereignis ' + e.schluessel + ': ' + err.message);
        else this.fehlerProtokoll('Ereignis ' + e.schluessel + ': ' + (err && err.stack || err));
        try { e.notbremse?.(); } catch (e2) { /* egal */ }
      }
      if (++n > 500000) { this.fehlerProtokoll('Zu viele Ereignisse'); break; }
    }
    if (bis > this.t) this.t = bis;
    if (this.z.zeit !== this.t) { this.z.zeit = this.t; this.schmutzig.add('g'); }
    return n;
  }

  fehlerProtokoll(text) {
    (this.z.global.fehler ||= []).push({ t: this.t, text });
    if (this.z.global.fehler.length > 50) this.z.global.fehler.shift();
    if (typeof console !== 'undefined') console.warn('[Volk]', text);
  }

  /** Das zeitlich nächste fällige Ereignis (oder null). */
  naechstesEreignis() {
    let best = null;
    const k = (t, schluessel, f, notbremse) => { if (t != null && Number.isFinite(t) && (!best || t < best.t)) best = { t, schluessel, f, notbremse }; };
    for (const e of this.alleEinheiten()) {
      if (e.pfad && e.pfad.length) k(e.pfad[0].t, 'schritt' + e.id, () => this.schritt(e.id), () => { e.pfad = []; });
      if (e.arbeit) k(e.arbeit.fertig_um, 'arbeit' + e.id, () => this.arbeitFertig(e.id), () => { e.arbeit = null; });
      if (e.einsatz) k(e.einsatz.zurueck_um, 'einsatz' + e.id, () => this.einsatzZurueck(e.id), () => { e.einsatz = null; });
    }
    for (const s of this.alleStaedte()) {
      for (const b of s.bau || []) k(b.fertig_um, 'bau' + s.id, () => this.bauFertig(s.id), () => { s.bau = []; });
      if (s.warte_um) k(s.warte_um, 'warte' + s.id, () => { s.warte_um = null; this.bauSchlangeWeiter(s.id); });
      k(this.wachstumsZeit(s), 'wachs' + s.id, () => this.wachstum(s.id), () => { s.nahrung = 0; });
      k(this.grenzZeit(s), 'grenze' + s.id, () => this.grenzwachstum(s.id), () => { s.kultur = 0; });
    }
    for (const v of this.alleVoelker()) {
      k(this.forschungsZeit(v), 'forsch' + v.id, () => this.forschungFertig(v.id), () => { v.forschung.aktiv = null; });
      k(this.goldNullZeit(v), 'goldnull' + v.id, () => this.goldNull(v.id));
      if (v.mangel_um) k(v.mangel_um, 'mangel' + v.id, () => this.mangelSchritt(v.id), () => { v.mangel_um = null; });
      if (v.abkommen_bis) k(v.abkommen_bis, 'abk' + v.id, () => { this.aendern(v.id); v.abkommen_bis = null; this.markiere('v' + v.id); this.meldung(v.id, 'Das Forschungsabkommen ist ausgelaufen.'); });
      if (v.ki && v.ki.denken_um) k(v.ki.denken_um, 'ki' + v.id, () => this.kiDenken(v.id), () => { v.ki.denken_um = this.t + STD; });
    }
    const g = this.z.global;
    if (g.barbaren_um) k(g.barbaren_um, 'barbaren', () => this.barbarenZug(), () => { g.barbaren_um = this.t + STD; });
    if (g.natur_um) k(g.natur_um, 'natur', () => this.naturZug(), () => { g.natur_um = this.t + 6 * STD; });
    if (g.jahreszeit_um) k(g.jahreszeit_um, 'jahreszeit', () => this.jahreszeitWechsel(), () => { g.jahreszeit_um = this.t + STD; });
    if (g.diplo_um) k(g.diplo_um, 'diplo', () => this.diplomatiePruefung(), () => { g.diplo_um = this.t + STD; });
    if (g.ablaeufe && g.ablaeufe.length) k(Math.min(...g.ablaeufe.map((a) => a.t)), 'ablauf', () => this.ablaufFaellig(), () => { g.ablaeufe = []; });
    for (const ev of g.ereignisse || []) k(ev.aktiv ? ev.ende : ev.start, 'natur' + ev.id, () => this.naturSchritt(ev.id), () => { g.ereignisse = g.ereignisse.filter((x) => x !== ev); });
    return best;
  }

  /** Zeitpunkt des nächsten Ereignisses für den Alarm (oder null). */
  naechsteZeit() { const e = this.naechstesEreignis(); return e ? e.t : null; }

  // ---------- Befehle ----------
  /**
   * Führt einen Befehl eines Volkes aus. Liefert { ok: true, ... } oder { ok: false, fehler }.
   * Der Client legt nie Werte fest; alles wird hier geprüft.
   */
  befehl(vid, b) {
    try {
      this.verarbeite(jetzt());
      pruefe(b && typeof b === 'object' && typeof b.art === 'string', 'Ungültiger Befehl.');
      const v = this.z.voelker[vid];
      pruefe(v, 'Unbekanntes Volk.');
      if (v.art === 'spieler') { v.letzte_aktivitaet = this.t; this.markiere('v' + vid); }
      const h = this['befehl_' + b.art];
      pruefe(typeof h === 'function' && BEFEHLE.has(b.art), 'Unbekannter Befehl: ' + b.art);
      const erg = h.call(this, v, b) || {};
      this.verarbeite(this.t);
      return { ok: true, ...erg };
    } catch (e) {
      if (e instanceof SpielFehler) return { ok: false, fehler: e.message };
      this.fehlerProtokoll('Befehl ' + (b && b.art) + ': ' + (e && e.stack || e));
      return { ok: false, fehler: 'Interner Fehler. Bitte später erneut versuchen.' };
    }
  }
}

/** Erlaubte Befehle (Whitelist). */
export const BEFEHLE = new Set([
  'stadt_gruenden', 'bewegen', 'anhalten', 'modus', 'angreifen', 'arbeiten', 'arbeit_abbrechen', 'bauen', 'bau_abbrechen', 'bau_hoch',
  'forschen', 'forschung_schlange', 'feld_bewirtschaften', 'auto_bewirtschaften', 'aufloesen', 'aufruesten', 'befoerdern',
  'krieg_erklaeren', 'diplomatie_angebot', 'angebot_antwort', 'angebot_zurueckziehen', 'tausch_angebot', 'handelsroute',
  'stadtstaat_geschenk', 'pluendern', 'luftangriff', 'verlegen', 'atomschlag', 'stadt_angriff', 'stadt_umbenennen',
  'meldungen_gelesen', 'tutorial', 'neuanfang', 'ping', 'einstellungen', 'tribut_fordern',
]);

Object.assign(Spiel.prototype, wirtschaft, bau, forschung, einheiten, kampf, diplomatie, akteure, ansicht, start);
