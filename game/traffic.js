import * as THREE from './three.module.min.js';
import { spawnVehicle, updateVehicle } from './vehicles.js';

let trafficCars = [];
let seed = 987654321;

function seededRandom() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

const LANES = [
  { x: 3.4, dir: 0 },
  { x: -3.4, dir: Math.PI }
];

export function initTraffic() {
  trafficCars = [];
}

export function spawnTraffic(scene) {
  for (let i = 0; i < 24; i++) {
    const lane = LANES[i % LANES.length];
    const z = (seededRandom() - 0.5) * 2000;
    const x = lane.x;
    const heading = lane.dir;

    const car = spawnVehicle('colibri', x, z, heading, scene);
    car.speed = 10 + seededRandom() * 15;
    trafficCars.push(car);
  }
}

export function updateTraffic(dt, scene) {
  for (let i = 0; i < trafficCars.length; i++) {
    const car = trafficCars[i];

    // Lane logic: Stay on track
    const targetHeading = (car.x > 0 ? 0 : Math.PI);
    car.angle += (targetHeading - car.angle) * 0.05;

    // Slow for car ahead
    let speedMult = 1.0;
    for (let j = 0; j < trafficCars.length; j++) {
      if (i === j) continue;
      const other = trafficCars[j];
      const distZ = other.z - car.z;
      const distX = Math.abs(car.x - other.x);

      if (distZ > 0 && distZ < 20 && distX < 5) {
        speedMult = 0.2;
        break;
      }
    }

    // Update car
    updateVehicle(car, dt, { throttle: speedMult });
  }
}

export function getTrafficCars() {
  return trafficCars;
}

export function markStolen(car) {
  const index = trafficCars.indexOf(car);
  if (index !== -1) {
    if (car.mesh && car.mesh.parent) {
      car.mesh.parent.remove(car.mesh);
    }
    trafficCars.splice(index, 1);
  }
}
