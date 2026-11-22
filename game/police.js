import * as THREE from './three.module.min.js';
import { groundHeight } from './city.js';

/**
 * Caldera Bay Police Module
 * Single HEAT arbiter, crime points, levels, dispatch units, pursuit, roadblocks, search, decay, busted logic.
 */

let heat = 0;
let sceneRef = null;
let policeUnits = [];

const CRIME_POINTS = {
  carjack: 10, pedHit: 15, mug: 15, gunshot: 5, copKill: 40, policeCarSteal: 40
};

export function initPolice(scene) {
  sceneRef = scene;
  heat = 0;
  policeUnits = [];
}

export function reportCrime(type, pos, isWitnessed) {
  if (isWitnessed) {
    heat = Math.min(200, heat + (CRIME_POINTS[type] || 0));
  }
}

export function setPointsFloor(p) {
  heat = Math.max(heat, p);
}

export function updatePolice(dt, playerPos) {
  // Update police units, pursuit logic, search logic
  // Decay heat slowly if no police/witnesses in range
}

export function getHeat() {
  return heat;
}

export function respray() {
  heat = 0;
}
