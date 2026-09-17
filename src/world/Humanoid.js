// Humanoid v2: remodelagem — crânio ESCULPIDO por deslocamento de vértices
// (mandíbula, maçãs, testa, achatamento occipital), olhos menores com pálpebras,
// lábios com volume, nariz em 3 partes, orelhas com hélice, membros com massa
// muscular (deltóide, quadríceps, panturrilha) em vez de cápsulas lisas.
// Mesma API/hierarquia v1 (grupo, parts, dims) — animações e usages preservados.
import * as THREE from 'three';

export const SKINS = [0xd9a066, 0x8d5524, 0x4a3728, 0xe8b88a, 0x6b4a2f, 0x8b3fd9];

export function skinMat(color) {
  return new THREE.MeshStandardMaterial({
    color, roughness: 0.52, metalness: 0.0,
    emissive: color, emissiveIntensity: 0.06,
  });
}
export function clothMat(color, rough = 0.92) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.0 });
}

const D = {
  hipY: 0.95, thigh: 0.44, shin: 0.44, pelvisW: 0.30,
  torsoY: 1.22, torsoH: 0.58, shoulderY: 1.48, shoulderW: 0.42,
  upperArm: 0.30, forearm: 0.28, headY: 1.70, headR: 0.23,
};

function mesh(geo, material, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  return m;
}

// Escultura procedural do crânio: afina o queixo, marca maçãs/testa, achata a nuca.
function sculptSkull(geo, R) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    // mandíbula: afunila abaixo da boca
    if (y < -0.02) {
      const k = Math.min(1, (-0.02 - y) / 0.14);
      x *= (1 - 0.30 * k);
      if (z > 0) z *= (1 - 0.15 * k);
    }
    // queixo: leve projeção
    if (y < -0.12 && z > 0) z += 0.015 * Math.min(1, (-0.12 - y) / 0.06);
    // maçãs do rosto: alarga sutilmente
    const cheek = Math.exp(-((y - 0.03) ** 2) / 0.004);
    x *= 1 + 0.05 * cheek * Math.min(1, Math.abs(x) / (R * 0.7));
    // testa/sobrancelhas: arco superciliar
    if (z > 0.08 && y > 0.08 && y < 0.17) {
      z += 0.012 * Math.sin(((y - 0.08) / 0.09) * Math.PI);
    }
    // nuca achatada (cabeça não é bola)
    if (z < -0.12) z = -0.12 + (z + 0.12) * 0.85;
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

// Rosto em coordenadas LOCAIS do grupo da cabeça. Olhos MENORES e anatômicos.
function buildFace(g, skin, opts = {}) {
  const { iris = 0x3a2415, detail = true, asym = 0 } = opts;
  const R = D.headR;
  const skullGeo = sculptSkull(new THREE.SphereGeometry(R, 24, 18), R);
  const skull = mesh(skullGeo, skin, 0, 0.07, -0.01);
  skull.scale.set(0.94, 1.04, 0.96); g.add(skull);
  const jaw = mesh(new THREE.SphereGeometry(0.15, 16, 12), skin, 0, -0.02, 0.05);
  jaw.scale.set(0.80, 0.70, 0.85); g.add(jaw);
  // nariz em 3 partes: ponte afunilada + ponta + asas
    const bridge = mesh(new THREE.CylinderGeometry(0.024, 0.034, 0.10, 6), skin, 0.003 + asym * 0.003, 0.045, 0.20);
    bridge.rotation.x = 0.12; g.add(bridge);
    const noseTip = mesh(new THREE.SphereGeometry(0.028, 10, 8), skin, 0.003 + asym * 0.003, 0.0, 0.222);
    noseTip.scale.set(1.2, 0.85, 0.9); g.add(noseTip);
  for (const s of [-1, 1]) {
    const wing = mesh(new THREE.SphereGeometry(0.016, 8, 8), skin, s * 0.032, -0.005, 0.20);
    wing.scale.set(1, 0.8, 1); g.add(wing);
  }
  // orelhas: hélice (toro parcial) + lóbulo
  for (const s of [-1, 1]) {
    const helix = mesh(new THREE.TorusGeometry(0.032, 0.011, 6, 10, 4.0), skin, s * 0.20, 0.04, -0.01, false);
    helix.rotation.y = s * 1.35; g.add(helix);
    g.add(mesh(new THREE.SphereGeometry(0.016, 6, 6), skin, s * 0.195, 0.005, 0.0, false));
  }
  // olhos: órbita + esclera contida + pálpebra superior + íris + pupila + brilho
  const eyes = [];
  const eyeDX = [-0.075, 0.079];
  for (let k = 0; k < 2; k++) {
    const ex = eyeDX[k] + asym * 0.003 * (k ? 1 : -1);
    const ey = 0.10 + (k ? asym * 0.004 : 0);
    const ez = 0.175;
    const socket = mesh(new THREE.SphereGeometry(0.052, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x2a1a20, roughness: 0.9 }), ex, ey, ez - 0.010, false);
    socket.scale.set(1, 0.9, 0.5); g.add(socket);
    const white = mesh(new THREE.SphereGeometry(0.042, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.25 }), ex, ey, ez, false);
    white.scale.set(1, 0.8, 0.55); g.add(white); eyes.push(white);
    // pálpebra: arco de pele sobre o olho (tira o look "bola colada")
    const lid = mesh(new THREE.TorusGeometry(0.040, 0.010, 6, 10, 2.3), skin, ex, ey + 0.004, ez + 0.004, false);
    lid.rotation.z = Math.PI / 2 - 1.15; g.add(lid);
    if (detail) {
      const ir = mesh(new THREE.SphereGeometry(0.020, 10, 8),
        new THREE.MeshStandardMaterial({ color: iris, roughness: 0.3 }), ex, ey - 0.002, ez + 0.022, false);
      ir.scale.set(1, 1, 0.45); g.add(ir);
      const pu = mesh(new THREE.SphereGeometry(0.010, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.2 }), ex, ey - 0.002, ez + 0.032, false);
      pu.scale.set(1, 1, 0.4); g.add(pu);
      const gl = mesh(new THREE.SphereGeometry(0.007, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffffff }), ex + 0.010, ey + 0.012, ez + 0.035, false);
      g.add(gl);
    } else {
      // low-detail: esclera menor e embutida + pupila (nada de bola saltada)
      const white = mesh(new THREE.SphereGeometry(0.030, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.3 }), ex, ey - 0.002, ez - 0.004, false);
      white.scale.set(1, 0.8, 0.5); g.add(white); eyes.push(white);
      const pu = mesh(new THREE.SphereGeometry(0.014, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 0.35 }), ex, ey - 0.002, ez + 0.020, false);
      pu.scale.set(1, 1, 0.4); g.add(pu);
    }
  }
  // sobrancelhas finas, anguladas, assimétricas
  const browM = new THREE.MeshStandardMaterial({ color: opts.brow ?? 0x241812, roughness: 0.9 });
  const bL = mesh(new THREE.BoxGeometry(0.075, 0.014, 0.018), browM, -0.078, 0.165, 0.20, false);
  bL.rotation.z = 0.12 + asym * 0.05; g.add(bL);
  const bR = mesh(new THREE.BoxGeometry(0.070, 0.014, 0.018), browM, 0.080, 0.163, 0.20, false);
  bR.rotation.z = -0.07 - asym * 0.04; g.add(bR);
  // boca com volume: cavidade + lábio superior em V + lábio inferior (tom claro p/ ler na sombra)
  const lipM = new THREE.MeshStandardMaterial({ color: opts.lip ?? 0x8a4a5a, roughness: 0.55 });
  const cavity = mesh(new THREE.SphereGeometry(0.045, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x1c0d12, roughness: 0.9 }), asym * 0.004, -0.055, 0.150, false);
  cavity.scale.set(1.1, 0.45, 0.5); g.add(cavity);
  for (const s of [-1, 1]) {
    const upper = mesh(new THREE.BoxGeometry(0.048, 0.016, 0.022), lipM, s * 0.026 + asym * 0.004, -0.038, 0.168, false);
    upper.rotation.z = s * -0.28; g.add(upper);
  }
  const lower = mesh(new THREE.SphereGeometry(0.038, 10, 8), lipM, asym * 0.004, -0.068, 0.162, false);
  lower.scale.set(1.25, 0.6, 0.6); g.add(lower);
  return { eyes, skull };
}

// Mão: palma + nós dos dedos + 4 dedos com falange e curvatura + polegar em 2 partes.
function buildHand(skin, detail) {
  const g = new THREE.Group();
  if (!detail) {
    const m = mesh(new THREE.BoxGeometry(0.075, 0.10, 0.045), skin, 0, -0.05, 0);
    g.add(m);
    const th = mesh(new THREE.CapsuleGeometry(0.014, 0.04, 2, 6), skin, -0.05, -0.04, 0.01);
    th.rotation.set(0.4, 0, 0.7); g.add(th);
    return g;
  }
  const palm = mesh(new THREE.BoxGeometry(0.080, 0.095, 0.042), skin, 0, -0.048, 0);
  g.add(palm);
  for (let f = 0; f < 4; f++) {
    const fx = -0.030 + f * 0.020;
    g.add(mesh(new THREE.SphereGeometry(0.0115, 6, 6), skin, fx, -0.095, 0.004, false)); // nó
    const fg = new THREE.Group();
    fg.position.set(fx, -0.098, 0.006);
    const spread = (f - 1.5) * 0.06;
    fg.rotation.z = -spread;
    const seg = mesh(new THREE.CapsuleGeometry(0.0105, 0.048, 2, 6), skin, 0, -0.028, 0.008);
    seg.rotation.x = 0.30 + f * 0.03; fg.add(seg);
    g.add(fg);
  }
  const th1 = mesh(new THREE.CapsuleGeometry(0.012, 0.035, 2, 6), skin, -0.048, -0.045, 0.012);
  th1.rotation.set(0.5, 0, 0.8); g.add(th1);
  const th2 = mesh(new THREE.CapsuleGeometry(0.011, 0.030, 2, 6), skin, -0.062, -0.068, 0.020);
  th2.rotation.set(0.9, 0, 0.5); g.add(th2);
  return g;
}

// Corpo + membros com massa muscular. Mesma hierarquia/API da v1.
export function buildHumanoid(o = {}) {
  const {
    skin = SKINS[0], shirt = 0x4a6b8a, pants = 0x2e3138, shoes = 0x222226,
    detail = false, shirtLong = true,
    headSize = null,      // [sx, sy, sz] variedade de crânio (peds)
    bodyWidth = 1,        // largura do tronco/quadril
    bareShins = false,    // shorts: canela à mostra + meia
  } = o;
  const skinM = skinMat(skin), shirtM = clothMat(shirt), pantsM = clothMat(pants),
    shoeM = new THREE.MeshStandardMaterial({ color: shoes, roughness: 0.55 });
  const g = new THREE.Group();
  const P = {};
  // ---- pernas: coxa com quadríceps + joelho + panturrilha + tornozelo ----
  for (const [key, sx] of [['legL', -1], ['legR', 1]]) {
    const hip = new THREE.Group(); hip.position.set(sx * 0.115 * bodyWidth, D.hipY, 0); g.add(hip);
    const thighLen = bareShins ? D.thigh * 0.55 : D.thigh;
    const thigh = mesh(new THREE.CylinderGeometry(0.105, 0.070, thighLen, 10), pantsM, 0, -thighLen / 2, 0);
    hip.add(thigh);
    const quad = mesh(new THREE.SphereGeometry(0.095, 10, 8), pantsM, 0, -0.13, 0.045);
    quad.scale.set(0.95, bareShins ? 0.8 : 1.25, 0.8); hip.add(quad);
    if (bareShins) {
      // shorts: coxa nua entre o tecido e o joelho + barra + meia branca
      const bareLen = D.thigh - thighLen;
      const bare = mesh(new THREE.CylinderGeometry(0.068, 0.060, bareLen, 8), skinM, 0, -thighLen - bareLen / 2, 0);
      hip.add(bare);
      const hem = mesh(new THREE.CylinderGeometry(0.108, 0.112, 0.07, 10), pantsM, 0, -thighLen + 0.02, 0);
      hip.add(hem);
    }
    const knee = new THREE.Group(); knee.position.set(0, -D.thigh, 0); hip.add(knee);
    knee.add(mesh(new THREE.SphereGeometry(0.068, 10, 8), bareShins ? skinM : pantsM, 0, 0, 0.008));
    const shin = mesh(new THREE.CylinderGeometry(0.068, 0.048, D.shin, 10), bareShins ? skinM : pantsM, 0, -D.shin / 2, 0);
    knee.add(shin);
    if (bareShins) {
      const sock = mesh(new THREE.CylinderGeometry(0.052, 0.055, 0.10, 8),
        new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.9 }), 0, -D.shin + 0.06, 0, false);
      knee.add(sock);
    }
    const calf = mesh(new THREE.SphereGeometry(0.070, 10, 8), bareShins ? skinM : pantsM, 0, -0.10, -0.045);
    calf.scale.set(0.9, 1.25, 0.9); knee.add(calf);
    const hem = mesh(new THREE.CylinderGeometry(0.062, 0.066, 0.07, 10), pantsM, 0, -D.shin + 0.02, 0);
    knee.add(hem);
    const shoeG = new THREE.Group(); shoeG.position.set(0, -D.shin - 0.01, 0); knee.add(shoeG);
    shoeG.add(mesh(new THREE.BoxGeometry(0.13, 0.07, 0.30), shoeM, 0, -0.035, 0.05));
    shoeG.add(mesh(new THREE.BoxGeometry(0.12, 0.09, 0.20), shoeM, 0, 0.01, 0.03));
    shoeG.add(mesh(new THREE.SphereGeometry(0.062, 10, 8), shoeM, 0, -0.03, 0.17));
    const lace = mesh(new THREE.BoxGeometry(0.07, 0.02, 0.10),
      new THREE.MeshStandardMaterial({ color: 0xcfc9ba, roughness: 0.7 }), 0, 0.055, 0.05, false);
    shoeG.add(lace);
    P[key] = hip; P[key + 'Knee'] = knee;
  }
  // ---- pelve + torso com cintura marcada ----
  P.hips = new THREE.Group(); P.hips.position.set(0, D.hipY, 0); g.add(P.hips);
  P.hips.add(mesh(new THREE.BoxGeometry(D.pelvisW * bodyWidth, 0.20, 0.22), pantsM, 0, 0.02, 0));
  P.torso = new THREE.Group(); P.torso.position.set(0, D.hipY + 0.10, 0); g.add(P.torso);
  const belly = mesh(new THREE.CapsuleGeometry(0.17, 0.30, 4, 12), skinM, 0, 0.28, 0);
  P.torso.add(belly);
  const chest = mesh(new THREE.CapsuleGeometry(0.20, 0.26, 4, 12), shirtM, 0, 0.30, 0);
  chest.scale.set(1.06 * bodyWidth, 1, 1.02); P.torso.add(chest);
  P.chestMesh = chest;
  const collar = mesh(new THREE.TorusGeometry(0.095, 0.022, 8, 14, Math.PI * 1.5),
    shirtM, 0, 0.52, 0.01, false);
  collar.rotation.z = Math.PI * 0.75; collar.rotation.x = -0.15; P.torso.add(collar);
  const btnM = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.4 });
  for (let bi = 0; bi < 3; bi++) {
    P.torso.add(mesh(new THREE.SphereGeometry(0.014, 6, 6), btnM, 0, 0.38 - bi * 0.09, 0.205, false));
  }
  // ---- ombros com deltóides + braços cônicos + cotovelo + punho ----
  P.shoulders = new THREE.Group(); P.shoulders.position.set(0, D.shoulderY, 0); g.add(P.shoulders);
  P.shoulders.add(mesh(new THREE.BoxGeometry(D.shoulderW * bodyWidth, 0.14, 0.20), shirtM, 0, 0, 0));
  const trap = mesh(new THREE.CylinderGeometry(0.07, 0.16, 0.16, 8), shirtM, 0, 0.09, -0.01);
  P.shoulders.add(trap);
  for (const [key, sx] of [['armL', -1], ['armR', 1]]) {
    const delt = mesh(new THREE.SphereGeometry(0.082, 10, 8), shirtM, sx * (D.shoulderW * bodyWidth / 2 - 0.02), 0.0, 0);
    delt.scale.set(1, 1.1, 1); P.shoulders.add(delt);
    const sh = new THREE.Group(); sh.position.set(sx * (D.shoulderW * bodyWidth / 2 - 0.02), -0.03, 0);
    P.shoulders.add(sh);
    const upper = mesh(new THREE.CylinderGeometry(0.072, 0.056, D.upperArm, 8),
      shirtLong ? shirtM : skinM, 0, -D.upperArm / 2, 0);
    sh.add(upper);
    const bic = mesh(new THREE.SphereGeometry(0.062, 8, 8), shirtLong ? shirtM : skinM, 0, -0.10, 0.028, false);
    bic.scale.set(0.9, 1.2, 0.85); sh.add(bic); // bíceps
    const el = new THREE.Group(); el.position.set(0, -D.upperArm, 0); sh.add(el);
    el.add(mesh(new THREE.SphereGeometry(0.054, 8, 8), skinM, 0, 0, 0));
    const fore = mesh(new THREE.CylinderGeometry(0.056, 0.043, D.forearm, 8), skinM, 0, -D.forearm / 2, 0);
    el.add(fore);
    const foreM = mesh(new THREE.SphereGeometry(0.055, 8, 8), skinM, 0, -0.07, 0.018, false);
    foreM.scale.set(0.85, 1.25, 0.8); el.add(foreM); // massa do antebraço
    const cuff = mesh(new THREE.CylinderGeometry(0.060, 0.064, 0.06, 8), shirtM, 0, -0.03, 0);
    sh.add(cuff);
    const hand = buildHand(skinM, detail);
    hand.position.set(0, -D.forearm, 0); el.add(hand);
    P[key] = sh; P[key + 'El'] = el; P[key + 'Hand'] = hand;
  }
  // ---- pescoço com trapézio + cabeça ----
  P.neck = new THREE.Group(); P.neck.position.set(0, D.shoulderY + 0.06, 0); g.add(P.neck);
  P.neck.add(mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.14, 10), skinM, 0, 0.03, 0));
  P.head = new THREE.Group(); P.head.position.set(0, 0.12, 0); P.neck.add(P.head);
  if (headSize) P.head.scale.set(headSize[0], headSize[1], headSize[2]);
  const face = buildFace(P.head, skinM, {
    iris: o.iris, detail, brow: o.brow, lip: o.lip, asym: o.asym ?? Math.random() * 0.8 + 0.2,
  });
  P.eyes = face.eyes; P.skull = face.skull;
  P.dims = D;
  return { group: g, parts: P };
}

// Walk com peso (igual v1) + RUN com inclinação, joelho alto e braços em L.
export function poseWalk(P, phase, amp, t) {
  const sL = Math.sin(phase), sR = Math.sin(phase + Math.PI);
  P.legL.rotation.x = sL * 0.55 * amp;
  P.legR.rotation.x = sR * 0.55 * amp;
  P.legLKnee.rotation.x = Math.max(0, -Math.cos(phase - 0.7)) * 0.9 * amp + 0.06;
  P.legRKnee.rotation.x = Math.max(0, -Math.cos(phase + Math.PI - 0.7)) * 0.9 * amp + 0.06;
  P.armL.rotation.x = sR * 0.42 * amp;
  P.armR.rotation.x = sL * 0.42 * amp;
  P.armLEl.rotation.x = -0.25 - Math.max(0, sR) * 0.25 * amp;
  P.armREl.rotation.x = -0.25 - Math.max(0, sL) * 0.25 * amp;
  P.armL.rotation.z = 0.08; P.armR.rotation.z = -0.08;
  P.hips.position.y = D.hipY - Math.abs(Math.cos(phase)) * 0.035 * amp;
  P.hips.position.x = Math.sin(phase) * 0.018 * amp;
  P.shoulders.rotation.z = Math.sin(phase) * 0.028 * amp;
  P.shoulders.rotation.y = Math.sin(phase) * 0.05 * amp;
  P.head.rotation.x = Math.cos(phase * 2) * 0.012 * amp;
  P.head.position.y = 0.12 - Math.abs(Math.cos(phase)) * 0.012 * amp;
  return { bob: Math.abs(Math.cos(phase)) * 0.035 * amp };
}

export function poseRun(P, phase, amp) {
  const sL = Math.sin(phase), sR = Math.sin(phase + Math.PI);
  // passada longa: coxa sobe à frente, canela dobra atrás
  P.legL.rotation.x = sL * 0.85 * amp;
  P.legR.rotation.x = sR * 0.85 * amp;
  P.legLKnee.rotation.x = (sL > 0 ? 0.25 : 1.35) * amp + 0.08;
  P.legRKnee.rotation.x = (sR > 0 ? 0.25 : 1.35) * amp + 0.08;
  // braços em L bombeando em oposição
  P.armL.rotation.x = -0.5 + sR * 0.55 * amp;
  P.armR.rotation.x = -0.5 + sL * 0.55 * amp;
  P.armLEl.rotation.x = -1.15;
  P.armREl.rotation.x = -1.15;
  P.armL.rotation.z = 0.10; P.armR.rotation.z = -0.10;
  P.hips.position.y = D.hipY - Math.abs(Math.cos(phase)) * 0.055 * amp;
  P.hips.position.x = Math.sin(phase) * 0.022 * amp;
  P.shoulders.rotation.z = Math.sin(phase) * 0.045 * amp;
  P.shoulders.rotation.y = Math.sin(phase) * 0.09 * amp;
  P.torso.rotation.x = 0.10 * amp; // tronco inclinado à frente
  P.head.rotation.x = -0.06 * amp; // olhar estabilizado
  P.head.position.y = 0.12 - Math.abs(Math.cos(phase)) * 0.016 * amp;
}

export function poseIdle(P, t, breathe = 1) {
  const b = Math.sin(t * 1.7) * 0.008 * breathe;
  P.legL.rotation.x *= 0.8; P.legR.rotation.x *= 0.8;
  P.legLKnee.rotation.x = 0.06; P.legRKnee.rotation.x = 0.06;
  P.armL.rotation.x = Math.sin(t * 1.7) * 0.02; P.armR.rotation.x = -Math.sin(t * 1.7) * 0.02;
  P.armL.rotation.z = 0.07; P.armR.rotation.z = -0.07;
  P.armLEl.rotation.x = -0.18; P.armREl.rotation.x = -0.18;
  P.hips.position.y = D.hipY;
  P.hips.position.x = 0;
  P.shoulders.rotation.z = 0; P.shoulders.rotation.y = 0;
  P.torso.rotation.x = 0;
  if (P.chestMesh) { const s = 1 + b; P.chestMesh.scale.set(1.06 * s, 1, 1.02 * s); }
  P.head.rotation.x = Math.sin(t * 0.6) * 0.015;
}
