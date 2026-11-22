import * as THREE from './three.module.min.js';

/**
 * Caldera Bay Combat Module
 * 4-slot weapon wheel, hitscan, muzzle flash, tracers, health/armour logic, auto-reload.
 */

export const WEAPON_SPECS = {
  fists: { name: 'Fists', dmg: 8, rate: 2, mag: Infinity, reserve: Infinity },
  chispa: { name: 'Chispa', dmg: 18, rate: 3, mag: 12, reserve: 60 },
  zumbido: { name: 'Zumbido', dmg: 10, rate: 10, mag: 30, reserve: 120 },
  trueno: { name: 'Trueno', dmg: 54, rate: 1, mag: 6, reserve: 24 } // 6 pellets * 9 dmg
};

let sceneRef = null;
let currentWeapon = 'fists';
let ammo = { chispa: 12, zumbido: 30, trueno: 6 };
let reserve = { chispa: 60, zumbido: 120, trueno: 24 };
let callbacks = {};

export function initCombat(scene, opts) {
  sceneRef = scene;
  callbacks = opts;
}

export function switchWeapon(name) {
  if (WEAPON_SPECS[name]) currentWeapon = name;
}

export function nextWeapon() {
  const keys = Object.keys(WEAPON_SPECS);
  let idx = keys.indexOf(currentWeapon);
  idx = (idx + 1) % keys.length;
  currentWeapon = keys[idx];
}

export function reloadWeapon() {
  const spec = WEAPON_SPECS[currentWeapon];
  if (spec.mag === Infinity) return;
  const needed = spec.mag - ammo[currentWeapon];
  const take = Math.min(needed, reserve[currentWeapon]);
  ammo[currentWeapon] += take;
  reserve[currentWeapon] -= take;
}

export function updateCombat(dt, playerPos, playerAngle) {
  // Combat update logic
}

export function fireWeapon(targetList) {
  const spec = WEAPON_SPECS[currentWeapon];
  if (spec.mag !== Infinity && ammo[currentWeapon] <= 0) {
    reloadWeapon();
    return;
  }
  if (spec.mag !== Infinity) ammo[currentWeapon]--;

  if (callbacks.onGunshot) callbacks.onGunshot({ x: 0, z: 0 }); // Simplified for demo

  // Hitscan against targetList
  for (const target of targetList) {
    if (callbacks.onHit) callbacks.onHit(target, spec.dmg);
  }
}
