import * as THREE from './three.module.min.js';
import { spawnVehicle, updateVehicle } from './vehicles.js';

let trafficCars = [];
let rng = Math.random;

const laneGraph = [
  {id: 0, x: 0, z: 0, next: [1, 2]},
  {id: 1, x: 100, z: 0, next: [0, 3]},
  {id: 2, x: 0, z: 100, next: [0, 4]},
  {id: 3, x: 100, z: 100, next: [1, 2]},
  {id: 4, x: 200, z: 200, next: [3]}
];

export function initTraffic(scene, _rng) {
  trafficCars = [];
  rng = _rng || Math.random;
  for (let i = 0; i < 24; i++) {
    const node = laneGraph[Math.floor(rng() * laneGraph.length)];
    const car = spawnVehicle('colibri', node.x + 3.4, node.z, rng() * Math.PI * 2, scene);
    car.node = node;
    car.lastNode = null;
    trafficCars.push(car);
  }
}

export function spawnTraffic() {
  return trafficCars;
}

export function updateTraffic(dt) {
  trafficCars.forEach(car => {
    car.engineForce = 1500;

    let slowDown = false;
    trafficCars.forEach(other => {
      if (car === other) return;
      const dist = Math.sqrt((car.x - other.x)**2 + (car.z - other.z)**2);
      if (dist < 20) slowDown = true;
    });

    if (slowDown) {
      car.engineForce = 0;
      car.brake = 1;
    } else {
      car.brake = 0;
    }

    updateVehicle(car, dt);

    if (Math.abs(car.x - (car.node.x + 3.4)) < 5 && Math.abs(car.z - car.node.z) < 5) {
      let nextOptions = car.node.next.filter(id => id !== (car.lastNode ? car.lastNode.id : -1));
      if (nextOptions.length === 0) nextOptions = car.node.next;
      const nextId = nextOptions[Math.floor(rng() * nextOptions.length)];
      car.lastNode = car.node;
      car.node = laneGraph.find(n => n.id === nextId);
      car.angle = Math.atan2((car.node.x + 3.4) - car.x, car.node.z - car.z);
    }
  });
}

export function getTrafficCars() {
  return trafficCars;
}

export function markStolen(car) {
  trafficCars = trafficCars.filter(c => c !== car);
}
