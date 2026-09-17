// Eventos aleatórios: variedade real com efeitos temporários.
export class GameEvents {
  constructor(audio, traffic, weather, ui, economy = null) {
    this.audio = audio; this.traffic = traffic; this.weather = weather; this.ui = ui;
    this.eco = economy;
    this.t = 40;
    this.promoUntil = 0; this.now = 0;
    this.fiscalUntil = 0;
  }
  get promo() { return this.now < this.promoUntil; }
  get fiscal() { return this.now < this.fiscalUntil; }
  update(dt, luck) {
    this.now += dt;
    this.t -= dt;
    if (this.t > 0) return null;
    this.t = 50 + Math.random() * 40 - luck * 2;
    const roll = Math.random();
    if (roll < 0.22) { // trânsito intenso
      this.traffic.intenseUntil = this.traffic.now + 35;
      return { title: '🚗 TRÂNSITO INTENSO!', sub: 'Mais carros na rua pelos próximos 35s.' };
    } else if (roll < 0.38) { // promoção
      this.promoUntil = this.now + 30;
      return { title: '📢 PROMOÇÃO RELÂMPAGO!', sub: '+20% no preço por 30s. VENDA!' };
    } else if (roll < 0.52) { // motorista maluco
      this.traffic.crazyDriver();
      return { title: '🏎 MOTORISTA MALUCO!', sub: 'Um carro furou o vermelho! SAIA DA RUA!' };
    } else if (roll < 0.64) { // fiscalização
      this.fiscalUntil = this.now + 12;
      return { title: '🧾 FISCALIZAÇÃO!', sub: 'Fique na CALÇADA por 12s ou pague multa de R$15.' };
    } else if (roll < 0.78) { // VIP garantido
      this.traffic.forceVipNext = true;
      return { title: '👑 DIZEM QUE UM VIP ESTÁ CHEGANDO...', sub: 'Fique de olho nos próximos carros!' };
    } else if (roll < 0.86) { // fornecedor: repoõe o equipado de graça (respiro)
      if (this.eco) {
        const id = this.eco.s.data.equipped;
        const room = this.eco.capacity() - this.eco.totalStock();
        const give = Math.min(room, 6);
        if (give > 0) {
          this.eco.s.data.inv[id] += give;
          const p = this.eco.product(id);
          return { title: '🚚 FORNECEDOR PASSOU!', sub: `+${give} ${p.icon} ${p.name} de graça. Aproveite a fase!` };
        }
      }
      this.traffic.forceVipNext = true;
      return { title: '👑 DIZEM QUE UM VIP ESTÁ CHEGANDO...', sub: 'Fique de olho nos próximos carros!' };
    } else if (roll < 0.90) { // chuva
      this.weather.forceRain(22);
      return null; // weather já avisa
    } else { // gorjeta em dobro
      this.promoUntil = this.now + 30;
      return { title: '💖 ONDA DE GENEROSIDADE!', sub: '+20% nos valores por 30s.' };
    }
  }
}
