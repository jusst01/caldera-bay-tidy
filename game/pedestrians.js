import * as THREE from './three.module.min.js';
let pedestrians = [];
let scene = null;
let seed = 12345;
function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}
const random = mulberry32(seed);
export function initPedestrians(s) {
  scene = s;
  pedestrians = [];
  for (let i = 0; i < 50; i++) {
    spawnPedestrian(i);
  }
}
function spawnPedestrian(id) {
  const x = (random() - 0.5) * 1000;
  const z = (random() - 0.5) * 1000;
  const geometry = new THREE.BoxGeometry(0.5, 1.8, 0.5);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, 0.9, z);
  scene.add(mesh);
  pedestrians.push({ id, x, z, mesh });
}
export function updatePedestrians() {
  pedestrians.forEach(p => {
    p.x += (random() - 0.5) * 0.1;
    p.z += (random() - 0.5) * 0.1;
    p.mesh.position.x = p.x;
    p.mesh.position.z = p.z;
  });
}
export function debugSetPed(id, x, z) {
  const p = pedestrians.find(ped => ped.id === id);
  if (p) {
    p.x = x;
    p.z = z;
    p.mesh.position.x = x;
    p.mesh.position.z = z;
  }
}
