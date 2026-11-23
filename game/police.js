import * as THREE from './three.module.min.js';

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
  // Position units against camera
}

export function coverAudit(camera) {
  return units.map(u => ({ name: u.name, tactic: u.tactic, distance: 0, sx: 0, sy: 0 }));
}

export function getPoliceUnits(playerPos) {
  return units.map(u => ({ name: u.name, tactic: u.tactic, dist: 0 }));
}

export function getUnits() { return units; }
