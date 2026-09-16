// Missões: progresso automático a partir das stats, recompensa auto-resgatada.
import { MISSIONS } from '../data/Data.js';

export class Missions {
  constructor(save, economy, progression) {
    this.s = save; this.eco = economy; this.prog = progression;
  }
  list() {
    return MISSIONS.map(m => {
      const cur = Math.min(m.need, this.s.data.stats[m.stat] ?? 0);
      return { ...m, cur, done: !!this.s.data.missions[m.id] };
    });
  }
  current() { return this.list().find(m => !m.done) ?? null; }
  // retorna missões recém-concluídas (para toast + recompensa)
  check() {
    const fresh = [];
    for (const m of MISSIONS) {
      if (this.s.data.missions[m.id]) continue;
      if ((this.s.data.stats[m.stat] ?? 0) >= m.need) {
        this.s.data.missions[m.id] = true;
        this.eco.addMoney(m.rw.money);
        this.prog.addXP(m.rw.xp);
        fresh.push(m);
      }
    }
    return fresh;
  }
}
