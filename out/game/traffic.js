import * as THREE from './three.module.min.js';
import { VEHICLE_ROSTER, spawnVehicle, updateVehicle } from './vehicles.js';

/**
 * Caldera Bay Traffic Module (v2 civilian traffic flow on intersection lane graph)
 * Implements deterministic seeded spawning of 24 civilian vehicles, intersection node routing,
 * lane offset navigation, collision avoidance, and permanent removal when stolen.
 */

let trafficCars = [];

const CIVILIAN_SPECS = [
  'colibri', 'sirena', 'caiman', 'mula',
  'boxer', 'fantasma', 'corsario', 'zorro'
];

/**
 * Initializes 24 civilian traffic cars on the intersection lane graph using seeded RNG.
 * Positions vehicles on right-hand lane offset (3.4m) across the 64m street grid.
 */
export function initTraffic(scene, rng) {
  trafficCars = [];
  const gridCoords = [];
  for (let c = -512; c <= 512; c += 64) {
    gridCoords.push(c);
  }

  for (let i = 0; i < 24; i++) {
    const specKey = CIVILIAN_SPECS[Math.floor(rng() * CIVILIAN_SPECS.length)];
    const gx = gridCoords[Math.floor(rng() * gridCoords.length)];
    const gz = gridCoords[Math.floor(rng() * gridCoords.length)];
    const offset = 3.4; // right-hand lane offset
    const axis = rng() > 0.5 ? 'x' : 'z';

    let posX = gx + (axis === 'x' ? 0 : (rng() > 0.5 ? offset : -offset));
    let posZ = gz + (axis === 'z' ? 0 : (rng() > 0.5 ? offset : -offset));
    let heading = axis === 'x' ? (rng() > 0.5 ? 0 : Math.PI) : (rng() > 0.5 ? Math.PI / 2 : -Math.PI / 2);

    const vehicle = spawnVehicle(specKey, posX, posZ, heading, scene);
    vehicle.trafficData = {
      targetX: posX + Math.sin(heading) * 64,
      targetZ: posZ + Math.cos(heading) * 64,
      speedLimit: 12 + rng() * 6
    };
    trafficCars.push(vehicle);
  }
}

/**
 * Updates traffic cars along lane graph: handles slow-for-car-ahead, node routing
 * (straight-preferred node choice, no U-turns), obstacle avoidance, and cleanup.
 */
export function updateTraffic(dt, playerCar = null) {
  for (let i = trafficCars.length - 1; i >= 0; i--) {
    const car = trafficCars[i];
    if (car.isStolen || car.isDead) {
      if (car.mesh && car.mesh.parent) {
        car.mesh.parent.remove(car.mesh);
      }
      trafficCars.splice(i, 1);
      continue;
    }

    const tData = car.trafficData;
    if (!tData) continue;

    // Check distance to destination node, pick next node (straight preferred, no U-turn)
    const distToTarget = Math.hypot(tData.targetX - car.x, tData.targetZ - car.z);
    if (distToTarget < 8) {
      const curHeading = car.heading;
      const options = [0, Math.PI / 2, -Math.PI / 2];
      const weights = [0.6, 0.2, 0.2]; // straight-preferred node choice
      let r = Math.random();
      let chosenTurn = 0;
      let cum = 0;
      for (let o = 0; o < options.length; o++) {
        cum += weights[o];
        if (r <= cum) {
          chosenTurn = options[o];
          break;
        }
      }
      const newHeading = curHeading + chosenTurn;
      tData.targetX = car.x + Math.sin(newHeading) * 64;
      tData.targetZ = car.z + Math.cos(newHeading) * 64;
      car.heading = newHeading;
    }

    // Slow for car ahead / obstacle avoidance
    let throttle = 0.6;
    const obstacles = [];
    if (playerCar && !playerCar.isDead) {
      obstacles.push({ x: playerCar.x, z: playerCar.z, radius: 2.0, mass: playerCar.mass });
    }
    for (const other of trafficCars) {
      if (other !== car) {
        const dx = other.x - car.x;
        const dz = other.z - car.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 12) {
          const fwdX = Math.sin(car.heading);
          const fwdZ = Math.cos(car.heading);
          const dot = dx * fwdX + dz * fwdZ;
          if (dot > 0 && dist < 8) {
            throttle = -0.5; // slow down for car ahead
          }
        }
        obstacles.push({ x: other.x, z: other.z, radius: 1.8, mass: other.mass });
      }
    }

    // Steer towards target node
    const angleToTarget = Math.atan2(tData.targetX - car.x, tData.targetZ - car.z);
    let angleDiff = angleToTarget - car.heading;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, angleDiff * 2.0));

    updateVehicle(car, dt, { throttle, steer, handbrake: false }, obstacles);
  }
}

/**
 * Returns the array of active civilian traffic cars.
 */
export function getTrafficCars() {
  return trafficCars;
}

/**
 * Marks a civilian car as stolen, removing it from the civilian traffic flow permanently.
 */
export function markStolen(car) {
  car.isStolen = true;
  const idx = trafficCars.indexOf(car);
  if (idx !== -1) {
    trafficCars.splice(idx, 1);
  }
}
