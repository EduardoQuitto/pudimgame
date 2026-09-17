// Pedestres v2: sistema modular real — corpo + roupa GEOMÉTRICA (jaqueta/moletom/
// vestido/shorts) + 8 cabelos com franja + acessórios (óculos/bolsa/chapéu).
// Variação de verdade: altura, largura, crânio, postura, passo. LOD por distância.
import * as THREE from 'three';
import { buildHumanoid, poseWalk, poseIdle, clothMat, SKINS } from './Humanoid.js';

const SHIRTS = [0x4a6b8a, 0x8a4a5a, 0x5a7a5a, 0x777788, 0xa88a3a, 0x704a8a, 0x3f6f6f, 0xb0503a];
const PANTS = [0x2e3138, 0x4a3b2c, 0x2c3e50, 0x555560, 0x1f2422, 0x6b5a3e];
const HAIR_C = [0x1a1210, 0x2e1c10, 0x555555, 0x8a8a8a, 0x4a2c14, 0x0e0e10];
const JACKETS = [0x333a44, 0x5a2e2e, 0x2e4a3a, 0x6b5a2e];

// Cabelo com franja e volume (nunca capacete liso). Retorna meshes p/ LOD.
function addHair(head, style, color) {
  const lod = [];
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
  const add = (mm) => { head.add(mm); lod.push(mm); return mm; };
  const dome = (y, r, sy) => {
    const h = add(new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.58), m));
    h.position.y = y; h.scale.set(1, sy, 1); h.rotation.y = style;
  };
  const fringe = (n = 5) => {
    for (let f = 0; f < n; f++) {
      const fr = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.085, 0.045), m));
      fr.position.set(-0.10 + f * (0.20 / Math.max(1, n - 1)), 0.135, 0.175);
      fr.rotation.set(0.12, 0, (f - (n - 1) / 2) * 0.09);
    }
  };
  const side = () => {
    for (const s of [-1, 1]) {
      const p = add(new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.13, 0.09), m));
      p.position.set(s * 0.20, 0.03, 0.02); p.rotation.z = s * -0.12;
    }
  };
  if (style === 0) { dome(0.15, 0.21, 0.75); fringe(); side(); }                    // curto c/ franja
  else if (style === 1) { dome(0.15, 0.205, 0.7); fringe(4);                        // coque
    const bun = add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), m));
    bun.position.set(0.03, 0.21, -0.21); }
  else if (style === 2) { const h = add(new THREE.Mesh(                          // gorro de lã
    new THREE.CylinderGeometry(0.19, 0.215, 0.15, 12), clothMat(0x8a2a2a, 0.95)));
    h.position.y = 0.21;
    const pom = add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), clothMat(0xd8d2c4, 0.95)));
    pom.position.y = 0.31; }
  else if (style === 3) { dome(0.15, 0.21, 0.75); fringe(6); side();               // comprido
    const back = add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.30, 0.10), m));
    back.position.set(0, -0.02, -0.19); }
  else if (style === 4) { dome(0.15, 0.215, 0.78);                                  // repartido lateral
    const part = add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.20), m));
    part.position.set(-0.03, 0.26, -0.02); part.rotation.z = 0.08; }
  else if (style === 5) { for (let c = 0; c < 7; c++) {                            // cacheado
      const cu = add(new THREE.Mesh(new THREE.SphereGeometry(0.075, 7, 6), m));
      const a = (c / 7) * Math.PI * 2;
      cu.position.set(Math.cos(a) * 0.16, 0.20 + (c % 2) * 0.03, Math.sin(a) * 0.16 - 0.02);
    } fringe(3); }
  else if (style === 6) { dome(0.15, 0.20, 0.72);                                   // rabo de cavalo
    const tail = add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.03, 0.30, 8), m));
    tail.position.set(0, 0.08, -0.24); tail.rotation.x = 0.25; }
  // estilo 7 = careca (nada)
  return lod;
}

// Roupa como GEOMETRIA sobre o corpo base.
function addClothing(P, kind, color) {
  const g = new THREE.Group();
  const m = clothMat(color, 0.92);
  if (kind === 1) { // jaqueta aberta: painéis + lapelas + zíper
    for (const s of [-1, 1]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.52, 0.06), m);
      panel.position.set(s * 0.13, 0.30, 0.17); panel.rotation.y = s * -0.12;
      panel.castShadow = true; g.add(panel);
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.03), m);
      lapel.position.set(s * 0.06, 0.48, 0.20); lapel.rotation.set(-0.1, s * 0.35, s * 0.15);
      g.add(lapel);
    }
    const zip = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.44, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: 0.7, roughness: 0.35 }));
    zip.position.set(0, 0.28, 0.215); g.add(zip);
  } else if (kind === 2) { // moletom: capuz atrás + bolso canguru
    const hood = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.045, 8, 12, Math.PI * 1.4), m);
    hood.position.set(0, 0.52, -0.15); hood.rotation.set(0.4, 0, Math.PI * 0.8);
    g.add(hood);
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.05), m);
    pocket.position.set(0, 0.08, 0.20); g.add(pocket);
  } else if (kind === 3) { // vestido: saia rodada sobre o quadril
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.30, 0.42, 12), m);
    skirt.position.set(0, -0.05, 0); skirt.castShadow = true; g.add(skirt);
    const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.21, 0.08, 12),
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 }));
    waist.position.set(0, 0.16, 0); g.add(waist);
  }
  P.torso.add(g);
  return g;
}

function addAccessory(P, kind, rng) {
  if (kind === 0) { // óculos
    const m = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.3 });
    for (const s of [-1, 1]) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.008, 6, 12), m);
      r.position.set(s * 0.077, 0.10, 0.20); P.head.add(r);
    }
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.008, 0.008), m);
    br.position.set(0, 0.10, 0.20); P.head.add(br);
  } else if (kind === 1) { // bolsa transversal
    const m = clothMat([0x6b4a2f, 0x333333, 0x7a3a4a][(rng() * 3) | 0], 0.85);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.02), m);
    strap.position.set(0.05, 0.30, -0.16); strap.rotation.z = 0.25; strap.rotation.x = 0.1;
    P.torso.add(strap);
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.24, 0.10), m);
    bag.position.set(-0.22, 0.02, -0.14); bag.castShadow = true; P.torso.add(bag);
  } else if (kind === 2) { // boné de aba
    const m = clothMat([0x2e5aa8, 0x3a3a3a, 0xa82e2e][(rng() * 3) | 0], 0.85);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.20, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), m);
    crown.scale.y = 0.6; crown.position.set(0, 0.17, -0.01); P.head.add(crown);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.03, 12, 1, false, -Math.PI / 2, Math.PI), m);
    brim.position.set(0, 0.175, 0.10); P.head.add(brim);
  }
}

class Ped {
  constructor(scene, i, rng = Math.random) {
    const skin = SKINS[(rng() * (SKINS.length - 1)) | 0];
    const shorts = rng() < 0.3;
    const clothKind = (rng() * 4) | 0; // 0 camiseta, 1 jaqueta, 2 moletom, 3 vestido
    const { group, parts } = buildHumanoid({
      skin,
      shirt: SHIRTS[(rng() * SHIRTS.length) | 0],
      pants: PANTS[(rng() * PANTS.length) | 0],
      shoes: [0x1f1f24, 0x4a3b2c, 0xd8d2c4, 0x703030][(rng() * 4) | 0],
      detail: false, bareShins: shorts,
      headSize: [0.92 + rng() * 0.13, 0.94 + rng() * 0.10, 0.92 + rng() * 0.12],
      bodyWidth: 0.90 + rng() * 0.22,
    });
    this.P = parts; this.g = group;
    addClothing(parts, clothKind, JACKETS[(rng() * JACKETS.length) | 0]);
    const accRoll = rng();
    if (accRoll < 0.22) addAccessory(parts, 0, rng);
    else if (accRoll < 0.42) addAccessory(parts, 1, rng);
    else if (accRoll < 0.58) addAccessory(parts, 2, rng);
    this.lodMeshes = addHair(parts.head, (rng() * 8) | 0, HAIR_C[(rng() * HAIR_C.length) | 0]);
    this.lodMeshes.push(...parts.eyes);
    // postura: leve corcunda ou ereto
    this.posture = (rng() - 0.5) * 0.09;
    this.swing = 0.85 + rng() * 0.3;
    const hScale = 0.88 + rng() * 0.14;
    group.scale.set(hScale * (0.95 + rng() * 0.1), hScale, hScale);
    group.traverse(o => { if (o.isMesh) o.castShadow = false; });
    this.side = i % 2 === 0 ? -1 : 1;
    this.x = -28 + i * 13 + rng() * 4;
    this.z = this.side * (7.0 + rng() * 1.2);
    this.dir = i % 2 === 0 ? 1 : -1;
    this.yaw = this.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    this.speed = 0.8 + rng() * 0.6;
    this.phase = rng() * 6;
    this.mode = 'walk';
    scene.add(group);
  }
}

export class Peds {
  constructor(scene) {
    this.list = [new Ped(scene, 0), new Ped(scene, 1), new Ped(scene, 2), new Ped(scene, 3)];
  }
  turnTo(p, target, dt) {
    let d = target - p.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    p.yaw += d * Math.min(1, 6 * dt); // vira o corpo, não teleporta a pose
    p.g.rotation.y = p.yaw;
  }
  update(dt, carsMayGo, t, camPos = null) {
    for (const p of this.list) {
      const P = p.P;
      P.torso.rotation.x = p.posture;
      if (camPos) {
        const far = (p.x - camPos.x) ** 2 + (p.z - camPos.z) ** 2 > 26 * 26;
        if (far !== p._far) { p._far = far; for (const m of p.lodMeshes) m.visible = !far; }
      }
      if (p.mode === 'walk') {
        p.x += p.dir * p.speed * dt;
        if (p.x > 30) { p.x = 30; p.dir = -1; }
        if (p.x < -30) { p.x = -30; p.dir = 1; }
        if (Math.abs(p.x) < 3.4) p.mode = carsMayGo ? 'wait' : 'cross';
        p.phase += (p.speed * dt / 0.75) * Math.PI;
        poseWalk(P, p.phase, 0.8 * p.swing, t);
        p.g.position.set(p.x, 0, p.z);
        this.turnTo(p, p.dir > 0 ? Math.PI / 2 : -Math.PI / 2, dt);
      } else if (p.mode === 'wait') {
        p.g.position.set(Math.sign(p.x) * 3.4, 0, p.z);
        this.turnTo(p, p.z > 0 ? Math.PI : 0, dt);
        poseIdle(P, t + p.phase, 0.7);
        if (!carsMayGo) p.mode = 'cross';
      } else {
        const tz = -p.side * 7.2;
        p.z += Math.sign(tz - p.z) * p.speed * 1.2 * dt;
        p.phase += (p.speed * 1.2 * dt / 0.75) * Math.PI;
        poseWalk(P, p.phase, 0.9 * p.swing, t);
        p.g.position.set(p.x, 0, p.z);
        this.turnTo(p, tz > p.z ? 0 : Math.PI, dt);
        if (Math.abs(tz - p.z) < 0.25) { p.side *= -1; p.z = tz; p.mode = 'walk'; }
      }
    }
  }
}
