// Câmera em 3ª pessoa: follow suave, orbit por mouse, zoom, colisão via raycast,
// FOV/distância dinâmicos na corrida e trauma (shake) em impactos — tudo sutil.
import * as THREE from 'three';

export class ThirdCamera {
  constructor(scene, camera, input) {
    this.scene = scene; this.cam = camera; this.input = input;
    this.target = new THREE.Vector3();
    this.pos = new THREE.Vector3(-28, 4, -12);
    this.ray = new THREE.Raycaster();
    this.trauma = 0;
    this.fov = 58;
    this.collisionMeshes = [];
    scene.traverse(o => { if (o.isMesh && o.geometry?.parameters?.width > 6) this.collisionMeshes.push(o); });
    camera.position.copy(this.pos);
  }
  addTrauma(x) { this.trauma = Math.min(1, this.trauma + x); }
  update(dt, player, running = false) {
    const inp = this.input;
    // decaimento do trauma
    this.trauma = Math.max(0, this.trauma - dt * 1.5);
    const sh = this.trauma * this.trauma;
    // FOV e distância respiram na corrida
    const wantFov = running && player.moving ? 63 : 58;
    this.fov += (wantFov - this.fov) * Math.min(1, 5 * dt);
    if (Math.abs(this.cam.fov - this.fov) > 0.05) {
      this.cam.fov = this.fov;
      this.cam.updateProjectionMatrix();
    }
    const dist = inp.dist + (running && player.moving ? 0.7 : 0);
    this.target.lerp(new THREE.Vector3(player.pos.x, 1.55, player.pos.z), Math.min(1, 10 * dt));
    const cp = Math.cos(inp.pitch), sp = Math.sin(inp.pitch);
    const desired = new THREE.Vector3(
      this.target.x + Math.sin(inp.yaw) * cp * dist,
      this.target.y + sp * dist + 0.4,
      this.target.z + Math.cos(inp.yaw) * cp * dist);
    const dir = desired.clone().sub(this.target);
    const len = dir.length(); dir.normalize();
    this.ray.set(this.target, dir);
    this.ray.far = len;
    const hits = this.ray.intersectObjects(this.collisionMeshes, false);
    let d = len;
    if (hits.length) d = Math.max(1.2, hits[0].distance - 0.4);
    desired.copy(this.target).addScaledVector(dir, d);
    desired.y = Math.max(0.6, desired.y);
    this.pos.lerp(desired, Math.min(1, 9 * dt));
    this.cam.position.copy(this.pos);
    if (sh > 0) {
      this.cam.position.x += (Math.random() - 0.5) * sh * 0.7;
      this.cam.position.y += (Math.random() - 0.5) * sh * 0.5;
    }
    this.cam.lookAt(this.target.x, this.target.y + sh * 0.2, this.target.z);
  }
}
