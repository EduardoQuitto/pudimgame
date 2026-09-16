// Semáforo: máquina de estados real — controla trânsito, risco e gameplay.
import { CONFIG } from '../core/Config.js';

export class TrafficLight {
  constructor(map, audio, onChange) {
    this.map = map; this.audio = audio; this.onChange = onChange;
    this.state = 'green';
    this.t = CONFIG.light.green;
    this.cycle = 0;
    this.map.setLightState('green');
  }
  force(state) {
    this.state = state;
    this.t = CONFIG.light[state] ?? 10;
    this.apply();
  }
  update(dt) {
    this.t -= dt;
    if (this.t <= 0) {
      if (this.state === 'green') this.set('yellow');
      else if (this.state === 'yellow') this.set('red');
      else { this.set('green'); this.cycle++; }
    }
  }
  set(s) {
    this.state = s;
    this.t = CONFIG.light[s];
    this.apply();
  }
  apply() {
    this.map.setLightState(this.state);
    this.audio.lightChange(this.state === 'red');
    if (this.onChange) this.onChange(this.state);
  }
  get timeLeft() { return Math.ceil(this.t); }
  get carsMayGo() { return this.state === 'green' || this.state === 'yellow'; }
}
