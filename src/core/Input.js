// Input: teclado + mouse (pointer lock com fallback drag) + scroll zoom.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.yaw = -Math.PI * 0.5; // câmera a oeste: jogador olha p/ a rua (leste)
    this.pitch = 0.32;
    this.dist = 5.6;
    this.sens = 1;
    this.invertY = false;
    this.locked = false;
    this.dragging = false;
    this.lastX = 0; this.lastY = 0;
    this.interactPressed = false; // borda de subida de E
    this.enabled = false;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'KeyE') this.interactPressed = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      if (this.locked) {
        const iy = this.invertY ? -1 : 1;
        this.yaw -= e.movementX * 0.0024 * this.sens;
        this.pitch += e.movementY * 0.0022 * this.sens * iy;
      } else if (this.dragging) {
        const iy = this.invertY ? -1 : 1;
        this.yaw -= (e.clientX - this.lastX) * 0.005 * this.sens;
        this.pitch += (e.clientY - this.lastY) * 0.004 * this.sens * iy;
        this.lastX = e.clientX; this.lastY = e.clientY;
      }
      this.pitch = Math.max(0.05, Math.min(1.15, this.pitch));
    });
    canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      if (!this.locked && e.button === 0) {
        // tenta pointer lock; se falhar, usa drag
        try { this.canvas.requestPointerLock(); } catch { /* fallback drag */ }
        this.dragging = true; this.lastX = e.clientX; this.lastY = e.clientY;
      }
    });
    window.addEventListener('mouseup', () => { this.dragging = false; });
    canvas.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      this.dist = Math.max(3, Math.min(9.5, this.dist + e.deltaY * 0.003));
    }, { passive: true });
  }
  lock() { try { const r = this.canvas.requestPointerLock(); if (r?.catch) r.catch(() => {}); } catch {} }
  unlock() { try { if (document.pointerLockElement) document.exitPointerLock(); } catch {} }
  axis() {
    let x = 0, z = 0;
    const k = this.keys;
    if (k.has('KeyW') || k.has('ArrowUp')) z -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) z += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (x || z) { const l = Math.hypot(x, z); x /= l; z /= l; }
    return { x, z };
  }
  running() { return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'); }
  consumeInteract() { const v = this.interactPressed; this.interactPressed = false; return v; }
}
