// Spielregeln und Formeln. Rein und ohne Zustand, von Client (Vorschau) und Server (Wahrheit) gemeinsam genutzt.

export const MIN = 60 * 1000, STD = 60 * MIN, TAG = 24 * STD;

// --- Wirtschaft ---
/** Nahrung, Gold, Kultur und Baustoffe (Holz, Stein, Marmor, Lehm, Salz) werden mit diesem Faktor pro Stunde ausgeschüttet. */
export const ERTRAG_FAKTOR = 6;
/** Gold wird schwächer skaliert, damit Gold knapp genug bleibt, um wertvoll zu sein. */
export const GOLD_FAKTOR = 3;
/** Grundwissen je Einwohner (Punkte). */
export const WISSEN_JE_EINWOHNER = 1;
export const BAUSTOFFE = ['holz', 'stein', 'marmor', 'lehm', 'salz'];
export const STRATEGISCH = ['kupfer', 'zinn', 'eisen', 'pferde', 'salpeter', 'kohle', 'oel', 'aluminium', 'uran', 'elefanten'];
export const NAHRUNG_PRO_EINWOHNER = 2;
export const START_LAGER = { gold: 150, holz: 120, stein: 60 };
export const LAGER_BASIS_BAU = 400;       // Kapazität je Baustoff
export const LAGER_BASIS_STRATEGISCH = 12; // Kapazität je strategischem Rohstoff
export const STADT_MINDESTABSTAND = 4;     // Felder Abstand (also mind. 3 Felder dazwischen)
export const STADT_RADIUS_ARBEIT = 3;
export const STADT_RADIUS_GRENZE_MAX = 5;

// --- Anfangsbeschleunigung: Der Einstieg soll flott gehen, später wird es zäher ---
/** Tempo-Faktor für Bauen, Ausbilden und Forschen je Zeitalter (0 = Antike). Danach 1. */
export const ANFANGS_TEMPO = [2, 1.5, 1.25];
export function anfangsTempo(zeitalter) { return ANFANGS_TEMPO[zeitalter] ?? 1; }
/** Faktor auf den Bedarf für Wachstum und Grenzen: die ersten Stufen sind billiger (0,5 bei Stufe 0, ab Stufe 6 voll). */
export function anfangsFaktor(stufe) { return Math.min(1, 0.5 + 0.08 * Math.max(0, stufe)); }

/** Nahrung, die eine Stadt mit b Einwohnern zum Wachsen braucht. */
export function wachstumsBedarf(b) {
  return Math.round(ERTRAG_FAKTOR * anfangsFaktor(b - 1) * (5 + 5 * (b - 1) + Math.pow(b - 1, 1.6)));
}

/** Kultur, die eine Stadt für ihr k-tes zusätzliches Grenzfeld braucht. */
export function grenzKosten(k) {
  return Math.round(ERTRAG_FAKTOR * anfangsFaktor(k) * (4 + 4 * k + Math.pow(k, 1.45)));
}

/** Forschungstempo-Faktor aus Wissenschaftspunkten (1 Punkt = +1 %). */
export function forschungsTempo(wissenschaft) { return 1 + Math.max(0, wissenschaft) / 100; }
/** Bautempo-Faktor einer Stadt aus Produktionspunkten (1 Punkt = +4 %). */
export function bauTempo(produktion) { return 1 + Math.max(0, produktion) / 25; }

/** Bauzeit in ms aus Grundzeit (Sekunden), Produktion und Zusatzprozent (negativ = schneller). */
export function bauDauer(grundSek, produktion, prozent = 0) {
  const f = Math.max(0.25, 1 + prozent / 100);
  return Math.max(30 * 1000, Math.round(grundSek * 1000 * f / bauTempo(produktion)));
}

/** Zufriedenheits-Wirkung auf Erträge: -25 % bei sehr unzufrieden bis +10 % bei sehr zufrieden. */
export function zufriedenheitsFaktor(z) {
  if (z >= 5) return 1.1;
  if (z >= 0) return 1 + z * 0.02;
  return Math.max(0.75, 1 + z * 0.05);
}
/** Grund-Unzufriedenheit einer Stadt durch ihre Größe und die Anzahl der Städte des Reichs. */
export function stadtUnzufriedenheit(bev, anzahlStaedte) {
  return Math.floor(bev / 3) + Math.max(0, Math.floor((anzahlStaedte - 3) / 2));
}

/** Kostenloses Kontingent: so viele Militäreinheiten kosten keinen Unterhalt. */
export function freieEinheiten(anzahlStaedte) { return 4 + 2 * anzahlStaedte; }
/** Kostenloses Gebäude-Unterhalts-Kontingent je Stadt (Gold/h). */
export function freierGebaeudeUnterhalt(bev) { return 3 + bev * 0.5; }

// --- Bewegung ---
/** Sekunden pro Bewegungskosten-Einheit bei Tempo 2. */
export const SCHRITT_BASIS_S = 120;
export const EINGESCHIFFT_TEMPO = 2;

/** Dauer eines Schritts in ms. kosten: Geländekosten (oder Wegkosten), tempo: Bewegungspunkte der Einheit, bonusProzent: schneller. */
export function schrittDauer(kosten, tempo, bonusProzent = 0) {
  const t = Math.max(1, tempo);
  return Math.round(SCHRITT_BASIS_S * 1000 * kosten * 2 / t / (1 + Math.max(0, bonusProzent) / 100));
}

// --- Kampf ---
export const KAMPF = {
  basisSchaden: 30,
  faktor: 1.0417,
  zufallMin: 0.8,
  zufallMax: 1.2,
  befestigt: 4,
  eigenerBoden: 2,
  flanke: 2,
  unterstuetzung: 2,
  flussMalus: 3,
  unterversorgt: 5,
  fernGegenStadtFaktor: 0.5,
  belagerungGegenStadtFaktor: 1.5,
  stadtReichweite: 2,
  stadtAbklingzeit: 15 * MIN,
  eroberungsRestBev: 0.4,
  zerstoertDauer: 6 * STD,
  raubtierMinHp: 20,
};

/** Schaden, den eine Seite mit Stärke a einer Seite mit Stärke d zufügt (z = Zufall 0..1). */
export function schaden(a, d, z) {
  const zufall = KAMPF.zufallMin + (KAMPF.zufallMax - KAMPF.zufallMin) * z;
  return Math.max(1, Math.round(KAMPF.basisSchaden * Math.pow(KAMPF.faktor, a - d) * zufall));
}
/** Erwarteter Schaden (Mitte des Zufallsbereichs) für die Vorschau. */
export function erwarteterSchaden(a, d) { return Math.round(KAMPF.basisSchaden * Math.pow(KAMPF.faktor, a - d)); }
/** Stärke-Malus durch Verwundung (Civ 6: -1 je 10 fehlende HP). */
export function verwundungsMalus(hp) { return 0 - Math.floor((100 - Math.max(0, Math.min(100, hp))) / 10); }

/** Stadt: Grundstärke und Lebenspunkte. */
export function stadtGrundStaerke(zeitalter, bev) { return 14 + 9 * zeitalter + Math.min(10, Math.floor(bev / 3)); }
export const STADT_GRUND_HP = 300;
/** Heilung in HP pro Stunde. */
export const HEILUNG = { stadt: 35, eigen: 15, freund: 6, fremd: 0, stadtRegeneration: 60 };

/** Erfahrung bis zur n-ten Beförderung (n ab 1). */
export function epFuerBefoerderung(n) { return 10 * n * (n + 1) / 2; }
export const EP = { angriff: 5, verteidigung: 4, fern: 3, sieg: 3, max_barbar: 30 };

// --- Mehrspieler-Schutz ---
export const SCHUTZ = {
  neulingDauer: 24 * STD,
  onlineFenster: 10 * MIN,      // Aktivität in den letzten 10 min zählt als online
  waffenruheNach: 30 * MIN,     // Offline so lange im Krieg -> Waffenruhe
  schonfrist: 10 * MIN,         // nach Rückkehr aus der Waffenruhe
  friedensvorschlagNach: 12 * STD,
  sitzungDauer: 30 * TAG,
};

// --- Sonstiges ---
export const FORSCHUNGSABKOMMEN = { dauer: 24 * STD, bonus: 15, kostenJeZeitalter: 120 };
export const HANDEL = { grundGold: 4, jeFeld: 0.25, fremdBonus: 1.5, zielAnteil: 0.4 };
export const STADTSTAAT = { freund: 30, verbuendet: 60, verfallProStunde: 0.5, goldJeEinfluss: 8 };
export const AUFLOESEN_ERSTATTUNG = 0.25;
export const ABBRUCH_ERSTATTUNG = 0.5;
export const AUFRUESTEN_FAKTOR = 0.6; // Anteil der Goldkosten-Differenz

/** Gesamtwert für die Rangliste aus den Einzelkategorien. */
export function gesamtWertung(k) {
  return Math.round(k.gold / 50 + k.militaer / 5 + k.staedte * 20 + k.bevoelkerung * 4 + k.forschungen * 5 + k.gebiet / 2 + k.kultur / 200 + k.wunder * 60);
}
