// Server-Logik EINER Partie, unabhängig von Cloudflare testbar.
// Hält den Spielzustand im Speicher, schreibt nur geänderte Zeilen (gebündelt in Eimern), schickt Ansichten als Deltas.
// Die Spielzeit steht außerhalb der Rundenwechsel still; echte Uhrzeit zählt nur für das Zugzeit-Konto der Menschen.
import { Spiel, leererZustand } from '../public/shared/engine/spiel.js';

export const VERSION = '2.0.0';
const EIMER_STAEDTE = 32, EIMER_EINHEITEN = 32, EIMER_FELDER = 64;

/** Zerlegt den Zustand in Speicherzeilen. */
function zeilenFuer(spiel, schluessel) {
  const z = spiel.z;
  const zeilen = new Map();
  const eimer = (art, id, n) => art + ':' + (id % n);
  const kern = () => zeilen.set('kern', JSON.stringify({ version: z.version, zeit: z.zeit, erstellt: z.erstellt, naechsteId: z.naechsteId, zufall: z.zufall, global: z.global, diplomatie: z.diplomatie, angebote: z.angebote, wunder: z.wunder, lager: z.lager }));
  for (const k of schluessel) {
    const art = k[0], id = +k.slice(1);
    if (art === 'g' || art === 'd' || art === 'a' || art === 'w' || art === 'b') { if (!zeilen.has('kern')) kern(); continue; }
    if (art === 'v') { const v = z.voelker[id]; zeilen.set('v:' + id, v ? JSON.stringify(v) : null); continue; }
    if (art === 'n') { zeilen.set('n:' + id, z.voelker[id] ? spiel.nebelText(id) : null); continue; }
    const e = art === 's' ? eimer('s', id, EIMER_STAEDTE) : art === 'e' ? eimer('e', id, EIMER_EINHEITEN) : art === 'f' ? eimer('f', id, EIMER_FELDER) : null;
    if (!e || zeilen.has(e)) continue;
    const n = art === 's' ? EIMER_STAEDTE : art === 'e' ? EIMER_EINHEITEN : EIMER_FELDER;
    const quelle = art === 's' ? z.staedte : art === 'e' ? z.einheiten : z.felder;
    const inhalt = {};
    for (const [kk, x] of Object.entries(quelle)) if (+kk % n === id % n) inhalt[kk] = x;
    zeilen.set(e, JSON.stringify(inhalt));
  }
  return zeilen;
}

function zustandAusZeilen(zeilen) {
  const z = leererZustand(0);
  const kern = zeilen.get('kern');
  if (kern) Object.assign(z, JSON.parse(kern));
  z.nebel = {};
  for (const [k, v] of zeilen) {
    if (v == null) continue;
    const [art, id] = k.split(':');
    if (art === 'v') z.voelker[id] = JSON.parse(v);
    else if (art === 'n') z.nebel[id] = v;
    else if (art === 's') Object.assign(z.staedte, JSON.parse(v));
    else if (art === 'e') Object.assign(z.einheiten, JSON.parse(v));
    else if (art === 'f') Object.assign(z.felder, JSON.parse(v));
  }
  return z;
}

/**
 * speicher: { alle(): Map<string,string>, schreibe(Map<string,string|null>) }
 * sockets: { alle(): Array<ws>, sende(ws, text), info(ws) -> {konto, volk}, setzeInfo(ws, info) }
 */
export class PartieServer {
  constructor(speicher, env, sockets) {
    this.speicher = speicher; this.env = env || {}; this.sockets = sockets;
    this.letzte = new Map(); // ws -> letzte gesendete Ansicht
    const zeilen = speicher.alle();
    this.meta = zeilen.has('meta') ? JSON.parse(zeilen.get('meta')) : null; // { id, name, host, spieler:[{konto,name,farbe,volk}] }
    this.spiel = zeilen.has('kern') ? new Spiel(zustandAusZeilen(zeilen)) : null;
    this._letzteZusammenfassung = this.spiel ? JSON.stringify(this.zusammenfassung()) : null;
    if (this.spiel) {
      // Verbindungszähler aus den tatsächlich offenen Sockets neu aufbauen
      const zaehler = {};
      for (const ws of this.sockets.alle()) { const i = this.sockets.info(ws); if (i && i.volk) zaehler[i.volk] = (zaehler[i.volk] || 0) + 1; }
      for (const v of this.spiel.alleVoelker()) if (v.art === 'spieler' && (v.verbunden || 0) !== (zaehler[v.id] || 0)) { v.verbunden = zaehler[v.id] || 0; this.spiel.markiere('v' + v.id); }
      this.speichern();
    }
  }

  gestartet() { return !!this.spiel; }

  /** Startet die Partie. config: { id, name, host, spieler:[{konto,name,farbe}], einstellungen } */
  start(config, jetztEcht = Date.now()) {
    if (this.spiel) return { ok: false, fehler: 'Die Partie läuft schon.' };
    const spiel = new Spiel(leererZustand(Date.UTC(2026, 0, 1)));
    spiel.t = spiel.z.zeit;
    const e = config.einstellungen || {};
    try {
      spiel.partieStarten({
        spieler: config.spieler, ki: e.ki || [], stadtstaaten: e.stadtstaaten, barbaren: e.barbaren, tiere: e.tiere,
        tempo: e.tempo, rundenlimit: e.rundenlimit, siege: e.siege, zugzeit: e.zugzeit,
      }, jetztEcht);
    } catch (err) {
      return { ok: false, fehler: err.message || 'Die Partie konnte nicht gestartet werden.' };
    }
    this.spiel = spiel;
    this.meta = { id: config.id, name: config.name, host: config.host, spieler: config.spieler.map((s) => ({ konto: s.konto, name: s.name, farbe: s.farbe, volk: spiel.alleVoelker().find((v) => v.konto === s.konto)?.id })) };
    this.speicher.schreibe(new Map([['meta', JSON.stringify(this.meta)]]));
    this.speichern();
    this.senden();
    return { ok: true };
  }

  volkVon(konto) { return this.meta?.spieler.find((s) => s.konto === konto)?.volk ?? null; }
  kontoVon(volk) { return this.meta?.spieler.find((s) => s.volk === volk)?.konto ?? null; }

  speichern() {
    const z = zeilenFuer(this.spiel, this.spiel.schmutzig);
    this.spiel.schmutzig.clear();
    if (z.size) this.speicher.schreibe(z);
    return z.size;
  }

  /** Kurzfassung für die Lobby-Liste. */
  zusammenfassung() {
    const a = this.spiel.partieAnsicht();
    const dranKonto = a.dran != null ? this.kontoVon(a.dran) : null;
    return { runde: a.runde, status: a.status, sieger: a.sieger != null ? (this.spiel.z.voelker[a.sieger]?.name ?? null) : null, siegart: a.siegart, dran: dranKonto, dranName: a.dran != null ? this.spiel.z.voelker[a.dran]?.name : null };
  }
  /** Liefert die Zusammenfassung, wenn sie sich seit dem letzten Aufruf geändert hat, sonst null. */
  zusammenfassungNeu() {
    const s = JSON.stringify(this.zusammenfassung());
    if (s === this._letzteZusammenfassung) return null;
    this._letzteZusammenfassung = s;
    return JSON.parse(s);
  }

  /** Nächster Alarm (echte Zeit in ms): die Frist des aktuellen Zugs. */
  naechsterAlarm() {
    const p = this.spiel?.z.global.partie;
    if (!p || p.status !== 'laeuft' || !p.zug || p.zug.frist == null) return null;
    return Math.max(Date.now() + 1000, p.zug.frist);
  }

  alarm() {
    if (!this.spiel) return;
    this.spiel.zugZeitPruefen(Date.now());
    this.nachAenderung();
  }

  /** Nach jeder Verarbeitung: speichern und Deltas an alle verbundenen Spieler. */
  nachAenderung() {
    if (!this.spiel) return;
    this.speichern();
    this.senden();
  }

  senden(nurWs = null) {
    const ausgehend = this.spiel.ausgehend; this.spiel.ausgehend = [];
    const neuErk = this.spiel._neuErkundet || {}; this.spiel._neuErkundet = {};
    const volleKarte = this.spiel._volleKarte || new Set(); this.spiel._volleKarte = new Set();
    const ansichten = new Map();
    for (const ws of this.sockets.alle()) {
      if (nurWs && ws !== nurWs) continue;
      const info = this.sockets.info(ws);
      if (!info || !info.volk || !this.spiel.z.voelker[info.volk]) continue;
      let a = ansichten.get(info.volk);
      if (!a) { a = this.spiel.ansichtFuer(info.volk); a.partie = this.spiel.partieAnsicht(); ansichten.set(info.volk, a); }
      const alt = this.letzte.get(ws);
      if (!alt || volleKarte.has(info.volk)) {
        this.sockets.sende(ws, JSON.stringify({ t: 'voll', ansicht: a, nebel: this.spiel.nebelText(info.volk), version: VERSION }));
      } else {
        const d = this.spiel.ansichtDelta(alt, a);
        const erk = neuErk[info.volk];
        const kaempfe = ausgehend.filter((x) => (a.einheiten && Object.values(a.einheiten).some((e) => e.feld === x.nach || e.feld === x.von)) || Object.values(a.staedte).some((s) => s.feld === x.nach || s.feld === x.von) || x.art === 'atom');
        if (d || erk?.length || kaempfe.length) this.sockets.sende(ws, JSON.stringify({ t: 'delta', d, erkundet: erk || [], kaempfe }));
      }
      this.letzte.set(ws, a);
    }
  }

  // ---------- WebSocket ----------
  verbunden(ws) {
    const info = this.sockets.info(ws);
    if (!this.spiel || !info?.konto) return;
    const volk = this.volkVon(info.konto);
    if (volk == null) return;
    this.spiel.zugZeitPruefen(Date.now());
    if (!info.gezaehlt) { this.spiel.verbindung(volk, true); }
    this.sockets.setzeInfo(ws, { ...info, volk, gezaehlt: true });
    this.letzte.delete(ws);
    this.sockets.sende(ws, JSON.stringify({ t: 'hallo', konto: info.konto, volk, partie: this.meta.id, name: this.meta.name, zeit: Date.now(), version: VERSION, farben: this.spiel.alleVoelker().map((v) => v.farbe) }));
    this.nachAenderung();
  }

  getrennt(ws) {
    const info = this.sockets.info(ws);
    this.letzte.delete(ws);
    if (this.spiel && info?.volk && this.spiel.z.voelker[info.volk] && info.gezaehlt) { this.spiel.verbindung(info.volk, false); this.sockets.setzeInfo(ws, { ...info, gezaehlt: false }); }
    if (this.spiel) this.speichern();
  }

  async nachricht(ws, text) {
    let m;
    try { m = JSON.parse(text); } catch { return; }
    if (!m || typeof m !== 'object' || typeof text !== 'string' || text.length > 20000) return;
    const info = this.sockets.info(ws);
    if (!info || !info.konto || !this.spiel) return;
    const antwort = (x) => this.sockets.sende(ws, JSON.stringify({ t: 'antwort', id: m.id ?? null, ...x }));
    if (m.t === 'uhr') { this.sockets.sende(ws, JSON.stringify({ t: 'uhr', id: m.id, zeit: Date.now() })); return; }
    if (!info.volk || !this.spiel.z.voelker[info.volk]) return antwort({ ok: false, fehler: 'Du bist in dieser Partie nicht dabei.' });
    this.spiel.zugZeitPruefen(Date.now());
    if (m.t === 'befehl') {
      const r = this.spiel.befehl(info.volk, m.b, Date.now());
      antwort(r);
      this.nachAenderung();
      return;
    }
    if (m.t === 'frage') {
      try { antwort({ ok: true, daten: this.spiel.frage(info.volk, m.q) }); }
      catch (e) { antwort({ ok: false, fehler: e.message || 'Fehler.' }); }
      if (this.spiel.schmutzig.size) this.speichern();
      return;
    }
    if (m.t === 'voll') { this.letzte.delete(ws); this.senden(ws); return; }
  }
}
