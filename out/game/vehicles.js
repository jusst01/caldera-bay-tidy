import * as THREE from './three.module.min.js';
import { groundHeight } from './city.js';

/**
 * Caldera Bay Vehicles Module (v2 roster, arcade physics, V2 3D mesh dressing)
 */

export const VEHICLE_ROSTER = {
  colibri: { name: 'Colibrí', class: 'compact', topSpeed: 130, accel: 9.5, grip: 0.72, mass: 900, chop: 50 },
  sirena: { name: 'Sirena', class: 'sedan', topSpeed: 150, accel: 8.0, grip: 0.75, mass: 1200, chop: 80 },
  caiman: { name: 'Caimán', class: 'van', topSpeed: 120, accel: 10.5, grip: 0.65, mass: 1900, chop: 100 },
  mula: { name: 'Mula', class: 'pickup', topSpeed: 140, accel: 8.8, grip: 0.80, mass: 1600, chop: 120 },
  boxer: { name: 'Bóxer', class: 'truck', topSpeed: 95, accel: 13.0, grip: 0.55, mass: 3200, chop: 90 },
  fantasma: { name: 'Fantasma', class: 'luxury', topSpeed: 180, accel: 6.0, grip: 0.78, mass: 1600, chop: 300 },
  corsario: { name: 'Corsario S', class: 'muscle', topSpeed: 190, accel: 5.2, grip: 0.70, mass: 1500, chop: 220 },
  zorro: { name: 'Zorro GT', class: 'sports', topSpeed: 220, accel: 4.1, grip: 0.85, mass: 1300, chop: 320 },
  relampago: { name: 'Relámpago', class: 'super', topSpeed: 260, accel: 3.2, grip: 0.90, mass: 1200, chop: 400 },
  fenix: { name: 'Fénix', class: 'police', topSpeed: 200, accel: 4.8, grip: 0.82, mass: 1500, chop: null, heatSteal: 40 },
  perro: { name: 'Perro', class: 'swat', topSpeed: 150, accel: 7.0, grip: 0.75, mass: 2600, chop: null, sellable: false },
  halcon: { name: 'Halcón', class: 'heli', topSpeed: 180, accel: 5.0, grip: 0.80, mass: 2000, chop: null, aiOnly: true }
};

export function createVehicleMesh(typeKey, color1 = 0x3366cc, color2 = 0x111111) {
  const group = new THREE.Group();
  const spec = VEHICLE_ROSTER[typeKey] || VEHICLE_ROSTER.colibri;

  if (typeKey === 'halcon') {
    const bodyGeo = new THREE.BoxGeometry(1.6, 1.4, 3.8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a202c, metalness: 0.8, roughness: 0.2 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.0;
    body.castShadow = true;
    group.add(body);

    const cabinGeo = new THREE.BoxGeometry(1.4, 1.2, 1.8);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.1, transparent: true, opacity: 0.8 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.8, 0.4);
    group.add(cabin);

    const rotorGeo = new THREE.BoxGeometry(5.0, 0.05, 0.3);
    const rotorMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const rotor = new THREE.Mesh(rotorGeo, rotorMat);
    rotor.position.set(0, 2.5, 0);
    group.add(rotor);

    const coneGeo = new THREE.ConeGeometry(4, 12, 16);
    const coneMat = new THREE.MeshBasicMaterial({ color: 0xffffaa, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.rotation.x = Math.PI / 2;
    cone.position.set(0, -5, 6);
    group.add(cone);

    group.userData.isHeli = true;
    return group;
  }

  const isPolice = typeKey === 'fenix';
  const isSwat = typeKey === 'perro';

  let primaryColor = color1;
  if (isPolice) primaryColor = 0x111122;
  if (isSwat) primaryColor = 0x222b22;

  const lowerGeo = new THREE.BoxGeometry(1.8, 0.6, 4.0);
  const lowerMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.3, metalness: 0.6 });
  const lower = new THREE.Mesh(lowerGeo, lowerMat);
  lower.position.y = 0.5;
  lower.castShadow = true;
  group.add(lower);

  const cabinGeo = new THREE.BoxGeometry(1.6, 0.6, 2.2);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.9 });
  const cabin = new THREE.Mesh(cabinGeo, glassMat);
  cabin.position.set(0, 1.1, -0.2);
  cabin.castShadow = true;
  group.add(cabin);

  if (isPolice || isSwat) {
    const stripeGeo = new THREE.BoxGeometry(1.82, 0.1, 4.02);
    const stripeMat = new THREE.MeshBasicMaterial({ color: isPolice ? 0xffffff : 0x444444 });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.y = 0.82;
    group.add(stripe);

    const barGeo = new THREE.BoxGeometry(0.8, 0.2, 0.4);
    const barMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const bar = new THREE.Mesh(barGeo, barMat);
    bar.position.set(0, 1.5, 0);
    group.add(bar);
  }

  const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 8);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });

  const wheelPositions = [
    [-0.9, 0.35, 1.3], [0.9, 0.35, 1.3],
    [-0.9, 0.35, -1.3], [0.9, 0.35, -1.3]
  ];
  const wheels = [];
  for (const wp of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(...wp);
    group.add(wheel);
    wheels.push(wheel);
  }
  group.userData.wheels = wheels;

  const smokeGeo = new THREE.BufferGeometry();
  const smokeMat = new THREE.PointsMaterial({ color: 0x888888, size: 0.5, transparent: true, opacity: 0 });
  const smoke = new THREE.Points(smokeGeo, smokeMat);
  smoke.position.set(0, 0.5, -2.0);
  group.add(smoke);
  group.userData.smoke = smoke;

  return group;
}

export function spawnVehicle(typeKey, x, z, angle = 0, scene = null, color1 = 0x3366cc) {
  const spec = VEHICLE_ROSTER[typeKey] || VEHICLE_ROSTER.colibri;
  const y = groundHeight(x, z);
  const mesh = createVehicleMesh(typeKey, color1);
  mesh.position.set(x, y, z);
  mesh.rotation.y = angle;

  if (scene) {
    scene.add(mesh);
  }

  const vehicle = {
    spec: typeKey,
    x, y, z,
    vx: 0, vz: 0,
    speed: 0,
    heading: angle,
    steerAngle: 0,
    durability: 100,
    isDead: false,
    mesh,
    mass: spec.mass,
    topSpeedKmh: spec.topSpeed,
    accel: spec.accel,
    grip: spec.grip
  };

  return vehicle;
}

export function updateVehicle(vehicle, dt, input, obstacles = []) {
  if (vehicle.isDead) {
    vehicle.speed = 0;
    vehicle.y = groundHeight(vehicle.x, vehicle.z);
    if (vehicle.mesh) {
      vehicle.mesh.position.set(vehicle.x, vehicle.y, vehicle.z);
    }
    return;
  }

  const spec = VEHICLE_ROSTER[vehicle.spec] || VEHICLE_ROSTER.colibri;
  const maxSpeed = (vehicle.topSpeedKmh || spec.topSpeed) / 3.6;
  const throttle = input.throttle || 0;
  const steerInput = input.steer || 0;
  const handbrake = input.handbrake || false;

  const enginePower = (10.0 / spec.accel) * 15;
  const accelForce = throttle * enginePower;
  const drag = 0.05 * vehicle.speed * Math.abs(vehicle.speed);
  const rollingResistance = vehicle.speed * 1.5;

  let netAccel = accelForce - drag - rollingResistance;
  vehicle.speed += netAccel * dt;
  vehicle.speed = Math.max(-maxSpeed * 0.3, Math.min(maxSpeed, vehicle.speed));

  if (Math.abs(throttle) < 0.01 && Math.abs(vehicle.speed) < 0.2) {
    vehicle.speed = 0;
  }

  const currentGrip = handbrake ? 0.35 : spec.grip;
  const turnRate = 2.2 * steerInput * (Math.min(1, Math.abs(vehicle.speed) / 5));
  vehicle.heading += turnRate * dt * (vehicle.speed >= 0 ? 1 : -1);

  const fwdX = Math.sin(vehicle.heading);
  const fwdZ = Math.cos(vehicle.heading);
  const rightX = Math.cos(vehicle.heading);
  const rightZ = -Math.sin(vehicle.heading);

  vehicle.vx = fwdX * vehicle.speed;
  vehicle.vz = fwdZ * vehicle.speed;

  const lateralVel = vehicle.vx * rightX + vehicle.vz * rightZ;
  const clampedLateral = lateralVel * (1 - currentGrip * 0.9);
  vehicle.vx -= clampedLateral * rightX;
  vehicle.vz -= clampedLateral * rightZ;

  vehicle.x += vehicle.vx * dt;
  vehicle.z += vehicle.vz * dt;

  for (const obs of obstacles) {
    const dx = vehicle.x - obs.x;
    const dz = vehicle.z - obs.z;
    const dist = Math.hypot(dx, dz);
    const minD = 1.8 + (obs.radius || 1.0);
    if (dist < minD && dist > 0.0001) {
      const overlap = minD - dist;
      vehicle.x += (dx / dist) * overlap;
      vehicle.z += (dz / dist) * overlap;

      const impactSpeed = Math.abs(vehicle.speed);
      const massRatio = spec.mass / (obs.mass || 1000);
      const damageAmt = impactSpeed * massRatio * 0.5;
      damageVehicle(vehicle, damageAmt);
      vehicle.speed *= 0.3;
    }
  }

  vehicle.y = groundHeight(vehicle.x, vehicle.z);

  if (vehicle.mesh) {
    vehicle.mesh.position.set(vehicle.x, vehicle.y, vehicle.z);
    vehicle.mesh.rotation.y = vehicle.heading;

    if (vehicle.mesh.userData.wheels) {
      for (let i = 0; i < vehicle.mesh.userData.wheels.length; i++) {
        const w = vehicle.mesh.userData.wheels[i];
        if (i < 2) {
          w.rotation.y = steerInput * 0.5;
        }
        w.rotation.x += vehicle.speed * dt * 2;
      }
    }

    if (vehicle.durability <= 0 && !vehicle.isDead) {
      vehicle.isDead = true;
      if (vehicle.mesh.userData.smoke) {
        vehicle.mesh.userData.smoke.material.opacity = 0.8;
      }
    }
  }
}

export function damageVehicle(vehicle, amount) {
  if (vehicle.isDead) return;
  vehicle.durability = Math.max(0, vehicle.durability - amount);
  if (vehicle.durability <= 0) {
    vehicle.isDead = true;
  }
}

export function markStolen(vehicle) {
  vehicle.isStolen = true;
}
