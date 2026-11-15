// Weltwunder: jedes gibt es nur einmal pro Server. Wer es zuerst fertigstellt, bekommt es;
// alle anderen erhalten ihr eingesetztes Material zurück. Format siehe DATENFORMAT.md.
// reich: reichsweite Boni (Bonus-Schlüssel), wirkung: zusätzliche Wirkung in der Stadt des Wunders.

const STD = 3600;
const TAG = 24 * STD;

export const WUNDER = [
  {
    id: 'pyramiden', name: 'Pyramiden', zeitalter: 0, kategorie: 'produktion',
    beschreibung: 'Gewaltige Grabmäler aus Stein. Deine Arbeiter bauen schneller und alle Bauaufträge gehen flotter voran.',
    kosten: { zeit: 6 * STD, gold: 400, stein: 300, marmor: 15 }, unterhalt: 0, benoetigt: [], ersetzt: null,
    reich: { arbeiter_tempo: 25, bauzeit_prozent: -10 },
    wirkung: { kultur: 2, produktion: 2 },
  },
  {
    id: 'grosse_bibliothek', name: 'Große Bibliothek', zeitalter: 1, kategorie: 'wissen',
    beschreibung: 'Alles Wissen der Welt an einem Ort. Dein ganzes Reich forscht schneller.',
    kosten: { zeit: 10 * STD, gold: 800, stein: 250, holz: 150, marmor: 25 }, unterhalt: 0, benoetigt: ['bibliothek'], ersetzt: null,
    reich: { wissenschaft_prozent: 10 },
    wirkung: { wissenschaft: 6, kultur: 2 },
  },
  {
    id: 'koloss', name: 'Koloss', zeitalter: 1, kategorie: 'gold', braucht_kueste: true,
    beschreibung: 'Eine riesige Bronzestatue über der Hafeneinfahrt. Handelsrouten bringen viel mehr Gold, und du kannst eine Route mehr betreiben.',
    kosten: { zeit: 10 * STD, gold: 800, stein: 200, marmor: 25, kupfer: 5, zinn: 3 }, unterhalt: 0, benoetigt: [], ersetzt: null,
    reich: { handel_gold_prozent: 25, handelsrouten: 1, gold_prozent: 5 },
    wirkung: { gold: 5 },
  },
  {
    id: 'grosse_mauer', name: 'Große Mauer', zeitalter: 2, kategorie: 'verteidigung',
    beschreibung: 'Ein endloser Wall entlang der Grenze. Alle deine Städte sind stärker und halten mehr aus.',
    kosten: { zeit: 18 * STD, gold: 1400, stein: 600, marmor: 35 }, unterhalt: 0, benoetigt: [], ersetzt: null,
    reich: { stadt_staerke: 5, stadt_hp: 75, grenzwachstum_prozent: 10 },
    wirkung: { verteidigung: 10 },
  },
  {
    id: 'taj_mahal', name: 'Taj Mahal', zeitalter: 3, kategorie: 'kultur',
    beschreibung: 'Ein Palast aus weißem Marmor, schöner als alles andere. Alle Städte sind zufriedener und schaffen mehr Kultur.',
    kosten: { zeit: 30 * STD, gold: 2400, stein: 400, marmor: 60 }, unterhalt: 0, benoetigt: [], ersetzt: null,
    reich: { zufriedenheit: 2, kultur_prozent: 15 },
    wirkung: { kultur: 6 },
  },
  {
    id: 'kristallpalast', name: 'Kristallpalast', zeitalter: 4, kategorie: 'produktion',
    beschreibung: 'Eine Halle aus Glas und Eisen, Schaufenster der Industrie. Jede deiner Städte kann einen Bauauftrag mehr gleichzeitig ausführen.',
    kosten: { zeit: 45 * STD, gold: 4000, stein: 500, marmor: 70, eisen: 10 }, unterhalt: 0, benoetigt: [], ersetzt: null,
    reich: { bauplaetze: 1, produktion_prozent: 10 },
    wirkung: { produktion: 5, kultur: 3 },
  },
  {
    id: 'freiheitsstatue', name: 'Freiheitsstatue', zeitalter: 5, kategorie: 'zufriedenheit',
    beschreibung: 'Ein Leuchtfeuer der Freiheit. Alle Städte sind zufriedener, erwirtschaften mehr Gold, und der Unterhalt sinkt.',
    kosten: { zeit: 2.5 * TAG, gold: 7000, stein: 600, marmor: 90, eisen: 10 }, unterhalt: 0, benoetigt: [], ersetzt: null,
    reich: { zufriedenheit: 3, gold_prozent: 10, unterhalt_rabatt: 15 },
    wirkung: { kultur: 6 },
  },
  {
    id: 'internationale_raumstation', name: 'Internationale Raumstation', zeitalter: 6, kategorie: 'wissen',
    beschreibung: 'Ein Labor im Weltall. Dein ganzes Reich forscht deutlich schneller, und deine Einheiten sehen weiter.',
    kosten: { zeit: 4 * TAG, gold: 12000, stein: 800, marmor: 120, aluminium: 15 }, unterhalt: 0, benoetigt: [], ersetzt: null,
    reich: { wissenschaft_prozent: 20, sicht: 1 },
    wirkung: { wissenschaft: 20 },
  },
];
