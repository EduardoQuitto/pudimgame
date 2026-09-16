// Modelos 3D dos produtos: cada um com silhueta própria (não só cor diferente).
// Escala base ~0.15 (bandeja); a barraca reutiliza com scale maior.
import * as THREE from 'three';

function mat(color, roughness = 0.35, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, ...extra });
}
// brilho próprio sutil: produto legível ao entardecer sem virar neon
function glow(color, intensity = 0.35) {
  return { emissive: color, emissiveIntensity: intensity };
}

export function buildProductMesh(id) {
  const g = new THREE.Group();
  const add = (m) => { m.castShadow = true; g.add(m); return m; };
  switch (id) {
    case 'choco': { // pudim de chocolate: marrom escuro + calda
      const b = add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.08, 12), mat(0x5a2e16, 0.4, glow(0x5a2e16))));
      b.position.y = 0.04;
      const t = add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 12), mat(0x2e1608, 0.25)));
      t.position.y = 0.09;
      break;
    }
    case 'morango': { // rosado + morango em cima
      const b = add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.08, 12), mat(0xe86a8a, 0.4, glow(0xe86a8a))));
      b.position.y = 0.04;
      const berry = add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), mat(0xc22a3a, 0.3)));
      berry.position.y = 0.1;
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.03, 6), mat(0x2f7a3d, 0.6));
      leaf.position.y = 0.13; g.add(leaf);
      break;
    }
    case 'geladinho': { // saquinho deitado, azul-claro leitoso
      const s = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.1, 3, 8),
        mat(0x9fd8ff, 0.25, { transparent: true, opacity: 0.92 })));
      s.rotation.z = Math.PI / 2; s.position.y = 0.035;
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.008, 6, 10), mat(0xe86a8a, 0.5));
      tie.position.x = 0.08; tie.rotation.y = Math.PI / 2; g.add(tie);
      break;
    }
    case 'agua': { // garrafinha azul + tampa branca
      const b = add(new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.12, 10),
        mat(0x3a9fdc, 0.15, { transparent: true, opacity: 0.85 })));
      b.position.y = 0.06;
      const cap = add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 8), mat(0xf2f2f2, 0.4)));
      cap.position.y = 0.135;
      break;
    }
    case 'brigadeiro': { // 3 docinhos escuros granulados
      const m = mat(0x3a1c0d, 0.55);
      [[-0.045, 0], [0.045, 0.01], [0, 0.05]].forEach(([x, z]) => {
        const s = add(new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), m));
        s.position.set(x, 0.032, z - 0.02);
      });
      break;
    }
    default: { // pudim roxo: flan + calda de uva
      const b = add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.08, 12), mat(0x9b4fd9, 0.35, glow(0x9b4fd9))));
      b.position.y = 0.04;
      const t = add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 12), mat(0x4a1a7a, 0.22)));
      t.position.y = 0.09;
    }
  }
  return g;
}
