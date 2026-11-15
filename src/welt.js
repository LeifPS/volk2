// Durable Object "Welt": die eine persistente Welt (SQLite-Speicher, WebSocket-Hibernation, Alarm auf das nächste Ereignis).
import { DurableObject } from 'cloudflare:workers';
import { WeltServer } from './server.js';

export class Welt extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx; this.env = env;
    ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS daten (k TEXT PRIMARY KEY, v TEXT)');
      const speicher = {
        alle: () => { const m = new Map(); for (const r of ctx.storage.sql.exec('SELECT k, v FROM daten')) m.set(r.k, r.v); return m; },
        schreibe: (zeilen) => {
          for (const [k, v] of zeilen) {
            if (v == null) ctx.storage.sql.exec('DELETE FROM daten WHERE k = ?', k);
            else ctx.storage.sql.exec('INSERT INTO daten (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v', k, v);
          }
        },
      };
      const sockets = {
        alle: () => ctx.getWebSockets(),
        sende: (ws, text) => { try { ws.send(text); } catch (e) { /* Verbindung schon zu */ } },
        info: (ws) => { try { return ws.deserializeAttachment(); } catch { return null; } },
        setzeInfo: (ws, info) => { try { ws.serializeAttachment(info); } catch (e) { /* Socket schon zu */ } },
      };
      this.server = new WeltServer(speicher, env, sockets);
      await this.alarmSetzen();
    });
  }

  async alarmSetzen() {
    const t = this.server.naechsterAlarm();
    const jetzt = await this.ctx.storage.getAlarm();
    if (t == null) { if (jetzt != null) await this.ctx.storage.deleteAlarm(); return; }
    if (jetzt !== t) await this.ctx.storage.setAlarm(t);
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('WebSocket erwartet', { status: 426 });
      const info = this.server.verbindungPruefen(url.searchParams.get('token'));
      if (!info) return new Response('Sitzung ungültig', { status: 401 });
      const paar = new WebSocketPair();
      this.ctx.acceptWebSocket(paar[1]);
      paar[1].serializeAttachment(info);
      this.server.verbunden(paar[1]);
      await this.alarmSetzen();
      return new Response(null, { status: 101, webSocket: paar[0] });
    }
    let daten = null;
    if (request.method === 'POST') { try { daten = await request.json(); } catch { daten = null; } }
    const ip = request.headers.get('CF-Connecting-IP') || '?';
    const r = await this.server.http(url.pathname, request.method, daten, ip, request.headers.get('Authorization'));
    await this.alarmSetzen();
    const status = r.status || 200; delete r.status;
    return Response.json(r, { status, headers: { 'Cache-Control': 'no-store' } });
  }

  async webSocketMessage(ws, nachricht) {
    await this.server.nachricht(ws, typeof nachricht === 'string' ? nachricht : new TextDecoder().decode(nachricht));
    await this.alarmSetzen();
  }
  async webSocketClose(ws) { this.server.getrennt(ws); await this.alarmSetzen(); }
  async webSocketError(ws) { this.server.getrennt(ws); await this.alarmSetzen(); }
  async alarm() { this.server.alarm(); await this.alarmSetzen(); }
}
