// PROTAGONISTA — reconstrução total, sem reaproveitar o modelo anterior.
// ETAPA A: humano-base neutro (bare:true) — cinza, sem roupa/cabelo/cor.
// Depois: rosto, cabelo, roupa, roxo, rig (o rig é o mesmo esqueleto articulado,
// compatível com poseWalk/poseRun/poseIdle). Pedestres NÃO usam este arquivo.
import * as THREE from 'three';
import { sculptSkull, clothMat } from './Humanoid.js';

// Proporções adultas (~5.7 cabeças, 1.87m): pernas 50%, ombros largos, cabeça contida.
const D = {
  hipY: 0.95, thigh: 0.44, shin: 0.44,
  shoulderY: 1.48, shoulderW: 0.44,
  upperArm: 0.30, forearm: 0.28,
};
const HEAD_R = 0.15;

function mesh(geo, material, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  return m;
}

function skinMats(bare) {
  if (bare) {
    const g = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.8, metalness: 0 });
    return { skin: g, face: g, shirt: g, pants: g, shoe: g, hair: g };
  }
  // roxo profundo e fosco: albedo escuro + roughness alto = sem estouro branco
  const skin = new THREE.MeshStandardMaterial({ color: 0x6a2598, roughness: 0.66, emissive: 0x6a2598, emissiveIntensity: 0.03 });
  skin.userData.envI = 0.2;
  const face = new THREE.MeshStandardMaterial({ color: 0x722fae, roughness: 0.58, emissive: 0x722fae, emissiveIntensity: 0.03 });
  face.userData.envI = 0.2;
  return {
    skin, face,
    shirt: clothMat(0xf5ecd7, 0.95),
    pants: clothMat(0x3d4450, 0.92),
    shoe: new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.55 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x1c1210, roughness: 0.95 }),
  };
}

// ETAPA A+B: rosto adulto — cavidades, nariz em 3 partes, lábios, orelhas com hélice.
function buildHead(g, M, asym) {
  const R = HEAD_R;
  const skull = mesh(sculptSkull(new THREE.SphereGeometry(R, 24, 18), R), M.face, 0, 0.055, -0.01);
  skull.scale.set(0.92, 1.06, 0.94); g.add(skull);
  const jaw = mesh(new THREE.SphereGeometry(0.105, 16, 12), M.face, 0, -0.015, 0.032);
  jaw.scale.set(0.80, 0.70, 0.85); g.add(jaw);
  const bridge = mesh(new THREE.CylinderGeometry(0.016, 0.023, 0.08, 6), M.face, 0.002 + asym * 0.002, 0.032, 0.137);
  bridge.rotation.x = 0.12; g.add(bridge);
  const tip = mesh(new THREE.SphereGeometry(0.020, 10, 8), M.face, 0.002 + asym * 0.002, 0.0, 0.149);
  tip.scale.set(1.2, 0.85, 0.9); g.add(tip);
  for (const s of [-1, 1]) {
    const wing = mesh(new THREE.SphereGeometry(0.013, 8, 8), M.face, s * 0.024, -0.004, 0.138);
    wing.scale.set(1, 0.8, 1); g.add(wing);
    const helix = mesh(new THREE.TorusGeometry(0.024, 0.009, 6, 10, 4.0), M.face, s * 0.139, 0.028, -0.005, false);
    helix.rotation.y = s * 1.35; g.add(helix);
    g.add(mesh(new THREE.SphereGeometry(0.013, 6, 6), M.face, s * 0.135, 0.0, 0.0, false));
  }
  const eyes = [];
  for (const k of [0, 1]) {
    const ex = (k ? 0.057 : -0.053) + asym * 0.002 * (k ? 1 : -1);
    const ey = 0.088, ez = 0.118;
    const socket = mesh(new THREE.SphereGeometry(0.038, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x1a0f14, roughness: 0.9 }), ex, ey, ez - 0.008, false);
    socket.scale.set(1, 0.9, 0.5); g.add(socket);
    const white = mesh(new THREE.SphereGeometry(0.0295, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.25 }), ex, ey, ez, false);
    white.scale.set(1, 0.8, 0.55); g.add(white); eyes.push(white);
    const lid = mesh(new THREE.TorusGeometry(0.031, 0.008, 6, 10, 2.3), M.face, ex, ey + 0.003, ez + 0.003, false);
    lid.rotation.z = Math.PI / 2 - 1.15; g.add(lid);
    const ir = mesh(new THREE.SphereGeometry(0.0145, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a2c14, roughness: 0.3 }), ex, ey - 0.001, ez + 0.011, false);
    ir.scale.set(1, 1, 0.45); g.add(ir);
    const pu = mesh(new THREE.SphereGeometry(0.009, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.2 }), ex, ey - 0.001, ez + 0.018, false);
    pu.scale.set(1, 1, 0.4); g.add(pu);
    const gl = mesh(new THREE.SphereGeometry(0.006, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff }), ex + 0.009, ey + 0.010, ez + 0.021, false);
    g.add(gl);
  }
  const browM = new THREE.MeshStandardMaterial({ color: 0x241812, roughness: 0.9 });
  const bL = mesh(new THREE.BoxGeometry(0.062, 0.012, 0.016), browM, -0.058, 0.135, 0.137, false);
  bL.rotation.z = 0.10 + asym * 0.04; g.add(bL);
  const bR = mesh(new THREE.BoxGeometry(0.058, 0.012, 0.016), browM, 0.060, 0.133, 0.137, false);
  bR.rotation.z = -0.06 - asym * 0.03; g.add(bR);
  const lipM = new THREE.MeshStandardMaterial({ color: 0x8a4a5a, roughness: 0.55 });
  const cavity = mesh(new THREE.SphereGeometry(0.036, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x1c0d12, roughness: 0.9 }), asym * 0.003, -0.042, 0.105, false);
  cavity.scale.set(1.1, 0.45, 0.5); g.add(cavity);
  for (const s of [-1, 1]) {
    const upper = mesh(new THREE.BoxGeometry(0.038, 0.013, 0.018), lipM, s * 0.021 + asym * 0.003, -0.026, 0.117, false);
    upper.rotation.z = s * -0.28; g.add(upper);
  }
  const lower = mesh(new THREE.SphereGeometry(0.024, 10, 8), lipM, asym * 0.003, -0.050, 0.114, false);
  lower.scale.set(1.25, 0.6, 0.6); g.add(lower);
  return { eyes };
}

function buildHand(skin, M) {
  const g = new THREE.Group();
  const palm = mesh(new THREE.BoxGeometry(0.075, 0.10, 0.042), skin, 0, -0.05, 0);
  g.add(palm);
  for (let f = 0; f < 4; f++) {
    const fx = -0.028 + f * 0.019;
    g.add(mesh(new THREE.SphereGeometry(0.011, 6, 6), skin, fx, -0.098, 0.004, false));
    const fg = new THREE.Group();
    fg.position.set(fx, -0.101, 0.006);
    fg.rotation.z = -(f - 1.5) * 0.06;
    const seg = mesh(new THREE.CapsuleGeometry(0.010, 0.052, 2, 6), skin, 0, -0.030, 0.008);
    seg.rotation.x = 0.28 + f * 0.03; fg.add(seg);
    g.add(fg);
  }
  const th1 = mesh(new THREE.CapsuleGeometry(0.0115, 0.034, 2, 6), skin, -0.046, -0.047, 0.012);
  th1.rotation.set(0.5, 0, 0.8); g.add(th1);
  const th2 = mesh(new THREE.CapsuleGeometry(0.0105, 0.028, 2, 6), skin, -0.059, -0.069, 0.020);
  th2.rotation.set(0.9, 0, 0.5); g.add(th2);
  return g;
}

// ETAPA A: corpo + ETAPA B: rosto. Retorna rig completo.
export function buildProtagonist(opts = {}) {
  const { bare = false } = opts;
  const M = skinMats(bare);
  const asym = 0.5 + Math.random() * 0.3;
  const g = new THREE.Group();
  const P = {};
  // pernas: coxa afunilada + joelho do mesmo raio + panturrilha + tornozelo + pé
  for (const [key, sx] of [['legL', -1], ['legR', 1]]) {
    const hip = new THREE.Group(); hip.position.set(sx * 0.105, D.hipY, 0); g.add(hip);
    hip.add(mesh(new THREE.CylinderGeometry(0.098, 0.064, D.thigh, 10), bare ? M.skin : M.pants, 0, -D.thigh / 2, 0));
    const quad = mesh(new THREE.SphereGeometry(0.088, 10, 8), bare ? M.skin : M.pants, 0, -0.12, 0.042);
    quad.scale.set(0.95, 1.25, 0.8); hip.add(quad);
    const knee = new THREE.Group(); knee.position.set(0, -D.thigh, 0); hip.add(knee);
    knee.add(mesh(new THREE.SphereGeometry(0.062, 10, 8), bare ? M.skin : M.pants, 0, 0, 0.006));
    knee.add(mesh(new THREE.CylinderGeometry(0.060, 0.042, D.shin, 10), bare ? M.skin : M.pants, 0, -D.shin / 2, 0));
    const calf = mesh(new THREE.SphereGeometry(0.062, 10, 8), bare ? M.skin : M.pants, 0, -0.10, -0.040);
    calf.scale.set(0.9, 1.25, 0.9); knee.add(calf);
    const shoeG = new THREE.Group(); shoeG.position.set(0, -D.shin - 0.005, 0); knee.add(shoeG);
    if (!bare) {
      shoeG.add(mesh(new THREE.BoxGeometry(0.12, 0.06, 0.32), M.shoe, 0, -0.030, 0.06));
      shoeG.add(mesh(new THREE.BoxGeometry(0.11, 0.085, 0.20), M.shoe, 0, 0.012, 0.02));
      shoeG.add(mesh(new THREE.SphereGeometry(0.058, 10, 8), M.shoe, 0, -0.025, 0.19));
      const lace = mesh(new THREE.BoxGeometry(0.065, 0.018, 0.10),
        new THREE.MeshStandardMaterial({ color: 0xcfc9ba, roughness: 0.7 }), 0, 0.058, 0.045, false);
      shoeG.add(lace);
    } else {
      // pé descalço: volume com dedos sugeridos
      shoeG.add(mesh(new THREE.BoxGeometry(0.10, 0.06, 0.26), M.skin, 0, -0.030, 0.04));
      shoeG.add(mesh(new THREE.SphereGeometry(0.052, 8, 8), M.skin, 0, -0.028, 0.16));
    }
    P[key] = hip; P[key + 'Knee'] = knee;
  }
  // pelve + quadril curvo (esferas laterais fundem perna e tronco)
  P.hips = new THREE.Group(); P.hips.position.set(0, D.hipY, 0); g.add(P.hips);
  P.hips.add(mesh(new THREE.BoxGeometry(0.28, 0.20, 0.21), bare ? M.skin : M.pants, 0, 0.02, 0));
  for (const sx of [-1, 1]) {
    const hipC = mesh(new THREE.SphereGeometry(0.105, 12, 10), bare ? M.skin : M.pants, sx * 0.105, 0.0, 0);
    hipC.scale.set(1, 1.15, 0.95); P.hips.add(hipC);
  }
  // torso em lathe: cintura marcada, peito, ombros (pele ou camisa por fora)
  P.torso = new THREE.Group(); P.torso.position.set(0, D.hipY + 0.10, 0); g.add(P.torso);
  const prof = [[0.148, 0.0], [0.150, 0.08], [0.140, 0.20], [0.150, 0.32], [0.170, 0.44], [0.176, 0.52], [0.145, 0.60], [0.078, 0.645]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const torsoSkin = mesh(new THREE.LatheGeometry(prof, 14), M.skin, 0, 0, 0);
  P.torso.add(torsoSkin);
  P.chestMesh = torsoSkin;
  // ombros: barra + deltóides fundidos ao braço
  P.shoulders = new THREE.Group(); P.shoulders.position.set(0, D.shoulderY, 0); g.add(P.shoulders);
  P.shoulders.add(mesh(new THREE.BoxGeometry(D.shoulderW, 0.13, 0.19), bare ? M.skin : M.shirt, 0, 0, 0));
  const trap = mesh(new THREE.CylinderGeometry(0.07, 0.16, 0.16, 8), bare ? M.skin : M.shirt, 0, 0.09, -0.01);
  P.shoulders.add(trap);
  for (const [key, sx] of [['armL', -1], ['armR', 1]]) {
    const delt = mesh(new THREE.SphereGeometry(0.076, 10, 8), bare ? M.skin : M.shirt, sx * (D.shoulderW / 2 - 0.02), 0.0, 0);
    delt.scale.set(1, 1.15, 1); P.shoulders.add(delt);
    const sh = new THREE.Group(); sh.position.set(sx * (D.shoulderW / 2 - 0.02), -0.03, 0);
    P.shoulders.add(sh);
    sh.add(mesh(new THREE.CylinderGeometry(0.066, 0.050, D.upperArm, 8), bare ? M.skin : M.shirt, 0, -D.upperArm / 2, 0));
    const bic = mesh(new THREE.SphereGeometry(0.056, 8, 8), bare ? M.skin : M.shirt, 0, -0.10, 0.026, false);
    bic.scale.set(0.9, 1.2, 0.85); sh.add(bic);
    const el = new THREE.Group(); el.position.set(0, -D.upperArm, 0); sh.add(el);
    el.add(mesh(new THREE.SphereGeometry(0.048, 8, 8), M.skin, 0, 0, 0));
    el.add(mesh(new THREE.CylinderGeometry(0.050, 0.037, D.forearm, 8), M.skin, 0, -D.forearm / 2, 0));
    const foreM = mesh(new THREE.SphereGeometry(0.049, 8, 8), M.skin, 0, -0.07, 0.016, false);
    foreM.scale.set(0.85, 1.25, 0.8); el.add(foreM);
    const hand = buildHand(M.skin, true);
    hand.position.set(0, -D.forearm, 0); el.add(hand);
    P[key] = sh; P[key + 'El'] = el; P[key + 'Hand'] = hand;
  }
  // pescoço + cabeça (menor, ~5.7 proporções)
  P.neck = new THREE.Group(); P.neck.position.set(0, D.shoulderY + 0.06, 0); g.add(P.neck);
  P.neck.add(mesh(new THREE.CylinderGeometry(0.062, 0.078, 0.20, 10), M.skin, 0, 0.06, 0));
  const trapNeck = mesh(new THREE.CylinderGeometry(0.068, 0.165, 0.16, 8), bare ? M.skin : M.shirt, 0, -0.03, -0.01);
  P.neck.add(trapNeck);
  P.head = new THREE.Group(); P.head.position.set(0, 0.17, 0); P.neck.add(P.head);
  P.head.scale.set(0.86, 0.88, 0.86);
  const face = buildHead(P.head, M, 0.5 + Math.random() * 0.3);
  P.eyes = face.eyes;
  P.dims = D;
  return { group: g, parts: P, mats: M };
}

// ETAPA D/E: roupa de vendedor + roxo + cabelo/boné sobre a base aprovada.
export function dressVendor(P, M) {
  const g = new THREE.Group(); // âncora (retornada p/ referência)
  // camisa: casca lathe sobre o torso + mangas + gola + botões
  const prof = [[0.158, 0.0], [0.160, 0.08], [0.150, 0.20], [0.160, 0.32], [0.180, 0.44], [0.186, 0.52], [0.155, 0.60], [0.088, 0.645]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const shirt = new THREE.Mesh(new THREE.LatheGeometry(prof, 14), M.shirt);
  shirt.castShadow = true; P.torso.add(shirt);
  P.chestMesh = shirt;
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.020, 8, 14, Math.PI * 1.5), M.shirt);
  collar.position.set(0, 0.60, 0.01); collar.rotation.z = Math.PI * 0.75; collar.rotation.x = -0.15;
  P.torso.add(collar);
  const btnM = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.4 });
  for (let bi = 0; bi < 3; bi++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 6), btnM);
    b.position.set(0, 0.42 - bi * 0.09, 0.155); P.torso.add(b);
  }
  for (const sx of [-1, 1]) { // mangas curtas com punho
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.072, 0.20, 10), M.shirt);
    sleeve.position.set(sx * 0.20, -0.10, 0); sleeve.castShadow = true;
    P.shoulders.add(sleeve);
  }
  // avental extrudado que segue o torso + amarração nas costas + bolso
  const apronM = clothMat(0x6b4a2f, 0.8);
  const shape = new THREE.Shape();
  shape.moveTo(-0.12, 0.26); shape.lineTo(0.12, 0.26);
  shape.lineTo(0.175, -0.26); shape.lineTo(-0.175, -0.26); shape.closePath();
  const ap = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.028, bevelEnabled: false }), apronM);
  ap.position.set(0, 0.24, 0.150); ap.rotation.x = -0.05; ap.castShadow = true; P.torso.add(ap);
  for (const sx of [-1, 1]) { // alças ombro→costas + nó atrás
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.34, 0.022), apronM);
    strap.position.set(sx * 0.10, 0.56, 0.10); strap.rotation.x = -0.35; strap.rotation.y = sx * 0.25;
    P.torso.add(strap);
  }
  const knot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.04), apronM);
  knot.position.set(0, 0.30, -0.175); P.torso.add(knot);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.02), apronM);
  belt.position.set(0, -0.02, 0.175); belt.rotation.x = -0.05; P.torso.add(belt);
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.11, 0.045),
    new THREE.MeshStandardMaterial({ color: 0x3fa34d, roughness: 0.7 }));
  pocket.position.set(0.02, 0.10, 0.19); P.torso.add(pocket);
  // cabelo curto atrás/lados + franja (nada de capacete) + boné de vendedor
  const H = M.hair;
  const scalp = new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), H);
  scalp.scale.set(0.95, 0.72, 0.98); scalp.position.set(0, 0.075, -0.025); P.head.add(scalp);
  for (let f = 0; f < 6; f++) {
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.085, 0.04), H);
    fr.position.set(-0.10 + f * 0.04, 0.105, 0.115);
    fr.rotation.set(0.12, 0, (f - 2.5) * 0.09);
    P.head.add(fr);
  }
  for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.11, 0.07), H);
    side.position.set(sx * 0.135, 0.01, 0.03); side.rotation.z = sx * -0.12; P.head.add(side);
    const burn = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.05), H);
    burn.position.set(sx * 0.125, -0.045, 0.06); P.head.add(burn); // costeletas
  }
  const napeH = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.05), H);
  napeH.position.set(0, -0.01, -0.135); P.head.add(napeH);
  const capM = new THREE.MeshStandardMaterial({ color: 0xc22424, roughness: 0.65 });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.135, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), capM);
  cap.scale.y = 0.62; cap.position.set(0, 0.135, -0.015); cap.castShadow = true; P.head.add(cap);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.125, 0.028, 14, 1, false, -Math.PI / 2, Math.PI), capM);
  brim.position.set(0, 0.145, 0.10); brim.rotation.x = 0.10; P.head.add(brim);
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.022, 10),
    new THREE.MeshStandardMaterial({ color: 0x9b4fd9, roughness: 0.3, emissive: 0x9b4fd9, emissiveIntensity: 0.25 }));
  pin.position.set(0, 0.20, 0.105); pin.rotation.x = 0.55; P.head.add(pin);
  return g;
}
