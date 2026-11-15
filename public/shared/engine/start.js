// Welt-Erstellung (KI, Stadtstaaten, Barbaren, Tiere), neue Spieler-Völker, Startplätze, Neuanfang und kleine Verwaltungsbefehle.
import { karte, startWert } from '../karte.js';
import { ANZAHL, abstand, umkreis } from '../hex.js';
import { GELAENDE } from '../daten/gelaende.js';
import { KI_VOELKER, STADTSTAATEN, STARTFORSCHUNGEN, FORSCHUNG, POLITIK, politikPlaetze } from '../daten/index.js';
import { START_LAGER, SCHUTZ, STD, MIN, TAG } from '../regeln.js';
import { pruefe, SpielFehler } from './spiel.js';

export const START_ABSTAND = 18;
import { farbAbstand, volksnameFehler, FARB_VORSCHLAEGE } from '../namen.js';
export { farbAbstand, volksnameFehler, FARB_VORSCHLAEGE };

export const start = {
  /** Erstellt die Welt beim allerersten Start: Barbaren, Tiere, KI-Völker und Stadtstaaten. */
  weltInitialisieren() {
    const g = this.z.global;
    if (g.initialisiert) return;
    g.initialisiert = true;
    g.jahreszeit = 0;
    g.jahreszeit_um = this.t + 2 * TAG;
    g.barbaren_um = this.t + 2 * STD;
    g.natur_um = this.t + 12 * STD;
    g.diplo_um = this.t + STD;
    this.volkAnlegen({ art: 'barbar', name: 'Barbaren', farbe: '#2b2b2b' });
    this.volkAnlegen({ art: 'tiere', name: 'Wilde Tiere', farbe: '#7a5c3a' });
    for (const k of KI_VOELKER) {
      const feld = this.startplatz(START_ABSTAND + 4);
      if (feld < 0) continue;
      const v = this.volkAnlegen({ art: 'ki', name: k.name, farbe: k.farbe, vorlage: k.id });
      v.ki = { persoenlichkeit: k.persoenlichkeit, herrscher: k.herrscher, denken_um: this.t + Math.floor(this.zufall() * 30 * MIN), groll: {}, freundschaft: {} };
      this.stadtGruenden(v.id, feld, this.stadtName(v));
      this.einheitErzeugen(v.id, 'krieger', feld);
      this.einheitErzeugen(v.id, 'arbeiter', feld);
    }
    this.stadtstaatenAnlegen(STADTSTAATEN.length);
    this.tiereNachfuellen();
    for (let i = 0; i < 4; i++) this.lagerGruenden();
    this.markiere('g');
  },

  /** Vorlagen für KI-Gegner (Namen, Farben, Persönlichkeit). */
  kiVorlagen() { return KI_VOELKER; },

  /** Legt bis zu n Stadtstaaten an. */
  stadtstaatenAnlegen(n) {
    for (const s of STADTSTAATEN.slice(0, n)) {
      const feld = this.startplatz(12);
      if (feld < 0) continue;
      const v = this.volkAnlegen({ art: 'stadtstaat', name: s.name, farbe: s.farbe, vorlage: s.id });
      v.ki = { persoenlichkeit: 'stadtstaat', denken_um: this.t + Math.floor(this.zufall() * 3 * STD), groll: {} };
      v.einfluss = {};
      const st = this.stadtGruenden(v.id, feld, s.name);
      st.bev = 3;
      this.einheitErzeugen(v.id, 'krieger', feld);
      for (let i = 0; i < 3; i++) this.grenzwachstum(st.id);
    }
  },

  volkAnlegen(o) {
    const id = this.neueId();
    const v = {
      id, art: o.art, name: o.name, farbe: o.farbe, konto: o.konto || null, vorlage: o.vorlage || null,
      gegruendet: this.t, schutz_bis: o.art === 'spieler' && !this.z.global.partie ? this.t + SCHUTZ.neulingDauer : 0,
      gold: START_LAGER.gold, lager: { holz: START_LAGER.holz, stein: START_LAGER.stein }, stand_um: this.t,
      forschung: { aktiv: null, fortschritt: 0, teil: {}, schlange: [], erforscht: {} },
      zeitalter: 0, bekannt: {}, meldungen: [], verbunden: 0, letzte_aktivitaet: o.art === 'spieler' ? this.t : 0,
    };
    for (const f of STARTFORSCHUNGEN) if (FORSCHUNG[f].freischaltet.some((x) => x.art === 'einheit' && x.id === 'siedler')) v.forschung.erforscht[f] = 1;
    if (o.art === 'ki' || o.art === 'stadtstaat') { v.gold = 300; v.lager = { holz: 300, stein: 200 }; }
    this.z.voelker[id] = v;
    this.markiere('v' + id);
    return v;
  },

  /** Sucht einen guten, freien Startplatz mit großem Abstand zu allen Städten und Einheiten. */
  startplatz(minAbstand = START_ABSTAND) {
    const k = karte();
    const belegt = [...this.alleStaedte().map((s) => s.feld), ...this.alleEinheiten().filter((e) => { const v = this.z.voelker[e.volk]; return v && v.art !== 'tiere' && v.art !== 'barbar'; }).map((e) => e.feld)];
    const lager = Object.values(this.z.lager).map((l) => l.feld);
    const kand = [];
    for (let i = 0; i < ANZAHL; i += 1) {
      if ((i * 2654435761 >>> 0) % 3 !== 0) continue; // Stichprobe genügt und spart Zeit
      const w = startWert(i);
      if (w <= 0) continue;
      if (this.besitzer(i) != null) continue;
      let ok = true;
      for (const b of belegt) if (abstand(b, i) < minAbstand) { ok = false; break; }
      if (!ok) continue;
      for (const l of lager) if (abstand(l, i) < 6) { ok = false; break; }
      if (!ok) continue;
      kand.push([i, w]);
    }
    if (!kand.length) return minAbstand > 8 ? this.startplatz(minAbstand - 4) : -1;
    kand.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    const oben = kand.slice(0, Math.max(1, Math.ceil(kand.length * 0.08)));
    return oben[Math.floor(this.zufall() * oben.length)][0];
  },

  farbeFehler(farbe, ausserVolk = null) {
    if (typeof farbe !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(farbe)) return 'Ungültige Farbe.';
    const f = farbe.toLowerCase();
    for (const v of this.alleVoelker()) {
      if (v.id === ausserVolk || v.art === 'tiere') continue;
      if (farbAbstand(f, v.farbe.toLowerCase()) < 100) return `Diese Farbe ist der von ${v.name} zu ähnlich. Bitte wähle eine deutlich andere.`;
    }
    for (const g of GELAENDE) if (['grasland', 'meer', 'tiefsee', 'wald', 'ebene'].includes(g.id) && farbAbstand(f, g.farben[0]) < 70) return `Diese Farbe ist kaum vom Gelände (${g.name}) zu unterscheiden.`;
    return null;
  },

  /** Legt ein neues Spieler-Volk an und setzt es mit Siedler, Krieger und Späher auf einen freien Startplatz. */
  neuesSpielerVolk(konto, name, farbe) {
    this.weltInitialisieren();
    const nf = volksnameFehler(name);
    pruefe(!nf, nf);
    const n = name.trim();
    pruefe(!this.alleVoelker().some((v) => v.name.toLowerCase() === n.toLowerCase()), 'Diesen Volksnamen gibt es schon.');
    const ff = this.farbeFehler(farbe);
    pruefe(!ff, ff);
    const feld = this.startplatz();
    pruefe(feld >= 0, 'Die Welt ist leider voll. Bitte wende dich an den Admin.');
    const v = this.volkAnlegen({ art: 'spieler', name: n, farbe: farbe.toLowerCase(), konto });
    v.tutorial = { schritt: 0, fertig: false };
    this.startEinheiten(v, feld);
    this.meldung(v.id, `Willkommen, Volk der ${n}! Dein Siedler wartet auf dich. Gründe deine erste Stadt.`, { art: 'info', feld, wichtig: true });
    return v;
  },

  startEinheiten(v, feld) {
    const s = this.einheitErzeugen(v.id, 'siedler', feld);
    this.einheitErzeugen(v.id, 'krieger', feld);
    this.einheitErzeugen(v.id, 'spaeher', feld);
    this.erkunde(v.id, feld, 4);
    v.startfeld = feld;
    return s;
  },

  befehl_neuanfang(v) {
    pruefe(v.art === 'spieler', 'Nur für Spieler.');
    pruefe(!this.staedteVon(v.id).length, 'Du hast noch Städte.');
    pruefe(!this.einheitenVon(v.id).some((e) => e.typ === 'siedler'), 'Du hast noch einen Siedler.');
    for (const e of this.einheitenVon(v.id)) this.einheitEntfernen(e.id);
    const feld = this.startplatz();
    pruefe(feld >= 0, 'Kein freier Platz gefunden.');
    this.aendern(v.id);
    v.schutz_bis = this.t + SCHUTZ.neulingDauer;
    v.gold = Math.max(v.gold, START_LAGER.gold);
    this.startEinheiten(v, feld);
    this.meldung(v.id, 'Neuanfang: Dein Volk sucht eine neue Heimat. Für 24 Stunden bist du wieder geschützt.', { feld, wichtig: true });
    return { feld };
  },

  befehl_tutorial(v, b) {
    v.tutorial = { schritt: Math.max(0, Math.min(99, b.schritt | 0)), fertig: !!b.fertig };
    this.markiere('v' + v.id);
  },
  befehl_meldungen_gelesen(v, b) { v.gelesen_bis = Math.max(v.gelesen_bis || 0, +b.bis || 0); this.markiere('v' + v.id); },
  befehl_politik_waehlen(v, b) {
    pruefe(POLITIK[b.id], 'Unbekannte Sozialpolitik.');
    v.politiken = v.politiken || [];
    pruefe(!v.politiken.includes(b.id), 'Diese Politik hast du schon.');
    pruefe(politikPlaetze(v.kultur_gesamt || 0, v.politiken.length) > 0, 'Dir fehlt noch Kultur für eine weitere Politik.');
    this.aendern(v.id);
    v.politiken.push(b.id);
    delete this._raten[v.id];
    this.markiere('v' + v.id);
  },
  befehl_ping() {},
  befehl_einstellungen(v, b) {
    const e = b.werte && typeof b.werte === 'object' ? b.werte : {};
    v.einstellungen = { ...(v.einstellungen || {}) };
    for (const k of ['ton', 'musik', 'lautstaerke', 'tagnacht', 'wetter']) if (k in e) v.einstellungen[k] = typeof e[k] === 'number' ? Math.max(0, Math.min(1, e[k])) : !!e[k];
    this.markiere('v' + v.id);
  },
};
