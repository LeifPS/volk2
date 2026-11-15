# Entscheidungen

## Version 2 (volk2): Runden statt Echtzeit
Leifs Vorgabe: Civilization 1:1 als Pixelart-Spiel, wie ein Brettspiel (Boardgame-Arena-Gefühl), mit Menschen und/oder KI.
- **Partien statt einer Welt.** Eine Lobby (Durable Object `Lobby`) verwaltet Konten und Partien, jede Partie ist ein eigenes Durable Object (`Partie`). Host legt Einstellungen fest, andere treten per Namen bei.
- **Reihum ziehen.** Zugreihenfolge zufällig; nur wer dran ist, darf Befehle geben (Ausnahmen: Meldungen lesen, Tutorial, Ping, Einstellungen, Diplomatie-Antworten). Andere sehen nur „X ist am Zug“. KI zieht sofort.
- **Spielzeit steht im Zug still** und springt nach jeder Runde um `rundeMs`. Bauen, Forschen und Wachstum laufen dann ab. Bewegung nutzt Bewegungspunkte je Runde, ein Angriff beendet die Bewegung.
- **Spieltempo:** Episch 1 / Normal 2 / Schnell 4 / Blitz 8 Std Spielzeit je Runde. Begründung: der ganze Baum braucht ≈ 650 Std; bei 1 Std je Runde wäre der Wissenschaftssieg vor dem Rundenlimit 400 unerreichbar. Frühe Dinge (Krieger ≈ 3 Min) sind trotzdem in 1 Runde fertig; das ist gewollt: Antike geht flott, später wird es zäher.
- **Zugzeit-Konto** (Leifs Idee): 24 Std Start, +1 Std je beendetem Zug, höchstens 24; nur bei mehr als einem Menschen aktiv; alles einstellbar. Ablauf → Zug wird automatisch beendet. Konto 0 und nicht verbunden → übersprungen.
- **Abwesenheit:** Laufende Forschung, Bauaufträge und Märsche gehen weiter; neue Entscheidungen fallen aus. Nach `verpasstMax` (5) verpassten Zügen übernimmt die KI, der Mensch hat verloren.
- **Siege:** Eroberung (nur ein Volk aktiv übrig), Wissenschaft (als Erster „Fusionsforschung“), Punkte beim Rundenlimit. Host kann Siegarten abschalten.
- **KI-Stufen:** Leicht (langsamer, beginnt nie Krieg), Normal, Schwer (früher Krieg, größerer Angriffsradius, mehr Militär) und Boni I–III (zusätzlich Bau-/Forschungstempo, Gold, Kampfstärke). Im Langlauf haben alle KI-Völker den Baum bis zur Moderne in ≈ 100–350 Runden erforscht, je nach Stufe.
- **Neulingsschutz, Online/Offline-Regeln und Waffenruhe entfallen** (gelten nur für Echtzeit). Barbaren und Tiere bleiben.
- **Bekannte Schwäche:** KI-Völker erklären Menschen nur nach Provokation Krieg und erobern nie von sich aus (aus dem Echtzeit-Spiel übernommen). Ein aggressiverer Civ-KI-Charakter ist ein nächster Schritt.

Die folgenden Abschnitte stammen aus der Echtzeit-Fassung; Regeln zu Zeit, online/offline, Neulingsschutz und Marschtempo gelten in Version 2 nicht mehr.

Leitsatz: "Was macht das Spiel für ein paar Freunde und die Familie am besten spielbar?"

## Technik
- **Repo-Wurzel ist der Arbeitsordner `volk-start-paket/`** (dort liegen `referenz/` und `hub-werkzeuge/`).
- **Gemeinsamer Code liegt in `public/shared/`** statt in `shared/` an der Wurzel: Cloudflare liefert nur `public/` aus, und der Client muss dieselben Module laden. Der Worker importiert sie von dort (wrangler/esbuild bündelt sie). Kein Build-Schritt, keine Kopien.
- **Die Spiel-Engine liegt ebenfalls in `public/shared/engine/`**, damit der Demo-Modus (`?demo=1`) ohne Server die echte Engine im Browser laufen lassen kann. Geheimnisse enthält sie nicht; Konten und Admin liegen nur in `src/`.
- **Karte 192 × 120 Felder** (23 040): größer als der Vorschlag, aber schnell erzeugt (~90 ms). Querung für Antike-Infanterie etwa 8–16 Stunden (seit dem Tempo-Update).
- **Kartenerzeugung nur mit exakter Arithmetik** (keine `Math.sin/exp/pow`), damit Safari (iPad) und V8 bitgleich dieselbe Welt erzeugen. Der Karten-Hash wird mitgeschickt.
- **Gelände ist aus dem Seed berechenbar:** Weil Client und Server die Karte aus dem Seed erzeugen (Vorgabe), könnte ein technisch versierter Spieler das Gelände ausrechnen. Alles Dynamische (Einheiten, Städte, Besitz, Verbesserungen, Bewegungen) schickt der Server nur für erkundete bzw. sichtbare Felder. Für eine Familienrunde ausreichend.
- **Speicherung in "Eimern":** Städte (32 Eimer), Einheiten (32), Feldänderungen (64), je Volk eine Zeile, Nebel je Volk eine Zeile, Rest in einer Kern-Zeile. Beim Aufwachen werden ~150–250 Zeilen gelesen; pro Befehl werden meist 2–5 Zeilen geschrieben.
- **Ereignisse werden nicht gespeichert, sondern aus dem Zustand abgeleitet** (nächster Marschschritt, Bau fertig, Wachstum, Grenze, Forschung, KI-Denken ...). Der Alarm steht immer auf dem nächsten Ereignis.
- **PBKDF2 mit 100 000 Iterationen** (Höchstwert in Workers), SHA-256, 16 Byte Salz.
- **Git-Push** war in der Arbeitsumgebung nicht erlaubt; alle Commits sind lokal, Leif pusht von Hand.

## Spielregeln (wo der Auftrag Spielraum ließ)
- **Erträge pro Stunde:** Nahrung, Gold, Kultur und Baustoffe werden mit `ERTRAG_FAKTOR = 6` multipliziert (ein Civ-"Zug" entspricht 10 Minuten). Wissenschaft und Produktion sind Punkte: 1 Wissenschaft = +1 % Forschungstempo, 1 Produktion = +4 % Bautempo der Stadt.
- **Bauzeit wird beim Start festgelegt** (Produktion zum Startzeitpunkt), damit die angezeigte Fertigzeit verlässlich ist. Forschung läuft dagegen als Fortschritt und wird schneller, wenn die Wissenschaft steigt.
- **Kosten werden beim Start eines Auftrags bezahlt**; Abbrechen erstattet 50 %. Ein Auftrag kann "vorgemerkt" werden und startet automatisch, sobald das Material da ist.
- **Siedler** kosten 1 Einwohner (Stadt braucht mindestens 2), Gold und Holz.
- **Neue Völker bekommen die Startforschung "Stammesleben"** (Siedler, Arbeiter, Späher, Krieger) sofort, damit man direkt loslegen kann.
- **Stapelregel:** 1 Militär + 1 Zivil je Feld; eigene Einheiten können durchlaufen; am Ziel wird mit einer stehenden eigenen Einheit Platz getauscht.
- **Grenzen:** Fremdes Gebiet nur mit offenen Grenzen/Bündnis/Krieg; Stadtstaaten ab Freundschaft.
- **Raubtiere** fallen Einheiten an, die neben ihnen vorbeiziehen, töten aber nie (Rest mindestens 20 LP); Späher nehmen halben Schaden ("fliehen").
- **Naturereignisse** (Dürre, Flut) senken nur Nahrung, mit 3 Stunden Vorwarnung, und betreffen nur Völker, die beim Beginn online sind.
- **Tag/Nacht** ist reine Optik mit einem 2-Stunden-Zyklus (Serverzeit), damit man beim abendlichen Spielen nicht immer Nacht hat. **Jahreszeiten** wechseln alle 2 Tage (±5 % Nahrung bzw. Gold).
- **KI-Völker** forschen 1,6× langsamer und höchstens bis zur Moderne, gründen höchstens 3–5 Städte, erobern nie Spielerstädte (technisch erzwungen) und erklären Spielern nur nach Provokationen den Krieg (und nur, wenn der Spieler online und nicht geschützt ist).
- **Farben:** 16 gut unterscheidbare Vorschläge; eine Farbe muss einen Mindestabstand (wahrgenommene Distanz ≥ 100) zu allen anderen Völkern haben und darf nicht wie Gras/Wasser/Wald aussehen.
- **Texte:** Die Oberflächentexte stehen zentral in `public/js/texte.js`; Spielinhalte (Namen/Beschreibungen) in `public/shared/daten/`, Meldungen des Servers in der Engine.
- **Marschtempo (Update 2026-11-15, nach Leifs Rückmeldung "zu langsam"):** 2 Minuten pro Bewegungspunkt bei Tempo 2 (Ebene, `SCHRITT_BASIS_S = 120`); Späher (Tempo 3) 80 Sekunden pro Feld auf Ebene, 2 Felder Wald/Hügel ca. 5 Minuten; auf Straßen deutlich schneller. Vorher 6 Minuten (Späher: 2 Felder in rauem Gelände ~16 Minuten, das war zu zäh). Die Weltquerung für Antike-Infanterie dauert damit etwa 8–16 Stunden (Test prüft 8–16 h). Spielgefühl hat Vorrang vor der ursprünglichen Vorgabe von 1–2 Tagen.
- **Anfangsbeschleunigung (Update 2026-11-15):** Der Einstieg geht schneller, später wird es zäher. Bauen, Ausbilden und Forschen laufen in der Antike doppelt so schnell, im Zeitalter 1 anderthalbfach, im Zeitalter 2 mit 1,25 (`ANFANGS_TEMPO` in `regeln.js`, danach 1). Wachstum und Grenzfelder kosten auf den ersten Stufen nur die Hälfte und steigen bis Stufe 6 auf den vollen Wert (`anfangsFaktor`). Alles an einer Stelle einstellbar. Marschtempo siehe oben.
- **Barbaren ignorieren den Neulingsschutz (Update 2026-11-15, Leifs Wunsch):** Barbaren greifen auch Spieler unter Neulingsschutz an, solange diese online sind (offline bleibt man verschont). Raubtiere respektieren den Schutz weiter. Spieler im Schutz dürfen Barbaren bekämpfen, ohne den Schutz zu verlieren.
- **Gold ist knapper skaliert** (`GOLD_FAKTOR = 3` statt 6), **Grundwissen 1 Punkt je Einwohner**: So wird Gold nicht wertlos und die Forschung trifft die Zielwerte (per Balance-Simulation eingestellt).
- **Forschungsdauern Moderne/Atomzeit** wurden per Balance-Simulation etwas gesenkt (Moderne 30–53 h, Atomzeit 55–67 h Grundwert), damit ein guter Spieler den ganzen Baum in etwa 27 Tagen schafft (Ziel 2–4 Wochen). Die Grundwerte bleiben in den Richtbereichen (Moderne 1–3 Tage, Atomzeit 2–4 Tage).
- **Nicht umgesetzt (bewusst):** Transportschiffe laden keine Einheiten ein; stattdessen schiffen sich Landeinheiten nach der passenden Forschung selbst ein (wie in Civ 5/6). Wegpunkt-Ketten gibt es nicht; dafür Auto-Erkunden, Auto-Arbeiten, Handelsrouten-Pendeln und "Angreifen nach Marsch".

## Auslastung im Free-Plan (Abschätzung)

Gemessen mit der Mehrspieler-Simulation (`tests/mehrspieler.test.mjs`: 4 aktive Spieler-Bots, 5 KI-Völker, 12 Stadtstaaten, Barbaren, Raubtiere, 14 simulierte Tage, nachts 2 Spieler offline):

| Größe | gemessen pro Tag | Free-Limit pro Tag |
|---|---|---|
| Alarme (DO-Aufrufe durch Ereignisse) | ~2 300 | 100 000 Anfragen |
| geschriebene Speicherzeilen | ~11 400 | 100 000 |
| gespeicherte Zeilen insgesamt | ~175 | 5 GB |

Dazu kommen echte Klicks: 5 Spieler × 2 Stunden × ~3 Befehle/Minute ≈ 1 800 WebSocket-Nachrichten pro Tag, die im Free-Plan mit 20:1 als Anfragen zählen (≈ 90) und je 2–5 Zeilen schreiben (≈ 7 000). Gelesen werden beim Aufwachen des Objekts ~175 Zeilen; selbst bei 3 000 Aufwach-Vorgängen sind das ~0,5 Mio. von 5 Mio. erlaubten gelesenen Zeilen. Die aktive Dauer bleibt dank WebSocket-Hibernation weit unter 13 000 GB-s. **Der Free-Plan reicht mit großem Abstand.**
