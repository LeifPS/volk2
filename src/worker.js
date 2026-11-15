// Einstiegspunkt des Workers: /api/* geht an die Lobby, /ws an die jeweilige Partie, alles andere sind statische Dateien.
export { Lobby, Partie } from './dos.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const lobby = () => env.LOBBY.get(env.LOBBY.idFromName('lobby'));
    if (url.pathname === '/ws') {
      const partie = url.searchParams.get('partie') || '';
      if (!/^[a-z0-9]{4,12}$/.test(partie)) return new Response('Partie fehlt', { status: 400 });
      const z = await (await lobby().fetch(new Request('https://intern/intern/zugang?token=' + encodeURIComponent(url.searchParams.get('token') || '') + '&partie=' + partie))).json();
      if (!z.konto) return new Response('Sitzung ungültig', { status: 401 });
      const h = new Headers(); h.set('X-Konto', z.konto);
      for (const k of ['Upgrade', 'Connection', 'Sec-WebSocket-Key', 'Sec-WebSocket-Version', 'Sec-WebSocket-Protocol', 'Sec-WebSocket-Extensions']) if (request.headers.has(k)) h.set(k, request.headers.get(k));
      return env.PARTIE.get(env.PARTIE.idFromName(partie)).fetch(new Request('https://intern/ws', { method: 'GET', headers: h }));
    }
    if (url.pathname.startsWith('/api/')) return lobby().fetch(request);
    return env.ASSETS.fetch(request);
  },
};
