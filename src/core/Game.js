// GameManager: orquestra renderer, cena, loop e todos os sistemas.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CONFIG } from './Config.js';
import { Input } from './Input.js';
import { SaveSys } from './Save.js';
import { MapWorld } from '../world/Map.js';
import { TrafficLight } from '../world/TrafficLight.js';
import { Traffic } from '../world/Traffic.js';
import { Player } from '../world/Player.js';
import { ThirdCamera } from '../world/ThirdCamera.js';
import { Weather } from '../world/Weather.js';
import { Effects } from '../world/Effects.js';
import { Peds } from '../world/Pedestrians.js';
import { Selling } from '../systems/Selling.js';
import { Economy } from '../systems/Economy.js';
import { Upgrades } from '../systems/Upgrades.js';
import { Progression } from '../systems/Progression.js';
import { Missions } from '../systems/Missions.js';
import { AudioSys } from '../systems/AudioSys.js';
import { GameEvents } from '../systems/Events.js';
import { UI } from '../ui/UI.js';
import { TIPS } from '../data/Data.js';
import { levelTitle, PRODUCTS } from '../data/Data.js';

// Escala de render por nível: resolução, sombra, chuva, lâmpadas, alcance,
// anisotropia, ondulações e spotlight. Recursos liga/desliga ficam no save.
const PRESETS = {
  low:    { pr: 0.75, shadow: 512,  rain: 400,  lamps: 2, fog: 0.7,  aniso: 2, ripple: false, headSpot: false },
  medium: { pr: 1.0,  shadow: 1024, rain: 900,  lamps: 3, fog: 1.0,  aniso: 4, ripple: false, headSpot: true },
  high:   { pr: 1.5,  shadow: 2048, rain: 1500, lamps: 4, fog: 1.1,  aniso: 8, ripple: false, headSpot: true },
  ultra:  { pr: 2.0,  shadow: 2048, rain: 2200, lamps: 4, fog: 1.3,  aniso: 8, ripple: true,  headSpot: true },
};

const $ = (id) => document.getElementById(id);

export class Game {
  constructor() {
    this.state = 'menu';
    this.shopOpen = false;
    this.startedOnce = false;
    this.interactHint = null;
    this.tutorialText = null;
    this.saveT = 0; this.missionT = 0; this.fiscalExposure = 0; this.fiscalFinedFor = 0;
    this.save = new SaveSys();
    this.audio = new AudioSys();
  }

  async init() {
    const setLoad = (p, txt) => { $('load-fill').style.width = p + '%'; if (txt) $('load-text').textContent = txt; };
    $('load-tip').textContent = '💡 ' + TIPS[(Math.random() * TIPS.length) | 0];
    const frame = () => new Promise(r => requestAnimationFrame(r));
    try {
      setLoad(8, 'Carregando save...'); await frame();
      const had = this.save.load();
      const st = this.save.data.settings;
      this.input = new Input($('game-canvas'));
      this.input.sens = st.sens ?? 1;
      this.input.invertY = !!st.invertY;

      setLoad(20, 'Criando renderer...'); await frame();
      this.renderer = new THREE.WebGLRenderer({ canvas: $('game-canvas'), antialias: true, powerPreference: 'high-performance' });
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.22;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      // ambiente de reflexos: metais/vidros/tintas reagem à luz (sem isso, metal = preto)
      this._pmrem = null;
      try { this._pmrem = new THREE.PMREMGenerator(this.renderer); } catch { this._pmrem = null; }

      setLoad(35, 'Construindo a rua...'); await frame();
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 500);
      this.buildLights();
      this.map = new MapWorld(this.scene);

      setLoad(60, 'Estacionando carros...'); await frame();
      this.effects = new Effects(this.scene, this.camera);
      this.light = new TrafficLight(this.map, this.audio, (s) => this.onLightChange(s));
      this.traffic = new Traffic(this.scene, this.audio);
      this.player = new Player(this.scene);
      this.cam = new ThirdCamera(this.scene, this.camera, this.input, this.map);
      this.weather = new Weather(this.scene, this.map, this.audio, (t) => this.ui.banner(t, '', 5));
      this.peds = new Peds(this.scene);

      setLoad(78, 'Preparando pudins...'); await frame();
      this.economy = new Economy(this.save);
      this.upgrades = new Upgrades(this.save, this.economy);
      this.prog = new Progression(this.save);
      this.missions = new Missions(this.save, this.economy, this.prog);
      this.events = new GameEvents(this.audio, this.traffic, this.weather, null);
      this.selling = new Selling();
      this.ui = new UI(this);

      // migração de saves antigos + primeira execução com detecção de hardware
      const S0 = this.save.data.settings;
      if (!S0.base || !['low', 'medium', 'high', 'ultra'].includes(S0.base)) S0.base = S0.quality || 'medium';
      for (const [k, v] of Object.entries({ shadows: true, refl: true, view: 'normal', particles: 'normal', npc: 'all', rainq: 'full' })) {
        if (S0[k] === undefined) S0[k] = v;
      }
      this.applyAllSettings();
      this._suggestHW = !S0.suggested;
      S0.suggested = true;
      this.audio.setVolume(st.vol ?? 70);
      this.audio.setMuted(!st.sound);
      this.effects.enabled = !st.reduceFx;
      this.applyA11y();
      this.updateMuteIcon();
      this.map.setShopTier(this.upgrades.shopTier());
      this.player.setTray(this.save.data.equipped);
      this.applyEnvReflections();
      // sessão, hitstop, auto-qualidade, desbloqueios, demanda
      this.session = null;
      this.demand = 1;
      this.hitT = 0;
      this.fpsEMA = 60; this.fpsT = 0; this.qCooldown = 0;
      this.dustAcc = 0; this.threatT = 0; this.ambientHornT = 8;
      this.unlockedSeen = new Set(PRODUCTS.filter(p => this.economy.unlocked(p)).map(p => p.id));

      setLoad(92, 'Aquecendo motores...'); await frame();
      this.bindGlobal();
      this.updateDifficulty();
      this.clock = new THREE.Clock();
      this.renderer.setAnimationLoop(() => this.tick());

      setLoad(100, 'Pronto!');
      const d = this.save.data;
      const info = had && (d.stats.sales > 0 || d.money > 20)
        ? `Save: R$${d.money} • Lv.${d.level} ${levelTitle(d.level)} • ${d.stats.sales} vendas`
        : 'Nenhum progresso ainda. Comece sua história!';
      this.ui.toMenu(info);
      this.hide('loading');
      if (this._suggestHW) {
        try {
          const cores = navigator.hardwareConcurrency ?? 4, mem = navigator.deviceMemory ?? 8;
          const weak = /Mobi|Android/i.test(navigator.userAgent) || cores <= 4 || mem <= 4;
          if (weak && S0.quality === 'medium') {
            this.applyPreset('low');
            this.ui.toast('📉 Hardware modesto detectado: qualidade <b>BAIXO</b> sugerida.<br>Você pode mudar nas Configurações.', 'gold');
          } else {
            this.ui.toast(`🖥️ Qualidade sugerida: <b>${S0.quality.toUpperCase()}</b> (ajustável nas Configurações).`, '');
          }
        } catch { /* detecção é melhor esforço */ }
      }
      if (this.save.corruptFound) {
        this.ui.toast('⚠️ Save corrompido foi descartado — começamos do zero.<br>Suas configurações foram mantidas.', 'bad');
      }
      this.initDebug();
    } catch (err) {
      console.error(err);
      $('load-text').textContent = 'Falha ao carregar: ' + (err?.message ?? err);
      this.err('Falha ao iniciar o jogo: ' + (err?.message ?? err));
    }
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight(0x7f8fd0, 0x2a1f18, 0.95);
    this.scene.add(this.hemi);
    this.moodTarget = new THREE.Color(0x7f8fd0);
    // sol baixo de fim de tarde (quente, mas sem tingir tudo de vermelho)
    this.sun = new THREE.DirectionalLight(0xffb490, 1.35);
    this.sun.position.set(-32, 26, -18);
    this.sun.castShadow = true;
    this.sun.shadow.camera.left = -45; this.sun.shadow.camera.right = 45;
    this.sun.shadow.camera.top = 30; this.sun.shadow.camera.bottom = -30;
    this.sun.shadow.camera.far = 120;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.bias = -0.0004;
    this.scene.add(this.sun, this.sun.target);
    // sem AmbientLight chapado: hemisphere + preenchimento dirigem a cena
    // preenchimento frio do leste: define formas sem lavar a cena
    this.fill = new THREE.DirectionalLight(0x6a7fd0, 0.45);
    this.fill.position.set(30, 22, 25);
    this.scene.add(this.fill);
    // farol dinâmico: 1 spotlight sem sombra segue o carro mais próximo do jogador
    this.headSpot = new THREE.SpotLight(0xffe9a8, 0, 20, 0.55, 0.5, 1.2);
    this.headSpotTarget = new THREE.Object3D();
    this.scene.add(this.headSpot, this.headSpotTarget);
    this.headSpot.target = this.headSpotTarget;
  }

  bindGlobal() {
    window.addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
    this.renderer.setSize(innerWidth, innerHeight);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        // pilha de overlays: fecha o topo primeiro, nunca prende o jogador
        for (const id of ['settings', 'help', 'credits']) {
          if (!$(id).classList.contains('hidden')) { this.hide(id); this.audio.ui(); return; }
        }
        if (!$('summary').classList.contains('hidden')) { $('btn-sum-close').click(); return; }
        if (this.shopOpen) { this.ui.closeShop(); return; }
        if (this.state === 'playing') this.pause();
        else if (this.state === 'paused') this.resume();
      }
      if (e.code === 'KeyM') this.toggleMute();
    });
    document.addEventListener('pointerlockchange', () => {
      // sair do lock (Esc) enquanto joga => pausa (exceto com loja aberta)
      if (document.pointerLockElement == null && this.state === 'playing' && !this.shopOpen && this.startedOnce && this.input.enabled) {
        this.pause();
      }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.save.save(); });
    window.addEventListener('error', (e) => this.err('Erro: ' + (e.message || 'desconhecido')));
  }

  err(msg) {
    const b = $('errbox');
    b.textContent = msg; b.classList.remove('hidden');
    clearTimeout(this._errT);
    this._errT = setTimeout(() => b.classList.add('hidden'), 6000);
  }
  hide(id) { $(id).classList.add('hidden'); }
  show(id) { $(id).classList.remove('hidden'); }

  applyA11y() {
    const s = this.save.data.settings;
    document.body.classList.toggle('cb', !!s.colorblind);
    document.body.dataset.uiscale = s.uiscale || 'normal';
  }
  // reflexos: 1 PMREM com RoomEnvironment; metais ganham 1.0, resto 0.35 (sem lavar a cena)
  applyEnvReflections() {
    if (!this._pmrem) return;
    try {
      const envTex = this._pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      this._envTex = envTex;
      this.scene.environment = envTex;
      this.scene.traverse(o => {
        if (o.isMesh) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) {
            if (m && m.isMeshStandardMaterial && m.envMapIntensity === 1) {
              m.envMapIntensity = m.userData.envI ?? (m.metalness > 0.4 ? 1.0 : 0.35);
            }
          }
        }
      });
    } catch (e) { console.warn('env reflections off', e?.message); }
  }

  // ---------- fluxo ----------
  startGame(cont) {    if (!cont && this.startedOnce && this.state === 'menu') { /* Jogar continua de onde parou */ }
    this.startedOnce = true;
    this.state = 'playing';
    this.shopOpen = false;
    this.hide('shop');
    this.ui.toGame();
    this.input.enabled = true;
    this.input.consumeInteract(); // descarta E pressionado no menu
    this.input.lock();
    this.clock.getDelta();
    const d0 = this.save.data;
    this.session = { money0: d0.money, earned0: d0.stats.earned, sales0: d0.stats.sales, xp0: d0.xp, time0: performance.now() };
    if (!this.save.data.tutorialDone) this.ui.toast('👉 Siga o tutorial verde na tela!', 'good');
    else this.ui.toast(this.light.state === 'red' ? '🔴 Semáforo fechado: VÁ VENDER!' : '🟢 Aguarde o semáforo fechar...', '');
  }
  newGame() {
    this.save.wipe();
    this.session = null;
    this.unlockedSeen = new Set(PRODUCTS.filter(p => this.economy.unlocked(p)).map(p => p.id));
    this.traffic.reset();
    this.player.reset();
    this.prog.breakCombo();
    this.selling.reset();
    this.map.setShopTier(1);
    this.updateDifficulty();
    this.ui.toMenu('Novo jogo criado. Boa sorte, vendedor! 🍮');
    this.ui.toast('Novo jogo! Progresso anterior apagado.', 'gold');
  }
  toMenu() {
    this.save.save();
    const d = this.save.data;
    const hadSession = this.session && d.stats.sales > this.session.sales0;
    const summary = hadSession ? {
      earned: d.stats.earned - this.session.earned0,
      sales: d.stats.sales - this.session.sales0,
      xp: d.xp - this.session.xp0 + 0, // xp pode ter virado nível; mostra ganho bruto aprox.
      bestCombo: d.stats.bestCombo,
      specials: d.stats.specials,
      money: d.money,
    } : null;
    this.session = null;
    this.state = 'menu';
    this.shopOpen = false;
    this.hide('shop');
    this.input.enabled = false;
    this.input.unlock();
    this.ui.setVignette(0);
    if (summary && summary.sales > 0) this.ui.showSummary(summary, () => this.ui.toMenu(this.saveLine()));
    else this.ui.toMenu(this.saveLine());
  }
  saveLine() {
    const d = this.save.data;
    return `Save: R$${d.money} • Lv.${d.level} ${levelTitle(d.level)} • ${d.stats.sales} vendas`;
  }
  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.input.unlock();
    this.audio.suspend(); // pausa de verdade: congela áudio ambiente
    this.show('pause');
    this.save.save();
  }
  resume() {
    if (this.state !== 'paused') return;
    this.hide('pause'); this.hide('settings'); this.hide('help');
    this.state = 'playing';
    this.audio.resume();
    this.input.enabled = true;
    this.input.lock();
    this.clock.getDelta(); // descarta o tempo parado
  }
  toggleMute() {
    const s = this.save.data.settings;
    s.sound = !s.sound;
    this.audio.init(); this.audio.setMuted(!s.sound);
    this.updateMuteIcon();
  }
  updateMuteIcon() { $('btn-mute').innerHTML = `<svg class="ic"><use href="#i-${this.save.data.settings.sound ? 'sound' : 'mute'}"/></svg>`; }

  // Presets REAIS: cada um muda renderização de verdade (não só texto).
  // base = escala de render (pr, sombra, chuva, lâmpadas, alcance, aniso, ripple)
  // individuais = recursos liga/desliga (sombras, reflexos, visão, partículas, npc, chuva)
  applyPreset(name) {
    const S = this.save.data.settings;
    S.quality = name; S.base = name;
    if (name === 'low') Object.assign(S, { shadows: false, refl: false, view: 'short', particles: 'low', npc: 'few', rainq: 'light' });
    else if (name === 'medium') Object.assign(S, { shadows: true, refl: true, view: 'normal', particles: 'normal', npc: 'all', rainq: 'full' });
    else Object.assign(S, { shadows: true, refl: true, view: 'normal', particles: 'normal', npc: 'all', rainq: 'full' });
    this.applyAllSettings();
    this.save.save();
  }
  applyAllSettings() {
    const S = this.save.data.settings;
    const base = (S.base && PRESETS[S.base]) ? S.base : 'medium';
    const P = PRESETS[base];
    // resolução interna: ULTRA/ALTO fazem supersampling real acima do display
    this.renderer.setPixelRatio(Math.min(P.pr * (devicePixelRatio || 1), 2.5));
    this.renderer.setSize(innerWidth, innerHeight);
    // sombras: liga/desliga + resolução + alcance por nível
    this.renderer.shadowMap.enabled = !!S.shadows;
    this.sun.castShadow = !!S.shadows;
    const size = P.shadow;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    }
    const ext = base === 'ultra' ? 1.25 : 1;
    Object.assign(this.sun.shadow.camera, { left: -45 * ext, right: 45 * ext, top: 30 * ext, bottom: -30 * ext });
    this.sun.shadow.camera.updateProjectionMatrix();
    // distância de visão (neblina)
    this.applyFog();
    // reflexos: liga/desliga de verdade
    this.scene.environment = (S.refl && this._envTex) ? this._envTex : null;
    // chuva: base do preset × qualidade × partículas
    const rainN = Math.round(P.rain * (S.rainq === 'light' ? 0.5 : 1) * (S.particles === 'low' ? 0.6 : 1));
    this.weather?.setQualityCount(rainN);
    // lâmpadas reais por nível + pedestres + anisotropia + headlight
    this.map?.setLampLevel(P.lamps);
    this.map?.setAniso(P.aniso);
    this.peds?.list.forEach((p, i) => { p.g.visible = S.npc === 'all' || i < 2; });
    this.headSpotOn = base !== 'low';
    this.rippleOn = !!P.ripple;
    this.effects?.setRipple(P.ripple);
    this.ui?.syncSettings();
    this.save.save();
  }
  // compat: chamadas antigas usam applyQuality(nome)
  applyQuality(q, first = false) {
    if (['low', 'medium', 'high', 'ultra'].includes(q)) {
      this.save.data.settings.base = q;
      this.applyPreset(q);
    } else this.applyAllSettings();
    void first;
  }
  applyFog() {
    const S = this.save.data.settings;
    const base = (S.base && PRESETS[S.base]) ? S.base : 'medium';
    const k = PRESETS[base].fog * ({ short: 0.7, normal: 1, long: 1.3 }[S.view] ?? 1);
    this.weather.fogK = k;
    if (this.scene.fog) {
      if (this.weather.raining) { this.scene.fog.near = 35 * k; this.scene.fog.far = 130 * k; }
      else { this.scene.fog.near = 55 * k; this.scene.fog.far = 190 * k; }
    }
  }

  onLightChange(s) {
    if (s === 'green') this.traffic.onGreen(); // onda de arranque
    this.moodTarget.set(s === 'red' ? 0xa08ad0 : s === 'yellow' ? 0x8f86c4 : 0x7f8fd0);
    // demanda da rua: cada fase vermelha paga diferente (decisão de onde vender)
    if (s === 'red') this.demand = 0.9 + Math.random() * 0.25;
    if (this.state !== 'playing' && this.state !== 'paused') return;
    if (s === 'red') {
      const pct = Math.round((this.demand - 1) * 100);
      this.ui.banner('🔴 SEMÁFORO FECHADO — VENDAS LIBERADAS!',
        `Aproxime-se dos carros parados e pressione E • movimento ${pct >= 0 ? '+' : ''}${pct}%`, 4);
      this.audio.beep(true);
    }
    else if (s === 'green') { this.ui.banner('🟢 SEMÁFORO ABERTO — SAIA DA RUA!', 'Carros em movimento. Volte para a calçada!', 4); this.selling.cancel(); }
    else this.ui.banner('🟡 ATENÇÃO...', '', 2);
  }

  updateDifficulty() {
    const d = this.save.data;
    this.difficulty = Math.min(1, (d.level - 1) * 0.18 + d.stats.earned / 2500);
    this.traffic.difficulty = this.difficulty;
    this.player.speedK = this.upgrades.speedMul;
  }
  afterEconomyChange() {
    this.updateDifficulty();
    this.map.setShopTier(this.upgrades.shopTier());
    // desbloqueio de produto: feedback imediato, fora de menu escondido
    for (const p of PRODUCTS) {
      if (p.unlock > 0 && this.economy.unlocked(p) && !this.unlockedSeen.has(p.id)) {
        this.unlockedSeen.add(p.id);
        this.ui.toast(`🆕 <b>NOVO PRODUTO: ${p.icon} ${p.name}!</b><br>Disponível na aba Produtos da loja.`, 'gold');
        this.audio.bigSale();
      }
    }
    const fresh = this.missions.check();
    for (const m of fresh) {
      this.ui.toast(`🎯 Missão completa: <b>${m.txt}</b><br>+R$${m.rw.money} +${m.rw.xp} XP`, 'gold');
      this.audio.bigSale();
    }
    this.save.save();
  }

  // ---------- colisão com carros ----------
  checkCarHit() {
    if (this.selling.noCollide || this.player.invuln > 0 || this.player.fallen > 0) return;
    if (!this.player.inStreet) return;
    const p = this.player.pos;
    for (const c of this.traffic.cars) {
      if (!c.active || c.v < 2.5) continue;
      if (Math.abs(c.x - p.x) < 2.3 && Math.abs(c.z - p.z) < 1.35) {
        this.crash(c);
        break;
      }
    }
  }
  // ---------- perigo direcional: vinheta + whoosh + micro-shake ----------
  updateDanger(dt) {
    const p = this.player.pos;
    const threat = this.traffic.anyMovingNear(p.x, p.z, 8);
    if (threat && this.player.inStreet && this.player.fallen <= 0) {
      const k = 1 - threat.dist / 8;
      this.ui.setVignette(k);
      const pan = Math.max(-1, Math.min(1, (threat.car.z - p.z) * 0.5));
      if (threat.dist < 4) this.audio.whoosh(pan, 1 - threat.dist / 5);
      this.threatT -= dt;
      if (threat.dist < 2.8 && this.threatT <= 0) {
        this.threatT = 1.0;
        this.cam.addTrauma(0.12);
      }
    } else {
      this.ui.setVignette(0);
      this.threatT = 0;
    }
  }
  updateHeadSpot() {
    if (!this.headSpotOn && this.headSpotOn !== undefined) { this.headSpot.intensity = 0; return; }
    let best = null, bd = 20;
    for (const c of this.traffic.cars) {
      if (!c.active || c.v < 1) continue;
      const d = Math.hypot(c.x - this.player.pos.x, c.z - this.player.pos.z);
      if (d < bd) { bd = d; best = c; }
    }
    if (best) {
      this.headSpot.intensity = 25;
      this.headSpot.position.set(best.x - best.lane.dir * 1, 3.2, best.z);
      this.headSpotTarget.position.set(best.x + best.lane.dir * 6, 0, best.z);
    } else this.headSpot.intensity = 0;
  }
  crash(car) {
    const d = this.save.data;
    const prot = this.upgrades.protect;
    const rawLoss = Math.min(d.money, 8 + Math.round(d.money * 0.06));
    const loss = Math.round(rawLoss * (1 - prot));
    this.economy.spend(loss);
    const id = d.equipped;
    const lostStock = Math.min(d.inv[id] ?? 0, 1 + ((Math.random() * 2) | 0));
    d.inv[id] = (d.inv[id] ?? 0) - lostStock;
    this.prog.breakCombo();
    this.selling.cancel();
    d.stats.accidents++;
    this.player.knockdown();
    // empurra para a calçada mais próxima, para o lado oposto ao carro
    const side = this.player.pos.z >= car.z ? 1 : -1;
    this.player.pos.z = side * 6.6;
    this.player.vel.set((this.player.pos.x - car.x) * 2, 0, side * 4);
    // hit feedback: hitstop + shake + flash + som espacial
    this.hitT = 0.14;
    this.cam.addTrauma(0.8);
    this.ui.flashRed();
    const pan = Math.max(-1, Math.min(1, (car.z - this.player.pos.z) * 0.4));
    this.audio.crash();
    this.audio.horn(pan, 0.7);
    this.effects.burst(this.player.pos, 0xff3333, 30);
    this.effects.float(this.player.pos, `-${loss > 0 ? 'R$' + loss : 'sorte'} 💥`, '#f87171');
    this.ui.toast(`💥 ATROPELADO! -R$${loss}${lostStock ? ` • -${lostStock} estoque` : ''}${prot ? ' (🛡 proteção)' : ''}<br>2.5s de proteção.`, 'bad');
    if (Math.random() < 0.4) this.audio.horn();
    this.afterEconomyChange();
  }

  // ---------- tutorial ----------
  updateTutorial(sellable) {
    const d = this.save.data;
    // marcador só quando faz sentido: tutorial ativo + perto + À FRENTE da câmera
    // (sprite atrás da câmera com depthTest off projeta gigante — bug real de QA)
    let showMarker = false;
    if (!d.tutorialDone && this.state === 'playing') {
      const nearShop = Math.hypot(this.player.pos.x + 27, this.player.pos.z + 7.2) < 12;
      if (nearShop && this.map.shopMarker) {
        if (!this._v1) { this._v1 = new THREE.Vector3(); this._v2 = new THREE.Vector3(); }
        this.camera.getWorldDirection(this._v1);
        this._v2.copy(this.map.shopMarker.position).sub(this.camera.position);
        const dist = this._v2.length();
        showMarker = this._v1.dot(this._v2) > 0 && dist > 4 && dist < 16;
      }
    }
    if (this.map.shopMarker) this.map.shopMarker.visible = showMarker;
    if (d.tutorialDone) { this.tutorialText = null; return; }
    const s = d.tutorialStep;
    if (s === 0) {
      this.tutorialText = this.light.state === 'red'
        ? '🔴 Fechou! Entre na rua com WASD.'
        : '👉 Espere o semáforo fechar 🔴. Use WASD para andar, mouse para a câmera.';
      if (this.light.state === 'red') d.tutorialStep = 1;
    } else if (s === 1) {
      this.tutorialText = '🚗 Aproxime-se de um carro PARADO (marcado com !).';
      if (sellable) d.tutorialStep = 2;
    } else if (s === 2) {
      this.tutorialText = '👉 Pressione E para vender!';
      if (this.selling.active) d.tutorialStep = 3;
    } else if (s === 3) {
      this.tutorialText = '⏳ Vendendo... aguarde o resultado!';
      if (d.stats.sales > 0) d.tutorialStep = 4;
    } else if (s === 4) {
      this.tutorialText = '🎉 Vendeu! Volte à barraca (oeste 🧭) e pressione E para abrir a loja.';
      if (this.shopOpen) d.tutorialStep = 5;
    } else if (s === 5) {
      this.tutorialText = '🏪 Compre ESTOQUE e uma MELHORIA. Feche e repita o ciclo! 🔁';
      if (d.stats.spent > 0) { d.tutorialStep = 6; d.tutorialDone = true; this.ui.toast('🎓 Tutorial completo! Bom jogo, Lenda do Pudim! 🍮', 'gold'); }
    }
  }

  // ---------- loop ----------
  tick() {
    const rawDt = Math.min(0.1, this.clock.getDelta());
    // hitstop: congela brevemente o mundo no impacto
    let dt = rawDt;
    if (this.hitT > 0) { this.hitT -= rawDt; dt = rawDt * 0.12; }
    // auto-qualidade: FPS baixo sustentado reduz um nível (com cooldown)
    if (rawDt > 0) {
      this.fpsEMA = this.fpsEMA * 0.95 + (1 / rawDt) * 0.05;
      this.fpsT += rawDt; this.qCooldown -= rawDt;
      if (this.fpsT > 4) {
        this.fpsT = 0;
        const order = ['low', 'medium', 'high', 'ultra'];
        const S = this.save.data.settings;
        const cur = S.quality === 'custom' ? null : S.quality; // personalizado: não mexe sozinho
        if (cur && cur !== 'ultra') {
          const qi = order.indexOf(cur);
          if (this.fpsEMA < 42 && qi > 0 && this.qCooldown <= 0) {
            this.qCooldown = 12;
            this.applyPreset(order[qi - 1]);
            this.ui?.toast(`⚙️ Qualidade ajustada para <b>${order[qi - 1].toUpperCase()}</b> (performance).`, '');
          }
        } else if (cur === 'ultra' && this.fpsEMA < 28 && this.qCooldown <= 0) {
          // ULTRA nunca é reduzido silenciosamente: só avisa
          this.qCooldown = 30;
          this.ui?.toast('⚠️ ULTRA pesado neste hardware. Considere ALTO nas Configurações.', 'gold');
        }
      }
    }
    try {
      const t = performance.now() / 1000;
      this.map.updateAmbient(rawDt, t);
      if (this.state === 'playing') this.update(dt);
      else if (this.state === 'menu') {
        // menu: câmera panorâmica lenta sobre a rua
        this.camera.position.set(Math.sin(t * 0.08) * 26, 7, -13 + Math.cos(t * 0.06) * 3);
        this.camera.lookAt(0, 1.5, 0);
        this.light.update(dt);
        this.traffic.update(dt, this.light, this.upgrades.luck);
        this.peds.update(dt, this.light.carsMayGo, t, this.camera.position);
        this.weather.update(dt, 0);
        this.effects.update(dt, this.weather.raining);
      }
      this.hemi.color.lerp(this.moodTarget, Math.min(1, 2 * rawDt));
      this.renderer.render(this.scene, this.camera);
    } catch (err) {
      console.error(err);
      this.err('Erro no loop: ' + (err?.message ?? err));
      this.clock.getDelta();
    }
  }

  update(dt) {
    const d = this.save.data;
    d.stats.playTime += dt;
    const frozen = this.shopOpen || this.player.fallen > 0;

    // 1) semáforo + trânsito + clima + eventos + pedestres
    this.light.update(dt);
    this.traffic.update(dt, this.light, this.upgrades.luck, Math.random,
      this.player.pos, this.selling.active ? this.selling.active.car : null, this.camera.position);
    this.peds.update(dt, this.light.carsMayGo, performance.now() / 1000, this.camera.position);
    this.weather.update(dt, this.player.pos.x);
    const ev = this.events.update(dt, this.upgrades.luck);
    if (ev) this.ui.banner(ev.title, ev.sub, 5);
    this.prog.update(dt);

    // fiscalização: multa se ficar na rua
    if (this.events.fiscal) {
      if (this.player.inStreet) {
        this.fiscalExposure += dt;
        if (this.fiscalExposure > 3 && this.fiscalFinedFor !== this.events.fiscalUntil) {
          this.fiscalFinedFor = this.events.fiscalUntil;
          const fine = Math.min(d.money, 15);
          this.economy.spend(fine);
          this.ui.toast(`🧾 MULTA da fiscalização: -R$${fine}! Fique na calçada!`, 'bad');
          this.audio.refuse();
        }
      } else this.fiscalExposure = Math.max(0, this.fiscalExposure - dt * 2);
    }

    // 2) jogador + câmera + perigo
    this.player.update(dt, this.input, this.map.colliders, this.map.shopCollider, frozen, this.traffic.cars);
    const isRunning = this.player.running && this.player.moving;
    this.cam.update(dt, this.player, isRunning);
    this.audio.stepMove(dt, this.player.moving, this.player.running);
    this.checkCarHit();
    this.updateDanger(dt);
    // poeira nos pés correndo
    if (isRunning && !this.shopOpen) {
      this.dustAcc += this.player.vel.length() * dt;
      if (this.dustAcc > 2.4) { this.dustAcc = 0; this.effects.burst(this.player.pos, 0x9a968e, 5); }
    }
    // buzina ambiente ocasional no verde (vida, com cooldown interno)
    this.ambientHornT -= dt;
    if (this.ambientHornT <= 0) {
      this.ambientHornT = 7 + Math.random() * 9;
      if (this.light.carsMayGo) this.audio.horn((Math.random() - 0.5) * 1.6, 0.35);
    }
    this.updateHeadSpot();

    // 3) interação (E) + clientes que perderam a paciência
    if (this.input.consumeInteract()) this.onInteract();
    for (const c of this.traffic.cars) {
      if (c.patienceGone && !c.patienceToasted) {
        c.patienceToasted = true;
        this.ui.toast('⏱ Um cliente <b>apressado</b> foi embora...<br>Seja mais rápido na próxima!', 'bad');
      }
    }
    // cancelar venda se andar pra longe
    if (this.selling.active) {
      const c = this.selling.active.car;
      if (!c.active || Math.hypot(c.x - this.player.pos.x, c.lane.z - this.player.pos.z) > CONFIG.sell.range + 0.8) {
        this.selling.cancel();
      } else {
        this.player.selling = 0.2;
        const done = this.selling.update(dt);
        if (done) this.finishSale(done);
      }
    }

    // 4) dica de interação + tutorial
    const sellable = this.traffic.nearestSellable(this.player.pos.x, this.player.pos.z);
    if (this.selling.active) {
      const prod = this.economy.equipped();
      this.interactHint = this.selling.stage === 'offer'
        ? { txt: `🍮 ${prod.icon} ${prod.name} — R$${this.previewPrice(this.selling.active.car)}`, sub: 'Oferecendo ao cliente...', prog: this.selling.progress }
        : { txt: '🤔 Cliente decidindo...', sub: prod.name, prog: this.selling.progress };
    } else if (sellable) {
      const c = sellable.car.customer;
      this.interactHint = {
        txt: 'PRESSIONE <b>E</b> PARA VENDER',
        sub: `${c.name ? c.name + ' • ' : ''}${this.economy.equipped().icon} ${this.economy.equipped().name} R$${this.previewPrice(sellable.car)}`,
      };
    } else if (this.player.nearShop) {
      this.interactHint = { txt: 'PRESSIONE <b>E</b> PARA ABRIR A LOJA 🏪' };
    } else if ((this.economy.s.data.inv[this.economy.s.data.equipped] ?? 0) <= 0) {
      this.interactHint = { txt: '⚠️ Sem estoque! Volte à BARACA (oeste) e pressione <b>E</b>' };
    } else if (!this.light.carsMayGo && !this.player.inStreet) {
      this.interactHint = { txt: '🔴 SEMÁFORO FECHADO — entre na rua e venda!' };
    } else this.interactHint = null;
    this.updateTutorial(sellable);

    // 5) bandeja, hint, efeitos, HUD, saves periódicos
    if (this.player.trayProduct !== d.equipped) this.player.setTray(d.equipped);
    // barra de controles: só no tutorial / primeiros 4 min
    const hint = document.getElementById('controls-hint');
    if (hint) hint.style.display = (!d.tutorialDone && d.stats.playTime < 240) ? '' : 'none';
    this.effects.update(dt, this.weather.raining);
    this.ui.updateHUD();
    this.saveT += dt; this.missionT += dt;
    if (this.missionT > 0.7) { this.missionT = 0; this.afterEconomyChangeLite(); }
    if (this.saveT > 10) { this.saveT = 0; this.save.save(); }
  }

  previewPrice(car) {
    const prod = this.economy.equipped();
    let unit = prod.price * this.upgrades.priceMul * car.customer.priceMul;
    if (this.events.promo) unit *= 1.2;
    unit *= this.demand;
    return Math.round(unit * (1 + this.prog.combo * 0.15));
  }

  afterEconomyChangeLite() {
    const fresh = this.missions.check();
    for (const m of fresh) {
      this.ui.toast(`🎯 Missão completa: <b>${m.txt}</b><br>+R$${m.rw.money} +${m.rw.xp} XP`, 'gold');
      this.audio.bigSale();
    }
    if (fresh.length) this.save.save();
  }

  onInteract() {
    this.audio.init();
    if (this.shopOpen) { this.ui.closeShop(); return; }
    if (this.selling.active || this.player.fallen > 0) return;
    if (this.player.nearShop) { this.audio.ui(); this.ui.openShop(); return; }
    const found = this.traffic.nearestSellable(this.player.pos.x, this.player.pos.z);
    if (found) {
      const r = this.selling.tryStart(found.car, this.economy);
      if (r.err) { this.ui.toast(r.err, 'bad'); this.audio.refuse(); }
      else if (r.started) this.audio.ui();
    }
  }
  finishSale(car) {
    if (!car) return;
    const res = this.selling.resolve(car, {
      eco: this.economy, upgrades: this.upgrades, prog: this.prog,
      weather: this.weather, events: this.events, difficulty: this.difficulty,
      demand: this.demand, lightState: this.light.state,
      onLevelUp: (lv) => {
        this.ui.toast(`⬆️ NÍVEL ${lv} — ${levelTitle(lv)}!<br>Carros mais rápidos, clientes mais exigentes... e mais lucro!`, 'gold');
        this.audio.bigSale();
        this.effects.burst(this.player.pos, 0xa3e635, 30);
        this.updateDifficulty();
      },
    });
    if (res.ok) {
      car.react(true);
      const pan = Math.max(-1, Math.min(1, (car.z - this.player.pos.z) * 0.5));
      this.audio.coin(pan);
      if (res.special || res.total >= 25) this.audio.bigSale();
      this.effects.burst(this.player.pos, res.special ? 0xe879f9 : 0xffd166, 30);
      this.effects.cashFly(car.group.position, this.player.pos);
      this.effects.float(this.player.pos, res.txt, res.special ? '#e879f9' : '#fbbf24');
      const xpPos = this.player.pos.clone(); xpPos.y += 1.1;
      this.effects.float(xpPos, `+${res.xp} XP`, '#a3e635');
      this.ui.toast(`✅ Venda! ${res.sub}`, res.special ? 'gold' : 'good');
      if (res.combo === 3 || res.combo === 5 || res.combo === 8) {
        this.ui.toast(`🔥 <b>COMBO x${res.combo}!</b> Continue vendendo!`, 'gold');
      }
    } else {
      car.react(false);
      this.audio.refuse();
      this.effects.float(this.player.pos, res.txt, '#f87171');
      this.ui.toast(`❌ ${res.txt}<br>${res.sub}`, 'bad');
    }
    this.afterEconomyChange();
  }

  initDebug() {
    const q = new URLSearchParams(location.search);
    if (!q.has('debug')) return;
    this.show('debug');
    document.querySelectorAll('#debug [data-dbg]').forEach(b => b.onclick = () => {
      const k = b.dataset.dbg, d = this.save.data;
      if (k === 'money') { this.economy.addMoney(100); }
      else if (k === 'light') this.light.force(this.light.state === 'red' ? 'green' : 'red');
      else if (k === 'vip') this.traffic.forceVipNext = true;
      else if (k === 'rain') this.weather.forceRain(25);
      else if (k === 'nocolide') { this.selling.noCollide = !this.selling.noCollide; b.textContent = 'Sem colisão:' + (this.selling.noCollide ? 'ON' : 'OFF'); }
      else if (k === 'level') this.prog.addXP(50, (lv) => this.ui.toast('Nível ' + lv, 'gold'));
      else if (k === 'stock') { d.inv[d.equipped] = this.economy.capacity(); }
      this.afterEconomyChange();
    });
  }
}
