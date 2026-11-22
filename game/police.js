import * as THREE from './three.module.min.js';
import { groundHeight } from './city.js';
import { createVehicleMesh } from './vehicles.js';
import { witnessesAt } from './pedestrians.js';
import { createRNG } from './city.js';

/**
 * Caldera Bay Police Module (v2)
 * Arbiter of HEAT, dispatch, tactics, and staging.
 */

let sceneRef = null;
let points = 0;
let pointsFloor = 0;
let policeUnits = [];
let rng = null;
let searchTimer = 0;
let lineOfSight = false;
let lastRoadblockTime = 0;

const CRIME_POINTS = {
  carjack: 10, pedHit: 15, mug: 15, gunshot: 5, copKill: 40, policeCarSteal: 40, police_car_steal: 40
};

const UNIT_NAMES = ['PERALTA', 'GARZA', 'ROCHA', 'SOTO', 'NAVARRO', 'CAMPOS', 'MEDINA', 'ORTEGA', 'VARGAS', 'MENDOZA'];

export function initPolice(scene, rngInstance) {
  sceneRef = scene;
  points = 0;
  pointsFloor = 0;
  policeUnits = [];
  searchTimer = 0;
  lineOfSight = false;
  lastRoadblockTime = 0;
  rng = rngInstance || createRNG(777);
}

export function reportCrime(type, pos, isPlayer) {
  if (isPlayer) {
    const hasWitness = witnessesAt(pos, 45) > 0;
    const isGunshot = type === 'gunshot';
    const heardGunshot = isGunshot && witnessesAt(pos, 60) > 0;
    if (hasWitness || heardGunshot || points > 10) {
      points = Math.min(250, points + (CRIME_POINTS[type] || 0));
    }
  }
}

export function setPointsFloor(f) { pointsFloor = f; }

export function setPoints(p) { points = p; }

export function getHeat() {
  if (points >= 150) return 5;
  if (points >= 100) return 4;
  if (points >= 60) return 3;
  if (points >= 30) return 2;
  if (points >= 10) return 1;
  return 0;
}

export function respray() {
  points = 0;
  clearUnits();
}

function clearUnits() {
  policeUnits.forEach(u => sceneRef.remove(u.mesh));
  policeUnits = [];
}

export function forceRoadblock(pos, heading) {
  // Roadblock implementation
}

export function updatePolice(dt, playerPos) {
  points = Math.max(points, pointsFloor);
  const heatLevel = getHeat();

  if (heatLevel === 0) {
    clearUnits();
    return;
  }

  // Update units
  updateUnits(dt, playerPos, heatLevel);

  // Roadblocks
  lastRoadblockTime += dt;
  if (heatLevel >= 3 && lastRoadblockTime > 45) {
     // Spawn roadblock
     lastRoadblockTime = 0;
  }

  // Search/Decay
  if (lineOfSight) {
    searchTimer = 0;
  } else {
    searchTimer += dt;
    if (searchTimer > 10) {
       points = Math.max(0, points - (3 * dt)); // Simple decay
    }
  }
}

function updateUnits(dt, playerPos, heatLevel) {
  // Logic to maintain unit count based on heatLevel
  const targetCount = [0, 2, 4, 6, 8, 10][heatLevel];

  while (policeUnits.length < targetCount) {
    spawnUnit(playerPos);
  }

  policeUnits.forEach(u => {
     // Movement, tactics, distance calc
     u.dist = Math.hypot(u.x - playerPos.x, u.z - playerPos.z);
     // Apply tactic
     if (heatLevel >= 4) u.tactic = 'SPOTLIGHT';
     else if (heatLevel >= 3 && u.dist < 15) u.tactic = 'RAMMING';
     else if (heatLevel >= 2) u.tactic = 'BOX-IN';
     else u.tactic = 'PURSUIT';

     // Update mesh position
     u.mesh.position.set(u.x, groundHeight(u.x, u.z), u.z);
  });
}

export function spawnUnit(playerPos) {
  const x = playerPos.x + (rng() - 0.5) * 100;
  const z = playerPos.z + (rng() - 0.5) * 100;
  const mesh = createVehicleMesh('fenix', 0x111122);
  sceneRef.add(mesh);
  policeUnits.push({
    name: UNIT_NAMES[Math.floor(rng() * UNIT_NAMES.length)],
    x, z,
    mesh,
    tactic: 'PURSUIT',
    dist: 0
  });
}

export function stageCover(camera, heroPos) {
  // Stage police units around player/camera
  // Front pair abeam of the hero car measured against the CAMERA
  // rest queued 16–75 m
  policeUnits.forEach((u, i) => {
    if (!u.mesh.parent) {
      sceneRef.add(u.mesh);
    }
    u.mesh.visible = true;
    u.mesh.scale.set(1, 1, 1);
    if (i < 2) {
      // Front pair abeam (side-by-side with hero car)
      u.x = heroPos.x + (i === 0 ? -4 : 4);
      u.z = heroPos.z;
    } else {
      // Rest queued 16-75 m
      const dist = 16 + (i - 2) * (59 / (policeUnits.length - 2));
      u.x = heroPos.x + (i % 2 === 0 ? -6 : 6);
      u.z = heroPos.z + dist;
    }
    u.mesh.position.set(u.x, groundHeight(u.x, u.z), u.z);
    u.mesh.rotation.y = Math.PI; // Face player
  });
}

export function coverAudit(camera) {
  const v = new THREE.Vector3();
  return policeUnits.map(u => {
    v.set(u.x, groundHeight(u.x, u.z), u.z);
    v.project(camera);
    // Convert -1..1 to 0..100
    return {
      name: u.name,
      tactic: u.tactic,
      distance: u.dist,
      sx: (v.x * 0.5 + 0.5) * 100,
      sy: (-(v.y * 0.5) + 0.5) * 100 // Inverted Y for screen space
    };
  });
}

export function getPoliceUnits(playerPos) {
  return policeUnits.map(u => ({
    name: u.name,
    tactic: u.tactic,
    dist: Math.hypot(u.x - playerPos.x, u.z - playerPos.z)
  }));
}

