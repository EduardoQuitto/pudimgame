// Progressão: XP/níveis + combo com janela de tempo.
import { xpNext } from '../data/Data.js';

export class Progression {
  constructor(save) {
    this.s = save;
    this.combo = 0; this.comboT = 0;
  }
  addXP(v, onLevelUp) {
    const d = this.s.data;
    d.xp += v;
    while (d.xp >= xpNext(d.level)) {
      d.xp -= xpNext(d.level);
      d.level++;
      if (onLevelUp) onLevelUp(d.level);
    }
  }
  comboMul() { return this.combo <= 1 ? 1 : 1 + (this.combo - 1) * 0.15; }
  hitCombo() {
    this.combo++;
    this.comboT = 14;
    if (this.combo > this.s.data.stats.bestCombo) {
      this.s.data.stats.bestCombo = this.combo;
      this.s.data.comboBest = this.combo;
    }
    return this.combo;
  }
  breakCombo() { this.combo = 0; this.comboT = 0; }
  update(dt) {
    if (this.combo > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.breakCombo();
    }
  }
}
