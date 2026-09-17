// Venda em 2 fases (oferta -> decisão), sorte com peso real, anti-exploit.
// Anti-exploit: 1 venda ativa por vez, carro marcado após resolver, cancela se
// o carro sair do alcance/desaparecer, estoque consumido atomicamente no sucesso.
import { CONFIG } from '../core/Config.js';

export class Selling {
  constructor() {
    this.active = null; // { car, t, need, stage }
    this.noCollide = false; // debug
  }
  reset() { this.active = null; }
  tryStart(car, eco) {
    if (this.active) return {};
    if (!car || !car.active) return {};
    const stock = eco.s.data.inv[eco.s.data.equipped] ?? 0;
    if (stock <= 0) return { err: 'Sem estoque! Volte à barraca (oeste) e pressione E.' };
    if (car.soldThisRed) return { err: 'Este cliente já comprou. Tente outro carro!' };
    const prod = eco.equipped();
    const mul = car.customer.sellTimeMul ?? 1;
    this.active = { car, t: 0, need: (prod.time ?? CONFIG.sell.time) * mul, stage: 'offer' };
    return { started: true };
  }
  update(dt) {
    if (!this.active) return null;
    const a = this.active;
    // anti-exploit: carro sumiu/foi vendido por outro caminho -> cancela
    if (!a.car.active || a.car.soldThisRed) { this.active = null; return null; }
    a.t += dt;
    a.stage = a.t < a.need * 0.42 ? 'offer' : 'decide';
    if (a.t >= a.need) {
      const car = a.car;
      this.active = null;
      if (!car.active || car.soldThisRed) return null;
      return car;
    }
    return null;
  }
  get progress() { return this.active ? this.active.t / this.active.need : 0; }
  get stage() { return this.active?.stage ?? null; }
  cancel() { this.active = null; }

  resolve(car, ctx) {
    if (!car || !car.active) return { ok: false, txt: 'Cliente foi embora...', sub: '', xp: 0 };
    const { eco, upgrades, prog, weather, events } = ctx;
    const prod = eco.equipped();
    const cust = car.customer;
    car.soldThisRed = true; // marca ANTES de qualquer saída: sem venda dupla
    const d = eco.s.data;
    const diff = ctx.difficulty ?? 0;
    const luck = upgrades.luck;
    // Sorte com peso real e limitado: +1.5% chance/nv + especiais + gorjeta + qty extra
    let chance = prod.chance + upgrades.chanceBonus + luck * 0.015 - diff * 0.03 - (cust.chanceMalus ?? 0);
    if (weather.raining) chance -= 0.05;
    chance = Math.max(0.12, Math.min(0.97, chance));
    const roll = Math.random();
    // EXIGENTE pechinchando: perto de recusar, ele propõe pagar menos (venda garantida menor)
    let bargain = false;
    if (roll > chance) {
      if (cust.id === 'exigente' && roll < chance + 0.14) bargain = true;
      else {
        prog.breakCombo();
        return { ok: false, txt: '🙅 Recusou...', sub: `${cust.name || 'Motorista'} não quis. Combo perdido.`, xp: 0 };
      }
    }
    // quantidade: famintos levam mais; sorte pode render unidade extra
    let qty = Math.min(cust.qty, d.inv[prod.id] ?? 0);
    if (qty <= 0) return { ok: false, txt: 'Sem estoque!', sub: '', xp: 0 };
    if (qty < (d.inv[prod.id] ?? 0) && Math.random() < 0.06 + luck * 0.015) qty += 1;
    if (!eco.consumeEquipped(qty)) return { ok: false, txt: 'Sem estoque!', sub: '', xp: 0 };
    let unit = prod.price * upgrades.priceMul * cust.priceMul;
    if (bargain) unit *= 0.8; // aceitou a pechincha: -20%, mas vendeu
    if (events.promo) unit *= 1.2;
    unit *= (ctx.demand ?? 1); // movimento da rua nesta fase
    const combo = prog.hitCombo();
    let total = Math.round(unit * qty * (1 + (combo - 1) * 0.15));
    // ÚLTIMA CHAMADA: fechar venda no amarelo paga +25% (risco vs recompensa)
    let yellowBonus = false;
    if (ctx.lightState === 'yellow') { total = Math.round(total * 1.25); yellowBonus = true; }
    let tipCh = cust.tipCh + luck * 0.02;
    if (weather.raining) tipCh += 0.12;
    let tip = 0;
    if (Math.random() < tipCh) {
      tip = Math.round(cust.tip * (prod.tipMul ?? 1) * (weather.raining ? 1.5 : 1) + luck * 0.8);
      total += tip;
      d.stats.tips++;
    }
    const special = cust.id !== 'normal' && cust.id !== 'apressado';
    eco.addMoney(total);
    d.stats.earned += total;
    d.stats.sales += 1;
    d.stats.bestSale = Math.max(d.stats.bestSale, total);
    if (special) d.stats.specials++;
    d.salesByProduct[prod.id] = (d.salesByProduct[prod.id] ?? 0) + 1;
    let fav = prod.id, favN = 0;
    for (const [k, v] of Object.entries(d.salesByProduct)) if (v > favN) { favN = v; fav = k; }
    d.stats.favorite = fav;
    const xpGain = cust.xp + (tip ? 4 : 0) + (combo >= 3 ? 6 : 0);
    prog.addXP(xpGain, ctx.onLevelUp);
    return {
      ok: true, total, tip, combo, special, qty, xp: xpGain, bargain, yellowBonus, cust: cust.id,
      txt: `+R$ ${total}`,
      sub: `${cust.name ? cust.name + ' • ' : ''}${qty}x ${prod.icon} ${prod.name}${bargain ? ' • pechincha -20%' : ''}${tip ? ` • gorjeta +R$${tip}` : ''}${yellowBonus ? ' • +25% AMARELO' : ''}${combo >= 2 ? ` • 🔥x${combo}` : ''}`,
    };
  }
}
