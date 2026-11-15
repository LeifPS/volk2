# Abnahme: Was wurde wie getestet (ehrlich)

## Version 2 (Runden, Repo volk2)
**Automatische Tests (`npm test`): 65 von 65 bestanden** (Node 22). Neu bzw. umgeschrieben:
- `tests/runden.test.mjs`: Zugreihenfolge, Sperre für Spieler, die nicht dran sind, Bewegungspunkte und Weitermarsch, Zugzeit-Konto, Überspringen, KI-Ersatz, Siege (Eroberung, Wissenschaft, Punkte), KI-Stufen.
- `tests/server.test.mjs`: Konten, Admin, Lobby-Ablauf (Partie erstellen, beitreten, starten), Partie-Server (Autorität, Zuggating, Speichern/Laden, Zugzeit-Alarm, Deltas).
- `tests/mehrspieler.test.mjs`: 4 Bot-Menschen + 2 KI + 4 Stadtstaaten + Barbaren über 250 Runden, Konsistenzprüfungen (Stapelregel, Besitz, Gold). Die frühere Lastabschätzung in Alarmen/Tag gilt nicht mehr; im Rundenmodus gibt es nur noch einen Alarm je Zug.
- `tests/regression.test.mjs`, `statisch.test.mjs` auf `PartieServer`, `volk2`, Klassen `Lobby`/`Partie` angepasst.

**Ende-zu-Ende lokal (`wrangler dev` + Skript):** Konten registrieren, Partie erstellen, beitreten, starten, per WebSocket 6 Züge spielen; Befehle des Spielers, der nicht dran ist, werden abgelehnt; Lobby-Liste zeigt Runde und „am Zug“.

**Browser (Headless-Chrome, Playwright):** Anmeldung → Konto → Lobby → Neue Partie (Formular) → Wartezimmer → Starten → Spielansicht mit Rundenleiste, Auswahlfenster mit Bewegungspunkten → „Zug beenden“ → Runde 2. Keine Konsolen- oder Seitenfehler. Zwei Layoutfehler (überlaufende Formularfelder, Knopf-Überlappung) wurden dabei gefunden und behoben.

**Balance:** `npm run balance:runden`. Langläufe mit untätigem Menschen und 4 KI (Normal und Boni III, je 200–400 Runden): keine Fehler, 400 Runden ≈ 4 s Rechenzeit; KI-Völker erforschen alles bis zur Moderne (≈ 205 Forschungen) nach ≈ 140 (Normal) bzw. ≈ 350 Runden (Boni III), bleiben bei 3–5 Städten.

### Was NICHT getestet wurde
- **Kein echtes Deployment** (Push auf `volk2` ja, aber Cloudflare-Anbindung/Workers Builds nicht eingerichtet; `wrangler deploy --dry-run` lief durch).
- **Kein Spiel mit zwei echten Menschen im Browser;** nur per Skript/Bots und ein Mensch im Browser.
- **Nicht von Hand durchgespielt** (auch nicht bis zu einem Sieg); Siege sind nur in Tests und Langläufen geprüft.
- **`tools/browsertest.mjs` und `tools/screenshots.mjs`** stammen aus der Echtzeit-Fassung und laufen mit dem Lobby-Ablauf nicht mehr; `tools/trailer.mjs` ebenso.
- **Demo-Modus (`?demo=1`)** ist unverändert Echtzeit und nicht erneut geprüft.
- **Safari/iPad, Musik, Touch** nicht neu geprüft.
- **KI-Verhalten:** KI-Völker beginnen Kriege nur nach Provokation und erobern nicht von sich aus; bei den höheren Stufen ist die KI stärker, aber nicht grundsätzlich aggressiver als in Civ.
- Einheiten springen ohne Schrittanimation.

---

## Echtzeit-Fassung (Version 1, nur zur Dokumentation)
Stand: Ende der ersten Fassung. Alle Ergebnisse unten sind tatsächlich gelaufen (macOS, Node 24, Chromium 134 über Playwright 1.51, `wrangler dev` 4.x lokal).

## Automatische Tests (`npm test`): 56 von 56 bestanden

| Datei | Was | Ergebnis |
|---|---|---|
| `tests/daten.test.mjs` | Mindestanzahlen (242 Forschungen, 96 Einheiten, 79 Gebäude, 8 Wunder, 33 Beförderungen, 46 Rohstoffe, 23 Gelände, 28 Verbesserungsketten, 5 KI, 12 Stadtstaaten), eindeutige IDs, alle Querverweise, keine Zyklen, alles erreichbar, jede Einheit/Gebäude/Wunder/Verbesserung/Option/strat. Rohstoff freischaltbar, jeder Rohstoff hat einen Zweck, Dauern im Zeitalterbereich und monoton | bestanden |
| `tests/karte.test.mjs` | Karte deterministisch (Hash in zweitem Prozess gleich), keine engine-abhängigen Math-Funktionen (Safari = V8), 45 % Land, mehrere Kontinente und Inseln, alle Gelände (inkl. Seen, Flüsse), alle Rohstoffe mehrfach, genug Startplätze mit Platz, Hex-Geometrie | bestanden |
| `tests/kampf.test.mjs` | Schadensformel gegen Beispielrechnungen, Neulingsschutz, Krieg nur gegen Online-Spieler, Waffenruhe nach 30 min offline, 10 min Schonfrist, Frieden nur per Angebot + Annahme, automatischer Friedensvorschlag nach 12 h (beide müssen zustimmen), Nahkampf beidseitig, Abklingzeit, Erfahrung, Fernkampf ohne Gegenschaden, Stadt erobern (gehört dem Eroberer, ist zerstört), KI/Barbaren erobern nie Spielerstädte, Offline-Schutz gegen Barbaren/Raubtiere, Heilung Stadt > Gebiet, Stapelregel mit Platztausch, Atomwaffe nur mit Forschung und nicht gegen geschützte Ziele | bestanden |
| `tests/zeit.test.mjs` | Bau, Forschung, Marsch, Wachstum mit simulierter Uhr in richtiger Reihenfolge; Speichern/Laden ändert nichts am Ablauf; nächstes Ereignis korrekt; Weltquerung 8–16 h; eine Woche mit vielen gleichzeitigen Befehlen ohne Fehler | bestanden |
| `tests/server.test.mjs` | Konten (Registrierung, Login, falsches Passwort, Rate-Limit, Namenskollision, nur Hash gespeichert, Sitzung läuft ab), Admin nur mit ADMIN_TOKEN (Reset, Sperren), Zeitregler ohne Dev-Variable aus, Server-Autorität mit absichtlich falschen Nachrichten (fremde Einheiten, fremde Städte, außerhalb der Grenzen bauen, ohne Forschung bauen, Kosten umgehen, unbekannte/Prototype-Befehle, Forschung überspringen, nur Sichtbares in der Ansicht, Fragen zu fremden Einheiten), Neustart aus dem Speicher, Deltas kleiner als Vollansicht | bestanden |
| `tests/balance.test.mjs` | Balance-Simulation (siehe unten) mit Grenzwerten | bestanden |
| `tests/mehrspieler.test.mjs` | 4 Bot-Spieler über den echten Server-Code + KI + Stadtstaaten + Barbaren, 14 simulierte Tage, Alarme wie im Durable Object, nachts 2 Spieler offline: keine Engine-Fehler, Stapelregel nie verletzt, Besitz konsistent, keine negativen Bestände, Lastgrenzen | bestanden |
| `tests/statisch.test.mjs` | Jede Einheit/Gebäude/Wunder/Rohstoff/Verbesserung/Gelände hat ein Sprite, alle benutzten UI-Symbole existieren, keine leeren Sprites, Stadt-Sprites je Zeitalter verschieden, keine zwei Einheiten identisch, alle Verweise in `index.html`, Vorlade-Skript vor dem Spielcode, `wrangler.jsonc` gültig, alle Importpfade existieren | bestanden |

| `tests/regression.test.mjs` | Fehler aus dem unabhängigen Code-Review: Naturereignis übersteht Neustart, Waffenruhe in beide Richtungen, Prototyp-Schlüssel (`constructor`, `__proto__`) als Bau-ID/Kontoname harmlos, Schiffe im eroberten Hafen werden versenkt, automatischer Friedensvorschlag kommt nach Ablauf erneut, zwei Tabs zählen richtig, Stadtplatz-/Wegvorschau verraten nichts Unsichtbares, vorgemerkter Bau startet ohne Sekundentakt | bestanden |

Zusätzlich: `npx wrangler deploy --dry-run` läuft durch (Bindings `WELT` und `ASSETS`).

## Unabhängiges Code-Review
Ein separater Prüf-Agent hat Engine und Server gelesen und 14 Fehler mit Skripten nachgestellt (u. a. ein kritischer: ein laufendes Naturereignis hätte die Welt nach einem Neustart blockiert). Alle 14 sind behoben; die wichtigsten sind als Regressionstests abgesichert, die übrigen wurden mit den Prüfskripten erneut kontrolliert.

## Balance-Simulation (`node tools/balance-sim.mjs 34`)
Ein guter Bot-Spieler (forscht gezielt, baut Wissenschaft, bis 8 Städte) in voller Welt:

| Zeitalter | Dauer (Tage) | Ziel |
|---|---|---|
| Antike | 0,9 | 1 |
| Klassik | 2,0 | 2 |
| Mittelalter | 2,8 | 3 |
| Renaissance | 2,4 | 3 |
| Industrie | 5,3 | 4 |
| Moderne | 7,3 | 6 |
| Atomzeit (bis alles erforscht) | 6,5 | 5 |

Ganzer Baum nach **27,2 Tagen** (Ziel 2–4 Wochen). Unterhalt höchstens 19 % der Einnahmen. KI-Völker bleiben bei höchstens 5 Städten und spätestens in der Moderne. Ein normaler Spieler braucht entsprechend länger.

## Browser-Läufe (`npm run browsertest`): 27 von 27 bestanden
Gegen einen frischen `wrangler dev` mit echtem Durable Object: Startseite lädt, Registrierung → Volk gründen → Spielansicht, Tutorial erscheint, erste Stadt gründen, Karte pannen/zoomen (Maus), Bauauftrag, alle Fenster öffnen ohne Fehler (Forschungsbaum, Stadt, Reich, Diplomatie, Rangliste, Lexikon, Hilfe, Einstellungen), Forschung starten, Test-Zeitregler +2 h → Bau fertig per Delta, Bewegen mit Ankunftszeit, Kampfvorschau, keine Konsolenfehler, **Hub-Einbettung im iframe** (meldet `{lgh:'ton-bereit'}`, Spiel lädt im Rahmen, keine Fehler), oben links 64×56 px frei, **Touch** auf iPad-Profil (Ziehen, Zwei-Finger-Zoom) im Demo-Modus ohne Fehler.

Außerdem wurde jedes Fenster von mir und den Hilfs-Agenten per Screenshot bei 1600×900 und 1024×768 angesehen. Die Sprite-Galerie (`tools/sprite-galerie.html`) wurde für alle Kategorien angesehen.

## Was NICHT getestet wurde
- **Kein echtes Deployment:** Push auf GitHub war in meiner Umgebung nicht erlaubt. Getestet wurde lokal mit `wrangler dev` (workerd), was dem Cloudflare-Laufzeitsystem entspricht, aber nicht mit dem echten Free-Plan, echten Alarmen über Tage oder echter Hibernation über Stunden.
- **Kein echtes iPad/Safari:** Touch nur mit Chromium-Geräteprofil. Die Kartenerzeugung ist aber so geschrieben, dass sie auf jeder Engine bitgleich ist (Test prüft, dass keine nicht-exakten Funktionen benutzt werden).
- **Mehrere echte Menschen gleichzeitig:** nur simuliert (Bots über den echten Server-Code).
- **Musik nicht angehört:** Die Chiptune-Musik wurde technisch geprüft (lädt fehlerfrei, Pegel ohne Übersteuerung, je Zeitalter verschieden). Ob sie gefällt, muss ein Mensch hören.
- **Ein Durchspielen bis in die Moderne von Hand** gab es nicht; dafür die Balance-Simulation mit Bot bis zum Ende des Baums.

## Bekannte Einschränkungen
- Das Gelände lässt sich aus dem Seed ausrechnen (Vorgabe "Client und Server erzeugen identisch"). Alles Dynamische schickt der Server nur, wenn es sichtbar bzw. erkundet ist.
- Transportschiffe laden keine Einheiten; Landeinheiten schiffen sich nach der Forschung selbst ein.
- Keine Wegpunkt-Ketten (dafür Auto-Erkunden, Auto-Arbeiten, Handelsrouten, "Angreifen nach Marsch").
- Leifs Beispiel "wenige Felder in 2 min 20" gilt nur auf Straßen/mit schnellen Einheiten, weil die Weltquerung (1–2 Tage) Vorrang hat.

## Kurzanleitung für Leif
1. `git push origin main` → Cloudflare deployt automatisch.
2. Optional Admin aktivieren: `npx wrangler secret put ADMIN_TOKEN`, dann `ADMIN_TOKEN=… node tools/admin.mjs statistik` (auch `passwort`, `sperren`, `entsperren`, `loeschen`).
3. Hub: `hub-eintrag/ANLEITUNG.md` (Banner mit Gemini nach `banner-prompt.md` erzeugen, Dateien kopieren, JSON-Eintrag, Commit "Großes Update: Volk (Alpha) im Hub").
4. Lokal ausprobieren: `npm install && npm run dev`, dann http://localhost:8787. Demo ohne Server: `/?demo=1&zeitalter=0..6`.
