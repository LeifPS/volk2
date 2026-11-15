// Die Server-Logik der einen Welt, unabhängig von Cloudflare testbar.
// Hält den Spielzustand im Speicher, schreibt nur geänderte Zeilen (gebündelt in Eimern), schickt Ansichten als Deltas.
import { Spiel, leererZustand } from '../public/shared/engine/spiel.js';
import { setzeUhr, jetzt } from '../public/shared/uhr.js';
import { Konten } from './konten.js';

export const VERSION = '1.0.0';
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
  const z = leererZustand(jetzt());
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
 * env: { ADMIN_TOKEN?, ZEITFAKTOR_ERLAUBT? }
 * sockets: { alle(): Array<ws>, sende(ws, text), info(ws) -> {konto, volk}, setzeInfo(ws, info) }
 */
export class WeltServer {
  constructor(speicher, env, sockets) {
    this.speicher = speicher; this.env = env || {}; this.sockets = sockets;
    this.letzte = new Map(); // ws -> letzte gesendete Ansicht
    const zeilen = speicher.alle();
    // Uhr (Test-Zeitregler nur lokal, wenn ZEITFAKTOR_ERLAUBT gesetzt ist)
    this.uhr = zeilen.get('uhr') ? JSON.parse(zeilen.get('uhr')) : { anker_real: Date.now(), anker_spiel: Date.now(), faktor: 1 };
    if (!this.zeitreglerErlaubt()) this.uhr = { anker_real: 0, anker_spiel: 0, faktor: 1, echt: true };
    if (!this.env.__eigeneUhr) setzeUhr(() => this.spielzeit());
    const kontenDaten = { konten: Object.create(null), sitzungen: Object.create(null) };
    for (const [k, v] of zeilen) {
      if (k.startsWith('konto:')) kontenDaten.konten[k.slice(6)] = JSON.parse(v);
      else if (k.startsWith('sitzung:')) kontenDaten.sitzungen[k.slice(8)] = JSON.parse(v);
    }
    this.konten = new Konten(kontenDaten, () => jetzt());
    this.spiel = new Spiel(zeilen.has('kern') ? zustandAusZeilen(zeilen) : leererZustand(jetzt()));
    if (!this.spiel.z.global.initialisiert) { this.spiel.t = jetzt(); this.spiel.weltInitialisieren(); }
    // Verbindungszähler aus den tatsächlich offenen Sockets neu aufbauen
    const zaehler = {};
    for (const ws of this.sockets.alle()) { const i = this.sockets.info(ws); if (i && i.volk) zaehler[i.volk] = (zaehler[i.volk] || 0) + 1; }
    for (const v of this.spiel.alleVoelker()) if (v.art === 'spieler' && (v.verbunden || 0) !== (zaehler[v.id] || 0)) { v.verbunden = zaehler[v.id] || 0; if (!v.verbunden && !v.getrennt_seit) v.getrennt_seit = jetzt(); this.spiel.markiere('v' + v.id); }
    this.speichern();
  }

  zeitreglerErlaubt() { return this.env.ZEITFAKTOR_ERLAUBT === '1' || this.env.ZEITFAKTOR_ERLAUBT === 1 || this.env.ZEITFAKTOR_ERLAUBT === true; }
  spielzeit() { const u = this.uhr; return u.echt ? Date.now() : Math.round(u.anker_spiel + (Date.now() - u.anker_real) * u.faktor); }
  /** Echtzeit (für den Alarm) eines Spielzeitpunkts. */
  echtzeitVon(t) { const u = this.uhr; return u.echt ? t : Math.round(u.anker_real + (t - u.anker_spiel) / u.faktor); }

  speichern() {
    const z = zeilenFuer(this.spiel, this.spiel.schmutzig);
    this.spiel.schmutzig.clear();
    for (const [k, v] of this.konten.aenderungen()) z.set(k, v);
    if (z.size) this.speicher.schreibe(z);
    return z.size;
  }

  /** Nächster Alarm (Echtzeit in ms) oder null. */
  naechsterAlarm() {
    const t = this.spiel.naechsteZeit();
    if (t == null) return null;
    return Math.max(Date.now() + 1000, this.echtzeitVon(t));
  }

  alarm() {
    this.spiel.verarbeite(jetzt());
    this.nachAenderung();
  }

  /** Nach jeder Verarbeitung: speichern und Deltas an alle verbundenen Spieler. */
  nachAenderung() {
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
      if (!a) { a = this.spiel.ansichtFuer(info.volk); ansichten.set(info.volk, a); }
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

  // ---------- HTTP ----------
  async http(pfad, methode, daten, ip, auth) {
    this.spiel.verarbeite(jetzt());
    if (pfad === '/api/status') return { ok: true, version: VERSION, spieler: this.spiel.alleVoelker().filter((v) => v.art === 'spieler').length, online: this.spiel.alleVoelker().filter((v) => v.art === 'spieler' && v.verbunden > 0).length, zeit: jetzt(), zeitregler: this.zeitreglerErlaubt() };
    if (pfad === '/api/registrieren' && methode === 'POST') { const r = await this.konten.registrieren(daten?.name, daten?.passwort, ip); this.speichern(); return r; }
    if (pfad === '/api/anmelden' && methode === 'POST') { const r = await this.konten.anmelden(daten?.name, daten?.passwort, ip); this.speichern(); if (r.ok) { const k = this.konten.konten[r.name.toLowerCase()]; r.volk = k?.volk || null; } return r; }
    if (pfad === '/api/abmelden' && methode === 'POST') { this.konten.abmelden(daten?.token); this.speichern(); return { ok: true }; }
    if (pfad.startsWith('/api/admin/')) return this.admin(pfad.slice(11), daten, auth);
    if (pfad === '/api/dev/zeit') {
      if (!this.zeitreglerErlaubt()) return { ok: false, fehler: 'Der Test-Zeitregler ist nur lokal verfügbar.', status: 404 };
      const t = this.spielzeit();
      this.uhr = { anker_real: Date.now(), anker_spiel: t + Math.max(0, +(daten?.sprung_ms) || 0), faktor: Math.max(0.1, Math.min(10000, +(daten?.faktor) || this.uhr.faktor || 1)) };
      this.speicher.schreibe(new Map([['uhr', JSON.stringify(this.uhr)]]));
      this.spiel.verarbeite(jetzt());
      this.nachAenderung();
      return { ok: true, uhr: this.uhr, zeit: jetzt() };
    }
    return { ok: false, fehler: 'Unbekannte Adresse.', status: 404 };
  }

  async admin(befehl, daten, auth) {
    const soll = this.env.ADMIN_TOKEN;
    if (!soll || typeof soll !== 'string' || soll.length < 16) return { ok: false, fehler: 'Admin-Zugang ist deaktiviert (kein ADMIN_TOKEN gesetzt).', status: 404 };
    if (auth !== 'Bearer ' + soll) return { ok: false, fehler: 'Nicht berechtigt.', status: 403 };
    let r;
    if (befehl === 'passwort') r = await this.konten.passwortSetzen(daten?.name, daten?.passwort);
    else if (befehl === 'sperren') r = this.konten.sperren(daten?.name, daten?.gesperrt !== false);
    else if (befehl === 'loeschen') {
      r = this.konten.loeschen(daten?.name);
      if (r.ok && r.volk) this.volkEntfernen(r.volk);
    } else if (befehl === 'statistik') {
      const s = this.spiel;
      r = { ok: true, konten: Object.values(this.konten.konten).map((k) => ({ name: k.name, volk: k.volk, gesperrt: k.gesperrt, erstellt: k.erstellt })), voelker: s.alleVoelker().map((v) => ({ id: v.id, name: v.name, art: v.art, staedte: s.staedteVon(v.id).length, einheiten: s.einheitenVon(v.id).length, zeitalter: v.zeitalter || 0, online: s.istOnline(v.id) })), fehler: s.z.global.fehler || [], zeit: jetzt() };
    } else r = { ok: false, fehler: 'Unbekannter Admin-Befehl.' };
    this.nachAenderung();
    return r;
  }

  volkEntfernen(vid) {
    const s = this.spiel;
    for (const e of s.einheitenVon(vid)) s.einheitEntfernen(e.id);
    for (const st of s.staedteVon(vid)) { for (const i of st.gebiet) s.setzeFeld(i, { s: null }); delete s.z.staedte[st.id]; s.markiere('s' + st.id); }
    for (const [k] of Object.entries(s.z.diplomatie)) if (k.split('|').map(Number).includes(vid)) { delete s.z.diplomatie[k]; s.markiere('g'); }
    for (const [id, a] of Object.entries(s.z.angebote)) if (a.von === vid || a.an === vid || a.parteien?.includes(vid)) { delete s.z.angebote[id]; s.markiere('a' + id); }
    for (const [id, w] of Object.entries(s.z.wunder)) if (w.volk === vid) { delete s.z.wunder[id]; s.markiere('w' + id); }
    if (s.z.global.tribute) s.z.global.tribute = s.z.global.tribute.filter((t) => t.von !== vid && t.an !== vid);
    if (s.z.global.ablaeufe) s.z.global.ablaeufe = s.z.global.ablaeufe.filter((a) => a.volk !== vid);
    for (const o of s.alleVoelker()) {
      let ae = false;
      if (o.bekannt && vid in o.bekannt) { delete o.bekannt[vid]; ae = true; }
      if (o.einfluss && vid in o.einfluss) { delete o.einfluss[vid]; ae = true; }
      if (o.verbuendet === vid) { o.verbuendet = null; ae = true; }
      if (o.ki?.groll && vid in o.ki.groll) { delete o.ki.groll[vid]; ae = true; }
      if (ae) { s.markiere('v' + o.id); delete s._raten[o.id]; }
    }
    for (const e of s.alleEinheiten()) if (e.route && (!s.z.staedte[e.route.von] || !s.z.staedte[e.route.nach])) s.routeBeenden(e);
    delete s.z.voelker[vid]; s.markiere('v' + vid); s.markiere('n' + vid); s.markiere('g');
    s.positionenNeu();
  }

  // ---------- WebSocket ----------
  /** Prüft das Token für eine neue Verbindung. Liefert {konto, volk} oder null. */
  verbindungPruefen(token) {
    const k = this.konten.sitzung(token);
    if (!k) return null;
    this.speichern();
    return { konto: k, volk: this.konten.konten[k]?.volk || null };
  }

  verbunden(ws) {
    const info = this.sockets.info(ws);
    this.spiel.verarbeite(jetzt());
    if (info?.volk && this.spiel.z.voelker[info.volk] && !info.gezaehlt) { this.spiel.verbindung(info.volk, true); this.sockets.setzeInfo(ws, { ...info, gezaehlt: true }); }
    this.letzte.delete(ws);
    this.sockets.sende(ws, JSON.stringify({ t: 'hallo', konto: info?.konto, volk: info?.volk || null, zeit: jetzt(), version: VERSION, farben: this.spiel.alleVoelker().map((v) => v.farbe) }));
    this.nachAenderung();
  }

  getrennt(ws) {
    const info = this.sockets.info(ws);
    this.letzte.delete(ws);
    this.spiel.verarbeite(jetzt());
    if (info?.volk && this.spiel.z.voelker[info.volk] && info.gezaehlt) { this.spiel.verbindung(info.volk, false); this.sockets.setzeInfo(ws, { ...info, gezaehlt: false }); }
    this.speichern();
  }

  async nachricht(ws, text) {
    let m;
    try { m = JSON.parse(text); } catch { return; }
    if (!m || typeof m !== 'object' || typeof text !== 'string' || text.length > 20000) return;
    const info = this.sockets.info(ws);
    if (!info || !info.konto) return;
    const antwort = (x) => this.sockets.sende(ws, JSON.stringify({ t: 'antwort', id: m.id ?? null, ...x }));
    if (m.t === 'uhr') { this.sockets.sende(ws, JSON.stringify({ t: 'uhr', id: m.id, zeit: jetzt() })); return; }
    if (m.t === 'volk_gruenden') {
      if (info.volk && this.spiel.z.voelker[info.volk]) return antwort({ ok: false, fehler: 'Du hast schon ein Volk.' });
      this.spiel.verarbeite(jetzt());
      try {
        const v = this.spiel.neuesSpielerVolk(info.konto, m.name, m.farbe);
        this.konten.konten[info.konto].volk = v.id; this.konten.schmutzig.add('konto:' + info.konto);
        // alle Sockets dieses Kontos zuordnen und zählen
        for (const w of this.sockets.alle()) { const i = this.sockets.info(w); if (i && i.konto === info.konto) { this.sockets.setzeInfo(w, { ...i, volk: v.id, gezaehlt: true }); this.spiel.verbindung(v.id, true); } }
        antwort({ ok: true, volk: v.id });
      } catch (e) { antwort({ ok: false, fehler: e.message || 'Fehler.' }); }
      this.nachAenderung();
      return;
    }
    if (!info.volk || !this.spiel.z.voelker[info.volk]) return antwort({ ok: false, fehler: 'Gründe zuerst dein Volk.' });
    if (m.t === 'befehl') {
      const r = this.spiel.befehl(info.volk, m.b);
      antwort(r);
      this.nachAenderung();
      return;
    }
    if (m.t === 'frage') {
      this.spiel.verarbeite(jetzt());
      try { antwort({ ok: true, daten: this.spiel.frage(info.volk, m.q) }); }
      catch (e) { antwort({ ok: false, fehler: e.message || 'Fehler.' }); }
      if (this.spiel.schmutzig.size) this.speichern();
      return;
    }
    if (m.t === 'voll') { this.letzte.delete(ws); this.senden(ws); return; }
  }
}
