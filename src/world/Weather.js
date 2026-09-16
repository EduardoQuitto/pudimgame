// Clima: chuva otimizada (Points únicos), chão molhado, neblina e regra de gorjeta.
import * as THREE from 'three';

export class Weather {
  constructor(scene, map, audio, onToast) {
    this.scene = scene; this.map = map; this.audio = audio; this.onToast = onToast;
    this.raining = false; this.rainT = 0; this.nextRain = 70 + Math.random() * 60;
    this.fogK = 1; // multiplicador de alcance (qualidade + distância de visão)
    this.geo = null; this.points = null; this.vel = null;
    this.max = 2200;
    this.build();
  }
  build() {
    this.geo = new THREE.BufferGeometry();
    const pos = new Float32Array(this.max * 3);
    this.vel = new Float32Array(this.max);
    for (let i = 0; i < this.max; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 90;
      pos[i * 3 + 1] = Math.random() * 22;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
      this.vel[i] = 16 + Math.random() * 8;
    }
    this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.points = new THREE.Points(this.geo, new THREE.PointsMaterial({
      color: 0xbfd8ff, size: 0.16, transparent: true, opacity: 0.8, depthWrite: false,
    }));
    this.windX = 2.0; // vento leve: chuva inclinada, não vertical chapada
    this.points.visible = false; this.points.frustumCulled = false;
    this.scene.add(this.points);
    this.count = 900;
  }
  forceRain(dur = 25) { this.setRain(true, dur); }
  setRain(on, dur = 25) {
    this.raining = on;
    this.points.visible = on;
    this.map.setWet(on);
    this.audio.setRain(on);
    if (on) {
      this.rainT = dur;
      this.scene.fog.near = 35 * this.fogK; this.scene.fog.far = 130 * this.fogK;
      this.onToast('🌧 Chuva! Menos clientes, mas gorjetas maiores.', '');
    } else {
      this.scene.fog.near = 55 * this.fogK; this.scene.fog.far = 190 * this.fogK;
    }
  }
  setQualityCount(n) { this.count = n; this.geo.setDrawRange(0, n); }
  update(dt, cx) {
    if (!this.raining) {
      this.nextRain -= dt;
      if (this.nextRain <= 0) { this.setRain(true, 20 + Math.random() * 15); }
      return;
    }
    this.rainT -= dt;
    if (this.rainT <= 0) { this.setRain(false); this.nextRain = 80 + Math.random() * 70; return; }
    const p = this.geo.attributes.position.array;
    const n = Math.min(this.count, this.max);
    for (let i = 0; i < n; i++) {
      p[i * 3 + 1] -= this.vel[i] * dt;
      p[i * 3] += this.windX * dt;
      if (p[i * 3 + 1] < 0) {
        p[i * 3 + 1] = 20 + Math.random() * 3;
        p[i * 3] = cx + (Math.random() - 0.5) * 80;
        p[i * 3 + 2] = (Math.random() - 0.5) * 36;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.points.position.x = 0;
  }
}
