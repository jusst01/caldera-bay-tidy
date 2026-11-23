import { Vector3 } from './three.module.min.js';

let trafficCars = [];
let seed = 42;

const rng = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const roster = [
  { id: 'colibri', speed: 130, mass: 1000 }, { id: 'sirena', speed: 150, mass: 1200 },
  { id: 'caiman', speed: 120, mass: 1900 }, { id: 'mula', speed: 140, mass: 1600 },
  { id: 'boxer', speed: 95, mass: 3200 }, { id: 'fantasma', speed: 180, mass: 1600 },
  { id: 'corsario', speed: 190, mass: 1500 }, { id: 'zorro', speed: 220, mass: 1300 },
  { id: 'relampago', speed: 260, mass: 1200 }, { id: 'fenix', speed: 200, mass: 1500 },
  { id: 'perro', speed: 150, mass: 2600 }, { id: 'halcon', speed: 0, mass: 0 }
];

function initTraffic() {
  trafficCars = [];
  for (let i = 0; i < 24; i++) {
    spawnTraffic();
  }
}

function spawnTraffic() {
  const type = roster[Math.floor(rng() * roster.length)];
  const angle = Math.floor(rng() * 4) * (Math.PI / 2);
  const car = {
    id: 'civ_' + Math.floor(rng() * 1000000),
    topSpeed: type.speed,
    mass: type.mass,
    x: (rng() - 0.5) * 1000,
    z: (rng() - 0.5) * 1000,
    angle: angle,
    lastAngle: angle,
    speed: 10 + rng() * 20,
    lane: 3.4,
    active: true,
    damage: 0
  };
  trafficCars.push(car);
  return car;
}

function getCarAhead(car) {
  let closest = null;
  let minDistance = 60;
  trafficCars.forEach(other => {
    if (car === other || !other.active) return;
    const dx = other.x - car.x;
    const dz = other.z - car.z;
    const dist = Math.hypot(dx, dz);
    const dot = dx * Math.cos(car.angle) + dz * Math.sin(car.angle);
    if (dot > 0 && dist < minDistance) {
      minDistance = dist;
      closest = other;
    }
  });
  return closest;
}

function handleIntersection(car) {
    if (rng() < 0.008) {
        let nextAngle = car.angle;
        if (rng() < 0.6) {
        } else {
            const turn = rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
            const potentialAngle = car.angle + turn;
            if (Math.abs(potentialAngle - (car.lastAngle + Math.PI)) > 0.1) {
               car.lastAngle = car.angle;
               car.angle = potentialAngle;
            }
        }
    }
}

function checkBounds(car) {
    if (Math.abs(car.x) > 600 || Math.abs(car.z) > 600) {
        car.angle += Math.PI;
    }
}

function calculateCollisionDamage(car) {
    trafficCars.forEach(other => {
        if (car === other || !other.active) return;
        const dist = Math.hypot(car.x - other.x, car.z - other.z);
        if (dist < 5) {
            car.damage += 1;
        }
    });
}

function getCarDetails(id) {
    return trafficCars.find(c => c.id === id) || null;
}

function logTrafficStatus() {
    return trafficCars.length;
}

function updateTraffic() {
  trafficCars.forEach(car => {
    if (!car.active) return;

    handleIntersection(car);
    calculateCollisionDamage(car);

    const carAhead = getCarAhead(car);
    let speedFactor = carAhead ? 0.2 : 1;

    const laneX = Math.cos(car.angle + Math.PI / 2) * car.lane;
    const laneZ = Math.sin(car.angle + Math.PI / 2) * car.lane;

    car.x += (Math.cos(car.angle) * car.speed * speedFactor * 0.05) + (laneX * 0.005);
    car.z += (Math.sin(car.angle) * car.speed * speedFactor * 0.05) + (laneZ * 0.005);

    checkBounds(car);
  });
}

function getTrafficCars() {
  return trafficCars;
}

function markStolen(id) {
  const idx = trafficCars.findIndex(c => c.id === id);
  if (idx !== -1) {
    trafficCars[idx].active = false;
    trafficCars.splice(idx, 1);
  }
}

export { initTraffic, spawnTraffic, updateTraffic, getTrafficCars, markStolen, getCarDetails, logTrafficStatus };
