// Trânsito: pool de carros com personalidades, 5 tipos de carroceria,
// onda de arranque no verde, deslocamento lateral e motoristas que olham/reagem.
import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';
import { CUSTOMER_TYPES } from '../data/Data.js';

const CAR_COLORS = [0xc23b2e, 0x2e6dc2, 0xb8bcc4, 0x22262e, 0xe8a81c, 0x3fa34d, 0x7c3aed, 0x9aa0aa, 0x8a4a12, 0x1f8a8b];
// compacto, sedan, SUV, van, táxi
const TYPES = [
  { L: 3.3, H: 0.62, cabH: 0.55, cabL: 0.52, sp: 1.06, extra: 'spoiler' },
  { L: 4.1, H: 0.70, cabH: 0.60, cabL: 0.50, sp: 1.00, extra: null },
  { L: 4.2, H: 0.92, cabH: 0.66, cabL: 0.62, sp: 0.95, extra: 'rack' },
  { L: 4.9, H: 1.05, cabH: 0.72, cabL: 0.70, sp: 0.88, extra: null },
  { L: 4.1, H: 0.70, cabH: 0.60, cabL: 0.50, sp: 1.08, extra: 'taxi' },
];
const SKIN = [0xd9a066, 0x8d5524, 0x4a3728, 0xe8b88a];

function badgeTexture(txt, bg) {
  const cnv = document.createElement('canvas'); cnv.width = cnv.height = 64;
  const g = cnv.getContext('2d');
  g.fillStyle = bg; g.beginPath(); g.arc(32, 32, 28, 0, 7); g.fill();
  g.fillStyle = '#111'; g.font = 'bold 38px Arial'; g.textAlign = 'center'; g.fillText(txt, 32, 46);
  return new THREE.CanvasTexture(cnv);
}

function pickCustomer(rng, luckLvl, forceVip) {
  if (forceVip) return CUSTOMER_TYPES.find(c => c.id === 'vip');
  const total = CUSTOMER_TYPES.reduce((a, c) => a + c.w, 0) + luckLvl * 2;
  let r = rng() * (total + (luckLvl * 1.5));
  for (const c of CUSTOMER_TYPES) {
    const w = c.w + (c.id !== 'normal' && c.id !== 'apressado' ? luckLvl * 0.9 : 0);
    r -= w;
    if (r <= 0) return c;
  }
  return CUSTOMER_TYPES[0];
}

class Car {
  constructor(scene, i) {
    this.scene = scene;
    this.type = TYPES[i % TYPES.length];
    this.group = new THREE.Group();
    this.buildMesh(i);
    this.active = false;
    this.customer = CUSTOMER_TYPES[0];
    this.soldThisRed = false;
    this.crazy = false;
    this.x = 0; this.z = 0; this.v = 0;
    this.reactT = 0; this.reactGood = false;
    scene.add(this.group);
    this.group.visible = false;
  }
  buildMesh(i) {
    const T = this.type;
    const color = i % 5 === 4 ? 0xe8c81c : CAR_COLORS[i % CAR_COLORS.length]; // táxi sempre amarelo
    const bodyM = new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0.3 });
    bodyM.userData.envI = 0.5; // tinta com presença, sem estourar no ULTRA
    const glassM = new THREE.MeshStandardMaterial({
      color: [0x2a3a52, 0x33455c, 0x1c2836][i % 3], roughness: 0.12, metalness: 0.4,
      transparent: true, opacity: 0.82, // motorista visível através do vidro
    });
    const L = T.L, W = 1.9, base = 0.30; // carro assentado, sem flutuar
    const body = new THREE.Mesh(new THREE.BoxGeometry(L, T.H, W), bodyM);
    body.position.y = base + T.H / 2; body.castShadow = true; this.group.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(L * T.cabL, T.cabH, W * 0.86), glassM);
    cab.position.set(-L * 0.05, base + T.H + T.cabH / 2 - 0.05, 0); cab.castShadow = true; this.group.add(cab);
    if (T.extra === 'spoiler') {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, W * 0.9), bodyM);
      sp.position.set(-L / 2 - 0.05, base + T.H + 0.15, 0); this.group.add(sp);
    }
    if (T.extra === 'rack') {
      const rk = new THREE.Mesh(new THREE.BoxGeometry(L * 0.4, 0.07, W * 0.6),
        new THREE.MeshStandardMaterial({ color: 0x22262e, roughness: 0.7 }));
      rk.position.set(0, base + T.H + T.cabH, 0); this.group.add(rk);
    }
    if (T.extra === 'taxi') {
      const cnv = document.createElement('canvas'); cnv.width = 128; cnv.height = 32;
      const g = cnv.getContext('2d');
      g.fillStyle = '#111'; g.fillRect(0, 0, 128, 32);
      g.fillStyle = '#ffd91a'; g.font = 'bold 24px Arial'; g.textAlign = 'center'; g.fillText('TAXI', 64, 25);
      const tex = new THREE.CanvasTexture(cnv);
      const m = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffd91a, emissiveMap: tex, emissiveIntensity: 0.8 });
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.24), m);
      sign.position.set(0, base + T.H + T.cabH + 0.1, 0); this.group.add(sign);
    }
    const trimM = new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.6 });
    for (const dx of [-L / 2 - 0.05, L / 2 + 0.05]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.3, W), trimM);
      b.position.set(dx, 0.32, 0); this.group.add(b);
    }
    // grade frontal + placa traseira + retrovisores (detalhe onde a câmera olha)
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 1.0),
      new THREE.MeshStandardMaterial({ color: 0x0c0e12, roughness: 0.4, metalness: 0.6 }));
    grille.position.set(L / 2 + 0.02, 0.45, 0); this.group.add(grille);
    const plateM = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.5 });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.5), plateM);
    plate.position.set(-L / 2 - 0.09, 0.5, 0); this.group.add(plate);
    for (const dz of [-W / 2 - 0.08, W / 2 + 0.08]) {
      const mir = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.08), bodyM);
      mir.position.set(L * 0.22, base + T.H + 0.1, dz); this.group.add(mir);
    }
    // Vehicle → SteeringPivot → WheelMesh: rolamento em torno do eixo lateral (Z local).
    // O giro é geometria pré-rotacionada; mesh.rotation.z = rolagem pura (sem "moeda").
    const wheelM = new THREE.MeshStandardMaterial({ color: 0x0e0f11, roughness: 0.95 });
    const hubM = new THREE.MeshStandardMaterial({ color: 0xb8bfc9, roughness: 0.3, metalness: 0.8 });
    this.wheels = [];
    const wr = T.extra === null && i % 5 === 3 ? 0.38 : 0.34;
    const wgeo = new THREE.CylinderGeometry(wr, wr, 0.24, 14);
    wgeo.rotateX(Math.PI / 2); // eixo do cilindro → Z (lateral do carro)
    const hgeo = new THREE.CylinderGeometry(0.14, 0.14, 0.26, 8);
    hgeo.rotateX(Math.PI / 2);
    for (const [dx, dz] of [[-L / 2 + 0.8, -W / 2], [L / 2 - 0.8, -W / 2], [-L / 2 + 0.8, W / 2], [L / 2 - 0.8, W / 2]]) {
      const pivot = new THREE.Group(); // steering (reto nas faixas; arquitetura pronta p/ curva)
      pivot.position.set(dx, wr, dz);
      const w = new THREE.Mesh(wgeo, wheelM);
      w.castShadow = true;
      const hub = new THREE.Mesh(hgeo, hubM);
      w.add(hub); // cubo acompanha a rolagem
      pivot.add(w);
      this.group.add(pivot);
      this.wheels.push({ pivot, spin: w, r: wr });
    }
    // vinco lateral da carroceria (leitura de painel, não caixa lisa)
    for (const dz of [-W / 2 - 0.005, W / 2 + 0.005]) {
      const crease = new THREE.Mesh(new THREE.BoxGeometry(L * 0.72, 0.035, 0.015), trimM);
      crease.position.set(0, base + T.H * 0.55, dz); this.group.add(crease);
    }
    const hl = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xffedb5, emissiveIntensity: 2.4 });
    const tl = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff2222, emissiveIntensity: 1.2 });
    this.tailMat = tl;
    for (const dz of [-0.6, 0.6]) {
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), hl);
      h.position.set(L / 2 + 0.02, 0.68, dz); this.group.add(h);
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.3), tl);
      t.position.set(-L / 2 - 0.03, 0.72, dz); this.group.add(t);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.7, 4.2, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }));
      cone.rotation.z = Math.PI / 2; cone.position.set(L / 2 + 2.1, 0.5, dz);
      this.group.add(cone);
    }
    // interior: piso escuro + bancos + painel (o vidro agora revela dentro)
    const inM = new THREE.MeshStandardMaterial({ color: 0x101216, roughness: 0.95 });
    const seatY = base + T.H + 0.02;
    const floor = new THREE.Mesh(new THREE.BoxGeometry(L * 0.55, 0.25, W * 0.78), inM);
    floor.position.set(-0.1, seatY - 0.28, 0); this.group.add(floor);
    const seatM = new THREE.MeshStandardMaterial({ color: 0x2a2d34, roughness: 0.9 });
    for (const dz of [-0.35, 0.35]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.45), seatM);
      seat.position.set(-0.35, seatY - 0.12, dz); this.group.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.45), seatM);
      back.position.set(-0.58, seatY + 0.12, dz); this.group.add(back);
    }
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, W * 0.7), inM);
    dash.position.set(0.55, seatY - 0.02, 0); this.group.add(dash);
    // motorista: tronco inclinado, braços até o volante, mãos no aro, rosto simples
    const drvM = new THREE.MeshStandardMaterial({
      color: [0x2e5aa8, 0xa82e5a, 0x3a3a3a, 0x2e8a5a][i % 4], roughness: 0.85 });
    const drvSkin = new THREE.MeshStandardMaterial({ color: SKIN[i % SKIN.length], roughness: 0.65 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.28, 4, 8), drvM);
    torso.position.set(-0.32, seatY + 0.10, 0.35); torso.rotation.z = 0.18; this.group.add(torso);
    const limb = (fx, fy, fz, tx, ty, tz, r, m) => {
      const a = new THREE.Vector3(fx, fy, fz), b = new THREE.Vector3(tx, ty, tz);
      const len = a.distanceTo(b);
      const limbM = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 2, 6), m);
      limbM.position.copy(a).lerp(b, 0.5);
      limbM.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      this.group.add(limbM);
    };
    for (const s of [-1, 1]) {
      const sz2 = 0.35 + s * 0.10;
      limb(-0.28, seatY + 0.20, sz2, 0.10, seatY - 0.02, 0.35 + s * 0.13, 0.05, drvM); // braço
      limb(0.10, seatY - 0.02, 0.35 + s * 0.13, 0.24, seatY + 0.09, 0.35 + s * 0.10, 0.042, drvSkin); // antebraço
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), drvSkin);
      hand.position.set(0.24, seatY + 0.09, 0.35 + s * 0.10); this.group.add(hand);
    }
    this.head = new THREE.Group();
    this.head.position.set(-0.28, seatY + 0.44, 0.35);
    this.headBaseY = seatY + 0.44;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), drvSkin);
    skull.castShadow = false; this.head.add(skull);
    const dEyeM = new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 0.4 });
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 6), dEyeM);
      e.position.set(0.115, 0.02, s * 0.055); this.head.add(e);
    }
    this.group.add(this.head);
    // volante
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 6, 12),
      new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.6 }));
    wheel.position.set(0.25, seatY - 0.02, 0.35); wheel.rotation.y = Math.PI / 2.4; this.group.add(wheel);
    // badges de estado: ! interessado, ? decidindo, ✓/✗ resultado
    this.badgeTex = {
      interest: badgeTexture('!', '#fbbf24'),
      decide: badgeTexture('?', '#7dd3fc'),
      yes: badgeTexture('✓', '#4ade80'),
      no: badgeTexture('✗', '#f87171'),
    };
    this.badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.badgeTex.interest, depthTest: false, transparent: true }));
    this.badge.scale.set(0.9, 0.9, 1);
    this.badgeBaseY = this.type.H + 1.55;
    this.badge.position.set(0, this.badgeBaseY, 0);
    this.badge.visible = false; this.group.add(this.badge);
    this.len = L;
  }
  spawn(lane, x, speed, customer, rng = Math.random) {
    this.lane = lane; this.baseSpeed = speed * this.type.sp;
    this.x = x; this.z = lane.z; this.v = Math.min(this.v, this.baseSpeed);
    this.v = 0; // arranca do zero no spawn (entra em cena acelerando)
    this.active = true;
    this.customer = customer; this.soldThisRed = false; this.crazy = false;
    // personalidade: cada carro dirige diferente
    this.accel = 5 + rng() * 3.5;
    this.brake = 12 + rng() * 7;
    this.followGap = 1.0 + rng() * 0.8;
    this.vmaxK = 0.9 + rng() * 0.2;
    this.laneOffset = (rng() - 0.5) * 0.7;
    this.goDelay = 0;
    this.reactT = 0; this.reactHideT = 0;
    // APRESSADO tem paciência curta: se ninguém vender em 8s parado, ele desiste
    this.patience = customer.id === 'apressado' ? 8 : Infinity;
    this.stopT = 0; this.patienceGone = false; this.patienceToasted = false;
    this.group.visible = true;
    this.group.rotation.z = 0;
    this.group.position.set(x, 0, lane.z);
    this.group.rotation.y = lane.dir > 0 ? 0 : Math.PI;
    this.badge.visible = false;
  }
  despawn() { this.active = false; this.group.visible = false; }
  react(good) { this.reactT = 0.8; this.reactGood = good; }
}

export class Traffic {
  constructor(scene, audio) {
    this.scene = scene; this.audio = audio;
    this.cars = [];
    for (let i = 0; i < 12; i++) this.cars.push(new Car(scene, i));
    this.spawnT = 0.5;
    this.intenseUntil = 0;
    this.forceVipNext = false;
    this.difficulty = 0;
    this.now = 0;
  }
  reset() { for (const c of this.cars) c.despawn(); }
  // onda de arranque: fila anda por ordem, não tudo de uma vez
  onGreen() {
    for (const lane of CONFIG.lanes) {
      const queue = this.cars
        .filter(c => c.active && c.lane === lane && c.v < 0.5)
        .sort((a, b) => ((lane.stopX - a.x) * lane.dir) - ((lane.stopX - b.x) * lane.dir));
      queue.forEach((c, idx) => { c.goDelay = idx * 0.35 + Math.random() * 0.25; });
    }
  }
  update(dt, light, luckLvl, rng = Math.random, playerPos = null, saleCar = null) {
    this.now += dt;
    const intense = this.now < this.intenseUntil;
    const maxCars = intense ? 10 : 6 + Math.round(this.difficulty * 3);
    const interval = intense ? 0.9 : 2.4 - this.difficulty * 1.1;
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = interval * (0.7 + rng() * 0.6);
      if (this.cars.filter(c => c.active).length < maxCars) this.trySpawn(rng, luckLvl);
    }
    for (const c of this.cars) {
      if (!c.active) continue;
      const lane = c.lane;
      let target = c.baseSpeed * c.vmaxK * (1 + this.difficulty * 0.25);
      const distToStop = (lane.stopX - c.x) * lane.dir;
      const mustStop = !light.carsMayGo && !c.crazy;
      if (mustStop && distToStop > -1 && distToStop < 26) {
        const ahead = this.carAhead(c);
        let stopAt = lane.stopX;
        if (ahead) stopAt = ahead.x - lane.dir * (ahead.len / 2 + c.len / 2 + c.followGap);
        const d = (stopAt - c.x) * lane.dir;
        if (d < 12) target = Math.max(0, c.baseSpeed * (d / 12));
        if (d < 0.35) target = 0;
      } else if (!mustStop && c.goDelay > 0) {
        c.goDelay -= dt; // espera sua vez na onda de arranque
        if (c.goDelay > 0) target = 0;
      }
      const rate = target > c.v ? c.accel : c.brake;
      c.v += Math.sign(target - c.v) * Math.min(Math.abs(target - c.v), rate * dt);
      if (Math.abs(c.v) < 0.02 && target === 0) c.v = 0;
      c.x += lane.dir * c.v * dt;
      // deriva lateral suave dentro da faixa (cada um tem sua linha)
      c.z += ((lane.z + c.laneOffset) - c.z) * Math.min(1, 1.5 * dt);
      c.group.position.x = c.x;
      c.group.position.z = c.z;
      // rolagem = distância / raio (mesmo sinal p/ as duas faixas: referencial local)
      for (const wh of c.wheels) wh.spin.rotation.z -= (c.v * dt) / wh.r;
      c.tailMat.emissiveIntensity = (target < c.v - 0.5 || (c.v === 0 && !light.carsMayGo)) ? 3 : 1.2;
      // badge: ? durante a venda, ✓/✗ breve após resultado, ! parado vendável
      const stopped = c.v < 0.4 && !light.carsMayGo && !c.crazy;
      if (stopped && !c.soldThisRed) {
        c.stopT += dt;
        if (c.stopT > c.patience) { c.soldThisRed = true; c.patienceGone = true; } // foi embora
      } else if (!stopped) c.stopT = 0;
      if (c.reactHideT > 0) {
        c.reactHideT -= dt;
        if (c.reactHideT <= 0) c.badge.visible = false;
      } else if (saleCar === c) { c.badge.material.map = c.badgeTex.decide; c.badge.visible = true; }
      else if (c.reactT <= 0) {
        c.badge.material.map = c.badgeTex.interest;
        c.badge.visible = stopped && !c.soldThisRed;
      }
      if (c.badge.visible) c.badge.position.y = c.badgeBaseY + Math.sin(this.now * 4) * 0.12;
      // reação física: balanço + motorista
      if (c.reactT > 0) {
        c.reactT -= dt;
        c.group.rotation.z = c.reactGood ? Math.sin(c.reactT * 12) * 0.02 * c.reactT : 0;
        if (c.reactGood) c.head.position.y = c.headBaseY + Math.abs(Math.sin(c.reactT * 10)) * 0.06;
        else c.head.rotation.y = Math.sin(c.reactT * 25) * 0.45; // nega com a cabeça
        if (c.reactT <= 0) {
          c.group.rotation.z = 0; c.head.rotation.y = 0; c.head.position.y = c.headBaseY;
          c.badge.material.map = c.reactGood ? c.badgeTex.yes : c.badgeTex.no;
          c.badge.visible = true;
          c.reactHideT = 1.2;
        }
      }
      // motorista olha para o jogador quando perto
      if (playerPos && !c.crazy && c.reactT <= 0) {
        const dx = playerPos.x - c.x, dz = playerPos.z - c.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 5) {
          const worldYaw = Math.atan2(dx, dz);
          let rel = worldYaw - c.group.rotation.y;
          while (rel > Math.PI) rel -= Math.PI * 2;
          while (rel < -Math.PI) rel += Math.PI * 2;
          c.head.rotation.y += (Math.max(-0.8, Math.min(0.8, rel)) - c.head.rotation.y) * Math.min(1, 8 * dt);
        } else {
          c.head.rotation.y += (0 - c.head.rotation.y) * Math.min(1, 4 * dt);
        }
      }
      if (Math.abs(c.x) > 40) c.despawn();
    }
  }
  carAhead(c) {
    let best = null, bestD = 1e9;
    for (const o of this.cars) {
      if (o === c || !o.active || o.lane !== c.lane) continue;
      const d = (o.x - c.x) * c.lane.dir;
      if (d > 0 && d < bestD) { bestD = d; best = o; }
    }
    return bestD < 9 ? best : null;
  }
  trySpawn(rng, luckLvl) {
    const free = this.cars.find(c => !c.active);
    if (!free) return;
    const lane = CONFIG.lanes[(rng() * 2) | 0];
    const x = lane.dir > 0 ? -39 : 39;
    for (const o of this.cars) {
      if (o.active && o.lane === lane && Math.abs(o.x - x) < 8) return;
    }
    const speed = 7.5 + rng() * 3.5;
    free.spawn(lane, x, speed, pickCustomer(rng, luckLvl, this.forceVipNext), rng);
    if (this.forceVipNext) this.forceVipNext = false;
  }
  nearestSellable(px, pz) {
    let best = null, bd = 1e9;
    for (const c of this.cars) {
      if (!c.active || c.v > 0.4 || c.soldThisRed || c.crazy) continue;
      const d = Math.hypot(c.x - px, c.z - pz);
      if (d < CONFIG.sell.range && d < bd) { bd = d; best = c; }
    }
    return best ? { car: best, dist: bd } : null;
  }
  anyMovingNear(px, pz, r = 7) {
    let best = null, bd = 1e9;
    for (const c of this.cars) {
      if (!c.active || c.v < 2.5) continue;
      const d = Math.hypot(c.x - px, c.z - pz);
      if (d < r && d < bd) { bd = d; best = c; }
    }
    return best ? { car: best, dist: bd } : null;
  }
  crazyDriver() {
    const free = this.cars.find(c => !c.active) ?? this.cars[0];
    const lane = CONFIG.lanes[(Math.random() * 2) | 0];
    free.spawn(lane, lane.dir > 0 ? -39 : 39, 15, CUSTOMER_TYPES[0]);
    free.crazy = true; free.baseSpeed = 15;
    this.audio.horn();
    return true;
  }
}
