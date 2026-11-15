// Der Forschungsbaum von Volk: ein großer, zusammenhängender Baum in 7 Zeitaltern. Format siehe DATENFORMAT.md.
//
// Die Tabelle unten ist kompakt geschrieben und wird beim Laden in das Standardformat umgewandelt:
//   [id, name, zweig, spalte, voraussetzungen, freischaltet, beschreibung]
// freischaltet-Kurzschrift: 'e:id' Einheit, 'g:id' Gebäude, 'w:id' Wunder, 'v:id' Verbesserung,
//   'r:id' Rohstoff (sichtbar), 'o:id' Option, 'b:schluessel=wert' reichsweiter Bonus.
// zeitalter und dauer ergeben sich aus der Spalte (siehe SPALTEN_ZEITALTER und DAUER_JE_SPALTE),
// damit Dauern innerhalb eines Zeitalters langsam steigen und Übergänge ohne Sprung verlaufen.

const MIN = 60;
const STD = 3600;

/** Erste Spalte jedes Zeitalters (Antike 0-5, Klassik 6-10, Mittelalter 11-16, Renaissance 17-22, Industrie 23-29, Moderne 30-36, Atomzeit ab 37). */
export const SPALTEN_ZEITALTER = [0, 6, 11, 17, 23, 30, 37];

/** Basisdauer in Sekunden je Spalte. */
export const DAUER_JE_SPALTE = [
  4 * MIN, 10 * MIN, 16 * MIN, 25 * MIN, 38 * MIN, 55 * MIN, // Antike: 3 min bis 1 h
  65 * MIN, 80 * MIN, 100 * MIN, 125 * MIN, 155 * MIN, // Klassik: 1 bis 3 h
  3.3 * STD, 4.2 * STD, 5 * STD, 5.9 * STD, 6.8 * STD, 7.8 * STD, // Mittelalter: 3 bis 8 h
  8 * STD, 9 * STD, 10.5 * STD, 12 * STD, 14 * STD, 15.5 * STD, // Renaissance: 6 bis 16 h
  16 * STD, 17.5 * STD, 19 * STD, 21 * STD, 23 * STD, 26 * STD, 29 * STD, // Industrie: 12 bis 30 h
  30 * STD, 33 * STD, 37 * STD, 41 * STD, 45 * STD, 49 * STD, 53 * STD, // Moderne: 1 bis 3 Tage (per Balance-Simulation eingestellt)
  55 * STD, 57 * STD, 59 * STD, 61 * STD, 63 * STD, 65 * STD, 67 * STD, // Atomzeit: 2 bis 4 Tage (per Balance-Simulation eingestellt)
  70 * STD, // Zukunftstechnologien
];

/** Schlüsselforschung je Zeitalter 1..6 (eröffnet den Zeitalter-Aufstieg). */
const SCHLUESSEL = new Set(['eisenverarbeitung', 'feudalismus', 'schiesspulver', 'dampfmaschine', 'massenproduktion', 'atomtheorie']);
/** Wiederholbare Zukunftstechnologien. */
const WIEDERHOLBAR = new Set(['zukunft_verteidigung', 'zukunft_wissen', 'zukunft_wirtschaft', 'zukunft_industrie', 'zukunft_kultur']);

const ROH = [
  // ======================= ANTIKE (Spalten 0-5) =======================
  // Spalte 0 – Startforschungen
  ['stammesleben', 'Stammesleben', 'staat', 0, [], ['e:siedler', 'e:arbeiter', 'e:spaeher', 'e:krieger'], 'Ein Lagerfeuer, ein Häuptling und ein gemeinsames Ziel: Hier beginnt dein Volk.'],
  ['ackerbau', 'Ackerbau', 'wirtschaft', 0, [], ['v:farm'], 'Wer Samen in die Erde legt, muss nicht mehr umherziehen.'],
  ['jagd', 'Jagd', 'wirtschaft', 0, [], ['v:jagdlager'], 'Speer und Fallen bringen Fleisch und Felle ins Lager.'],
  // Spalte 1
  ['toepferei', 'Töpferei', 'wirtschaft', 1, ['ackerbau'], ['g:toepferei', 'g:kornspeicher'], 'Gebrannte Krüge halten Korn trocken und Wasser frisch.'],
  ['tierzucht', 'Tierzucht', 'wirtschaft', 1, ['jagd', 'ackerbau'], ['r:pferde', 'v:weide'], 'Gezähmte Tiere geben Milch, Wolle und bald auch schnelle Pferde.'],
  ['bergbau', 'Bergbau', 'industrie', 1, ['stammesleben'], ['r:kupfer', 'r:zinn', 'v:mine'], 'Im Fels glänzen Kupfer und Zinn: der Grundstoff der Bronze.'],
  ['holzbearbeitung', 'Holzbearbeitung', 'industrie', 1, ['stammesleben'], ['v:holzfaellerlager', 'g:lager', 'b:lager=20'], 'Steinäxte fällen Bäume, und aus Stämmen werden Hütten.'],
  ['ahnenkult', 'Ahnenkult', 'wissen', 1, ['stammesleben'], ['g:schrein', 'b:kultur_prozent=2'], 'Die Geister der Vorfahren wachen über das Dorf.'],
  // Spalte 2
  ['steinmetzkunst', 'Steinmetzkunst', 'industrie', 2, ['bergbau'], ['v:steinbruch'], 'Mit Meißel und Keil wird roher Fels zu Bausteinen.'],
  ['bogenbau', 'Bogenbau', 'militaer', 2, ['jagd'], ['e:schleuderer'], 'Schleudern und erste Bögen treffen Beute und Feinde aus der Ferne.'],
  ['fischfang', 'Fischfang', 'see', 2, ['jagd', 'holzbearbeitung'], ['v:fischerboote', 'e:arbeitsboot'], 'Netze und Einbäume holen die Schätze des Wassers.'],
  ['schrift', 'Schrift', 'wissen', 2, ['toepferei', 'ahnenkult'], ['g:bibliothek', 'b:wissenschaft_prozent=2'], 'Zeichen auf Ton bewahren Wissen über Generationen.'],
  ['kriegerkodex', 'Kriegerkodex', 'militaer', 2, ['bergbau'], ['e:speertraeger', 'g:kaserne', 'o:krieg'], 'Ehre, Gehorsam und ein spitzer Speer: Das erste Heer entsteht.'],
  ['lehmbau', 'Lehmbau', 'wirtschaft', 2, ['toepferei'], ['v:lehmgrube', 'g:brunnen'], 'Lehm, Stroh und Wasser werden zu festen Wänden.'],
  // Spalte 3
  ['bronzeguss', 'Bronzeguss', 'militaer', 3, ['kriegerkodex'], ['g:bronzeschmiede', 'b:produktion_prozent=2'], 'Kupfer und Zinn schmelzen zu hartem, glänzendem Metall.'],
  ['rad', 'Das Rad', 'industrie', 3, ['tierzucht', 'holzbearbeitung'], ['e:streitwagen', 'v:pfad'], 'Eine runde Scheibe verändert, wie die Welt sich bewegt.'],
  ['bogenschiessen', 'Bogenschießen', 'militaer', 3, ['bogenbau'], ['e:bogenschuetze'], 'Geübte Schützen treffen auf zwei Felder Entfernung.'],
  ['bootsbau', 'Bootsbau', 'see', 3, ['fischfang'], ['e:boot', 'b:tempo_see=3'], 'Aus ausgehöhlten Stämmen werden seetüchtige Kanus.'],
  ['kalender', 'Kalender', 'wissen', 3, ['schrift'], ['v:plantage', 'b:nahrung_prozent=2'], 'Wer die Jahreszeiten kennt, weiß, wann er säen muss.'],
  ['tauschhandel', 'Tauschhandel', 'wirtschaft', 3, ['lehmbau'], ['e:karawane', 'v:handelsposten', 'o:tausch'], 'Ein Krug gegen ein Fell: Der erste Handel verbindet die Völker.'],
  ['palisadenbau', 'Palisadenbau', 'militaer', 3, ['steinmetzkunst', 'holzbearbeitung'], ['g:stadtmauer_holz', 'g:wachturm'], 'Angespitzte Stämme halten Räuber und wilde Tiere fern.'],
  // Spalte 4
  ['segeln', 'Segeln', 'see', 4, ['bootsbau'], ['e:galeere'], 'Ein Tuch im Wind trägt Schiffe weiter als jedes Ruder.'],
  ['belagerungsbau', 'Belagerungsbau', 'militaer', 4, ['rad', 'bronzeguss'], ['e:rammbock'], 'Ein Stamm mit Bronzekopf öffnet jedes Tor.'],
  ['reiterei', 'Reiterei', 'militaer', 4, ['rad'], ['g:stall', 'b:tempo_land=2'], 'Auf dem Rücken der Pferde werden Wege kürzer.'],
  ['salzgewinnung', 'Salzgewinnung', 'wirtschaft', 4, ['tauschhandel', 'steinmetzkunst'], ['v:salzwerk', 'b:gold_prozent=2'], 'Weißes Gold: Salz macht Speisen haltbar und Händler reich.'],
  ['priestertum', 'Priestertum', 'wissen', 4, ['kalender', 'ahnenkult'], ['g:denkmal', 'v:irrlichtschrein'], 'Priester deuten die Zeichen und hüten heilige Orte.'],
  ['sternkunde', 'Sternkunde', 'wissen', 4, ['kalender'], ['b:wissenschaft_prozent=3'], 'Die Sterne wandern nach festen Regeln über den Himmel.'],
  ['kraeuterkunde', 'Kräuterkunde', 'wissen', 4, ['kalender', 'ackerbau'], ['v:pilzzucht', 'b:heilung_prozent=5'], 'Die richtige Pflanze lindert Schmerz und schließt Wunden.'],
  // Spalte 5
  ['monumentalbau', 'Monumentalbau', 'staat', 5, ['priestertum', 'palisadenbau'], ['w:pyramiden', 'b:bauzeit_prozent=-3'], 'Tausende Hände, ein Plan: Bauwerke für die Ewigkeit.'],
  ['feuerzeichen', 'Feuerzeichen', 'militaer', 5, ['palisadenbau', 'sternkunde'], ['v:aussenposten', 'b:sicht=1'], 'Ein Feuer auf dem Hügel warnt das ganze Land.'],
  ['rechnen', 'Rechnen', 'wissen', 5, ['sternkunde', 'tauschhandel'], ['b:wissenschaft_prozent=2', 'b:gold_prozent=2'], 'Zählen, Teilen, Messen: Zahlen ordnen die Welt.'],
  ['stammesrat', 'Stammesrat', 'staat', 5, ['priestertum', 'kriegerkodex'], ['b:zufriedenheit=1', 'b:grenzwachstum_prozent=5'], 'Die Ältesten beraten gemeinsam über das Wohl aller.'],

  // ======================= KLASSIK (Spalten 6-10) =======================
  // Spalte 6
  ['eisenverarbeitung', 'Eisenverarbeitung', 'militaer', 6, ['bronzeguss', 'belagerungsbau'], ['r:eisen', 'e:schwertkaempfer'], 'Glühendes Eisen wird zu Klingen, die Bronze zerbrechen.'],
  ['mathematik', 'Mathematik', 'wissen', 6, ['rechnen'], ['e:katapult', 'b:wissenschaft_prozent=2'], 'Winkel und Hebel: Mit Zahlen lassen sich Maschinen bauen.'],
  ['phalanx', 'Phalanx', 'militaer', 6, ['bronzeguss', 'stammesrat'], ['e:hoplit'], 'Schild an Schild steht eine Mauer aus Bronze.'],
  ['reitkunst', 'Reitkunst', 'militaer', 6, ['reiterei'], ['e:reiter'], 'Sattel und Zaumzeug machen Reiter zu Kriegern.'],
  ['waehrung', 'Währung', 'wirtschaft', 6, ['tauschhandel', 'rechnen'], ['g:markt', 'b:gold_prozent=3'], 'Geprägte Münzen ersetzen Säcke voller Tauschwaren.'],
  ['polytheismus', 'Polytheismus', 'wissen', 6, ['priestertum', 'monumentalbau'], ['g:tempel'], 'Für jeden Gott ein Tempel, für jedes Fest ein Opfer.'],
  ['trieren', 'Trierenbau', 'see', 6, ['segeln', 'bronzeguss'], ['e:trireme'], 'Drei Reihen Ruder und ein Bronzesporn: schnell und tödlich.'],
  ['baukunst', 'Baukunst', 'industrie', 6, ['monumentalbau', 'steinmetzkunst'], ['g:stadtmauer_stein', 'v:fort'], 'Behauene Quader fügen sich zu Mauern ohne Mörtel.'],
  // Spalte 7
  ['strassenbau', 'Straßenbau', 'staat', 7, ['baukunst', 'rad'], ['v:strasse', 'v:bruecke', 'b:tempo_land=3'], 'Alle Wege führen in deine Hauptstadt.'],
  ['philosophie', 'Philosophie', 'wissen', 7, ['mathematik', 'polytheismus'], ['g:campus', 'b:wissenschaft_prozent=3'], 'Warum ist die Welt, wie sie ist? Denker suchen Antworten.'],
  ['diplomatie', 'Diplomatie', 'staat', 7, ['stammesrat', 'waehrung'], ['o:frieden', 'o:offene_grenzen'], 'Gesandte sprechen, wo sonst Schwerter sprechen würden.'],
  ['kompositbogen', 'Kompositbogen', 'militaer', 7, ['bogenschiessen', 'phalanx'], ['e:kompositbogenschuetze'], 'Holz, Horn und Sehne: ein kleiner Bogen mit großer Kraft.'],
  ['elefantendressur', 'Elefantendressur', 'militaer', 7, ['reitkunst'], ['e:kriegselefant'], 'Ein Elefant im Panzer ist eine wandelnde Festung.'],
  ['handwerk', 'Handwerk', 'industrie', 7, ['eisenverarbeitung', 'lehmbau'], ['g:werkstatt', 'g:ziegelei', 'b:produktion_prozent=2'], 'Meister und Lehrlinge fertigen Werkzeug für die ganze Stadt.'],
  ['kuestenbau', 'Küstenbau', 'see', 7, ['trieren'], ['g:werft', 'g:leuchtturm', 'v:leuchtturm_feld'], 'Werften und Leuchtfeuer machen die Küste zur Heimat der Flotte.'],
  // Spalte 8
  ['ingenieurskunst', 'Ingenieurskunst', 'industrie', 8, ['strassenbau', 'mathematik'], ['g:aquaedukt', 'v:terrassenfeld'], 'Bögen tragen Wasser über Täler und Felder an Hänge.'],
  ['legionsdrill', 'Legionsdrill', 'militaer', 8, ['eisenverarbeitung', 'strassenbau'], ['e:legionaer', 'b:erfahrung_prozent=5'], 'Täglicher Drill macht aus Bauern Berufssoldaten.'],
  ['muenzwesen', 'Münzwesen', 'wirtschaft', 8, ['waehrung', 'handwerk', 'salzgewinnung'], ['g:muenzpraegeanstalt', 'b:gold_prozent=3'], 'Einheitliche Münzen mit dem Bild des Herrschers.'],
  ['literatur', 'Literatur', 'wissen', 8, ['philosophie'], ['w:grosse_bibliothek', 'b:kultur_prozent=3'], 'Epen und Gedichte erzählen von Helden und Göttern.'],
  ['seehandel', 'Seehandel', 'see', 8, ['kuestenbau', 'waehrung'], ['e:handelsschiff', 'o:einschiffen'], 'Schiffe voller Wein und Öl verbinden ferne Häfen.'],
  ['berittene_schuetzen', 'Berittene Schützen', 'militaer', 8, ['kompositbogen', 'reitkunst'], ['e:berittener_bogenschuetze'], 'Schießen im vollen Galopp: eine Kunst der Steppe.'],
  ['brot_und_spiele', 'Brot und Spiele', 'staat', 8, ['polytheismus', 'baukunst'], ['g:kolosseum', 'b:zufriedenheit=1'], 'Ein zufriedenes Volk ist ein ruhiges Volk.'],
  // Spalte 9
  ['torsion', 'Torsionsgeschütze', 'militaer', 9, ['mathematik', 'ingenieurskunst'], ['e:ballista'], 'Gedrehte Seile speichern die Kraft für gewaltige Pfeile.'],
  ['erzguss', 'Erzguss', 'industrie', 9, ['seehandel', 'handwerk'], ['w:koloss'], 'Riesige Bronzefiguren entstehen in Gussformen aus Lehm.'],
  ['heilkunst', 'Heilkunst', 'wissen', 9, ['kraeuterkunde', 'ingenieurskunst'], ['g:badehaus', 'b:heilung_prozent=10'], 'Ärzte lernen, wie der Körper funktioniert.'],
  ['mehrruderer', 'Mehrruderer', 'see', 9, ['seehandel', 'mathematik'], ['e:quinquereme'], 'Fünf Ruderer an jedem Riemen und Geschütze an Deck.'],
  ['rhetorik', 'Rhetorik', 'staat', 9, ['literatur', 'diplomatie'], ['o:karten_tausch', 'b:kultur_prozent=3'], 'Wer gut redet, gewinnt Verbündete und Wissen.'],
  ['republik', 'Republik', 'staat', 9, ['diplomatie', 'literatur'], ['o:tribut', 'b:gold_prozent=3'], 'Bürger wählen ihre Vertreter und zahlen gern ihre Steuern.'],
  // Spalte 10
  ['kartografie', 'Kartografie', 'see', 10, ['mehrruderer', 'rhetorik'], ['b:tempo_see=5', 'b:sicht=1'], 'Karten zeigen Küsten, Strömungen und fremde Länder.'],
  ['heerwesen', 'Heerwesen', 'militaer', 10, ['legionsdrill', 'republik'], ['o:aufruesten', 'b:unterhalt_rabatt=5'], 'Ein stehendes Heer mit Sold, Ausrüstung und Ordnung.'],
  ['astronomie', 'Astronomie', 'wissen', 10, ['mathematik', 'philosophie'], ['b:wissenschaft_prozent=3'], 'Die Erde ist eine Kugel, und man kann sie vermessen.'],
  ['stadtplanung', 'Stadtplanung', 'staat', 10, ['ingenieurskunst', 'republik'], ['b:bauzeit_prozent=-5', 'b:zufriedenheit=1'], 'Gerade Straßen, Plätze und Kanäle ordnen die wachsende Stadt.'],

  // ======================= MITTELALTER (Spalten 11-16) =======================
  // Spalte 11
  ['feudalismus', 'Feudalismus', 'staat', 11, ['heerwesen', 'stadtplanung'], ['e:pikenier', 'b:produktion_prozent=2'], 'Land gegen Treue: Lehnsherren rufen ihre Bauern zu den Piken.'],
  ['theologie', 'Theologie', 'wissen', 11, ['polytheismus', 'rhetorik'], ['g:kathedrale', 'b:zufriedenheit=1'], 'Gelehrte Mönche schreiben über Glauben und Welt.'],
  ['bewaesserung', 'Bewässerung', 'wirtschaft', 11, ['ingenieurskunst', 'stadtplanung'], ['v:bewaesserte_farm', 'v:wassermuehle', 'b:nahrung_prozent=3'], 'Gräben und Wehre bringen Wasser auf jedes Feld.'],
  ['stahlschmieden', 'Stahlschmieden', 'militaer', 11, ['eisenverarbeitung', 'heerwesen'], ['e:langschwertkaempfer'], 'Gefaltetes Eisen wird zu Stahl, hart und biegsam zugleich.'],
  ['kompass', 'Kompass', 'see', 11, ['kartografie'], ['e:kogge'], 'Eine Nadel zeigt nach Norden, auch wenn keine Sterne leuchten.'],
  ['handelsstrassen', 'Handelsstraßen', 'wirtschaft', 11, ['muenzwesen', 'stadtplanung'], ['e:handelstross', 'g:karawanserei', 'b:handel_gold_prozent=10'], 'Sichere Wege für Händler von Markt zu Markt.'],
  // Spalte 12
  ['ritterwesen', 'Ritterwesen', 'militaer', 12, ['feudalismus', 'stahlschmieden', 'elefantendressur'], ['e:ritter', 'g:gestuet'], 'Gepanzerte Reiter schwören einen Eid auf ihren Herrn.'],
  ['mechanik', 'Mechanik', 'industrie', 12, ['torsion', 'feudalismus'], ['e:armbrustschuetze', 'b:produktion_prozent=2'], 'Zahnräder, Kurbeln und Federn vervielfachen die Kraft.'],
  ['scholastik', 'Scholastik', 'wissen', 12, ['theologie', 'astronomie'], ['g:universitaet', 'b:wissenschaft_prozent=3'], 'An den ersten Universitäten streiten Gelehrte nach festen Regeln.'],
  ['viehwirtschaft', 'Viehwirtschaft', 'wirtschaft', 12, ['bewaesserung', 'tierzucht'], ['v:ranch', 'v:wildhege'], 'Große Herden auf eingezäunten Weiden.'],
  ['lagerwirtschaft', 'Lagerwirtschaft', 'wirtschaft', 12, ['handelsstrassen', 'bewaesserung'], ['g:speicherhaus', 'g:lagerhaus', 'b:lager=50'], 'Gesalzene Vorräte und volle Speicher für harte Winter.'],
  ['burgenbau', 'Burgenbau', 'militaer', 12, ['feudalismus', 'baukunst', 'feuerzeichen'], ['g:burgturm', 'v:festung', 'b:stadt_staerke=2'], 'Steinerne Burgen auf Hügeln beherrschen das Land.'],
  // Spalte 13
  ['belagerungskunst', 'Belagerungskunst', 'militaer', 13, ['mechanik', 'burgenbau'], ['e:trebuchet', 'o:pluendern'], 'Wer eine Burg nehmen will, braucht Geduld und schwere Geschütze.'],
  ['langbogen', 'Langbogen', 'militaer', 13, ['mechanik', 'berittene_schuetzen'], ['e:langbogenschuetze'], 'Ein mannshoher Eibenbogen schießt weiter als jeder andere.'],
  ['wundarznei', 'Wundarznei', 'wissen', 13, ['heilkunst', 'theologie'], ['g:heilhaus', 'e:feldscher', 'b:heilung_prozent=5'], 'Feldscher verbinden Wunden noch auf dem Schlachtfeld.'],
  ['gilden', 'Gilden', 'wirtschaft', 13, ['handelsstrassen', 'lagerwirtschaft'], ['v:handelshaus', 'b:produktion_prozent=3'], 'Handwerker und Kaufleute schließen sich zusammen.'],
  ['grubenbau', 'Grubenbau', 'industrie', 13, ['bergbau', 'mechanik'], ['v:tiefe_mine', 'v:grosser_steinbruch'], 'Tiefe Schächte, Pumpen und Haspeln holen mehr aus dem Berg.'],
  ['schauspiel', 'Schauspiel', 'wissen', 13, ['rhetorik', 'theologie', 'brot_und_spiele'], ['g:theater', 'b:kultur_prozent=3'], 'Gaukler und Schauspieler ziehen von Stadt zu Stadt.'],
  ['hafenwesen', 'Hafenwesen', 'see', 13, ['kompass', 'lagerwirtschaft'], ['g:hafen'], 'Kaimauern, Kräne und Zollhäuser für die Handelsflotte.'],
  // Spalte 14
  ['ruestkammern', 'Rüstkammern', 'militaer', 14, ['ritterwesen', 'gilden'], ['g:waffenkammer'], 'Plattenrüstungen und Waffen für jede Garnison.'],
  ['galeassenbau', 'Galeassenbau', 'see', 14, ['hafenwesen', 'belagerungskunst'], ['e:galeasse'], 'Ruder und Segel vereint, mit Geschützen an den Flanken.'],
  ['optik', 'Optik', 'wissen', 14, ['scholastik', 'kompass'], ['g:sternwarte', 'v:bergobservatorium', 'v:beobachtungsposten'], 'Geschliffene Linsen holen Fernes ganz nah heran.'],
  ['ritterlichkeit', 'Ritterlichkeit', 'staat', 14, ['ritterwesen', 'theologie'], ['o:buendnis', 'b:zufriedenheit=1'], 'Ehrenwort und Treue binden Herrscher aneinander.'],
  ['landvermessung', 'Landvermessung', 'staat', 14, ['kompass', 'ritterwesen'], ['e:kundschafter', 'b:grenzwachstum_prozent=10'], 'Messketten und Karten legen jede Grenze fest.'],
  ['muehlenbau', 'Mühlenbau', 'industrie', 14, ['bewaesserung', 'gilden'], ['g:muehle', 'b:nahrung_prozent=3'], 'Wasser und Wind treiben Mühlsteine an.'],
  // Spalte 15
  ['wallanlagen', 'Wallanlagen', 'militaer', 15, ['burgenbau', 'ruestkammern'], ['w:grosse_mauer', 'b:stadt_hp=25'], 'Ein Wall über Berge und Täler schützt das ganze Reich.'],
  ['pflasterung', 'Pflasterung', 'staat', 15, ['handelsstrassen', 'gilden'], ['v:pflasterstrasse', 'b:tempo_land=3'], 'Gepflasterte Straßen trotzen Regen und Schlamm.'],
  ['erfindungen', 'Erfindungen', 'industrie', 15, ['muehlenbau', 'optik'], ['v:saegewerk', 'b:produktion_prozent=2'], 'Tüftler bauen Maschinen, die vorher niemand kannte.'],
  ['gesandtschaften', 'Gesandtschaften', 'staat', 15, ['ritterlichkeit', 'diplomatie'], ['o:stadtstaat_buendnis', 'b:handelsrouten=1'], 'Ständige Botschafter an fremden Höfen.'],
  ['bildungswesen', 'Bildungswesen', 'wissen', 15, ['scholastik', 'optik'], ['b:wissenschaft_prozent=3', 'b:kultur_prozent=2'], 'Domschulen und Lateinschulen bilden die Klügsten aus.'],
  // Spalte 16
  ['alchemie', 'Alchemie', 'wissen', 16, ['wundarznei', 'bildungswesen'], ['b:heilung_prozent=5', 'b:wissenschaft_prozent=2'], 'Alchemisten suchen Gold und finden die Grundlagen der Chemie.'],
  ['metallguss', 'Metallguss', 'industrie', 16, ['erfindungen', 'ruestkammern', 'erzguss'], ['b:produktion_prozent=3'], 'Glocken und Rohre aus gegossenem Metall.'],
  ['schiffbau', 'Schiffbau', 'see', 16, ['galeassenbau', 'landvermessung'], ['b:tempo_see=5'], 'Kiel, Spanten und Planken: Schiffe werden größer und stabiler.'],

  // ======================= RENAISSANCE (Spalten 17-22) =======================
  // Spalte 17
  ['schiesspulver', 'Schießpulver', 'militaer', 17, ['metallguss', 'alchemie'], ['r:salpeter', 'e:arkebusier'], 'Salpeter, Schwefel und Kohle: Ein Funke verändert jede Schlacht.'],
  ['bankwesen', 'Bankwesen', 'wirtschaft', 17, ['gilden', 'bildungswesen'], ['g:bank', 'b:gold_prozent=3'], 'Wechselbriefe und Kredite lassen Geld arbeiten.'],
  ['takelage', 'Takelage', 'see', 17, ['schiffbau'], ['e:karavelle'], 'Mehrere Masten und dreieckige Segel kreuzen gegen den Wind.'],
  ['buchdruck', 'Buchdruck', 'wissen', 17, ['bildungswesen', 'erfindungen'], ['b:wissenschaft_prozent=3', 'b:kultur_prozent=3'], 'Bewegliche Lettern bringen Bücher in jedes Haus.'],
  ['humanismus', 'Humanismus', 'wissen', 17, ['bildungswesen', 'schauspiel'], ['g:akademie'], 'Der Mensch steht im Mittelpunkt von Kunst und Wissen.'],
  ['soeldnerwesen', 'Söldnerwesen', 'militaer', 17, ['metallguss', 'ruestkammern'], ['e:landsknecht'], 'Für guten Sold kämpfen Landsknechte für jeden Herrn.'],
  // Spalte 18
  ['musketen', 'Musketen', 'militaer', 18, ['schiesspulver', 'langbogen'], ['e:musketier'], 'Jeder Soldat trägt nun eine Feuerwaffe.'],
  ['seekriegskunst', 'Seekriegskunst', 'see', 18, ['takelage', 'schiesspulver'], ['e:fregatte'], 'Kanonen an Bord und eine schnelle Takelage: die Fregatte.'],
  ['physik', 'Physik', 'wissen', 18, ['humanismus', 'metallguss'], ['b:wissenschaft_prozent=2', 'b:produktion_prozent=2'], 'Fallende Äpfel und rollende Kugeln folgen denselben Gesetzen.'],
  ['maezenatentum', 'Mäzenatentum', 'staat', 18, ['humanismus', 'bankwesen'], ['g:opernhaus', 'b:kultur_prozent=3'], 'Reiche Familien fördern Maler, Musiker und Baumeister.'],
  ['kanalbau', 'Kanalbau', 'industrie', 18, ['pflasterung', 'bankwesen'], ['v:kanal'], 'Schleusen und Gräben verbinden Flüsse und Meere.'],
  ['plantagenwirtschaft', 'Plantagenwirtschaft', 'wirtschaft', 18, ['bankwesen', 'viehwirtschaft'], ['v:grossplantage', 'b:gold_prozent=2'], 'Weite Felder voller Zucker, Tee und Baumwolle.'],
  // Spalte 19
  ['ballistik', 'Ballistik', 'militaer', 19, ['schiesspulver', 'physik'], ['e:kanone'], 'Die Flugbahn jeder Kugel lässt sich berechnen.'],
  ['kuerassiere', 'Kürassiere', 'militaer', 19, ['ritterwesen', 'musketen'], ['e:kuerassier'], 'Brustpanzer und Pistolen für die schwere Reiterei.'],
  ['hochseeschifffahrt', 'Hochseeschifffahrt', 'see', 19, ['takelage', 'physik'], ['o:tiefsee_einschiffen', 'b:tempo_see=5'], 'Wochenlang ohne Land in Sicht über den Ozean.'],
  ['merkantilismus', 'Merkantilismus', 'wirtschaft', 19, ['bankwesen', 'plantagenwirtschaft'], ['g:handelskompanie', 'b:handel_gold_prozent=10'], 'Mehr ausführen als einführen: Gold füllt die Schatzkammer.'],
  ['bastionen', 'Bastionen', 'militaer', 19, ['schiesspulver', 'wallanlagen'], ['g:festungsmauer', 'b:stadt_staerke=3'], 'Sternförmige Festungen halten auch Kanonen stand.'],
  ['manufakturwesen', 'Manufakturwesen', 'industrie', 19, ['bankwesen', 'physik'], ['g:manufaktur'], 'Arbeitsteilung macht Werkstätten zu Manufakturen.'],
  // Spalte 20
  ['entdeckungsreisen', 'Entdeckungsreisen', 'see', 20, ['hochseeschifffahrt'], ['e:entdecker', 'b:sicht=1'], 'Neue Welten warten hinter dem Horizont.'],
  ['galeonen', 'Galeonen', 'see', 20, ['seekriegskunst', 'merkantilismus'], ['e:galeone'], 'Schwer bewaffnete Segler schützen die Schatzflotten.'],
  ['pulverherstellung', 'Pulverherstellung', 'militaer', 20, ['ballistik'], ['g:pulvermuehle', 'b:erfahrung_prozent=5'], 'Pulvermühlen liefern Nachschub für jede Kanone.'],
  ['gartenkunst', 'Gartenkunst', 'staat', 20, ['maezenatentum', 'plantagenwirtschaft'], ['g:schlossgarten', 'b:zufriedenheit=1'], 'Hecken, Brunnen und Alleen nach strengem Plan.'],
  ['windmuehlen', 'Windmühlen', 'industrie', 20, ['muehlenbau', 'physik'], ['v:windrad_farm', 'b:nahrung_prozent=3'], 'Mühlen auf jedem Hof mahlen das Korn direkt am Feld.'],
  ['gelehrtenaustausch', 'Gelehrtenaustausch', 'wissen', 20, ['buchdruck', 'gesandtschaften'], ['o:forschungsabkommen'], 'Briefe zwischen Gelehrten überwinden jede Grenze.'],
  // Spalte 21
  ['architektur', 'Architektur', 'industrie', 21, ['gartenkunst', 'bastionen'], ['w:taj_mahal', 'b:bauzeit_prozent=-5'], 'Kuppeln und Säulen nach den Regeln der Harmonie.'],
  ['werftindustrie', 'Werftindustrie', 'see', 21, ['galeonen', 'manufakturwesen'], ['g:trockendock'], 'Große Trockendocks bauen Schiffe wie am Fließband.'],
  ['wissenschaftliche_methode', 'Wissenschaftliche Methode', 'wissen', 21, ['physik', 'gelehrtenaustausch'], ['b:wissenschaft_prozent=3'], 'Beobachten, vermuten, prüfen: Wissen wird überprüfbar.'],
  ['buerokratie', 'Bürokratie', 'staat', 21, ['merkantilismus', 'manufakturwesen'], ['o:bauplatz_2'], 'Beamte und Formulare: Mehrere Bauvorhaben laufen gleichzeitig.'],
  ['linientaktik', 'Linientaktik', 'militaer', 21, ['musketen', 'ballistik', 'soeldnerwesen'], ['b:erfahrung_prozent=5', 'b:stadt_staerke=2'], 'Salve um Salve in geschlossener Reihe.'],
  // Spalte 22
  ['aufklaerung', 'Aufklärung', 'wissen', 22, ['wissenschaftliche_methode', 'architektur'], ['b:kultur_prozent=3', 'b:zufriedenheit=1'], 'Habe Mut, dich deines eigenen Verstandes zu bedienen!'],
  ['chronometer', 'Chronometer', 'see', 22, ['werftindustrie', 'wissenschaftliche_methode', 'entdeckungsreisen'], ['b:tempo_see=5'], 'Eine genaue Uhr verrät auf See den Längengrad.'],
  ['volkswirtschaft', 'Volkswirtschaft', 'wirtschaft', 22, ['buerokratie', 'windmuehlen'], ['b:gold_prozent=3'], 'Angebot und Nachfrage lenken den Markt.'],
  ['militaerwissenschaft', 'Militärwissenschaft', 'militaer', 22, ['linientaktik', 'pulverherstellung'], ['b:erfahrung_prozent=5'], 'Krieg wird zur Wissenschaft mit Karten und Plänen.'],

  // ======================= INDUSTRIE (Spalten 23-29) =======================
  // Spalte 23
  ['dampfmaschine', 'Dampfmaschine', 'industrie', 23, ['wissenschaftliche_methode', 'manufakturwesen'], ['b:produktion_prozent=3'], 'Feuer, Wasser und Kolben: Die Industrie erwacht.'],
  ['kohleabbau', 'Kohleabbau', 'industrie', 23, ['grubenbau', 'wissenschaftliche_methode'], ['r:kohle'], 'Schwarzes Gold aus der Tiefe treibt die neuen Maschinen.'],
  ['gezogene_laeufe', 'Gezogene Läufe', 'militaer', 23, ['militaerwissenschaft', 'linientaktik'], ['e:gewehrschuetze'], 'Rillen im Lauf lassen die Kugel weit und genau fliegen.'],
  ['aktiengesellschaften', 'Aktiengesellschaften', 'wirtschaft', 23, ['volkswirtschaft'], ['g:boerse', 'b:gold_prozent=3'], 'Viele Anteilseigner teilen Gewinn und Risiko.'],
  ['bildungsreform', 'Bildungsreform', 'wissen', 23, ['aufklaerung'], ['g:schule', 'b:wissenschaft_prozent=2'], 'Schulpflicht für alle Kinder.'],
  ['kavallerietaktik', 'Kavallerietaktik', 'militaer', 23, ['kuerassiere', 'militaerwissenschaft'], ['e:kavallerie'], 'Schnelle Reiterei für Aufklärung und Verfolgung.'],
  // Spalte 24
  ['industrialisierung', 'Industrialisierung', 'industrie', 24, ['dampfmaschine', 'kohleabbau'], ['g:fabrik', 'b:produktion_prozent=3'], 'Schornsteine wachsen in den Himmel.'],
  ['eisenbahnbau', 'Eisenbahnbau', 'industrie', 24, ['dampfmaschine', 'kanalbau'], ['v:eisenbahn', 'g:bahnhof'], 'Die Dampflok verbindet Städte in Stunden statt Tagen.'],
  ['dampfschifffahrt', 'Dampfschifffahrt', 'see', 24, ['dampfmaschine', 'chronometer'], ['e:transportschiff', 'b:tempo_see=5'], 'Schaufelräder und Schrauben machen Schiffe unabhängig vom Wind.'],
  ['feldartillerie', 'Feldartillerie', 'militaer', 24, ['gezogene_laeufe'], ['e:feldgeschuetz'], 'Leichte Geschütze begleiten die Infanterie.'],
  ['anatomie', 'Anatomie', 'wissen', 24, ['aufklaerung', 'alchemie'], ['e:sanitaeter', 'b:heilung_prozent=10'], 'Ärzte verstehen endlich, was im Körper geschieht.'],
  ['archaeologie', 'Archäologie', 'wissen', 24, ['bildungsreform'], ['g:museum', 'b:kultur_prozent=3'], 'Ausgrabungen bringen vergessene Schätze ans Licht.'],
  // Spalte 25
  ['stahlerzeugung', 'Stahlerzeugung', 'industrie', 25, ['industrialisierung'], ['g:stahlwerk', 'v:industriemine'], 'Hochöfen erzeugen Stahl in riesigen Mengen.'],
  ['panzerschiffe', 'Panzerschiffe', 'see', 25, ['dampfschifffahrt', 'industrialisierung'], ['e:panzerschiff'], 'Eiserne Schiffe lassen Kanonenkugeln abprallen.'],
  ['seemacht', 'Seemacht', 'see', 25, ['chronometer', 'feldartillerie'], ['e:linienschiff'], 'Wer die Meere beherrscht, beherrscht den Handel.'],
  ['hygiene', 'Hygiene', 'wissen', 25, ['anatomie'], ['g:krankenhaus', 'b:heilung_prozent=10'], 'Sauberes Wasser und Seife retten mehr Leben als jede Arznei.'],
  ['naturkunde', 'Naturkunde', 'wissen', 25, ['archaeologie'], ['g:zoo', 'b:nahrung_prozent=3'], 'Forscher sammeln Tiere und Pflanzen aus aller Welt.'],
  ['elektrizitaet', 'Elektrizität', 'wissen', 25, ['dampfmaschine', 'bildungsreform'], ['r:aluminium', 'b:wissenschaft_prozent=3'], 'Ein Funke in der Leitung bringt Licht und Kraft.'],
  ['generalstab', 'Generalstab', 'militaer', 25, ['kavallerietaktik', 'feldartillerie'], ['g:militaerakademie', 'b:erfahrung_prozent=5'], 'Offiziere planen Feldzüge am Kartentisch.'],
  // Spalte 26
  ['glas_und_eisenbau', 'Glas- und Eisenbau', 'industrie', 26, ['stahlerzeugung', 'naturkunde'], ['w:kristallpalast'], 'Hallen aus Glas und Stahl, hell wie ein Kristall.'],
  ['dampfhaefen', 'Dampfhäfen', 'see', 26, ['panzerschiffe', 'eisenbahnbau'], ['g:grosshafen', 'b:handel_gold_prozent=10'], 'Dampfkräne und Gleise bis an die Kaimauer.'],
  ['dynamit', 'Dynamit', 'militaer', 26, ['stahlerzeugung', 'feldartillerie'], ['e:artillerie'], 'Sprengstoff für Bergbau und Schlachtfeld.'],
  ['elektrifizierung', 'Elektrifizierung', 'industrie', 26, ['elektrizitaet', 'stahlerzeugung'], ['g:kraftwerk', 'b:produktion_prozent=3'], 'Kraftwerke bringen Strom in jede Fabrik.'],
  ['logistik', 'Logistik', 'staat', 26, ['eisenbahnbau', 'generalstab'], ['g:depot', 'e:ingenieur', 'b:arbeiter_tempo=15'], 'Nachschub per Bahn: Truppen und Material genau zur rechten Zeit.'],
  ['erdoelfoerderung', 'Erdölförderung', 'industrie', 26, ['industrialisierung', 'naturkunde'], ['r:oel', 'v:bohrturm'], 'Aus der Tiefe sprudelt der Treibstoff der Zukunft.'],
  // Spalte 27
  ['telegrafie', 'Telegrafie', 'wissen', 27, ['elektrizitaet'], ['b:wissenschaft_prozent=2', 'b:handel_gold_prozent=10'], 'Nachrichten rasen in Sekunden über Draht.'],
  ['verbrennungsmotor', 'Verbrennungsmotor', 'industrie', 27, ['erdoelfoerderung', 'stahlerzeugung'], ['b:tempo_land=5'], 'Benzin und Zündkerze ersetzen Dampf und Kohle.'],
  ['unterseeboote', 'Unterseeboote', 'see', 27, ['panzerschiffe', 'elektrifizierung'], ['e:tauchboot'], 'Ein Schiff, das unter Wasser fahren kann.'],
  ['fischereiwesen', 'Fischereiwesen', 'see', 27, ['dampfhaefen'], ['v:fangflotte', 'b:nahrung_prozent=3'], 'Dampfkutter mit Kühlräumen fahren weit hinaus.'],
  ['sozialreform', 'Sozialreform', 'staat', 27, ['hygiene', 'logistik'], ['b:zufriedenheit=1', 'b:unterhalt_rabatt=5'], 'Arbeitsschutz und Versicherung für die Arbeiter.'],
  // Spalte 28
  ['motorflug', 'Motorflug', 'luft', 28, ['verbrennungsmotor', 'elektrizitaet'], ['e:doppeldecker', 'g:flugfeld'], 'Der alte Traum vom Fliegen wird wahr.'],
  ['landpanzer', 'Landpanzer', 'militaer', 28, ['verbrennungsmotor', 'dynamit'], ['e:leichter_panzer'], 'Ein stählerner Kasten auf Ketten überrollt jeden Graben.'],
  ['funktechnik', 'Funktechnik', 'wissen', 28, ['telegrafie'], ['b:kultur_prozent=3', 'b:sicht=1'], 'Nachrichten fliegen ohne Draht durch die Luft.'],
  ['weltmarkt', 'Weltmarkt', 'wirtschaft', 28, ['telegrafie', 'aktiengesellschaften'], ['b:handelsrouten=1', 'b:gold_prozent=2'], 'Waren aus aller Welt in jedem Laden.'],
  // Spalte 29
  ['flugabwehr', 'Flugabwehr', 'militaer', 29, ['motorflug'], ['e:flak'], 'Kanonen, die steil in den Himmel schießen.'],
  ['chemie', 'Chemie', 'industrie', 29, ['erdoelfoerderung', 'naturkunde'], ['b:nahrung_prozent=5', 'b:produktion_prozent=2'], 'Kunstdünger und neue Stoffe aus dem Labor.'],

  // ======================= MODERNE (Spalten 30-36) =======================
  // Spalte 30
  ['massenproduktion', 'Massenproduktion', 'industrie', 30, ['chemie', 'verbrennungsmotor'], ['b:produktion_prozent=5'], 'Das Fließband baut tausend Dinge am Tag.'],
  ['wehrpflicht', 'Wehrpflicht', 'militaer', 30, ['generalstab', 'sozialreform'], ['e:infanterie'], 'Jeder Bürger dient eine Zeit lang im Heer.'],
  ['rundfunk', 'Rundfunk', 'wissen', 30, ['funktechnik'], ['g:rundfunkhaus', 'b:kultur_prozent=3'], 'Musik und Nachrichten kommen aus einem Kasten im Wohnzimmer.'],
  ['kaeltetechnik', 'Kältetechnik', 'wirtschaft', 30, ['chemie', 'elektrifizierung', 'fischereiwesen'], ['g:kuehlhaus'], 'Kühlschränke halten Essen wochenlang frisch.'],
  ['maschinengewehre', 'Maschinengewehre', 'militaer', 30, ['flugabwehr', 'dynamit'], ['e:maschinengewehr'], 'Hunderte Schuss in der Minute verändern den Krieg.'],
  ['militaerluftfahrt', 'Militärluftfahrt', 'luft', 30, ['motorflug', 'flugabwehr'], ['e:jagdflugzeug'], 'Schnelle Eindecker kämpfen um die Herrschaft am Himmel.'],
  // Spalte 31
  ['panzerbau', 'Panzerbau', 'militaer', 31, ['massenproduktion', 'landpanzer'], ['e:panzer'], 'Schnelle Panzer in großer Zahl vom Fließband.'],
  ['oelraffination', 'Ölraffination', 'industrie', 31, ['massenproduktion', 'erdoelfoerderung'], ['g:raffinerie', 'v:foerderanlage', 'v:oelplattform'], 'Aus Rohöl werden Benzin, Diesel und Kunststoffe.'],
  ['turbinenantrieb', 'Turbinenantrieb', 'see', 31, ['massenproduktion', 'panzerschiffe'], ['e:zerstoerer', 'b:tempo_see=5'], 'Dampfturbinen machen Kriegsschiffe pfeilschnell.'],
  ['bombenflugzeuge', 'Bombenflugzeuge', 'luft', 31, ['militaerluftfahrt'], ['e:bomber'], 'Große Flugzeuge tragen tonnenweise Bomben.'],
  ['elektronik', 'Elektronik', 'wissen', 31, ['rundfunk', 'elektrifizierung'], ['b:wissenschaft_prozent=3'], 'Röhren und Schaltkreise steuern Geräte aller Art.'],
  ['motorisierung', 'Motorisierung', 'wirtschaft', 31, ['massenproduktion', 'weltmarkt'], ['e:lastwagenkonvoi', 'b:arbeiter_tempo=15'], 'Lastwagen und Traktoren ersetzen Pferd und Wagen.'],
  // Spalte 32
  ['luftlandetruppen', 'Luftlandetruppen', 'luft', 32, ['militaerluftfahrt', 'wehrpflicht'], ['e:fallschirmjaeger', 'o:luftlandung'], 'Soldaten springen mit Fallschirmen hinter die Front.'],
  ['seeartillerie', 'Seeartillerie', 'see', 32, ['turbinenantrieb', 'seemacht'], ['e:kreuzer', 'e:schlachtschiff'], 'Riesige Geschütztürme auf stählernen Kolossen.'],
  ['unterwasserkrieg', 'Unterwasserkrieg', 'see', 32, ['turbinenantrieb', 'unterseeboote'], ['e:u_boot'], 'Rudel von U-Booten lauern in der Tiefe.'],
  ['antibiotika', 'Antibiotika', 'wissen', 32, ['chemie', 'wehrpflicht'], ['e:feldlazarett', 'b:heilung_prozent=10'], 'Ein Schimmelpilz besiegt tödliche Krankheiten.'],
  ['radar', 'Radar', 'wissen', 32, ['elektronik'], ['v:radarstation', 'e:fernaufklaerer'], 'Funkwellen entdecken Flugzeuge und Schiffe weit hinter dem Horizont.'],
  ['sturzflug', 'Sturzflug', 'luft', 32, ['bombenflugzeuge'], ['e:sturzkampfbomber'], 'Im steilen Sturz trifft die Bombe genau ins Ziel.'],
  ['massensport', 'Massensport', 'staat', 32, ['rundfunk', 'motorisierung'], ['g:stadion', 'b:zufriedenheit=1'], 'Ganze Städte fiebern mit ihrer Mannschaft.'],
  // Spalte 33
  ['marineflieger', 'Marineflieger', 'see', 33, ['seeartillerie', 'bombenflugzeuge'], ['e:flugzeugtraeger'], 'Flugzeuge starten und landen auf schwimmenden Pisten.'],
  ['panzerabwehr', 'Panzerabwehr', 'militaer', 33, ['panzerbau'], ['e:panzerabwehrtrupp'], 'Hohlladungen durchschlagen jede Panzerung.'],
  ['schwere_artillerie', 'Schwere Artillerie', 'militaer', 33, ['maschinengewehre', 'oelraffination'], ['e:haubitze'], 'Steilfeuergeschütze treffen Ziele hinter Hügeln und Mauern.'],
  ['luftverteidigung', 'Luftverteidigung', 'militaer', 33, ['radar', 'panzerbau'], ['g:flakstellung', 'e:flakpanzer'], 'Radar und Flak schützen Städte und Truppen vor Bombern.'],
  ['autobahnbau', 'Autobahnbau', 'staat', 33, ['motorisierung', 'oelraffination'], ['v:autobahn', 'g:u_bahn'], 'Breite Straßen und Tunnel für den Verkehr der Zukunft.'],
  ['konsumgesellschaft', 'Konsumgesellschaft', 'wirtschaft', 33, ['motorisierung', 'massensport'], ['g:einkaufszentrum', 'e:frachter', 'b:gold_prozent=3'], 'Volle Regale und Werbung an jeder Ecke.'],
  ['forschungsinstitute', 'Forschungsinstitute', 'wissen', 33, ['elektronik', 'antibiotika'], ['g:forschungslabor', 'b:wissenschaft_prozent=3'], 'Teams von Forschern arbeiten an großen Fragen.'],
  // Spalte 34
  ['schwere_panzer', 'Schwere Panzer', 'militaer', 34, ['panzerabwehr', 'panzerbau'], ['e:schwerer_panzer'], 'Dickere Panzerung und ein größeres Geschütz.'],
  ['zivilluftfahrt', 'Zivilluftfahrt', 'luft', 34, ['konsumgesellschaft', 'militaerluftfahrt'], ['g:flughafen', 'b:handel_gold_prozent=10'], 'Passagierflugzeuge verbinden die Kontinente.'],
  ['stahlbeton', 'Stahlbeton', 'industrie', 34, ['luftverteidigung', 'glas_und_eisenbau'], ['g:betonbunker', 'v:bunkeranlage', 'b:stadt_hp=50'], 'Beton mit Stahlgeflecht hält fast allem stand.'],
  ['staudammbau', 'Staudammbau', 'industrie', 34, ['autobahnbau', 'elektronik'], ['v:wasserkraftwerk', 'b:produktion_prozent=3'], 'Gewaltige Mauern stauen Flüsse zu Seen voller Energie.'],
  ['landtechnik', 'Landtechnik', 'wirtschaft', 34, ['kaeltetechnik', 'konsumgesellschaft'], ['v:mechanisierte_farm', 'v:aquakultur', 'b:nahrung_prozent=5'], 'Mähdrescher und Fischfarmen ernähren Millionen.'],
  ['tourismus', 'Tourismus', 'wirtschaft', 34, ['konsumgesellschaft', 'autobahnbau'], ['v:ferienanlage', 'b:kultur_prozent=3'], 'Reisende aus aller Welt bestaunen deine Wunder.'],
  // Spalte 35
  ['rotorflug', 'Rotorflug', 'luft', 35, ['zivilluftfahrt', 'schwere_panzer', 'sturzflug'], ['e:kampfhubschrauber'], 'Ein Fluggerät, das in der Luft stehen bleiben kann.'],
  ['raketentechnik', 'Raketentechnik', 'raumfahrt', 35, ['schwere_artillerie', 'forschungsinstitute'], ['e:marschflugkoerper'], 'Raketentriebwerke tragen Sprengköpfe weit ins Feindesland.'],
  ['buergerrechte', 'Bürgerrechte', 'staat', 35, ['tourismus', 'massensport'], ['w:freiheitsstatue', 'b:zufriedenheit=1'], 'Gleiche Rechte für alle Bürger.'],
  // Spalte 36
  ['windkraft', 'Windkraft', 'industrie', 36, ['staudammbau'], ['v:windpark'], 'Riesige Windräder ernten die Kraft des Windes.'],
  ['globalisierung', 'Globalisierung', 'wirtschaft', 36, ['tourismus', 'zivilluftfahrt'], ['b:handelsrouten=1', 'b:handel_gold_prozent=10'], 'Die ganze Welt wird zu einem einzigen Markt.'],
  ['kernphysik', 'Kernphysik', 'raumfahrt', 36, ['forschungsinstitute', 'raketentechnik'], ['b:wissenschaft_prozent=3'], 'Im Inneren des Atoms schlummert ungeheure Kraft.'],
  ['fliessbandfertigung', 'Fließbandautomatik', 'industrie', 36, ['massenproduktion', 'stahlbeton'], ['o:bauplatz_3'], 'Automatische Fertigungsstraßen erlauben einen dritten Bauauftrag je Stadt.'],

  // ======================= ATOMZEIT (Spalten 37-43) =======================
  // Spalte 37
  ['atomtheorie', 'Atomtheorie', 'raumfahrt', 37, ['kernphysik'], ['r:uran'], 'Uran ist der Schlüssel zur Kraft des Atoms.'],
  ['computer', 'Computer', 'wissen', 37, ['forschungsinstitute', 'elektronik'], ['g:rechenzentrum', 'b:wissenschaft_prozent=5'], 'Rechenmaschinen lösen in Sekunden, wofür Menschen Jahre brauchten.'],
  ['duesentriebwerk', 'Düsentriebwerk', 'luft', 37, ['zivilluftfahrt', 'raketentechnik'], ['e:duesenjaeger'], 'Schneller als der Schall: Düsen ersetzen Propeller.'],
  ['kunststoffe', 'Kunststoffe', 'industrie', 37, ['oelraffination', 'kernphysik'], ['b:produktion_prozent=3'], 'Leicht, billig und in jeder Form: Plastik verändert alles.'],
  ['infanterietaktik', 'Moderne Infanterietaktik', 'militaer', 37, ['panzerabwehr', 'fliessbandfertigung', 'luftlandetruppen'], ['e:moderne_infanterie'], 'Funk, Nachtsicht und Schutzwesten für jeden Soldaten.'],
  ['massenmedien', 'Massenmedien', 'staat', 37, ['buergerrechte', 'rundfunk'], ['g:medienzentrum', 'b:kultur_prozent=3'], 'Fernsehen bringt die Welt in jedes Wohnzimmer.'],
  // Spalte 38
  ['kernspaltung', 'Kernspaltung', 'raumfahrt', 38, ['atomtheorie'], ['g:kernkraftwerk'], 'Gespaltene Atome liefern Energie für ganze Länder.'],
  ['satelliten', 'Satelliten', 'raumfahrt', 38, ['raketentechnik', 'computer'], ['b:sicht=1'], 'Augen im Orbit sehen jeden Winkel der Erde.'],
  ['lenkwaffen', 'Lenkwaffen', 'militaer', 38, ['raketentechnik', 'computer'], ['e:raketenwerfer', 'e:moderne_panzerabwehr'], 'Raketen, die ihr Ziel selbst finden.'],
  ['mechanisierte_infanterie', 'Mechanisierte Infanterie', 'militaer', 38, ['infanterietaktik', 'kunststoffe'], ['e:panzergrenadier'], 'Soldaten fahren im Schützenpanzer in die Schlacht.'],
  ['moderne_medizin', 'Moderne Medizin', 'wissen', 38, ['antibiotika', 'computer'], ['g:klinikum', 'b:heilung_prozent=10'], 'Operationen, die früher Wunder gewesen wären.'],
  ['containerlogistik', 'Containerlogistik', 'wirtschaft', 38, ['globalisierung', 'kunststoffe'], ['g:containerhafen', 'e:landungsschiff'], 'Genormte Stahlkisten machen den Welthandel billig und schnell.'],
  // Spalte 39
  ['atomantrieb', 'Atomantrieb', 'see', 39, ['kernspaltung', 'containerlogistik', 'unterwasserkrieg'], ['e:atom_u_boot', 'e:supertraeger'], 'Ein Reaktor an Bord: Schiffe fahren jahrelang ohne Tanken.'],
  ['verbundpanzerung', 'Verbundpanzerung', 'militaer', 39, ['mechanisierte_infanterie', 'schwere_panzer', 'rotorflug'], ['e:moderner_kampfpanzer'], 'Schichten aus Stahl, Keramik und Kunststoff.'],
  ['mehrfachraketenwerfer', 'Mehrfachraketenwerfer', 'militaer', 39, ['lenkwaffen'], ['e:raketenartillerie'], 'Dutzende Raketen in einer einzigen Salve.'],
  ['boden_luft_raketen', 'Boden-Luft-Raketen', 'militaer', 39, ['lenkwaffen', 'satelliten'], ['e:flugabwehrraketen'], 'Radargelenkte Raketen holen jedes Flugzeug herunter.'],
  ['raumfahrt', 'Raumfahrt', 'raumfahrt', 39, ['satelliten'], ['g:raumfahrtzentrum', 'b:wissenschaft_prozent=3'], 'Menschen fliegen ins All und blicken auf die Erde zurück.'],
  ['solartechnik', 'Solartechnik', 'industrie', 39, ['kunststoffe', 'satelliten', 'windkraft'], ['g:solarkraftwerk', 'v:solarpark'], 'Siliziumzellen verwandeln Sonnenlicht in Strom.'],
  // Spalte 40
  ['robotik', 'Robotik', 'industrie', 40, ['computer', 'solartechnik'], ['g:robotfabrik', 'b:produktion_prozent=3'], 'Maschinen, die andere Maschinen bauen.'],
  ['marinelenkwaffen', 'Marinelenkwaffen', 'see', 40, ['lenkwaffen', 'atomantrieb', 'marineflieger'], ['e:lenkwaffenzerstoerer', 'e:raketenkreuzer'], 'Schiffe mit Raketensilos statt Geschütztürmen.'],
  ['tarnkappentechnik', 'Tarnkappentechnik', 'luft', 40, ['duesentriebwerk', 'satelliten'], ['e:tarnkappenbomber'], 'Flugzeuge, die das Radar nicht sehen kann.'],
  ['orbitalforschung', 'Orbitalforschung', 'raumfahrt', 40, ['raumfahrt'], ['w:internationale_raumstation'], 'Ein Labor, das um die Erde kreist.'],
  ['vernetzung', 'Vernetzung', 'wissen', 40, ['computer', 'satelliten'], ['b:wissenschaft_prozent=5', 'b:gold_prozent=3'], 'Ein weltweites Netz verbindet alle Rechner.'],
  // Spalte 41
  ['fernlenkwaffen', 'Fernlenkwaffen', 'raumfahrt', 41, ['raumfahrt', 'mehrfachraketenwerfer'], ['g:raketenbasis', 'e:lenkrakete'], 'Raketen mit Reichweiten über ganze Kontinente.'],
  ['nanotechnologie', 'Nanotechnologie', 'industrie', 41, ['robotik'], ['b:produktion_prozent=5'], 'Werkzeuge, kleiner als eine Zelle.'],
  ['teilchenphysik', 'Teilchenphysik', 'raumfahrt', 41, ['orbitalforschung', 'kernspaltung'], ['b:wissenschaft_prozent=5'], 'Riesige Beschleuniger zerlegen Atome in ihre Bausteine.'],
  ['weltgemeinschaft', 'Weltgemeinschaft', 'staat', 41, ['vernetzung', 'massenmedien', 'moderne_medizin'], ['b:zufriedenheit=2', 'b:kultur_prozent=5'], 'Die Völker der Welt beraten gemeinsam ihre Zukunft.'],
  // Spalte 42
  ['kernwaffenforschung', 'Kernwaffenforschung', 'raumfahrt', 42, ['teilchenphysik', 'fernlenkwaffen'], ['b:stadt_hp=50', 'b:stadt_staerke=5'], 'Eine Waffe, deren bloße Existenz die Welt verändert.'],
  ['kuenstliche_intelligenz', 'Künstliche Intelligenz', 'wissen', 42, ['nanotechnologie', 'vernetzung'], ['b:wissenschaft_prozent=5'], 'Maschinen, die selbst lernen und denken.'],
  ['klimaforschung', 'Klimaforschung', 'wissen', 42, ['weltgemeinschaft', 'solartechnik', 'landtechnik'], ['b:nahrung_prozent=5', 'b:zufriedenheit=1'], 'Wer das Wetter versteht, schützt Ernten und Städte.'],
  // Spalte 43
  ['atomwaffen', 'Atomwaffen', 'raumfahrt', 43, ['kernwaffenforschung', 'fernlenkwaffen', 'tarnkappentechnik'], ['e:atomwaffe', 'o:atomschlag'], 'Die zerstörerischste Waffe der Geschichte. Möge sie nie eingesetzt werden.'],
  ['fusionsforschung', 'Fusionsforschung', 'raumfahrt', 43, ['kuenstliche_intelligenz', 'teilchenphysik'], ['b:produktion_prozent=5'], 'Eine kleine Sonne auf der Erde: fast unbegrenzte Energie.'],

  // ======================= ZUKUNFT (wiederholbar) =======================
  ['zukunft_wissen', 'Zukunftstechnologie: Wissen', 'wissen', 44, ['kuenstliche_intelligenz', 'fusionsforschung'], ['b:wissenschaft_prozent=2'], 'Jede Antwort wirft neue Fragen auf. Beliebig oft erforschbar.'],
  ['zukunft_wirtschaft', 'Zukunftstechnologie: Wirtschaft', 'wirtschaft', 44, ['kuenstliche_intelligenz', 'klimaforschung'], ['b:gold_prozent=2'], 'Neue Märkte und neue Ideen. Beliebig oft erforschbar.'],
  ['zukunft_industrie', 'Zukunftstechnologie: Industrie', 'industrie', 44, ['fusionsforschung', 'robotik'], ['b:produktion_prozent=2'], 'Noch schneller, noch effizienter. Beliebig oft erforschbar.'],
  ['zukunft_verteidigung', 'Zukunftstechnologie: Verteidigung', 'militaer', 44, ['verbundpanzerung', 'boden_luft_raketen', 'marinelenkwaffen'], ['b:stadt_staerke=1', 'b:erfahrung_prozent=2'], 'Schutzschilde für Städte und Truppen. Beliebig oft erforschbar.'],
  ['zukunft_kultur', 'Zukunftstechnologie: Kultur', 'staat', 44, ['klimaforschung', 'kuenstliche_intelligenz'], ['b:kultur_prozent=2', 'b:zufriedenheit=1'], 'Kunst und Gemeinschaft für eine friedliche Welt. Beliebig oft erforschbar.'],
];

const ART_KUERZEL = { e: 'einheit', g: 'gebaeude', w: 'wunder', v: 'verbesserung', r: 'rohstoff', o: 'option', b: 'bonus' };

function zeitalterVonSpalte(spalte) {
  let z = 0;
  for (let i = 0; i < SPALTEN_ZEITALTER.length; i++) if (spalte >= SPALTEN_ZEITALTER[i]) z = i;
  return z;
}

function freischaltung(eintrag) {
  const [kurz, rest] = eintrag.split(':');
  const art = ART_KUERZEL[kurz];
  if (art === 'bonus') {
    const [id, wert] = rest.split('=');
    return { art, id, wert: Number(wert) };
  }
  return { art, id: rest };
}

export const FORSCHUNGEN = ROH.map(([id, name, zweig, spalte, voraussetzungen, frei, beschreibung]) => {
  const f = {
    id,
    name,
    zeitalter: zeitalterVonSpalte(spalte),
    zweig,
    spalte,
    dauer: Math.round(DAUER_JE_SPALTE[spalte]),
    voraussetzungen,
    freischaltet: frei.map(freischaltung),
    beschreibung,
  };
  if (SCHLUESSEL.has(id)) f.schluessel = true;
  if (WIEDERHOLBAR.has(id)) f.wiederholbar = true;
  return f;
});
