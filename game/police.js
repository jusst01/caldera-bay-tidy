import * as THREE from './three.module.min.js';
import { groundHeight } from './city.js';

let points = 0;
let units = [];
const surnames = ['Vega', 'Soto', 'Rojas', 'Mora', 'Ruiz', 'Flores', 'Reyes', 'Silva', 'Castro', 'Luna'];

const POINTS_TABLE = { carjack: 10, pedHit: 15, mug: 15, gunshot: 5, copKill: 40, policeCarSteal: 40 };

export function initPolice() {
  points = 0;
  units = [];
}

export function reportCrime(type) {
  if (POINTS_TABLE[type]) {
    points += POINTS_TABLE[type];
  }
}

export function setPointsFloor(p) { if (points < p) points = p; }
export function setPoints(p) { points = p; }
export function getHeat() {
  if (points >= 150) return 5;
  if (points >= 100) return 4;
  if (points >= 60) return 3;
  if (points >= 30) return 2;
  if (points >= 10) return 1;
  return 0;
}
export function getPoints() { return points; }
export function getHeatPoints() { return points; }

export function respray() { points = 0; units = []; }
export function forceRoadblock() { /* Logic for roadblock */ }

export function updatePolice(dt, playerPos) {
  // Logic for updating unit tactics, positions, pursuit, etc.
}

export function spawnUnit(pos) {
  const name = surnames[Math.floor(Math.random() * surnames.length)];
  units.push({ name, tactic: 'PURSUIT', x: pos.x, z: pos.z, mesh: null });
}

export function stageCover(camera, playerPos) {
  units.forEach((u, idx) => {
    const offset = new THREE.Vector3((idx % 3 - 1) * 2, 0, -4 - (idx * 1.5)).applyQuaternion(camera.quaternion);
    u.x = camera.position.x + offset.x;
    u.z = camera.position.z + offset.z;
  });
}

export function coverAudit(camera) {
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return units.map(u => {
    const v = new THREE.Vector3(u.x, groundHeight(u.x, u.z) + 1, u.z);
    v.project(camera);
    const sx = (v.x * 0.5 + 0.5) * 100;
    const sy = (-(v.y * 0.5) + 0.5) * 100;
    const distance = Math.sqrt((u.x - camera.position.x)**2 + (u.z - camera.position.z)**2);
    return { name: u.name, tactic: u.tactic, distance, sx, sy };
  });
}

export function getPoliceUnits(playerPos) {
  const p = playerPos || { x: 0, z: 0 };
  return units.map(u => {
    const dx = u.x - p.x;
    const dz = u.z - p.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    return { name: u.name, tactic: u.tactic, dist };
  });
}

export function getUnits() { return units; }
