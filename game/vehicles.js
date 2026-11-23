import * as THREE from './three.module.min.js';

export const VEHICLE_ROSTER = [
  { id: 'colibri', name: 'Colibrí', class: 'compact', topSpeed: 130, accel: 9.5, grip: 0.72, mass: 900, chop: 50 },
  { id: 'sirena', name: 'Sirena', class: 'taxi', topSpeed: 150, accel: 8.0, grip: 0.75, mass: 1200, chop: 80 },
  { id: 'caiman', name: 'Caimán', class: 'van', topSpeed: 120, accel: 10.5, grip: 0.65, mass: 1900, chop: 100 },
  { id: 'mula', name: 'Mula', class: 'pickup', topSpeed: 140, accel: 8.8, grip: 0.80, mass: 1600, chop: 120 },
  { id: 'boxer', name: 'Bóxer', class: 'truck', topSpeed: 95, accel: 13.0, grip: 0.55, mass: 3200, chop: 90 },
  { id: 'fantasma', name: 'Fantasma', class: 'luxury', topSpeed: 180, accel: 6.0, grip: 0.78, mass: 1600, chop: 300 },
  { id: 'corsario', name: 'Corsario S', class: 'muscle', topSpeed: 190, accel: 5.2, grip: 0.70, mass: 1500, chop: 220 },
  { id: 'zorro', name: 'Zorro GT', class: 'sports', topSpeed: 220, accel: 4.1, grip: 0.85, mass: 1300, chop: 320 },
  { id: 'relampago', name: 'Relámpago', class: 'super', topSpeed: 260, accel: 3.2, grip: 0.90, mass: 1200, chop: 400 },
  { id: 'fenix', name: 'Fénix', class: 'police', topSpeed: 200, accel: 4.8, grip: 0.82, mass: 1500, chop: 0 },
  { id: 'perro', name: 'Perro', class: 'swat', topSpeed: 150, accel: 7.0, grip: 0.75, mass: 2600, chop: 0 },
  { id: 'halcon', name: 'Halcón', class: 'heli', topSpeed: 260, accel: 3.2, grip: 0.90, mass: 2000, chop: 0 }
];

function groundHeight(x, z) {
  const dist = Math.sqrt(x * x + z * z);
  if (dist < 400) return 0;
  return (dist - 400) * 0.2;
}

export function createVehicleMesh(id) {
  const group = new THREE.Group();

  const bodyGeo = new THREE.BoxGeometry(2, 0.8, 4);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.6;
  group.add(body);

  const cabinGeo = new THREE.BoxGeometry(1.8, 0.7, 2);
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
  const cabin = new THREE.Mesh(cabinGeo, cabinMat);
  cabin.position.set(0, 1.35, 0);
  group.add(cabin);

  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 8);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  for (let i = 0; i < 4; i++) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(i % 2 === 0 ? 1 : -1, 0.4, i < 2 ? 1.5 : -1.5);
    group.add(wheel);
  }

  const windowGeo = new THREE.BoxGeometry(1.8, 0.6, 0.1);
  const windowMat = new THREE.MeshStandardMaterial({ color: 0x222222, transparent: true, opacity: 0.7 });
  const windshield = new THREE.Mesh(windowGeo, windowMat);
  windshield.position.set(0, 1.35, 1);
  group.add(windshield);

  const bumperGeo = new THREE.BoxGeometry(2.1, 0.3, 0.3);
  const bumperMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const frontBumper = new THREE.Mesh(bumperGeo, bumperMat);
  frontBumper.position.set(0, 0.5, 2.1);
  group.add(frontBumper);

  const lightGeo = new THREE.BoxGeometry(0.5, 0.2, 0.1);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xFFFFCC });
  const leftHeadlight = new THREE.Mesh(lightGeo, lightMat);
  leftHeadlight.position.set(-0.6, 0.6, 2.15);
  group.add(leftHeadlight);
  const rightHeadlight = new THREE.Mesh(lightGeo, lightMat);
  rightHeadlight.position.set(0.6, 0.6, 2.15);
  group.add(rightHeadlight);

  if (id === 'fenix' || id === 'perro') {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.1, 4.1), new THREE.MeshStandardMaterial({ color: 0xFFFFFF }));
    stripe.position.y = 0.65;
    group.add(stripe);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.3), new THREE.MeshStandardMaterial({ color: 0xFF0000 }));
    bar.position.set(0, 1.8, 0);
    group.add(bar);
  }

  if (id === 'halcon') {
    const heliGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const heli = new THREE.Mesh(heliGeo, bodyMat);
    group.add(heli);
    const spotGeo = new THREE.ConeGeometry(0.6, 2.5, 12);
    const spot = new THREE.Mesh(spotGeo, new THREE.MeshBasicMaterial({ color: 0xFFFF00, transparent: true, opacity: 0.4 }));
    spot.position.set(0, -1.2, 0);
    group.add(spot);
  }

  return group;
}

export function spawnVehicle(id, x, z, heading, scene) {
  const specs = VEHICLE_ROSTER.find(v => v.id === id);
  const mesh = createVehicleMesh(id);
  const y = groundHeight(x, z);
  mesh.position.set(x, y, z);
  mesh.rotation.y = heading;
  scene.add(mesh);

  return { id, x, z, y, heading, speed: 0, durability: 100, mesh, specs, throttle: 0, braking: false };
}

export function updateVehicle(vehicle, dt) {
  applyPhysics(vehicle, dt);
  vehicle.mesh.position.set(vehicle.x, vehicle.y, vehicle.z);
  vehicle.mesh.rotation.y = vehicle.heading;
}

function applyPhysics(vehicle, dt) {
  const specs = vehicle.specs;
  if (vehicle.throttle > 0) {
    vehicle.speed += (specs.accel / 100) * vehicle.throttle * dt;
  }
  vehicle.speed -= vehicle.speed * 0.05 * dt;

  if (vehicle.braking) {
    vehicle.speed -= vehicle.speed * (0.35 + (1 - vehicle.specs.grip)) * dt;
  }

  vehicle.x += Math.sin(vehicle.heading) * vehicle.speed * dt;
  vehicle.z += Math.cos(vehicle.heading) * vehicle.speed * dt;
  vehicle.y = groundHeight(vehicle.x, vehicle.z);

  if (vehicle.speed > specs.topSpeed / 3.6) vehicle.speed = specs.topSpeed / 3.6;
  if (vehicle.speed < 0) vehicle.speed = 0;
}

export function damageVehicle(vehicle, amount) {
  vehicle.durability -= amount;
  if (vehicle.durability < 0) vehicle.durability = 0;
}

export function markStolen(vehicle) {
  vehicle.stolen = true;
}

function steerVehicle(vehicle, direction, dt) {
  vehicle.heading += direction * 0.05 * dt;
}

function setThrottle(vehicle, throttle) {
  vehicle.throttle = Math.max(0, Math.min(1, throttle));
}

function setBraking(vehicle, braking) {
  vehicle.braking = braking;
}

function calculateDamage(v1, v2) {
  const relSpeed = Math.abs(v1.speed - v2.speed);
  const massRatio = v1.specs.mass / v2.specs.mass;
  return relSpeed * massRatio;
}

function checkEngine(vehicle) {
  if (vehicle.durability <= 0) {
    vehicle.speed = 0;
    vehicle.throttle = 0;
    return false;
  }
  return true;
}

function getVehicleMesh(vehicle) {
  return vehicle.mesh;
}

function updateHeliRotation(vehicle, dt) {
  if(vehicle.id === 'halcon') {
    vehicle.mesh.rotation.z += 0.1 * dt;
  }
}
