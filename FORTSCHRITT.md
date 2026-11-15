# Fortschritt (Arbeitsgedächtnis)

## Stand (Version 2.0.0, Repo volk2)
- Umbau von Echtzeit-Welt auf Civ-artige Runden-Partien: Engine `runden.js`, Lobby + Partie als Durable Objects, Lobby-Oberfläche, Rundenleiste, Zug-beenden, Zugzeit-Konto, KI-Ersatz, Siege (Eroberung, Wissenschaft, Punkte), KI-Stufen Leicht/Normal/Schwer + Boni I–III.
- Lokal mit `wrangler dev` und Headless-Chrome geprüft: Konto → Lobby → Partie erstellen → starten → Zug beenden → Runde 2, ohne Konsolenfehler; WebSocket-Lauf mit zwei Menschen + KI (Zugsperre für den, der nicht dran ist).
- Balance: `npm run balance:runden`. Ganzer Baum ≈ 650 Std Spielzeit → Normal = 2 Std je Runde, damit der Wissenschaftssieg vor dem Rundenlimit (400) möglich ist.

## Offen
- Kein echtes Deployment getestet (Push durch Leif, Workers Builds mit neuem Worker `volk2` verbinden).
- Demo-Modus (`?demo=1`) ist noch Echtzeit, ohne Runden.
- Einheiten springen ohne Schrittanimation.
- KI beginnt Kriege nur nach Provokation (siehe ENTSCHEIDUNGEN).
- Echte Mehrspieler-Sitzung im Browser mit zwei Menschen nicht von Hand getestet.
