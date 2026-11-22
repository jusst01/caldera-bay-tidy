// CALDERA BAY — game/traffic.js
// 24 civilian cars flowing on the intersection lane graph, right-hand lane offset 3.4m, straight-preferred, slow-for-car-ahead.

import * as THREE from './three.module.min.js';
import { groundHeight } from './city.js';
import { VEHICLE_ROSTER, spawnVehicle, updateVehicle } from './vehicles.js';

const CIVILIAN_TYPES = ['colibri', 'sirena', 'caiman', 'mula', 'boxer', 'fantasma', 'corsario', 'zorro', 'relampago'];

let trafficCars = [];
let sceneRef = null;
let rngRef = null;

// Intersection grid nodes (128m spacing from -384 to 384)
const GRID_NODES = [];
for (let x = -384; x <= 384; x += 128) {
  for (let z = -384; z <= 384; z += 128) {
    GRID_NODES.push({ x, z });
  }
}

function getConnectedNodes(node) {
  const neighbors = [];
  for (const n of GRID_NODES) {
    const dx = n.x - node.x;
    const dz = n.z - node.z;
    if ((Math.abs(dx) === 128 && dz === 0) || (dx === 0 && Math.abs(dz) === 128)) {
      neighbors.push(n);
    }
  }
  return neighbors;
}

/**
 * Initializes 24 civilian traffic cars on the intersection lane graph using seeded RNG.
 */
export function initTraffic(scene, rng) {
  sceneRef = scene;
  rngRef = rng;
  trafficCars = [];

  const civilianKeys = CIVILIAN_TYPES;

  for (let i = 0; i < 24; i++) {
    const typeKey = civilianKeys[Math.floor(rng() * civilianKeys.length)];
    const startNode = GRID_NODES[Math.floor(rng() * GRID_NODES.length)];
    const neighbors = getConnectedNodes(startNode);
    if (neighbors.length === 0) continue;
    const targetNode = neighbors[Math.floor(rng() * neighbors.length)];

    // Right-hand lane offset: 3.4m to the right of road vector
    const dx = targetNode.x - startNode.x;
    const dz = targetNode.z - startNode.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    const dirX = dx / len;
    const dirZ = dz / len;
    const rightX = dirZ;
    const rightZ = -dirX;

    const span = rng() * len;
    const posX = startNode.x + dirX * span + rightX * 3.4;
    const posZ = startNode.z + dirZ * span + rightZ * 3.4;

    const angle = Math.atan2(dirX, dirZ);
    const color = Math.floor(rng() * 0xffffff);

    const vehicle = spawnVehicle(typeKey, posX, posZ, angle, scene, color);
    vehicle.trafficData = {
      currentNode: startNode,
      targetNode: targetNode,
      progress: span,
      length: len,
      dirX,
      dirZ,
      rightX,
      rightZ,
      targetSpeed: 10 + rng() * 10
    };

    trafficCars.push(vehicle);
  }
}

/**
 * Updates traffic cars along lane graph: handles slow-for-car-ahead, node routing (straight-preferred, no U-turns), and cleanup.
 */
export function updateTraffic(dt, playerCar = null) {
  if (!rngRef) return;

  for (let i = trafficCars.length - 1; i >= 0; i--) {
    const car = trafficCars[i];
    if (car.stolen || car.dead) {
      if (sceneRef && car.mesh) {
        sceneRef.remove(car.mesh);
      }
      trafficCars.splice(i, 1);
      continue;
    }

    const tData = car.trafficData;
    if (!tData) continue;

    // Slow for car ahead or player
    let desiredSpeed = tData.targetSpeed;
    for (const other of trafficCars) {
      if (other === car) continue;
      const odx = other.x - car.x;
      const odz = other.z - car.z;
      const distSq = odx * odx + odz * odz;
      if (distSq < 160 && distSq > 0.01) {
        desiredSpeed = Math.min(desiredSpeed, other.speed * 0.8);
      }
    }

    if (playerCar) {
      const pdx = playerCar.x - car.x;
      const pdz = playerCar.z - car.z;
      const pDistSq = pdx * pdx + pdz * pdz;
      if (pDistSq < 120) {
        desiredSpeed = Math.min(desiredSpeed, 4);
      }
    }

    const throttle = car.speed < desiredSpeed ? 1 : -0.4;
    updateVehicle(car, dt, { throttle, steer: 0, handbrake: false });

    tData.progress += car.speed * dt;
    if (tData.progress >= tData.length) {
      const prevNode = tData.currentNode;
      const currNode = tData.targetNode;
      tData.currentNode = currNode;

      const neighbors = getConnectedNodes(currNode);
      const validNeighbors = neighbors.filter(n => n !== prevNode);
      const nextNode = validNeighbors.length > 0
        ? validNeighbors[Math.floor(rngRef() * validNeighbors.length)]
        : prevNode;

      tData.targetNode = nextNode;
      tData.progress = 0;

      const ndx = nextNode.x - currNode.x;
      const ndz = nextNode.z - currNode.z;
      const nLen = Math.sqrt(ndx * ndx + ndz * ndz);
      tData.length = nLen;
      tData.dirX = ndx / nLen;
      tData.dirZ = ndz / nLen;
      tData.rightX = tData.dirZ;
      tData.rightZ = -tData.dirX;
      car.angle = Math.atan2(tData.dirX, tData.dirZ);
    }
  }
}

export function getTrafficCars() {
  return trafficCars;
}

export function markStolen(car) {
  car.stolen = true;
}
