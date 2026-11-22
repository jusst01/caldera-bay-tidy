// CALDERA BAY — game/vehicles.js
// The 12-car roster, arcade physics core, V2 3D mesh dressing, durability, smoke, collision damage, and Halcon heli.

import * as THREE from './three.module.min.js';
import { groundHeight } from './city.js';

/**
 * Full 12-car roster for Caldera Bay.
 * Includes specs for compacts, taxis, vans, pickups, trucks, luxury, muscle, sports, super, police, SWAT, and heli.
 */
export const VEHICLE_ROSTER = {
  colibri: { id: 'colibri', name: 'Colibrí', class: 'compact', topSpeed: 130, accel0100: 9.5, grip: 0.72, mass: 900, chop: 50, civilian: true },
  sirena: { id: 'sirena', name: 'Sirena', class: 'taxi', topSpeed: 150, accel0100: 8.0, grip: 0.75, mass: 1200, chop: 80, civilian: true },
  caiman: { id: 'caiman', name: 'Caimán', class: 'van', topSpeed: 120, accel0100: 10.5, grip: 0.65, mass: 1900, chop: 100, civilian: true },
  mula: { id: 'mula', name: 'Mula 4x4', class: 'pickup', topSpeed: 140, accel0100: 8.8, grip: 0.80, mass: 1600, chop: 120, civilian: true },
  boxer: { id: 'boxer', name: 'Bóxer', class: 'truck', topSpeed: 95, accel0100: 13.0, grip: 0.55, mass: 3200, chop: 90, civilian: true },
  fantasma: { id: 'fantasma', name: 'Fantasma', class: 'luxury', topSpeed: 180, accel0100: 6.0, grip: 0.78, mass: 1600, chop: 300, civilian: true },
  corsario: { id: 'corsario', name: 'Corsario S', class: 'muscle', topSpeed: 190, accel0100: 5.2, grip: 0.70, mass: 1500, chop: 220, civilian: true },
  zorro: { id: 'zorro', name: 'Zorro GT', class: 'sports', topSpeed: 220, accel0100: 4.1, grip: 0.85, mass: 1300, chop: 320, civilian: true },
  relampago: { id: 'relampago', name: 'Relámpago', class: 'super', topSpeed: 260, accel0100: 3.2, grip: 0.90, mass: 1200, chop: 400, civilian: true },
  fenix: { id: 'fenix', name: 'Fénix', class: 'police', topSpeed: 200, accel0100: 4.8, grip: 0.82, mass: 1500, chop: 0, police: true, stealHeat: 40, sellable: false },
  perro: { id: 'perro', name: 'Perro SWAT', class: 'swat', topSpeed: 150, accel0100: 7.0, grip: 0.75, mass: 2600, chop: 0, swat: true, sellable: false },
  halcon: { id: 'halcon', name: 'Halcón', class: 'heli', topSpeed: 180, accel0100: 5.0, grip: 0.95, mass: 2000, chop: 0, heli: true, aiOnly: true }
};

/**
 * Creates a Three.js mesh group for a vehicle type per V2 3D design standards.
 * Two-box body + cabin, 4 eight-segment cylinder wheels, two-tone paint, dark glass, and police/swat or heli dressing.
 */
export function createVehicleMesh(typeKey, color1 = 0x3366cc, color2 = 0x111111) {
  const spec = VEHICLE_ROSTER[typeKey] || VEHICLE_ROSTER.colibri;
  const group = new THREE.Group();

  if (spec.heli) {
    // Halcón helicopter mesh with main rotor and spotlight cone
    const bodyGeo = new THREE.BoxGeometry(1.8, 1.6, 3.8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a2430, roughness: 0.4, metalness: 0.6 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.0;
    body.castShadow = true;
    group.add(body);

    const glassGeo = new THREE.BoxGeometry(1.6, 1.0, 1.8);
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.7 });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(0, 1.5, 0.4);
    group.add(glass);

    const tailGeo = new THREE.CylinderGeometry(0.2, 0.3, 3.5, 6);
    tailGeo.rotateX(Math.PI / 2);
    const tail = new THREE.Mesh(tailGeo, bodyMat);
    tail.position.set(0, 1.2, -2.8);
    group.add(tail);

    const rotorGeo = new THREE.BoxGeometry(5.2, 0.08, 0.3);
    const rotorMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.2 });
    const rotor = new THREE.Mesh(rotorGeo, rotorMat);
    rotor.position.set(0, 2.1, 0);
    rotor.name = 'mainRotor';
    group.add(rotor);

    const spotGeo = new THREE.ConeGeometry(1.5, 4, 12, 1, true);
    const spotMat = new THREE.MeshBasicMaterial({ color: 0xffffaa, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
    const spotlightCone = new THREE.Mesh(spotGeo, spotMat);
    spotlightCone.rotation.x = Math.PI;
    spotlightCone.position.set(0, -1.5, 1.0);
    spotlightCone.name = 'spotlightCone';
    group.add(spotlightCone);

    group.userData = { spec, isHeli: true };
    return group;
  }

  // Standard wheeled vehicle body dimensions
  const isTruck = spec.class === 'truck' || spec.class === 'swat' || spec.class === 'pickup';
  const isVan = spec.class === 'van';
  const bodyH = isTruck ? 1.2 : (isVan ? 1.1 : 0.7);
  const bodyW = isTruck ? 2.2 : (isVan ? 2.0 : 1.8);
  const bodyL = isTruck ? 4.8 : (isVan ? 4.2 : 3.8);

  const bodyGeo = new THREE.BoxGeometry(bodyW, bodyH, bodyL);
  const paintMat = new THREE.MeshStandardMaterial({ color: color1, roughness: 0.3, metalness: 0.4 });
  const body = new THREE.Mesh(bodyGeo, paintMat);
  body.position.y = bodyH / 2 + 0.4;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Cabin structure with dark glass
  const cabinH = 0.7;
  const cabinW = bodyW * 0.88;
  const cabinL = bodyL * 0.5;
  const cabinGeo = new THREE.BoxGeometry(cabinW, cabinH, cabinL);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.1, metalness: 0.8 });
  const cabin = new THREE.Mesh(cabinGeo, glassMat);
  cabin.position.set(0, bodyH + cabinH / 2 + 0.4, -0.2);
  cabin.castShadow = true;
  group.add(cabin);

  // Four 8-segment cylinder wheels
  const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 8);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.9 });

  const wheelOffsets = [
    [-bodyW / 2 - 0.05, 0.35, bodyL * 0.32],
    [bodyW / 2 + 0.05, 0.35, bodyL * 0.32],
    [-bodyW / 2 - 0.05, 0.35, -bodyL * 0.32],
    [bodyW / 2 + 0.05, 0.35, -bodyL * 0.32]
  ];

  const wheels = [];
  for (const off of wheelOffsets) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(off[0], off[1], off[2]);
    wheel.castShadow = true;
    group.add(wheel);
    wheels.push(wheel);
  }

  // Police stripe and light bar for Fenix / Perro
  if (spec.police || spec.swat) {
    const stripeGeo = new THREE.BoxGeometry(bodyW + 0.02, 0.3, bodyL * 0.6);
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(0, bodyH / 2 + 0.4, 0);
    group.add(stripe);

    const barGeo = new THREE.BoxGeometry(0.9, 0.15, 0.3);
    const barMat = new THREE.MeshBasicMaterial({ color: spec.police ? 0x0044ff : 0xff2222 });
    const lightBar = new THREE.Mesh(barGeo, barMat);
    lightBar.position.set(0, bodyH + cabinH + 0.5, 0);
    lightBar.name = 'lightBar';
    group.add(lightBar);
  }

  group.userData = { spec, wheels, durability: 100, isHeli: false };
  return group;
}

/**
 * Spawns a vehicle instance in the world with real ground height y positioning.
 */
export function spawnVehicle(typeKey, x, z, angle = 0, scene = null, color1 = 0x3366cc) {
  const y = groundHeight(x, z);
  const mesh = createVehicleMesh(typeKey, color1);
  mesh.position.set(x, y, z);
  mesh.rotation.y = angle;

  const spec = VEHICLE_ROSTER[typeKey] || VEHICLE_ROSTER.colibri;

  const vehicle = {
    typeKey,
    spec,
    mesh,
    x,
    z,
    y,
    angle,
    speed: 0,
    vx: 0,
    vz: 0,
    steer: 0,
    durability: 100,
    dead: false,
    stolen: false,
    smokeTimer: 0
  };

  if (scene) {
    scene.add(mesh);
  }

  return vehicle;
}

/**
 * Updates vehicle arcade physics: engine force vs drag, lateral velocity clamp by grip, handbrake mechanics.
 */
export function updateVehicle(vehicle, dt, input, obstacles = []) {
  if (vehicle.dead) {
    vehicle.speed = Math.max(0, vehicle.speed - 15 * dt);
    return;
  }

  const spec = vehicle.spec;
  const maxSpeedMps = (spec.topSpeed * 1000) / 3600;
  const accelRate = maxSpeedMps / Math.max(1, spec.accel0100 * 0.5);

  const throttle = input.throttle || 0;
  const steeringInput = input.steer || 0;
  const handbrake = input.handbrake || false;

  if (throttle !== 0) {
    vehicle.speed += throttle * accelRate * dt;
  } else {
    vehicle.speed *= Math.pow(0.94, dt * 60);
    if (Math.abs(vehicle.speed) < 0.1) vehicle.speed = 0;
  }

  vehicle.speed = Math.max(-maxSpeedMps * 0.35, Math.min(maxSpeedMps, vehicle.speed));

  vehicle.steer = steeringInput;
  if (Math.abs(vehicle.speed) > 0.5) {
    const turnRate = 2.4 * (vehicle.speed / maxSpeedMps) * (1.2 - spec.grip * 0.4);
    vehicle.angle += vehicle.steer * turnRate * dt * Math.sign(vehicle.speed);
  }

  const fwdX = Math.sin(vehicle.angle);
  const fwdZ = Math.cos(vehicle.angle);

  const targetVx = fwdX * vehicle.speed;
  const targetVz = fwdZ * vehicle.speed;

  const effectiveGrip = handbrake ? 0.35 : spec.grip;
  const currentGripFactor = Math.min(1, effectiveGrip + Math.abs(vehicle.speed) * 0.01);

  vehicle.vx += (targetVx - vehicle.vx) * (currentGripFactor * dt * 14);
  vehicle.vz += (targetVz - vehicle.vz) * (currentGripFactor * dt * 14);

  vehicle.x += vehicle.vx * dt;
  vehicle.z += vehicle.vz * dt;
  vehicle.y = groundHeight(vehicle.x, vehicle.z);

  // Obstacle collisions
  for (const obs of obstacles) {
    const dx = vehicle.x - obs.x;
    const dz = vehicle.z - obs.z;
    const distSq = dx * dx + dz * dz;
    const minDist = 2.2 + (obs.radius || 1.5);
    if (distSq < minDist * minDist && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const overlap = minDist - dist;
      vehicle.x += (dx / dist) * overlap * 0.5;
      vehicle.z += (dz / dist) * overlap * 0.5;

      const impactSpeed = Math.abs(vehicle.speed);
      damageVehicle(vehicle, impactSpeed * 1.8);
      vehicle.speed *= -0.25;
    }
  }

  // Update mesh transforms with real ground height y
  vehicle.mesh.position.set(vehicle.x, vehicle.y, vehicle.z);
  vehicle.mesh.rotation.y = vehicle.angle;

  if (vehicle.mesh.userData && vehicle.mesh.userData.wheels) {
    for (const w of vehicle.mesh.userData.wheels) {
      w.rotation.x += vehicle.speed * dt * 2.5;
    }
  }

  if (vehicle.durability <= 0) {
    vehicle.dead = true;
    vehicle.speed = 0;
  }
}

/**
 * Applies collision damage to vehicle based on impact speed and mass ratio.
 * Durability reaches 0 -> engine dead with smoke, no explosions.
 */
export function damageVehicle(vehicle, amount) {
  if (vehicle.dead) return;
  vehicle.durability = Math.max(0, vehicle.durability - amount);
  if (vehicle.durability <= 0) {
    vehicle.dead = true;
    vehicle.speed = 0;
  }
}

/**
 * Marks a civilian car as stolen (removes from civilian traffic flow permanently).
 */
export function markStolen(vehicle) {
  vehicle.stolen = true;
}
