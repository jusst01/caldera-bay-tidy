import * as THREE from './three.module.min.js';

export const VEHICLE_ROSTER = [
  { id: 'colibri', name: 'Colibrí', topSpeed: 130, grip: 0.72, class: 'compact', chop: 50, colour: 0x222222 },
  { id: 'sirena', name: 'Sirena', topSpeed: 150, grip: 0.75, class: 'taxi', chop: 80, colour: 0xffff00 },
  { id: 'caiman', name: 'Caimán', topSpeed: 120, grip: 0.65, class: 'van', chop: 100, colour: 0x888888 },
  { id: 'mula', name: 'Mula', topSpeed: 140, grip: 0.80, class: 'pickup', chop: 120, colour: 0xaa5500 },
  { id: 'boxer', name: 'Bóxer', topSpeed: 95, grip: 0.55, class: 'truck', chop: 90, colour: 0x555555 },
  { id: 'fantasma', name: 'Fantasma', topSpeed: 180, grip: 0.78, class: 'luxury', chop: 300, colour: 0x000000 },
  { id: 'corsario', name: 'Corsario S', topSpeed: 190, grip: 0.70, class: 'muscle', chop: 220, colour: 0xcc0000 },
  { id: 'zorro', name: 'Zorro GT', topSpeed: 220, grip: 0.85, class: 'sports', chop: 320, colour: 0x0000cc },
  { id: 'relampago', name: 'Relámpago', topSpeed: 260, grip: 0.90, class: 'super', chop: 400, colour: 0xffffff },
  { id: 'fenix', name: 'Fénix', topSpeed: 200, grip: 0.82, class: 'police', chop: 0, colour: 0xffffff },
  { id: 'perro', name: 'Perro', topSpeed: 150, grip: 0.75, class: 'swat', chop: 0, colour: 0x000000 },
  { id: 'halcon', name: 'Halcón', topSpeed: 0, grip: 0, class: 'heli', chop: 0, colour: 0x222222 }
];

function createBody(w, h, d, color) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshPhongMaterial({ color }));
}

export function createVehicleMesh(id, scene) {
  const group = new THREE.Group();
  const roster = VEHICLE_ROSTER.find(r => r.id === id);

  if (id === 'halcon') {
    group.add(createBody(2, 1, 4, roster.colour));
    const light = new THREE.SpotLight(0xffffff, 1);
    light.position.set(0, -1, 0);
    group.add(light);
  } else {
    group.add(createBody(1.8, 0.6, 4, roster.colour));
    const cabin = createBody(1.6, 0.5, 2, 0x333333);
    cabin.position.y = 0.55;
    group.add(cabin);
    for (let i = 0; i < 4; i++) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 8), new THREE.MeshBasicMaterial({ color: 0x111111 }));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(i % 2 === 0 ? -1 : 1, -0.3, i < 2 ? -1.2 : 1.2);
      group.add(wheel);
    }
    if (id === 'fenix' || id === 'perro') {
      const lightBar = createBody(1, 0.2, 0.3, 0xff0000);
      lightBar.position.y = 0.8;
      group.add(lightBar);
    }
  }
  scene.add(group);
  return group;
}

export function spawnVehicle(id, x, z, heading, scene) {
  const roster = VEHICLE_ROSTER.find(r => r.id === id);
  const mesh = createVehicleMesh(id, scene);
  const v = {
    id,
    x, z,
    y: typeof groundHeight === 'function' ? groundHeight(x, z) : 0,
    angle: heading,
    speed: 0,
    durability: 100,
    mesh,
    name: roster.name,
    class: roster.class,
    throttle: 0,
    steering: 0
  };
  mesh.position.set(v.x, v.y, v.z);
  mesh.rotation.y = v.angle;
  return v;
}

export function updateVehicle(v, dt, input) {
  if (v.durability <= 0) return;
  const roster = VEHICLE_ROSTER.find(r => r.id === v.id);

  if (input) {
    v.throttle = input.throttle || 0;
    v.steering = input.steering || 0;
  }

  const grip = roster.grip;
  const engineForce = v.throttle * 500;
  const drag = v.speed * 0.1;
  const force = engineForce - drag;

  v.speed += (force / 1600) * dt;
  v.speed = Math.max(0, Math.min(v.speed, roster.topSpeed / 3.6));

  const lateralGrip = grip * 0.5;
  const steeringAngle = v.steering * 0.5;
  v.angle += steeringAngle * (v.speed / 10) * dt;

  v.x += Math.sin(v.angle) * v.speed * dt;
  v.z += Math.cos(v.angle) * v.speed * dt;
  v.y = typeof groundHeight === 'function' ? groundHeight(v.x, v.z) : v.y;

  v.mesh.position.set(v.x, v.y, v.z);
  v.mesh.rotation.y = v.angle;
}

export function damageVehicle(v, amount) {
  v.durability -= amount;
  if (v.durability <= 0) {
    v.durability = 0;
    v.speed = 0;
  }
}

export function markStolen(v) {
  if (v.mesh && v.mesh.parent) {
    v.mesh.parent.remove(v.mesh);
  }
  v.durability = -1;
}
