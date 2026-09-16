// Pedestres: sistema modular — corpo + cabeça + cabelo + roupa sorteados.
// Nenhum clone: altura, pele, cabelo, roupa, passo e fase, tudo varia.
import * as THREE from 'three';
import { buildHumanoid, poseWalk, poseIdle, clothMat, SKINS } from './Humanoid.js';

const SHIRTS = [0x4a6b8a, 0x8a4a5a, 0x5a7a5a, 0x777788, 0xa88a3a, 0x704a8a, 0x3f6f6f];
const PANTS = [0x2e3138, 0x4a3b2c, 0x2c3e50, 0x555560, 0x1f2422];
const HAIR_C = [0x1a1210, 0x2e1c10, 0x555555, 0x8a8a8a, 0x4a2c14];

function addHair(head, style, color) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
  const add = (mm) => { head.add(mm); return mm; };
  if (style === 0) { // curto rente (cobre o topo do crânio, sem enterrar)
    const h = add(new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), m));
    h.position.y = 0.14; h.scale.set(1, 0.75, 1);
  } else if (style === 1) { // coque
    const h = add(new THREE.Mesh(new THREE.SphereGeometry(0.205, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), m));
    h.position.y = 0.14; h.scale.set(1, 0.7, 1);
    const bun = add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), m));
    bun.position.set(0, 0.20, -0.21);
  } else if (style === 2) { // gorro
    const h = add(new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.14, 12), clothMat(0x8a2a2a, 0.95)));
    h.position.y = 0.20;
    const pom = add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), clothMat(0xd8d2c4, 0.95)));
    pom.position.y = 0.30;
  } else if (style === 3) { // comprido atrás
    const h = add(new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), m));
    h.position.y = 0.14; h.scale.set(1, 0.75, 1);
    const back = add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.30, 0.10), m));
    back.position.set(0, -0.02, -0.19);
  }
  // estilo 4 = careca
}

class Ped {
  constructor(scene, i, rng = Math.random) {
    const skin = SKINS[(rng() * (SKINS.length - 1)) | 0]; // pedestres: tons humanos
    const { group, parts } = buildHumanoid({
      skin,
      shirt: SHIRTS[(rng() * SHIRTS.length) | 0],
      pants: PANTS[(rng() * PANTS.length) | 0],
      shoes: 0x1f1f24,
      detail: false,
      iris: [0x3a2415, 0x1a2a1a, 0x2a1a2a][i % 3],
    });
    this.P = parts; this.g = group;
    addHair(parts.head, i % 5, HAIR_C[(rng() * HAIR_C.length) | 0]);
    const hScale = 0.90 + rng() * 0.12;
    group.scale.set(hScale * (0.95 + rng() * 0.1), hScale, hScale);
    group.traverse(o => { if (o.isMesh) o.castShadow = false; }); // fundo: sem sombra
    this.side = i % 2 === 0 ? -1 : 1;
    this.x = -28 + i * 17 + rng() * 4;
    this.z = this.side * (7.0 + rng() * 1.2);
    this.dir = i % 2 === 0 ? 1 : -1;
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
  update(dt, carsMayGo, t) {
    for (const p of this.list) {
      const P = p.P;
      if (p.mode === 'walk') {
        p.x += p.dir * p.speed * dt;
        if (p.x > 30) { p.x = 30; p.dir = -1; }
        if (p.x < -30) { p.x = -30; p.dir = 1; }
        if (Math.abs(p.x) < 3.4) p.mode = carsMayGo ? 'wait' : 'cross';
        p.phase += (p.speed * dt / 0.75) * Math.PI;
        poseWalk(P, p.phase, 0.8, t);
        p.g.position.set(p.x, 0, p.z);
        p.g.rotation.y = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else if (p.mode === 'wait') {
        p.g.position.set(Math.sign(p.x) * 3.4, 0, p.z);
        p.g.rotation.y = p.z > 0 ? Math.PI : 0;
        poseIdle(P, t + p.phase, 0.7);
        if (!carsMayGo) p.mode = 'cross';
      } else {
        const tz = -p.side * 7.2;
        p.z += Math.sign(tz - p.z) * p.speed * 1.2 * dt;
        p.phase += (p.speed * 1.2 * dt / 0.75) * Math.PI;
        poseWalk(P, p.phase, 0.9, t);
        p.g.position.set(p.x, 0, p.z);
        p.g.rotation.y = tz > p.z ? 0 : Math.PI;
        if (Math.abs(tz - p.z) < 0.25) { p.side *= -1; p.z = tz; p.mode = 'walk'; }
      }
    }
  }
}
