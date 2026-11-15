// Runden-Modus (wie Civilization): Es gibt eine gemeinsame Rundenzählung. In einer Runde sind die Völker reihum am Zug.
// Die Spielzeit (z.t) bleibt während der Züge stehen und springt am Rundenende um die Rundenlänge weiter. Dabei laufen
// Bau, Forschung, Wachstum usw. wie bisher über Zielzeitpunkte ab. Einheiten bewegen sich mit Bewegungspunkten (mp).
// Echte Uhrzeit spielt nur für das Zugzeit-Konto der Menschen eine Rolle (Parameter `jetzt` in Millisekunden).
import { EINHEIT, FORSCHUNG } from '../daten/index.js';
import { EINGESCHIFFT_TEMPO, PARTIE, SPIELTEMPO, KI_STUFEN, WISSENSCHAFTSSIEG_FORSCHUNG, STD, gesamtWertung } from '../regeln.js';
import { pruefe, SpielFehler } from './spiel.js';

/** Befehle, die auch außerhalb des eigenen Zugs erlaubt sind (lesen oder nur Einstellungen). */
export const BEFEHLE_IMMER = new Set(['meldungen_gelesen', 'tutorial', 'ping', 'einstellungen', 'angebot_antwort']);

export const runden = {
  partie() { return this.z.global.partie || null; },
  imRundenModus() { return !!this.z.global.partie; },
  /** Zeitquelle für Befehle: im Rundenmodus die Spielzeit (steht still), sonst die echte Uhr. */
  jetztSpiel(echt) { return this.z.global.partie ? this.t : echt; },

  /** Bewegungspunkte pro Runde: Tempo der Einheit mit Boni. */
  mpMax(e) {
    const d = EINHEIT[e.typ];
    const tempo = e.in ? EINGESCHIFFT_TEMPO : (d.tempo || 2);
    return tempo * (1 + Math.max(0, this.tempoBonus(e, d)) / 100);
  },

  /** Setzt die Bewegung einer Einheit mit ihren übrigen Bewegungspunkten fort (Wegbefehle laufen von Runde zu Runde weiter). */
  bewegungAusfuehren(e) {
    if (!this.z.global.partie) return;
    for (let n = 0; n < 80; n++) {
      const cur = this.z.einheiten[e.id];
      if (!cur || !cur.pfad?.length || !(cur.mp > 1e-9)) return;
      const k = cur.pfad[0].k ?? 1;
      const vor = cur.feld;
      cur.mp = Math.max(0, cur.mp - k);
      this.schritt(cur.id);
      const nach = this.z.einheiten[cur.id];
      if (!nach) return;
      if (nach.feld === vor && !nach.pfad?.length) { nach.mp += k; return; } // blockiert: nichts verbraucht
    }
  },

  // ---------- Partie anlegen ----------
  /**
   * Startet eine Partie. o: { spieler: [{konto, name, farbe}], ki: [{vorlage?, stufe}], stadtstaaten, barbaren, tiere,
   * tempo, rundenlimit, siege, zugzeit }. Gibt die Partie-Daten zurück.
   */
  partieStarten(o = {}, jetztEcht = Date.now()) {
    const g = this.z.global;
    pruefe(!g.partie && !g.initialisiert, 'Die Partie läuft schon.');
    const tempo = SPIELTEMPO[o.tempo] ? o.tempo : PARTIE.tempo;
    const zeit = { ...PARTIE.zugzeit, ...(o.zugzeit || {}) };
    const humans = (o.spieler || []).length;
    g.partie = {
      runde: 1, dran: 0, reihe: [], status: 'laeuft', sieger: null, siegart: null,
      tempo, rundeMs: SPIELTEMPO[tempo].rundeMs, rundenlimit: o.rundenlimit ?? PARTIE.rundenlimit,
      siege: { ...PARTIE.siege, ...(o.siege || {}) },
      zeit: { ...zeit, aktiv: !!zeit.aktiv && humans > 1 }, zug: null, start_echt: jetztEcht,
    };
    g.initialisiert = true;
    g.jahreszeit = 0; g.jahreszeit_um = this.t + 48 * STD;
    g.barbaren_um = o.barbaren === false ? null : this.t + 2 * STD;
    g.natur_um = this.t + 12 * STD;
    g.diplo_um = this.t + STD;
    if (o.barbaren !== false) this.volkAnlegen({ art: 'barbar', name: 'Barbaren', farbe: '#2b2b2b' });
    if (o.tiere !== false) this.volkAnlegen({ art: 'tiere', name: 'Wilde Tiere', farbe: '#7a5c3a' });
    const reihe = [];
    for (const s of o.spieler || []) reihe.push(this.neuesSpielerVolk(s.konto, s.name, s.farbe).id);
    const vorlagen = this.kiVorlagen();
    let n = 0;
    for (const k of o.ki || []) {
      const vl = (k.vorlage && vorlagen.find((x) => x.id === k.vorlage)) || vorlagen[n % vorlagen.length];
      n++;
      const v = this.kiVolkAnlegen(vl, k.stufe);
      if (v) reihe.push(v.id);
    }
    this.stadtstaatenAnlegen(o.stadtstaaten ?? PARTIE.stadtstaaten);
    if (o.tiere !== false) this.tiereNachfuellen();
    if (o.barbaren !== false) for (let i = 0; i < 3; i++) this.lagerGruenden();
    // Reihenfolge: gemischt, aber nachvollziehbar (Spielzufall)
    for (let i = reihe.length - 1; i > 0; i--) { const j = Math.floor(this.zufall() * (i + 1)); [reihe[i], reihe[j]] = [reihe[j], reihe[i]]; }
    g.partie.reihe = reihe;
    for (const vid of reihe) { const v = this.z.voelker[vid]; v.bank = zeit.start; v.verpasst = 0; v.zuege = 0; }
    this.markiere('g');
    // Erster Zug: KI zieht sofort, bis ein Mensch dran ist
    g.partie.dran = -1;
    this.zugWeiter(jetztEcht);
    return g.partie;
  },

  /** Ein neues KI-Volk (Gegner wie in Civ) mit Stadt, Krieger und Arbeiter. */
  kiVolkAnlegen(vl, stufe = 'normal') {
    const feld = this.startplatz();
    if (feld < 0) return null;
    const v = this.volkAnlegen({ art: 'ki', name: vl.name, farbe: vl.farbe, vorlage: vl.id });
    v.ki = { persoenlichkeit: vl.persoenlichkeit, herrscher: vl.herrscher, stufe: KI_STUFEN.some((x) => x.id === stufe) ? stufe : 'normal', denken_um: null, groll: {}, freundschaft: {} };
    this.stadtGruenden(v.id, feld, this.stadtName(v));
    this.einheitErzeugen(v.id, 'krieger', feld);
    this.einheitErzeugen(v.id, 'arbeiter', feld);
    return v;
  },

  // ---------- Zugablauf ----------
  /** Wer ist gerade dran? */
  amZug() { const p = this.z.global.partie; return p && p.status === 'laeuft' ? p.reihe[p.dran] ?? null : null; },

  befehl_zug_beenden(v) {
    pruefe(this.amZug() === v.id, 'Du bist nicht am Zug.');
    this.zugBeenden(v.id, this._jetztEcht ?? Date.now());
    return { runde: this.z.global.partie.runde };
  },

  /** Beendet den Zug von vid (Mensch: Zugzeit-Konto abrechnen) und lässt die Nächsten ziehen. */
  zugBeenden(vid, jetztEcht, o = {}) {
    const p = this.z.global.partie;
    const v = this.z.voelker[vid];
    if (p.zeit.aktiv && v.art === 'spieler' && p.zug && p.zug.vid === vid) {
      if (o.zeitUeberschritten) { v.bank = 0; v.verpasst = (v.verpasst || 0) + 1; } else {
        const verbraucht = Math.max(0, jetztEcht - p.zug.start);
        v.bank = Math.min(p.zeit.max, Math.max(0, (v.bank ?? p.zeit.start) - verbraucht) + p.zeit.plus);
        v.verpasst = 0;
      }
      this.markiere('v' + vid);
    }
    p.zug = null;
    this.ausscheidenPruefen();
    if (this.siegPruefen()) return;
    this.zugWeiter(jetztEcht);
  },

  /** Nächster Zug in der Reihenfolge; KI zieht sofort, bei Menschen beginnt ihr Zugzeit-Konto zu laufen. */
  zugWeiter(jetztEcht) {
    const p = this.z.global.partie;
    for (let guard = 0; guard < 200000; guard++) {
      if (p.status !== 'laeuft') return;
      p.dran++;
      if (p.dran >= p.reihe.length) {
        p.dran = 0;
        this.rundeWeiter();
        if (p.status !== 'laeuft') return;
      }
      const vid = p.reihe[p.dran];
      const v = this.z.voelker[vid];
      if (!v || v.ausgeschieden) continue;
      this.zugBeginn(vid);
      if (v.art !== 'spieler') { this.kiZug(vid); this.ausscheidenPruefen(); if (this.siegPruefen()) return; continue; }
      // Mensch: Konto prüfen
      if (p.zeit.aktiv) {
        if ((v.bank ?? 0) <= 0) {
          if (v.verbunden > 0) v.bank = p.zeit.plus; // wer da ist, bekommt eine kleine Gnadenfrist
          else {
            v.verpasst = (v.verpasst || 0) + 1;
            this.meldung(v.id, `Du hast Runde ${p.runde} verpasst. Deine Zugzeit ist aufgebraucht.`, { art: 'info', wichtig: true });
            if (v.verpasst >= p.zeit.verpasstMax) this.durchKiErsetzen(v);
            this.markiere('v' + vid);
            continue;
          }
        }
        p.zug = { vid, start: jetztEcht, frist: jetztEcht + v.bank };
      } else p.zug = { vid, start: jetztEcht, frist: null };
      this.markiere('g');
      return;
    }
    this.fehlerProtokoll('Zugschleife abgebrochen');
  },

  /** Prüft, ob die Zugzeit des aktuellen Menschen abgelaufen ist (Server ruft das bei Alarm/Anfrage). */
  zugZeitPruefen(jetztEcht) {
    const p = this.z.global.partie;
    if (!p || p.status !== 'laeuft' || !p.zug || p.zug.frist == null) return false;
    if (jetztEcht < p.zug.frist) return false;
    this.meldung(p.zug.vid, 'Deine Zugzeit war abgelaufen. Der Zug wurde automatisch beendet.', { art: 'info', wichtig: true });
    this.zugBeenden(p.zug.vid, jetztEcht, { zeitUeberschritten: true });
    return true;
  },

  /** Beginn des Zugs: Bewegungspunkte auffüllen und laufende Wegbefehle fortsetzen. */
  zugBeginn(vid) {
    const v = this.z.voelker[vid];
    for (const e of this.einheitenVon(vid)) e.mp = this.mpMax(e);
    for (const e of this.einheitenVon(vid)) if (e.pfad?.length) this.bewegungAusfuehren(e);
    v.zuege = (v.zuege || 0) + 1;
    this.aendern(vid);
    this.markiere('v' + vid);
  },

  /** Alle Völker waren dran: Die Spielzeit springt eine Runde weiter, die Welt lebt (Wirtschaft, Barbaren, Tiere, Natur). */
  rundeWeiter() {
    const p = this.z.global.partie;
    for (const v of this.alleVoelker()) if (!p.reihe.includes(v.id)) for (const e of this.einheitenVon(v.id)) e.mp = this.mpMax(e);
    this.verarbeite(this.t + p.rundeMs);
    p.runde++;
    this.markiere('g');
    if (p.rundenlimit && p.runde > p.rundenlimit && p.siege.punkte) this.partieBeenden('punkte', this.punkteSieger());
  },

  // ---------- Abwesende, KI-Ersatz ----------
  durchKiErsetzen(v) {
    v.art = 'ki'; v.ersetzt = true; v.verloren = true;
    v.ki = { persoenlichkeit: 'bauer', stufe: 'normal', denken_um: null, groll: {}, freundschaft: {} };
    for (const o of this.alleVoelker()) if (o.art === 'spieler') this.meldung(o.id, `${v.name} war zu lange abwesend und wird jetzt von der KI gespielt.`, { art: 'info', wichtig: true });
    this.markiere('v' + v.id);
  },

  /** Ein Zug einer KI: Forschung, Städte, Einheiten, Diplomatie (derselbe Verstand wie im Echtzeitspiel, einmal pro Runde). */
  kiZug(vid) {
    const v = this.z.voelker[vid];
    this.kiDenken(vid);
    if (v.ki) v.ki.denken_um = null;
  },

  // ---------- Ausscheiden und Sieg ----------
  lebendig(v) { return !v.ausgeschieden && (this.staedteVon(v.id).length > 0 || this.einheitenVon(v.id).some((e) => e.typ === 'siedler')); },

  ausscheidenPruefen() {
    const p = this.z.global.partie;
    if (!p || p.status !== 'laeuft') return;
    for (const vid of p.reihe) {
      const v = this.z.voelker[vid];
      if (!v || v.ausgeschieden) continue;
      if (this.lebendig(v)) continue;
      // Am Anfang hat jeder noch keine Stadt, aber einen Siedler: dann gilt er als lebendig (siehe lebendig).
      v.ausgeschieden = p.runde;
      for (const e of this.einheitenVon(vid)) this.einheitEntfernen(e.id);
      this.markiere('v' + vid);
      for (const o of this.alleVoelker()) if (o.art === 'spieler') this.meldung(o.id, `${v.name} ist ausgeschieden.`, { art: 'info', wichtig: true });
    }
  },

  punkteSieger() {
    const r = this.rangliste();
    const alle = [...r.spieler, ...r.ki.filter((x) => x.art === 'ki')].filter((x) => !this.z.voelker[x.id].ausgeschieden);
    alle.sort((a, b) => b.gesamt - a.gesamt || a.id - b.id);
    return alle[0]?.id ?? null;
  },

  /** Prüft Siegbedingungen. Liefert true, wenn die Partie zu Ende ist. */
  siegPruefen() {
    const p = this.z.global.partie;
    if (!p || p.status !== 'laeuft') return true;
    const aktive = p.reihe.map((id) => this.z.voelker[id]).filter((v) => v && !v.ausgeschieden);
    const menschen = aktive.filter((v) => v.art === 'spieler');
    const hatteMenschen = p.reihe.some((id) => this.z.voelker[id]?.konto);
    if (p.siege.wissenschaft) {
      const w = aktive.find((v) => v.forschung?.erforscht?.[WISSENSCHAFTSSIEG_FORSCHUNG]);
      if (w) { this.partieBeenden('wissenschaft', w.id); return true; }
    }
    if (p.siege.eroberung) {
      if (aktive.length <= 1) { this.partieBeenden('eroberung', aktive[0]?.id ?? null); return true; }
    }
    // Alle Menschen sind weg: Partie zu Ende (die KI gewinnt)
    if (hatteMenschen && !menschen.length) { this.partieBeenden('niederlage', aktive[0]?.id ?? null); return true; }
    return false;
  },

  partieBeenden(art, siegerId) {
    const p = this.z.global.partie;
    p.status = 'beendet'; p.siegart = art; p.sieger = siegerId; p.zug = null; p.ende_runde = p.runde;
    const sv = siegerId != null ? this.z.voelker[siegerId] : null;
    const text = { eroberung: 'Eroberungssieg', wissenschaft: 'Wissenschaftssieg', punkte: 'Sieg nach Punkten', niederlage: 'Alle Menschen sind ausgeschieden' }[art] || art;
    for (const v of this.alleVoelker()) if (v.art === 'spieler') this.meldung(v.id, `Die Partie ist zu Ende: ${text}${sv ? ' – Sieger: ' + sv.name : ''}.`, { art: 'info', wichtig: true });
    this.markiere('g');
  },

  /** Zusammenfassung für die Oberfläche (Lobby-Liste, Kopfzeile). */
  partieAnsicht() {
    const p = this.z.global.partie;
    if (!p) return null;
    const dran = p.status === 'laeuft' ? p.reihe[p.dran] : null;
    const volk = (id) => { const v = this.z.voelker[id]; return v ? { id, name: v.name, farbe: v.farbe, art: v.art, mensch: !!v.konto, ausgeschieden: v.ausgeschieden || 0, bank: p.zeit.aktiv && v.konto ? v.bank : null, verpasst: v.verpasst || 0, verbunden: v.verbunden > 0 } : null; };
    return {
      runde: p.runde, status: p.status, sieger: p.sieger, siegart: p.siegart, rundenlimit: p.rundenlimit, tempo: p.tempo, rundeMs: p.rundeMs,
      dran, frist: p.zug?.frist ?? null, zug_start: p.zug?.start ?? null, zeit: p.zeit, siege: p.siege,
      reihe: p.reihe.map(volk).filter(Boolean),
    };
  },
};

export { SpielFehler };
void FORSCHUNG; void gesamtWertung;
