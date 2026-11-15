// Sammelt alle Spieldaten an einem Ort und baut Nachschlage-Tabellen (id → Objekt).
// Client und Server importieren nur diese Datei.

import { GELAENDE } from './gelaende.js';
import { ROHSTOFFE } from './rohstoffe.js';
import { VERBESSERUNGEN } from './verbesserungen.js';
import { EINHEITEN } from './einheiten.js';
import { BEFOERDERUNGEN } from './befoerderungen.js';
import { GEBAEUDE } from './gebaeude.js';
import { WUNDER } from './wunder.js';
import { FORSCHUNGEN } from './forschung.js';

export * from './zeitalter.js';
export * from './gelaende.js';
export * from './rohstoffe.js';
export * from './verbesserungen.js';
export * from './einheiten.js';
export * from './befoerderungen.js';
export * from './gebaeude.js';
export * from './wunder.js';
export * from './forschung.js';
export * from './politiken.js';
export * from './akteure.js';

const nachId = (liste) => Object.assign(Object.create(null), Object.fromEntries(liste.map((x) => [x.id, x])));

export const EINHEIT = nachId(EINHEITEN);
export const GEB = nachId(GEBAEUDE);
export const GEBAEUDE_NACH_ID = GEB;
export const WUNDER_NACH_ID = nachId(WUNDER);
export const FORSCHUNG = nachId(FORSCHUNGEN);
export const BEFOERDERUNG = nachId(BEFOERDERUNGEN);
export const ROHSTOFF = nachId(ROHSTOFFE);
export const VERBESSERUNG = nachId(VERBESSERUNGEN);
export const GELAENDE_ID = nachId(GELAENDE);

/** 'art:id' → ID der (ersten) Forschung, die es freischaltet. Boni sind nicht enthalten. */
export const FREIGESCHALTET_DURCH = Object.create(null);
for (const f of FORSCHUNGEN) {
  for (const x of f.freischaltet) {
    if (x.art === 'bonus') continue;
    const schluessel = `${x.art}:${x.id}`;
    if (!(schluessel in FREIGESCHALTET_DURCH)) FREIGESCHALTET_DURCH[schluessel] = f.id;
  }
}

/** Forschungs-ID → IDs der Forschungen, die sie als Voraussetzung haben. */
export const NACHFOLGER = Object.assign(Object.create(null), Object.fromEntries(FORSCHUNGEN.map((f) => [f.id, []])));
for (const f of FORSCHUNGEN) for (const v of f.voraussetzungen) NACHFOLGER[v]?.push(f.id);

/** IDs der Startforschungen (ohne Voraussetzungen). */
export const STARTFORSCHUNGEN = FORSCHUNGEN.filter((f) => f.voraussetzungen.length === 0).map((f) => f.id);
