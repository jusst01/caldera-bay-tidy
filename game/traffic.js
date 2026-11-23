import * as THREE from './three.module.min.js';

let seed = 42;
function seededRandom() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
}

const LANES = [
    { id: 1, start: { x: -1000, z: -3.4 }, end: { x: 1000, z: -3.4 }, direction: 0 },
    { id: 2, start: { x: 1000, z: 3.4 }, end: { x: -1000, z: 3.4 }, direction: Math.PI },
    { id: 3, start: { x: -3.4, z: 1000 }, end: { x: -3.4, z: -1000 }, direction: Math.PI / 2 },
    { id: 4, start: { x: 3.4, z: -1000 }, end: { x: 3.4, z: 1000 }, direction: -Math.PI / 2 },
    { id: 5, start: { x: -1000, z: -100 }, end: { x: 1000, z: -100 }, direction: 0 },
    { id: 6, start: { x: 1000, z: 100 }, end: { x: -1000, z: 100 }, direction: Math.PI }
];

let trafficCars = [];

function createCar(lane) {
    return {
        id: 'civ_' + Math.floor(seededRandom() * 1000000),
        x: lane.start.x + (lane.end.x - lane.start.x) * seededRandom(),
        z: lane.start.z + (lane.end.z - lane.start.z) * seededRandom(),
        angle: lane.direction,
        speed: 15 + seededRandom() * 15,
        lane: lane,
        stolen: false,
        lastUpdate: 0
    };
}

export function initTraffic() {
    trafficCars = [];
    for (let i = 0; i < 24; i++) {
        spawnTraffic();
    }
}

export function spawnTraffic() {
    const lane = LANES[Math.floor(seededRandom() * LANES.length)];
    trafficCars.push(createCar(lane));
}

export function updateTraffic(dt) {
    for (let i = 0; i < trafficCars.length; i++) {
        const car = trafficCars[i];
        if (car.stolen) continue;

        let canMove = true;
        for (let j = 0; j < trafficCars.length; j++) {
            if (i === j) continue;
            const other = trafficCars[j];
            if (other.stolen) continue;

            const dx = car.x - other.x;
            const dz = car.z - other.z;
            const distSq = dx * dx + dz * dz;
            if (distSq < 225) { // 15 squared
                canMove = false;
                break;
            }
        }
        if (canMove) {
            car.x += Math.sin(car.angle) * car.speed * dt;
            car.z += Math.cos(car.angle) * car.speed * dt;
        }

        if (Math.abs(car.x) > 1200 || Math.abs(car.z) > 1200) {
            car.x = car.lane.start.x;
            car.z = car.lane.start.z;
        }
    }
}

export function getTrafficCars() {
    return trafficCars;
}

export function markStolen(id) {
    const index = trafficCars.findIndex(c => c.id === id);
    if (index !== -1) {
        trafficCars[index].stolen = true;
        trafficCars.splice(index, 1);
    }
}
