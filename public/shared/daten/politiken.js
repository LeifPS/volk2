// Sozialpolitiken (wie in Civilization): Kultur füllt eine Leiste, jede volle Schwelle schaltet einen Platz frei.
// Jede Politik gibt einen dauerhaften Reichsbonus. Bewusst einfach: keine Bäume, keine Voraussetzungen.

export const POLITIK_KATEGORIEN = [
  { id: 'tradition', name: 'Tradition', beschreibung: 'Wachstum, Nahrung und Zufriedenheit.' },
  { id: 'freiheit', name: 'Freiheit', beschreibung: 'Wissenschaft, Gold und Handel.' },
  { id: 'ehre', name: 'Ehre', beschreibung: 'Militär, Verteidigung und Erfahrung.' },
];

export const POLITIKEN = [
  { id: 'erbe_ahnen', kategorie: 'tradition', name: 'Erbe der Ahnen', beschreibung: '+8 % Nahrung in allen Städten.', bonus: { nahrung_prozent: 8 } },
  { id: 'gemeinschaft', kategorie: 'tradition', name: 'Gemeinschaft', beschreibung: '+2 Zufriedenheit im ganzen Reich.', bonus: { zufriedenheit: 2 } },
  { id: 'monumente', kategorie: 'tradition', name: 'Monumentale Bauten', beschreibung: '+10 % Kultur und 5 % schnellerer Bau.', bonus: { kultur_prozent: 10, bauzeit_prozent: -5 } },
  { id: 'landwirtschaft', kategorie: 'tradition', name: 'Bauernstand', beschreibung: '+8 % Produktion.', bonus: { produktion_prozent: 8 } },
  { id: 'aristokratie', kategorie: 'tradition', name: 'Aristokratie', beschreibung: '+6 % Gold und +1 Zufriedenheit.', bonus: { gold_prozent: 6, zufriedenheit: 1 } },
  { id: 'gelehrte', kategorie: 'freiheit', name: 'Gelehrtenstand', beschreibung: '+10 % Wissenschaft.', bonus: { wissenschaft_prozent: 10 } },
  { id: 'marktfreiheit', kategorie: 'freiheit', name: 'Freier Markt', beschreibung: '+10 % Gold.', bonus: { gold_prozent: 10 } },
  { id: 'handelsbund', kategorie: 'freiheit', name: 'Handelsbund', beschreibung: '+15 % Gold aus Handelsrouten.', bonus: { handel_gold_prozent: 15 } },
  { id: 'erfinder', kategorie: 'freiheit', name: 'Erfindergeist', beschreibung: '+8 % Wissenschaft und 5 % schnellerer Bau.', bonus: { wissenschaft_prozent: 8, bauzeit_prozent: -5 } },
  { id: 'buergerrechte', kategorie: 'freiheit', name: 'Bürgerrechte', beschreibung: '+2 Zufriedenheit und +5 % Kultur.', bonus: { zufriedenheit: 2, kultur_prozent: 5 } },
  { id: 'wehrpflicht', kategorie: 'ehre', name: 'Wehrpflicht', beschreibung: '10 % weniger Unterhalt für Einheiten.', bonus: { unterhalt_rabatt: 10 } },
  { id: 'kriegerkodex', kategorie: 'ehre', name: 'Kriegerkodex', beschreibung: '+15 % Erfahrung für alle Einheiten.', bonus: { erfahrung_prozent: 15 } },
  { id: 'festungsbau', kategorie: 'ehre', name: 'Festungsbau', beschreibung: '+4 Stärke und +20 Lebenspunkte für Städte.', bonus: { stadt_staerke: 4, stadt_hp: 20 } },
  { id: 'lazarette', kategorie: 'ehre', name: 'Lazarette', beschreibung: '+20 % schnellere Heilung.', bonus: { heilung_prozent: 20 } },
  { id: 'gewaltmarsch', kategorie: 'ehre', name: 'Gewaltmarsch', beschreibung: '+5 % Tempo für Land-Einheiten.', bonus: { tempo_land: 5 } },
];

export const POLITIK = Object.fromEntries(POLITIKEN.map((p) => [p.id, p]));

/** Kultur, ab der die n-te Politik (n = 1, 2, …) freigeschaltet wird. */
export const politikSchwelle = (n) => Math.round(250 * n ** 1.5);

/** Anzahl freier Plätze bei gegebener Gesamtkultur und bereits gewählten Politiken. */
export function politikPlaetze(kultur, gewaehlt) {
  let n = 0;
  while (n < POLITIKEN.length && kultur >= politikSchwelle(n + 1)) n++;
  return Math.max(0, n - gewaehlt);
}
