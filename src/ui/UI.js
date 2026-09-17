// UI: HUD, menus, loja, tutorial, toasts. Toda DOM; sem libs.
import { PRODUCTS, UPGRADE_CATS, levelTitle, xpNext } from '../data/Data.js';
import { upgradeCost, capacityOf } from '../data/Data.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(game) {
    this.g = game;
    this.toastBox = $('toasts');
    this.bannerT = 0;
    this.bindMenu();
    this.bindShop();
    this.bindPause();
    this.bindSettings();
  }
  toast(msg, cls = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + cls; el.innerHTML = msg;
    this.toastBox.appendChild(el);
    while (this.toastBox.children.length > 5) this.toastBox.firstChild.remove();
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .4s'; setTimeout(() => el.remove(), 400); }, 4200);
  }
  banner(title, sub = '', dur = 5) {
    const b = $('event-banner');
    b.innerHTML = `<b>${title}</b>${sub ? `<br><small>${sub}</small>` : ''}`;
    b.classList.remove('hidden');
    this.bannerT = dur;
  }
  setVignette(k) {
    $('danger-vignette').style.opacity = Math.max(0, Math.min(1, k)).toFixed(2);
  }
  flashRed() {
    const f = $('redflash');
    f.classList.remove('go');
    void f.offsetWidth; // reinicia a animação
    f.classList.add('go');
  }
  showSummary(s, onClose) {
    $('sum-earned').textContent = 'R$' + s.earned;
    $('sum-sales').textContent = s.sales;
    $('sum-combo').textContent = 'x' + s.bestCombo;
    $('sum-specials').textContent = s.specials;
    $('sum-money').textContent = 'R$' + s.money;
    this.show('summary');
    $('btn-sum-close').onclick = () => {
      this.g.audio.ui();
      this.hide('summary');
      onClose();
    };
  }
  // ---------- telas ----------
  show(id) { $(id).classList.remove('hidden'); }
  hide(id) { $(id).classList.add('hidden'); }
  toMenu(saveInfo) {
    ['hud', 'shop', 'pause', 'help', 'settings', 'credits', 'summary'].forEach(i => this.hide(i));
    this.show('menu');
    $('menu-save-info').textContent = saveInfo;
    const has = this.g.save.data.money > 20 || this.g.save.data.stats.sales > 0;
    $('btn-continue').classList.toggle('hidden', !has && !this.g.startedOnce);
  }
  toGame() {
    ['menu', 'loading', 'pause', 'help', 'settings', 'credits'].forEach(i => this.hide(i));
    this.show('hud');
  }
  // ---------- bindings ----------
  bindMenu() {
    $('btn-play').onclick = () => { this.g.audio.init(); this.g.audio.ui(); this.g.startGame(false); };
    $('btn-continue').onclick = () => { this.g.audio.init(); this.g.audio.ui(); this.g.startGame(true); };
    $('btn-new').onclick = () => {
      if (confirm('Apagar todo o progresso e começar do zero?')) { this.g.newGame(); }
    };
    $('btn-help').onclick = () => { this.g.audio.ui(); this.show('help'); };
    $('btn-settings').onclick = () => { this.g.audio.ui(); this.syncSettings(); this.show('settings'); };
    $('btn-credits').onclick = () => { this.show('credits'); };
    document.querySelectorAll('.btn-close-help').forEach(b => b.onclick = () => {
      this.g.audio.ui(); this.hide('help'); this.hide('credits');
    });
    $('btn-mute').onclick = () => this.g.toggleMute();
    $('btn-pause').onclick = () => this.g.pause();
  }
  bindPause() {
    $('btn-resume').onclick = () => this.g.resume();
    $('btn-quit').onclick = () => this.g.toMenu();
    $('btn-shop2').onclick = () => { this.hide('pause'); this.openShop(); };
    $('btn-help2').onclick = () => this.show('help');
    $('btn-settings2').onclick = () => { this.syncSettings(); this.show('settings'); };
  }
  bindSettings() {
    const S = () => this.g.save.data.settings;
    const markCustom = () => {
      if (S().quality !== 'custom') {
        S().quality = 'custom';
        $('set-quality').value = 'custom';
        $('set-preset-note').textContent = 'Ajuste manual — preset: Personalizado.';
      }
    };
    $('btn-settings-close').onclick = () => { this.g.audio.ui(); this.hide('settings'); };
    $('btn-settings-back').onclick = () => { this.g.audio.ui(); this.hide('settings'); };
    $('btn-settings-default').onclick = () => {
      this.g.audio.ui();
      Object.assign(S(), { quality: 'medium', sens: 1, shadows: true, sound: true, vol: 70, invertY: false, uiscale: 'normal', reduceFx: false, colorblind: false, refl: true, view: 'normal', particles: 'normal', npc: 'all', rainq: 'full' });
      this.g.applyAllSettings();
      this.syncSettings();
      this.toast('Configurações restauradas para o padrão.', 'good');
    };
    $('set-quality').onchange = (e) => {
      if (e.target.value === 'custom') { e.target.value = S().quality; return; }
      this.g.applyPreset(e.target.value);
      this.syncSettings();
    };
    // ajustes individuais (viram Personalizado e aplicam na hora)
    $('set-shadows').onchange = (e) => { S().shadows = e.target.checked; markCustom(); this.g.applyAllSettings(); this.g.save.save(); };
    $('set-refl').onchange = (e) => { S().refl = e.target.checked; markCustom(); this.g.applyAllSettings(); this.g.save.save(); };
    $('set-view').onchange = (e) => { S().view = e.target.value; markCustom(); this.g.applyAllSettings(); this.g.save.save(); };
    $('set-particles').onchange = (e) => { S().particles = e.target.value; markCustom(); this.g.applyAllSettings(); this.g.save.save(); };
    $('set-npc').onchange = (e) => { S().npc = e.target.value; markCustom(); this.g.applyAllSettings(); this.g.save.save(); };
    $('set-rainq').onchange = (e) => { S().rainq = e.target.value; markCustom(); this.g.applyAllSettings(); this.g.save.save(); };
    $('set-sens').oninput = (e) => { this.g.input.sens = +e.target.value; S().sens = +e.target.value; this.g.save.save(); };
    $('set-invert').onchange = (e) => { this.g.input.invertY = e.target.checked; S().invertY = e.target.checked; this.g.save.save(); };
    $('set-uiscale').onchange = (e) => { S().uiscale = e.target.value; this.g.applyA11y(); this.g.save.save(); };
    $('set-fx').onchange = (e) => { S().reduceFx = !e.target.checked; this.g.effects.enabled = e.target.checked; this.g.save.save(); };
    $('set-cb').onchange = (e) => { S().colorblind = e.target.checked; this.g.applyA11y(); this.g.save.save(); };
    $('set-sound').onchange = (e) => { S().sound = e.target.checked; this.g.audio.init(); this.g.audio.setMuted(!e.target.checked); this.g.updateMuteIcon(); this.g.save.save(); };
    $('set-vol').oninput = (e) => { S().vol = +e.target.value; this.g.audio.init(); this.g.audio.setVolume(+e.target.value); this.g.save.save(); };
  }
  syncSettings() {
    const s = this.g.save.data.settings;
    $('set-quality').value = s.quality; $('set-sens').value = s.sens;
    $('set-invert').checked = !!s.invertY;
    $('set-uiscale').value = s.uiscale || 'normal';
    $('set-fx').checked = !s.reduceFx;
    $('set-cb').checked = !!s.colorblind;
    $('set-shadows').checked = s.shadows !== false;
    $('set-refl').checked = s.refl !== false;
    $('set-view').value = s.view || 'normal';
    $('set-particles').value = s.particles || 'normal';
    $('set-npc').value = s.npc || 'all';
    $('set-rainq').value = s.rainq || 'full';
    $('set-sound').checked = s.sound !== false;
    $('set-vol').value = s.vol ?? 70;
    $('set-preset-note').textContent = {
      low: 'BAIXO: estabilidade máxima, sombras e reflexos reduzidos.',
      medium: 'MÉDIO: equilíbrio entre qualidade e performance.',
      high: 'ALTO: sombras 2K, reflexos totais, chuva cheia.',
      ultra: 'ULTRA: o melhor do projeto — exige GPU forte. Nunca reduzido sozinho.',
      custom: 'Ajuste manual — preset: Personalizado.',
    }[s.quality] || '';
  }
  // ---------- HUD ----------
  updateHUD() {
    const d = this.g.save.data, eco = this.g.economy;
    $('hud-money').textContent = 'R$ ' + d.money;
    $('hud-stock').textContent = `${eco.totalStock()}/${eco.capacity()}`;
    $('hud-product').textContent = eco.equipped().name;
    $('hud-level').textContent = d.level;
    $('hud-title').textContent = levelTitle(d.level);
    $('hud-xp').style.width = (d.xp / xpNext(d.level) * 100) + '%';
    const c = this.g.prog.combo;
    $('hud-combo').classList.toggle('hidden', c < 2);
    if (c >= 2) {
      $('hud-combo-n').textContent = c;
      $('hud-combo-t').style.width = (this.g.prog.comboT / 14 * 100) + '%';
    }
    const L = this.g.light;
    const chip = $('hud-light');
    chip.className = 'light ' + L.state + (L.state === 'red' && L.timeLeft <= 5 ? ' urgent' : '');
    $('hud-light-txt').textContent = L.state === 'green' ? 'VERDE' : L.state === 'yellow' ? 'AMARELO' : 'VERMELHO';
    $('hud-light-t').textContent = L.timeLeft + 's';
    const m = this.g.missions.current();
    $('hud-mission').style.display = m ? '' : 'none';
    if (m) { $('hud-mission-txt').textContent = m.txt; $('hud-mission-n').textContent = `${Math.min(m.need, d.stats[m.stat] ?? 0)}/${m.need}`; }
    // prompt de interação
    const ix = $('interact');
    const s = this.g.interactHint;
    if (s && this.g.state === 'playing') {
      ix.classList.remove('hidden');
      $('interact-txt').innerHTML = s.txt;
      $('interact-sub').textContent = s.sub || '';
      const sp = $('sell-progress');
      if (s.prog != null) { sp.classList.remove('hidden'); $('sell-fill').style.width = (s.prog * 100) + '%'; }
      else sp.classList.add('hidden');
    } else ix.classList.add('hidden');
    // tutorial
    const tut = this.g.tutorialText;
    $('tutorial').classList.toggle('hidden', !tut);
    if (tut) $('tutorial-txt').textContent = tut;
    // perigo
    const danger = this.g.light.carsMayGo && this.g.player.inStreet;
    $('danger').classList.toggle('hidden', !danger);
    if (this.bannerT > 0) { this.bannerT -= 1 / 60; if (this.bannerT <= 0) $('event-banner').classList.add('hidden'); }
  }
  // ---------- LOJA ----------
  openShop(tab = 'stock') {
    this.g.shopOpen = true;
    this.g.input.unlock();
    this.show('shop');
    this.renderShop();
    this.setTab(tab);
  }
  closeShop() {
    this.g.shopOpen = false;
    this.hide('shop');
    if (this.g.state === 'playing') this.g.input.lock();
  }
  bindShop() {
    $('shop-close').onclick = () => { this.g.audio.ui(); this.closeShop(); };
    document.querySelectorAll('.tab').forEach(t => t.onclick = () => { this.g.audio.ui(); this.setTab(t.dataset.tab); });
  }
  setTab(name) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    for (const n of ['stock', 'products', 'upgrades', 'missions', 'stats']) {
      $('tab-' + n).classList.toggle('hidden', n !== name);
    }
  }
  renderShop() {
    const d = this.g.save.data, eco = this.g.economy, up = this.g.upgrades;
    $('shop-money').textContent = 'R$ ' + d.money;
    // estoque
    $('tab-stock').innerHTML = `<div class="row"><div class="grow"><b>📦 Capacidade: ${eco.totalStock()}/${eco.capacity()}</b><div class="muted">Equipado: ${eco.equipped().icon} ${eco.equipped().name} (clique em "Equipar" na aba Produtos)</div></div></div>` +
      PRODUCTS.map(p => {
        const locked = !eco.unlocked(p);
        return `<div class="row"><div style="font-size:26px">${p.icon}</div><div class="grow"><b>${p.name}</b> — em mãos: <b>${d.inv[p.id] ?? 0}</b><div class="muted">custo R$${p.cost} • vende R$${p.price} • chance ${Math.round(p.chance * 100)}% • ${p.pace}${locked ? ` • 🔒 desbloqueia com R$${p.unlock} faturados` : ''}</div></div>
        <button class="buy-btn" data-buy="${p.id}" ${locked ? 'disabled' : ''}>COMPRAR R$${p.cost}</button></div>`;
      }).join('');
    // produtos (desbloqueio + equipar)
    $('tab-products').innerHTML = PRODUCTS.map(p => {
      const locked = !eco.unlocked(p);
      const eq = d.equipped === p.id;
      return `<div class="row"><div style="font-size:26px">${p.icon}</div><div class="grow"><b>${p.name}</b><div class="muted">${p.desc}${locked ? ` • 🔒 R$${p.unlock} faturados` : ''}</div></div>
      ${eq ? '<b style="color:#4ade80">✔ EQUIPADO</b>' : `<button class="buy-btn equip" data-eq="${p.id}" ${locked ? 'disabled' : ''}>EQUIPAR</button>`}</div>`;
    }).join('');
    // upgrades
    $('tab-upgrades').innerHTML = UPGRADE_CATS.map(c => {
      const lvl = up.lvl(c.id), max = lvl >= c.max;
      const dots = '●'.repeat(lvl) + '○'.repeat(c.max - lvl);
      return `<div class="row"><div style="font-size:24px">${c.icon}</div><div class="grow"><b>${c.name}</b> <span class="lvl-dots">${dots}</span><div class="muted">${c.desc}</div></div>
      ${max ? '<b style="color:#fbbf24">MAX</b>' : `<button class="buy-btn" data-up="${c.id}">R$${upgradeCost(c, lvl)}</button>`}</div>`;
    }).join('') + `<div class="row"><div class="grow"><b>🏪 Nível da barraca: ${['—', 'Mesa simples', 'Barraca + guarda-sol', 'Carrinho profissional', 'Ponto sofisticado'][up.shopTier()]}</b><div class="muted">A barraca evolui sozinha conforme você compra melhorias.</div></div></div>`;
    // missões
    $('tab-missions').innerHTML = this.g.missions.list().map(m =>
      `<div class="row ${m.done ? 'mission-done' : ''}"><div class="grow"><b>${m.done ? '✔' : '🎯'} ${m.txt}</b><div class="muted">${Math.min(m.need, m.cur)}/${m.need} • recompensa: R$${m.rw.money} + ${m.rw.xp} XP</div></div></div>`
    ).join('');
    // stats
    const st = d.stats;
    const pname = (id) => PRODUCTS.find(p => p.id === id)?.name ?? id;
    $('tab-stats').innerHTML = `
      <div class="row"><div class="grow"><b>💰 Faturamento total:</b> R$${st.earned} • <b>Gasto:</b> R$${st.spent} • <b>Lucro:</b> R$${st.earned - st.spent}</div></div>
      <div class="row"><div class="grow"><b>Vendas:</b> ${st.sales} • <b>Maior venda:</b> R$${st.bestSale} • <b>Melhor combo:</b> x${st.bestCombo}</div></div>
      <div class="row"><div class="grow"><b>Clientes especiais:</b> ${st.specials} • <b>Gorjetas:</b> ${st.tips} • <b>Atropelamentos:</b> ${st.accidents}</div></div>
      <div class="row"><div class="grow"><b>Produto favorito:</b> ${pname(st.favorite)} • <b>Tempo jogado:</b> ${Math.floor(st.playTime / 60)}min • <b>Nível:</b> ${d.level} (${levelTitle(d.level)})</div></div>`;
    // binds
    this.g.audio.init();
    $('tab-stock').querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
      const r = eco.buyStock(b.dataset.buy, 1);
      this.g.audio[r.ok ? 'coin' : 'refuse']();
      if (!r.ok) this.toast(r.msg, 'bad'); else this.toast(r.msg, 'good');
      this.g.afterEconomyChange(); this.renderShop();
    });
    $('tab-products').querySelectorAll('[data-eq]').forEach(b => b.onclick = () => {
      d.equipped = b.dataset.eq; this.g.audio.ui();
      this.toast(`Equipado: ${eco.equipped().icon} ${eco.equipped().name}`, 'good');
      this.g.afterEconomyChange(); this.renderShop();
    });
    $('tab-upgrades').querySelectorAll('[data-up]').forEach(b => b.onclick = () => {
      const r = up.buy(b.dataset.up);
      this.g.audio[r.ok ? 'bigSale' : 'refuse']();
      this.toast(r.msg, r.ok ? 'gold' : 'bad');
      this.g.afterEconomyChange(); this.renderShop();
    });
  }
}
