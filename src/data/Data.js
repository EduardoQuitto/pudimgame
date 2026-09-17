// Dados de jogo: produtos, upgrades, missões, níveis. Expansível: basta adicionar entradas.

export const PRODUCTS = [
  { id: 'pudim',     icon: '🍮', name: 'Pudim Roxo',        cost: 3,  price: 8,  chance: 0.72, unlock: 0,   time: 1.25, tipMul: 1,   pace: 'ritmo normal', desc: 'O roxinho famoso. Equilibrado em tudo.' },
  { id: 'choco',     icon: '🍫', name: 'Pudim de Chocolate',cost: 5,  price: 12, chance: 0.66, unlock: 60,  time: 1.25, tipMul: 1,   pace: 'ritmo normal', desc: 'Mais margem, agrada os chocólatras.' },
  { id: 'morango',   icon: '🍓', name: 'Pudim de Morango',  cost: 5,  price: 13, chance: 0.60, unlock: 140, time: 1.40, tipMul: 1.5, pace: 'ritmo lento',  desc: 'Premium: demora mais, rende gorjeta.' },
  { id: 'geladinho', icon: '🧊', name: 'Geladinho',         cost: 2,  price: 6,  chance: 0.80, unlock: 260, time: 0.90, tipMul: 0.8, pace: 'venda rápida', desc: 'Vende rápido e fácil, margem menor.' },
  { id: 'agua',      icon: '🥤', name: 'Água Gelada',       cost: 1,  price: 4,  chance: 0.85, unlock: 420, time: 0.80, tipMul: 0.6, pace: 'venda rápida', desc: 'Volume alto, lucro baixo. Ideal p/ combo.' },
  { id: 'brigadeiro',icon: '🍬', name: 'Brigadeiro',        cost: 4,  price: 10, chance: 0.70, unlock: 650, time: 1.50, tipMul: 1.2, pace: 'ritmo lento',  desc: 'Margem boa, exige paciência.' },
];

export const UPGRADE_CATS = [
  { id: 'luck',   icon: '🍀', name: 'Sorte',       desc: '+1.5% chance de venda, +especiais, +gorjetas e +quantidade', max: 5, base: 50 },
  { id: 'valor',  icon: '💰', name: 'Valor',       desc: '+15% preço de venda por nível',                   max: 5, base: 60 },
  { id: 'speed',  icon: '🏃', name: 'Velocidade',  desc: '+10% movimento por nível',                        max: 5, base: 45 },
  { id: 'cap',    icon: '🎒', name: 'Capacidade',  desc: '+6 espaços de estoque por nível',                 max: 5, base: 40 },
  { id: 'talk',   icon: '🗣️', name: 'Negociação',  desc: '+6% chance de venda por nível',                   max: 5, base: 55 },
  { id: 'safe',   icon: '❤️', name: 'Segurança',   desc: '-20% penalidade de atropelamento por nível',      max: 5, base: 50 },
];
export const upgradeCost = (cat, lvl) => Math.round(cat.base * Math.pow(2.1, lvl));
export const capacityOf = (lvl) => 8 + lvl * 6;

export const LEVELS = [
  { n: 1, title: 'Vendedor Iniciante' },
  { n: 2, title: 'Vendedor de Bairro' },
  { n: 3, title: 'Vendedor Experiente' },
  { n: 4, title: 'Vendedor Profissional' },
  { n: 5, title: 'Lenda do Pudim' },
];
export const xpNext = (level) => Math.round(40 * Math.pow(level, 1.5));
export const levelTitle = (level) => LEVELS[Math.min(level, 5) - 1]?.title ?? `Lenda Lv.${level}`;

export const MISSIONS = [
  { id: 'm1', txt: 'Venda 5 pudins (qualquer produto)', need: 5,   stat: 'sales',        rw: { money: 25, xp: 20 } },
  { id: 'm2', txt: 'Fature R$ 100 no total',            need: 100, stat: 'earned',       rw: { money: 30, xp: 25 } },
  { id: 'm3', txt: 'Consiga uma gorjeta',              need: 1,   stat: 'tips',         rw: { money: 20, xp: 20 } },
  { id: 'm4', txt: 'Faça um combo x3',                 need: 3,   stat: 'bestCombo',    rw: { money: 35, xp: 30 } },
  { id: 'm5', txt: 'Venda para um cliente especial',   need: 1,   stat: 'specials',     rw: { money: 40, xp: 35 } },
  { id: 'm6', txt: 'Complete 15 vendas',               need: 15,  stat: 'sales',        rw: { money: 60, xp: 50 } },
  { id: 'm7', txt: 'Fature R$ 400 no total',           need: 400, stat: 'earned',       rw: { money: 80, xp: 70 } },
  { id: 'm8', txt: 'Alcance o combo x5',               need: 5,   stat: 'bestCombo',    rw: { money: 120, xp: 100 } },
  { id: 'm9', txt: 'Complete 30 vendas',               need: 30,  stat: 'sales',        rw: { money: 100, xp: 80 } },
  { id: 'm10', txt: 'Fature R$ 1000 no total',         need: 1000, stat: 'earned',      rw: { money: 150, xp: 120 } },
];

// Tipos de cliente especial: peso base, multiplicadores e comportamento.
export const CUSTOMER_TYPES = [
  { id: 'normal',   name: '',               w: 62, priceMul: 1,   qty: 1, tipCh: 0.08, tip: 3,  xp: 8 },
  { id: 'rico',     name: '💎 CLIENTE RICO',w: 7,  priceMul: 1.6, qty: 1, tipCh: 0.25, tip: 6,  xp: 16 },
  { id: 'faminto',  name: '😋 COM MUITA FOME', w: 10, priceMul: 1, qty: 3, tipCh: 0.10, tip: 4, xp: 18 },
  { id: 'apressado',name: '⏱ APRESSADO',    w: 8,  priceMul: 0.9, qty: 1, tipCh: 0.03, tip: 2,  xp: 10, sellTimeMul: 0.6 },
  { id: 'generoso', name: '💖 GENEROSO',    w: 8,  priceMul: 1.1, qty: 1, tipCh: 0.75, tip: 7,  xp: 16 },
  { id: 'exigente', name: '🧐 EXIGENTE',    w: 4,  priceMul: 1.3, qty: 1, tipCh: 0.05, tip: 5,  xp: 14, chanceMalus: 0.18 },
  { id: 'vip',      name: '👑 CLIENTE VIP', w: 1,  priceMul: 2.5, qty: 2, tipCh: 0.6,  tip: 15, xp: 45 },
];

export const TIPS = [
  'Espere o semáforo fechar antes de entrar na rua.',
  'Carros parados = clientes. Carros andando = perigo.',
  'Vendas em sequência criam COMBO e pagam mais.',
  'Sem estoque? Volte à barraca e pressione E.',
  'Sorte 🍀 aumenta clientes VIP e gorjetas.',
  'Na chuva, menos vendas — mas gorjetas maiores.',
  'Segurança ❤️ reduz o prejuízo do atropelamento.',
];
