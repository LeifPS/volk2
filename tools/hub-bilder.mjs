// Rendert das Hub-Icon (512x512) aus Spielelementen: node tools/hub-bilder.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const wurzel = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const typen = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((q, a) => { const p = path.join(wurzel, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!fs.existsSync(p)) { a.writeHead(404); a.end(); return; } a.writeHead(200, { 'content-type': typen[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(a); }).listen(0);
const b = await chromium.launch();
const s = await b.newPage({ viewport: { width: 512, height: 512 } });
await s.goto(`http://localhost:${server.address().port}/tools/icon.html`);
await s.waitForSelector('body[data-fertig="1"]');
const png = path.join(wurzel, 'hub-eintrag', 'volk-icon.png');
await (await s.$('#c')).screenshot({ path: png });
await b.close(); server.close();
execFileSync('python3', ['-c', `from PIL import Image; im=Image.open(${JSON.stringify(png)}).convert('RGB').resize((512,512), Image.NEAREST); im.save(${JSON.stringify(png.replace('.png', '.webp'))}, 'WEBP', lossless=True)`]);
fs.unlinkSync(png);
console.log('hub-eintrag/volk-icon.webp geschrieben');
