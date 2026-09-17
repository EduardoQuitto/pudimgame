// Humanoid: fábrica paramétrica de humanos articulados (pele/tecido com materiais
// distintos, membros em 2 segmentos, rosto com íris/pupila/nariz/orelhas, dedos).
// Usada pelo jogador (detalhe alto), pedestres (variações) e motoristas (sentado).
// Escala base: ~1.85m. Pele NUNCA plástico: roughness alto + emissive térmico mínimo.
import * as THREE from 'three';

export const SKINS = [0xd9a066, 0x8d5524, 0x4a3728, 0xe8b88a, 0x6b4a2f, 0x8b3fd9];

export function skinMat(color) {
  return new THREE.MeshStandardMaterial({
    color, roughness: 0.52, metalness: 0.0,
    emissive: color, emissiveIntensity: 0.06, // calor sutil da pele ao entardecer
  });
}
export function clothMat(color, rough = 0.92) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.0 });
}

// dims proporcionadas (fração da altura 1.85)
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

// Rosto completo, em coordenadas LOCAIS do grupo da cabeça (origem no pescoço).
// BUG HISTÓRICO: usar D.headY aqui colocava o crânio a 3.3m de altura (cabeça flutuante).
function buildFace(g, skin, opts = {}) {
  const { iris = 0x3a2415, detail = true, asym = 0 } = opts;
  const R = D.headR, y = 0.07; // centro do crânio no espaço local
  // crânio levemente alongado + mandíbula (não é esfera perfeita)
  const skull = mesh(new THREE.SphereGeometry(R, 20, 16), skin, 0, y + 0.01, -0.01);
  skull.scale.set(0.94, 1.04, 0.96); g.add(skull);
  const jaw = mesh(new THREE.SphereGeometry(R * 0.72, 16, 12), skin, 0, y - R * 0.52, 0.045);
  jaw.scale.set(0.82, 0.75, 0.85); g.add(jaw);
  // nariz: ponte + ponta
  const nose = mesh(new THREE.BoxGeometry(0.05, 0.09, 0.06), skin, 0.004 + asym * 0.004, y - 0.02, R * 0.92);
  nose.geometry.translate(0, 0, 0); g.add(nose);
  const noseTip = mesh(new THREE.SphereGeometry(0.028, 8, 8), skin, 0.004 + asym * 0.004, y - 0.06, R * 0.95);
  noseTip.scale.set(1.15, 0.8, 0.9); g.add(noseTip);
  // orelhas (achatadas, coladas na cabeça)
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.SphereGeometry(0.05, 8, 8), skin, s * R * 0.94, y - 0.01, -0.01);
    ear.scale.set(0.45, 1, 0.7); g.add(ear);
  }
  // olhos com profundidade: órbita escura + esclera + íris + pupila + brilho
  const eyes = [];
  const eyeDX = [-0.088, 0.092]; // assimetria natural de 4mm
  for (let k = 0; k < 2; k++) {
    const ex = eyeDX[k] + asym * 0.003 * (k ? 1 : -1);
    const ey = y + 0.045 + (k ? asym * 0.004 : 0);
    const ez = R * 0.82;
    const socket = mesh(new THREE.SphereGeometry(0.068, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x1a0f14, roughness: 0.9 }), ex, ey, ez - 0.012, false);
    socket.scale.set(1, 0.9, 0.5); g.add(socket);
    const white = mesh(new THREE.SphereGeometry(0.055, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.25 }), ex, ey, ez, false);
    white.scale.set(1, 0.85, 0.6); g.add(white); eyes.push(white);
    if (detail) {
      const ir = mesh(new THREE.SphereGeometry(0.027, 10, 8),
        new THREE.MeshStandardMaterial({ color: iris, roughness: 0.3 }), ex, ey, ez + 0.028, false);
      ir.scale.set(1, 1, 0.45); g.add(ir);
      const pu = mesh(new THREE.SphereGeometry(0.013, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.2 }), ex, ey, ez + 0.042, false);
      pu.scale.set(1, 1, 0.4); g.add(pu);
      const gl = mesh(new THREE.SphereGeometry(0.009, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffffff }), ex + 0.014, ey + 0.016, ez + 0.045, false);
      g.add(gl);
    } else {
      const pu = mesh(new THREE.SphereGeometry(0.02, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 0.35 }), ex, ey, ez + 0.03, false);
      pu.scale.set(1, 1, 0.4); g.add(pu);
    }
  }
  // sobrancelhas assimétricas (pelo, não adesivo: caixas finas anguladas)
  const browM = new THREE.MeshStandardMaterial({ color: opts.brow ?? 0x241812, roughness: 0.9 });
  const bL = mesh(new THREE.BoxGeometry(0.085, 0.018, 0.02), browM, -0.09, y + 0.125, R * 0.89, false);
  bL.rotation.z = 0.10 + asym * 0.05; g.add(bL);
  const bR = mesh(new THREE.BoxGeometry(0.08, 0.018, 0.02), browM, 0.093, y + 0.122, R * 0.89, false);
  bR.rotation.z = -0.06 - asym * 0.04; g.add(bR);
  // boca: lábio inferior + sorriso leve torto
  const mouth = mesh(new THREE.TorusGeometry(0.062, 0.014, 8, 16, Math.PI * 0.85),
    new THREE.MeshStandardMaterial({ color: opts.lip ?? 0x5a2a30, roughness: 0.6 }),
    asym * 0.006, y - R * 0.62, R * 0.80, false);
  mouth.rotation.z = Math.PI * 1.06 + asym * 0.05; g.add(mouth);
  return { eyes, skull };
}

// Mão: palma + 4 dedos levemente curvados + polegar (high) ou mitten (low).
function buildHand(skin, detail) {
  const g = new THREE.Group();
  if (!detail) {
    g.add(mesh(new THREE.SphereGeometry(0.085, 8, 8), skin, 0, -0.05, 0.01));
    return g;
  }
  const palm = mesh(new THREE.BoxGeometry(0.085, 0.10, 0.045), skin, 0, -0.05, 0);
  palm.geometry.translate(0, 0, 0); g.add(palm);
  for (let f = 0; f < 4; f++) {
    const fg = new THREE.Group();
    fg.position.set(-0.031 + f * 0.021, -0.10, 0.005);
    const seg = mesh(new THREE.CapsuleGeometry(0.0105, 0.055, 2, 6), skin, 0, -0.03, 0.008);
    seg.rotation.x = 0.35; fg.add(seg); // curva natural de repouso
    g.add(fg);
  }
  const th = mesh(new THREE.CapsuleGeometry(0.012, 0.05, 2, 6), skin, -0.055, -0.045, 0.015);
  th.rotation.set(0.5, 0, 0.7); g.add(th);
  return g;
}

// Corpo + membros. Retorna hierarquia pronta para posar.
export function buildHumanoid(o = {}) {
  const {
    skin = SKINS[0], shirt = 0x4a6b8a, pants = 0x2e3138, shoes = 0x222226,
    detail = false, shirtLong = true,
  } = o;
  const skinM = skinMat(skin), shirtM = clothMat(shirt), pantsM = clothMat(pants),
    shoeM = new THREE.MeshStandardMaterial({ color: shoes, roughness: 0.55 });
  const g = new THREE.Group();
  const P = {};
  // ---- pernas: coxa cônica + joelho + panturrilha com volume + tornozelo ----
  for (const [key, sx] of [['legL', -1], ['legR', 1]]) {
    const hip = new THREE.Group(); hip.position.set(sx * 0.115, D.hipY, 0); g.add(hip);
    const thigh = mesh(new THREE.CylinderGeometry(0.105, 0.070, D.thigh, 10), pantsM, 0, -D.thigh / 2, 0);
    hip.add(thigh);
    const knee = new THREE.Group(); knee.position.set(0, -D.thigh, 0); hip.add(knee);
    knee.add(mesh(new THREE.SphereGeometry(0.068, 10, 8), pantsM, 0, 0, 0.008));
    const shin = mesh(new THREE.CylinderGeometry(0.068, 0.048, D.shin, 10), pantsM, 0, -D.shin / 2, 0);
    knee.add(shin);
    const calf = mesh(new THREE.SphereGeometry(0.070, 10, 8), pantsM, 0, -0.10, -0.045);
    calf.scale.set(0.9, 1.25, 0.9); knee.add(calf); // volume da panturrilha
    const hem = mesh(new THREE.CylinderGeometry(0.062, 0.066, 0.07, 10), pantsM, 0, -D.shin + 0.02, 0);
    knee.add(hem); // barra da calça
    const shoeG = new THREE.Group(); shoeG.position.set(0, -D.shin - 0.01, 0); knee.add(shoeG);
    shoeG.add(mesh(new THREE.BoxGeometry(0.13, 0.07, 0.30), shoeM, 0, -0.035, 0.05)); // solado+corpo
    const upper = mesh(new THREE.BoxGeometry(0.12, 0.09, 0.20), shoeM, 0, 0.01, 0.03);
    shoeG.add(upper);
    shoeG.add(mesh(new THREE.SphereGeometry(0.062, 10, 8), shoeM, 0, -0.03, 0.17)); // biqueira
    const lace = mesh(new THREE.BoxGeometry(0.07, 0.02, 0.10),
      new THREE.MeshStandardMaterial({ color: 0xcfc9ba, roughness: 0.7 }), 0, 0.055, 0.05, false);
    shoeG.add(lace); // cadarço
    P[key] = hip; P[key + 'Knee'] = knee;
  }
  // ---- pelve + torso (camisa com espessura: corpo + sobreposição) ----
  P.hips = new THREE.Group(); P.hips.position.set(0, D.hipY, 0); g.add(P.hips);
  P.hips.add(mesh(new THREE.BoxGeometry(D.pelvisW, 0.20, 0.22), pantsM, 0, 0.02, 0));
  P.torso = new THREE.Group(); P.torso.position.set(0, D.hipY + 0.10, 0); g.add(P.torso);
  const belly = mesh(new THREE.CapsuleGeometry(0.17, 0.30, 4, 12), skinM, 0, 0.28, 0);
  P.torso.add(belly);
  const chest = mesh(new THREE.CapsuleGeometry(0.20, 0.26, 4, 12), shirtM, 0, 0.30, 0);
  chest.scale.set(1.06, 1, 1.02); P.torso.add(chest); // tecido VESTE o corpo, não o substitui
  P.chestMesh = chest;
  const collar = mesh(new THREE.TorusGeometry(0.095, 0.022, 8, 14, Math.PI * 1.5),
    shirtM, 0, 0.52, 0.01, false);
  collar.rotation.z = Math.PI * 0.75; collar.rotation.x = -0.15; P.torso.add(collar); // gola
  const btnM = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.4 });
  for (let bi = 0; bi < 3; bi++) {
    P.torso.add(mesh(new THREE.SphereGeometry(0.014, 6, 6), btnM, 0, 0.38 - bi * 0.09, 0.205, false));
  }
  // ---- ombros com deltóides + braços cônicos + cotovelo + punho ----
  P.shoulders = new THREE.Group(); P.shoulders.position.set(0, D.shoulderY, 0); g.add(P.shoulders);
  P.shoulders.add(mesh(new THREE.BoxGeometry(D.shoulderW, 0.14, 0.20), shirtM, 0, 0, 0));
  const trap = mesh(new THREE.CylinderGeometry(0.07, 0.16, 0.16, 8), shirtM, 0, 0.09, -0.01);
  P.shoulders.add(trap); // trapézio: pescoço encontra os ombros
  for (const [key, sx] of [['armL', -1], ['armR', 1]]) {
    const delt = mesh(new THREE.SphereGeometry(0.082, 10, 8), shirtM, sx * (D.shoulderW / 2 - 0.02), 0.0, 0);
    delt.scale.set(1, 1.1, 1); P.shoulders.add(delt);
    const sh = new THREE.Group(); sh.position.set(sx * (D.shoulderW / 2 - 0.02), -0.03, 0);
    P.shoulders.add(sh);
    const upper = mesh(new THREE.CylinderGeometry(0.072, 0.056, D.upperArm, 8),
      shirtLong ? shirtM : skinM, 0, -D.upperArm / 2, 0);
    sh.add(upper);
    const el = new THREE.Group(); el.position.set(0, -D.upperArm, 0); sh.add(el);
    el.add(mesh(new THREE.SphereGeometry(0.054, 8, 8), skinM, 0, 0, 0));
    const fore = mesh(new THREE.CylinderGeometry(0.056, 0.043, D.forearm, 8), skinM, 0, -D.forearm / 2, 0);
    el.add(fore);
    const cuff = mesh(new THREE.CylinderGeometry(0.060, 0.064, 0.06, 8), shirtM, 0, -0.03, 0);
    sh.add(cuff); // punho da manga
    const hand = buildHand(skinM, detail);
    hand.position.set(0, -D.forearm, 0); el.add(hand);
    P[key] = sh; P[key + 'El'] = el; P[key + 'Hand'] = hand;
  }
  // ---- pescoço + cabeça ----
  P.neck = new THREE.Group(); P.neck.position.set(0, D.shoulderY + 0.06, 0); g.add(P.neck);
  P.neck.add(mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.10, 10), skinM, 0, 0.02, 0));
  P.head = new THREE.Group(); P.head.position.set(0, 0.10, 0); P.neck.add(P.head);
  const face = buildFace(P.head, skinM, {
    iris: o.iris, detail, brow: o.brow, lip: o.lip, asym: o.asym ?? Math.random() * 0.8 + 0.2,
  });
  P.eyes = face.eyes; P.skull = face.skull;
  P.dims = D;
  return { group: g, parts: P };
}

// Walk cycle com peso: quadril desce 2x/ciclo, ombros contrabalançam, cabeça estabiliza.
// phase avança com a distância; amp 0..1 pela velocidade. Sem moonwalk: freq ∝ velocidade.
export function poseWalk(P, phase, amp, t) {
  const sL = Math.sin(phase), sR = Math.sin(phase + Math.PI);
  P.legL.rotation.x = sL * 0.55 * amp;
  P.legR.rotation.x = sR * 0.55 * amp;
  // joelho flexiona na fase de balanço (perna indo à frente)
  P.legLKnee.rotation.x = Math.max(0, -Math.cos(phase - 0.7)) * 0.9 * amp + 0.06;
  P.legRKnee.rotation.x = Math.max(0, -Math.cos(phase + Math.PI - 0.7)) * 0.9 * amp + 0.06;
  // braços opostos às pernas, cotovelo semifletido
  P.armL.rotation.x = sR * 0.42 * amp;
  P.armR.rotation.x = sL * 0.42 * amp;
  P.armLEl.rotation.x = -0.25 - Math.max(0, sR) * 0.25 * amp;
  P.armREl.rotation.x = -0.25 - Math.max(0, sL) * 0.25 * amp;
  P.armL.rotation.z = 0.08; P.armR.rotation.z = -0.08;
  // quadril: afunda 2x por ciclo + balanço lateral; ombros rolam oposto
  P.hips.position.y = D.hipY - Math.abs(Math.cos(phase)) * 0.035 * amp;
  P.hips.position.x = Math.sin(phase) * 0.018 * amp;
  P.shoulders.rotation.z = Math.sin(phase) * 0.028 * amp;
  P.shoulders.rotation.y = Math.sin(phase) * 0.05 * amp;
  // cabeça: estabiliza o olhar (quase parada, micro movimento)
  P.head.rotation.x = Math.cos(phase * 2) * 0.012 * amp;
  P.head.position.y = 0.10 - Math.abs(Math.cos(phase)) * 0.012 * amp;
  return { bob: Math.abs(Math.cos(phase)) * 0.035 * amp };
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
  if (P.chestMesh) { const s = 1 + b; P.chestMesh.scale.set(1.06 * s, 1, 1.02 * s); }
  P.head.rotation.x = Math.sin(t * 0.6) * 0.015;
}
