// Forschung: genau eine aktive Forschung je Volk, Warteschlange, Fortschritt als Integration über die Wissenschaft.
import { FORSCHUNG, FORSCHUNGEN, EINHEIT, GEB, WUNDER_NACH_ID, VERBESSERUNG, ROHSTOFF } from '../daten/index.js';
import { ZEITALTER } from '../daten/zeitalter.js';
import { pruefe } from './spiel.js';

export const forschung = {
  forschungsName(id) { return FORSCHUNG[id]?.name || id || '?'; },

  forschungMoeglich(v, id) {
    const f = FORSCHUNG[id];
    if (!f) return false;
    if (v.forschung.erforscht[id] && !f.wiederholbar) return false;
    return f.voraussetzungen.every((x) => v.forschung.erforscht[x]);
  },

  /** Alle fehlenden Voraussetzungen von id in sinnvoller Reihenfolge (inkl. id). */
  forschungsWeg(v, id) {
    const erg = [], gesehen = new Set();
    const besuche = (x) => {
      if (gesehen.has(x)) return; gesehen.add(x);
      const f = FORSCHUNG[x];
      if (!f || (v.forschung.erforscht[x] && !(x === id && f.wiederholbar))) return;
      for (const p of f.voraussetzungen) besuche(p);
      erg.push(x);
    };
    besuche(id);
    return erg;
  },

  forschungsZeit(v) {
    const fo = v.forschung;
    if (!fo || !fo.aktiv) return null;
    const r = this.raten(v.id);
    const d = this.forschungsDauerMs(v, fo.aktiv, r.wissenschaft);
    return Math.ceil((v.stand_um ?? this.t) + Math.max(0, 1 - (fo.fortschritt || 0)) * d);
  },

  /** Befehl: Forschung wählen. Fehlende Voraussetzungen werden automatisch vorgeschaltet. */
  befehl_forschen(v, b) {
    const f = FORSCHUNG[b.id];
    pruefe(f, 'Unbekannte Forschung.');
    pruefe(!v.forschung.erforscht[b.id] || f.wiederholbar, 'Das ist schon erforscht.');
    this.aendern(v.id);
    const weg = this.forschungsWeg(v, b.id);
    pruefe(weg.length, 'Das ist schon erforscht.');
    this.forschungWechseln(v, weg[0]);
    v.forschung.schlange = weg.slice(1);
    this.markiere('v' + v.id);
    return { weg };
  },

  /** Befehl: ganze Warteschlange setzen (Liste von IDs; ungültige werden aussortiert). */
  befehl_forschung_schlange(v, b) {
    pruefe(Array.isArray(b.ids) && b.ids.length <= 40, 'Ungültige Warteschlange.');
    this.aendern(v.id);
    const neu = [];
    const sim = { forschung: { erforscht: { ...v.forschung.erforscht } } };
    if (v.forschung.aktiv) sim.forschung.erforscht[v.forschung.aktiv] = 1;
    for (const id of b.ids) {
      if (!FORSCHUNG[id] || neu.includes(id)) continue;
      for (const x of this.forschungsWeg(sim, id)) { if (!neu.includes(x)) { neu.push(x); sim.forschung.erforscht[x] = 1; } }
    }
    if (!v.forschung.aktiv && neu.length) { this.forschungWechseln(v, neu.shift()); }
    v.forschung.schlange = neu;
    this.markiere('v' + v.id);
  },

  forschungWechseln(v, id) {
    const fo = v.forschung;
    fo.teil = fo.teil || {};
    if (fo.aktiv && fo.aktiv !== id && fo.fortschritt > 0) fo.teil[fo.aktiv] = fo.fortschritt;
    if (fo.aktiv === id) return;
    fo.aktiv = id;
    fo.fortschritt = fo.teil[id] || 0;
    delete fo.teil[id];
  },

  forschungFertig(vid) {
    const v = this.z.voelker[vid];
    const fo = v.forschung;
    if (!fo.aktiv) return;
    this.aendern(vid);
    const id = fo.aktiv;
    const f = FORSCHUNG[id];
    fo.erforscht[id] = (fo.erforscht[id] || 0) + 1;
    fo.aktiv = null; fo.fortschritt = 0;
    this.meldung(vid, `Forschung abgeschlossen: ${f.name}. ${this.freischaltText(f)}`, { art: 'forschung', wichtig: true });
    // Optionen und Sichtbarkeit
    for (const fs of f.freischaltet) {
      if (fs.art === 'rohstoff') this.markiere('v' + vid);
    }
    this.zeitalterPruefen(v);
    // nächste aus der Warteschlange
    while (fo.schlange && fo.schlange.length) {
      const n = fo.schlange.shift();
      if (this.forschungMoeglich(v, n)) { this.forschungWechseln(v, n); break; }
    }
    if (!fo.aktiv && v.art === 'spieler') this.meldung(vid, 'Wähle eine neue Forschung im Forschungsbaum.', { art: 'forschung' });
    for (const s of this.staedteVon(vid)) this.bauSchlangeWeiter(s.id);
    delete this._raten[vid];
    this.markiere('v' + vid);
  },

  freischaltText(f) {
    const namen = [];
    for (const fs of f.freischaltet) {
      const d = fs.art === 'einheit' ? EINHEIT[fs.id] : fs.art === 'gebaeude' ? GEB[fs.id] : fs.art === 'wunder' ? WUNDER_NACH_ID[fs.id] : fs.art === 'verbesserung' ? VERBESSERUNG[fs.id] : fs.art === 'rohstoff' ? ROHSTOFF[fs.id] : null;
      if (d) namen.push(d.name);
    }
    return namen.length ? 'Neu: ' + namen.slice(0, 6).join(', ') + (namen.length > 6 ? ' …' : '') + '.' : '';
  },

  /** Zeitalter steigt, wenn mindestens 60 % der Forschungen des aktuellen Zeitalters erforscht sind und die Schlüsselforschung des nächsten. */
  zeitalterPruefen(v) {
    for (;;) {
      const z = v.zeitalter || 0;
      if (z >= ZEITALTER.length - 1) return;
      const imZ = FORSCHUNGEN.filter((f) => f.zeitalter === z);
      const erforscht = imZ.filter((f) => v.forschung.erforscht[f.id]).length;
      const schluessel = FORSCHUNGEN.find((f) => f.zeitalter === z + 1 && f.schluessel);
      if (erforscht / imZ.length >= 0.6 && schluessel && v.forschung.erforscht[schluessel.id]) {
        v.zeitalter = z + 1;
        this.meldung(v.id, `Dein Volk tritt in ein neues Zeitalter ein: ${ZEITALTER[z + 1].name}! Städte, Straßen und Einheiten bekommen ein neues Aussehen.`, { art: 'zeitalter', wichtig: true });
        this.markiere('v' + v.id);
        this.positionenNeu();
      } else return;
    }
  },

  /** Anzahl erforschter Forschungen (Wiederholungen zählen). */
  forschungsAnzahl(v) { return Object.values(v.forschung.erforscht).reduce((a, n) => a + n, 0); },
};
