// CALDERA BAY — game/police.js
// Single HEAT arbiter, witness rules, named dispatch units, tactics, roadblocks, heli spotlight, search/decay, busted rules, test hooks.

import * as THREE from './three.module.min.js';
import { groundHeight } from './city.js';
import { spawnVehicle, updateVehicle, createVehicleMesh } from './vehicles.js';
import { witnessesAt } from './pedestrians.js';

const DISPATCH_NAMES = [
  'U12 "PERALTA"', 'U14 "GARCIA"', 'U16 "RODRIGUEZ"', 'U18 "MORENO"',
  'U20 "SILVA"', 'U22 "CASTRO"', 'U24 "ORTIZ"', 'U26 "RUIZ"',
  'U28 "MENDOZA"', 'U30 "FLORES"'
];

const CRIME_POINTS = {
  carjack: 10,
  pedHit: 15,
  mug: 15,
  gunshot: 5,
  copKill: 40,
  policeCarSteal: 40
};

let heatPoints = 0;
let heatLevel = 1;
let pointsFloor = 0;
let units = [];
let roadblocks = [];
let heli = null;
let sceneRef = null;
let searchTimer = 0;
let searching = false;
let roadblockTimer = 0;
let bustedTimer = 0;

export function initPolice(scene) {
  sceneRef = scene;
  heatPoints = 0;
  heatLevel = 1;
  pointsFloor = 0;
  units = [];
  roadblocks = [];
  heli = null;
}

export function reportCrime(crimeType, playerPos, hasWitness = true) {
  const pts = CRIME_POINTS[crimeType] || 10;
  if (!hasWitness && crimeType !== 'gunshot') return heatLevel;

  heatPoints += pts;
  evaluateHeatLevel();
  return heatLevel;
}

export function setPointsFloor(floor) {
  pointsFloor = floor;
  if (heatPoints < pointsFloor) {
    heatPoints = pointsFloor;
    evaluateHeatLevel();
  }
}

export function respray() {
  heatPoints = 0;
  heatLevel = 1;
  pointsFloor = 0;
  units.forEach(u => {
    if (sceneRef && u.mesh) sceneRef.remove(u.mesh);
  });
  units = [];
  roadblocks.forEach(r => {
    if (sceneRef && r.mesh) sceneRef.remove(r.mesh);
  });
  roadblocks = [];
  if (heli && heli.mesh && sceneRef) {
    sceneRef.remove(heli.mesh);
    heli = null;
  }
}

function evaluateHeatLevel() {
  if (heatPoints >= 150) heatLevel = 5;
  else if (heatPoints >= 100) heatLevel = 4;
  else if (heatPoints >= 60) heatLevel = 3;
  else if (heatPoints >= 30) heatLevel = 2;
  else if (heatPoints >= 10) heatLevel = 1;
  else heatLevel = 1;
}

export function getHeat() {
  return heatLevel;
}

export function getHeatPoints() {
  return heatPoints;
}

export function getUnits() {
  return units;
}

export function forceRoadblock(pos, heading) {
  if (!sceneRef) return;
  const rbMesh = spawnVehicle('fenix', pos.x, pos.z, heading, sceneRef);
  rbMesh.speed = 0;
  roadblocks.push({ x: pos.x, z: pos.z, mesh: rbMesh.mesh });
}

export function stageCover(cameraPos, cameraDir) {
  // Clear existing units/roadblocks
  units.forEach(u => { if (sceneRef && u.mesh) sceneRef.remove(u.mesh); });
  units = [];
  roadblocks.forEach(r => { if (sceneRef && r.mesh) sceneRef.remove(r.mesh); });
  roadblocks = [];

  const fwdX = cameraDir.x;
  const fwdZ = cameraDir.z;
  const rightX = -fwdZ;
  const rightZ = fwdX;

  // Front pair ahead of camera at 10m with ±8.5m lateral
  const aheadX = cameraPos.x + fwdX * 10;
  const aheadZ = cameraPos.z + fwdZ * 10;

  const u1 = spawnVehicle('fenix', aheadX + rightX * 8.5, aheadZ + rightZ * 8.5, Math.atan2(fwdX, fwdZ), sceneRef);
  const u2 = spawnVehicle('fenix', aheadX - rightX * 8.5, aheadZ - rightZ * 8.5, Math.atan2(fwdX, fwdZ), sceneRef);
  const u3 = spawnVehicle('fenix', aheadX + rightX * 2.0, aheadZ + rightZ * 2.0, Math.atan2(fwdX, fwdZ), sceneRef);

  u1.name = DISPATCH_NAMES[0];
  u2.name = DISPATCH_NAMES[1];
  u3.name = DISPATCH_NAMES[2];
  u1.tactic = 'PURSUIT';
  u2.tactic = 'PURSUIT';
  u3.tactic = 'PURSUIT';
  units.push(u1, u2, u3);

  const targetCount = heatLevel === 1 ? 2 : (heatLevel === 2 ? 4 : (heatLevel === 3 ? 6 : (heatLevel === 4 ? 8 : 10)));
  while (units.length < targetCount) {
    const idx = units.length;
    const spawnAngle = (idx / targetCount) * Math.PI * 2;
    const spawnDist = 45 + (idx * 6);
    const sx = cameraPos.x + Math.sin(spawnAngle) * spawnDist;
    const sz = cameraPos.z + Math.cos(spawnAngle) * spawnDist;
    const type = (heatLevel === 5 && idx >= 8) ? 'perro' : 'fenix';
    const vehicle = spawnVehicle(type, sx, sz, 0, sceneRef);
    vehicle.name = DISPATCH_NAMES[idx % DISPATCH_NAMES.length];
    vehicle.tactic = heatLevel >= 4 ? 'SPOTLIGHT' : 'PURSUIT';
    units.push(vehicle);
  }
}

export function coverAudit() {
  return units.map(u => ({ name: u.name, tactic: u.tactic, x: u.x, z: u.z }));
}

export function updatePolice(dt, playerPos, playerSpeed, isDriving) {
  if (!sceneRef) return;

  // Unit count by heat level: H1:2, H2:4, H3:6, H4:8, H5:10 (8 Fenix + 2 Perro)
  const targetCount = heatLevel === 1 ? 2 : (heatLevel === 2 ? 4 : (heatLevel === 3 ? 6 : (heatLevel === 4 ? 8 : 10)));

  while (units.length < targetCount) {
    const idx = units.length;
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDist = 60 + Math.random() * 40;
    const sx = playerPos.x + Math.sin(spawnAngle) * spawnDist;
    const sz = playerPos.z + Math.cos(spawnAngle) * spawnDist;
    const type = (heatLevel === 5 && idx >= 8) ? 'perro' : 'fenix';

    const vehicle = spawnVehicle(type, sx, sz, 0, sceneRef);
    vehicle.name = DISPATCH_NAMES[idx % DISPATCH_NAMES.length];
    vehicle.tactic = heatLevel >= 4 ? 'SPOTLIGHT' : (heatLevel >= 3 ? 'RAMMING' : (heatLevel >= 2 ? 'BOX-IN' : 'PURSUIT'));
    units.push(vehicle);
  }

  while (units.length > targetCount) {
    const u = units.pop();
    if (u && u.mesh && sceneRef) sceneRef.remove(u.mesh);
  }

  // Update units
  for (const u of units) {
    const dx = playerPos.x - u.x;
    const dz = playerPos.z - u.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    u.distanceToPlayer = dist;

    // Tactic steering
    const targetAngle = Math.atan2(dx, dz);
    u.angle = targetAngle;
    u.speed = Math.min(u.spec.topSpeed / 3.6, u.speed + 5 * dt);

    let throttle = 1;
    let steer = 0;
    if (dist < 15 && u.tactic === 'RAMMING') {
      throttle = 1.2;
    } else if (dist < 25) {
      throttle = 0.8;
    }

    updateVehicle(u, dt, { throttle, steer, handbrake: false });
  }

  // Roadblocks at Heat 3+ every 45s
  if (heatLevel >= 3) {
    roadblockTimer += dt;
    if (roadblockTimer >= 45) {
      roadblockTimer = 0;
      const aheadX = playerPos.x + Math.sin(0) * 80;
      const aheadZ = playerPos.z + Math.cos(0) * 80;
      forceRoadblock({ x: aheadX, z: aheadZ }, 0);
    }
  }

  // Halcón heli at Heat 4+
  if (heatLevel >= 4 && !heli) {
    const hMesh = createVehicleMesh('halcon');
    hMesh.position.set(playerPos.x, groundHeight(playerPos.x, playerPos.z) + 40, playerPos.z);
    sceneRef.add(hMesh);
    heli = { mesh: hMesh, x: playerPos.x, z: playerPos.z, y: 40 };
  } else if (heatLevel < 4 && heli) {
    if (sceneRef && heli.mesh) sceneRef.remove(heli.mesh);
    heli = null;
  }

  if (heli) {
    heli.x += (playerPos.x - heli.x) * dt * 2;
    heli.z += (playerPos.z - heli.z) * dt * 2;
    heli.y = groundHeight(heli.x, heli.z) + 40;
    heli.mesh.position.set(heli.x, heli.y, heli.z);
    // Spotlight active -> no heat decay while lit
  } else {
    // Heat decay if out of sight / searching
    if (heatPoints > pointsFloor) {
      heatPoints = Math.max(pointsFloor, heatPoints - 3 * dt);
      evaluateHeatLevel();
    }
  }

  // Busted check: cop within 3m on foot for 2s, or car disabled + 2 units within 8m for 3s
  let nearCopCount = 0;
  for (const u of units) {
    if (u.distanceToPlayer <= 3.0 && !isDriving) {
      nearCopCount++;
    }
  }

  if (!isDriving && nearCopCount > 0) {
    bustedTimer += dt;
    if (bustedTimer >= 2.0) {
      bustedTimer = 0;
      return 'BUSTED';
    }
  } else {
    bustedTimer = Math.max(0, bustedTimer - dt);
  }

  return null;
}
