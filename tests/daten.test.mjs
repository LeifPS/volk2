// Prüft die Spieldaten in public/shared/daten/ auf Vollständigkeit und Stimmigkeit (Vertrag: DATENFORMAT.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../public/shared/daten/index.js';

const {
  ZEITALTER, GELAENDE, ROHSTOFFE, VERBESSERUNGEN, EINHEITEN, BEFOERDERUNGEN, GEBAEUDE, WUNDER, FORSCHUNGEN,
  KI_VOELKER, STADTSTAATEN, BARBARENLAGER, EINHEIT, GEB, WUNDER_NACH_ID, FORSCHUNG, BEFOERDERUNG, ROHSTOFF,
  VERBESSERUNG, GELAENDE_ID, FREIGESCHALTET_DURCH, NACHFOLGER, STARTFORSCHUNGEN,
} = D;

// ---------- Erlaubte Listen laut DATENFORMAT.md ----------
const LAGERGUETER = ['gold', 'holz', 'stein', 'marmor', 'salz', 'lehm', 'kupfer', 'zinn', 'eisen', 'pferde', 'salpeter', 'kohle', 'oel', 'aluminium', 'uran', 'elefanten'];
const KLASSEN = ['zivil', 'spaeher', 'haendler', 'nahkampf', 'fernkampf', 'reiter', 'belagerung', 'flak', 'sanitaeter', 'see_zivil', 'see_nah', 'see_fern', 'u_boot', 'traeger', 'transport', 'jaeger', 'bomber', 'rakete', 'atom'];
const FAEHIGKEITEN = ['gruenden', 'arbeiten', 'see_arbeiten', 'handel', 'erkunden', 'transport', 'traeger', 'tarnung', 'abfangen', 'heilen', 'einmalig', 'flaechenschaden', 'belagerung', 'kein_gegenschaden', 'tiefsee', 'gelaende_ignorieren'];
const GEGEN = [...KLASSEN, 'stadt', 'luft', 'see', 'land'];
const BEF_WIRKUNG = ['staerke', 'fern', 'reichweite', 'tempo', 'sicht', 'heilung', 'gelaende', 'gegen', 'verteidigung', 'angriff', 'abklingzeit_prozent'];
const GEB_KATEGORIEN = ['nahrung', 'wissen', 'gold', 'produktion', 'kultur', 'zufriedenheit', 'militaer', 'verteidigung', 'see', 'luft', 'infrastruktur'];
const GEB_WIRKUNG = ['nahrung', 'produktion', 'gold', 'wissenschaft', 'kultur', 'zufriedenheit', 'nahrung_prozent', 'produktion_prozent', 'gold_prozent', 'wissenschaft_prozent', 'kultur_prozent', 'pro_einwohner', 'wachstum_behalt', 'verteidigung', 'stadt_hp', 'stadt_reichweite', 'heilung', 'lager', 'bauplaetze', 'erfahrung', 'luft_plaetze', 'handelsrouten', 'grenzwachstum_prozent', 'einheit_bauzeit_prozent', 'material', 'sicht', 'unterhalt_frei'];
const PRO_EINWOHNER = ['w', 'g', 'k', 'p'];
const BONUS = ['wissenschaft_prozent', 'gold_prozent', 'produktion_prozent', 'kultur_prozent', 'nahrung_prozent', 'zufriedenheit', 'tempo_land', 'tempo_see', 'heilung_prozent', 'stadt_staerke', 'stadt_hp', 'lager', 'unterhalt_rabatt', 'sicht', 'handel_gold_prozent', 'grenzwachstum_prozent', 'bauzeit_prozent', 'arbeiter_tempo', 'erfahrung_prozent', 'bauplaetze', 'handelsrouten'];
const OPTIONEN = ['krieg', 'frieden', 'offene_grenzen', 'buendnis', 'forschungsabkommen', 'tribut', 'tausch', 'karten_tausch', 'stadtstaat_buendnis', 'aufruesten', 'bauplatz_2', 'bauplatz_3', 'einschiffen', 'tiefsee_einschiffen', 'pluendern', 'luftlandung', 'atomschlag'];
const ZWEIGE = ['wirtschaft', 'militaer', 'see', 'wissen', 'staat', 'industrie', 'luft', 'raumfahrt'];
const FREI_ARTEN = ['einheit', 'gebaeude', 'wunder', 'verbesserung', 'rohstoff', 'option', 'bonus'];
const PERSOENLICHKEITEN = ['haendler', 'forscher', 'bauer', 'krieger', 'seefahrer'];
const SCHWERPUNKTE = ['handel', 'forschung', 'militaer', 'kultur', 'seefahrt', 'nahrung'];
const STRATEGISCH_SICHTBAR = { kupfer: 'bergbau', zinn: 'bergbau', pferde: 'tierzucht', eisen: 'eisenverarbeitung', salpeter: 'schiesspulver', kohle: 'kohleabbau', oel: 'erdoelfoerderung', aluminium: 'elektrizitaet', uran: 'atomtheorie' };
const PFLICHT_EINHEITEN = ['siedler', 'arbeiter', 'spaeher', 'krieger', 'karawane', 'handelsschiff', 'atomwaffe', 'fregatte', 'galeone', 'zerstoerer', 'u_boot', 'kreuzer'];
const PFLICHT_GEBAEUDE = ['palast', 'kornspeicher', 'bibliothek', 'campus', 'universitaet', 'forschungslabor', 'markt', 'bank', 'boerse', 'kaserne', 'stall', 'werft', 'hafen', 'schrein', 'tempel', 'theater', 'kolosseum', 'aquaedukt', 'werkstatt', 'manufaktur', 'fabrik', 'kraftwerk', 'flughafen', 'raketenbasis', 'krankenhaus', 'lager', 'depot', 'stadtmauer_holz', 'stadtmauer_stein', 'festungsmauer', 'betonbunker', 'wachturm', 'burgturm', 'flakstellung', 'grosshafen', 'containerhafen'];
const PFLICHT_KETTEN = [['stadtmauer_holz', 'stadtmauer_stein', 'festungsmauer', 'betonbunker'], ['wachturm', 'burgturm', 'flakstellung'], ['hafen', 'grosshafen', 'containerhafen']];

const STD = 3600;
const TAG = 24 * STD;
// Richtwerte Forschungsdauer je Zeitalter (Sekunden)
const DAUER_BEREICH = [[3 * 60, STD], [STD, 3 * STD], [3 * STD, 8 * STD], [6 * STD, 16 * STD], [12 * STD, 30 * STD], [TAG, 3 * TAG], [2 * TAG, 4 * TAG]];
// Bauzeit-Richtwerte Einheiten / Gebäude je Zeitalter (Sekunden)
const EINHEIT_BAUZEIT = [[5 * 60, 30 * 60], [30 * 60, 90 * 60], [STD, 3 * STD], [2 * STD, 5 * STD], [4 * STD, 10 * STD], [8 * STD, 20 * STD], [16 * STD, 48 * STD]];
const GEB_BAUZEIT = [[10 * 60, 45 * 60], [45 * 60, 2 * STD], [90 * 60, 4 * STD], [3 * STD, 7 * STD], [5 * STD, 12 * STD], [9 * STD, 20 * STD], [TAG, 2 * TAG]];

const ID_MUSTER = /^[a-z0-9_]+$/;
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

function pruefeIds(liste, art) {
  const gesehen = new Set();
  for (const x of liste) {
    assert.match(x.id, ID_MUSTER, `${art}: ungültige ID "${x.id}"`);
    assert.ok(!gesehen.has(x.id), `${art}: doppelte ID "${x.id}"`);
    gesehen.add(x.id);
  }
}

function pruefeKosten(kosten, wo) {
  assert.ok(kosten && typeof kosten === 'object', `${wo}: kosten fehlt`);
  assert.equal(typeof kosten.zeit, 'number', `${wo}: kosten.zeit fehlt`);
  for (const [k, v] of Object.entries(kosten)) {
    if (k === 'zeit') continue;
    assert.ok(LAGERGUETER.includes(k), `${wo}: ungültiger Kosten-Schlüssel "${k}"`);
    assert.ok(typeof v === 'number' && v >= 0, `${wo}: Kosten "${k}" muss eine Zahl ≥ 0 sein`);
  }
}

function pruefeBonus(obj, wo) {
  for (const [k, v] of Object.entries(obj || {})) {
    assert.ok(BONUS.includes(k), `${wo}: ungültiger Bonus-Schlüssel "${k}"`);
    assert.equal(typeof v, 'number', `${wo}: Bonus "${k}" muss eine Zahl sein`);
  }
}

function pruefeGebWirkung(w, wo) {
  for (const [k, v] of Object.entries(w || {})) {
    assert.ok(GEB_WIRKUNG.includes(k), `${wo}: ungültiger Wirkungs-Schlüssel "${k}"`);
    if (k === 'pro_einwohner') for (const p of Object.keys(v)) assert.ok(PRO_EINWOHNER.includes(p), `${wo}: pro_einwohner.${p} ungültig`);
    else if (k === 'material') for (const m of Object.keys(v)) assert.ok(LAGERGUETER.includes(m), `${wo}: material.${m} ungültig`);
    else assert.equal(typeof v, 'number', `${wo}: Wirkung "${k}" muss Zahl sein`);
  }
}

// Vorfahren je Forschung (inkl. selbst)
const VORFAHREN = new Map();
function vorfahren(id) {
  if (VORFAHREN.has(id)) return VORFAHREN.get(id);
  const s = new Set([id]);
  for (const v of FORSCHUNG[id].voraussetzungen) for (const a of vorfahren(v)) s.add(a);
  VORFAHREN.set(id, s);
  return s;
}

// ======================================================================

test('Mindestanzahlen', () => {
  assert.ok(FORSCHUNGEN.length >= 225, `Forschungen: ${FORSCHUNGEN.length}`);
  assert.ok(EINHEITEN.length >= 72, `Einheiten: ${EINHEITEN.length}`);
  assert.ok(GEBAEUDE.length >= 64, `Gebäude: ${GEBAEUDE.length}`);
  assert.equal(WUNDER.length, 8, 'genau 8 Wunder');
  assert.ok(BEFOERDERUNGEN.length >= 28, `Beförderungen: ${BEFOERDERUNGEN.length}`);
  assert.ok(ROHSTOFFE.length >= 35, `Rohstoffe: ${ROHSTOFFE.length}`);
  assert.ok(GELAENDE.length >= 16, `Gelände: ${GELAENDE.length}`);
  const ketten = new Set(VERBESSERUNGEN.map((v) => v.kette));
  assert.ok(ketten.size >= 25, `Verbesserungsketten: ${ketten.size}`);
  assert.equal(KI_VOELKER.length, 5);
  assert.equal(STADTSTAATEN.length, 12);
  assert.ok(BARBARENLAGER.length >= 5);
  assert.equal(ZEITALTER.length, 7);
});

test('eindeutige IDs', () => {
  pruefeIds(FORSCHUNGEN, 'Forschung');
  pruefeIds(EINHEITEN, 'Einheit');
  pruefeIds(GEBAEUDE, 'Gebäude');
  pruefeIds(WUNDER, 'Wunder');
  pruefeIds(BEFOERDERUNGEN, 'Beförderung');
  pruefeIds(ROHSTOFFE, 'Rohstoff');
  pruefeIds(GELAENDE, 'Gelände');
  pruefeIds(VERBESSERUNGEN, 'Verbesserung');
  pruefeIds(KI_VOELKER, 'KI-Volk');
  pruefeIds(STADTSTAATEN, 'Stadtstaat');
  pruefeIds(BARBARENLAGER, 'Barbarenlager');
  // Gebäude und Wunder teilen sich die Stadt: keine Überschneidung
  for (const w of WUNDER) assert.ok(!GEB[w.id], `Wunder-ID ${w.id} kollidiert mit Gebäude`);
});

test('Nachschlage-Tabellen in index.js', () => {
  assert.equal(Object.keys(EINHEIT).length, EINHEITEN.length);
  assert.equal(Object.keys(GEB).length, GEBAEUDE.length);
  assert.equal(D.GEBAEUDE_NACH_ID, GEB);
  assert.equal(Object.keys(WUNDER_NACH_ID).length, WUNDER.length);
  assert.equal(Object.keys(FORSCHUNG).length, FORSCHUNGEN.length);
  assert.equal(Object.keys(BEFOERDERUNG).length, BEFOERDERUNGEN.length);
  assert.equal(Object.keys(ROHSTOFF).length, ROHSTOFFE.length);
  assert.equal(Object.keys(VERBESSERUNG).length, VERBESSERUNGEN.length);
  assert.equal(Object.keys(GELAENDE_ID).length, GELAENDE.length);
  assert.equal(FREIGESCHALTET_DURCH['einheit:krieger'], STARTFORSCHUNGEN.find((s) => FORSCHUNG[s].freischaltet.some((x) => x.id === 'krieger')));
  assert.ok(NACHFOLGER.bergbau.length > 0);
  assert.ok(STARTFORSCHUNGEN.length >= 2 && STARTFORSCHUNGEN.length <= 3);
});

test('Einheiten: Felder, Klassen, Fähigkeiten, Kosten, Querverweise', () => {
  for (const id of PFLICHT_EINHEITEN) assert.ok(EINHEIT[id], `Pflicht-Einheit fehlt: ${id}`);
  for (const e of EINHEITEN) {
    const wo = `Einheit ${e.id}`;
    assert.ok(typeof e.name === 'string' && e.name.length > 1, `${wo}: name`);
    assert.ok(typeof e.beschreibung === 'string' && e.beschreibung.length >= 15, `${wo}: beschreibung`);
    assert.ok(Number.isInteger(e.zeitalter) && e.zeitalter >= 0 && e.zeitalter <= 6, `${wo}: zeitalter`);
    assert.ok(KLASSEN.includes(e.klasse), `${wo}: Klasse "${e.klasse}"`);
    for (const k of ['staerke', 'fern', 'reichweite', 'tempo', 'sicht', 'unterhalt', 'abklingzeit']) assert.equal(typeof e[k], 'number', `${wo}: ${k}`);
    assert.ok(e.unterhalt >= 0.5 && e.unterhalt <= 8, `${wo}: unterhalt ${e.unterhalt}`);
    assert.ok(Array.isArray(e.faehigkeiten) && Array.isArray(e.boni), `${wo}: faehigkeiten/boni`);
    for (const f of e.faehigkeiten) assert.ok(FAEHIGKEITEN.includes(f), `${wo}: Fähigkeit "${f}"`);
    for (const b of e.boni) {
      assert.ok(GEGEN.includes(b.gegen), `${wo}: boni.gegen "${b.gegen}"`);
      assert.equal(typeof b.wert, 'number', `${wo}: boni.wert`);
    }
    pruefeKosten(e.kosten, wo);
    if (e.upgrade !== null) {
      assert.ok(EINHEIT[e.upgrade], `${wo}: upgrade "${e.upgrade}" existiert nicht`);
      assert.ok(EINHEIT[e.upgrade].zeitalter >= e.zeitalter, `${wo}: upgrade in früherem Zeitalter`);
      assert.notEqual(e.upgrade, e.id);
    }
    if (e.fern > 0) assert.ok(e.reichweite > 0, `${wo}: fern ohne reichweite`);
    if (['jaeger', 'bomber', 'rakete', 'atom'].includes(e.klasse)) assert.equal(e.tempo, 0, `${wo}: Luft hat tempo 0`);
    // Bauzeiten nach Richtwert (Siedler und Atomwaffe sind laut Auftrag Ausnahmen)
    if (e.id === 'siedler') assert.ok(Math.abs(e.kosten.zeit - 40 * 60) <= 5 * 60, 'Siedler ~40 min');
    else if (e.id === 'atomwaffe') assert.ok(e.kosten.zeit >= 2 * TAG, 'Atomwaffe ≥ 2 Tage');
    else {
      const [lo, hi] = EINHEIT_BAUZEIT[e.zeitalter];
      assert.ok(e.kosten.zeit >= lo && e.kosten.zeit <= hi, `${wo}: Bauzeit ${e.kosten.zeit}s außerhalb ${lo}-${hi}`);
    }
  }
  // Siedler: Gold + Holz, keine Bevölkerung
  assert.ok(EINHEIT.siedler.kosten.gold > 0 && EINHEIT.siedler.kosten.holz > 0);
  // Upgrade-Ketten zyklenfrei
  for (const e of EINHEITEN) {
    const besucht = new Set();
    let x = e;
    while (x && x.upgrade) { assert.ok(!besucht.has(x.id), `Upgrade-Zyklus bei ${e.id}`); besucht.add(x.id); x = EINHEIT[x.upgrade]; }
  }
  // Alle Klassen werden genutzt, alle Zeitalter haben Einheiten
  for (const k of KLASSEN) assert.ok(EINHEITEN.some((e) => e.klasse === k), `keine Einheit der Klasse ${k}`);
  for (let z = 0; z < 7; z++) assert.ok(EINHEITEN.filter((e) => e.zeitalter === z).length >= 6, `zu wenige Einheiten im Zeitalter ${z}`);
  // Atomwaffe extrem teuer
  const a = EINHEIT.atomwaffe;
  assert.equal(a.klasse, 'atom');
  assert.ok(a.kosten.uran >= 5 && a.kosten.aluminium >= 3 && a.kosten.gold >= 5000);
});

test('Beförderungen: Klassen, Voraussetzungen, Wirkungen', () => {
  for (const b of BEFOERDERUNGEN) {
    const wo = `Beförderung ${b.id}`;
    assert.ok(b.name && b.beschreibung, `${wo}: Texte`);
    assert.ok(Array.isArray(b.klassen) && b.klassen.length > 0, `${wo}: klassen`);
    for (const k of b.klassen) assert.ok(KLASSEN.includes(k), `${wo}: Klasse ${k}`);
    if (b.voraussetzung !== null) {
      const v = BEFOERDERUNG[b.voraussetzung];
      assert.ok(v, `${wo}: Voraussetzung ${b.voraussetzung} fehlt`);
      for (const k of b.klassen) assert.ok(v.klassen.includes(k), `${wo}: Klasse ${k} kann Voraussetzung ${v.id} nicht erreichen`);
    }
    assert.ok(Object.keys(b.wirkung).length > 0, `${wo}: leere Wirkung`);
    for (const [k, v] of Object.entries(b.wirkung)) {
      assert.ok(BEF_WIRKUNG.includes(k), `${wo}: Wirkung ${k}`);
      if (k === 'gelaende') for (const g of Object.keys(v)) assert.ok(GELAENDE_ID[g], `${wo}: Gelände ${g}`);
      else if (k === 'gegen') for (const g of Object.keys(v)) assert.ok(GEGEN.includes(g), `${wo}: gegen ${g}`);
      else assert.equal(typeof v, 'number');
    }
  }
  // zyklenfrei
  for (const b of BEFOERDERUNGEN) {
    const s = new Set(); let x = b;
    while (x && x.voraussetzung) { assert.ok(!s.has(x.id), `Zyklus bei ${b.id}`); s.add(x.id); x = BEFOERDERUNG[x.voraussetzung]; }
  }
});

test('Gebäude: Felder, Kosten, Wirkungen, Ketten', () => {
  for (const id of PFLICHT_GEBAEUDE) assert.ok(GEB[id], `Pflicht-Gebäude fehlt: ${id}`);
  for (const kette of PFLICHT_KETTEN) for (let i = 1; i < kette.length; i++) assert.equal(GEB[kette[i]].ersetzt, kette[i - 1], `Kette ${kette.join('→')}`);
  const ersetzteZiele = new Set(GEBAEUDE.map((g) => g.ersetzt).filter(Boolean));
  for (const g of GEBAEUDE) {
    const wo = `Gebäude ${g.id}`;
    assert.ok(g.name && g.beschreibung && g.beschreibung.length >= 15, `${wo}: Texte`);
    assert.ok(Number.isInteger(g.zeitalter) && g.zeitalter >= 0 && g.zeitalter <= 6, `${wo}: zeitalter`);
    assert.ok(GEB_KATEGORIEN.includes(g.kategorie), `${wo}: kategorie ${g.kategorie}`);
    pruefeKosten(g.kosten, wo);
    assert.ok(g.unterhalt >= 0 && g.unterhalt <= 10, `${wo}: unterhalt`);
    if (g.zeitalter === 0) assert.ok(g.unterhalt <= 0.5, `${wo}: frühes Gebäude zu teuer im Unterhalt`);
    pruefeGebWirkung(g.wirkung, wo);
    assert.ok(Array.isArray(g.benoetigt), `${wo}: benoetigt`);
    for (const b of g.benoetigt) {
      assert.ok(GEB[b], `${wo}: benoetigt ${b} fehlt`);
      assert.ok(!ersetzteZiele.has(b), `${wo}: benoetigt ${b}, das später ersetzt wird`);
    }
    if (g.ersetzt !== null) {
      assert.ok(GEB[g.ersetzt], `${wo}: ersetzt ${g.ersetzt} fehlt`);
      assert.ok(GEB[g.ersetzt].zeitalter <= g.zeitalter, `${wo}: ersetzt späteres Gebäude`);
    }
    if (g.id === 'palast') assert.equal(g.kosten.zeit, 0);
    else {
      const [lo, hi] = GEB_BAUZEIT[g.zeitalter];
      assert.ok(g.kosten.zeit >= lo && g.kosten.zeit <= hi, `${wo}: Bauzeit ${g.kosten.zeit}s außerhalb ${lo}-${hi}`);
    }
  }
  // Upgrade-Ketten: zyklenfrei, jedes Gebäude höchstens einmal ersetzt, ≥ 9 Ketten insgesamt
  const ersetztVon = {};
  for (const g of GEBAEUDE) if (g.ersetzt) {
    assert.ok(!ersetztVon[g.ersetzt], `${g.ersetzt} wird mehrfach ersetzt`);
    ersetztVon[g.ersetzt] = g.id;
  }
  const kettenStarts = GEBAEUDE.filter((g) => !g.ersetzt && ersetztVon[g.id]);
  assert.ok(kettenStarts.length >= 9, `nur ${kettenStarts.length} Upgrade-Ketten`);
  const mitBauplatz = GEBAEUDE.filter((g) => g.wirkung.bauplaetze);
  assert.ok(mitBauplatz.length <= 2 && mitBauplatz.every((g) => g.zeitalter >= 5), 'bauplaetze nur bei 1-2 späten Gebäuden');
});

test('Wunder: genau 8, je Zeitalter 1-2, Marmor, reich-Boni', () => {
  const jeZeitalter = [0, 0, 0, 0, 0, 0, 0];
  for (const w of WUNDER) {
    const wo = `Wunder ${w.id}`;
    jeZeitalter[w.zeitalter]++;
    assert.ok(w.name && w.beschreibung, `${wo}: Texte`);
    pruefeKosten(w.kosten, wo);
    assert.ok(w.kosten.marmor >= 10, `${wo}: zu wenig Marmor`);
    assert.ok(w.kosten.zeit >= 5 * STD && w.kosten.zeit <= 4 * TAG, `${wo}: Bauzeit`);
    assert.ok(Object.keys(w.reich).length > 0, `${wo}: kein reich-Bonus`);
    pruefeBonus(w.reich, wo);
    pruefeGebWirkung(w.wirkung, wo);
    for (const b of w.benoetigt || []) assert.ok(GEB[b], `${wo}: benoetigt ${b}`);
  }
  for (let z = 0; z < 7; z++) assert.ok(jeZeitalter[z] >= 1 && jeZeitalter[z] <= 2, `Zeitalter ${z}: ${jeZeitalter[z]} Wunder`);
  assert.equal(jeZeitalter[6], 1, 'Atomzeit genau 1 Wunder');
});

test('Rohstoffe: Zweck, Verbesserungsketten, Sichtbarkeit', () => {
  const ketten = new Set(VERBESSERUNGEN.map((v) => v.kette));
  for (const r of ROHSTOFFE) {
    assert.ok(typeof r.zweck === 'string' && r.zweck.trim().length > 0, `Rohstoff ${r.id}: zweck fehlt`);
    if (r.verbesserung) assert.ok(ketten.has(r.verbesserung), `Rohstoff ${r.id}: Verbesserungskette ${r.verbesserung} fehlt`);
    for (const g of r.gelaende) assert.ok(GELAENDE_ID[g], `Rohstoff ${r.id}: Gelände ${g}`);
    if (r.sichtbar_durch) assert.ok(FORSCHUNG[r.sichtbar_durch], `Rohstoff ${r.id}: sichtbar_durch ${r.sichtbar_durch} fehlt`);
  }
  for (const [rid, fid] of Object.entries(STRATEGISCH_SICHTBAR)) {
    assert.ok(FORSCHUNG[fid], `Pflicht-Forschung ${fid} fehlt`);
    assert.ok(FORSCHUNG[fid].freischaltet.some((x) => x.art === 'rohstoff' && x.id === rid), `${fid} schaltet Rohstoff ${rid} nicht frei`);
    assert.equal(ROHSTOFF[rid].sichtbar_durch, fid);
  }
});

test('Forschungen: Felder, Querverweise, Spalten, Zyklen, Erreichbarkeit', () => {
  const ziele = { einheit: EINHEIT, gebaeude: GEB, wunder: WUNDER_NACH_ID, verbesserung: VERBESSERUNG, rohstoff: ROHSTOFF };
  const jeSpalte = {};
  for (const f of FORSCHUNGEN) {
    const wo = `Forschung ${f.id}`;
    assert.ok(f.name && typeof f.beschreibung === 'string' && f.beschreibung.length >= 10, `${wo}: Texte`);
    assert.ok(ZWEIGE.includes(f.zweig), `${wo}: zweig ${f.zweig}`);
    assert.ok(Number.isInteger(f.spalte) && f.spalte >= 0, `${wo}: spalte`);
    assert.ok(Number.isInteger(f.zeitalter) && f.zeitalter >= 0 && f.zeitalter <= 6, `${wo}: zeitalter`);
    jeSpalte[f.spalte] = (jeSpalte[f.spalte] || 0) + 1;
    if (f.voraussetzungen.length === 0) {
      assert.equal(f.spalte, 0, `${wo}: Startforschung nicht in Spalte 0`);
      assert.equal(f.zeitalter, 0);
      assert.ok(f.dauer >= 180 && f.dauer <= 300, `${wo}: Startforschung 3-5 min`);
    } else assert.ok(f.voraussetzungen.length <= 3, `${wo}: mehr als 3 Voraussetzungen`);
    assert.equal(new Set(f.voraussetzungen).size, f.voraussetzungen.length, `${wo}: doppelte Voraussetzung`);
    for (const v of f.voraussetzungen) {
      assert.ok(FORSCHUNG[v], `${wo}: Voraussetzung ${v} fehlt`);
      assert.ok(FORSCHUNG[v].spalte < f.spalte, `${wo}: Voraussetzung ${v} nicht in kleinerer Spalte`);
      assert.ok(FORSCHUNG[v].zeitalter <= f.zeitalter, `${wo}: Voraussetzung ${v} aus späterem Zeitalter`);
    }
    assert.ok(f.freischaltet.length > 0, `${wo}: schaltet nichts frei`);
    for (const x of f.freischaltet) {
      assert.ok(FREI_ARTEN.includes(x.art), `${wo}: art ${x.art}`);
      if (x.art === 'bonus') { assert.ok(BONUS.includes(x.id), `${wo}: Bonus ${x.id}`); assert.equal(typeof x.wert, 'number'); assert.ok(!Number.isNaN(x.wert)); }
      else if (x.art === 'option') assert.ok(OPTIONEN.includes(x.id), `${wo}: Option ${x.id}`);
      else assert.ok(ziele[x.art][x.id], `${wo}: ${x.art} ${x.id} existiert nicht`);
    }
    if (f.wiederholbar) assert.equal(f.zeitalter, 6, `${wo}: Zukunftstechnologie muss Zeitalter 6 haben`);
  }
  for (const [s, n] of Object.entries(jeSpalte)) assert.ok(n <= 9, `Spalte ${s}: ${n} Forschungen (max 9)`);
  // Spalten steigen mit den Zeitaltern
  for (const a of FORSCHUNGEN) for (const b of FORSCHUNGEN) if (a.zeitalter < b.zeitalter) assert.ok(a.spalte < b.spalte, `Spalte von ${a.id} ≥ ${b.id}`);
  // keine Zyklen (Spaltenregel garantiert es; zusätzlich explizite DFS)
  const zustand = {};
  const dfs = (id) => {
    if (zustand[id] === 1) assert.fail(`Zyklus bei ${id}`);
    if (zustand[id] === 2) return;
    zustand[id] = 1;
    for (const v of FORSCHUNG[id].voraussetzungen) dfs(v);
    zustand[id] = 2;
  };
  for (const f of FORSCHUNGEN) dfs(f.id);
  // Erreichbarkeit von den Startforschungen aus
  const erreicht = new Set(STARTFORSCHUNGEN);
  let neu = true;
  while (neu) {
    neu = false;
    for (const f of FORSCHUNGEN) if (!erreicht.has(f.id) && f.voraussetzungen.every((v) => erreicht.has(v))) { erreicht.add(f.id); neu = true; }
  }
  for (const f of FORSCHUNGEN) assert.ok(erreicht.has(f.id), `Forschung ${f.id} nicht erreichbar`);
  // wiederholbare Zukunftstechnologien am Ende
  const wiederholbar = FORSCHUNGEN.filter((f) => f.wiederholbar);
  assert.ok(wiederholbar.length >= 3 && wiederholbar.length <= 5, 'Zukunftstechnologien: 3-5');
  const maxSpalte = Math.max(...FORSCHUNGEN.map((f) => f.spalte));
  for (const f of wiederholbar) assert.equal(f.spalte, maxSpalte);
  // zusammenhängend: nur wenige Sackgassen (außer Zukunft)
  const sackgassen = FORSCHUNGEN.filter((f) => !f.wiederholbar && NACHFOLGER[f.id].length === 0);
  assert.ok(sackgassen.length <= 5, `zu viele Sackgassen: ${sackgassen.length}`);
});

test('Forschungen: Schlüssel, Dauern, Zeitalter-Umfang', () => {
  for (let z = 1; z <= 6; z++) {
    const s = FORSCHUNGEN.filter((f) => f.schluessel && f.zeitalter === z);
    assert.equal(s.length, 1, `Zeitalter ${z}: ${s.length} Schlüsselforschungen`);
    const ersteSpalte = Math.min(...FORSCHUNGEN.filter((f) => f.zeitalter === z).map((f) => f.spalte));
    assert.equal(s[0].spalte, ersteSpalte, `Schlüssel ${s[0].id} nicht in der ersten Spalte des Zeitalters`);
  }
  assert.equal(FORSCHUNGEN.filter((f) => f.schluessel && f.zeitalter === 0).length, 0);
  const mediane = [];
  for (let z = 0; z < 7; z++) {
    const liste = FORSCHUNGEN.filter((f) => f.zeitalter === z);
    assert.ok(liste.length >= 25 && liste.length <= 42, `Zeitalter ${z}: ${liste.length} Forschungen`);
    const [lo, hi] = DAUER_BEREICH[z];
    for (const f of liste) assert.ok(f.dauer >= lo && f.dauer <= hi, `Forschung ${f.id}: Dauer ${f.dauer}s außerhalb ${lo}-${hi}`);
    mediane.push(median(liste.map((f) => f.dauer)));
  }
  for (let z = 1; z < 7; z++) assert.ok(mediane[z] > mediane[z - 1], `Median Zeitalter ${z} nicht größer als ${z - 1}`);
  // Dauer steigt mit der Spalte (nie fallend), Übergänge ohne großen Sprung
  const spalten = [...new Set(FORSCHUNGEN.map((f) => f.spalte))].sort((a, b) => a - b);
  const dauerVon = (s) => Math.max(...FORSCHUNGEN.filter((f) => f.spalte === s).map((f) => f.dauer));
  for (let i = 1; i < spalten.length; i++) {
    const a = dauerVon(spalten[i - 1]); const b = dauerVon(spalten[i]);
    assert.ok(b >= a, `Dauer fällt von Spalte ${spalten[i - 1]} zu ${spalten[i]}`);
    if (spalten[i] > 1) assert.ok(b <= a * 1.6, `Dauersprung bei Spalte ${spalten[i]}`);
  }
  // Atomwaffe ganz am Ende, hinter mehreren Atomzeit-Forschungen
  const fa = FORSCHUNG[FREIGESCHALTET_DURCH['einheit:atomwaffe']];
  assert.ok(fa.freischaltet.some((x) => x.art === 'option' && x.id === 'atomschlag'), 'atomschlag bei der Atomwaffen-Forschung');
  const atomVorfahren = [...vorfahren(fa.id)].filter((id) => FORSCHUNG[id].zeitalter === 6 && id !== fa.id);
  assert.ok(atomVorfahren.length >= 5, 'Atomwaffe hinter mehreren Atomzeit-Forschungen');
  assert.ok(fa.spalte >= Math.max(...FORSCHUNGEN.filter((f) => !f.wiederholbar).map((f) => f.spalte)));
});

test('Freischaltungen: alles ist erforschbar, Optionen genau einmal', () => {
  const frei = (art, id) => FORSCHUNGEN.some((f) => f.freischaltet.some((x) => x.art === art && x.id === id));
  for (const e of EINHEITEN) assert.ok(frei('einheit', e.id), `Einheit ${e.id} wird nie freigeschaltet`);
  for (const g of GEBAEUDE) if (g.id !== 'palast') assert.ok(frei('gebaeude', g.id), `Gebäude ${g.id} wird nie freigeschaltet`);
  assert.ok(!frei('gebaeude', 'palast'), 'Palast darf nicht erforscht werden');
  for (const w of WUNDER) assert.ok(frei('wunder', w.id), `Wunder ${w.id} wird nie freigeschaltet`);
  for (const v of VERBESSERUNGEN) assert.ok(frei('verbesserung', v.id), `Verbesserung ${v.id} wird nie freigeschaltet`);
  for (const r of Object.keys(STRATEGISCH_SICHTBAR)) assert.ok(frei('rohstoff', r), `Rohstoff ${r} wird nie sichtbar`);
  for (const o of OPTIONEN) {
    const n = FORSCHUNGEN.reduce((s, f) => s + f.freischaltet.filter((x) => x.art === 'option' && x.id === o).length, 0);
    assert.equal(n, 1, `Option ${o}: ${n}× freigeschaltet`);
  }
  // Startforschung schaltet die Grundeinheiten frei
  for (const id of ['siedler', 'arbeiter', 'spaeher', 'krieger']) {
    assert.ok(STARTFORSCHUNGEN.includes(FREIGESCHALTET_DURCH[`einheit:${id}`]), `${id} nicht durch Startforschung`);
  }
});

test('Freischaltungen passen zu Zeitalter und Rohstoffen', () => {
  const pruefe = (liste, art) => {
    for (const x of liste) {
      if (x.id === 'palast') continue;
      const f = FORSCHUNG[FREIGESCHALTET_DURCH[`${art}:${x.id}`]];
      assert.equal(f.zeitalter, x.zeitalter, `${art} ${x.id} (Zeitalter ${x.zeitalter}) wird in Zeitalter ${f.zeitalter} freigeschaltet (${f.id})`);
      // benötigte strategische Rohstoffe müssen spätestens mit dieser Forschung sichtbar sein
      for (const r of Object.keys(x.kosten)) {
        const noetig = STRATEGISCH_SICHTBAR[r];
        if (noetig) assert.ok(vorfahren(f.id).has(noetig), `${art} ${x.id} kostet ${r}, aber ${f.id} setzt ${noetig} nicht voraus`);
      }
    }
  };
  pruefe(EINHEITEN, 'einheit');
  pruefe(GEBAEUDE, 'gebaeude');
  pruefe(WUNDER, 'wunder');
  // Pflicht-Rohstoffkosten aus dem Auftrag
  assert.ok(EINHEIT.schwertkaempfer.kosten.eisen > 0);
  assert.ok(EINHEIT.ritter.kosten.pferde > 0 && EINHEIT.ritter.kosten.eisen > 0);
  assert.ok(EINHEIT.musketier.kosten.salpeter > 0);
  assert.ok(EINHEIT.panzer.kosten.oel > 0 && EINHEIT.panzer.kosten.eisen > 0);
  for (const e of EINHEITEN.filter((x) => ['jaeger', 'bomber'].includes(x.klasse))) assert.ok(e.kosten.aluminium > 0 && e.kosten.oel > 0, `${e.id}: Aluminium+Öl`);
  assert.ok(EINHEIT.kriegselefant.kosten.elefanten > 0);
  assert.ok(EINHEITEN.some((e) => e.kosten.kupfer > 0 && e.kosten.zinn > 0), 'Bronze-Einheit mit Kupfer+Zinn');
});

test('Akteure: KI-Völker, Stadtstaaten, Barbaren', () => {
  const farben = [];
  for (const k of KI_VOELKER) {
    assert.ok(k.name && k.herrscher && k.beschreibung, `KI ${k.id}: Texte`);
    assert.match(k.farbe, /^#[0-9a-f]{6}$/i);
    assert.ok(PERSOENLICHKEITEN.includes(k.persoenlichkeit), `KI ${k.id}: Persönlichkeit`);
    farben.push(k.farbe);
  }
  assert.equal(new Set(KI_VOELKER.map((k) => k.persoenlichkeit)).size, 5, 'jede Persönlichkeit einmal');
  for (const s of STADTSTAATEN) {
    assert.ok(s.name && s.beschreibung, `Stadtstaat ${s.id}: Texte`);
    assert.match(s.farbe, /^#[0-9a-f]{6}$/i);
    assert.ok(SCHWERPUNKTE.includes(s.schwerpunkt), `Stadtstaat ${s.id}: Schwerpunkt`);
    pruefeBonus(s.bonus, `Stadtstaat ${s.id}`);
    pruefeBonus(s.buendnis_bonus, `Stadtstaat ${s.id}`);
    assert.ok(Object.keys(s.bonus).length > 0 && Object.keys(s.buendnis_bonus).length > 0);
    farben.push(s.farbe);
  }
  for (const sp of SCHWERPUNKTE) assert.ok(STADTSTAATEN.some((s) => s.schwerpunkt === sp), `kein Stadtstaat mit Schwerpunkt ${sp}`);
  // Farben gut unterscheidbar
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const abstand = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));
  assert.equal(new Set(farben.map((f) => f.toLowerCase())).size, farben.length, 'doppelte Farben');
  for (let i = 0; i < farben.length; i++) for (let j = i + 1; j < farben.length; j++) {
    assert.ok(abstand(farben[i], farben[j]) >= 60, `Farben zu ähnlich: ${farben[i]} / ${farben[j]}`);
  }
  for (const b of BARBARENLAGER) {
    const wo = `Barbarenlager ${b.id}`;
    assert.ok(b.name && b.beschreibung, `${wo}: Texte`);
    for (const g of b.gelaende) assert.ok(GELAENDE_ID[g], `${wo}: Gelände ${g}`);
    assert.equal(b.einheiten_je_zeitalter.length, 7, `${wo}: 7 Zeitalter`);
    b.einheiten_je_zeitalter.forEach((liste, z) => {
      assert.ok(liste.length > 0, `${wo}: Zeitalter ${z} leer`);
      for (const id of liste) {
        assert.ok(EINHEIT[id], `${wo}: Einheit ${id} fehlt`);
        assert.ok(EINHEIT[id].zeitalter <= z, `${wo}: ${id} zu modern für Zeitalter ${z}`);
      }
    });
    assert.ok(b.belohnung_gold > 0);
  }
});

test('Texte: deutsch, keine Platzhalter', () => {
  const alle = [...EINHEITEN, ...GEBAEUDE, ...WUNDER, ...FORSCHUNGEN, ...BEFOERDERUNGEN, ...KI_VOELKER, ...STADTSTAATEN, ...BARBARENLAGER];
  for (const x of alle) {
    for (const k of ['name', 'beschreibung']) {
      const t = x[k];
      assert.ok(typeof t === 'string' && t.trim().length > 0, `${x.id}: ${k} fehlt`);
      assert.ok(!/TODO|FIXME|lorem|xxx/i.test(t), `${x.id}: Platzhalter in ${k}`);
      assert.ok(!/\b(fuer|ueber|Staerke|Gebaeude|Haendler|Faehigkeit|koennen|waehrend|Laender|Kaempfer|Schuetze|Gelaende)/i.test(t), `${x.id}: Umlaute als ae/oe/ue umschrieben in ${k}`);
    }
  }
});
