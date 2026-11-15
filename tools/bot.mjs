// Ein Bot-Spieler für Balance-Simulation und Mehrspieler-Test: nutzt die KI-Logik, aber ohne die Bremsen der KI-Völker.
import { FORSCHUNGEN, FORSCHUNG, GEBAEUDE, EINHEIT } from '../public/shared/daten/index.js';

/** Macht aus einem Spieler-Volk einen Bot. stil: 'forscher' (gut) | 'bauer' | 'krieger' */
export function botMachen(s, v, stil = 'forscher', o = {}) {
  v.ki = { bot: true, persoenlichkeit: stil === 'krieger' ? 'krieger' : stil === 'bauer' ? 'bauer' : 'forscher', maxZeitalter: 6, maxStaedte: o.maxStaedte || 8, siedlerAbstand: o.siedlerAbstand || 10 * 3600e3, denken_um: s.t + 60e3, groll: {}, freundschaft: {} };
  v.verbunden = 1;
}

/** Zusatzverhalten guter Spieler: Forschung nach Wert wählen, Handelsrouten, Gold sinnvoll ausgeben. */
export function botErweitern(Spiel) {
  Spiel.prototype.botExtras = function (v) {
    v.letzte_aktivitaet = this.t;
    // Forschung: bevorzugt, was Wissenschaft, Wachstum oder das nächste Zeitalter bringt
    if (!v.forschung.aktiv) {
      const kand = FORSCHUNGEN.filter((f) => !f.wiederholbar && this.forschungMoeglich(v, f.id));
      const wert = (f) => {
        let w = -f.dauer / 3600;
        for (const x of f.freischaltet) {
          if (x.art === 'bonus' && x.id === 'wissenschaft_prozent') w += 12;
          if (x.art === 'gebaeude') { const g = GEBAEUDE.find((y) => y.id === x.id); if (g && (g.wirkung?.wissenschaft || g.wirkung?.pro_einwohner?.w || g.wirkung?.wissenschaft_prozent)) w += 20; if (g && g.wirkung?.nahrung) w += 8; }
        }
        if (f.schluessel) w += 15;
        return w;
      };
      kand.sort((a, b) => wert(b) - wert(a));
      if (kand[0]) { this.aendern(v.id); this.forschungWechseln(v, kand[0].id); }
      else if (FORSCHUNGEN.some((f) => f.wiederholbar && this.forschungMoeglich(v, f.id))) { this.aendern(v.id); this.forschungWechseln(v, FORSCHUNGEN.find((f) => f.wiederholbar && this.forschungMoeglich(v, f.id)).id); }
    }
  };
}
