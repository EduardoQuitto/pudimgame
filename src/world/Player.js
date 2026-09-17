// Jogador: protagonista reconstruído (Protagonist.js) — mesma API, corpo novo.
import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';
import { poseWalk, poseRun, poseIdle } from './Humanoid.js';
import { buildProtagonist, dressVendor } from './Protagonist.js';
import { buildProductMesh } from './Products3D.js';

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
    this.stepAcc = 0;
    this.walkPhase = 0;
    this.blinkT = 2;
    this.build();
  }
  build() {
    const { group, parts, mats } = buildProtagonist({ bare: false });
    dressVendor(parts, mats);
    this.group = group; this.P = parts;
    const P = parts;
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
    group.scale.setScalar(0.96); // ~1.85m
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
