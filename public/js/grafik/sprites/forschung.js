// Symbole der Forschungszweige (16x16). Licht von oben links, Umriss automatisch.
import { definiere } from '../sprites.js';
import { PAL } from '../pixel.js';

function z(id, zeilen, pal) { definiere('zweig', id, { w: 16, h: 16, zeichne: (p) => p.karte(0, 0, zeilen, pal) }); }

// Wirtschaft: Münzstapel und Goldmünze
z('wirtschaft', [
  '................',
  '.........hhh....',
  '........hggggd..',
  '.......hgGGGgd..',
  '.......hgGdGgd..',
  '.......hgGGGgd..',
  '..hhhh..gggggd..',
  '.hggggd..dddd...',
  '.dddddd.........',
  '.hggggd..hhhh...',
  '.dddddd.hggggd..',
  '.hggggd.dddddd..',
  '.dddddd.hggggd..',
  '.hggggd.dddddd..',
  '..dddd...dddd...',
  '................',
], { h: '#fff2a0', g: PAL.gold, G: '#ffd94a', d: PAL.goldD });

// Militär: Schwert mit Parierstange
z('militaer', [
  '................',
  '............hh..',
  '...........hes..',
  '..........hes...',
  '.........hes....',
  '........hes.....',
  '.......hes......',
  '..g...hes.......',
  '..gg.hes........',
  '...ggesg........',
  '....ggg.........',
  '...lgGgg........',
  '..ll..gg........',
  '.ll....g........',
  '.k..............',
  '................',
], { h: PAL.eisenH, e: PAL.eisen, s: PAL.eisenD, g: PAL.goldD, G: PAL.gold, l: PAL.leder, k: PAL.gold });

// See: Anker
z('see', [
  '................',
  '.......hh.......',
  '......h..s......',
  '......h..s......',
  '.......ss.......',
  '....hhheesss....',
  '.......es.......',
  '.......es.......',
  '.......es.......',
  '.h.....es.....s.',
  '.he....es....es.',
  '..he...es...es..',
  '...hee.es.ees...',
  '....eeeeeess....',
  '......eess......',
  '................',
], { h: '#9ad0f0', e: '#4a8ac8', s: '#2a5a94' });

// Wissen: aufgeschlagenes Buch und Kolben
z('wissen', [
  '................',
  '..........gg....',
  '..........gg....',
  '.........g..g...',
  '........g.ww.g..',
  '........gwwwwg..',
  '.........gggg...',
  '..wwwwww.wwwww..',
  '.bwwwwwwbwwwwwb.',
  '.bwllllwbwlllwb.',
  '.bwwwwwwbwwwwwb.',
  '.bwllllwbwlllwb.',
  '.bwwwwwwbwwwwwb.',
  '.bbbbbbbbbbbbbb.',
  '..BBBBBBBBBBBB..',
  '................',
], { w: '#f4efe0', l: '#a8a090', b: '#b03a2e', B: '#7a2018', g: '#5ad06a' });

// Staat: Krone
z('staat', [
  '................',
  '................',
  '.......h........',
  '..h...hgg...h...',
  '..gg..ggd..gg...',
  '..ggg.ggd.ggd...',
  '..gggggggggggd..',
  '..ggrggbggrggd..',
  '..gggggggggggd..',
  '..hhhhhhhhhhhd..',
  '..ddddddddddd...',
  '................',
  '................',
  '................',
  '................',
  '................',
], { h: '#fff2a0', g: PAL.gold, d: PAL.goldD, r: '#d0302a', b: '#2e6ab0', S: '#e8dcc0', s: '#b8a880' });

// Industrie: Zahnrad
z('industrie', [
  '................',
  '.......hh.......',
  '...h..heed..d...',
  '..hhehheeeddddd.',
  '...heeeeeeeedd..',
  '...eeee..eeed...',
  '.hheee....eeedd.',
  '.heee......eedd.',
  '.heee......eedd.',
  '..eeee....eeed..',
  '...eeee..eeed...',
  '...heeeeeeeedd..',
  '..hhedeeeedddd..',
  '...d..eedd..d...',
  '.......dd.......',
  '................',
], { h: PAL.eisenH, e: PAL.eisen, d: PAL.stahl });

// Luft: Flugzeug von oben
z('luft', [
  '................',
  '.......hh.......',
  '.......hs.......',
  '.......hs.......',
  '.......hs.......',
  '......hhss......',
  '..hhhhhhssssss..',
  '.hhhhhhhsssssss.',
  '.......hs.......',
  '.......hs.......',
  '.......hs.......',
  '.......hs.......',
  '.....hhhsss.....',
  '....hhhhssss....',
  '.......ss.......',
  '................',
], { h: '#e8eef4', s: '#8a9aaa' });

// Raumfahrt: Rakete mit Flamme
z('raumfahrt', [
  '................',
  '.........rr.....',
  '........rrrd....',
  '.......hwwwsd...',
  '.......hwbbws...',
  '......hwbbbws...',
  '......hwwbwws...',
  '.....hwwwwwws...',
  '.....hwwwwwws...',
  '....rhwwwwwwsr..',
  '...rrhwwwwwwsrr.',
  '...rr.hwwwws.rr.',
  '..rr...ffff...r.',
  '.......fyyf.....',
  '.......yyf......',
  '................',
], { r: '#c0392b', d: '#8a2018', h: '#ffffff', w: '#e4e8ec', s: '#a8b0b8', b: '#5ab0e0', f: '#f39c12', y: '#ffe066' });
