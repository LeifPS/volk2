# Datenformat von Volk (`public/shared/daten/`)

Alle Spielinhalte sind reine Daten (ES-Module, `export const ...`). Client und Server lesen dieselben Dateien.
Alle Texte deutsch, mit Umlauten. IDs: nur `a-z0-9_`, eindeutig innerhalb ihrer Art, deutsch (z. B. `schwertkaempfer`).

Zeiten immer in **Sekunden** (Grundwerte, ohne Beschleunigung). Erträge sind Grundwerte "pro Stunde"
(die Engine multipliziert mit `ERTRAG_FAKTOR`). Gold-Unterhalt in Gold pro Stunde.

## Zeitalter (`zeitalter.js`, Index 0..6)
`antike, klassik, mittelalter, renaissance, industrie, moderne, atom`

## Lagergüter (Reichslager, Schlüssel in `kosten`)
`gold, holz, stein, marmor, salz, lehm, kupfer, zinn, eisen, pferde, salpeter, kohle, oel, aluminium, uran, elefanten`

## Gelände-IDs (`gelaende.js`)
grasland, ebene, wald, dschungel, savanne, huegel, gebirge, wueste, tundra, schnee, sumpf, kueste, meer, tiefsee, see,
oase, vulkan, korallenriff, mangroven, salzebene, kristallgebirge, irrlichtmoor, pilzwald

## Verbesserungs-IDs (`verbesserungen.js`)
farm, bewaesserte_farm, windrad_farm, mechanisierte_farm, terrassenfeld, mine, tiefe_mine, industriemine, steinbruch,
grosser_steinbruch, holzfaellerlager, saegewerk, plantage, grossplantage, weide, ranch, jagdlager, wildhege, fischerboote,
fangflotte, oelplattform, aquakultur, bohrturm, foerderanlage, lehmgrube, salzwerk, pilzzucht, irrlichtschrein,
handelsposten, handelshaus, bergobservatorium, ferienanlage, wassermuehle, wasserkraftwerk, windpark, solarpark, fort,
festung, bunkeranlage, aussenposten, beobachtungsposten, radarstation, leuchtturm_feld, bruecke, kanal, pfad, strasse,
pflasterstrasse, eisenbahn, autobahn

## Rohstoff-Sichtbarkeit (Forschungen, die es geben MUSS)
kupfer+zinn: `bergbau`, pferde: `tierzucht`, eisen: `eisenverarbeitung`, salpeter: `schiesspulver`,
kohle: `kohleabbau`, oel: `erdoelfoerderung`, aluminium: `elektrizitaet`, uran: `atomtheorie`

---

## Einheiten (`einheiten.js`, `export const EINHEITEN = [...]`)
```js
{ id, name, beschreibung,           // 1-2 Sätze, für Neulinge verständlich, was sie kann/wofür
  zeitalter: 0..6,
  klasse,                           // siehe unten
  staerke, fern, reichweite,        // fern/reichweite nur bei Fernkämpfern (sonst 0); Luft: reichweite = Einsatzradius
  tempo,                            // Bewegungspunkte wie in Civ (2 = normal, 3 = schnell, 4-6 Fahrzeuge/Schiffe, Luft: 0)
  sicht,                            // 2 normal, 3 Späher/Schiffe
  kosten: { zeit, gold, holz?, stein?, eisen?, pferde?, ... },  // einmalige Kosten beim Ausbilden
  unterhalt,                        // Gold pro Stunde (0.5 .. 8)
  abklingzeit,                      // Sekunden nach einem Angriff (Antike 5-10 min, Moderne 30-60 min, Atom bis 3 h)
  upgrade: 'id' | null,             // Aufrüstung zu (gleiche Rolle, späteres Zeitalter)
  faehigkeiten: [],                 // siehe unten
  boni: [ { gegen: 'reiter'|'stadt'|'luft'|'see'|'nahkampf'|..., wert: +10 } ],  // Kampf-Modifikatoren in Stärkepunkten
}
```
**Klassen:** `zivil` (Siedler, Arbeiter, Ingenieur), `spaeher`, `haendler` (Karawane/Land), `nahkampf`, `fernkampf`, `reiter`,
`belagerung`, `flak`, `sanitaeter`, `see_zivil` (Arbeitsboot, Handelsschiff), `see_nah`, `see_fern`, `u_boot`, `traeger`,
`transport` (Seetransport), `jaeger` (Luft), `bomber` (Luft), `rakete`, `atom`.

**Fähigkeiten:** `gruenden` (Stadt gründen), `arbeiten` (Verbesserungen bauen), `see_arbeiten` (Wasser-Verbesserungen),
`handel` (Handelsroute), `erkunden` (Auto-Erkunden), `transport` (trägt bis zu 2 Landeinheiten), `traeger` (trägt 3 Flugzeuge),
`tarnung` (nur von Nachbarfeldern sichtbar), `abfangen` (Jäger fangen Bomber ab), `heilen` (Nachbarn heilen schneller),
`einmalig` (wird beim Angriff verbraucht), `flaechenschaden` (Atomwaffe), `belagerung` (doppelter Schaden gegen Städte, schwach im Feld),
`kein_gegenschaden` (nur für Fernkämpfer üblich), `tiefsee` (darf Tiefsee befahren), `gelaende_ignorieren` (alle Felder kosten 1).

Pflicht-Einheiten mit genau diesen IDs: `siedler`, `arbeiter`, `spaeher`, `krieger`, `karawane`, `handelsschiff`,
`atomwaffe`, `fregatte`, `galeone`, `zerstoerer`, `u_boot`, `kreuzer`. Mindestens **72** Einheiten, gut verteilt auf alle 7 Zeitalter
und alle Klassen (Land/See/Luft/Zivil). Spielerfahrung: wenige, wirkungsvolle Einheiten; Werte Civ-5/6-artig
(Krieger 20, Speerträger 25, Schwertkämpfer 36, Ritter 48, Musketier 55, Gewehrschütze 70, Infanterie 80, Panzer 90, Moderner Kampfpanzer 110 ...).

## Beförderungen (`befoerderungen.js`, `export const BEFOERDERUNGEN = [...]`), ≈ 30
```js
{ id, name, beschreibung, klassen: ['nahkampf', ...], voraussetzung: 'id' | null,
  wirkung: { staerke?, fern?, reichweite?, tempo?, sicht?, heilung?(HP/h zusätzlich),
             gelaende?: { wald: 5, huegel: 5 }, gegen?: { reiter: 7, stadt: 10 }, verteidigung?, angriff?, abklingzeit_prozent? (-25 = schneller) } }
```

## Gebäude (`gebaeude.js`, `export const GEBAEUDE = [...]`), mindestens **64**
```js
{ id, name, beschreibung, zeitalter, kategorie: 'nahrung'|'wissen'|'gold'|'produktion'|'kultur'|'zufriedenheit'|'militaer'|'verteidigung'|'see'|'luft'|'infrastruktur',
  kosten: { zeit, gold, holz?, stein?, marmor?, lehm?, salz?, eisen?, kohle?, oel?, aluminium?, uran? },
  unterhalt,                       // Gold pro Stunde (0 .. 10)
  benoetigt: ['gebaeude_id'],      // in derselben Stadt vorhanden
  ersetzt: 'gebaeude_id' | null,   // Upgrade-Stufe: ersetzt dieses Gebäude (z. B. Mauern), braucht es als Voraussetzung
  braucht_kueste?: true, braucht_fluss?: true,
  wirkung: { ...siehe unten } }
```
**Wirkungs-Schlüssel (Gebäude, pro Stadt):** `nahrung, produktion, gold, wissenschaft, kultur, zufriedenheit` (feste Werte pro Stunde bzw. Punkte),
`nahrung_prozent, produktion_prozent, gold_prozent, wissenschaft_prozent, kultur_prozent` (Prozent),
`pro_einwohner: { w?, g?, k?, p? }` (je Einwohner), `wachstum_behalt` (% Nahrung, die beim Wachsen bleibt),
`verteidigung` (Stadtstärke +), `stadt_hp` (+ Lebenspunkte), `stadt_reichweite` (+ Reichweite des Stadtangriffs),
`heilung` (HP/h für Einheiten in der Stadt), `lager` (+ Lagerkapazität des Reichs je Gut), `bauplaetze` (+ parallele Bauaufträge),
`erfahrung` (neue Einheiten bekommen + EP), `luft_plaetze` (Flugzeuge, die hier stationiert sein können), `handelsrouten` (+ mögliche Routen),
`grenzwachstum_prozent`, `einheit_bauzeit_prozent` (z. B. -25 = schneller), `material: { holz?, stein?, ... }` (Lieferung pro Stunde),
`sicht` (Stadt sieht weiter), `unterhalt_frei` (Gold/h an Unterhalt, das dieses Gebäude erlässt).

Pflicht-Gebäude-IDs: `palast` (automatisch in der Hauptstadt, Kosten 0), `kornspeicher`, `bibliothek`, `campus`, `universitaet`,
`forschungslabor`, `markt`, `bank`, `boerse`, `kaserne`, `stall`, `werft`, `hafen`, `schrein`, `tempel`, `theater`, `kolosseum`,
`aquaedukt`, `werkstatt`, `manufaktur`, `fabrik`, `kraftwerk`, `flughafen`, `raketenbasis`, `krankenhaus`, `lager`, `depot`,
Mauerkette `stadtmauer_holz` → `stadtmauer_stein` → `festungsmauer` → `betonbunker` (jeweils `ersetzt` die vorige),
Turmkette `wachturm` → `burgturm` → `flakstellung`, Hafenausbau `hafen` → `grosshafen` → `containerhafen`.
Mindestens 6 weitere Upgrade-Ketten (Stufen über `ersetzt`).

## Weltwunder (`wunder.js`, `export const WUNDER = [...]`), genau 8 (je Zeitalter 1-2, Atomzeit 1)
Wie Gebäude (`kosten` mit viel `marmor`, `zeit` sehr hoch: Antike ~6 h, Atom ~4 Tage), plus
`reich: { ... }` = reichsweite Boni mit den Bonus-Schlüsseln unten, plus optional `wirkung` lokal. Jedes Wunder gibt es nur einmal im Server.

## Bonus-Schlüssel (reichsweit; Forschung `{art:'bonus'}` und Wunder `reich`)
`wissenschaft_prozent, gold_prozent, produktion_prozent, kultur_prozent, nahrung_prozent, zufriedenheit` (je Stadt),
`tempo_land` (% schneller), `tempo_see`, `heilung_prozent`, `stadt_staerke`, `stadt_hp`, `lager`, `unterhalt_rabatt` (%),
`sicht` (+ Einheitensicht), `handel_gold_prozent`, `grenzwachstum_prozent`, `bauzeit_prozent` (negativ = schneller),
`arbeiter_tempo` (% schneller), `erfahrung_prozent`, `bauplaetze` (+ parallele Aufträge in allen Städten), `handelsrouten` (+ Routen).

## Optionen (Forschung `{art:'option', id}`) – jede MUSS genau durch eine Forschung freigeschaltet werden
`krieg` (Krieg erklären), `frieden` (Frieden anbieten), `offene_grenzen`, `buendnis`, `forschungsabkommen`, `tribut`,
`tausch` (Tauschangebote), `karten_tausch`, `stadtstaat_buendnis`, `aufruesten` (Einheiten-Upgrade gegen Gold),
`bauplatz_2`, `bauplatz_3` (2./3. paralleler Bauauftrag je Stadt), `einschiffen` (Landeinheiten fahren über Küste),
`tiefsee_einschiffen`, `pluendern` (Verbesserungen im Krieg plündern), `luftlandung`, `atomschlag`.

## Forschungen (`forschung.js`, `export const FORSCHUNGEN = [...]`), mindestens **225**
```js
{ id, name, zeitalter: 0..6, zweig: 'wirtschaft'|'militaer'|'see'|'wissen'|'staat'|'industrie'|'luft'|'raumfahrt',
  spalte,                 // Tiefe im Baum: 0.. ; jede Voraussetzung hat kleinere Spalte; Spalten steigen mit Zeitaltern
  dauer,                  // Basisdauer in Sekunden (siehe Richtwerte)
  voraussetzungen: ['id', ...],   // 1-3; nur Startforschungen haben []
  freischaltet: [ { art: 'einheit'|'gebaeude'|'wunder'|'verbesserung'|'rohstoff'|'option'|'bonus', id, wert? } ],
  beschreibung,           // 1 Satz Flair
  schluessel?: true,      // genau eine je Zeitalter 1..6: Schlüsselforschung für den Zeitalter-Aufstieg
  wiederholbar?: true }   // nur die Zukunftstechnologien am Ende
```
Richtwerte Basisdauer: Antike 3 min bis 60 min, Klassik 1-3 h, Mittelalter 3-8 h, Renaissance 6-16 h, Industrie 12-30 h,
Moderne 1-3 Tage, Atomzeit 2-4 Tage; innerhalb eines Zeitalters langsam steigend (flüssige Übergänge, keine Sprünge).
Etwa 25-38 Forschungen je Zeitalter. **Jede** Einheit, jedes Gebäude (außer `palast`), jedes Wunder, jede Verbesserung
und jede Option muss von mindestens einer Forschung freigeschaltet werden; strategische Rohstoffe über `{art:'rohstoff', id}`.
`siedler`, `arbeiter`, `spaeher`, `krieger` werden von der Startforschung freigeschaltet (es gibt 2-3 Startforschungen mit `voraussetzungen: []`, Antike, Spalte 0, Dauer 3-5 min).

## Akteure (`akteure.js`)
```js
export const KI_VOELKER = [ { id, name /*Volksname*/, herrscher, farbe:'#rrggbb', persoenlichkeit:'haendler'|'forscher'|'bauer'|'krieger'|'seefahrer', beschreibung } ] // 5
export const STADTSTAATEN = [ { id, name, schwerpunkt:'handel'|'forschung'|'militaer'|'kultur'|'seefahrt'|'nahrung', farbe, beschreibung,
   bonus: { /* Bonus-Schlüssel, wird Freunden gewährt */ }, buendnis_bonus: { ... } } ] // 12
export const BARBARENLAGER = [ { id, name, gelaende: ['wald', ...], beschreibung, einheiten_je_zeitalter: [['krieger'],['krieger','bogenschuetze'],...7] , belohnung_gold } ] // >= 5
```
Farben müssen gut unterscheidbar sein (untereinander und von Gelände).
