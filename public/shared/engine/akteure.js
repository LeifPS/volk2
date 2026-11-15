// Lebendige Welt: KI-Völker, Stadtstaaten, Barbaren, Raubtiere, Naturereignisse, Jahreszeiten.
// Alle Akteure werden nur bei fälligen Ereignissen simuliert (kein Dauertakt) und sind deterministisch (Spiel-Zufall).
import { karte, startWert, stadtGelaendeOk } from '../karte.js';
import { ANZAHL, abstand, nachbarn, umkreis } from '../hex.js';
import { GELAENDE } from '../daten/gelaende.js';
import { EINHEIT, EINHEITEN, GEB, GEBAEUDE, FORSCHUNGEN, FORSCHUNG, BARBARENLAGER, VERBESSERUNG } from '../daten/index.js';
import { STD, MIN, TAG, KAMPF } from '../regeln.js';
import { bereichVon, istMilitaer, schichtVon } from './einheiten.js';
import { SpielFehler } from './spiel.js';

const KI_MAX_ZEITALTER = 5;
const KI_MAX_STAEDTE = { haendler: 4, forscher: 3, bauer: 5, krieger: 4, seefahrer: 4 };
const PERSOENLICHKEIT_KATEGORIEN = {
  haendler: ['gold', 'nahrung', 'kultur', 'wissen', 'zufriedenheit', 'produktion', 'verteidigung', 'see'],
  forscher: ['wissen', 'nahrung', 'zufriedenheit', 'gold', 'produktion', 'kultur', 'verteidigung'],
  bauer: ['nahrung', 'produktion', 'zufriedenheit', 'gold', 'wissen', 'infrastruktur', 'verteidigung'],
  krieger: ['militaer', 'verteidigung', 'produktion', 'nahrung', 'gold', 'wissen'],
  seefahrer: ['see', 'gold', 'nahrung', 'wissen', 'produktion', 'verteidigung'],
  stadtstaat: ['verteidigung', 'nahrung', 'gold', 'kultur', 'wissen', 'zufriedenheit'],
};

export const akteure = {
  barbarenVolk() { return this.alleVoelker().find((v) => v.art === 'barbar'); },
  tierVolk() { return this.alleVoelker().find((v) => v.art === 'tiere'); },
  spielerOnline() { return this.alleVoelker().some((v) => v.art === 'spieler' && (v.verbunden > 0 || this.t - (v.letzte_aktivitaet || 0) < 6 * STD)); },

  // ---------- KI ----------
  kiDenken(vid) {
    const v = this.z.voelker[vid];
    const ki = v.ki;
    const intervall = (v.ki.bot ? 30 : this.spielerOnline() ? 35 : 150) * MIN;
    ki.denken_um = this.t + intervall + Math.floor(this.zufall() * 10 * MIN);
    this.markiere('v' + vid);
    try {
      this.kiForschung(v);
      for (const s of this.staedteVon(vid)) this.kiStadt(v, s);
      this.kiEinheiten(v);
      if (v.art === 'ki') this.kiDiplomatie(v);
      if (v.ki.bot) this.botExtras?.(v);
    } catch (e) {
      if (!(e instanceof SpielFehler)) this.fehlerProtokoll('KI ' + v.name + ': ' + (e.stack || e));
    }
  },

  kiForschung(v) {
    if (v.forschung.aktiv) return;
    const max = v.ki.maxZeitalter ?? (v.art === 'stadtstaat' ? 4 : KI_MAX_ZEITALTER);
    const kand = FORSCHUNGEN.filter((f) => !f.wiederholbar && f.zeitalter <= max && this.forschungMoeglich(v, f.id));
    if (!kand.length) return;
    kand.sort((a, b) => a.dauer - b.dauer || a.spalte - b.spalte || (a.id < b.id ? -1 : 1));
    this.aendern(v.id);
    this.forschungWechseln(v, kand[Math.floor(this.zufall() * Math.min(3, kand.length))].id);
  },

  kiStadt(v, s) {
    if ((s.bau || []).length || (s.schlange || []).length) return;
    const pers = v.ki.persoenlichkeit || 'bauer';
    const eigene = this.einheitenVon(v.id);
    const mil = eigene.filter((e) => istMilitaer(EINHEIT[e.typ]) && bereichVon(EINHEIT[e.typ]) === 'land');
    const krieg = this.hatKrieg(v.id);
    const wunsch = [];
    const garnisonSoll = v.art === 'stadtstaat' ? 2 : krieg ? 2 : 1;
    const hier = mil.filter((e) => abstand(e.feld, s.feld) <= 2).length;
    if (hier < garnisonSoll) wunsch.push(['einheit', this.kiBesteEinheit(v, s, 'nahkampf')]);
    if (krieg && mil.length < this.staedteVon(v.id).length * 3) wunsch.push(['einheit', this.kiBesteEinheit(v, s, this.zufall() < 0.5 ? 'fernkampf' : 'nahkampf')]);
    if (v.art === 'ki' || v.ki.bot) {
      const arbeiter = eigene.filter((e) => EINHEIT[e.typ].faehigkeiten?.includes('arbeiten')).length;
      if (arbeiter < Math.min(4, this.staedteVon(v.id).length)) wunsch.push(['einheit', 'arbeiter']);
      const siedler = eigene.filter((e) => EINHEIT[e.typ].faehigkeiten?.includes('gruenden')).length;
      if (!siedler && s.bev >= 3 && this.staedteVon(v.id).length < (v.ki.maxStaedte || KI_MAX_STAEDTE[pers] || 5) && this.t - (v.ki.letzter_siedler || 0) > (v.ki.siedlerAbstand || 20 * STD)) wunsch.push(['einheit', 'siedler']);
    }
    // Gebäude nach Persönlichkeit
    const kat = PERSOENLICHKEIT_KATEGORIEN[v.art === 'stadtstaat' ? 'stadtstaat' : pers] || PERSOENLICHKEIT_KATEGORIEN.bauer;
    const geb = GEBAEUDE.filter((g) => !this.bauHindernis(s, 'gebaeude', g.id))
      .sort((a, b) => (kat.indexOf(a.kategorie) + 1 || 99) * 2 + a.kosten.zeit / 3600 - ((kat.indexOf(b.kategorie) + 1 || 99) * 2 + b.kosten.zeit / 3600));
    const bezahlbar = geb.find((g) => this.kannBezahlen(v, g.kosten).ok);
    if (bezahlbar) wunsch.push(['gebaeude', bezahlbar.id]);
    for (const [art, id] of wunsch) {
      if (!id || this.bauHindernis(s, art, id)) continue;
      const kosten = this.bauKosten(s, art, id);
      if (!this.kannBezahlen(v, kosten).ok) continue;
      s.schlange.push({ art, id });
      if (id === 'siedler') v.ki.letzter_siedler = this.t;
      this.bauSchlangeWeiter(s.id);
      return;
    }
  },

  kiBesteEinheit(v, s, klasse) {
    const l = EINHEITEN.filter((d) => d.klasse === klasse && !this.bauHindernis(s, 'einheit', d.id) && this.kannBezahlen(v, d.kosten).ok);
    l.sort((a, b) => b.staerke + (b.fern || 0) - (a.staerke + (a.fern || 0)));
    return l[0]?.id;
  },

  kiEinheiten(v) {
    for (const e of this.einheitenVon(v.id)) {
      if (!this.z.einheiten[e.id] || e.pfad?.length || e.arbeit || e.route) continue;
      const d = EINHEIT[e.typ];
      if (d.faehigkeiten?.includes('gruenden')) { this.kiSiedler(v, e); continue; }
      if (d.faehigkeiten?.includes('arbeiten')) { if (e.modus !== 'auto_arbeit') { e.modus = 'auto_arbeit'; this.autoArbeitWeiter(e); } continue; }
      if (d.faehigkeiten?.includes('handel')) continue;
      if (!istMilitaer(d) || bereichVon(d) !== 'land') continue;
      // Feinde im eigenen Gebiet oder daneben angreifen (nie Spielerstädte)
      let ziel = null;
      for (const i of umkreis(e.feld, Math.max(2, (d.reichweite || 0) + 1))) {
        for (const u of this.einheitenAuf(i)) {
          if (u.volk === v.id || this.kampfHindernis(v.id, u.volk)) continue;
          const bes = this.besitzer(u.feld);
          const gegner = this.z.voelker[u.volk];
          if (gegner.art === 'spieler' && bes !== v.id && !(v.ki.rache?.[u.volk] > this.t)) continue;
          ziel = u; break;
        }
        if (ziel) break;
      }
      if (ziel && !(e.abkling_bis > this.t) && this.aktuelleHp(e) > 45) {
        try { this.befehl_angreifen(v, { einheit: e.id, ziel: ziel.feld }); } catch (err) { if (!(err instanceof SpielFehler)) throw err; }
        continue;
      }
      // sonst zurück in die nächste eigene Stadt und befestigen
      const st = this.staedteVon(v.id).sort((a, b) => abstand(a.feld, e.feld) - abstand(b.feld, e.feld))[0];
      if (st && abstand(st.feld, e.feld) > 1) this.bewegeNach(e, st.feld, { still: true }) || this.bewegeNach(e, st.feld, { still: true, nachbar: true });
      else if (e.modus !== 'befestigt') { e.modus = 'befestigt'; e.modus_seit = this.t; this.markiere('e' + e.id); }
    }
  },

  kiSiedler(v, e) {
    if (e.ziel_feld != null && e.feld === e.ziel_feld) {
      if (!this.stadtGruendenHindernis(v.id, e.feld)) { this.stadtGruenden(v.id, e.feld, this.stadtName(v)); this.einheitEntfernen(e.id); return; }
      e.ziel_feld = null;
    }
    let best = -1, bestW = 0;
    for (const i of umkreis(e.feld, 9)) {
      if (this.stadtGruendenHindernis(v.id, i)) continue;
      if (this.besitzer(i) != null && this.besitzer(i) !== v.id) continue;
      const w = startWert(i) - abstand(i, e.feld) * 1.5;
      if (w > bestW) { bestW = w; best = i; }
    }
    if (best < 0) { this.einheitEntfernen(e.id); return; }
    e.ziel_feld = best;
    if (best === e.feld) { this.stadtGruenden(v.id, e.feld, this.stadtName(v)); this.einheitEntfernen(e.id); return; }
    if (!this.bewegeNach(e, best, { still: true })) { this.einheitEntfernen(e.id); }
  },

  kiDiplomatie(v) {
    const ki = v.ki;
    // Truppen fremder Spieler im eigenen Gebiet verärgern
    const gebiet = new Set(this.staedteVon(v.id).flatMap((s) => s.gebiet));
    const eindringlinge = new Set();
    for (const e of this.alleEinheiten()) {
      if (e.volk === v.id || !gebiet.has(e.feld)) continue;
      const o = this.z.voelker[e.volk];
      if (o?.art !== 'spieler' || !istMilitaer(EINHEIT[e.typ])) continue;
      if (this.verbuendet(v.id, o.id)) continue;
      eindringlinge.add(o.id);
    }
    ki.eindringen = ki.eindringen || {};
    for (const o of eindringlinge) {
      ki.eindringen[o] = (ki.eindringen[o] || 0) + 1;
      if (ki.eindringen[o] === 2) this.meldung(o, `${v.name}: "Eure Truppen in unserem Land beunruhigen uns. Zieht sie ab!"`, { art: 'diplomatie', wichtig: true });
      if (ki.eindringen[o] >= 4) { this.kiKraenkung(v.id, o, 8); ki.eindringen[o] = 2; }
    }
    for (const k of Object.keys(ki.eindringen)) if (!eindringlinge.has(+k)) ki.eindringen[k] = 0;
    // Gekränkt genug? Dann (nur gegen online und ungeschützte Spieler) Krieg erklären
    for (const [o, wert] of Object.entries(ki.groll || {})) {
      const ov = this.z.voelker[o];
      if (!ov || wert < 60 || this.imKrieg(v.id, +o)) continue;
      if (ov.art === 'spieler' && (ov.schutz_bis > this.t || !this.istOnline(+o))) continue;
      this.kiKriegErklaeren(v, +o, 'Ihr habt uns zu oft beleidigt. Jetzt antworten wir mit Waffen!');
    }
    // Groll vergeht langsam
    for (const o of Object.keys(ki.groll || {})) ki.groll[o] = Math.max(0, ki.groll[o] - 1.5);
    // Kriege unter KI-Völkern (selten, kurz)
    if (this.zufall() < 0.012) {
      const nachbar = this.alleVoelker().find((o) => o.art === 'ki' && o.id !== v.id && this.kennt(v.id, o.id) && !this.imKrieg(v.id, o.id));
      if (nachbar) this.kiKriegErklaeren(v, nachbar.id, 'Grenzstreitigkeiten!');
    }
  },

  kiKriegErklaeren(v, o, grund) {
    const d = this.diplo(v.id, o);
    if (d.krieg) return;
    this.aendern(v.id); this.aendern(o);
    Object.assign(d, { krieg: true, seit: this.t, letzter_kampf: this.t, offene_grenzen: false, buendnis: false });
    this.markiere('d' + this.diploSchluessel(v.id, o));
    if (this.z.voelker[o].art === 'spieler') { v.ki.rache = v.ki.rache || {}; v.ki.rache[o] = this.t + 6 * STD; }
    this.meldung(o, `${v.name} erklärt dir den Krieg: "${grund}"`, { art: 'krieg', wichtig: true });
    for (const x of this.alleVoelker()) if (x.art === 'spieler' && x.id !== o && this.kennt(x.id, v.id)) this.meldung(x.id, `${v.name} hat ${this.z.voelker[o].name} den Krieg erklärt.`, { art: 'krieg' });
    this.diploTimer();
    delete this._raten[v.id]; delete this._raten[o];
  },

  /** Eine KI oder ein Stadtstaat wurde schlecht behandelt. */
  kiKraenkung(kid, taeter, wert) {
    const k = this.z.voelker[kid];
    if (!k || (k.art !== 'ki' && k.art !== 'stadtstaat') || !k.ki) return;
    k.ki.groll = k.ki.groll || {};
    k.ki.groll[taeter] = Math.min(100, (k.ki.groll[taeter] || 0) + wert);
    if (k.art === 'ki' && this.imKrieg(kid, taeter) && this.z.voelker[taeter]?.art === 'spieler') { k.ki.rache = k.ki.rache || {}; k.ki.rache[taeter] = this.t + 6 * STD; }
    if (k.art === 'stadtstaat' && k.einfluss) { this.aendern(taeter); k.einfluss[taeter] = Math.max(-60, (k.einfluss[taeter] || 0) - wert); delete this._raten[taeter]; }
    this.markiere('v' + kid);
  },

  /** KI/Stadtstaat entscheidet über ein Angebot. */
  kiAngebotPruefen(a, kid) {
    const k = this.z.voelker[kid];
    if (!k || !this.z.angebote[a.id]) return;
    const groll = k.ki?.groll?.[a.von ?? a.parteien?.find((x) => x !== kid)] || 0;
    let ja = false, grund = '';
    if (a.art === 'frieden') { const d = this.diplo(a.von ?? a.parteien[0], a.an ?? a.parteien[1]); ja = this.t - (d.seit || 0) > 2 * STD && groll < 70; grund = 'Wir sind noch zu wütend.'; }
    else if (a.art === 'offene_grenzen') { ja = groll < 20; grund = 'Wir trauen euch nicht.'; }
    else if (a.art === 'buendnis') { ja = groll < 5 && (k.ki?.freundschaft?.[a.von] || 0) >= 30; grund = 'Dafür kennen wir uns noch nicht gut genug. Handelt mit uns!'; }
    else if (a.art === 'forschungsabkommen') { ja = groll < 10 && k.gold >= a.kosten; grund = 'Dafür fehlt uns das Gold oder das Vertrauen.'; }
    else if (a.art === 'tausch') {
      const wert = (t) => (t.gold || 0) + Object.entries(t.lager || {}).reduce((s, [g, n]) => s + n * (['holz', 'stein'].includes(g) ? 1 : 12), 0) + (t.luxus || []).length * 150 + (t.karte ? 80 : 0);
      try { this.tauschPruefen(k, a.will); ja = wert(a.gibt) >= wert(a.will) * 1.15 && groll < 40; grund = 'Das ist uns zu wenig.'; } catch (e) { ja = false; grund = 'Das haben wir nicht.'; }
    }
    if (a.auto) {
      if (ja) { a.zustimmung[kid] = true; this.markiere('a' + a.id); if (a.parteien.every((x) => a.zustimmung[x])) { this.friedenSchliessen(a.parteien[0], a.parteien[1]); this.angebotEntfernen(a); } }
      return;
    }
    if (ja) {
      try { this.angebotAusfuehren(a); k.ki.freundschaft = k.ki.freundschaft || {}; k.ki.freundschaft[a.von] = (k.ki.freundschaft[a.von] || 0) + 10; }
      catch (e) { if (e instanceof SpielFehler) { this.angebotEntfernen(a); this.meldung(a.von, `${k.name} lehnt ab: ${e.message}`, { art: 'diplomatie' }); } else throw e; }
    } else { this.angebotEntfernen(a); this.meldung(a.von, `${k.name} lehnt ab: "${grund}"`, { art: 'diplomatie' }); }
  },

  // ---------- Barbaren ----------
  barbarenZug() {
    const g = this.z.global;
    g.barbaren_um = this.t + 2 * STD;
    this.markiere('g');
    const b = this.barbarenVolk();
    if (!b) return;
    const spieler = this.alleVoelker().filter((v) => v.art === 'spieler');
    const cap = Math.min(12, 3 + Math.round(spieler.length * 1.5));
    const lager = Object.values(this.z.lager);
    if (lager.length < cap) this.lagerGruenden();
    for (const l of Object.values(this.z.lager)) {
      const einheiten = this.einheitenVon(b.id).filter((e) => e.lager === l.id);
      if (einheiten.length < 2 && this.t >= (l.naechste || 0)) {
        const za = this.zeitalterUmgebung(l.feld);
        const typ = BARBARENLAGER.find((x) => x.id === l.typ) || BARBARENLAGER[0];
        const liste = typ.einheiten_je_zeitalter[Math.max(0, Math.min(6, za - 1))] || ['krieger'];
        const e = this.einheitErzeugen(b.id, liste[Math.floor(this.zufall() * liste.length)], l.feld, {});
        if (e) { e.lager = l.id; e.hp = 85; }
        l.naechste = this.t + (3 + this.zufall() * 3) * STD;
        this.markiere('b' + l.id);
      }
    }
    for (const e of this.einheitenVon(b.id)) this.barbarHandeln(b, e);
    this.tiereNachfuellen();
  },

  zeitalterUmgebung(feld) {
    let z = 0, n = 0;
    for (const v of this.alleVoelker()) {
      if (v.art !== 'spieler' && v.art !== 'ki') continue;
      const s = this.staedteVon(v.id).find((x) => abstand(x.feld, feld) < 25);
      if (s) { z += v.zeitalter || 0; n++; }
    }
    return n ? Math.floor(z / n) : 0;
  },

  lagerGruenden() {
    const k = karte();
    const typen = BARBARENLAGER;
    for (let versuch = 0; versuch < 60; versuch++) {
      const i = Math.floor(this.zufall() * ANZAHL);
      const g = GELAENDE[k.gelaende[i]];
      if (g.wasser || g.hoehe >= 3 || this.besitzer(i) != null || this.einheitenAuf(i).length) continue;
      if (this.alleStaedte().some((s) => abstand(s.feld, i) < 8)) continue;
      if (Object.values(this.z.lager).some((l) => abstand(l.feld, i) < 8)) continue;
      // nicht in Sicht eines Spielers
      if (this.alleEinheiten().some((e) => this.z.voelker[e.volk]?.art === 'spieler' && abstand(e.feld, i) <= 4)) continue;
      const passend = typen.filter((t) => t.gelaende.includes(g.id));
      const typ = (passend.length ? passend : typen)[Math.floor(this.zufall() * (passend.length || typen.length))];
      const id = this.neueId();
      this.z.lager[id] = { id, feld: i, typ: typ.id, entstanden: this.t, naechste: this.t + STD };
      this.markiere('b' + id);
      return;
    }
  },

  barbarHandeln(b, e) {
    if (e.pfad?.length || e.abkling_bis > this.t) return;
    const d = EINHEIT[e.typ];
    // Ziel: angreifbare Einheit oder Verbesserung in der Nähe
    let best = null, bestW = Infinity;
    for (const i of umkreis(e.feld, 7)) {
      for (const u of this.einheitenAuf(i)) {
        if (u.volk === b.id || this.kampfHindernis(b.id, u.volk)) continue;
        if (this.z.voelker[u.volk]?.art === 'tiere') continue;
        const w = abstand(i, e.feld) + (istMilitaer(EINHEIT[u.typ]) ? 2 : 0);
        if (w < bestW) { bestW = w; best = { art: 'einheit', feld: i }; }
      }
      const f = this.z.felder[i];
      if (f && f.v && !(f.pl > this.t) && !this.stadtAuf(i)) {
        const bes = this.besitzer(i);
        if (bes != null && !this.kampfHindernis(b.id, bes) && !this.einheitenAuf(i).length) {
          const w = abstand(i, e.feld) + 1;
          if (w < bestW) { bestW = w; best = { art: 'pluendern', feld: i }; }
        }
      }
    }
    if (best && best.art === 'einheit') {
      const dist = abstand(e.feld, best.feld);
      const fern = (d.fern || 0) > 0 && (d.reichweite || 0) >= dist;
      if (dist === 1 || fern) { try { this.angriffAusfuehren(e, best.feld); } catch (err) { if (!(err instanceof SpielFehler)) throw err; } }
      else { this.bewegeNach(e, best.feld, { still: true, nachbar: true, spaeter: true }); e.angriff = best.feld; if (this.z.global.partie) { this.bewegungAusfuehren(e); if (this.z.einheiten[e.id] && !e.pfad?.length && e.angriff != null) this.ankunft(e); } }
      return;
    }
    if (best && best.art === 'pluendern') {
      if (e.feld === best.feld) {
        const bes = this.besitzer(e.feld);
        this.aendern(bes);
        this.setzeFeld(e.feld, { pl: this.t + 8 * STD });
        this.ablaufPlanen(bes, this.t + 8 * STD);
        this.meldung(bes, `Barbaren haben ${VERBESSERUNG[this.z.felder[e.feld].v]?.name || 'eine Verbesserung'} geplündert!`, { art: 'kampf', feld: e.feld, wichtig: true });
        delete this._raten[bes];
      } else this.bewegeNach(e, best.feld, { still: true });
      return;
    }
    // Herumstreifen in der Nähe des Lagers
    const l = this.z.lager[e.lager];
    const mitte = l ? l.feld : e.feld;
    const kand = umkreis(mitte, 4).filter((i) => this.platzFrei(b.id, d, i, e.id) && this.bewegungsKostenRoh(b.id, d, i, i, true) < Infinity && this.besitzer(i) == null);
    if (kand.length) this.bewegeNach(e, kand[Math.floor(this.zufall() * kand.length)], { still: true });
  },

  lagerZerstoert(l, e) {
    delete this.z.lager[l.id];
    this.markiere('b' + l.id);
    const v = this.z.voelker[e.volk];
    const typ = BARBARENLAGER.find((x) => x.id === l.typ);
    const gold = (typ?.belohnung_gold || 50) + 20 * (v.zeitalter || 0);
    this.aendern(v.id);
    v.gold += gold;
    e.ep = (e.ep || 0) + 8;
    this.markiere('e' + e.id);
    for (const x of this.alleEinheiten()) if (x.lager === l.id) x.lager = null;
    this.meldung(v.id, `Barbarenlager zerstört! Du erbeutest ${gold} Gold, deine Einheit sammelt Erfahrung.`, { art: 'kampf', feld: l.feld, wichtig: true });
  },

  // ---------- Raubtiere ----------
  tiereNachfuellen() {
    const t = this.tierVolk(); if (!t) return;
    const soll = 26;
    const da = this.einheitenVon(t.id).length;
    const k = karte();
    for (let n = da, versuch = 0; n < soll && versuch < 200; versuch++) {
      const i = Math.floor(this.zufall() * ANZAHL);
      const g = GELAENDE[k.gelaende[i]].id;
      const typ = g === 'dschungel' ? (this.zufall() < 0.5 ? 'tiger' : 'jaguar') : g === 'tundra' ? 'wolf' : g === 'schnee' ? 'schneeleopard' : g === 'wald' ? 'baer' : g === 'sumpf' || g === 'mangroven' ? 'krokodil' : null;
      if (!typ || this.besitzer(i) != null || this.einheitenAuf(i).length) continue;
      if (this.alleStaedte().some((s) => abstand(s.feld, i) < 6)) continue;
      const e = this.einheitErzeugen(t.id, 'raubtier', i, {});
      if (e) { e.tier = typ; n++; }
    }
  },

  /** Wird nach jedem Schritt einer Einheit aufgerufen: Lager betreten, Raubtiere. */
  nachSchritt(e) {
    const v = this.z.voelker[e.volk];
    if (!v || v.art === 'tiere' || v.art === 'barbar') return;
    const d = EINHEIT[e.typ];
    const l = Object.values(this.z.lager).find((x) => x.feld === e.feld);
    if (l && istMilitaer(d)) { this.lagerZerstoert(l, e); return; }
    if (bereichVon(d) !== 'land') return;
    const t = this.tierVolk(); if (!t) return;
    for (const n of nachbarn(e.feld)) for (const r of this.einheitenAuf(n)) {
      if (r.volk !== t.id || r.abkling_bis > this.t) continue;
      if (this.kampfHindernis(t.id, e.volk)) return;
      this.raubtierAngriff(r, e);
      return;
    }
  },

  raubtierAngriff(r, e) {
    const d = EINHEIT[e.typ];
    const D = this.einheitStaerke(e, 'verteidigung', 'nah', { einheit: r });
    const A = EINHEIT.raubtier ? EINHEIT.raubtier.staerke : 16;
    let dmg = Math.round(30 * Math.pow(1.0417, A - D.wert) * (0.8 + 0.4 * this.zufall()));
    if (d.klasse === 'spaeher' || !istMilitaer(d)) dmg = Math.round(dmg * 0.5);
    this.hpAbrechnen(e);
    dmg = Math.max(0, Math.min(dmg, e.hp - KAMPF.raubtierMinHp));
    if (dmg <= 0) return;
    e.hp -= dmg;
    r.abkling_bis = this.t + 30 * MIN;
    this.markiere('e' + e.id); this.markiere('e' + r.id);
    this.ausgehend.push({ art: 'kampf', von: r.feld, nach: e.feld, schadenA: 0, schadenV: dmg, t: this.t });
    const name = { wolf: 'Ein Wolfsrudel', baer: 'Ein Bär', tiger: 'Ein Tiger', jaguar: 'Ein Jaguar', krokodil: 'Ein Krokodil', schneeleopard: 'Ein Schneeleopard' }[r.tier] || 'Ein Raubtier';
    this.meldung(e.volk, `${name} hat ${d.name} angefallen (${dmg} Schaden).${d.klasse === 'spaeher' ? ' Der Späher konnte fliehen.' : ''}`, { art: 'kampf', feld: e.feld });
  },

  // ---------- Natur und Jahreszeiten ----------
  naturZug() {
    const g = this.z.global;
    g.natur_um = this.t + (10 + this.zufall() * 10) * STD;
    this.markiere('g');
    const k = karte();
    const staedte = this.alleStaedte().filter((s) => this.z.voelker[s.volk]?.art === 'spieler');
    if (!staedte.length) return;
    const s = staedte[Math.floor(this.zufall() * staedte.length)];
    const gel = GELAENDE[k.gelaende[s.feld]].id;
    const fluss = umkreis(s.feld, 3).some((i) => k.fluss[i]);
    let typ = null;
    if (['savanne', 'wueste', 'ebene', 'salzebene'].includes(gel)) typ = 'duerre';
    else if (fluss) typ = 'flut';
    if (!typ) return;
    const felder = umkreis(s.feld, 4).filter((i) => typ === 'flut' ? k.fluss[i] : ['savanne', 'wueste', 'ebene', 'grasland', 'salzebene'].includes(GELAENDE[k.gelaende[i]].id));
    const id = this.neueId();
    const ev = { id, typ, felder, mitte: s.feld, start: this.t + 3 * STD, ende: this.t + (typ === 'duerre' ? 15 : 9) * STD, aktiv: false, nahrung: -1 };
    (g.ereignisse ||= []).push(ev);
    const betroffen = new Set(felder.map((i) => this.besitzer(i)).filter((x) => x != null));
    for (const vid of betroffen) this.meldung(vid, typ === 'duerre' ? `Vorwarnung: In 3 Stunden beginnt bei ${s.name} eine Dürre (12 Stunden lang -1 Nahrung auf trockenen Feldern). Nichts wird zerstört.` : `Vorwarnung: In 3 Stunden tritt bei ${s.name} der Fluss über die Ufer (6 Stunden lang -1 Nahrung an Flussfeldern). Nichts wird zerstört.`, { art: 'natur', feld: s.feld, wichtig: true });
  },

  naturSchritt(id) {
    const g = this.z.global;
    const ev = (g.ereignisse || []).find((x) => x.id === id);
    if (!ev) return;
    // Nur Völker, die beim Beginn online sind, sind betroffen (Offline schützt)
    const betroffen = [...new Set(ev.felder.map((i) => this.besitzer(i)).filter((x) => x != null))];
    if (!ev.aktiv) {
      ev.betroffen = betroffen.filter((x) => this.istOnline(x));
      for (const vid of ev.betroffen) this.aendern(vid);
      ev.aktiv = true;
      for (const vid of ev.betroffen) { delete this._raten[vid]; this.meldung(vid, ev.typ === 'duerre' ? 'Die Dürre hat begonnen.' : 'Die Flut ist da.', { art: 'natur', feld: ev.mitte }); }
    } else {
      for (const vid of ev.betroffen || []) this.aendern(vid);
      g.ereignisse = g.ereignisse.filter((x) => x.id !== id);
      this._evSets?.delete(id);
      for (const vid of ev.betroffen || []) { delete this._raten[vid]; this.meldung(vid, ev.typ === 'duerre' ? 'Die Dürre ist vorbei.' : 'Das Hochwasser ist zurückgegangen.', { art: 'natur', feld: ev.mitte }); }
    }
    this.markiere('g');
  },

  jahreszeitWechsel() {
    const g = this.z.global;
    this.allesAendern();
    g.jahreszeit = ((g.jahreszeit || 0) + 1) % 4;
    g.jahreszeit_um = this.t + 2 * TAG;
    for (const v of this.alleVoelker()) delete this._raten[v.id];
    this.markiere('g');
  },
};
