// Upgrades: 6 categorias x 5 níveis, efeitos aplicados no Game.
import { UPGRADE_CATS, upgradeCost } from '../data/Data.js';

export class Upgrades {
  constructor(save, economy) { this.s = save; this.eco = economy; }
  lvl(id) { return this.s.data.upgrades[id] ?? 0; }
  cat(id) { return UPGRADE_CATS.find(c => c.id === id); }
  cost(id) { const c = this.cat(id); return upgradeCost(c, this.lvl(id)); }
  maxed(id) { return this.lvl(id) >= this.cat(id).max; }
  buy(id) {
    if (this.maxed(id)) return { ok: false, msg: 'Nível máximo!' };
    const cost = this.cost(id);
    if (!this.eco.spend(cost)) return { ok: false, msg: 'Dinheiro insuficiente.' };
    this.s.data.upgrades[id]++;
    return { ok: true, msg: `${this.cat(id).icon} ${this.cat(id).name} nv.${this.lvl(id)}!` };
  }
  // efeitos agregados
  get priceMul() { return 1 + this.lvl('valor') * 0.15; }
  get speedMul() { return 1 + this.lvl('speed') * 0.10; }
  get chanceBonus() { return this.lvl('talk') * 0.06; }
  get luck() { return this.lvl('luck'); }
  get protect() { return this.lvl('safe') * 0.20; } // fração da penalidade evitada
  shopTier() {
    const total = Object.values(this.s.data.upgrades).reduce((a, b) => a + b, 0);
    return total >= 18 ? 4 : total >= 10 ? 3 : total >= 4 ? 2 : 1;
  }
}
