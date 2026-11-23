import * as THREE from './three.module.min.js';
import { VEHICLE_ROSTER, spawnVehicle, updateVehicle } from './vehicles.js';

const laneNodes = [
    {x: -500, z: -500}, {x: 500, z: -500},
    {x: -500, z: 500}, {x: 500, z: 500}
];

let trafficCars = [];

export const initTraffic = (scene) => {
    trafficCars = [];
    for (let i = 0; i < 24; i++) {
        spawnTraffic(scene);
    }
};

export const spawnTraffic = (scene) => {
    const id = VEHICLE_ROSTER[Math.floor(Math.random() * 9)].id;
    const startNode = laneNodes[Math.floor(Math.random() * laneNodes.length)];
    const vehicle = spawnVehicle(id, startNode.x, startNode.z, Math.random() * Math.PI * 2, scene);
    vehicle.targetNode = laneNodes[Math.floor(Math.random() * laneNodes.length)];
    trafficCars.push(vehicle);
};

export const updateTraffic = (dt) => {
    for (let i = 0; i < trafficCars.length; i++) {
        const vehicle = trafficCars[i];

        // Simple steering towards target
        const dx = vehicle.targetNode.x - vehicle.x;
        const dz = vehicle.targetNode.z - vehicle.z;
        const targetHeading = Math.atan2(dx, dz);

        let steer = 0;
        if (vehicle.heading < targetHeading) steer = 1;
        if (vehicle.heading > targetHeading) steer = -1;

        const controls = {
            throttle: 0.5,
            brake: 0,
            steer: steer
        };

        // Slow for car ahead (basic collision avoidance)
        for (let j = 0; j < trafficCars.length; j++) {
            if (i === j) continue;
            const other = trafficCars[j];
            const dist = Math.sqrt((vehicle.x - other.x)**2 + (vehicle.z - other.z)**2);
            if (dist < 10) {
                controls.throttle = 0;
                controls.brake = 1;
            }
        }

        updateVehicle(vehicle, dt, controls);

        // Reached target
        if (Math.abs(vehicle.x - vehicle.targetNode.x) < 5 && Math.abs(vehicle.z - vehicle.targetNode.z) < 5) {
            vehicle.targetNode = laneNodes[Math.floor(Math.random() * laneNodes.length)];
        }
    }
};

export const getTrafficCars = () => trafficCars;

export const markStolen = (vehicle) => {
    trafficCars = trafficCars.filter(v => v !== vehicle);
};
