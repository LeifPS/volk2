# Fortschritt (Arbeitsgedächtnis)

## Stand (Version 2.0.0, Repo volk2)
- Umbau von Echtzeit-Welt auf Civ-artige Runden-Partien: Engine `runden.js`, Lobby + Partie als Durable Objects, Lobby-Oberfläche, Rundenleiste, Zug-beenden, Zugzeit-Konto, KI-Ersatz, Siege (Eroberung, Wissenschaft, Punkte), KI-Stufen Leicht/Normal/Schwer + Boni I–III.
- Lokal mit `wrangler dev` und Headless-Chrome geprüft: Konto → Lobby → Partie erstellen → starten → Zug beenden → Runde 2, ohne Konsolenfehler; WebSocket-Lauf mit zwei Menschen + KI (Zugsperre für den, der nicht dran ist).
- Balance: `npm run balance:runden`. Ganzer Baum ≈ 650 Std Spielzeit → Normal = 2 Std je Runde, damit der Wissenschaftssieg vor dem Rundenlimit (400) möglich ist.

## Civ-Angleichung (Etappen G–I)
- Runden statt Uhrzeiten: Bau und Forschung dauern ganze Runden (`RUNDEN_DAUER` in regeln.js, Balance über `npm run balance:runden`), Anzeigen im Forschungsbaum, Stadtfenster und bei Ankunft/Wachstum nennen Runden.
- Bedienung: Schrittanimation der Einheiten, Rundenbericht beim Zugstart (Meldungen), Enter = Zug beenden, F/E/B für Befestigen/Erkunden/Stadt gründen.
- Sozialpolitiken (`daten/politiken.js`): 15 Politiken in Tradition/Freiheit/Ehre, Plätze über Gesamtkultur (Schwelle 250·n^1,5), KI wählt nach Persönlichkeit. Weltwunder sind schon exklusiv (Wettlauf). Bewusst weggelassen: Distrikte, Eurekas, Gouverneure, Loyalität, KI-Diplomatie-Ausbau.

## Offen
- Kein echtes Deployment getestet (Push durch Leif, Workers Builds mit neuem Worker `volk2` verbinden).
- Demo-Modus (`?demo=1`) ist noch Echtzeit, ohne Runden.
- KI beginnt Kriege nur nach Provokation (siehe ENTSCHEIDUNGEN).
- Echte Mehrspieler-Sitzung im Browser mit zwei Menschen nicht von Hand getestet.
