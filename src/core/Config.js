// Config central: balanceamento + qualidade. Ajustes simples e expansíveis.
export const CONFIG = {
  saveKey: 'pudim-save-v1',
  // Semáforo (segundos). Total do ciclo ~41s para gameplay ágil.
  light: { green: 20, yellow: 3, red: 18 },
  player: { walk: 4.2, run: 7.2, accel: 26, radius: 0.45 },
  bounds: { minX: -33, maxX: 33, minZ: -9.6, maxZ: 9.6 },
  street: { halfWidth: 5.2 }, // |z| < 5.2 = rua (perigo)
  lanes: [
    { z: -2.6, dir: +1, stopX: -6.5 },  // faixa leste
    { z: +2.6, dir: -1, stopX: +6.5 },  // faixa oeste
  ],
  sell: { range: 3.0, time: 1.25, comboWindow: 14 },
  startMoney: 20,
  quality: {
    low:    { pixelRatio: 0.75, shadows: false, shadowSize: 512,  rain: 400,  particles: 0.4, antialias: false },
    medium: { pixelRatio: 1.0,  shadows: true,  shadowSize: 1024, rain: 900,  particles: 0.7, antialias: true },
    high:   { pixelRatio: 1.5,  shadows: true,  shadowSize: 2048, rain: 1500, particles: 1.0, antialias: true },
    ultra:  { pixelRatio: 2.0,  shadows: true,  shadowSize: 2048, rain: 2200, particles: 1.3, antialias: true },
  },
};

export const QUALITY_LEVELS = ['low', 'medium', 'high', 'ultra'];
