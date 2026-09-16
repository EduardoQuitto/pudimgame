// Efeitos: partículas discretas em pool + números flutuantes DOM projetados.
import * as THREE from 'three';

export class Effects {
  constructor(scene, camera) {
    this.scene = scene; this.camera = camera;
    this.enabled = true; // modo "reduzir efeitos" desliga bursts e floats
    this.pool = [];
    this.floatLayer = document.getElementById('floats');
    // pool de bursts (Points pequenos reutilizáveis)
    for (let i = 0; i < 6; i++) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(40 * 3), 3));
      const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffd166, size: 0.14, transparent: true, opacity: 1, depthWrite: false }));
      p.visible = false; p.frustumCulled = false;
      scene.add(p);
      this.pool.push({ pts: p, t: 0, dur: 0, vel: new Float32Array(40 * 3) });
    }
    this.v = new THREE.Vector3();
    // notas voando do cliente até o jogador (pool de 3)
    const bcnv = document.createElement('canvas'); bcnv.width = 64; bcnv.height = 32;
    const bg = bcnv.getContext('2d');
    bg.fillStyle = '#3fa34d'; bg.fillRect(0, 0, 64, 32);
    bg.fillStyle = '#d8f0dc'; bg.fillRect(8, 6, 48, 20);
    bg.fillStyle = '#2b7a38'; bg.font = 'bold 16px Arial'; bg.textAlign = 'center';
    bg.fillText('R$', 32, 22);
    const btex = new THREE.CanvasTexture(bcnv);
    this.bills = [];
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.17),
        new THREE.MeshBasicMaterial({ map: btex, side: THREE.DoubleSide, transparent: true }));
      m.visible = false; scene.add(m);
      this.bills.push({ m, t: 0, dur: 0.55, from: new THREE.Vector3(), to: new THREE.Vector3(), delay: 0 });
    }
  }
  cashFly(from, to) {
    if (!this.enabled) return;
    const b = this.bills.find(x => !x.m.visible) ?? this.bills[0];
    b.from.copy(from); b.from.y += 1.1;
    b.to.copy(to); b.to.y += 1.2;
    b.t = 0; b.delay = this.bills.indexOf(b) * 0.09;
    b.m.visible = false; // aparece após o delay
  }
  burst(pos, color = 0xffd166, n = 30) {
    if (!this.enabled) return;
    const b = this.pool.find(x => !x.pts.visible) ?? this.pool[0];
    b.pts.material.color.set(color);
    const a = b.pts.geometry.attributes.position.array;
    for (let i = 0; i < 40; i++) {
      a[i * 3] = pos.x; a[i * 3 + 1] = pos.y + 0.5; a[i * 3 + 2] = pos.z;
      const th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI;
      const sp = 2 + Math.random() * 3;
      b.vel[i * 3] = Math.cos(th) * Math.sin(ph) * sp;
      b.vel[i * 3 + 1] = Math.abs(Math.cos(ph)) * sp + 2;
      b.vel[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * sp;
    }
    b.pts.geometry.attributes.position.needsUpdate = true;
    b.pts.geometry.setDrawRange(0, n);
    b.t = 0; b.dur = 0.7; b.pts.visible = true; b.pts.material.opacity = 1;
  }
  float(worldPos, text, color = '#fbbf24') {
    if (!this.enabled) return;
    this.v.copy(worldPos).project(this.camera);
    if (this.v.z > 1) return;
    const el = document.createElement('div');
    el.className = 'float-n'; el.textContent = text; el.style.color = color;
    el.style.left = ((this.v.x * 0.5 + 0.5) * 100) + '%';
    el.style.top = ((-this.v.y * 0.5 + 0.5) * 100) + '%';
    this.floatLayer.appendChild(el);
    setTimeout(() => el.remove(), 1450);
  }
  update(dt) {
    for (const b of this.bills) {
      if (b.t >= b.dur) { b.m.visible = false; continue; }
      if (b.delay > 0) { b.delay -= dt; continue; }
      b.m.visible = true;
      b.t += dt;
      const k = Math.min(1, b.t / b.dur);
      b.m.position.lerpVectors(b.from, b.to, k);
      b.m.position.y += Math.sin(k * Math.PI) * 0.8; // arco
      b.m.rotation.y += dt * 9;
      b.m.rotation.x = Math.sin(k * 12) * 0.4;
      if (k >= 1) b.m.visible = false;
    }
    for (const b of this.pool) {
      if (!b.pts.visible) continue;
      b.t += dt;
      const a = b.pts.geometry.attributes.position.array;
      for (let i = 0; i < 40; i++) {
        a[i * 3] += b.vel[i * 3] * dt;
        a[i * 3 + 1] += b.vel[i * 3 + 1] * dt;
        a[i * 3 + 2] += b.vel[i * 3 + 2] * dt;
        b.vel[i * 3 + 1] -= 8 * dt;
      }
      b.pts.geometry.attributes.position.needsUpdate = true;
      b.pts.material.opacity = 1 - b.t / b.dur;
      if (b.t >= b.dur) b.pts.visible = false;
    }
  }
}
