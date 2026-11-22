import * as THREE from './three.module.min.js';

export const WEAPON_SPECS = [
  { name: 'Fists', damage: 10, range: 3, fireInterval: 0.5, mag: 0, reserve: 0 },
  { name: 'Pieza 9mm', damage: 25, range: 30, fireInterval: 0.2, mag: 17, reserve: 102 },
  { name: 'Viuda SMG', damage: 18, range: 45, fireInterval: 0.09, mag: 30, reserve: 150 },
  { name: 'Cazadora shotgun', damage: 80, range: 20, fireInterval: 0.8, mag: 8, reserve: 32 }
];

let weaponIndex = 0;
let ammoList = [];
let hp = 100;
let armour = 100;
let reloading = false;
let reloadTimer = 0;
let fireCooldown = 0;
let wheelVisible = false;

export function initCombat() {
  weaponIndex = 0;
  hp = 100;
  armour = 100;
  reloading = false;
  reloadTimer = 0;
  fireCooldown = 0;
  wheelVisible = false;

  ammoList = WEAPON_SPECS.map(spec => ({
    current: spec.mag,
    reserve: spec.reserve
  }));
}

export function switchWeapon(index) {
  if (index >= 0 && index < WEAPON_SPECS.length) {
    weaponIndex = index;
    reloading = false;
    reloadTimer = 0;
  }
  return weaponIndex;
}

export function nextWeapon() {
  weaponIndex = (weaponIndex + 1) % WEAPON_SPECS.length;
  reloading = false;
  reloadTimer = 0;
  return weaponIndex;
}

export function reloadWeapon() {
  const spec = WEAPON_SPECS[weaponIndex];
  if (spec.mag === 0 || reloading) return;
  const ammo = ammoList[weaponIndex];
  if (ammo.current >= spec.mag || ammo.reserve <= 0) return;

  reloading = true;
  reloadTimer = 1.5;
}

export function updateCombat(dt) {
  if (fireCooldown > 0) {
    fireCooldown -= dt;
  }
  if (reloading) {
    reloadTimer -= dt;
    if (reloadTimer <= 0) {
      reloading = false;
      const spec = WEAPON_SPECS[weaponIndex];
      const ammo = ammoList[weaponIndex];
      const needed = spec.mag - ammo.current;
      const take = Math.min(needed, ammo.reserve);
      ammo.current += take;
      ammo.reserve -= take;
    }
  }
}

export function fireWeapon() {
  if (fireCooldown > 0 || reloading) return false;
  const spec = WEAPON_SPECS[weaponIndex];
  const ammo = ammoList[weaponIndex];

  if (spec.mag > 0) {
    if (ammo.current <= 0) {
      reloadWeapon();
      return false;
    }
    ammo.current--;
  }

  fireCooldown = spec.fireInterval;
  return true;
}

export function getAmmo() {
  const spec = WEAPON_SPECS[weaponIndex];
  const ammo = ammoList[weaponIndex] || { current: 0, reserve: 0 };
  return {
    current: spec.mag === 0 ? Infinity : ammo.current,
    reserve: ammo.reserve,
    index: weaponIndex
  };
}

export function damagePlayer(amount) {
  let rem = amount;
  if (armour > 0) {
    const absorb = Math.min(armour, rem);
    armour -= absorb;
    rem -= absorb;
  }
  if (rem > 0) {
    hp = Math.max(0, hp - rem);
  }
  return hp;
}

export function getCombatState() {
  const spec = WEAPON_SPECS[weaponIndex];
  const ammo = ammoList[weaponIndex] || { current: 0, reserve: 0 };
  return {
    weaponIndex,
    weapon: spec,
    ammo: ammo.current,
    reserve: ammo.reserve,
    reloading,
    hp,
    armour
  };
}

export function showWeaponWheel(visible) {
  if (typeof visible === 'boolean') {
    wheelVisible = visible;
  }
  return {
    visible: wheelVisible,
    selectedIndex: weaponIndex
  };
}
