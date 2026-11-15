// Rohstoffe. art: bonus | bau | strategisch | luxus
// gelaende: wo er vorkommt; dichte: Wahrscheinlichkeit pro passendem Feld.
// verbesserung: Verbesserungskette, die ihn erschließt (jede Stufe der Kette zählt).
// ertrag: Zusatzertrag des Feldes, sobald erschlossen. liefert: Menge pro Stunde ins Reichslager (Material/strategisch).
// sichtbar_durch: Forschung, ab der man ihn sieht (sonst unsichtbar). zweck: wofür er im Spiel gebraucht wird (Pflicht!).
// tier: optisches Tier, das auf dem Feld herumsteht (nur Optik).

export const ROHSTOFFE = [
  // --- Nahrung/Bonus ---
  { id: 'weizen', name: 'Weizen', art: 'bonus', gelaende: ['ebene', 'grasland'], dichte: 0.02, verbesserung: 'farm', ertrag: { n: 2 }, zweck: 'Mehr Nahrung auf dem Feld mit Farm; die Bäckerei verdoppelt den Effekt.' },
  { id: 'reis', name: 'Reis', art: 'bonus', gelaende: ['grasland', 'sumpf'], dichte: 0.015, verbesserung: 'farm', ertrag: { n: 2 }, zweck: 'Mehr Nahrung auf dem Feld mit Farm (gut in feuchten Gebieten).' },
  { id: 'mais', name: 'Mais', art: 'bonus', gelaende: ['ebene', 'savanne', 'grasland'], dichte: 0.015, verbesserung: 'farm', ertrag: { n: 2, g: 1 }, zweck: 'Mehr Nahrung und etwas Gold auf dem Feld mit Farm.' },
  { id: 'fisch', name: 'Fische', art: 'bonus', gelaende: ['kueste', 'see'], dichte: 0.05, verbesserung: 'fischerboote', ertrag: { n: 2 }, tier: 'fisch', zweck: 'Viel Nahrung für Küstenstädte mit Fischerbooten; Hafen gibt +1 Produktion.' },
  { id: 'wild', name: 'Wild', art: 'bonus', gelaende: ['wald', 'tundra'], dichte: 0.03, verbesserung: 'jagdlager', ertrag: { n: 1, p: 1 }, tier: 'hirsch', zweck: 'Nahrung und Produktion mit Jagdlager; frühe Stadt-Nahrungsquelle.' },
  { id: 'rinder', name: 'Rinder', art: 'bonus', gelaende: ['grasland', 'ebene'], dichte: 0.015, verbesserung: 'weide', ertrag: { n: 1, p: 1 }, tier: 'rind', zweck: 'Nahrung und Produktion mit Weide; senkt die Kosten des Stalls.' },
  { id: 'schafe', name: 'Schafe', art: 'bonus', gelaende: ['huegel', 'ebene', 'tundra'], dichte: 0.015, verbesserung: 'weide', ertrag: { n: 1, p: 1 }, tier: 'schaf', zweck: 'Nahrung und Produktion mit Weide; Wolle für die Textilfabrik.' },
  { id: 'bananen', name: 'Bananen', art: 'bonus', gelaende: ['dschungel'], dichte: 0.03, verbesserung: 'plantage', ertrag: { n: 2 }, zweck: 'Viel Nahrung im Dschungel mit Plantage.' },
  { id: 'wale', name: 'Wale', art: 'bonus', gelaende: ['meer', 'kueste'], dichte: 0.008, verbesserung: 'fischerboote', ertrag: { n: 1, p: 1, g: 1 }, tier: 'wal', zweck: 'Nahrung, Produktion und Gold für Küstenstädte mit Fischerbooten.' },
  { id: 'muscheln', name: 'Muscheln', art: 'bonus', gelaende: ['kueste', 'korallenriff'], dichte: 0.015, verbesserung: 'fischerboote', ertrag: { n: 1, g: 1 }, zweck: 'Nahrung und Gold mit Fischerbooten; Kultur durch das Muschelkunst-Gebäude.' },
  { id: 'datteln', name: 'Datteln', art: 'bonus', gelaende: ['oase', 'wueste'], dichte: 0.02, verbesserung: 'plantage', ertrag: { n: 2, g: 1 }, zweck: 'Nahrung in der Wüste mit Plantage; macht Wüstenstädte lebensfähig.' },
  { id: 'hirse', name: 'Hirse', art: 'bonus', gelaende: ['savanne'], dichte: 0.025, verbesserung: 'farm', ertrag: { n: 2 }, zweck: 'Nahrung in der Savanne mit Farm.' },
  { id: 'elefanten', name: 'Elefanten', art: 'bonus', gelaende: ['savanne', 'dschungel'], dichte: 0.008, verbesserung: 'jagdlager', ertrag: { p: 2 }, tier: 'elefant', zweck: 'Produktion mit Jagdlager; Voraussetzung für Kriegselefanten (1 pro Einheit).', liefert: { elefanten: 1 } },
  { id: 'pilze', name: 'Leuchtpilze', art: 'bonus', gelaende: ['pilzwald'], dichte: 0.15, verbesserung: 'pilzzucht', ertrag: { n: 2, w: 1 }, zweck: 'Nahrung und Wissen mit Pilzzucht.' },
  // --- Baustoffe ---
  { id: 'holz', name: 'Holz', art: 'bau', gelaende: ['wald', 'dschungel', 'mangroven', 'pilzwald'], dichte: 0, flaeche: true, verbesserung: 'holzfaeller', liefert: { holz: 2 }, zweck: 'Baustoff für fast alle frühen Gebäude, Schiffe und Einheiten. Kommt aus jedem bewirtschafteten Wald, mehr mit Holzfällerlager.' },
  { id: 'stein', name: 'Steinvorkommen', art: 'bau', gelaende: ['huegel', 'ebene', 'wueste', 'tundra'], dichte: 0.02, verbesserung: 'steinbruch', ertrag: { p: 1 }, liefert: { stein: 3 }, zweck: 'Baustoff für Mauern, Tempel und viele Gebäude ab der Antike.' },
  { id: 'marmor', name: 'Marmor', art: 'bau', gelaende: ['huegel', 'ebene', 'gebirge'], dichte: 0.008, verbesserung: 'steinbruch', ertrag: { p: 1, g: 1 }, liefert: { marmor: 1 }, glueck: 0, zweck: 'Pflicht-Baustoff für Weltwunder und Prachtbauten (Theater, Kathedrale, Oper).' },
  { id: 'salz', name: 'Salz', art: 'bau', gelaende: ['salzebene', 'wueste', 'ebene'], dichte: 0.012, verbesserung: 'salzwerk', ertrag: { n: 1, g: 1 }, liefert: { salz: 1 }, zweck: 'Konserviert Nahrung: Baustoff für Kornspeicher-Upgrades und Hafenlager; bringt Gold.' },
  { id: 'lehm', name: 'Lehm', art: 'bau', gelaende: ['grasland', 'sumpf', 'ebene'], dichte: 0.015, verbesserung: 'lehmgrube', ertrag: { p: 1 }, liefert: { lehm: 2 }, zweck: 'Baustoff für Ziegel: Aquädukt, Ziegelei, Lagerhaus und frühe Wohngebäude.' },
  // --- Strategisch ---
  { id: 'kupfer', name: 'Kupfer', art: 'strategisch', gelaende: ['huegel', 'gebirge', 'wueste'], dichte: 0.012, verbesserung: 'mine', ertrag: { p: 1, g: 1 }, liefert: { kupfer: 1 }, sichtbar_durch: 'bergbau', zweck: 'Bronze: Speerträger-Linie, Bronzeschmiede, Triremen.' },
  { id: 'zinn', name: 'Zinn', art: 'strategisch', gelaende: ['huegel', 'gebirge', 'tundra'], dichte: 0.01, verbesserung: 'mine', ertrag: { p: 1 }, liefert: { zinn: 1 }, sichtbar_durch: 'bergbau', zweck: 'Bronze: zusammen mit Kupfer für Bronzewaffen, Hopliten und Kriegswagen.' },
  { id: 'eisen', name: 'Eisen', art: 'strategisch', gelaende: ['huegel', 'gebirge', 'tundra', 'wueste'], dichte: 0.012, verbesserung: 'mine', ertrag: { p: 1 }, liefert: { eisen: 1 }, sichtbar_durch: 'eisenverarbeitung', zweck: 'Schwertkämpfer, Ritter, Kanonen, Panzerschiffe, Panzer und viele Industriegebäude.' },
  { id: 'pferde', name: 'Pferde', art: 'strategisch', gelaende: ['grasland', 'ebene', 'savanne', 'tundra'], dichte: 0.012, verbesserung: 'weide', ertrag: { n: 1, p: 1 }, liefert: { pferde: 1 }, tier: 'pferd', sichtbar_durch: 'tierzucht', zweck: 'Alle berittenen Einheiten bis zur Kavallerie und der Stall.' },
  { id: 'salpeter', name: 'Salpeter', art: 'strategisch', gelaende: ['wueste', 'ebene', 'tundra', 'salzebene'], dichte: 0.01, verbesserung: 'mine', ertrag: { p: 1 }, liefert: { salpeter: 1 }, sichtbar_durch: 'schiesspulver', zweck: 'Schießpulver: Musketiere, Kanonen, Arkebusiere, Pulvermühle.' },
  { id: 'kohle', name: 'Kohle', art: 'strategisch', gelaende: ['huegel', 'grasland', 'ebene', 'sumpf'], dichte: 0.012, verbesserung: 'mine', ertrag: { p: 2 }, liefert: { kohle: 1 }, sichtbar_durch: 'kohleabbau', zweck: 'Fabriken, Eisenbahn, Dampfschiffe und Panzerschiffe.' },
  { id: 'oel', name: 'Öl', art: 'strategisch', gelaende: ['wueste', 'tundra', 'sumpf', 'schnee', 'meer', 'kueste'], dichte: 0.01, verbesserung: 'bohrturm', verbesserung_alt: ['oelplattform'], ertrag: { p: 2 }, liefert: { oel: 1 }, sichtbar_durch: 'erdoelfoerderung', zweck: 'Panzer, Flugzeuge, moderne Schiffe und Kraftwerke.' },
  { id: 'aluminium', name: 'Aluminium', art: 'strategisch', gelaende: ['huegel', 'wueste', 'ebene', 'gebirge'], dichte: 0.009, verbesserung: 'mine', ertrag: { p: 2 }, liefert: { aluminium: 1 }, sichtbar_durch: 'elektrizitaet', zweck: 'Flugzeuge, Raketen, Raumfahrt und moderne Gebäude.' },
  { id: 'uran', name: 'Uran', art: 'strategisch', gelaende: ['huegel', 'tundra', 'wueste', 'gebirge', 'dschungel'], dichte: 0.006, verbesserung: 'mine', ertrag: { p: 1 }, liefert: { uran: 1 }, sichtbar_durch: 'atomtheorie', zweck: 'Kernkraftwerk, Atom-U-Boot und Atomwaffen.' },
  // --- Luxus ---
  { id: 'wein', name: 'Wein', art: 'luxus', gelaende: ['ebene', 'huegel', 'grasland'], dichte: 0.008, verbesserung: 'plantage', ertrag: { g: 2 }, glueck: 1, zweck: 'Zufriedenheit in allen Städten, Handelsware, zählt für das Weltwunder "Hängende Gärten".' },
  { id: 'gewuerze', name: 'Gewürze', art: 'luxus', gelaende: ['dschungel', 'wald', 'savanne'], dichte: 0.008, verbesserung: 'plantage', ertrag: { g: 2, n: 1 }, glueck: 1, zweck: 'Zufriedenheit und Gold, Handelsware.' },
  { id: 'seide', name: 'Seide', art: 'luxus', gelaende: ['wald', 'dschungel'], dichte: 0.007, verbesserung: 'plantage', ertrag: { g: 2, k: 1 }, glueck: 1, zweck: 'Zufriedenheit und Kultur, begehrte Handelsware.' },
  { id: 'weihrauch', name: 'Weihrauch', art: 'luxus', gelaende: ['wueste', 'ebene', 'savanne'], dichte: 0.007, verbesserung: 'plantage', ertrag: { g: 2, k: 1 }, glueck: 1, zweck: 'Zufriedenheit und Kultur, Tempel geben damit mehr Zufriedenheit.' },
  { id: 'edelsteine', name: 'Edelsteine', art: 'luxus', gelaende: ['huegel', 'dschungel', 'gebirge'], dichte: 0.007, verbesserung: 'mine', ertrag: { g: 3 }, glueck: 1, zweck: 'Zufriedenheit und viel Gold, Handelsware.' },
  { id: 'gold_erz', name: 'Gold', art: 'luxus', gelaende: ['huegel', 'wueste', 'gebirge'], dichte: 0.007, verbesserung: 'mine', ertrag: { g: 4 }, glueck: 1, zweck: 'Zufriedenheit und sehr viel Gold; Münzprägeanstalt verstärkt es.' },
  { id: 'silber', name: 'Silber', art: 'luxus', gelaende: ['huegel', 'tundra', 'gebirge'], dichte: 0.007, verbesserung: 'mine', ertrag: { g: 3 }, glueck: 1, zweck: 'Zufriedenheit und Gold; Münzprägeanstalt verstärkt es.' },
  { id: 'zucker', name: 'Zucker', art: 'luxus', gelaende: ['sumpf', 'dschungel', 'grasland'], dichte: 0.008, verbesserung: 'plantage', ertrag: { g: 2, n: 1 }, glueck: 1, zweck: 'Zufriedenheit und Nahrung, Handelsware.' },
  { id: 'elfenbein', name: 'Elfenbein', art: 'luxus', gelaende: ['savanne', 'ebene'], dichte: 0.006, verbesserung: 'jagdlager', ertrag: { g: 2, p: 1 }, glueck: 1, tier: 'elefant', zweck: 'Zufriedenheit und Gold, Handelsware für Kunsthandwerk.' },
  { id: 'pelze', name: 'Pelze', art: 'luxus', gelaende: ['tundra', 'wald'], dichte: 0.009, verbesserung: 'jagdlager', ertrag: { g: 2 }, glueck: 1, tier: 'fuchs', zweck: 'Zufriedenheit in kalten Gegenden, Handelsware.' },
  { id: 'perlen', name: 'Perlen', art: 'luxus', gelaende: ['kueste', 'korallenriff'], dichte: 0.006, verbesserung: 'fischerboote', ertrag: { g: 3 }, glueck: 1, zweck: 'Zufriedenheit und Gold für Küstenstädte, Handelsware.' },
  { id: 'kakao', name: 'Kakao', art: 'luxus', gelaende: ['dschungel'], dichte: 0.008, verbesserung: 'plantage', ertrag: { g: 2, n: 1 }, glueck: 1, zweck: 'Zufriedenheit und Nahrung, Handelsware.' },
  { id: 'baumwolle', name: 'Baumwolle', art: 'luxus', gelaende: ['ebene', 'grasland', 'savanne'], dichte: 0.007, verbesserung: 'plantage', ertrag: { g: 2, p: 1 }, glueck: 1, zweck: 'Zufriedenheit und Produktion; Textilfabrik verstärkt es.' },
  { id: 'farbstoffe', name: 'Farbstoffe', art: 'luxus', gelaende: ['wald', 'dschungel'], dichte: 0.006, verbesserung: 'plantage', ertrag: { g: 2, k: 1 }, glueck: 1, zweck: 'Zufriedenheit und Kultur (Kunst und Mode), Handelsware.' },
  { id: 'tee', name: 'Tee', art: 'luxus', gelaende: ['huegel', 'grasland'], dichte: 0.006, verbesserung: 'plantage', ertrag: { g: 1, w: 1 }, glueck: 1, zweck: 'Zufriedenheit und etwas Wissen, Handelsware.' },
  { id: 'bernstein', name: 'Bernstein', art: 'luxus', gelaende: ['wald', 'kueste', 'tundra'], dichte: 0.005, verbesserung: 'steinbruch', ertrag: { g: 2, k: 1 }, glueck: 1, zweck: 'Zufriedenheit und Kultur, Handelsware.' },
  { id: 'kristalle', name: 'Leuchtkristalle', art: 'luxus', gelaende: ['kristallgebirge'], dichte: 0.6, verbesserung: 'mine', ertrag: { g: 2, w: 2 }, glueck: 1, zweck: 'Zufriedenheit, Wissen und Gold. Nur in Kristallhöhlen-Gebirgen.' },
  { id: 'irrlichter', name: 'Irrlicht-Essenz', art: 'luxus', gelaende: ['irrlichtmoor'], dichte: 0.5, verbesserung: 'irrlichtschrein', ertrag: { k: 2, g: 1 }, glueck: 1, zweck: 'Zufriedenheit und viel Kultur. Nur in Mooren mit Irrlichtern.' },
];

export const ROHSTOFF_NACH_ID = Object.assign(Object.create(null), Object.fromEntries(ROHSTOFFE.map((r, i) => [r.id, { ...r, nr: i }])));
export const ROHSTOFF_NR = Object.fromEntries(ROHSTOFFE.map((r, i) => [r.id, i]));

/** Lagerbare Güter des Reichslagers (außer Gold). */
export const LAGERGUETER = ['holz', 'stein', 'marmor', 'salz', 'lehm', 'kupfer', 'zinn', 'eisen', 'pferde', 'salpeter', 'kohle', 'oel', 'aluminium', 'uran', 'elefanten'];
export const LAGER_NAMEN = { gold: 'Gold', holz: 'Holz', stein: 'Stein', marmor: 'Marmor', salz: 'Salz', lehm: 'Lehm', kupfer: 'Kupfer', zinn: 'Zinn', eisen: 'Eisen', pferde: 'Pferde', salpeter: 'Salpeter', kohle: 'Kohle', oel: 'Öl', aluminium: 'Aluminium', uran: 'Uran', elefanten: 'Elefanten' };
