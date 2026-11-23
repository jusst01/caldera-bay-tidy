import * as THREE from './three.module.min.js';

export const VEHICLE_ROSTER = [
  {id: 'colibri', name: 'Colibrí', topSpeed: 130, grip: 0.72, class: 'compact', chop: 50, colour: '#ff0000'},
  {id: 'sirena', name: 'Sirena', topSpeed: 150, grip: 0.75, class: 'taxi', chop: 80, colour: '#ffff00'},
  {id: 'caiman', name: 'Caimán', topSpeed: 120, grip: 0.65, class: 'van', chop: 100, colour: '#808080'},
  {id: 'mula', name: 'Mula', topSpeed: 140, grip: 0.80, class: 'pickup', chop: 120, colour: '#00ff00'},
  {id: 'boxer', name: 'Bóxer', topSpeed: 95, grip: 0.55, class: 'truck', chop: 90, colour: '#0000ff'},
  {id: 'fantasma', name: 'Fantasma', topSpeed: 180, grip: 0.78, class: 'luxury', chop: 300, colour: '#ffffff'},
  {id: 'corsario', name: 'Corsario S', topSpeed: 190, grip: 0.70, class: 'muscle', chop: 220, colour: '#ff00ff'},
  {id: 'zorro', name: 'Zorro GT', topSpeed: 220, grip: 0.85, class: 'sports', chop: 320, colour: '#ff8800'},
  {id: 'relampago', name: 'Relámpago', topSpeed: 260, grip: 0.90, class: 'super', chop: 400, colour: '#00ffff'},
  {id: 'fenix', name: 'Fénix', topSpeed: 200, grip: 0.82, class: 'police', chop: 0, colour: '#000000'},
  {id: 'perro', name: 'Perro', topSpeed: 150, grip: 0.75, class: 'SWAT', chop: 0, colour: '#000088'},
  {id: 'halcon', name: 'Halcón', topSpeed: 200, grip: 0.95, class: 'heli', chop: 0, colour: '#555555'}
];

function getGroundHeight(x, z) {
  return 0;
}

export function createVehicleMesh(id) {
  const group = new THREE.Group();
  const spec = VEHICLE_ROSTER.find(v => v.id === id);
  const isPolice = spec.class === 'police' || spec.class === 'SWAT';
  const bodyColor = isPolice ? '#ffffff' : spec.colour;
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.1, 4.2), new THREE.MeshPhongMaterial({ color: bodyColor }));
  body.position.y = 0.55;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 2.0), new THREE.MeshPhongMaterial({ color: isPolice ? '#000000' : '#222222' }));
  cabin.position.set(0, 1.4, 0);
  group.add(cabin);
  for (let i = 0; i < 4; i++) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 8), new THREE.MeshPhongMaterial({ color: '#111111' }));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(i % 2 === 0 ? -1 : 1, 0.3, i < 2 ? -1.5 : 1.5);
    group.add(wheel);
  }
  if (isPolice) {
    const lightBar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 0.5), new THREE.MeshBasicMaterial({ color: '#ff0000' }));
    lightBar.position.set(0, 1.9, 0);
    group.add(lightBar);
  } else if (spec.class === 'heli') {
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, 0.2), new THREE.MeshPhongMaterial({ color: '#555555' }));
    rotor.position.y = 2;
    group.add(rotor);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2, 16), new THREE.MeshBasicMaterial({ color: '#ffffaa', transparent: true, opacity: 0.5 }));
    cone.position.set(0, -1, 0);
    cone.rotation.x = Math.PI;
    group.add(cone);
  }
  return group;
}

export function spawnVehicle(id, x, z, heading, scene) {
  const spec = VEHICLE_ROSTER.find(v => v.id === id);
  const mesh = createVehicleMesh(id);
  const y = getGroundHeight(x, z);
  mesh.position.set(x, y, z);
  mesh.rotation.y = heading;
  scene.add(mesh);
  return {
    id, x, z, y, angle: heading, speed: 0,
    name: spec.name, durability: 100, mesh: mesh, dead: false,
    engineForce: 0, brake: 0, grip: spec.grip, mass: spec.id === 'mula' ? 1600 : 1200,
    velocity: new THREE.Vector3(0,0,0)
  };
}

export function updateVehicle(v, dt, controls = null, obstacles = []) {
  if (v.dead) return;

  if (controls) {
    v.engineForce = controls.throttle * 2000;
    v.brake = controls.handbrake ? 2 : (controls.throttle === 0 ? 0.5 : 0);
  }

  const forward = new THREE.Vector3(Math.sin(v.angle), 0, Math.cos(v.angle));
  const drag = v.speed * 0.1;
  const totalForce = (v.engineForce - (v.brake * v.speed * 5) - drag);
  v.speed += (totalForce / v.mass) * dt;
  const lateralVelocity = v.velocity.clone().projectOnPlane(forward);
  v.velocity.add(forward.multiplyScalar(v.speed * dt));
  v.velocity.sub(lateralVelocity.multiplyScalar(v.grip * dt));

  if (controls) {
    v.angle -= controls.steer * 0.05 * (v.speed / 100);
  }

  v.x += v.velocity.x;
  v.z += v.velocity.z;

  // Collision detection
  for (const obs of obstacles) {
    const dx = v.x - obs.x;
    const dz = v.z - obs.z;
    if (dx * dx + dz * dz < (1.5 + obs.radius) ** 2) {
      v.speed *= -0.5;
      v.velocity.multiplyScalar(-0.5);
    }
  }

  v.y = getGroundHeight(v.x, v.z);
  v.mesh.position.set(v.x, v.y, v.z);
  v.mesh.rotation.y = v.angle;
  if (v.durability <= 0) v.dead = true;
}

export function damageVehicle(v, other, impactSpeed) {
  const damage = impactSpeed * (other.mass / v.mass);
  v.durability -= damage;
  if (v.durability < 0) v.durability = 0;
}

export function markStolen(v) {
  v.stolen = true;
}
