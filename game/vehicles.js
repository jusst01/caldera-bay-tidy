import * as THREE from './three.module.min.js';

export const VEHICLE_ROSTER = [
  { id: 'colibri', name: 'Colibrí', class: 'compact', topSpeed: 130, time0to100: 9.5, grip: 0.72, mass: 900, chop: 50, colour: '#444' },
  { id: 'sirena', name: 'Sirena', class: 'taxi', topSpeed: 150, time0to100: 8.0, grip: 0.75, mass: 1200, chop: 80, colour: '#ff0' },
  { id: 'caiman', name: 'Caimán', class: 'van', topSpeed: 120, time0to100: 10.5, grip: 0.65, mass: 1900, chop: 100, colour: '#999' },
  { id: 'mula', name: 'Mula', class: 'pickup', topSpeed: 140, time0to100: 8.8, grip: 0.80, mass: 1600, chop: 120, colour: '#630' },
  { id: 'boxer', name: 'Bóxer', class: 'truck', topSpeed: 95, time0to100: 13.0, grip: 0.55, mass: 3200, chop: 90, colour: '#f60' },
  { id: 'fantasma', name: 'Fantasma', class: 'luxury', topSpeed: 180, time0to100: 6.0, grip: 0.78, mass: 1600, chop: 300, colour: '#fff' },
  { id: 'corsario', name: 'Corsario S', class: 'muscle', topSpeed: 190, time0to100: 5.2, grip: 0.70, mass: 1500, chop: 220, colour: '#f00' },
  { id: 'zorro', name: 'Zorro GT', class: 'sports', topSpeed: 220, time0to100: 4.1, grip: 0.85, mass: 1300, chop: 320, colour: '#00f' },
  { id: 'relampago', name: 'Relámpago', class: 'super', topSpeed: 260, time0to100: 3.2, grip: 0.90, mass: 1200, chop: 400, colour: '#0f0' },
  { id: 'fenix', name: 'Fénix', class: 'police', topSpeed: 200, time0to100: 4.8, grip: 0.82, mass: 1500, chop: 0, colour: '#000' },
  { id: 'perro', name: 'Perro', class: 'swat', topSpeed: 150, time0to100: 7.0, grip: 0.75, mass: 2600, chop: 0, colour: '#333' },
  { id: 'halcon', name: 'Halcón', class: 'heli', topSpeed: 0, time0to100: 0, grip: 0, mass: 0, chop: 0, colour: '#000' }
];

export function createVehicleMesh(id) {
  const group = new THREE.Group();
  const v = VEHICLE_ROSTER.find(r => r.id === id);
  if (!v) return group;
  const geometry = new THREE.BoxGeometry(2, 1, 4);
  const material = new THREE.MeshPhongMaterial({ color: v.colour });
  const body = new THREE.Mesh(geometry, material);
  group.add(body);
  if (id === 'fenix' || id === 'perro') {
    const lightBar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 0.2), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    lightBar.position.set(0, 0.6, 0);
    group.add(lightBar);
  }
  if (id === 'halcon') {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2, 8), new THREE.MeshBasicMaterial({ color: 0xffffcc, transparent: true, opacity: 0.5 }));
    cone.position.set(0, -1, 0);
    group.add(cone);
  }
  return group;
}

export function spawnVehicle(id, x, z, heading, scene) {
  const v = VEHICLE_ROSTER.find(r => r.id === id);
  const car = { id, x, z, y: 0, angle: heading, speed: 0, name: v.name, durability: 100, engine: true };
  return car;
}

export function updateVehicle(vehicle, dt) {
  if (!vehicle.engine) return;
  const v = VEHICLE_ROSTER.find(r => r.id === vehicle.id);
  const drag = 0.1;
  vehicle.speed -= vehicle.speed * drag * dt;
  vehicle.x += Math.sin(vehicle.angle) * vehicle.speed * dt;
  vehicle.z += Math.cos(vehicle.angle) * vehicle.speed * dt;
}

export function damageVehicle(vehicle, amount) {
  vehicle.durability -= amount;
  if (vehicle.durability <= 0) {
    vehicle.durability = 0;
    vehicle.engine = false;
  }
}

export function markStolen(vehicle) {
  vehicle.stolen = true;
}
