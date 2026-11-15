// Die zwei Durable Objects: "Lobby" (Konten und Partienliste, genau eines) und "Partie" (eine Partie je Objekt).
import { DurableObject } from 'cloudflare:workers';
import { LobbyServer } from './lobby.js';
import { PartieServer } from './server.js';

function sqlSpeicher(ctx) {
  ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS daten (k TEXT PRIMARY KEY, v TEXT)');
  return {
    alle: () => { const m = new Map(); for (const r of ctx.storage.sql.exec('SELECT k, v FROM daten')) m.set(r.k, r.v); return m; },
    schreibe: (zeilen) => {
      for (const [k, v] of zeilen) {
        if (v == null) ctx.storage.sql.exec('DELETE FROM daten WHERE k = ?', k);
        else ctx.storage.sql.exec('INSERT INTO daten (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v', k, v);
      }
    },
  };
}
const json = (r) => { const status = r.status || 200; delete r.status; return Response.json(r, { status, headers: { 'Cache-Control': 'no-store' } }); };

export class Lobby extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env;
    ctx.blockConcurrencyWhile(async () => {
      this.server = new LobbyServer(sqlSpeicher(ctx), env, {
        starten: async (partie) => (await env.PARTIE.get(env.PARTIE.idFromName(partie.id)).fetch('https://intern/intern/start', { method: 'POST', body: JSON.stringify(partie) })).json(),
        loeschen: async (id) => { await env.PARTIE.get(env.PARTIE.idFromName(id)).fetch('https://intern/intern/loeschen', { method: 'POST' }); },
      });
    });
  }

  async fetch(request) {
    const url = new URL(request.url);
    // Interne Anrufe (nur vom Worker und von Partie-Objekten, nie direkt aus dem Netz erreichbar)
    if (url.pathname === '/intern/zugang') return json({ ok: true, konto: this.server.zugang(url.searchParams.get('token'), url.searchParams.get('partie')) });
    if (url.pathname === '/intern/status' && request.method === 'POST') { const d = await request.json(); this.server.statusMelden(d.id, d.status); return json({ ok: true }); }
    let daten = null;
    if (request.method === 'POST') { try { daten = await request.json(); } catch { daten = null; } }
    if (url.pathname === '/api/partien' && !daten) daten = { token: url.searchParams.get('token') };
    const ip = request.headers.get('CF-Connecting-IP') || '?';
    return json(await this.server.http(url.pathname, request.method, daten, ip, request.headers.get('Authorization')));
  }
}

export class Partie extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx; this.env = env;
    ctx.blockConcurrencyWhile(async () => {
      this.sql = sqlSpeicher(ctx);
      const sockets = {
        alle: () => ctx.getWebSockets(),
        sende: (ws, text) => { try { ws.send(text); } catch (e) { /* Verbindung schon zu */ } },
        info: (ws) => { try { return ws.deserializeAttachment(); } catch { return null; } },
        setzeInfo: (ws, info) => { try { ws.serializeAttachment(info); } catch (e) { /* Socket schon zu */ } },
      };
      this.server = new PartieServer(this.sql, env, sockets);
      await this.nachher();
    });
  }

  /** Alarm für die Zugzeit setzen und Status an die Lobby melden. */
  async nachher() {
    const t = this.server.naechsterAlarm();
    const jetzt = await this.ctx.storage.getAlarm();
    if (t == null) { if (jetzt != null) await this.ctx.storage.deleteAlarm(); }
    else if (jetzt !== t) await this.ctx.storage.setAlarm(t);
    if (this.server.gestartet()) {
      const z = this.server.zusammenfassungNeu();
      if (z) { try { await this.env.LOBBY.get(this.env.LOBBY.idFromName('lobby')).fetch('https://intern/intern/status', { method: 'POST', body: JSON.stringify({ id: this.server.meta.id, status: z }) }); } catch (e) { /* die Lobby holt es beim nächsten Mal nach */ } }
    }
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/intern/start' && request.method === 'POST') {
      const r = this.server.start(await request.json());
      await this.nachher();
      return json(r);
    }
    if (url.pathname === '/intern/loeschen' && request.method === 'POST') {
      for (const ws of this.ctx.getWebSockets()) { try { ws.close(1000, 'Partie gelöscht'); } catch (e) { /* egal */ } }
      await this.ctx.storage.deleteAlarm(); await this.ctx.storage.deleteAll();
      return json({ ok: true });
    }
    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('WebSocket erwartet', { status: 426 });
      const konto = request.headers.get('X-Konto');
      if (!konto || !this.server.gestartet() || this.server.volkVon(konto) == null) return new Response('Kein Zugang', { status: 403 });
      const paar = new WebSocketPair();
      this.ctx.acceptWebSocket(paar[1]);
      paar[1].serializeAttachment({ konto });
      this.server.verbunden(paar[1]);
      await this.nachher();
      return new Response(null, { status: 101, webSocket: paar[0] });
    }
    return new Response('Unbekannt', { status: 404 });
  }

  async webSocketMessage(ws, nachricht) {
    await this.server.nachricht(ws, typeof nachricht === 'string' ? nachricht : new TextDecoder().decode(nachricht));
    await this.nachher();
  }
  async webSocketClose(ws) { this.server.getrennt(ws); await this.nachher(); }
  async webSocketError(ws) { this.server.getrennt(ws); await this.nachher(); }
  async alarm() { this.server.alarm(); await this.nachher(); }
}
