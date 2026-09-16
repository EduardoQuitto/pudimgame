// Economia + inventário.
import { PRODUCTS, capacityOf } from '../data/Data.js';

export class Economy {
  constructor(save) { this.s = save; }
  get money() { return this.s.data.money; }
  product(id) { return PRODUCTS.find(p => p.id === id); }
  equipped() { return this.product(this.s.data.equipped); }
  totalStock() { return Object.values(this.s.data.inv).reduce((a, b) => a + b, 0); }
  capacity() { return capacityOf(this.s.data.upgrades.cap); }
  unlocked(p) { return this.s.data.stats.earned >= p.unlock; }
  addMoney(v) { this.s.data.money = Math.max(0, Math.min(999999, this.s.data.money + Math.round(v))); }
  spend(v) { if (this.s.data.money < v) return false; this.s.data.money -= v; this.s.data.stats.spent += v; return true; }
  buyStock(id, qty = 1) {
    const p = this.product(id);
    if (!this.unlocked(p)) return { ok: false, msg: 'Produto bloqueado: fature mais para desbloquear.' };
    if (this.totalStock() + qty > this.capacity()) return { ok: false, msg: 'Sem espaço! Melhore 🎒 Capacidade.' };
    const cost = p.cost * qty;
    if (!this.spend(cost)) return { ok: false, msg: 'Dinheiro insuficiente.' };
    this.s.data.inv[id] += qty;
    return { ok: true, msg: `+${qty} ${p.icon} ${p.name}` };
  }
  consumeEquipped(qty) {
    const id = this.s.data.equipped;
    if ((this.s.data.inv[id] ?? 0) < qty) return false;
    this.s.data.inv[id] -= qty;
    return true;
  }
}
