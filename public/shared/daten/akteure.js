// Akteure der lebendigen Welt: KI-Völker, Stadtstaaten und Barbarenlager. Format siehe DATENFORMAT.md.
// KI-Völker greifen Spieler nie von sich aus an; Stadtstaaten greifen niemanden an; Barbaren sind schwach.

export const KI_VOELKER = [
  { id: 'nordleute', name: 'Die Nordleute', herrscher: 'Jarl Ragna Eisenhand', farbe: '#d62828', persoenlichkeit: 'seefahrer', beschreibung: 'Kühne Seefahrer aus dem kalten Norden. Sie lieben lange Schiffe, ferne Küsten und gute Geschichten.' },
  { id: 'sonnenvolk', name: 'Das Sonnenvolk', herrscher: 'Fürstin Amaya', farbe: '#ffd60a', persoenlichkeit: 'bauer', beschreibung: 'Ein friedliches Bergvolk mit Terrassenfeldern und vollen Speichern. Sie bauen lieber, als zu kämpfen.' },
  { id: 'goldener_bund', name: 'Der Goldene Bund', herrscher: 'Dogin Valeria', farbe: '#f77f00', persoenlichkeit: 'haendler', beschreibung: 'Reiche Kaufleute, die jede Handelsroute kennen. Sie nehmen fast jedes faire Angebot an.' },
  { id: 'sternendeuter', name: 'Die Sternendeuter', herrscher: 'Weiser Kael', farbe: '#7209b7', persoenlichkeit: 'forscher', beschreibung: 'Gelehrte, die nachts die Sterne vermessen. Sie schätzen Forschungsabkommen über alles.' },
  { id: 'steppenreiter', name: 'Die Steppenreiter', herrscher: 'Khan Temur', farbe: '#e0218a', persoenlichkeit: 'krieger', beschreibung: 'Stolze Reiter der weiten Steppe. Sie streiten oft mit ihren Nachbarn, achten aber jeden, der sie respektiert.' },
];

export const STADTSTAATEN = [
  // Handel
  { id: 'salzhafen', name: 'Salzhafen', schwerpunkt: 'handel', farbe: '#80ffdb', beschreibung: 'Ein lebhafter Markt an der Salzküste. Freunde verdienen mehr an ihren Handelsrouten.', bonus: { handel_gold_prozent: 10 }, buendnis_bonus: { handel_gold_prozent: 15, handelsrouten: 1 } },
  { id: 'goldbrueck', name: 'Goldbrück', schwerpunkt: 'handel', farbe: '#ff0054', beschreibung: 'Eine Brückenstadt voller Wechselstuben. Freunde bekommen mehr Gold.', bonus: { gold_prozent: 5 }, buendnis_bonus: { gold_prozent: 10 } },
  // Forschung
  { id: 'eulenstein', name: 'Eulenstein', schwerpunkt: 'forschung', farbe: '#4361ee', beschreibung: 'Eine Stadt der Bücher und Gelehrten. Freunde forschen schneller.', bonus: { wissenschaft_prozent: 3 }, buendnis_bonus: { wissenschaft_prozent: 6 } },
  { id: 'sternwacht', name: 'Sternwacht', schwerpunkt: 'forschung', farbe: '#c77dff', beschreibung: 'Auf ihren Türmen stehen Fernrohre. Freunde forschen schneller und sehen weiter.', bonus: { wissenschaft_prozent: 2 }, buendnis_bonus: { wissenschaft_prozent: 4, sicht: 1 } },
  // Militär
  { id: 'eisenfurt', name: 'Eisenfurt', schwerpunkt: 'militaer', farbe: '#6a040f', beschreibung: 'Eine Festung an der Furt, berühmt für ihre Ausbilder. Freunde bekommen erfahrenere Truppen.', bonus: { erfahrung_prozent: 10 }, buendnis_bonus: { erfahrung_prozent: 20, heilung_prozent: 10 } },
  { id: 'falkenwall', name: 'Falkenwall', schwerpunkt: 'militaer', farbe: '#111111', beschreibung: 'Hinter hohen Mauern leben stolze Wächter. Freunde haben stärkere Städte.', bonus: { stadt_staerke: 2 }, buendnis_bonus: { stadt_staerke: 4, stadt_hp: 50 } },
  // Kultur
  { id: 'lautenheim', name: 'Lautenheim', schwerpunkt: 'kultur', farbe: '#ff70a6', beschreibung: 'Die Stadt der Musik und Feste. Freunde schaffen mehr Kultur.', bonus: { kultur_prozent: 5 }, buendnis_bonus: { kultur_prozent: 10, grenzwachstum_prozent: 10 } },
  { id: 'rosenau', name: 'Rosenau', schwerpunkt: 'kultur', farbe: '#8f2d56', beschreibung: 'Gärten voller Rosen und Dichter. Freunde sind zufriedener.', bonus: { zufriedenheit: 1 }, buendnis_bonus: { zufriedenheit: 2, kultur_prozent: 5 } },
  // Seefahrt
  { id: 'moewenkap', name: 'Möwenkap', schwerpunkt: 'seefahrt', farbe: '#00f5d4', beschreibung: 'Ein Kap voller Lotsen und Kapitäne. Freundliche Schiffe fahren schneller.', bonus: { tempo_see: 5 }, buendnis_bonus: { tempo_see: 10, sicht: 1 } },
  { id: 'tiefenhafen', name: 'Tiefenhafen', schwerpunkt: 'seefahrt', farbe: '#03045e', beschreibung: 'Ein tiefer Naturhafen mit großen Werften. Freunde bauen schneller.', bonus: { bauzeit_prozent: -3 }, buendnis_bonus: { bauzeit_prozent: -5, handelsrouten: 1 } },
  // Nahrung
  { id: 'aehrenstedt', name: 'Ährenstedt', schwerpunkt: 'nahrung', farbe: '#fcbf49', beschreibung: 'Endlose Kornfelder rund um die Stadt. Freunde haben mehr Nahrung.', bonus: { nahrung_prozent: 5 }, buendnis_bonus: { nahrung_prozent: 10 } },
  { id: 'honigtal', name: 'Honigtal', schwerpunkt: 'nahrung', farbe: '#b5e61d', beschreibung: 'Ein fruchtbares Tal mit Bienen und Obstgärten. Freunde wachsen schneller und arbeiten flinker.', bonus: { nahrung_prozent: 3, arbeiter_tempo: 5 }, buendnis_bonus: { nahrung_prozent: 5, arbeiter_tempo: 15 } },
];

export const BARBARENLAGER = [
  {
    id: 'waldraeuber', name: 'Räuberlager im Wald', gelaende: ['wald', 'dschungel', 'pilzwald'],
    beschreibung: 'Gesetzlose verstecken sich zwischen den Bäumen und überfallen Händler und Arbeiter.',
    einheiten_je_zeitalter: [['krieger', 'schleuderer'], ['krieger', 'bogenschuetze'], ['schwertkaempfer', 'kompositbogenschuetze'], ['langschwertkaempfer', 'armbrustschuetze'], ['musketier', 'arkebusier'], ['gewehrschuetze'], ['infanterie']],
    belohnung_gold: 60,
  },
  {
    id: 'bergclan', name: 'Bergclan', gelaende: ['huegel', 'gebirge', 'kristallgebirge'],
    beschreibung: 'Ein wilder Clan in den Bergen. Die Krieger kommen herab, um Herden zu stehlen.',
    einheiten_je_zeitalter: [['krieger'], ['speertraeger', 'krieger'], ['hoplit', 'schwertkaempfer'], ['pikenier', 'langschwertkaempfer'], ['landsknecht', 'musketier'], ['gewehrschuetze'], ['infanterie']],
    belohnung_gold: 70,
  },
  {
    id: 'steppennomaden', name: 'Nomadenlager', gelaende: ['savanne', 'ebene', 'wueste', 'salzebene'],
    beschreibung: 'Berittene Plünderer, die schnell kommen und schnell wieder verschwinden.',
    einheiten_je_zeitalter: [['krieger', 'schleuderer'], ['streitwagen', 'bogenschuetze'], ['reiter', 'berittener_bogenschuetze'], ['ritter', 'armbrustschuetze'], ['kuerassier'], ['kavallerie'], ['kavallerie', 'gewehrschuetze']],
    belohnung_gold: 80,
  },
  {
    id: 'piratenbucht', name: 'Piratenbucht', gelaende: ['kueste', 'mangroven'],
    beschreibung: 'Ein Unterschlupf von Seeräubern. Ihre Schiffe lauern Handelsschiffen an der Küste auf.',
    einheiten_je_zeitalter: [['boot'], ['galeere'], ['trireme'], ['kogge'], ['karavelle'], ['fregatte'], ['panzerschiff']],
    belohnung_gold: 90,
  },
  {
    id: 'sumpfvolk', name: 'Sumpfhütten', gelaende: ['sumpf', 'irrlichtmoor'],
    beschreibung: 'Im Nebel des Moores leben Ausgestoßene, die sich mit Bögen und Fallen wehren.',
    einheiten_je_zeitalter: [['schleuderer'], ['bogenschuetze', 'krieger'], ['kompositbogenschuetze', 'schwertkaempfer'], ['langbogenschuetze'], ['arkebusier'], ['feldgeschuetz'], ['maschinengewehr']],
    belohnung_gold: 60,
  },
  {
    id: 'eisnomaden', name: 'Eisnomaden', gelaende: ['tundra', 'schnee'],
    beschreibung: 'Zähe Jäger aus dem ewigen Eis. Sie ziehen im Winter nach Süden, auf der Suche nach Beute.',
    einheiten_je_zeitalter: [['krieger'], ['krieger', 'speertraeger'], ['schwertkaempfer'], ['langschwertkaempfer'], ['musketier'], ['gewehrschuetze'], ['infanterie']],
    belohnung_gold: 70,
  },
];
