// Feldverbesserungen, gebaut von Arbeitern innerhalb der eigenen Grenzen.
// Jede Kette hat Stufen; eine höhere Stufe ersetzt die vorige (nur auf einem Feld mit der Vorstufe baubar, außer "direkt": true).
// schicht: 'feld' (Standard, eine pro Feld), 'weg' (Straßen) oder 'bruecke', jeweils zusätzlich zur Feldverbesserung.
// gelaende: erlaubte Gelände (leer = jedes Landfeld); rohstoff_pflicht: nur auf diesen Rohstoffen; fluss: braucht Fluss; kueste: braucht Wasser-Nachbarn.
// ertrag: Zusatz pro Stunde {n,p,g,w,k}; material: Lieferung ins Reichslager pro Stunde; bauzeit in Sekunden (Grundwert).
// bewegung (nur Wege): Kosten pro Feld statt des Geländes. verteidigung: Kampfpunkte für Verteidiger auf dem Feld. sicht: Sichtweite (Außenposten).

const LAND_FLACH = ['grasland', 'ebene', 'savanne', 'wueste', 'tundra', 'oase', 'salzebene'];
const LAND_ALLE = ['grasland', 'ebene', 'wald', 'dschungel', 'savanne', 'huegel', 'gebirge', 'wueste', 'tundra', 'schnee', 'sumpf', 'oase', 'mangroven', 'salzebene', 'kristallgebirge', 'irrlichtmoor', 'pilzwald', 'vulkan'];

export const VERBESSERUNGEN = [
  // Farm-Kette
  { id: 'farm', kette: 'farm', stufe: 1, name: 'Farm', beschreibung: 'Felder und Äcker. +1 Nahrung, erschließt Getreide.', gelaende: [...LAND_FLACH, 'huegel'], ertrag: { n: 1 }, bauzeit: 20 * 60 },
  { id: 'bewaesserte_farm', kette: 'farm', stufe: 2, name: 'Bewässerte Farm', beschreibung: 'Kanäle bringen Wasser auf die Felder. +2 Nahrung insgesamt.', gelaende: [...LAND_FLACH, 'huegel'], ertrag: { n: 2 }, bauzeit: 90 * 60 },
  { id: 'windrad_farm', kette: 'farm', stufe: 3, name: 'Windrad-Farm', beschreibung: 'Ein Windrad mahlt das Korn direkt auf dem Hof. +2 Nahrung, +1 Produktion.', gelaende: [...LAND_FLACH, 'huegel'], ertrag: { n: 2, p: 1 }, bauzeit: 4 * 3600 },
  { id: 'mechanisierte_farm', kette: 'farm', stufe: 4, name: 'Mechanisierte Farm', beschreibung: 'Traktoren und Dünger. +4 Nahrung, +1 Produktion.', gelaende: [...LAND_FLACH, 'huegel'], ertrag: { n: 4, p: 1 }, bauzeit: 10 * 3600 },
  // Terrassen
  { id: 'terrassenfeld', kette: 'terrasse', stufe: 1, name: 'Terrassenfeld', beschreibung: 'Stufenäcker an Hängen. +2 Nahrung auf Hügeln.', gelaende: ['huegel'], ertrag: { n: 2 }, bauzeit: 2 * 3600 },
  // Mine
  { id: 'mine', kette: 'mine', stufe: 1, name: 'Mine', beschreibung: 'Ein Stollen in den Berg. +1 Produktion, +1 Stein, erschließt Erze.', gelaende: ['huegel', 'gebirge', 'wueste', 'tundra', 'ebene', 'grasland', 'sumpf', 'dschungel', 'kristallgebirge', 'vulkan', 'salzebene', 'schnee'], ertrag: { p: 1 }, material: { stein: 1 }, bauzeit: 30 * 60 },
  { id: 'tiefe_mine', kette: 'mine', stufe: 2, name: 'Tiefe Mine', beschreibung: 'Tiefere Schächte mit Pumpen. +2 Produktion, +2 Stein, doppelte Erzlieferung.', gelaende: ['huegel', 'gebirge', 'wueste', 'tundra', 'ebene', 'grasland', 'sumpf', 'dschungel', 'kristallgebirge', 'vulkan', 'salzebene', 'schnee'], ertrag: { p: 2 }, material: { stein: 2 }, lieferfaktor: 2, bauzeit: 6 * 3600 },
  { id: 'industriemine', kette: 'mine', stufe: 3, name: 'Industriemine', beschreibung: 'Förderbänder und Dampfmaschinen. +3 Produktion, +3 Stein, dreifache Erzlieferung.', gelaende: ['huegel', 'gebirge', 'wueste', 'tundra', 'ebene', 'grasland', 'sumpf', 'dschungel', 'kristallgebirge', 'vulkan', 'salzebene', 'schnee'], ertrag: { p: 3 }, material: { stein: 3 }, lieferfaktor: 3, bauzeit: 14 * 3600 },
  // Steinbruch
  { id: 'steinbruch', kette: 'steinbruch', stufe: 1, name: 'Steinbruch', beschreibung: 'Hier wird Stein gebrochen. +1 Produktion, +2 Stein.', gelaende: ['huegel', 'ebene', 'gebirge', 'wueste', 'tundra', 'grasland', 'wald', 'kueste'], rohstoff_pflicht: ['stein', 'marmor', 'bernstein'], ertrag: { p: 1 }, material: { stein: 2 }, bauzeit: 40 * 60 },
  { id: 'grosser_steinbruch', kette: 'steinbruch', stufe: 2, name: 'Großer Steinbruch', beschreibung: 'Sprengungen und Kräne. +2 Produktion, +4 Stein, doppelte Lieferung.', gelaende: ['huegel', 'ebene', 'gebirge', 'wueste', 'tundra', 'grasland', 'wald', 'kueste'], rohstoff_pflicht: ['stein', 'marmor', 'bernstein'], ertrag: { p: 2 }, material: { stein: 4 }, lieferfaktor: 2, bauzeit: 8 * 3600 },
  // Holz
  { id: 'holzfaellerlager', kette: 'holzfaeller', stufe: 1, name: 'Holzfällerlager', beschreibung: 'Holzfäller schlagen Bäume nachhaltig. +1 Produktion, +2 Holz.', gelaende: ['wald', 'dschungel', 'mangroven', 'pilzwald'], ertrag: { p: 1 }, material: { holz: 2 }, bauzeit: 25 * 60 },
  { id: 'saegewerk', kette: 'holzfaeller', stufe: 2, name: 'Sägewerk', beschreibung: 'Eine wassergetriebene Säge. +2 Produktion, +4 Holz.', gelaende: ['wald', 'dschungel', 'mangroven', 'pilzwald'], ertrag: { p: 2 }, material: { holz: 4 }, bauzeit: 5 * 3600 },
  // Plantage
  { id: 'plantage', kette: 'plantage', stufe: 1, name: 'Plantage', beschreibung: 'Gepflegte Reihen von Nutzpflanzen. Erschließt Wein, Gewürze, Seide, Zucker und mehr. +1 Gold.', gelaende: LAND_ALLE, rohstoff_pflicht: ['wein', 'gewuerze', 'seide', 'weihrauch', 'zucker', 'kakao', 'baumwolle', 'farbstoffe', 'tee', 'bananen', 'datteln'], ertrag: { g: 1 }, bauzeit: 45 * 60 },
  { id: 'grossplantage', kette: 'plantage', stufe: 2, name: 'Großplantage', beschreibung: 'Weite Anbauflächen mit Lagerhäusern. +2 Gold, +1 Nahrung.', gelaende: LAND_ALLE, rohstoff_pflicht: ['wein', 'gewuerze', 'seide', 'weihrauch', 'zucker', 'kakao', 'baumwolle', 'farbstoffe', 'tee', 'bananen', 'datteln'], ertrag: { g: 2, n: 1 }, bauzeit: 7 * 3600 },
  // Weide
  { id: 'weide', kette: 'weide', stufe: 1, name: 'Weide', beschreibung: 'Eingezäuntes Weideland für Tiere. Erschließt Pferde, Rinder und Schafe. +1 Produktion.', gelaende: ['grasland', 'ebene', 'savanne', 'tundra', 'huegel'], rohstoff_pflicht: ['pferde', 'rinder', 'schafe'], ertrag: { p: 1 }, bauzeit: 30 * 60 },
  { id: 'ranch', kette: 'weide', stufe: 2, name: 'Ranch', beschreibung: 'Ein großer Viehhof mit Ställen. +1 Nahrung, +2 Produktion, doppelte Pferdelieferung.', gelaende: ['grasland', 'ebene', 'savanne', 'tundra', 'huegel'], rohstoff_pflicht: ['pferde', 'rinder', 'schafe'], ertrag: { n: 1, p: 2 }, lieferfaktor: 2, bauzeit: 6 * 3600 },
  // Jagd
  { id: 'jagdlager', kette: 'jagdlager', stufe: 1, name: 'Jagdlager', beschreibung: 'Jäger und Fallensteller. Erschließt Wild, Pelze, Elfenbein und Elefanten. +1 Gold.', gelaende: ['wald', 'tundra', 'dschungel', 'savanne', 'ebene'], rohstoff_pflicht: ['wild', 'pelze', 'elfenbein', 'elefanten'], ertrag: { g: 1 }, bauzeit: 30 * 60 },
  { id: 'wildhege', kette: 'jagdlager', stufe: 2, name: 'Wildhege', beschreibung: 'Geregelte Jagd und Schutzgebiete. +1 Nahrung, +2 Gold.', gelaende: ['wald', 'tundra', 'dschungel', 'savanne', 'ebene'], rohstoff_pflicht: ['wild', 'pelze', 'elfenbein', 'elefanten'], ertrag: { n: 1, g: 2 }, bauzeit: 5 * 3600 },
  // Wasser
  { id: 'fischerboote', kette: 'fischerboote', stufe: 1, name: 'Fischerboote', beschreibung: 'Boote fahren täglich zum Fang hinaus. Erschließt Fische, Wale, Muscheln und Perlen. +1 Nahrung.', gelaende: ['kueste', 'see', 'meer', 'korallenriff'], wasser: true, rohstoff_pflicht: ['fisch', 'wale', 'muscheln', 'perlen'], ertrag: { n: 1 }, bauzeit: 40 * 60 },
  { id: 'fangflotte', kette: 'fischerboote', stufe: 2, name: 'Fangflotte', beschreibung: 'Große Kutter mit Kühlräumen. +2 Nahrung, +1 Gold.', gelaende: ['kueste', 'see', 'meer', 'korallenriff'], wasser: true, rohstoff_pflicht: ['fisch', 'wale', 'muscheln', 'perlen'], ertrag: { n: 2, g: 1 }, bauzeit: 8 * 3600 },
  { id: 'oelplattform', kette: 'oelplattform', stufe: 1, name: 'Ölplattform', beschreibung: 'Eine Bohrinsel im Meer. Erschließt Öl auf dem Wasser. +2 Produktion.', gelaende: ['kueste', 'meer'], wasser: true, rohstoff_pflicht: ['oel'], ertrag: { p: 2 }, bauzeit: 16 * 3600 },
  { id: 'aquakultur', kette: 'aquakultur', stufe: 1, name: 'Aquakultur', beschreibung: 'Netzgehege für Fischzucht auf leerem Küstenwasser. +2 Nahrung.', gelaende: ['kueste', 'see'], wasser: true, ertrag: { n: 2 }, bauzeit: 10 * 3600 },
  // Öl an Land
  { id: 'bohrturm', kette: 'bohrturm', stufe: 1, name: 'Bohrturm', beschreibung: 'Pumpt Öl aus der Tiefe. Erschließt Öl an Land. +1 Produktion.', gelaende: ['wueste', 'tundra', 'sumpf', 'schnee', 'ebene', 'grasland'], rohstoff_pflicht: ['oel'], ertrag: { p: 1 }, bauzeit: 10 * 3600 },
  { id: 'foerderanlage', kette: 'bohrturm', stufe: 2, name: 'Förderanlage', beschreibung: 'Mehrere Pumpen und Tanks. +2 Produktion, doppelte Öllieferung.', gelaende: ['wueste', 'tundra', 'sumpf', 'schnee', 'ebene', 'grasland'], rohstoff_pflicht: ['oel'], ertrag: { p: 2 }, lieferfaktor: 2, bauzeit: 20 * 3600 },
  // Bau-Rohstoffe
  { id: 'lehmgrube', kette: 'lehmgrube', stufe: 1, name: 'Lehmgrube', beschreibung: 'Hier wird Lehm gestochen. +1 Produktion, liefert Lehm.', gelaende: ['grasland', 'sumpf', 'ebene'], rohstoff_pflicht: ['lehm'], ertrag: { p: 1 }, bauzeit: 25 * 60 },
  { id: 'salzwerk', kette: 'salzwerk', stufe: 1, name: 'Salzwerk', beschreibung: 'Salzpfannen und Siedehäuser. +1 Gold, liefert Salz.', gelaende: ['salzebene', 'wueste', 'ebene'], rohstoff_pflicht: ['salz'], ertrag: { g: 1 }, bauzeit: 40 * 60 },
  { id: 'pilzzucht', kette: 'pilzzucht', stufe: 1, name: 'Pilzzucht', beschreibung: 'Gezielte Zucht der Leuchtpilze. +1 Nahrung, +1 Wissen.', gelaende: ['pilzwald'], ertrag: { n: 1, w: 1 }, bauzeit: 60 * 60 },
  { id: 'irrlichtschrein', kette: 'irrlichtschrein', stufe: 1, name: 'Irrlichtschrein', beschreibung: 'Ein uralter Steinkreis im Moor. +2 Kultur, erschließt Irrlicht-Essenz.', gelaende: ['irrlichtmoor'], ertrag: { k: 2 }, bauzeit: 2 * 3600 },
  // Handel und Wissen
  { id: 'handelsposten', kette: 'handelsposten', stufe: 1, name: 'Handelsposten', beschreibung: 'Ein kleiner Markt auf dem Land. +2 Gold.', gelaende: ['grasland', 'ebene', 'savanne', 'wueste', 'tundra', 'oase', 'salzebene'], ertrag: { g: 2 }, bauzeit: 60 * 60 },
  { id: 'handelshaus', kette: 'handelsposten', stufe: 2, name: 'Handelshaus', beschreibung: 'Ein festes Kontor mit Lager. +4 Gold.', gelaende: ['grasland', 'ebene', 'savanne', 'wueste', 'tundra', 'oase', 'salzebene'], ertrag: { g: 4 }, bauzeit: 8 * 3600 },
  { id: 'bergobservatorium', kette: 'observatorium', stufe: 1, name: 'Bergobservatorium', beschreibung: 'Ein Sternenturm auf dem Gipfel. +3 Wissen.', gelaende: ['gebirge', 'kristallgebirge'], ertrag: { w: 3 }, bauzeit: 8 * 3600 },
  { id: 'ferienanlage', kette: 'ferienanlage', stufe: 1, name: 'Ferienanlage', beschreibung: 'Erholung an besonderen Orten. +2 Gold, +2 Kultur.', gelaende: ['oase', 'mangroven', 'salzebene', 'pilzwald'], ertrag: { g: 2, k: 2 }, bauzeit: 12 * 3600 },
  { id: 'wassermuehle', kette: 'wassermuehle', stufe: 1, name: 'Wassermühle', beschreibung: 'Ein Mühlrad am Fluss. +2 Produktion. Nur an Flüssen.', gelaende: LAND_FLACH, fluss: true, ertrag: { p: 2 }, bauzeit: 2 * 3600 },
  { id: 'wasserkraftwerk', kette: 'wassermuehle', stufe: 2, name: 'Flusskraftwerk', beschreibung: 'Turbinen im Fluss. +4 Produktion, +1 Gold.', gelaende: LAND_FLACH, fluss: true, ertrag: { p: 4, g: 1 }, bauzeit: 16 * 3600 },
  { id: 'windpark', kette: 'windpark', stufe: 1, name: 'Windpark', beschreibung: 'Moderne Windräder. +3 Produktion, +1 Gold.', gelaende: ['ebene', 'tundra', 'grasland', 'huegel', 'savanne'], ertrag: { p: 3, g: 1 }, bauzeit: 20 * 3600 },
  { id: 'solarpark', kette: 'solarpark', stufe: 1, name: 'Solarpark', beschreibung: 'Spiegelfelder in der Sonne. +4 Produktion, +1 Wissen.', gelaende: ['wueste', 'salzebene', 'savanne'], ertrag: { p: 4, w: 1 }, bauzeit: 24 * 3600 },
  // Militär
  { id: 'fort', kette: 'fort', stufe: 1, name: 'Fort', beschreibung: 'Eine Palisade mit Wall. Einheiten hier verteidigen sich mit +4.', gelaende: LAND_ALLE, ertrag: {}, verteidigung: 4, bauzeit: 2 * 3600 },
  { id: 'festung', kette: 'fort', stufe: 2, name: 'Festung', beschreibung: 'Steinerne Bastionen. Verteidigung +7.', gelaende: LAND_ALLE, ertrag: {}, verteidigung: 7, bauzeit: 8 * 3600 },
  { id: 'bunkeranlage', kette: 'fort', stufe: 3, name: 'Bunkeranlage', beschreibung: 'Betonbunker mit Gräben. Verteidigung +10.', gelaende: LAND_ALLE, ertrag: {}, verteidigung: 10, bauzeit: 20 * 3600 },
  { id: 'aussenposten', kette: 'aussenposten', stufe: 1, name: 'Außenposten', beschreibung: 'Ein Wachfeuer mit Turm. Deckt 3 Felder im Umkreis dauerhaft auf.', gelaende: LAND_ALLE, ertrag: {}, sicht: 3, bauzeit: 60 * 60 },
  { id: 'beobachtungsposten', kette: 'aussenposten', stufe: 2, name: 'Beobachtungsposten', beschreibung: 'Ein hoher Turm mit Fernrohr. Sicht 5 Felder.', gelaende: LAND_ALLE, ertrag: {}, sicht: 5, bauzeit: 6 * 3600 },
  { id: 'radarstation', kette: 'aussenposten', stufe: 3, name: 'Radarstation', beschreibung: 'Radar sieht alles in 8 Feldern Umkreis.', gelaende: LAND_ALLE, ertrag: {}, sicht: 8, bauzeit: 20 * 3600 },
  { id: 'leuchtturm_feld', kette: 'leuchtturm', stufe: 1, name: 'Leuchtturm', beschreibung: 'Ein Leuchtfeuer an der Küste. +1 Gold, Sicht 4 aufs Meer.', gelaende: LAND_FLACH.concat(['huegel', 'mangroven']), kueste: true, ertrag: { g: 1 }, sicht: 4, bauzeit: 3 * 3600 },
  { id: 'bruecke', kette: 'bruecke', stufe: 1, name: 'Brücke', beschreibung: 'Überspannt den Fluss: kein Malus für Angriffe aus diesem Feld, Bewegung schneller.', gelaende: LAND_ALLE, fluss: true, schicht: 'bruecke', ertrag: {}, bauzeit: 3 * 3600 },
  { id: 'kanal', kette: 'kanal', stufe: 1, name: 'Kanal', beschreibung: 'Ein gegrabener Wasserweg. Schiffe können dieses Landfeld durchfahren.', gelaende: LAND_FLACH.concat(['sumpf', 'grasland']), kueste: true, ertrag: { g: 1 }, bauzeit: 12 * 3600 },
  // Wege (zusätzliche Schicht)
  { id: 'pfad', kette: 'strasse', stufe: 1, schicht: 'weg', name: 'Pfad', beschreibung: 'Ein ausgetretener Lehmpfad. Bewegung zwischen zwei Wegfeldern kostet nur 0,75.', gelaende: LAND_ALLE, ertrag: {}, bewegung: 0.75, bauzeit: 10 * 60 },
  { id: 'strasse', kette: 'strasse', stufe: 2, schicht: 'weg', name: 'Straße', beschreibung: 'Eine befestigte Straße. Bewegungskosten 0,5.', gelaende: LAND_ALLE, ertrag: {}, bewegung: 0.5, bauzeit: 40 * 60 },
  { id: 'pflasterstrasse', kette: 'strasse', stufe: 3, schicht: 'weg', name: 'Pflasterstraße', beschreibung: 'Gepflastert und entwässert. Bewegungskosten 0,35.', gelaende: LAND_ALLE, ertrag: {}, bewegung: 0.35, bauzeit: 3 * 3600 },
  { id: 'eisenbahn', kette: 'strasse', stufe: 4, schicht: 'weg', name: 'Eisenbahn', beschreibung: 'Schienen und Dampfloks. Bewegungskosten 0,2, +1 Produktion.', gelaende: LAND_ALLE, ertrag: { p: 1 }, bewegung: 0.2, bauzeit: 8 * 3600 },
  { id: 'autobahn', kette: 'strasse', stufe: 5, schicht: 'weg', name: 'Autobahn', beschreibung: 'Asphalt und Brücken. Bewegungskosten 0,12.', gelaende: LAND_ALLE, ertrag: { g: 1 }, bewegung: 0.12, bauzeit: 16 * 3600 },
];

export const VERBESSERUNG_NACH_ID = Object.assign(Object.create(null), Object.fromEntries(VERBESSERUNGEN.map((v, i) => [v.id, { ...v, nr: i + 1 }])));
/** Nummer 0 = keine Verbesserung. */
export const VERBESSERUNG_NR = Object.fromEntries(VERBESSERUNGEN.map((v, i) => [v.id, i + 1]));
export const KETTEN = [...new Set(VERBESSERUNGEN.map((v) => v.kette))];
