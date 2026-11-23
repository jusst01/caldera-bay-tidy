import * as THREE from './three.module.min.js';

export const WEAPON_SPECS = {
  Fists: { damage: 5, range: 2, interval: 500, mag: 0, reserve: 0 },
  Pieza9mm: { damage: 20, range: 50, interval: 300, mag: 15, reserve: 60 },
  ViudaSMG: { damage: 15, range: 30, interval: 100, mag: 30, reserve: 120 },
  Cazadora: { damage: 50, range: 20, interval: 800, mag: 5, reserve: 20 }
};

let combatState = {
  weaponIndex: 0,
  weapon: WEAPON_SPECS.Fists,
  ammo: 0,
  reserve: 0,
  reloading: false,
  hp: 100,
  armour: 0
};

let wheelVisible = false;

export function initCombat() {
  combatState = { weaponIndex: 0, weapon: WEAPON_SPECS.Fists, ammo: 0, reserve: 0, reloading: false, hp: 100, armour: 0 };
}

export function switchWeapon(index) {
  const keys = Object.keys(WEAPON_SPECS);
  combatState.weaponIndex = index % keys.length;
  combatState.weapon = WEAPON_SPECS[keys[combatState.weaponIndex]];
}

export function nextWeapon() {
  switchWeapon(combatState.weaponIndex + 1);
}

export function reloadWeapon() {
  if (combatState.reloading) return;
  combatState.reloading = true;
  // Reload logic
}

export function updateCombat(dt) {
  // Update logic
}

export function fireWeapon() {
  // Fire logic
}

export function getAmmo() {
  return { current: combatState.ammo, reserve: combatState.reserve, index: combatState.weaponIndex };
}

export function getCombatState() {
  return combatState;
}

export function showWeaponWheel(visible) {
  wheelVisible = visible;
  return { visible: wheelVisible, selectedIndex: combatState.weaponIndex };
}

export function damagePlayer(amount) {
  combatState.hp -= amount;
}
