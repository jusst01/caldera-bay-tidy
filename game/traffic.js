import * as THREE from './three.module.min.js';
import { VEHICLE_ROSTER, spawnVehicle, updateVehicle } from './vehicles.js';

let trafficCars = [];

function groundHeight(x, z) {
  const dist = Math.sqrt(x * x + z * z);
  if (dist < 400) return 0;
  return (dist - 400) * 0.2;
}

const LANES = [
    { x: -100, z: -100, dx: 1, dz: 0, next: 1 },
    { x: 100, z: -100, dx: 0, dz: 1, next: 2 },
    { x: 100, z: 100, dx: -1, dz: 0, next: 3 },
    { x: -100, z: 100, dx: 0, dz: -1, next: 0 }
];

export function initTraffic(scene) {
  trafficCars = [];
}

export function spawnTraffic(scene, x, z, heading) {
  const carId = VEHICLE_ROSTER[Math.floor(Math.random() * 9)].id;
  const car = spawnVehicle(carId, x, z, heading, scene);
  car.lane = LANES[Math.floor(Math.random() * LANES.length)];
  trafficCars.push(car);
  return car;
}

export function updateTraffic(dt, scene) {
  for (let i = 0; i < trafficCars.length; i++) {
    const car = trafficCars[i];

    // Lane following
    const targetHeading = Math.atan2(car.lane.dx, car.lane.dz);
    const diff = targetHeading - car.heading;
    car.heading += diff * 0.2 * dt;

    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    car.y = groundHeight(car.x, car.z);

    // Collision avoidance
    let tooClose = false;
    for (let j = 0; j < trafficCars.length; j++) {
      if (i === j) continue;
      const other = trafficCars[j];
      const dx = other.x - car.x;
      const dz = other.z - car.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 15) {
        tooClose = true;
        break;
      }
    }

    if (tooClose) {
      car.speed *= 0.8;
      car.braking = true;
    } else {
      car.braking = false;
      if (car.speed < 15) car.speed += 1 * dt;
    }

    updateVehicle(car, dt);

    // Switch lanes
    const dX = car.x - car.lane.x;
    const dZ = car.z - car.lane.z;
    if (Math.abs(dX) < 5 && Math.abs(dZ) < 5) {
        car.lane = LANES[car.lane.next];
    }
  }
}

export function getTrafficCars() {
  return trafficCars;
}

export function markStolen(car) {
  const index = trafficCars.indexOf(car);
  if (index !== -1) {
    trafficCars.splice(index, 1);
  }
}

function getRNG(seed) {
  let s = seed;
  return function() {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function selectLane(car) {
    return LANES[Math.floor(Math.random() * LANES.length)];
}

function checkIntersection(car) {
    // Advanced intersection logic
    return false;
}

function calculateTurningRadius(car, target) {
    return 10;
}

function checkTrafficLights(car) {
    return true;
}

function adjustSpeedForTurn(car) {
    if(car.speed > 5) car.speed = 5;
}
