// Beförderungen: Einheiten sammeln Erfahrung im Kampf und wählen dann eine Beförderung aus ihrem Klassenbaum.
// voraussetzung: Beförderung, die vorher gewählt sein muss (null = Einstieg). Format siehe DATENFORMAT.md.

const LAND_KAMPF = ['nahkampf', 'fernkampf', 'reiter', 'belagerung', 'flak'];
const SCHIFFE = ['see_nah', 'see_fern', 'u_boot', 'traeger', 'transport'];
const OFFENES_GELAENDE = { grasland: 5, ebene: 5, savanne: 5, wueste: 5, tundra: 5 };
const RAUES_GELAENDE = { wald: 5, dschungel: 5, huegel: 5, sumpf: 5, mangroven: 5 };

export const BEFOERDERUNGEN = [
  // --- Landtruppen: Drill (offenes Gelände) ---
  { id: 'drill_1', name: 'Drill I', beschreibung: '+5 Stärke auf offenem Gelände wie Grasland und Ebene.', klassen: LAND_KAMPF, voraussetzung: null, wirkung: { gelaende: { ...OFFENES_GELAENDE } } },
  { id: 'drill_2', name: 'Drill II', beschreibung: 'Weitere +5 Stärke auf offenem Gelände.', klassen: LAND_KAMPF, voraussetzung: 'drill_1', wirkung: { gelaende: { ...OFFENES_GELAENDE } } },
  { id: 'drill_3', name: 'Drill III', beschreibung: '+5 Stärke auf offenem Gelände und +1 Tempo.', klassen: LAND_KAMPF, voraussetzung: 'drill_2', wirkung: { gelaende: { ...OFFENES_GELAENDE }, tempo: 1 } },
  // --- Landtruppen: Gelände (raues Gelände) ---
  { id: 'waldlaeufer_1', name: 'Waldläufer I', beschreibung: '+5 Stärke in Wald, Dschungel, Hügeln und Sumpf.', klassen: ['nahkampf', 'fernkampf', 'spaeher'], voraussetzung: null, wirkung: { gelaende: { ...RAUES_GELAENDE } } },
  { id: 'waldlaeufer_2', name: 'Waldläufer II', beschreibung: 'Weitere +5 Stärke in rauem Gelände und +1 Sicht.', klassen: ['nahkampf', 'fernkampf', 'spaeher'], voraussetzung: 'waldlaeufer_1', wirkung: { gelaende: { ...RAUES_GELAENDE }, sicht: 1 } },
  { id: 'gebirgsjaeger', name: 'Gebirgsjäger', beschreibung: '+10 Stärke im Gebirge und auf Hügeln. Ideal für Grenzwachen.', klassen: ['nahkampf', 'fernkampf'], voraussetzung: 'waldlaeufer_2', wirkung: { gelaende: { gebirge: 10, huegel: 10, kristallgebirge: 10 } } },
  // --- Nahkampf ---
  { id: 'sturmangriff', name: 'Sturmangriff', beschreibung: '+10 Stärke beim Angreifen.', klassen: ['nahkampf', 'reiter'], voraussetzung: 'drill_2', wirkung: { angriff: 10 } },
  { id: 'bollwerk', name: 'Bollwerk', beschreibung: '+10 Stärke beim Verteidigen.', klassen: LAND_KAMPF, voraussetzung: 'drill_1', wirkung: { verteidigung: 10 } },
  { id: 'stadtsturm', name: 'Stadtsturm', beschreibung: '+10 Stärke gegen Städte. Hilft beim Erobern.', klassen: ['nahkampf', 'belagerung'], voraussetzung: 'drill_1', wirkung: { gegen: { stadt: 10 } } },
  { id: 'lanzenbrecher', name: 'Lanzenbrecher', beschreibung: '+7 Stärke gegen Reiter und Panzer.', klassen: ['nahkampf'], voraussetzung: null, wirkung: { gegen: { reiter: 7 } } },
  { id: 'feldmedizin', name: 'Feldmedizin', beschreibung: 'Die Einheit heilt jede Stunde 10 Lebenspunkte zusätzlich.', klassen: ['nahkampf', 'fernkampf', 'reiter', 'belagerung', 'flak'], voraussetzung: 'bollwerk', wirkung: { heilung: 10 } },
  { id: 'eilmarsch', name: 'Eilmarsch', beschreibung: '+1 Tempo. Die Einheit erreicht die Front schneller.', klassen: ['nahkampf', 'reiter'], voraussetzung: 'sturmangriff', wirkung: { tempo: 1 } },
  { id: 'veteran', name: 'Veteran', beschreibung: '+5 Stärke überall. Ein Kämpfer, der alles gesehen hat.', klassen: LAND_KAMPF, voraussetzung: 'drill_3', wirkung: { staerke: 5 } },
  // --- Fernkampf und Belagerung ---
  { id: 'treffsicher_1', name: 'Treffsicherheit I', beschreibung: '+5 Fernkampfstärke.', klassen: ['fernkampf', 'belagerung', 'see_fern', 'u_boot'], voraussetzung: null, wirkung: { fern: 5 } },
  { id: 'treffsicher_2', name: 'Treffsicherheit II', beschreibung: 'Weitere +5 Fernkampfstärke.', klassen: ['fernkampf', 'belagerung', 'see_fern'], voraussetzung: 'treffsicher_1', wirkung: { fern: 5 } },
  { id: 'weitschuss', name: 'Weitschuss', beschreibung: '+1 Reichweite. Trifft Gegner, bevor sie nahe kommen.', klassen: ['fernkampf', 'belagerung', 'see_fern'], voraussetzung: 'treffsicher_2', wirkung: { reichweite: 1 } },
  { id: 'salve', name: 'Salve', beschreibung: 'Nach einem Angriff 25 % kürzere Abklingzeit.', klassen: ['fernkampf', 'belagerung', 'see_fern', 'u_boot'], voraussetzung: 'treffsicher_1', wirkung: { abklingzeit_prozent: -25 } },
  { id: 'deckungsfeuer', name: 'Deckungsfeuer', beschreibung: '+7 Stärke gegen Nahkämpfer.', klassen: ['fernkampf'], voraussetzung: 'treffsicher_1', wirkung: { gegen: { nahkampf: 7 } } },
  // --- Reiter ---
  { id: 'flankenangriff', name: 'Flankenangriff', beschreibung: '+10 Stärke gegen Fernkämpfer und Belagerungswaffen.', klassen: ['reiter'], voraussetzung: null, wirkung: { gegen: { fernkampf: 10, belagerung: 10 } } },
  { id: 'verfolgung', name: 'Verfolgung', beschreibung: '+1 Tempo und 25 % kürzere Abklingzeit.', klassen: ['reiter'], voraussetzung: 'flankenangriff', wirkung: { tempo: 1, abklingzeit_prozent: -25 } },
  // --- Späher und Aufklärung ---
  { id: 'adlerauge', name: 'Adlerauge', beschreibung: '+1 Sicht. Die Einheit sieht weiter.', klassen: ['spaeher', 'reiter', 'see_nah', 'see_fern', 'jaeger'], voraussetzung: null, wirkung: { sicht: 1 } },
  { id: 'spurenleser', name: 'Spurenleser', beschreibung: '+1 Tempo für Späher.', klassen: ['spaeher'], voraussetzung: 'adlerauge', wirkung: { tempo: 1 } },
  // --- See ---
  { id: 'seemannschaft', name: 'Seemannschaft', beschreibung: '+1 Tempo auf See.', klassen: SCHIFFE, voraussetzung: null, wirkung: { tempo: 1 } },
  { id: 'breitseite', name: 'Breitseite', beschreibung: '+7 Stärke im Kampf gegen Schiffe.', klassen: ['see_nah', 'see_fern'], voraussetzung: null, wirkung: { gegen: { see: 7 } } },
  { id: 'entertrupp', name: 'Entertrupp', beschreibung: '+10 Stärke beim Angreifen von Schiffen.', klassen: ['see_nah'], voraussetzung: 'breitseite', wirkung: { angriff: 10 } },
  { id: 'kuestenbeschuss', name: 'Küstenbeschuss', beschreibung: '+10 Stärke gegen Städte an der Küste.', klassen: ['see_nah', 'see_fern'], voraussetzung: 'breitseite', wirkung: { gegen: { stadt: 10 } } },
  { id: 'stille_tiefe', name: 'Stille Tiefe', beschreibung: '+10 Stärke beim Angreifen aus dem Verborgenen.', klassen: ['u_boot'], voraussetzung: null, wirkung: { angriff: 10 } },
  // --- Luft und Flugabwehr ---
  { id: 'luftkampf_1', name: 'Luftkampf I', beschreibung: '+7 Stärke gegen Flugzeuge.', klassen: ['jaeger'], voraussetzung: null, wirkung: { gegen: { luft: 7 } } },
  { id: 'luftkampf_2', name: 'Luftkampf II', beschreibung: 'Weitere +7 Stärke gegen Flugzeuge.', klassen: ['jaeger'], voraussetzung: 'luftkampf_1', wirkung: { gegen: { luft: 7 } } },
  { id: 'zielgeraet', name: 'Zielgerät', beschreibung: '+10 Stärke gegen Städte bei Luftangriffen.', klassen: ['bomber'], voraussetzung: null, wirkung: { gegen: { stadt: 10 } } },
  { id: 'zusatztanks', name: 'Zusatztanks', beschreibung: '+2 Einsatzradius.', klassen: ['jaeger', 'bomber'], voraussetzung: null, wirkung: { reichweite: 2 } },
  { id: 'abwehrschirm', name: 'Abwehrschirm', beschreibung: '+10 Stärke gegen Flugzeuge.', klassen: ['flak'], voraussetzung: 'bollwerk', wirkung: { gegen: { luft: 10 } } },
  // --- Sanitäter ---
  { id: 'feldchirurg', name: 'Feldchirurg', beschreibung: 'Die Einheit und ihre Nachbarn heilen 10 Lebenspunkte pro Stunde zusätzlich.', klassen: ['sanitaeter'], voraussetzung: null, wirkung: { heilung: 10 } },
];
