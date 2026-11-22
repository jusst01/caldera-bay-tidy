// CALDERA BAY — game/pedestrians.js
// Pool of 48 active peds, 3 archetypes, boulevard-aware sidewalks, fleeing, witnesses, capsule figures, debug hook.

import * as THREE from './three.module.min.js';
import { groundHeight } from './city.js';

const ARCHETYPES = {
  worker: { id: 'worker', hp: 30, maxHp: 30, minWallet: 5, maxWallet: 20, color: 0x557799 },
  tourist: { id: 'tourist', hp: 30, maxHp: 30, minWallet: 5, maxWallet: 40, color: 0x997755 },
  thug: { id: 'thug', hp: 45, maxHp: 45, minWallet: 15, maxWallet: 40, color: 0x773333 }
};

let pedestrians = [];
let sceneRef = null;
let rngRef = null;

export function initPedestrians(scene, rng) {
  sceneRef = scene;
  rngRef = rng;
  pedestrians = [];

  for (let i = 0; i < 48; i++) {
    spawnRandomPedestrian();
  }
}

function createPedestrianMesh(archetype) {
  const group = new THREE.Group();
  const color = archetype.color;

  const bodyGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 6);
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.8;
  body.castShadow = true;
  group.add(body);

  const headGeo = new THREE.SphereGeometry(0.22, 8, 8);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xddccbb, roughness: 0.6 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.6;
  head.castShadow = true;
  group.add(head);

  return group;
}

function spawnRandomPedestrian(forcedX = null, forcedZ = null, forcedType = null, forcedHeading = 0) {
  if (!rngRef || !sceneRef) return null;

  const keys = Object.keys(ARCHETYPES);
  const typeKey = forcedType || keys[Math.floor(rngRef() * keys.length)];
  const arch = ARCHETYPES[typeKey] || ARCHETYPES.worker;

  const angle = rngRef() * Math.PI * 2;
  const dist = 30 + rngRef() * 100;
  const x = forcedX !== null ? forcedX : Math.sin(angle) * dist;
  const z = forcedZ !== null ? forcedZ : Math.cos(angle) * dist;
  const y = groundHeight(x, z);

  const mesh = createPedestrianMesh(arch);
  mesh.position.set(x, y, z);
  sceneRef.add(mesh);

  const wallet = Math.floor(arch.minWallet + rngRef() * (arch.maxWallet - arch.minWallet));

  const ped = {
    type: typeKey,
    arch,
    mesh,
    x,
    y,
    z,
    heading: forcedHeading || rngRef() * Math.PI * 2,
    speed: 1.2 + rngRef() * 0.8,
    hp: arch.hp,
    maxHp: arch.maxHp,
    wallet,
    fleeing: false,
    fleeTimer: 0,
    down: false,
    downTimer: 0,
    waypoint: { x: x + (rngRef() - 0.5) * 60, z: z + (rngRef() - 0.5) * 60 }
  };

  pedestrians.push(ped);
  return ped;
}

export function debugSetPed(type, x, z, heading) {
  return spawnRandomPedestrian(x, z, type, heading);
}

function isBoulevard(x, z) {
  // Boulevards are major axes around x=±256 or z=±256
  return Math.abs(Math.abs(x) - 256) < 32 || Math.abs(Math.abs(z) - 256) < 32;
}

export function updatePedestrians(dt, playerPos, heat, gunshotEvents = []) {
  if (!rngRef || !sceneRef) return;

  for (let i = pedestrians.length - 1; i >= 0; i--) {
    const ped = pedestrians[i];

    // Recycling if beyond 170m from player
    const dxp = ped.x - playerPos.x;
    const dzp = ped.z - playerPos.z;
    const distSq = dxp * dxp + dzp * dzp;

    if (distSq > 170 * 170 && !ped.down) {
      sceneRef.remove(ped.mesh);
      pedestrians.splice(i, 1);
      spawnRandomPedestrian();
      continue;
    }

    if (ped.down) {
      ped.downTimer += dt;
      if (ped.downTimer > 30) {
        sceneRef.remove(ped.mesh);
        pedestrians.splice(i, 1);
        spawnRandomPedestrian();
      }
      continue;
    }

    // Check gunfire reactions (<60m) or high heat threat (<20m for heat ≥3)
    let shouldFlee = false;
    for (const g of gunshotEvents) {
      const gdx = ped.x - g.x;
      const gdz = ped.z - g.z;
      if (gdx * gdx + gdz * gdz < 60 * 60) {
        shouldFlee = true;
      }
    }

    if (heat >= 3 && distSq < 20 * 20) {
      shouldFlee = true;
    }

    if (shouldFlee) {
      ped.fleeing = true;
      ped.fleeTimer = 8.0;
      const fleeAngle = Math.atan2(ped.x - playerPos.x, ped.z - playerPos.z) + (rngRef() - 0.5);
      ped.heading = fleeAngle;
      ped.speed = 3.5;
    } else if (ped.fleeing) {
      ped.fleeTimer -= dt;
      if (ped.fleeTimer <= 0) {
        ped.fleeing = false;
        ped.speed = 1.2 + rngRef() * 0.8;
      }
    }

    // Waypoint navigation with boulevard-aware sidewalk offset
    const wdx = ped.waypoint.x - ped.x;
    const wdz = ped.waypoint.z - ped.z;
    const wDistSq = wdx * wdx + wdz * wdz;

    if (wDistSq < 4.0 || ped.fleeing) {
      const angle = rngRef() * Math.PI * 2;
      const rDist = 20 + rngRef() * 40;
      ped.waypoint.x = ped.x + Math.sin(angle) * rDist;
      ped.waypoint.z = ped.z + Math.cos(angle) * rDist;

      // Boulevard-aware sidewalk offset (boulevard half-width is 12m -> offset 14.5m, standard 10m)
      const offset = isBoulevard(ped.waypoint.x, ped.waypoint.z) ? 14.5 : 10.0;
      ped.waypoint.x += (rngRef() > 0.5 ? 1 : -1) * offset;
    }

    if (!ped.fleeing) {
      const targetAngle = Math.atan2(wdx, wdz);
      let diff = targetAngle - ped.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      ped.heading += diff * Math.min(1, dt * 3);
    }

    ped.x += Math.sin(ped.heading) * ped.speed * dt;
    ped.z += Math.cos(ped.heading) * ped.speed * dt;
    ped.y = groundHeight(ped.x, ped.z);

    ped.mesh.position.set(ped.x, ped.y, ped.z);
    ped.mesh.rotation.y = ped.heading;
  }

  // Maintain pool size of 48
  while (pedestrians.length < 48) {
    spawnRandomPedestrian();
  }
}

export function witnessesAt(x, z, radius) {
  let count = 0;
  for (const ped of pedestrians) {
    if (ped.down || ped.fleeing) continue;
    const dx = ped.x - x;
    const dz = ped.z - z;
    if (dx * dx + dz * dz <= radius * radius) {
      count++;
    }
  }
  return count;
}

export function getPedestrians() {
  return pedestrians;
}

export function damagePedestrian(ped, damage) {
  if (ped.down) return 0;
  ped.hp = Math.max(0, ped.hp - damage);
  if (ped.hp <= 0) {
    ped.down = true;
    ped.mesh.rotation.z = Math.PI / 2;
    const droppedWallet = ped.wallet;
    ped.wallet = 0;
    return droppedWallet;
  }
  return 0;
}
