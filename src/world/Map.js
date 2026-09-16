// Map: rua compacta super-detalhada, 100% procedural (canvas textures + geometria).
// Layout (X = comprimento da rua, Z = largura):
//   z=-9.6..-5.2 calçada sul (barraca em x≈-27) | rua z=-5.2..5.2 (faixas z=∓2.6)
//   z=+5.2..+9.6 calçada norte | faixa de pedestres em x∈[-2,2] | semáforos em x=±4
import * as THREE from 'three';
import { buildProductMesh } from './Products3D.js';

function canvasTex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  t.anisotropy = 4; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class MapWorld {
  constructor(scene) {
    this.scene = scene;
    this.colliders = []; // THREE.Box3 estáticos p/ câmera e jogador
    this.lampLights = [];
    this.shopAnchor = new THREE.Vector3(-27, 0, -7.2);
    this.shopGroup = null;
    this.roadMat = null; this.groundMats = [];
    this.trees = [];
    this.lampMat = null;
    this.puddles = null;
    this.build();
  }
  addCollider(x, z, w, d, h = 3) {
    this.colliders.push(new THREE.Box3(
      new THREE.Vector3(x - w / 2, 0, z - d / 2),
      new THREE.Vector3(x + w / 2, h, z + d / 2)));
  }

  build() {
    const S = this.scene;
    // ---------- céu pôr-do-sol + neblina ----------
    const skyTex = canvasTex(16, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#0b1026'); gr.addColorStop(0.45, '#3b2a5e');
      gr.addColorStop(0.72, '#c65b3a'); gr.addColorStop(0.85, '#f2a54a'); gr.addColorStop(1, '#2a1a2e');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(220, 24, 16),
      new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }));
    S.add(sky);
    S.fog = new THREE.Fog(0x2e2440, 55, 190);
    const sun = new THREE.Mesh(new THREE.CircleGeometry(9, 32),
      new THREE.MeshBasicMaterial({ color: 0xffb45e, fog: false }));
    sun.position.set(-150, 26, -60); sun.lookAt(0, 10, 0); S.add(sun);
    // skyline distante: silhuetas que vendem cidade maior (barato, sem colisor)
    const skylineTex = canvasTex(64, 128, (g, w, h) => {
      g.fillStyle = '#101018'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) {
        if (Math.random() < 0.4) { g.fillStyle = Math.random() < 0.7 ? '#c9a45e' : '#7fa8c9'; g.fillRect(4 + Math.random() * (w - 10), 4 + Math.random() * (h - 10), 3, 4); }
      }
    });
    const skyM = new THREE.MeshBasicMaterial({ map: skylineTex });
    const darkM = new THREE.MeshBasicMaterial({ color: 0x14141c });
    for (const sz of [-1, 1]) {
      for (let i = 0; i < 9; i++) {
        const w = 8 + Math.random() * 8, h = 10 + Math.random() * 18;
        const x = -60 + i * 14 + Math.random() * 6;
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 6), i % 3 ? darkM : skyM);
        b.position.set(x, h / 2 - 0.5, sz * (40 + Math.random() * 12));
        S.add(b);
      }
    }
    const clCnv = document.createElement('canvas'); clCnv.width = 256; clCnv.height = 64;
    const cg = clCnv.getContext('2d');
    for (let i = 0; i < 26; i++) {
      const x = 20 + Math.random() * 216, y = 20 + Math.random() * 26, r = 8 + Math.random() * 16;
      const gr = cg.createRadialGradient(x, y, 1, x, y, r);
      gr.addColorStop(0, 'rgba(46,32,64,0.85)'); gr.addColorStop(1, 'rgba(46,32,64,0)');
      cg.fillStyle = gr; cg.beginPath(); cg.arc(x, y, r, 0, 7); cg.fill();
    }
    const clTex = new THREE.CanvasTexture(clCnv);
    this.clouds = [];
    for (let i = 0; i < 5; i++) {
      const cl = new THREE.Mesh(new THREE.PlaneGeometry(60 + Math.random() * 40, 12 + Math.random() * 6),
        new THREE.MeshBasicMaterial({ map: clTex, transparent: true, opacity: 0.8, fog: false, depthWrite: false }));
      cl.position.set(-120 + i * 55 + Math.random() * 20, 42 + Math.random() * 22, -100 - Math.random() * 40);
      S.add(cl);
      this.clouds.push({ m: cl, sp: 0.4 + Math.random() * 0.5 });
    }

    // ---------- chão base ----------
    const base = new THREE.Mesh(new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({ color: 0x1a1a20, roughness: 1 }));
    base.rotation.x = -Math.PI / 2; base.position.y = -0.05; base.receiveShadow = true; S.add(base);

    // ---------- ASFALTO com detalhes (rachaduras, manchas, marcas de pneu) ----------
    const roadTex = canvasTex(1024, 256, (g, w, h) => {
      g.fillStyle = '#3a3b42'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 5200; i++) {
        g.fillStyle = `rgba(${20 + Math.random() * 60 | 0},${20 + Math.random() * 60 | 0},${22 + Math.random() * 60 | 0},0.5)`;
        g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
      // manchas de óleo
      for (let i = 0; i < 14; i++) {
        const x = Math.random() * w, y = Math.random() * h, r = 8 + Math.random() * 22;
        const gr = g.createRadialGradient(x, y, 1, x, y, r);
        gr.addColorStop(0, 'rgba(10,10,14,0.55)'); gr.addColorStop(1, 'rgba(10,10,14,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
      // rachaduras
      g.strokeStyle = 'rgba(15,15,18,0.8)'; g.lineWidth = 1.5;
      for (let i = 0; i < 10; i++) {
        let x = Math.random() * w, y = Math.random() * h;
        g.beginPath(); g.moveTo(x, y);
        for (let s = 0; s < 8; s++) { x += (Math.random() - 0.5) * 60; y += (Math.random() - 0.5) * 24; g.lineTo(x, y); }
        g.stroke();
      }
      // marcas de pneu
      g.fillStyle = 'rgba(12,12,14,0.35)';
      for (const yy of [h * 0.28, h * 0.36, h * 0.64, h * 0.72]) g.fillRect(0, yy, w, 7);
      // remendos de asfalto (retângulos mais escuros, paralelos à via)
      for (let i = 0; i < 5; i++) {
        g.fillStyle = 'rgba(18,18,22,0.5)';
        const px = Math.random() * w, py = Math.random() * h;
        g.fillRect(px, py, 60 + Math.random() * 130, 14 + Math.random() * 20);
      }
      // tampas de bueiro
      for (let i = 0; i < 3; i++) {
        const x = 100 + i * 340 + Math.random() * 60, y = h * (0.3 + (i % 2) * 0.4);
        g.fillStyle = 'rgba(12,12,15,0.85)';
        g.beginPath(); g.arc(x, y, 13, 0, 7); g.fill();
        g.strokeStyle = 'rgba(90,90,95,0.7)'; g.lineWidth = 2;
        g.beginPath(); g.arc(x, y, 13, 0, 7); g.stroke();
        g.beginPath(); g.arc(x, y, 6, 0, 7); g.stroke();
      }
      // faixa central dupla amarela (fina, desgastada)
      g.fillStyle = '#b89a3a'; g.fillRect(0, h / 2 - 5, w, 3); g.fillRect(0, h / 2 + 2, w, 3);
      g.fillStyle = 'rgba(51,52,58,0.55)';
      for (let i = 0; i < 40; i++) g.fillRect(Math.random() * w, h / 2 - 6 + Math.random() * 12, 3 + Math.random() * 8, 2);
      // faixas tracejadas brancas das pistas
      g.fillStyle = '#cfcfcf';
      for (let x = 0; x < w; x += 64) { g.fillRect(x, h * 0.30 - 2, 34, 4); g.fillRect(x, h * 0.70 - 2, 34, 4); }
      // bordas
      g.fillStyle = '#e8e8e8'; g.fillRect(0, 4, w, 4); g.fillRect(0, h - 8, w, 4);
    }, 3, 1);
    this.roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.94, metalness: 0.02 });
    this.groundMats.push(this.roadMat);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(76, 10.4), this.roadMat);
    road.rotation.x = -Math.PI / 2; road.receiveShadow = true; S.add(road);

    // faixa de pedestres (zebrada) em x∈[-2.4,2.4]
    const crossTex = canvasTex(128, 256, (g, w, h) => {
      g.fillStyle = '#33343a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#d8d8d8';
      for (let y = 8; y < h; y += 42) g.fillRect(10, y, w - 20, 24);
      // desgaste: partes da tinta sumiram com o tráfego
      g.fillStyle = '#33343a';
      for (let i = 0; i < 26; i++) {
        g.globalAlpha = 0.35 + Math.random() * 0.5;
        g.fillRect(Math.random() * w, Math.random() * h, 4 + Math.random() * 14, 3 + Math.random() * 8);
      }
      g.globalAlpha = 1;
    });
    const cross = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 10.4),
      new THREE.MeshStandardMaterial({ map: crossTex, roughness: 0.9 }));
    cross.rotation.x = -Math.PI / 2; cross.position.set(0, 0.005, 0); cross.receiveShadow = true; S.add(cross);
    // faixas de retenção (stop bars) junto às linhas de parada
    const stopM = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.85, transparent: true, opacity: 0.8 });
    for (const [x, z] of [[-6.5, -2.6], [6.5, 2.6]]) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 3.4), stopM);
      bar.rotation.x = -Math.PI / 2; bar.position.set(x, 0.006, z); bar.receiveShadow = true; S.add(bar);
    }

    // ---------- CALÇADAS + meio-fio ----------
    const sideTex = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#8f8b84'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1600; i++) {
        g.fillStyle = `rgba(${100 + Math.random() * 60 | 0},${100 + Math.random() * 55 | 0},${95 + Math.random() * 50 | 0},0.6)`;
        g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
      g.strokeStyle = '#6e6a63'; g.lineWidth = 3;
      for (let i = 0; i <= 4; i++) {
        g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke();
        g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke();
      }
      // manchas de uso: chiclete, sujeira encardida junto ao meio-fio
      for (let i = 0; i < 22; i++) {
        g.fillStyle = `rgba(30,28,26,${0.25 + Math.random() * 0.3})`;
        g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 4, 0, 7); g.fill();
      }
    }, 12, 2);
    const sideMat = new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.95 });
    this.groundMats.push(sideMat);
    for (const sz of [-1, 1]) {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(76, 0.24, 4.6), sideMat);
      sw.position.set(0, 0.06, sz * 7.5); sw.receiveShadow = true; sw.castShadow = false; S.add(sw);
      const curb = new THREE.Mesh(new THREE.BoxGeometry(76, 0.26, 0.35),
        new THREE.MeshStandardMaterial({ color: 0x9a968e, roughness: 0.9 }));
      curb.position.set(0, 0.05, sz * 5.32); curb.receiveShadow = true; S.add(curb);
    }
    // rampas de acessibilidade na faixa + piso tátil (detalhe urbano real)
    const rampM = new THREE.MeshStandardMaterial({ color: 0x8f8b84, roughness: 0.95 });
    const tactM = new THREE.MeshStandardMaterial({ color: 0xb89a3a, roughness: 0.9 });
    for (const sz of [-1, 1]) {
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.12, 1.1), rampM);
      ramp.position.set(0, 0.06, sz * 5.15); ramp.rotation.x = sz * 0.12;
      ramp.receiveShadow = true; S.add(ramp);
      const tact = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), tactM);
      tact.rotation.x = -Math.PI / 2; tact.position.set(0, 0.19, sz * 5.9);
      tact.receiveShadow = true; S.add(tact);
    }

    // ---------- PRÉDIOS de fundo (fachadas claras + vitrines térreas acesas) ----------
    const names = ['PADARIA PÃO QUENTE', 'BAR DO ZÉ', 'PUDIM & CIA', 'LANCHES', 'FARMÁCIA', 'SORVETERIA', 'PIZZARIA', 'MERCADINHO'];
    const bColors = [0xa86f52, 0x84749a, 0x5d84a8, 0x97855c, 0x6f9a6f, 0xa85f70];
    // 3 variações de janela para quebrar a repetição
    const winTexs = [0, 1, 2].map(v => canvasTex(128, 256, (g, w, h) => {
      g.fillStyle = '#1c1e26'; g.fillRect(0, 0, w, h);
      for (let ry = 0; ry < 6; ry++) for (let rx = 0; rx < 4; rx++) {
        const lit = Math.random() < (v === 1 ? 0.35 : 0.55);
        g.fillStyle = lit ? (Math.random() < 0.7 ? '#ffd98a' : '#9fd8ff') : '#14161f';
        g.fillRect(8 + rx * 30 + (v === 2 ? (ry % 2) * 8 : 0), 10 + ry * 40, 20, 26);
      }
      if (v === 0) { g.fillStyle = '#0e0f14'; g.fillRect(0, 0, w, 12); } // platibanda
    }));
    const doorGlowM = new THREE.MeshStandardMaterial({ color: 0x2a1f14, emissive: 0xffc06a, emissiveIntensity: 0.9, roughness: 0.4 });
    const recessM = new THREE.MeshStandardMaterial({ color: 0x17181f, roughness: 0.95 });
    const poleMatFix = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.6, metalness: 0.6 });
    let ni = 0;
    for (const sz of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const x = -30 + i * 12 + (sz > 0 ? 5 : 0);
        const hh = 8 + ((i * 37 + (sz > 0 ? 3 : 0)) % 7);
        const col = bColors[(i + (sz > 0 ? 2 : 0)) % bColors.length];
        const winTex = winTexs[(i + (sz > 0 ? 1 : 0)) % winTexs.length];
        const bmat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.85 });
        const b = new THREE.Mesh(new THREE.BoxGeometry(10, hh, 7), bmat);
        b.position.set(x, hh / 2 - 0.1, sz * 15.5); S.add(b);
        const win = new THREE.Mesh(new THREE.PlaneGeometry(9.4, hh * 0.85),
          new THREE.MeshStandardMaterial({ map: winTex, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 0.55, roughness: 0.4 }));
        win.position.set(x, hh / 2, sz * 11.94); win.rotation.y = sz > 0 ? Math.PI : 0; S.add(win);
        // térreo: recesso escuro + porta/vitrine acesa (loja aberta no fim de tarde)
        const face = sz * 11.93;
        const recess = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 2.9), recessM);
        recess.position.set(x - 0.6, 1.45, face); recess.rotation.y = sz > 0 ? Math.PI : 0; S.add(recess);
        const door = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.3), doorGlowM);
        door.position.set(x - 2.6, 1.15, face + (sz > 0 ? -0.02 : 0.02)); door.rotation.y = sz > 0 ? Math.PI : 0; S.add(door);
        const vit = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.4), doorGlowM);
        vit.position.set(x + 1.2, 1.5, face + (sz > 0 ? -0.02 : 0.02)); vit.rotation.y = sz > 0 ? Math.PI : 0; S.add(vit);
        // toldo preso à fachada (com inclinação e hastes) + placa fictícia
        const awn = new THREE.Mesh(new THREE.BoxGeometry(6, 0.18, 1.1),
          new THREE.MeshStandardMaterial({ color: [0xa33327, 0x1f6f8b, 0x2b8a3e, 0xc9a227][ni % 4], roughness: 0.7 }));
        awn.position.set(x - 1, 3.35, sz * 11.55); awn.rotation.x = sz * 0.18; S.add(awn);
        for (const px of [-2.7, 2.7]) {
          const poleS = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.3, 6), poleMatFix);
          poleS.position.set(x - 1 + px, 1.7, sz * 11.15); S.add(poleS);
        }
        const signTex = canvasTex(512, 64, (g, w, h) => {
          g.fillStyle = '#14101f'; g.fillRect(0, 0, w, h);
          g.fillStyle = '#ffd166'; g.font = 'bold 34px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText(names[ni % names.length], w / 2, h / 2);
        });
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 0.7),
          new THREE.MeshStandardMaterial({ map: signTex, emissive: 0xffd166, emissiveMap: signTex, emissiveIntensity: 0.7 }));
        sign.position.set(x - 1, 4.1, sz * 11.85); sign.rotation.y = sz > 0 ? Math.PI : 0; S.add(sign);
        ni++;
        this.addCollider(x, sz * 13, 11, 6, hh);
      }
    }

    // ---------- POSTES (4 com luz real, resto emissivo) ----------
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.6, metalness: 0.6 });
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffb45e, emissiveIntensity: 2.2 });
    this.lampMat = lampMat;
    let li = 0;
    // posições alternadas e irregulares (rua real, não simétrica)
    for (const [x, sz] of [[-26, -1], [-14, 1], [-4, -1], [8, 1], [18, -1], [28, 1]]) {
        const g = new THREE.Group();
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.4, 8), poleMat);
        pole.position.y = 2.7; pole.castShadow = true; g.add(pole);
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6), poleMat);
        arm.rotation.z = Math.PI / 2; arm.position.set(0, 5.3, -sz * 0.6); g.add(arm);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), lampMat);
        bulb.position.set(0, 5.2, -sz * 1.25); g.add(bulb);
        const cone = new THREE.Mesh(new THREE.ConeGeometry(1.3, 3.2, 16, 1, true),
          new THREE.MeshBasicMaterial({ color: 0xffc873, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false }));
        cone.position.set(0, 3.6, -sz * 1.25); g.add(cone);
        g.position.set(x, 0, sz * 8.6); S.add(g);
        if (li < 4) {
          const pl = new THREE.PointLight(0xffb45e, 18, 17, 1.8);
          pl.position.set(x, 5.0, sz * 7.3); S.add(pl);
          this.lampLights.push(pl);
        }
        li++;
        this.addCollider(x, sz * 8.6, 0.4, 0.4, 5);
    }

    // ---------- fios entre postes ----------
    const wireMat = new THREE.LineBasicMaterial({ color: 0x0a0a0c });
    for (const sz of [-1, 1]) {
      const pts = [];
      for (let x = -30; x <= 30; x += 4) pts.push(new THREE.Vector3(x, 5.6 + Math.sin(x) * 0.15, sz * 8.6));
      S.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
    }
    // travessias aéreas (catenárias) + transformador: rede elétrica de bairro
    for (const wx of [-14, 2, 18]) {
      const pts = [];
      for (let k = 0; k <= 12; k++) {
        const z = -8.6 + (k / 12) * 17.2;
        pts.push(new THREE.Vector3(wx + Math.sin(k) * 0.1, 6.1 - Math.sin((k / 12) * Math.PI) * 0.9, z));
      }
      S.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
    }
    const transf = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.9, 10), poleMatFix);
    transf.position.set(-18, 4.6, -8.6); S.add(transf);

    // ---------- árvores, lixeiras, bancos, cones, barreiras ----------
    const trunkM = new THREE.MeshStandardMaterial({ color: 0x5a3d26, roughness: 0.9 });
    const leafMs = [0x3a6b41, 0x46704a, 0x2f6138].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));
    for (const [x, sz] of [[-20, 1], [-8, -1], [10, 1], [22, -1], [-34, 1]]) {
      const t = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.8, 7), trunkM);
      trunk.position.y = 0.9; trunk.castShadow = true; t.add(trunk);
      const leafM = leafMs[Math.abs(x) % leafMs.length];
      for (let i = 0; i < 3; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.8 - i * 0.15, 10, 8), leafM);
        s.position.set((Math.random() - 0.5) * 0.5, 2.1 + i * 0.5, (Math.random() - 0.5) * 0.5);
        s.scale.y = 0.85; // copa levemente achatada, menos "pirulito"
        s.castShadow = true; t.add(s);
      }
      t.position.set(x, 0, sz * 8.4); S.add(t);
      this.trees.push({ g: t, phase: Math.random() * 6.28 });
      this.addCollider(x, sz * 8.4, 0.6, 0.6, 3);
    }
    const binM = new THREE.MeshStandardMaterial({ color: 0x1f6f43, roughness: 0.7 });
    for (const [x, sz] of [[-14, 1], [4, -1], [16, 1], [-26, -1]]) {
      const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.8, 10), binM);
      bin.position.set(x, 0.55, sz * 8.9); bin.castShadow = true; S.add(bin);
    }
    const benchM = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.8 });
    for (const [x, sz] of [[-4, 1], [12, -1]]) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.5), benchM);
      bench.position.set(x, 0.65, sz * 8.8); bench.castShadow = true; S.add(bench);
      for (const dx of [-0.7, 0.7]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.45), poleMat);
        leg.position.set(x + dx, 0.35, sz * 8.8); S.add(leg);
      }
      this.addCollider(x, sz * 8.8, 1.8, 0.6, 1);
    }
    // barreiras nas extremidades (limite físico claro)
    const barM = new THREE.MeshStandardMaterial({ color: 0xb34d18, roughness: 0.6 });
    const barW = new THREE.MeshStandardMaterial({ color: 0xcfcfcf, roughness: 0.6 });
    for (const ex of [-36, 36]) {
      for (let i = 0; i < 5; i++) {
        const z = -8 + i * 4;
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.0, 3.4), i % 2 ? barW : barM);
        bar.position.set(ex, 0.7, z); bar.castShadow = true; S.add(bar);
      }
      const wall = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 24),
        new THREE.MeshStandardMaterial({ color: 0x3d3a52, roughness: 0.9 }));
      wall.position.set(ex + (ex > 0 ? 2.5 : -2.5), 2, 0); S.add(wall);
      this.addCollider(ex, 0, 2, 26, 5);
    }
    // cones
    const coneM = new THREE.MeshStandardMaterial({ color: 0xe85d1f, roughness: 0.6 });
    for (const [x, z] of [[-5.5, -4.6], [5.5, 4.6], [-24, -4.6]]) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 10), coneM);
      c.position.set(x, 0.28, z); c.castShadow = true; S.add(c);
    }

    // poças: camada d'água sobre o asfalto — forma irregular, borda suave,
    // asfalto escurecido por baixo, reflexão parcial SEM espelho (roughness médio)
    const blobGeo = (r) => {
      const shape = new THREE.Shape();
      const n = 14;
      for (let k = 0; k <= n; k++) {
        const a = (k / n) * Math.PI * 2;
        const rr = r * (0.72 + Math.random() * 0.55);
        const x = Math.cos(a) * rr * 1.5, yy = Math.sin(a) * rr;
        k ? shape.lineTo(x, yy) : shape.moveTo(x, yy);
      }
      return new THREE.ShapeGeometry(shape, 3);
    };
    this.puddles = new THREE.Group();
    const pudM = new THREE.MeshStandardMaterial({
      color: 0x1f2226, roughness: 0.45, metalness: 0.0,
      transparent: true, opacity: 0.88, envMapIntensity: 0.3,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
    });
    // fora da faixa de pedestres e com tamanhos de poça real (0.5–1.2m)
    const spots = [[-18, -2], [-9, 3], [-3.5, -3.4], [7, 1.5], [15, -1], [24, 2.6], [4.2, -1.0]];
    for (const [x, z] of spots) {
      const p = new THREE.Mesh(blobGeo(0.45 + Math.random() * 0.45), pudM);
      p.rotation.x = -Math.PI / 2;
      p.rotation.z = Math.random() * Math.PI * 2;
      p.position.set(x, 0.011, z);
      this.puddles.add(p);
    }
    this.puddles.visible = false;
    S.add(this.puddles);

    // ---------- SEMÁFOROS físicos (2 postes) ----------
    this.lightHeads = [];
    const headM = new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.5, metalness: 0.4 });
    for (const [x, sz] of [[4.5, -1], [-4.5, 1]]) {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 4.4, 8), poleMat);
      pole.position.y = 2.2; pole.castShadow = true; g.add(pole);
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.3, 0.4), headM);
      box.position.y = 4.2; g.add(box);
      // backplate com borda clara (padrão real) + caixa de controle na base
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.68, 1.48, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x0c0d11, roughness: 0.6 }));
      plate.position.set(0, 4.2, (sz > 0 ? 0.2 : -0.2)); g.add(plate);
      const ctl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.28),
        new THREE.MeshStandardMaterial({ color: 0x3a4148, roughness: 0.6, metalness: 0.4 }));
      ctl.position.set(0.25, 1.1, 0); ctl.castShadow = true; g.add(ctl);
      const lamps = {};
      const cols = [['red', 0xff2a2a, 0.55], ['yellow', 0xffc41f, 0], ['green', 0x2aff5a, -0.55]];
      for (const [name, col, dy] of cols) {
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.14, 16),
          new THREE.MeshStandardMaterial({ color: 0x111111, emissive: col, emissiveIntensity: 0.05 }));
        lens.position.set(0, 4.2 + dy, sz > 0 ? -0.21 : 0.21);
        lens.rotation.y = sz > 0 ? Math.PI : 0;
        g.add(lens); lamps[name] = lens.material;
        const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.18, 12, 1, true), headM);
        visor.rotation.x = Math.PI / 2; visor.position.set(0, 4.2 + dy, (sz > 0 ? -0.26 : 0.26)); g.add(visor);
      }
      // luz que banha a rua conforme estado
      const glow = new THREE.PointLight(0xff2a2a, 6, 12, 1.8);
      glow.position.set(0, 4.2, 0); g.add(glow);
      g.position.set(x, 0, sz * 5.9); S.add(g);
      this.lightHeads.push({ lamps, glow });
      this.addCollider(x, sz * 5.9, 0.5, 0.5, 4.4);
    }

    this.buildShop(1);
    // marcador da barraca p/ os primeiros 30s (some após o tutorial)
    const mcnv = document.createElement('canvas'); mcnv.width = 256; mcnv.height = 96;
    const mg = mcnv.getContext('2d');
    mg.fillStyle = 'rgba(10,8,20,0.85)';
    mg.beginPath(); mg.roundRect(4, 4, 248, 60, 12); mg.fill();
    mg.fillStyle = '#ffd166'; mg.font = 'bold 26px Arial'; mg.textAlign = 'center';
    mg.fillText('🏪 SUA BARRACA', 128, 44);
    mg.fillStyle = '#ffd166';
    mg.beginPath(); mg.moveTo(118, 68); mg.lineTo(138, 68); mg.lineTo(128, 90); mg.fill();
    this.shopMarker = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(mcnv), depthTest: false, transparent: true,
    }));
    this.shopMarker.scale.set(2.0, 0.75, 1);
    this.shopMarker.position.copy(this.shopAnchor).add(new THREE.Vector3(0, 3.6, 0));
    S.add(this.shopMarker);
  }

  setLightState(state) {
    const on = { red: 0.06, yellow: 0.06, green: 0.06 };
    on[state] = 2.6;
    for (const h of this.lightHeads) {
      h.lamps.red.emissiveIntensity = on.red;
      h.lamps.yellow.emissiveIntensity = on.yellow;
      h.lamps.green.emissiveIntensity = on.green;
      h.glow.color.set(state === 'red' ? 0xff2a2a : state === 'yellow' ? 0xffc41f : 0x2aff5a);
    }
  }

  // ---------- BARRACA (evolui visualmente em 4 tiers) ----------
  buildShop(tier) {
    if (this.shopGroup) { this.scene.remove(this.shopGroup); }
    const g = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.75 });
    const woodD = new THREE.MeshStandardMaterial({ color: 0x5e3b1f, roughness: 0.8 });
    // base: mesa
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 1.2), wood);
    top.position.y = 0.95; top.castShadow = true; g.add(top);
    for (const [dx, dz] of [[-1.2, -0.5], [1.2, -0.5], [-1.2, 0.5], [1.2, 0.5]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.95, 0.1), woodD);
      leg.position.set(dx, 0.47, dz); g.add(leg);
    }
    // mostruário: um de cada produto, cada um com sua silhueta
    const plateM = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.3 });
    const lineup = ['pudim', 'choco', 'morango', 'geladinho', 'agua', 'brigadeiro'];
    const nShow = tier >= 4 ? 6 : tier >= 2 ? 5 : 3;
    for (let i = 0; i < nShow; i++) {
      const px = -1 + (i % 3) * 0.9, pz = (i > 2 ? 0.25 : -0.2);
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 14), plateM);
      plate.position.set(px, 1.03, pz); g.add(plate);
      const m = buildProductMesh(lineup[i]);
      m.scale.setScalar(2.1);
      m.position.set(px, 1.05, pz);
      g.add(m);
    }
    // caixas de suprimento + banquinho (a barraca é um lugar de trabalho)
    const crateM = new THREE.MeshStandardMaterial({ color: 0x9a6b3f, roughness: 0.85 });
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.55), crateM);
    crate.position.set(-1.85, 0.2, -0.5); crate.rotation.y = 0.3; crate.castShadow = true; g.add(crate);
    const crate2 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.32, 0.45), crateM);
    crate2.position.set(-1.8, 0.56, -0.45); crate2.rotation.y = -0.15; crate2.castShadow = true; g.add(crate2);
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 10), woodD);
    stool.position.set(0.4, 0.48, 1.15); stool.castShadow = true; g.add(stool);
    const stoolLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.45, 8), woodD);
    stoolLeg.position.set(0.4, 0.22, 1.15); g.add(stoolLeg);
    // caixa registradora + dinheiro
    const reg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.4, metalness: 0.5 }));
    reg.position.set(1.0, 1.16, -0.3); reg.castShadow = true; g.add(reg);
    const cash = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x3fa34d, roughness: 0.6 }));
    cash.position.set(-0.9, 1.07, 0.3); g.add(cash);
    // placa "PUDIM DO ROXO"
    const signTex = canvasTex(512, 128, (gg, w, h) => {
      gg.fillStyle = '#2a1245'; gg.fillRect(0, 0, w, h);
      gg.strokeStyle = '#ffd166'; gg.lineWidth = 8; gg.strokeRect(4, 4, w - 8, h - 8);
      gg.fillStyle = '#ffd166'; gg.font = 'bold 52px Arial'; gg.textAlign = 'center';
      gg.fillText('🍮 PUDIM DO ROXO', w / 2, h / 2 + 18);
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65),
      new THREE.MeshStandardMaterial({ map: signTex, emissive: 0xffd166, emissiveMap: signTex, emissiveIntensity: 0.5 }));
    sign.position.set(0, 2.15, 0); g.add(sign);
    const sign2 = sign.clone(); sign2.rotation.y = Math.PI; sign2.position.z = -0.02; g.add(sign2);
    for (const dx of [-1.2, 1.2]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), woodD);
      post.position.set(dx, 1.6, 0); g.add(post);
    }
    if (tier >= 2) { // guarda-sol
      const um = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.0, 10),
        new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.7, side: THREE.DoubleSide }));
      um.position.y = 2.9; um.castShadow = true; g.add(um);
      const pm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), woodD);
      pm.position.set(1.1, 1.7, 0.4); g.add(pm);
    }
    if (tier >= 3) { // carrinho: rodas + caixa térmica
      const wheelM = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
      for (const dx of [-1, 1]) {
        const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 12), wheelM);
        wh.rotation.x = Math.PI / 2; wh.position.set(dx, 0.3, 0.55); g.add(wh);
      }
      const cool = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.4 }));
      cool.position.set(-1.9, 0.3, 0); cool.castShadow = true; g.add(cool);
      // varal de luzes quentes (charme de fim de tarde, só 7 lâmpadas)
      const bulbM = new THREE.MeshStandardMaterial({ color: 0xffe2b0, emissive: 0xffc06a, emissiveIntensity: 2.0 });
      const wirePts = [];
      for (let bi = 0; bi <= 7; bi++) {
        const bx = -1.2 + (bi / 7) * 2.4;
        const by = 2.15 - Math.sin((bi / 7) * Math.PI) * 0.28; // catenária simples
        wirePts.push(new THREE.Vector3(bx, by, 0.35));
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), bulbM);
        bulb.position.set(bx, by - 0.07, 0.35); g.add(bulb);
      }
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(wirePts),
        new THREE.LineBasicMaterial({ color: 0x0a0a0c })));
    }
    if (tier >= 4) { // ponto pro: balcão extra + luminoso + tapete
      const counter = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x3b2a5e, roughness: 0.5 }));
      counter.position.set(2.2, 0.45, 0); counter.castShadow = true; g.add(counter);
      const neon = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xe879f9, emissiveIntensity: 1.2 }));
      neon.position.set(0, 2.62, 0.02); g.add(neon);
      const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.2),
        new THREE.MeshStandardMaterial({ color: 0x5b21b6, roughness: 0.9 }));
      rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.19, 1.6); g.add(rug);
      const lamp = new THREE.PointLight(0xe879f9, 8, 10, 1.8);
      lamp.position.set(0, 2.6, 0.8); g.add(lamp);
    }
    // cardápio
    const menuTex = canvasTex(256, 320, (gg, w, h) => {
      gg.fillStyle = '#c9bda1'; gg.fillRect(0, 0, w, h);
      gg.fillStyle = '#3b2a1a'; gg.font = 'bold 30px Arial'; gg.textAlign = 'center';
      gg.fillText('CARDÁPIO', w / 2, 44);
      gg.font = '20px Arial'; gg.textAlign = 'left';
      const items = ['🍮 Pudim Roxo R$8', '🍫 Choco R$12', '🍓 Morango R$13', '🧊 Geladinho R$6', '🥤 Água R$4', '🍬 Brigad. R$10'];
      items.forEach((t, i) => gg.fillText(t, 18, 90 + i * 36));
    });
    const menu = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.9),
      new THREE.MeshStandardMaterial({ map: menuTex, roughness: 1.0, color: 0x777777 }));
    menu.position.set(-1.55, 1.5, 0.1); menu.rotation.y = 0.5; g.add(menu);

    g.position.copy(this.shopAnchor);
    g.rotation.y = 0.12;
    this.scene.add(g);
    // materiais novos entram com reflexo contido (iguais ao resto da cena)
    g.traverse(o => {
      if (o.isMesh) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) if (m && m.isMeshStandardMaterial) m.envMapIntensity = 0.35;
      }
    });
    this.shopGroup = g;
    this.shopTier = tier;
    // colisor da barraca
    this.shopCollider = new THREE.Box3(
      new THREE.Vector3(this.shopAnchor.x - 1.6, 0, this.shopAnchor.z - 0.9),
      new THREE.Vector3(this.shopAnchor.x + 1.6, 2, this.shopAnchor.z + 0.9));
  }
  setShopTier(t) { if (t !== this.shopTier) this.buildShop(t); }
  setLampLevel(n) {
    this.lampLights.forEach((l, i) => { l.visible = i < n; });
  }
  setAniso(n) {
    this.scene.traverse(o => {
      if (o.isMesh) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          const maps = [m.map, m.emissiveMap].filter(Boolean);
          for (const t of maps) {
            if (t.anisotropy !== n) { t.anisotropy = n; t.needsUpdate = true; }
          }
        }
      }
    });
  }
  setWet(wet) {
    // MOLHADO: mais escuro + cetim (responde à luz, mantém textura, sem plástico)
    // SECO: claro + áspero. A diferença é evidente sem virar espelho.
    this.roadMat.roughness = wet ? 0.58 : 0.94;
    this.roadMat.metalness = wet ? 0.05 : 0.02;
    this.roadMat.color.set(wet ? 0x9aa0ad : 0xffffff);
    if (this.puddles) this.puddles.visible = wet;
  }
  // vida ambiente: árvores balançam, lâmpadas tremeluzem de leve
  updateAmbient(dt, t) {
    for (const tr of this.trees) tr.g.rotation.z = Math.sin(t * 1.1 + tr.phase) * 0.025;
    if (this.lampMat) this.lampMat.emissiveIntensity = 2.2 + Math.sin(t * 7.3) * 0.08 + Math.sin(t * 2.1) * 0.06;
    if (this.shopMarker?.visible) this.shopMarker.position.y = this.shopAnchor.y + 3.6 + Math.sin(t * 2.2) * 0.12;
    if (this.clouds) for (const c of this.clouds) {
      c.m.position.x += c.sp * dt;
      if (c.m.position.x > 150) c.m.position.x = -150;
    }
  }
}
