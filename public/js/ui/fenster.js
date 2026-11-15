// Verteiler für die großen Fenster. Die Fenster-Module werden erst beim ersten Öffnen geladen.
import { WUNDER_NACH_ID } from '../../shared/daten/index.js';
import { ROHSTOFFE } from '../../shared/daten/rohstoffe.js';

const lade = (pfad) => import(pfad);
export async function forschung(id) { (await lade('./forschungsbaum.js')).oeffneForschung(id); }
export async function stadt(id, reiter) { (await lade('./stadt.js')).oeffneStadt(id, reiter); }
export async function reich() { (await lade('./reich.js')).oeffneReich(); }
export async function diplomatie(volkId) { (await lade('./diplomatie.js')).oeffneDiplomatie(volkId); }
export async function rangliste() { (await lade('./rangliste.js')).oeffneRangliste(); }
export async function lexikon(art, id) { (await lade('./lexikon.js')).oeffneLexikon(art, id); }
export async function hilfe() { (await lade('./hilfe.js')).oeffneHilfe(); }
export async function einstellungen() { (await lade('./einstellungen.js')).oeffneEinstellungen(); }

let tutorial = null;
lade('./tutorial.js').then((m) => { tutorial = m; }).catch(() => {});
/** Meldet dem Tutorial, dass der Spieler etwas getan hat. */
export function tutorialEreignis(art, daten) { tutorial?.ereignis?.(art, daten); }

export const wunderDaten = (id) => WUNDER_NACH_ID[id];
export const rohstoffDaten = (nr) => ROHSTOFFE[nr - 1];
