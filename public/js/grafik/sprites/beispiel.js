// Beispiel und Qualitätsmaßstab für Einheiten-Sprites (32x32, Füße unten Mitte bei y=30, Blick nach rechts).
// Spielerfarbe über 'S' (Grundton), 'S-' (dunkel), 'S+' (hell). Umriss wird automatisch ergänzt.
import { definiere } from '../sprites.js';
import { PAL } from '../pixel.js';

definiere('einheit', 'krieger', {
  w: 32, h: 32,
  zeichne(p) {
    p.karte(6, 5, [
      '..........hhh...........',
      '.........hHHHh..........',
      '.........hffffh.........',
      '.........fwffwf.........',
      '..........ffff..........',
      '.......SSSSlSSSS........',
      '......SS+SSlSSSSS.k.....',
      '......SS+SSlSSSfffk.....',
      '.....ff.SSSlSSS.ffk.....',
      '.....ff.LLLLLLL..kkk....',
      '.....ff.SSS-SSS..kkk....',
      '.....ff.SS---SS...k.....',
      '......f.SS-.-SS...k.....',
      '........ff...ff...k.....',
      '........ff...ff...k.....',
      '........ff...ff...k.....',
      '.......ddd...ddd..k.....',
      '.......ddd...ddd........',
    ], { h: PAL.haar, H: '#6a4630', f: PAL.haut, w: PAL.schwarz, S: 'S', '+': 'S+', '-': 'S-', l: PAL.leder, L: PAL.lederD, k: PAL.holz, d: PAL.lederD });
    // Keule mit Steinkopf
    p.rect(22, 3, 3, 4, PAL.stein).rect(23, 2, 2, 1, PAL.steinH);
    // Rundschild aus Holz mit Spielerfarben-Mitte
    p.ellipse(9, 16, 4, 5, PAL.holz).ellipse(9, 16, 2, 3, 'S').px(9, 16, PAL.gold);
    // Füße auf y=30 wie bei allen Landeinheiten
    p.schiebe(0, 8);
  },
});
