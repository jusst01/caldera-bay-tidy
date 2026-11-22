import * as THREE from './three.module.min.js';
import { spawnVehicle, updateVehicle } from './vehicles.js';

let trafficCars = [];
let seed = 12345;

function seededRandom() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

export function initTraffic(scene) {
  trafficCars = [];
  for (let i = 0; i < 24; i++) {
    const x = (seededRandom() - 0.5) * 500;
    const z = (seededRandom() - 0.5) * 500;
    const car = spawnVehicle('colibri', x, z, seededRandom() * Math.PI * 2, scene);
    trafficCars.push(car);
  }
}

export function spawnTraffic() {
  return trafficCars;
}

export function updateTraffic(dt) {
  trafficCars.forEach(car => {
    car.speed = 20;

    let slowDown = false;
    trafficCars.forEach(other => {
      if (car === other) return;
      const dist = Math.sqrt((car.x - other.x)**2 + (car.z - other.z)**2);
      if (dist < 10) slowDown = true;
    });

    if (slowDown) car.speed *= 0.5;

    updateVehicle(car, dt);
  });
}

export function getTrafficCars() {
  return trafficCars;
}

export function markStolen(car) {
  trafficCars = trafficCars.filter(c => c !== car);
}
