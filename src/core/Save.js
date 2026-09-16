// Save: localStorage com validação e fallback. Nunca quebra o jogo.
import { CONFIG } from './Config.js';
import { PRODUCTS } from '../data/Data.js';

export function defaultSave() {
  const inv = {};
  PRODUCTS.forEach(p => inv[p.id] = 0);
  inv.pudim = 4;
  return {
    v: 1, money: 20, inv, equipped: 'pudim',
    upgrades: { luck: 0, valor: 0, speed: 0, cap: 0, talk: 0, safe: 0 },
    level: 1, xp: 0, comboBest: 0,
    missions: {}, // id -> true (concluída)
    stats: { earned: 0, spent: 0, sales: 0, bestSale: 0, specials: 0, tips: 0, accidents: 0, bestCombo: 0, playTime: 0, favorite: 'pudim' },
    salesByProduct: { pudim: 0 },
    settings: { quality: 'medium', sens: 1, shadows: true, sound: true, vol: 70, invertY: false, uiscale: 'normal', reduceFx: false, colorblind: false, refl: true, view: 'normal', particles: 'normal', npc: 'all', rainq: 'full', suggested: false },
    tutorialDone: false, tutorialStep: 0,
  };
}

export class SaveSys {
  constructor() { this.data = defaultSave(); this.corruptFound = false; }
  load() {
    try {
      const raw = localStorage.getItem(CONFIG.saveKey);
      if (!raw) return false;
      let s;
      try { s = JSON.parse(raw); }
      catch { this.corruptFound = true; return false; } // JSON quebrado: recomeça sem travar
      // validação + migração: versão desconhecida ou campos inválidos => defaults
      if (!s || typeof s !== 'object' || typeof s.money !== 'number' || typeof s.v !== 'number') {
        this.corruptFound = true;
        return false;
      }
      // s.v > 1 (futuro): mescla só campos conhecidos, ignora o resto
      const d = defaultSave();
      const merged = { ...d, ...s, stats: { ...d.stats, ...(s.stats || {}) }, upgrades: { ...d.upgrades, ...(s.upgrades || {}) }, settings: { ...d.settings, ...(s.settings || {}) }, salesByProduct: { ...(s.salesByProduct || {}) } };
      merged.inv = { ...d.inv, ...(s.inv || {}) };
      for (const k of Object.keys(merged.inv)) merged.inv[k] = Math.max(0, Math.min(999, merged.inv[k] | 0));
      merged.money = Math.max(0, Math.min(999999, Math.round(merged.money)));
      if (!PRODUCTS.some(p => p.id === merged.equipped)) merged.equipped = 'pudim';
      this.data = merged;
      return true;
    } catch { return false; }
  }
  save() {
    try { localStorage.setItem(CONFIG.saveKey, JSON.stringify(this.data)); } catch { /* disco cheio/bloqueado: ignora */ }
  }
  wipe() {
    try { localStorage.removeItem(CONFIG.saveKey); } catch {}
    const settings = this.data.settings;
    this.data = defaultSave();
    this.data.settings = settings;
    this.save();
  }
}
