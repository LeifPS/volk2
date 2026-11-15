// Bauen: Stadtgebäude, Einheiten und Wunder in Städten (Bauplätze + Warteschlange) und Feldverbesserungen durch Arbeiter.
import { karte } from '../karte.js';
import { abstand, nachbarn, umkreis } from '../hex.js';
import { GELAENDE } from '../daten/gelaende.js';
import { ROHSTOFFE } from '../daten/rohstoffe.js';
import { GEB, WUNDER_NACH_ID, EINHEIT, VERBESSERUNG, FREIGESCHALTET_DURCH } from '../daten/index.js';
import { bauDauer, bauTempo, rundenDauerMs, RUNDEN_DAUER, anfangsTempo, kiBoni, ABBRUCH_ERSTATTUNG, STD, MIN } from '../regeln.js';
import { pruefe } from './spiel.js';
import { sucheWeg } from '../pfad.js';

export const bau = {
  /** Ist etwas für das Volk per Forschung freigeschaltet? */
  freigeschaltet(v, art, id) {
    if (art === 'gebaeude' && id === 'palast') return true;
    const f = FREIGESCHALTET_DURCH[art + ':' + id];
    return !f || !!v.forschung.erforscht[f];
  },
  hatOption(v, id) { return this.freigeschaltet(v, 'option', id); },

  bauplaetze(s) {
    const v = this.z.voelker[s.volk];
    let n = 1;
    if (this.hatOption(v, 'bauplatz_2')) n++;
    if (this.hatOption(v, 'bauplatz_3')) n++;
    n += this.gebaeudeSumme(s, 'bauplaetze');
    n += this.raten(s.volk).boni.bauplaetze || 0;
    return Math.max(1, Math.min(3, n));
  },

  istKuestenstadt(s) { return nachbarn(s.feld).some((n) => GELAENDE[karte().gelaende[n]].wasser); },
  istFlussstadt(s) { const k = karte(); return !!k.fluss[s.feld] || nachbarn(s.feld).some((n) => k.fluss[n] || GELAENDE[k.gelaende[n]].suesswasser); },

  bauDaten(art, id) {
    if (typeof id !== 'string') return null;
    const t = art === 'gebaeude' ? GEB : art === 'wunder' ? WUNDER_NACH_ID : art === 'einheit' ? EINHEIT : null;
    return t && Object.hasOwn(t, id) && id !== 'raubtier' ? t[id] : null;
  },

  /** Grund, warum etwas nicht gebaut werden kann (oder null). Prüft keine Kosten. */
  bauHindernis(s, art, id) {
    const v = this.z.voelker[s.volk];
    const d = this.bauDaten(art, id);
    if (!d) return 'Unbekannter Bauauftrag.';
    if (!this.freigeschaltet(v, art, id)) return `Dafür fehlt die Forschung "${this.forschungsName(FREIGESCHALTET_DURCH[art + ':' + id])}".`;
    const laufend = [...(s.bau || []), ...(s.schlange || [])];
    if (art === 'gebaeude') {
      if (id === 'palast') return 'Den Palast hat nur die Hauptstadt.';
      if (s.gebaeude[id]) return 'Dieses Gebäude steht hier schon.';
      if (laufend.some((b) => b.art === art && b.id === id)) return 'Dieses Gebäude ist schon im Bau oder in der Warteschlange.';
      if (d.ersetzt && !s.gebaeude[d.ersetzt] && !laufend.some((b) => b.id === d.ersetzt)) return `Zuerst wird "${GEB[d.ersetzt]?.name}" gebraucht.`;
      for (const n of d.benoetigt || []) if (!s.gebaeude[n] && !laufend.some((b) => b.id === n)) return `Zuerst wird "${GEB[n]?.name || n}" gebraucht.`;
      // ein Gebäude, das schon durch eine höhere Stufe ersetzt wurde
      for (const gid of Object.keys(s.gebaeude)) if (this.ersetztKette(gid).includes(id)) return 'Hier steht schon eine bessere Stufe.';
    }
    if (art === 'wunder') {
      if (this.z.wunder[id]?.fertig) return `Dieses Wunder hat bereits ${this.volk(this.z.wunder[id].volk)?.name || 'jemand'} gebaut.`;
      for (const st of this.staedteVon(v.id)) if ([...(st.bau || []), ...(st.schlange || [])].some((b) => b.art === 'wunder' && b.id === id)) return `Dieses Wunder wird schon in ${st.name} gebaut.`;
      for (const n of d.benoetigt || []) if (!s.gebaeude[n]) return `Zuerst wird "${GEB[n]?.name || n}" gebraucht.`;
    }
    if (d.braucht_kueste && !this.istKuestenstadt(s)) return 'Das geht nur in einer Stadt an der Küste.';
    if (d.braucht_fluss && !this.istFlussstadt(s)) return 'Das geht nur in einer Stadt an einem Fluss oder See.';
    if (art === 'einheit') {
      const bereich = this.bereich(d);
      if (bereich === 'see' && !this.istKuestenstadt(s)) return 'Schiffe können nur in Küstenstädten gebaut werden.';
      if (bereich === 'luft' && !this.luftPlatzFrei(s)) return 'Hier ist kein Platz für weitere Flugzeuge (Flughafen bauen).';
      if (d.faehigkeiten?.includes('gruenden') && s.bev < 2) return 'Siedler brauchen eine Stadt mit mindestens 2 Einwohnern (1 Einwohner zieht mit).';
    }
    return null;
  },

  ersetztKette(gid) { const l = []; let d = GEB[gid]; while (d && d.ersetzt) { l.push(d.ersetzt); d = GEB[d.ersetzt]; } return l; },

  bauKosten(s, art, id) {
    const d = this.bauDaten(art, id);
    return { ...d.kosten };
  },

  bauDauerMs(s, art, id) {
    const d = this.bauDaten(art, id);
    const r = this.raten(s.volk);
    const sr = r.staedte[s.id] || { p: 0 };
    let prozent = r.boni.bauzeit_prozent || 0;
    if (art === 'einheit') prozent += this.gebaeudeSumme(s, 'einheit_bauzeit_prozent');
    const v = this.z.voelker[s.volk];
    if (v.art === 'ki') prozent -= kiBoni(v.ki?.stufe).bau;
    if (this.imRundenModus()) {
      // Civ-Gefühl: Dauer in ganzen Runden, Produktion und Boni verkürzen sie
      const rm = this.partie().rundeMs;
      const basis = rundenDauerMs(d.kosten.zeit, RUNDEN_DAUER.bauFaktor);
      const ms = basis * Math.max(0.25, 1 + prozent / 100) / bauTempo(sr.p);
      return Math.max(1, Math.ceil(ms / rm - 1e-9)) * rm;
    }
    return bauDauer(d.kosten.zeit / anfangsTempo(d.zeitalter || 0), sr.p, prozent);
  },

  /** Befehl: Bauauftrag in die Warteschlange (startet sofort, wenn ein Bauplatz frei ist). */
  befehl_bauen(v, b) {
    const s = this.z.staedte[b.stadt];
    pruefe(s && s.volk === v.id, 'Das ist nicht deine Stadt.');
    pruefe(['gebaeude', 'einheit', 'wunder'].includes(b.typ), 'Unbekannte Bauart.');
    const h = this.bauHindernis(s, b.typ, b.id);
    pruefe(!h, h);
    pruefe((s.schlange || []).length < 8, 'Die Warteschlange ist voll (höchstens 8 Aufträge).');
    s.schlange = s.schlange || [];
    const eintrag = { art: b.typ, id: b.id };
    if (b.typ === 'wunder' && b.geheim) eintrag.geheim = true;
    // sofort startbar? Dann Kosten jetzt prüfen und eine klare Meldung geben
    if ((s.bau || []).length < this.bauplaetze(s) && !s.schlange.length) {
      const kosten = this.bauKosten(s, b.typ, b.id);
      const k = this.kannBezahlen(v, kosten);
      if (!k.ok && !b.vormerken) pruefe(false, this.fehltText(kosten, k.fehlt) + ' Du kannst den Auftrag auch vormerken: Er startet automatisch, sobald alles da ist.');
    }
    s.schlange.push(eintrag);
    this.markiere('s' + s.id);
    this.bauSchlangeWeiter(s.id);
    return { stadt: s.id };
  },

  /** Startet Aufträge aus der Warteschlange, solange Bauplätze frei sind und die Kosten bezahlbar. */
  bauSchlangeWeiter(sid) {
    const s = this.z.staedte[sid]; if (!s) return;
    const v = this.z.voelker[s.volk];
    this.abrechnen(v.id);
    s.bau = s.bau || []; s.schlange = s.schlange || [];
    s.warte_um = null;
    while (s.bau.length < this.bauplaetze(s) && s.schlange.length) {
      const n = s.schlange[0];
      const h = this.bauHindernisStart(s, n);
      if (h) { s.schlange.shift(); this.meldung(v.id, `${s.name}: "${this.bauDaten(n.art, n.id)?.name || n.id}" wurde aus der Warteschlange genommen: ${h}`, { art: 'warnung', feld: s.feld }); continue; }
      const kosten = this.bauKosten(s, n.art, n.id);
      if (!this.kannBezahlen(v, kosten).ok) {
        s.warte_um = this.materialZeit(v, kosten);
        if (!s.warte_um) s.warte_um = this.t + 30 * MIN; // regelmäßig erneut prüfen
        break;
      }
      const bezahlt = this.bezahle(v, kosten);
      const dauer = this.bauDauerMs(s, n.art, n.id);
      s.schlange.shift();
      s.bau.push({ art: n.art, id: n.id, start: this.t, fertig_um: this.t + dauer, bezahlt, geheim: n.geheim || undefined });
      if (n.art === 'wunder' && !n.geheim) for (const a of this.alleVoelker()) if (a.id !== v.id && a.art === 'spieler') this.meldung(a.id, `${v.name} hat mit dem Bau des Wunders "${WUNDER_NACH_ID[n.id].name}" begonnen.`, { art: 'wunder' });
    }
    this.markiere('s' + sid);
  },

  /** Wie bauHindernis, aber für einen Eintrag, der gerade aus der Schlange startet (er selbst zählt nicht als "schon in Bau"). */
  bauHindernisStart(s, n) {
    const schl = s.schlange; s.schlange = schl.slice(1);
    try { return this.bauHindernis(s, n.art, n.id); } finally { s.schlange = schl; }
  },

  bauFertig(sid) {
    const s = this.z.staedte[sid]; if (!s) return;
    const fertig = s.bau.filter((b) => b.fertig_um <= this.t).sort((a, b) => a.fertig_um - b.fertig_um);
    if (!fertig.length) return;
    const v = this.z.voelker[s.volk];
    this.aendern(s.volk);
    for (const b of fertig) {
      s.bau = s.bau.filter((x) => x !== b);
      const d = this.bauDaten(b.art, b.id);
      if (b.art === 'gebaeude') {
        if (d.ersetzt) delete s.gebaeude[d.ersetzt];
        s.gebaeude[b.id] = 1;
        if (d.wirkung?.stadt_hp) s.hp = (s.hp ?? this.stadtMaxHp(s)) + d.wirkung.stadt_hp;
        this.meldung(v.id, `${s.name}: ${d.name} ist fertig.`, { art: 'bau', feld: s.feld });
        if (d.wirkung?.sicht) this.erkunde(v.id, s.feld, 2 + d.wirkung.sicht);
      } else if (b.art === 'wunder') {
        if (this.z.wunder[b.id]?.fertig) { this.erstatte(v, b.bezahlt, 1); continue; }
        this.z.wunder[b.id] = { volk: v.id, stadt: s.id, fertig: true, t: this.t };
        this.markiere('w' + b.id);
        this.meldung(v.id, `Weltwunder vollendet: ${d.name} in ${s.name}!`, { art: 'wunder', feld: s.feld, wichtig: true });
        for (const a of this.alleVoelker()) if (a.id !== v.id) this.meldung(a.id, `${v.name} hat das Weltwunder "${d.name}" vollendet.`, { art: 'wunder' });
        this.wunderRennenVerloren(b.id, v.id);
        for (const a of this.alleVoelker()) delete this._raten[a.id];
      } else if (b.art === 'einheit') {
        const e = this.einheitErzeugen(v.id, b.id, s.feld, { stadt: s.id });
        if (d.faehigkeiten?.includes('gruenden')) { s.bev = Math.max(1, s.bev - 1); s.nahrung = 0; if (!s.manuell) this.autoBewirtschaften(s); }
        if (e) this.meldung(v.id, `${s.name}: ${d.name} ist bereit.`, { art: 'einheit', feld: e.feld });
        else this.meldung(v.id, `${s.name}: ${d.name} konnte nicht aufgestellt werden (kein freier Platz). Die Kosten wurden erstattet.`, { art: 'warnung', feld: s.feld });
        if (!e) this.erstatte(v, b.bezahlt, 1);
      }
    }
    delete this._raten[s.volk];
    this.markiere('s' + sid);
    this.bauSchlangeWeiter(sid);
  },

  wunderRennenVerloren(wid, gewinner) {
    for (const s of this.alleStaedte()) {
      if (s.volk === gewinner) continue;
      const vorher = (s.bau || []).filter((b) => b.art === 'wunder' && b.id === wid);
      const schl = (s.schlange || []).filter((b) => b.art === 'wunder' && b.id === wid);
      if (!vorher.length && !schl.length) continue;
      const v = this.z.voelker[s.volk];
      for (const b of vorher) this.erstatte(v, b.bezahlt, 1);
      s.bau = s.bau.filter((b) => !(b.art === 'wunder' && b.id === wid));
      s.schlange = (s.schlange || []).filter((b) => !(b.art === 'wunder' && b.id === wid));
      this.meldung(v.id, `Das Rennen um "${WUNDER_NACH_ID[wid].name}" ist verloren. Das eingesetzte Material wurde vollständig erstattet.`, { art: 'wunder', feld: s.feld, wichtig: true });
      this.markiere('s' + s.id);
      this.bauSchlangeWeiter(s.id);
    }
  },

  befehl_bau_abbrechen(v, b) {
    const s = this.z.staedte[b.stadt];
    pruefe(s && s.volk === v.id, 'Das ist nicht deine Stadt.');
    const nr = b.nr | 0;
    if (b.liste === 'schlange') {
      pruefe(s.schlange && s.schlange[nr], 'Diesen Auftrag gibt es nicht.');
      s.schlange.splice(nr, 1);
    } else {
      pruefe(s.bau && s.bau[nr], 'Diesen Auftrag gibt es nicht.');
      const [x] = s.bau.splice(nr, 1);
      this.erstatte(v, x.bezahlt, ABBRUCH_ERSTATTUNG);
      this.meldung(v.id, `${s.name}: Auftrag abgebrochen, ${Math.round(ABBRUCH_ERSTATTUNG * 100)} % der Kosten wurden erstattet.`, { feld: s.feld });
    }
    this.markiere('s' + s.id);
    this.bauSchlangeWeiter(s.id);
  },

  /** Verschiebt einen Auftrag in der Warteschlange nach vorn. */
  befehl_bau_hoch(v, b) {
    const s = this.z.staedte[b.stadt];
    pruefe(s && s.volk === v.id, 'Das ist nicht deine Stadt.');
    const nr = b.nr | 0;
    pruefe(s.schlange && nr > 0 && nr < s.schlange.length, 'Das geht nicht.');
    [s.schlange[nr - 1], s.schlange[nr]] = [s.schlange[nr], s.schlange[nr - 1]];
    this.markiere('s' + s.id);
    this.bauSchlangeWeiter(s.id);
  },

  // ---------- Feldverbesserungen ----------
  /** Grund, warum Verbesserung id auf Feld i nicht geht (oder null). */
  verbesserungHindernis(v, i, id, einheit) {
    const vb = VERBESSERUNG[id];
    if (!vb) return 'Unbekannte Verbesserung.';
    if (!this.freigeschaltet(v, 'verbesserung', id)) return `Dafür fehlt die Forschung "${this.forschungsName(FREIGESCHALTET_DURCH['verbesserung:' + id])}".`;
    if (this.besitzer(i) !== v.id) return 'Arbeiter dürfen nur innerhalb der eigenen Grenzen bauen.';
    if (this.stadtAuf(i)) return 'Auf einer Stadt kann man nicht bauen.';
    const k = karte();
    const g = GELAENDE[k.gelaende[i]];
    if (vb.wasser && !g.wasser) return 'Das geht nur auf Wasser.';
    if (!vb.wasser && g.wasser) return 'Das geht nur an Land.';
    if (vb.gelaende && vb.gelaende.length && !vb.gelaende.includes(g.id)) return `Nicht auf ${g.name} möglich.`;
    if (vb.rohstoff_pflicht) {
      const rn = k.rohstoff[i]; const r = rn ? ROHSTOFFE[rn - 1] : null;
      if (!r || !vb.rohstoff_pflicht.includes(r.id) || !this.siehtRohstoff(v, r)) return 'Dafür braucht das Feld einen passenden Rohstoff.';
    }
    if (vb.fluss && !k.fluss[i]) return 'Das geht nur an einem Fluss.';
    if (vb.kueste && !nachbarn(i).some((n) => GELAENDE[k.gelaende[n]].wasser)) return 'Das geht nur an der Küste.';
    const f = this.z.felder[i] || {};
    const schicht = vb.schicht || 'feld';
    const vorhanden = schicht === 'weg' ? f.w : schicht === 'bruecke' ? (f.br ? 'bruecke' : null) : f.v;
    if (vorhanden === id) return 'Das ist hier schon gebaut.';
    if (vorhanden && VERBESSERUNG[vorhanden]?.kette === vb.kette && VERBESSERUNG[vorhanden].stufe > vb.stufe) return 'Hier steht schon eine bessere Stufe.';
    if (einheit) {
      const d = this.einheitDaten(einheit);
      if (vb.wasser && !d.faehigkeiten?.includes('see_arbeiten')) return 'Wasser-Verbesserungen baut ein Arbeitsboot.';
      if (!vb.wasser && !d.faehigkeiten?.includes('arbeiten')) return 'Nur Arbeiter können das bauen.';
    }
    return null;
  },

  verbesserungDauer(v, id) {
    const b = this.raten(v.id).boni;
    return Math.max(60 * 1000, Math.round(VERBESSERUNG[id].bauzeit * 1000 / (1 + Math.max(0, b.arbeiter_tempo || 0) / 100) * (v.art === 'ki' ? 1.5 : 1)));
  },

  befehl_arbeiten(v, b) {
    const e = this.eigeneEinheit(v, b.einheit);
    pruefe(!e.pfad?.length, 'Die Einheit ist noch unterwegs.');
    const h = this.verbesserungHindernis(v, e.feld, b.verbesserung, e);
    pruefe(!h, h);
    this.arbeitStarten(e, b.verbesserung);
    if (b.auto) e.modus = 'auto_arbeit';
    else if (e.modus === 'auto_arbeit') e.modus = 'wach';
  },

  arbeitStarten(e, id) {
    const v = this.z.voelker[e.volk];
    e.arbeit = { feld: e.feld, id, start: this.t, fertig_um: this.t + this.verbesserungDauer(v, id) };
    this.markiere('e' + e.id);
  },

  befehl_arbeit_abbrechen(v, b) {
    const e = this.eigeneEinheit(v, b.einheit);
    e.arbeit = null; if (e.modus === 'auto_arbeit') e.modus = 'wach';
    this.markiere('e' + e.id);
  },

  arbeitFertig(eid) {
    const e = this.z.einheiten[eid]; if (!e || !e.arbeit) return;
    const a = e.arbeit; e.arbeit = null;
    this.markiere('e' + eid);
    const v = this.z.voelker[e.volk];
    if (e.feld !== a.feld) return;
    const h = this.verbesserungHindernis(v, a.feld, a.id, e);
    if (h) { this.meldung(v.id, `Bau abgebrochen: ${h}`, { feld: a.feld }); this.autoArbeitWeiter(e); return; }
    this.verbesserungSetzen(a.feld, a.id);
    this.meldung(v.id, `${VERBESSERUNG[a.id].name} fertiggestellt.`, { art: 'bau', feld: a.feld });
    this.autoArbeitWeiter(e);
  },

  verbesserungSetzen(i, id) {
    const vb = VERBESSERUNG[id];
    const vid = this.besitzer(i);
    if (vid != null) this.aendern(vid);
    const schicht = vb.schicht || 'feld';
    if (schicht === 'weg') this.setzeFeld(i, { w: id });
    else if (schicht === 'bruecke') this.setzeFeld(i, { br: true });
    else this.setzeFeld(i, { v: id, pl: null });
    if (vb.sicht && vid != null) this.erkunde(vid, i, vb.sicht);
    if (vid != null) delete this._raten[vid];
  },

  /** Landweg zwischen zwei Feldern durch eigenes oder neutrales Gebiet (für Straßen). */
  landWeg(a, b, vid) {
    const k = karte();
    const w = sucheWeg(a, b, (von, nach) => {
      const g = GELAENDE[k.gelaende[nach]];
      if (g.wasser) return Infinity;
      const bes = this.besitzer(nach);
      if (bes != null && bes !== vid) return Infinity;
      const f = this.z.felder[nach];
      return f?.w ? 0.6 : g.bewegung;
    }, { minKosten: 0.6, maxKnoten: 4000 });
    return w ? w.felder.filter((i) => i !== b) : null;
  },

  autoArbeitWeiter(e) {
    if (e.modus !== 'auto_arbeit') return;
    const ziel = this.autoArbeitZiel(e);
    if (!ziel) { e.modus = 'wach'; this.meldung(e.volk, 'Ein Arbeiter hat nichts mehr zu tun.', { feld: e.feld }); return; }
    if (ziel.feld === e.feld) this.arbeitStarten(e, ziel.id);
    else { const ok = this.bewegeNach(e, ziel.feld, { still: true }); if (ok) e.nach_arbeit = ziel.id; else { e.modus = 'wach'; } }
  },

  /** Wählt automatisch die sinnvollste nächste Verbesserung für einen Arbeiter. */
  autoArbeitZiel(e) {
    const v = this.z.voelker[e.volk];
    const d = this.einheitDaten(e);
    const see = d.faehigkeiten?.includes('see_arbeiten');
    const k = karte();
    const belegt = new Set(this.alleEinheiten().filter((x) => x.id !== e.id && x.arbeit).map((x) => x.arbeit.feld));
    for (const x of this.alleEinheiten()) if (x.id !== e.id && x.nach_arbeit && x.pfad?.length) belegt.add(x.pfad[x.pfad.length - 1].f);
    let best = null, bestW = -Infinity;
    for (const s of this.staedteVon(v.id)) {
      for (const i of s.gebiet) {
        if (belegt.has(i) || i === s.feld) continue;
        if (this.einheitenAuf(i).some((x) => x.volk !== v.id)) continue;
        const g = GELAENDE[k.gelaende[i]];
        if (see !== !!g.wasser) continue;
        const f = this.z.felder[i] || {};
        const rn = k.rohstoff[i]; const r = rn ? ROHSTOFFE[rn - 1] : null;
        const kand = [];
        if (r && this.siehtRohstoff(v, r)) for (const vb of Object.values(VERBESSERUNG)) if (vb.kette === r.verbesserung || r.verbesserung_alt?.includes(vb.kette)) kand.push(vb.id);
        if (!see) {
          if (s.arbeit.includes(i)) for (const id of ['mechanisierte_farm', 'windrad_farm', 'bewaesserte_farm', 'farm', 'industriemine', 'tiefe_mine', 'mine', 'saegewerk', 'holzfaellerlager', 'handelshaus', 'handelsposten']) kand.push(id);
        } else if (s.arbeit.includes(i)) kand.push('aquakultur');
        for (const id of kand) {
          if (this.verbesserungHindernis(v, i, id, e)) continue;
          const vb = VERBESSERUNG[id];
          if (vb.kette === 'mine' && !r && (g.id !== 'huegel')) continue;
          if ((vb.kette === 'handelsposten') && f.v) continue;
          const vorher = this.feldWert(i, v, s);
          let w = (r ? 12 : 0) + (vb.stufe || 1) * 2 + (s.arbeit.includes(i) ? 6 : 0) - abstand(e.feld, i) * 0.7 + vorher * 0.1;
          if (f.v && VERBESSERUNG[f.v]?.kette !== vb.kette) w -= 8;
          if (w > bestW) { bestW = w; best = { feld: i, id }; }
        }
      }
      // Wege zwischen den eigenen Städten (Pfad/Straße)
      if (!see) for (const s2 of this.staedteVon(v.id)) {
        if (s2.id <= s.id || abstand(s.feld, s2.feld) > 12) continue;
        for (const wid of ['autobahn', 'eisenbahn', 'pflasterstrasse', 'strasse', 'pfad']) {
          if (!this.freigeschaltet(v, 'verbesserung', wid)) continue;
          const weg = this.landWeg(s.feld, s2.feld, v.id);
          if (!weg) break;
          for (const i of weg) {
            if (belegt.has(i) || this.stadtAuf(i)) continue;
            if (this.verbesserungHindernis(v, i, wid, e)) continue;
            const w = 9 - abstand(e.feld, i) * 0.7;
            if (w > bestW) { bestW = w; best = { feld: i, id: wid }; }
            break;
          }
          break;
        }
      }
    }
    return best;
  },
};
