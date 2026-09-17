// Jogador: vendedor ROXO reconstruído sobre Humanoid — proporções humanas,
// rosto com íris/pupila/nariz/orelhas, dedos, avental em camadas, walk com peso.
import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';
import { buildHumanoid, poseWalk, poseRun, poseIdle, clothMat } from './Humanoid.js';
import { buildProductMesh } from './Products3D.js';

const PURPLE = 0x8b3fd9;

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.pos = new THREE.Vector3(-24, 0, -7.2);
    this.vel = new THREE.Vector3();
    this.face = 0;
    this.moving = false; this.running = false; this.speedK = 1;
    this.selling = 0;
    this.fallen = 0;
    this.invuln = 0;
    this.stepAcc = 0; // fase do ciclo (avança com a distância, sem moonwalk)
    this.walkPhase = 0;
    this.blinkT = 2;
    this.build();
  }
  build() {
    const { group, parts } = buildHumanoid({
      skin: PURPLE, shirt: 0xf5ecd7, pants: 0x33363d, shoes: 0x26262c,
      detail: true, iris: 0x2a1245, asym: 0.7,
    });
    this.group = group; this.P = parts;
    const P = parts;
    // ---- boné assentado no crânio: calota achatada + aba frontal + broche ----
    const capM = new THREE.MeshStandardMaterial({ color: 0xc22424, roughness: 0.65 });
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), capM);
    cap.scale.y = 0.62; cap.position.set(0, 0.16, -0.02); cap.castShadow = true; P.head.add(cap);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.23, 0.035, 14, 1, false, -Math.PI / 2, Math.PI), capM);
    brim.position.set(0, 0.17, 0.08); brim.rotation.x = 0.12; P.head.add(brim);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.03, 10),
      new THREE.MeshStandardMaterial({ color: PURPLE, roughness: 0.3, emissive: PURPLE, emissiveIntensity: 0.25 }));
    pin.position.set(0, 0.27, 0.15); pin.rotation.x = 0.6; P.head.add(pin);
    // cabelo: franja sob a aba + costeletas + nuca (irregular de propósito)
    const hairM = new THREE.MeshStandardMaterial({ color: 0x1c1210, roughness: 0.95 });
    for (let f = 0; f < 5; f++) {
      const fr = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.10, 0.05), hairM);
      fr.position.set(-0.11 + f * 0.055, 0.125, 0.175);
      fr.rotation.set(0.15, 0, (f - 2) * 0.10);
      fr.rotation.y = (f - 2) * -0.12;
      P.head.add(fr);
    }
    for (const sx of [-1, 1]) {
      const tuft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.08), hairM);
      tuft.position.set(sx * 0.20, 0.02, 0.06); tuft.rotation.z = sx * -0.15; P.head.add(tuft);
    }
    const nape = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.10, 0.06), hairM);
    nape.position.set(0, -0.02, -0.20); P.head.add(nape);
    // cinto com fivela (separação camisa/calça)
    const beltM = new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.6 });
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.20, 0.07, 12), beltM);
    belt.position.set(0, 0.02, 0); P.torso.add(belt);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xb8a43a, metalness: 0.8, roughness: 0.3 }));
    buckle.position.set(0, 0.02, 0.20); P.torso.add(buckle);
    // ---- avental de couro em camadas + bolso de dinheiro ----
    const apronM = clothMat(0x6b4a2f, 0.8);
    const ap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.06), apronM);
    ap.position.set(0, 0.22, 0.20); ap.castShadow = true; P.torso.add(ap);
    const apTop = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.05), apronM);
    apTop.position.set(0, 0.48, 0.17); P.torso.add(apTop);
    for (const sx of [-1, 1]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.30, 0.025), apronM);
      strap.position.set(sx * 0.11, 0.55, 0.13); strap.rotation.x = -0.15; P.torso.add(strap);
    }
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x3fa34d, roughness: 0.7 }));
    pocket.position.set(0.02, 0.10, 0.24); P.torso.add(pocket);
    // ---- bandeja articulada na mão esquerda (compensa o balanço, fica nivelada) ----
    const trayPivot = new THREE.Group();
    trayPivot.position.set(0, -0.02, 0.02);
    P.armLHand.add(trayPivot);
    this.trayPivot = trayPivot;
    const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.035, 16),
      new THREE.MeshStandardMaterial({ color: 0x9a9aa4, metalness: 0.2, roughness: 0.55 }));
    tray.castShadow = true; trayPivot.add(tray);
    this.trayItems = new THREE.Group(); this.trayItems.position.y = 0.03;
    trayPivot.add(this.trayItems);
    this.trayProduct = null;
    // ---- anel de invencibilidade ----
    this.shield = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.8 }));
    this.shield.rotation.x = Math.PI / 2; this.shield.position.y = 0.15; this.shield.visible = false;
    group.add(this.shield);
    group.position.copy(this.pos);
    group.scale.setScalar(0.95);
    this.scene.add(group);
  }
  setTray(productId) {
    this.trayProduct = productId;
    while (this.trayItems.children.length) this.trayItems.remove(this.trayItems.children[0]);
    const wide = productId === 'agua' || productId === 'geladinho';
    const n = wide ? 2 : 3;
    for (let i = 0; i < n; i++) {
      const m = buildProductMesh(productId);
      m.scale.setScalar(1.25);
      m.position.set(-0.10 + i * (wide ? 0.20 : 0.10), 0, 0);
      this.trayItems.add(m);
    }
  }
  reset(x = -24, z = -7.2) {
    this.pos.set(x, 0, z); this.vel.set(0, 0, 0);
    this.fallen = 0; this.invuln = 0; this.selling = 0;
    this.group.position.copy(this.pos);
  }
  knockdown() { this.fallen = 1.1; this.invuln = 2.5; }
  get inStreet() { return Math.abs(this.pos.z) < CONFIG.street.halfWidth; }
  get nearShop() { return Math.hypot(this.pos.x + 27, this.pos.z + 7.2) < 3.4; }

  update(dt, input, colliders, shopCollider, frozen, cars = []) {
    const P = this.P;
    if (this.invuln > 0) {
      this.invuln -= dt;
      this.shield.visible = this.invuln > 0;
      if (this.shield.visible) this.shield.rotation.z += dt * 4;
    }
    if (this.fallen > 0) {
      this.fallen -= dt;
      this.group.rotation.x = -Math.PI / 2 * Math.min(1, this.fallen);
      this.group.position.y = Math.sin(Math.min(1, this.fallen) * Math.PI) * 0.2;
      if (this.fallen <= 0) { this.group.rotation.x = 0; this.group.position.y = 0; }
      return;
    }
    if (this.selling > 0) {
      this.selling -= dt;
      this.animate(dt, 0, true);
      return;
    }
    let mx = 0, mz = 0;
    if (!frozen && input.enabled) {
      const a = input.axis();
      this.running = input.running();
      const sin = Math.sin(input.yaw), cos = Math.cos(input.yaw);
      mx = a.x * cos + a.z * sin;
      mz = -a.x * sin + a.z * cos;
    }
    const maxSp = (this.running ? CONFIG.player.walk * 1.72 : CONFIG.player.walk) * this.speedK;
    this.vel.x += (mx * maxSp - this.vel.x) * Math.min(1, CONFIG.player.accel * dt / Math.max(1, maxSp));
    this.vel.z += (mz * maxSp - this.vel.z) * Math.min(1, CONFIG.player.accel * dt / Math.max(1, maxSp));
    if (!mx && !mz) this.vel.multiplyScalar(Math.max(0, 1 - 10 * dt));
    this.moving = this.vel.length() > 0.4;
    const speed = this.vel.length();

    const nx = this.pos.x + this.vel.x * dt;
    const nz = this.pos.z + this.vel.z * dt;
    const B = CONFIG.bounds;
    const cx = Math.max(B.minX, Math.min(B.maxX, nx));
    const cz = Math.max(B.minZ, Math.min(B.maxZ, nz));
    const r = CONFIG.player.radius;
    const hits = (x, z) => {
      for (const b of colliders) {
        if (x + r > b.min.x && x - r < b.max.x && z + r > b.min.z && z - r < b.max.z) return true;
      }
      if (shopCollider && x + r > shopCollider.min.x && x - r < shopCollider.max.x && z + r > shopCollider.min.z && z - r < shopCollider.max.z) return true;
      return false;
    };
    if (!hits(cx, this.pos.z)) this.pos.x = cx; else this.vel.x = 0;
    if (!hits(this.pos.x, cz)) this.pos.z = cz; else this.vel.z = 0;
    for (const c of cars) {
      if (!c.active) continue;
      const hx = c.len / 2 + 0.35, hz = 1.2;
      const czc = c.group.position.z;
      const dx = this.pos.x - c.x, dz = this.pos.z - czc;
      if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
        const px = hx - Math.abs(dx), pz = hz - Math.abs(dz);
        if (px < pz) { this.pos.x = c.x + Math.sign(dx || 1) * hx; this.vel.x = 0; }
        else { this.pos.z = czc + Math.sign(dz || 1) * hz; this.vel.z = 0; }
      }
    }
    if (this.moving) this.face = Math.atan2(this.vel.x, this.vel.z);
    this.group.position.copy(this.pos);
    let d = this.face - this.group.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.group.rotation.y += d * Math.min(1, 12 * dt);
    // fase anda com a DISTÂNCIA (nunca desliza): ~0.75m por passo
    this.walkPhase += (speed * dt / 0.75) * Math.PI;
    this.animate(dt, Math.min(1, speed / (CONFIG.player.walk * 1.72 * this.speedK)), false);
  }

  animate(dt, k, sellingPose) {
    const P = this.P;
    this.stepAcc += dt * (2 + k * 9);
    // piscar
    this.blinkT -= dt;
    if (this.blinkT <= 0) this.blinkT = 2 + Math.random() * 2.5;
    const blink = this.blinkT < 0.12 ? 0.1 : 1;
    for (const e of P.eyes) e.scale.y = 0.85 * blink;
    if (sellingPose) {
      // ENTREGA: direita estende o produto, tronco gira, cabeça confirma com aceno
      const w = Math.min(1, 10 * dt);
      P.armR.rotation.x += (-1.25 - P.armR.rotation.x) * w;
      P.armREl.rotation.x += (-0.20 - P.armREl.rotation.x) * w;
      P.armL.rotation.x += (-0.55 - P.armL.rotation.x) * w;
      P.armLEl.rotation.x += (-0.85 - P.armLEl.rotation.x) * w;
      P.torso.rotation.y += (0.18 - P.torso.rotation.y) * w;
      P.head.rotation.x = -0.05 + Math.sin(this.stepAcc * 6) * 0.05; // aceno curto
      P.head.rotation.y *= 0.9;
      this.levelTray();
      return;
    }
    P.torso.rotation.y *= 0.85;
    if (k < 0.05) {
      poseIdle(P, this.stepAcc * 0.25 + 10, 1);
      P.armL.rotation.x = -0.45; P.armLEl.rotation.x = -0.75; // bandeja em repouso
    } else if (k < 0.62) {
      poseWalk(P, this.walkPhase, k / 0.62, this.stepAcc);
      // braço da bandeja balança menos e mantém a carga
      P.armL.rotation.x *= 0.25;
      P.armL.rotation.x += -0.40 * (1 - 0.25);
      P.armLEl.rotation.x = -0.7;
    } else {
      poseRun(P, this.walkPhase * 1.15, Math.min(1, (k - 0.62) / 0.38));
      P.armL.rotation.x = -0.55; P.armLEl.rotation.x = -0.9; // protege a bandeja correndo
    }
    this.levelTray();
    // lean sutil
    const fx = Math.sin(this.group.rotation.y), fz = Math.cos(this.group.rotation.y);
    const fwd = this.vel.x * fx + this.vel.z * fz;
    const lat = this.vel.x * fz - this.vel.z * fx;
    this.group.rotation.x = Math.max(-0.03, Math.min(0.12, fwd * 0.014));
    this.group.rotation.z = Math.max(-0.09, Math.min(0.09, -lat * 0.012));
  }
  levelTray() {
    // bandeja sempre nivelada: anula o pitch acumulado do braço
    this.trayPivot.rotation.x = -(this.P.armL.rotation.x + this.P.armLEl.rotation.x);
    this.trayPivot.rotation.z = -(this.P.armL.rotation.z || 0);
  }
}
