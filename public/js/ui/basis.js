// Gemeinsame Bausteine der Oberfläche: Elemente, Fenster, Meldungen (Toasts), Tooltips, Symbole, Zeit- und Zahlformate.
import { sprite } from '../grafik/sprites.js';
import { T } from '../texte.js';

/** Erzeugt ein DOM-Element: el('div.klasse#id', {attr}, kinder...) */
export function el(tag, attr, ...kinder) {
  const m = tag.match(/^([a-z0-9]+)?((?:[.#][^.#]+)*)$/i);
  const e = document.createElement(m[1] || 'div');
  for (const t of (m[2] || '').match(/[.#][^.#]+/g) || []) { if (t[0] === '.') e.classList.add(t.slice(1)); else e.id = t.slice(1); }
  if (attr && (typeof attr !== 'object' || attr instanceof Node || Array.isArray(attr))) { kinder.unshift(attr); attr = null; }
  for (const [k, v] of Object.entries(attr || {})) {
    if (v == null || v === false) continue;
    if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k === 'tip') tip(e, v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kinder.flat(Infinity)) { if (k == null || k === false) continue; e.append(k instanceof Node ? k : document.createTextNode(String(k))); }
  return e;
}

/** Pixel-Symbol als Canvas-Element (Kopie des gecachten Sprites, skaliert). */
export function symbol(kategorie, id, o = {}) {
  const s = sprite(kategorie, id, o);
  const groesse = o.groesse_px || (s ? s.width : 16);
  const c = document.createElement('canvas');
  c.className = 'symbol' + (o.klasse ? ' ' + o.klasse : '');
  if (!s) { c.width = c.height = 1; return c; }
  c.width = s.width; c.height = s.height;
  c.getContext('2d').drawImage(s, 0, 0);
  c.style.width = (o.px || groesse * (o.skala || 1)) + 'px';
  c.style.height = Math.round((o.px || groesse * (o.skala || 1)) * s.height / s.width) + 'px';
  return c;
}

// ---------- Fenster ----------
let ebene = null;
const stapel = [];
/** Öffnet ein modales Fenster. inhalt: Node oder Funktion(innen) -> void. Liefert { schliessen, inhalt, element }. */
export function fenster(titel, inhalt, o = {}) {
  if (!ebene) { ebene = el('div#fenster-ebene'); document.body.append(ebene); ebene.addEventListener('pointerdown', (e) => { if (e.target === ebene && stapel.length && !stapel[stapel.length - 1].o.modal) stapel[stapel.length - 1].schliessen(); }); }
  for (const s of stapel) s.element.classList.add('versteckt');
  const innen = el('div.inhalt');
  const fuss = o.fuss ? el('div.fuss') : null;
  const f = el('div.fenster.pix' + (o.breite ? '.' + o.breite : ''), el('div.kopf', o.symbol || null, el('h1', { text: titel }), o.kopf || null, o.modal ? null : el('button.knopf.klein', { onclick: () => obj.schliessen(), 'aria-label': T.schliessen, tip: T.schliessenTip }, symbol('ui', 'schliessen'))), innen, fuss);
  const obj = {
    element: f, inhalt: innen, fuss, o,
    schliessen() {
      const i = stapel.indexOf(obj); if (i < 0) return;
      versteckeTip();
      stapel.splice(i, 1); f.remove();
      if (stapel.length) stapel[stapel.length - 1].element.classList.remove('versteckt'); else ebene.classList.add('versteckt');
      o.beiSchliessen?.();
    },
  };
  if (typeof inhalt === 'function') inhalt(innen, obj); else if (inhalt) innen.append(inhalt);
  stapel.push(obj);
  ebene.append(f); ebene.classList.remove('versteckt');
  return obj;
}
export function oberstesFenster() { return stapel[stapel.length - 1] || null; }
export function alleFensterZu() { while (stapel.length) stapel[stapel.length - 1].schliessen(); }
export function fensterOffen() { return stapel.length > 0; }

/** Ja/Nein-Abfrage. */
export function frageJaNein(titel, text, jaText = T.ja, neinText = T.abbrechen) {
  return new Promise((ok) => {
    const f = fenster(titel, el('p', { text }), { breite: 'schmal', fuss: true, beiSchliessen: () => ok(false) });
    f.fuss.append(el('button.knopf', { text: neinText, onclick: () => f.schliessen() }), el('button.knopf.gold', { text: jaText, onclick: () => { f.o.beiSchliessen = null; f.schliessen(); ok(true); } }));
  });
}

// ---------- Toasts ----------
export function toast(text, art = 'info', o = {}) {
  const leiste = document.getElementById('meldungsleiste');
  if (!leiste) return;
  const t = el('div.toast.pix.' + art, o.symbol ? symbol('ui', o.symbol) : null, el('span', { text }));
  if (o.onclick) t.addEventListener('click', o.onclick);
  else t.addEventListener('click', () => t.remove());
  leiste.prepend(t);
  while (leiste.children.length > 6) leiste.lastChild.remove();
  setTimeout(() => t.remove(), o.dauer || (art === 'fehler' || art === 'warnung' ? 9000 : 6000));
}
export const fehler = (text) => toast(text, 'fehler', { symbol: 'warnung' });

// ---------- Tooltips (Maus: Hover, Touch: langes Drücken auf Elemente der Oberfläche) ----------
let tipEl = null, tipQuelle = null;
setInterval(() => { if (tipQuelle && !tipQuelle.isConnected) versteckeTip(); }, 400);
export function tip(e, text) {
  e.dataset.tip = typeof text === 'function' ? '' : text;
  if (typeof text === 'function') e._tip = text;
  e.addEventListener('pointerenter', (ev) => { if (ev.pointerType === 'mouse') zeigeTip(e, ev); });
  e.addEventListener('pointermove', (ev) => { if (ev.pointerType === 'mouse' && tipEl && !tipEl.classList.contains('versteckt')) platziere(ev); });
  e.addEventListener('pointerleave', versteckeTip);
  e.addEventListener('pointerdown', versteckeTip);
  let lang = null;
  e.addEventListener('touchstart', (ev) => { lang = setTimeout(() => { zeigeTip(e, ev.touches[0]); setTimeout(versteckeTip, 3500); }, 450); }, { passive: true });
  e.addEventListener('touchend', () => clearTimeout(lang), { passive: true });
  e.addEventListener('touchmove', () => clearTimeout(lang), { passive: true });
}
function zeigeTip(e, ev) {
  const text = e._tip ? e._tip() : e.dataset.tip;
  if (!text) return;
  tipQuelle = e;
  if (!tipEl) { tipEl = el('div#tooltip.pix'); document.body.append(tipEl); }
  tipEl.innerHTML = '';
  if (text instanceof Node) tipEl.append(text); else tipEl.textContent = text;
  tipEl.classList.remove('versteckt');
  platziere(ev);
}
function platziere(ev) {
  const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  let x = ev.clientX + 14, y = ev.clientY + 14;
  if (x + w > innerWidth - 4) x = ev.clientX - w - 10;
  if (y + h > innerHeight - 4) y = ev.clientY - h - 10;
  tipEl.style.left = Math.max(4, x) + 'px'; tipEl.style.top = Math.max(4, y) + 'px';
}
export function versteckeTip() { tipEl?.classList.add('versteckt'); tipQuelle = null; }

// ---------- Formate ----------
export function zahl(x, stellen = 0) {
  if (x == null || !Number.isFinite(x)) return '–';
  const a = Math.abs(x);
  if (a >= 1e6) return (x / 1e6).toFixed(1).replace('.', ',') + ' Mio.';
  if (a >= 10000) return Math.round(x / 1000) + ' Tsd.';
  return x.toFixed(stellen).replace('.', ',');
}
export function vorzeichen(x, stellen = 0) { return (x >= 0 ? '+' : '−') + zahl(Math.abs(x), stellen); }
/** Dauer in ms als "2 Std 20 Min", "3 Min 05 s", "1 Tag 4 Std". */
export function dauerText(ms) {
  if (ms == null || !Number.isFinite(ms)) return '–';
  ms = Math.max(0, ms);
  const s = Math.round(ms / 1000);
  if (s < 60) return s + ' s';
  const m = Math.floor(s / 60);
  if (m < 60) return m + ' Min' + (m < 10 && s % 60 ? ' ' + String(s % 60).padStart(2, '0') + ' s' : '');
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' Std' + (m % 60 ? ' ' + (m % 60) + ' Min' : '');
  const d = Math.floor(h / 24);
  return d + (d === 1 ? ' Tag' : ' Tage') + (h % 24 ? ' ' + (h % 24) + ' Std' : '');
}
/** Uhrzeit (lokal) eines Server-Zeitpunkts, mit Tag, falls nicht heute. */
export function uhrzeit(t) {
  const d = new Date(t), h = new Date();
  const z = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === h.toDateString()) return z + ' Uhr';
  const morgen = new Date(h); morgen.setDate(h.getDate() + 1);
  if (d.toDateString() === morgen.toDateString()) return 'morgen ' + z + ' Uhr';
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' }) + ' ' + z + ' Uhr';
}
export function balken(anteil, art = '') { return el('div.balken' + (art ? '.' + art : ''), el('i', { style: { width: Math.round(Math.max(0, Math.min(1, anteil)) * 100) + '%' } })); }
