// Einstiegspunkt des Workers: /api/* und /ws gehen an das Durable Object "Welt", alles andere sind statische Dateien.
export { Welt } from './welt.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/') || url.pathname === '/ws' || url.pathname.startsWith('/ws/')) {
      const id = env.WELT.idFromName('welt');
      const pfad = url.pathname.startsWith('/ws') ? new URL('/ws' + url.search, url) : url;
      return env.WELT.get(id).fetch(new Request(pfad, request));
    }
    return env.ASSETS.fetch(request);
  },
};
