// Netzwerk: Anmeldung per HTTP, Spiel per WebSocket (Befehle, Fragen, Deltas), automatische Wiederverbindung, Uhrabgleich.
import { Z, melde, vollSetzen, deltaAnwenden, setzeVersatz } from './zustand.js';

let ws = null, naechsteId = 1, offen = new Map(), wiederVersuche = 0, token = null, lokal = null, aktuellePartie = null;
const TOKEN_KEY = 'volk_token';

export function gespeichertesToken() { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } }
export function tokenSpeichern(t) { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* egal */ } }

async function post(pfad, daten) {
  const r = await fetch(pfad, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(daten) });
  try { return await r.json(); } catch { return { ok: false, fehler: 'Der Server antwortet nicht richtig.' }; }
}
export const registrieren = (name, passwort) => post('/api/registrieren', { name, passwort });
export const anmelden = (name, passwort) => post('/api/anmelden', { name, passwort });
export function abmelden() { if (token) post('/api/abmelden', { token }); tokenSpeichern(null); token = null; aktuellePartie = null; try { ws?.close(); } catch { /* egal */ } }

// ---------- Lobby ----------
const mitToken = (d = {}) => ({ token: token || gespeichertesToken(), ...d });
export const partienListe = () => post('/api/partien', mitToken());
export const partieNeu = (name, volk, einstellungen) => post('/api/partie/neu', mitToken({ name, volk, einstellungen }));
export const partieBeitreten = (partie, volk) => post('/api/partie/beitreten', mitToken({ partie, volk }));
export const partieVerlassen = (partie) => post('/api/partie/verlassen', mitToken({ partie }));
export const partieEinstellungen = (partie, einstellungen) => post('/api/partie/einstellungen', mitToken({ partie, einstellungen }));
export const partieStarten = (partie) => post('/api/partie/starten', mitToken({ partie }));
export const partieLoeschen = (partie) => post('/api/partie/loeschen', mitToken({ partie }));
export function partieVerlassenSocket() { aktuellePartie = null; token = null; try { ws?.close(); } catch { /* egal */ } ws = null; }

/** Lokaler Server (Demo-Modus): Objekt mit nachricht(text) und Rückkanal. */
export function lokalVerbinden(server) { lokal = server; Z.verbunden = true; }

export function verbinden(t, partie = aktuellePartie) {
  token = t; aktuellePartie = partie;
  return new Promise((ok, fehler) => {
    const url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws?token=' + encodeURIComponent(t) + '&partie=' + encodeURIComponent(partie || '');
    let erstes = true;
    ws = new WebSocket(url);
    ws.onopen = () => { wiederVersuche = 0; Z.verbunden = true; melde('verbindung', true); uhrAbgleichen(); };
    ws.onmessage = (ev) => { const m = JSON.parse(ev.data); empfangen(m); if (erstes && m.t === 'hallo') { erstes = false; ok(m); } };
    ws.onclose = (ev) => {
      Z.verbunden = false; melde('verbindung', false);
      for (const [, p] of offen) p.ok({ ok: false, fehler: 'Verbindung unterbrochen.' });
      offen.clear();
      if (erstes) { fehler(new Error(ev.code === 1006 ? 'Sitzung ungültig oder Server nicht erreichbar.' : 'Verbindung fehlgeschlagen.')); return; }
      if (!token) return;
      const warte = Math.min(15000, 1000 * Math.pow(1.6, wiederVersuche++));
      setTimeout(() => verbinden(token, aktuellePartie).catch(() => melde('sitzung_ungueltig')), warte);
    };
  });
}

export function empfangen(m) {
  if (m.t === 'voll') { vollSetzen(m.ansicht, m.nebel); return; }
  if (m.t === 'delta') { deltaAnwenden(m); return; }
  if (m.t === 'hallo') { Z.konto = m.konto; Z.volk = m.volk; setzeVersatz(m.zeit - Date.now()); melde('hallo', m); return; }
  if (m.t === 'uhr' || m.t === 'antwort') {
    const p = offen.get(m.id);
    if (p) { offen.delete(m.id); p.ok(m); }
  }
}

function senden(obj) {
  return new Promise((ok) => {
    const id = naechsteId++;
    obj.id = id;
    offen.set(id, { ok, t: Date.now() });
    if (lokal) { lokal.nachricht(JSON.stringify(obj)); return; }
    if (!ws || ws.readyState !== 1) { offen.delete(id); ok({ ok: false, fehler: 'Keine Verbindung zum Server.' }); return; }
    ws.send(JSON.stringify(obj));
    setTimeout(() => { if (offen.has(id)) { offen.delete(id); ok({ ok: false, fehler: 'Der Server antwortet nicht.' }); } }, 15000);
  });
}

/** Befehl an den Server. Liefert { ok, fehler?, ... }. */
export async function befehl(b) {
  const r = await senden({ t: 'befehl', b });
  melde('befehl_antwort', { b, r });
  return r;
}
/** Lesende Anfrage. Liefert die Daten oder wirft einen Fehler mit Text. */
export async function frage(q) {
  const r = await senden({ t: 'frage', q });
  if (!r.ok) throw new Error(r.fehler || 'Fehler');
  return r.daten;
}
export const vollAnfordern = () => { if (lokal) lokal.nachricht(JSON.stringify({ t: 'voll' })); else if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'voll' })); };

async function uhrAbgleichen() {
  const t0 = Date.now();
  const r = await senden({ t: 'uhr' });
  if (r && r.zeit) { const t1 = Date.now(); setzeVersatz(r.zeit + (t1 - t0) / 2 - t1); }
}
setInterval(() => { if (Z.verbunden && !lokal) uhrAbgleichen(); }, 5 * 60 * 1000);
// Aktivität melden (zählt für "online"), aber selten
let letzteAktivitaet = 0;
export function aktivitaet() { if (Date.now() - letzteAktivitaet > 4 * 60 * 1000 && Z.volk) { letzteAktivitaet = Date.now(); senden({ t: 'befehl', b: { art: 'ping' } }); } }
