// Sprite-Register und Cache. Alle Sprite-Definitionen melden sich hier an.
// Kategorien: 'einheit', 'gebaeude', 'wunder', 'verbesserung', 'rohstoff', 'stadt', 'deko', 'tier', 'ui', 'forschung'
import { Pinsel } from './pixel.js';

const REGISTER = new Map();   // 'kategorie:id' -> { w, h, zeichne, umriss }
const CACHE = new Map();

/**
 * Meldet ein Sprite an.
 * @param {string} kategorie
 * @param {string} id
 * @param {{w:number,h:number,zeichne:(p:Pinsel, o:{zeitalter:number, variante:number, groesse:number})=>void, umriss?:boolean|string}} def
 */
export function definiere(kategorie, id, def) {
  REGISTER.set(kategorie + ':' + id, { umriss: true, ...def });
}

export function hatSprite(kategorie, id) { return REGISTER.has(kategorie + ':' + id); }
export function alleSprites() { return [...REGISTER.keys()].map((k) => { const i = k.indexOf(':'); return { kategorie: k.slice(0, i), id: k.slice(i + 1), ...REGISTER.get(k) }; }); }

/** Erzeugt das Pixelraster (ohne Canvas; auch in Node für Tests nutzbar). */
export function pinselFuer(kategorie, id, o = {}) {
  const def = REGISTER.get(kategorie + ':' + id);
  if (!def) return null;
  const p = new Pinsel(def.w, def.h);
  def.zeichne(p, { zeitalter: o.zeitalter ?? 0, variante: o.variante ?? 0, groesse: o.groesse ?? 1, ...o });
  if (def.umriss) p.umriss(typeof def.umriss === 'string' ? def.umriss : undefined);
  return p;
}

/** Fertiges Canvas (gecacht) für Kategorie/ID mit Spielerfarbe, Zeitalter und Variante. */
export function sprite(kategorie, id, o = {}) {
  const schluessel = `${kategorie}:${id}:${o.farbe || ''}:${o.zeitalter ?? 0}:${o.variante ?? 0}:${o.groesse ?? 1}`;
  let c = CACHE.get(schluessel);
  if (c !== undefined) return c;
  const p = pinselFuer(kategorie, id, o);
  c = p ? p.alsCanvas(o.farbe) : null;
  CACHE.set(schluessel, c);
  return c;
}
