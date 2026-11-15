// Lobby: Konten, Anmeldung und die Liste aller Partien (Erstellen, Beitreten, Einstellungen, Starten).
// Das eigentliche Spiel läuft pro Partie in einem eigenen Durable Object (siehe server.js / dos.js).
import { Konten } from './konten.js';
import { SPIELTEMPO, KI_STUFEN, PARTIE, STD } from '../public/shared/regeln.js';
import { volksnameFehler, farbAbstand } from '../public/shared/namen.js';
import { KI_VOELKER, STADTSTAATEN } from '../public/shared/daten/index.js';

const ID_ZEICHEN = 'abcdefghjkmnpqrstuvwxyz23456789';
export const MAX_PARTIEN_JE_KONTO = 8;

function neueId() { const a = new Uint8Array(6); crypto.getRandomValues(a); return [...a].map((b) => ID_ZEICHEN[b % ID_ZEICHEN.length]).join(''); }
const zahl = (x, min, max, std) => { const n = Math.round(+x); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : std; };

/** Macht aus beliebigen Eingaben gültige Partie-Einstellungen (der Host kann sie in der Lobby ändern). */
export function einstellungenPruefen(e = {}) {
  const ki = (Array.isArray(e.ki) ? e.ki : []).slice(0, KI_VOELKER.length).map((k) => ({ stufe: KI_STUFEN.some((s) => s.id === k?.stufe) ? k.stufe : 'normal' }));
  const z = e.zugzeit || {};
  const startH = zahl(z.startH, 1, 168, PARTIE.zugzeit.start / STD), maxH = zahl(z.maxH, startH, 168, PARTIE.zugzeit.max / STD);
  return {
    tempo: SPIELTEMPO[e.tempo] ? e.tempo : PARTIE.tempo,
    rundenlimit: e.rundenlimit === 0 || e.rundenlimit === '0' ? 0 : zahl(e.rundenlimit, 20, 1000, PARTIE.rundenlimit),
    siege: { eroberung: e.siege?.eroberung !== false, wissenschaft: e.siege?.wissenschaft !== false, punkte: e.siege?.punkte !== false },
    zugzeit: { aktiv: z.aktiv !== false, start: startH * STD, plus: zahl(z.plusH, 0, 48, PARTIE.zugzeit.plus / STD) * STD, max: maxH * STD, verpasstMax: zahl(z.verpasstMax, 1, 20, PARTIE.zugzeit.verpasstMax) },
    ki, stadtstaaten: zahl(e.stadtstaaten, 0, STADTSTAATEN.length, PARTIE.stadtstaaten),
    barbaren: e.barbaren !== false, tiere: e.tiere !== false,
    maxSpieler: zahl(e.maxSpieler, 1, PARTIE.maxSpieler, 4),
  };
}

/**
 * speicher: { alle(), schreibe(Map) }; jetzt(): Millisekunden.
 * haken.starten(partie) -> Promise<{ok, fehler?}>: startet das Spiel im Partie-Objekt; haken.loeschen(id).
 */
export class LobbyServer {
  constructor(speicher, env, haken = {}, jetzt = () => Date.now()) {
    this.speicher = speicher; this.env = env || {}; this.haken = haken; this.jetzt = jetzt;
    const zeilen = speicher.alle();
    const kontenDaten = { konten: Object.create(null), sitzungen: Object.create(null) };
    this.partien = {};
    for (const [k, v] of zeilen) {
      if (k.startsWith('konto:')) kontenDaten.konten[k.slice(6)] = JSON.parse(v);
      else if (k.startsWith('sitzung:')) kontenDaten.sitzungen[k.slice(8)] = JSON.parse(v);
      else if (k.startsWith('partie:')) this.partien[k.slice(7)] = JSON.parse(v);
    }
    this.konten = new Konten(kontenDaten, () => this.jetzt());
    this.schmutzig = new Set();
  }

  speichern() {
    const z = new Map();
    for (const k of this.schmutzig) z.set('partie:' + k, this.partien[k] ? JSON.stringify(this.partien[k]) : null);
    this.schmutzig.clear();
    for (const [k, v] of this.konten.aenderungen()) z.set(k, v);
    if (z.size) this.speicher.schreibe(z);
  }
  merke(id) { this.schmutzig.add(id); }

  /** Prüft ein Token. Liefert den Kontonamen (klein) oder null. */
  konto(token) { const k = this.konten.sitzung(token); this.speichern(); return k; }

  /** Darf dieses Konto in diese Partie? Für den WebSocket. */
  zugang(token, partieId) {
    const k = this.konto(token);
    const p = this.partien[partieId];
    if (!k || !p || p.status === 'lobby' || !p.spieler.some((s) => s.konto === k)) return null;
    return k;
  }

  /** Öffentliche Ansicht einer Partie für die Liste. */
  ansicht(p, konto) {
    return {
      id: p.id, name: p.name, host: this.konten.konten[p.host]?.name || p.host, ich_host: p.host === konto, ich_dabei: p.spieler.some((s) => s.konto === konto),
      status: p.status, runde: p.runde || 0, einstellungen: p.einstellungen, erstellt: p.erstellt,
      spieler: p.spieler.map((s) => ({ konto: this.konten.konten[s.konto]?.name || s.konto, volk: s.name, farbe: s.farbe, bin_ich: s.konto === konto, am_zug: p.dran === s.konto })),
      am_zug: p.dran === konto, sieger: p.sieger || null, siegart: p.siegart || null,
    };
  }

  /** Aktualisiert den Stand einer Partie (Partie-Objekt meldet Runde, Status, Sieger). */
  statusMelden(id, z) {
    const p = this.partien[id];
    if (!p || !z) return;
    Object.assign(p, { runde: z.runde, status: z.status === 'beendet' ? 'beendet' : 'laeuft', dran: z.dran || null, sieger: z.sieger, siegart: z.siegart });
    this.merke(id); this.speichern();
  }

  async http(pfad, methode, daten, ip, auth) {
    if (pfad === '/api/status') return { ok: true, version: '2.0.0', konten: Object.keys(this.konten.konten).length, partien: Object.keys(this.partien).length };
    if (pfad === '/api/registrieren' && methode === 'POST') { const r = await this.konten.registrieren(daten?.name, daten?.passwort, ip); this.speichern(); return r; }
    if (pfad === '/api/anmelden' && methode === 'POST') { const r = await this.konten.anmelden(daten?.name, daten?.passwort, ip); this.speichern(); return r; }
    if (pfad === '/api/abmelden' && methode === 'POST') { this.konten.abmelden(daten?.token); this.speichern(); return { ok: true }; }
    if (pfad.startsWith('/api/admin/')) return this.admin(pfad.slice(11), daten, auth);
    if (pfad.startsWith('/api/partie')) {
      const konto = this.konto(daten?.token || (auth && auth.startsWith('Bearer ') ? auth.slice(7) : null));
      if (!konto) return { ok: false, fehler: 'Bitte melde dich an.', status: 401 };
      try { return await this.partieApi(pfad, konto, daten || {}); } catch (e) { return { ok: false, fehler: e.message || 'Fehler.' }; }
    }
    return { ok: false, fehler: 'Unbekannte Adresse.', status: 404 };
  }

  volkPruefen(p, v, konto) {
    const f = volksnameFehler(v?.name);
    if (f) return f;
    const n = v.name.trim().toLowerCase();
    if (p.spieler.some((s) => s.konto !== konto && s.name.toLowerCase() === n)) return 'Diesen Volksnamen gibt es in der Partie schon.';
    if (KI_VOELKER.some((k) => k.name.toLowerCase() === n) || STADTSTAATEN.some((k) => k.name.toLowerCase() === n)) return 'Diesen Volksnamen gibt es schon.';
    if (typeof v.farbe !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(v.farbe)) return 'Ungültige Farbe.';
    for (const s of p.spieler) if (s.konto !== konto && farbAbstand(v.farbe.toLowerCase(), s.farbe) < 100) return `Diese Farbe ist der von ${s.name} zu ähnlich.`;
    return null;
  }

  async partieApi(pfad, konto, d) {
    if (pfad === '/api/partien') {
      const liste = Object.values(this.partien)
        .filter((p) => p.spieler.some((s) => s.konto === konto) || (p.status === 'lobby' && p.spieler.length < p.einstellungen.maxSpieler))
        .sort((a, b) => b.erstellt - a.erstellt).map((p) => this.ansicht(p, konto));
      return { ok: true, partien: liste };
    }
    if (pfad === '/api/partie/neu') {
      const meine = Object.values(this.partien).filter((p) => p.host === konto && p.status !== 'beendet').length;
      if (meine >= MAX_PARTIEN_JE_KONTO) return { ok: false, fehler: 'Du hast schon zu viele laufende Partien.' };
      const name = String(d.name || '').trim();
      if (name.length < 3 || name.length > 30) return { ok: false, fehler: 'Der Partiename muss 3 bis 30 Zeichen lang sein.' };
      const p = { id: neueId(), name, host: konto, status: 'lobby', erstellt: this.jetzt(), runde: 0, spieler: [], einstellungen: einstellungenPruefen(d.einstellungen) };
      const f = this.volkPruefen(p, d.volk, konto);
      if (f) return { ok: false, fehler: f };
      p.spieler.push({ konto, name: d.volk.name.trim(), farbe: d.volk.farbe.toLowerCase() });
      this.partien[p.id] = p; this.merke(p.id); this.speichern();
      return { ok: true, partie: this.ansicht(p, konto) };
    }
    const p = this.partien[d.partie];
    if (!p) return { ok: false, fehler: 'Diese Partie gibt es nicht.' };
    const ich = p.spieler.find((s) => s.konto === konto);
    if (pfad === '/api/partie/beitreten') {
      if (p.status !== 'lobby') return { ok: false, fehler: 'Die Partie hat schon begonnen.' };
      if (ich) return { ok: true, partie: this.ansicht(p, konto) };
      if (p.spieler.length >= p.einstellungen.maxSpieler) return { ok: false, fehler: 'Die Partie ist voll.' };
      const f = this.volkPruefen(p, d.volk, konto);
      if (f) return { ok: false, fehler: f };
      p.spieler.push({ konto, name: d.volk.name.trim(), farbe: d.volk.farbe.toLowerCase() });
      this.merke(p.id); this.speichern();
      return { ok: true, partie: this.ansicht(p, konto) };
    }
    if (pfad === '/api/partie/verlassen') {
      if (p.status !== 'lobby') return { ok: false, fehler: 'Eine laufende Partie kann man nicht verlassen.' };
      p.spieler = p.spieler.filter((s) => s.konto !== konto);
      if (!p.spieler.length) { delete this.partien[p.id]; }
      else if (p.host === konto) p.host = p.spieler[0].konto;
      this.merke(p.id); this.speichern();
      return { ok: true };
    }
    if (pfad === '/api/partie/einstellungen') {
      if (p.host !== konto) return { ok: false, fehler: 'Nur der Host kann die Einstellungen ändern.' };
      if (p.status !== 'lobby') return { ok: false, fehler: 'Die Partie hat schon begonnen.' };
      const neu = einstellungenPruefen(d.einstellungen);
      if (neu.maxSpieler < p.spieler.length) neu.maxSpieler = p.spieler.length;
      p.einstellungen = neu; this.merke(p.id); this.speichern();
      return { ok: true, partie: this.ansicht(p, konto) };
    }
    if (pfad === '/api/partie/starten') {
      if (p.host !== konto) return { ok: false, fehler: 'Nur der Host kann die Partie starten.' };
      if (p.status !== 'lobby') return { ok: false, fehler: 'Die Partie läuft schon.' };
      if (p.spieler.length + p.einstellungen.ki.length < 2) return { ok: false, fehler: 'Für eine Partie braucht es mindestens zwei Völker. Füge KI-Gegner hinzu.' };
      p.status = 'startet'; this.merke(p.id); this.speichern();
      let r;
      try { r = await this.haken.starten({ id: p.id, name: p.name, host: p.host, spieler: p.spieler, einstellungen: p.einstellungen }); } catch (e) { r = { ok: false, fehler: e.message || 'Start fehlgeschlagen.' }; }
      if (!r?.ok) { p.status = 'lobby'; this.merke(p.id); this.speichern(); return { ok: false, fehler: r?.fehler || 'Die Partie konnte nicht gestartet werden.' }; }
      p.status = 'laeuft'; p.runde = 1; this.merke(p.id); this.speichern();
      return { ok: true, partie: this.ansicht(p, konto) };
    }
    if (pfad === '/api/partie/loeschen') {
      if (p.host !== konto) return { ok: false, fehler: 'Nur der Host kann die Partie löschen.' };
      delete this.partien[p.id]; this.merke(p.id); this.speichern();
      try { await this.haken.loeschen?.(p.id); } catch (e) { /* egal */ }
      return { ok: true };
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
    else if (befehl === 'loeschen') r = this.konten.loeschen(daten?.name);
    else if (befehl === 'statistik') r = { ok: true, konten: Object.values(this.konten.konten).map((k) => ({ name: k.name, gesperrt: k.gesperrt, erstellt: k.erstellt })), partien: Object.values(this.partien).map((p) => ({ id: p.id, name: p.name, status: p.status, runde: p.runde, spieler: p.spieler.length })), zeit: this.jetzt() };
    else r = { ok: false, fehler: 'Unbekannter Admin-Befehl.' };
    this.speichern();
    return r;
  }
}
