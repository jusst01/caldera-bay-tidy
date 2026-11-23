import * as THREE from './three.module.min.js';

const WEAPON_SPECS = {
  'Fists': { damage: 1, range: 2, interval: 500, mag: 0, reserve: 0 },
  'Pieza 9mm': { damage: 10, range: 50, interval: 200, mag: 15, reserve: 60 },
  'Viuda SMG': { damage: 5, range: 30, interval: 100, mag: 30, reserve: 120 },
  'Cazadora shotgun': { damage: 25, range: 15, interval: 800, mag: 6, reserve: 24 }
};

let combatState = { weaponIndex: 0, ammo: 0, reserve: 0, reloading: false, hp: 100, armour: 0 };
let weaponWheelVisible = false;

function initCombat() {}
function switchWeapon(index) { combatState.weaponIndex = index; }
function nextWeapon() { combatState.weaponIndex = (combatState.weaponIndex + 1) % 4; }
function reloadWeapon() { combatState.reloading = true; }
function updateCombat() {}
function fireWeapon() {}
function getAmmo() { return { current: combatState.ammo, reserve: combatState.reserve, index: combatState.weaponIndex }; }
function damagePlayer(amount) { combatState.hp -= amount; }
function getCombatState() {
  const weapons = Object.keys(WEAPON_SPECS);
  return {
    ...combatState,
    weapon: WEAPON_SPECS[weapons[combatState.weaponIndex]]
  };
}
function showWeaponWheel(visible) {
  weaponWheelVisible = visible;
  return { visible: weaponWheelVisible, selectedIndex: combatState.weaponIndex };
}

export { WEAPON_SPECS, initCombat, switchWeapon, nextWeapon, reloadWeapon, updateCombat, fireWeapon, getAmmo, damagePlayer, getCombatState, showWeaponWheel };
