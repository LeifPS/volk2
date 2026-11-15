// Konten: Benutzername + Passwort (PBKDF2, gesalzen), Sitzungs-Token, Ratenbegrenzung gegen Raten.
// Benutzername (Login) und Volksname (im Spiel angezeigt) sind zwei verschiedene Dinge.

export const PBKDF2_ITERATIONEN = 100000; // Höchstwert, den Workers erlauben
const SITZUNG_DAUER = 30 * 24 * 3600 * 1000;
const FEHLVERSUCHE_MAX = 6;
const SPERRE = 15 * 60 * 1000;

const enc = new TextEncoder();
function hex(buf) { return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join(''); }
function zufallHex(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return hex(a); }
function gleich(a, b) { if (a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; }

export async function passwortHash(passwort, salzHex, iterationen = PBKDF2_ITERATIONEN) {
  const salz = new Uint8Array(salzHex.match(/../g).map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', enc.encode(passwort), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salz, iterations: iterationen }, key, 256);
  return hex(bits);
}

export function benutzernameFehler(n) {
  if (typeof n !== 'string') return 'Bitte gib einen Benutzernamen ein.';
  if (n.length < 3 || n.length > 20) return 'Der Benutzername muss 3 bis 20 Zeichen lang sein.';
  if (!/^[a-zA-Z0-9äöüÄÖÜß_.-]+$/.test(n)) return 'Im Benutzernamen sind nur Buchstaben, Ziffern, Punkt, Bindestrich und Unterstrich erlaubt.';
  return null;
}
export function passwortFehler(p) {
  if (typeof p !== 'string' || p.length < 6) return 'Das Passwort muss mindestens 6 Zeichen lang sein.';
  if (p.length > 200) return 'Das Passwort ist zu lang.';
  return null;
}

export class Konten {
  /** speicher: { lade(k), setze(k, v), loesche(k) } für die Tabellen-Zeilen "konto:<name>" und "sitzung:<token>" */
  constructor(daten, jetzt) {
    this.konten = Object.assign(Object.create(null), daten.konten || {});       // name_klein -> { name, salz, hash, iter, volk, erstellt, gesperrt }
    this.sitzungen = Object.assign(Object.create(null), daten.sitzungen || {}); // token -> { konto, ablauf }
    this.jetzt = jetzt;
    this.versuche = new Map();              // Schlüssel (IP oder Konto) -> { n, bis }
    this.schmutzig = new Set();
  }

  begrenzt(schluessel) {
    const x = this.versuche.get(schluessel);
    return x && x.n >= FEHLVERSUCHE_MAX && x.bis > this.jetzt();
  }
  fehlversuch(schluessel) {
    const x = this.versuche.get(schluessel);
    if (!x || x.bis <= this.jetzt()) this.versuche.set(schluessel, { n: 1, bis: this.jetzt() + SPERRE });
    else x.n++;
  }

  async registrieren(name, passwort, ip = '?') {
    const f = benutzernameFehler(name) || passwortFehler(passwort);
    if (f) return { ok: false, fehler: f };
    if (this.begrenzt('reg:' + ip)) return { ok: false, fehler: 'Zu viele Versuche. Bitte warte ein paar Minuten.' };
    this.fehlversuch('reg:' + ip); // jede Registrierung zählt (max. 6 pro 15 min je Adresse)
    const k = name.toLowerCase();
    if (this.konten[k]) return { ok: false, fehler: 'Diesen Benutzernamen gibt es schon.' };
    const salz = zufallHex(16);
    const hash = await passwortHash(passwort, salz);
    this.konten[k] = { name, salz, hash, iter: PBKDF2_ITERATIONEN, volk: null, erstellt: this.jetzt(), gesperrt: false };
    this.schmutzig.add('konto:' + k);
    return { ok: true, token: this.neueSitzung(k), name };
  }

  async anmelden(name, passwort, ip = '?') {
    if (typeof name !== 'string' || typeof passwort !== 'string') return { ok: false, fehler: 'Bitte Benutzername und Passwort eingeben.' };
    const k = name.toLowerCase();
    if (this.begrenzt('ip:' + ip) || this.begrenzt('konto:' + k)) return { ok: false, fehler: 'Zu viele falsche Versuche. Bitte warte 15 Minuten.' };
    const konto = this.konten[k];
    if (!konto) { this.fehlversuch('ip:' + ip); return { ok: false, fehler: 'Benutzername oder Passwort ist falsch.' }; }
    const hash = await passwortHash(passwort, konto.salz, konto.iter);
    if (!gleich(hash, konto.hash)) { this.fehlversuch('ip:' + ip); this.fehlversuch('konto:' + k); return { ok: false, fehler: 'Benutzername oder Passwort ist falsch.' }; }
    if (konto.gesperrt) return { ok: false, fehler: 'Dieses Konto ist gesperrt. Wende dich an den Admin.' };
    this.versuche.delete('konto:' + k);
    return { ok: true, token: this.neueSitzung(k), name: konto.name };
  }

  neueSitzung(k) {
    const token = zufallHex(32);
    this.sitzungen[token] = { konto: k, ablauf: this.jetzt() + SITZUNG_DAUER };
    this.schmutzig.add('sitzung:' + token);
    // alte Sitzungen dieses Kontos aufräumen (höchstens 8)
    const eigene = Object.entries(this.sitzungen).filter(([, s]) => s.konto === k).sort((a, b) => b[1].ablauf - a[1].ablauf);
    for (const [t] of eigene.slice(8)) { delete this.sitzungen[t]; this.schmutzig.add('sitzung:' + t); }
    return token;
  }

  /** Prüft ein Token, verlängert es und liefert den Kontonamen (klein) oder null. */
  sitzung(token) {
    if (typeof token !== 'string' || token.length !== 64) return null;
    const s = this.sitzungen[token];
    if (!s) return null;
    if (s.ablauf < this.jetzt()) { delete this.sitzungen[token]; this.schmutzig.add('sitzung:' + token); return null; }
    const konto = this.konten[s.konto];
    if (!konto || konto.gesperrt) return null;
    if (s.ablauf - this.jetzt() < SITZUNG_DAUER - 24 * 3600 * 1000) { s.ablauf = this.jetzt() + SITZUNG_DAUER; this.schmutzig.add('sitzung:' + token); }
    return s.konto;
  }

  abmelden(token) { if (this.sitzungen[token]) { delete this.sitzungen[token]; this.schmutzig.add('sitzung:' + token); } }

  // --- Admin ---
  async passwortSetzen(name, passwort) {
    const k = String(name || '').toLowerCase(), konto = this.konten[k];
    if (!konto) return { ok: false, fehler: 'Unbekanntes Konto.' };
    const f = passwortFehler(passwort); if (f) return { ok: false, fehler: f };
    konto.salz = zufallHex(16); konto.hash = await passwortHash(passwort, konto.salz); konto.iter = PBKDF2_ITERATIONEN;
    for (const [t, s] of Object.entries(this.sitzungen)) if (s.konto === k) { delete this.sitzungen[t]; this.schmutzig.add('sitzung:' + t); }
    this.schmutzig.add('konto:' + k);
    return { ok: true };
  }
  sperren(name, gesperrt) {
    const k = String(name || '').toLowerCase(), konto = this.konten[k];
    if (!konto) return { ok: false, fehler: 'Unbekanntes Konto.' };
    konto.gesperrt = !!gesperrt; this.schmutzig.add('konto:' + k);
    if (gesperrt) for (const [t, s] of Object.entries(this.sitzungen)) if (s.konto === k) { delete this.sitzungen[t]; this.schmutzig.add('sitzung:' + t); }
    return { ok: true };
  }
  loeschen(name) {
    const k = String(name || '').toLowerCase(), konto = this.konten[k];
    if (!konto) return { ok: false, fehler: 'Unbekanntes Konto.' };
    delete this.konten[k]; this.schmutzig.add('konto:' + k);
    for (const [t, s] of Object.entries(this.sitzungen)) if (s.konto === k) { delete this.sitzungen[t]; this.schmutzig.add('sitzung:' + t); }
    return { ok: true, volk: konto.volk };
  }

  /** Geänderte Zeilen zum Speichern: Map Schlüssel -> Wert (null = löschen). */
  aenderungen() {
    const m = new Map();
    for (const s of this.schmutzig) {
      const [art, k] = [s.slice(0, s.indexOf(':')), s.slice(s.indexOf(':') + 1)];
      const v = art === 'konto' ? this.konten[k] : this.sitzungen[k];
      m.set(s, v ? JSON.stringify(v) : null);
    }
    this.schmutzig.clear();
    return m;
  }
}
