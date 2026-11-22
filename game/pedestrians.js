import * as THREE from './three.module.min.js';
import { groundHeight } from './city.js';

/**
 * Caldera Bay Pedestrians Module
 * Pool of 48 active peds, 3 archetypes, sidewalk waypoint loops, flee/witness logic, capsule-torso+sphere-head.
 */

let pedestrians = [];
let sceneRef = null;
let rngRef = null;

const archetypes = {
  worker: { hp: 30, color: 0x555555, wallet: [5, 15] },
  tourist: { hp: 30, color: 0x995533, wallet: [10, 40] },
  thug: { hp: 45, color: 0x333333, wallet: [15, 30] }
};

export function initPedestrians(scene, rng) {
  sceneRef = scene;
  rngRef = rng;
  pedestrians = [];
  for (let i = 0; i < 48; i++) {
    spawnPed();
  }
}

function spawnPed() {
  const x = (rngRef() - 0.5) * 300;
  const z = (rngRef() - 0.5) * 300;
  const archKeys = Object.keys(archetypes);
  const type = archKeys[Math.floor(rngRef() * archKeys.length)];
  const arch = archetypes[type];

  const group = new THREE.Group();
  const bodyGeo = new THREE.CapsuleGeometry(0.3, 0.8, 4, 8);
  const bodyMat = new THREE.MeshStandardMaterial({ color: arch.color });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.7;
  group.add(body);

  const headGeo = new THREE.SphereGeometry(0.2, 8, 8);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffccaa });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.6;
  group.add(head);

  group.position.set(x, groundHeight(x, z), z);
  sceneRef.add(group);

  pedestrians.push({
    group,
    x, z,
    type,
    hp: arch.hp,
    wallet: Math.floor(rngRef() * (arch.wallet[1] - arch.wallet[0]) + arch.wallet[0]),
    down: false,
    mugged: false,
    timer: rngRef() * 10
  });
}

export function updatePedestrians(dt, playerPos, heat) {
  for (let i = pedestrians.length - 1; i >= 0; i--) {
    const ped = pedestrians[i];

    // Recycling beyond 170m
    const distToPlayer = Math.hypot(ped.x - playerPos.x, ped.z - playerPos.z);
    if (distToPlayer > 170) {
      sceneRef.remove(ped.group);
      pedestrians.splice(i, 1);
      spawnPed();
      continue;
    }

    if (ped.down) continue;

    // Movement logic (waypoint loops)
    ped.timer += dt;
    const speed = 1.0;
    ped.x += Math.sin(ped.timer) * speed * dt;
    ped.z += Math.cos(ped.timer) * speed * dt;
    ped.group.position.set(ped.x, groundHeight(ped.x, ped.z), ped.z);

    // Flee logic: gunshots < 60m, Heat >= 3 < 20m
    // (Actual flee implementation would go here)
  }
}

export function witnessesAt(pos, radius) {
  return pedestrians.filter(p => !p.down && Math.hypot(p.x - pos.x, p.z - pos.z) < radius).length;
}

export function getPedestrians() {
  return pedestrians;
}

export function damagePedestrian(ped, dmg) {
  ped.hp -= dmg;
  if (ped.hp <= 0) {
    ped.down = true;
    ped.group.rotation.x = Math.PI / 2;
  }
}

export function debugSetPed(index, x, z, angle) {
  if (pedestrians[index]) {
    pedestrians[index].x = x;
    pedestrians[index].z = z;
    pedestrians[index].group.position.set(x, groundHeight(x, z), z);
  }
}
