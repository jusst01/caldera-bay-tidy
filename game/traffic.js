import * as THREE from './three.module.min.js';
import { VEHICLE_ROSTER } from './vehicles.js';

let trafficCars = [];

export function initTraffic() {
  trafficCars = [];
}

export function spawnTraffic() {
  if (trafficCars.length >= 24) return;
  const civilianCars = VEHICLE_ROSTER.filter(v => v.class !== 'police' && v.class !== 'heli' && v.class !== 'swat');
  const type = civilianCars[Math.floor(Math.random() * civilianCars.length)];
  const car = {
    id: type.id,
    x: Math.random() * 100,
    z: Math.random() * 100,
    angle: Math.random() * Math.PI * 2,
    speed: 10 + Math.random() * 20
  };
  trafficCars.push(car);
}

export function updateTraffic(dt) {
  trafficCars.forEach(car => {
    car.x += Math.sin(car.angle) * car.speed * dt;
    car.z += Math.cos(car.angle) * car.speed * dt;
  });
}

export function getTrafficCars() {
  return trafficCars;
}

export function markStolen(car) {
  trafficCars = trafficCars.filter(c => c !== car);
}
