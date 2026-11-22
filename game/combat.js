import * as THREE from './three.module.min.js';

export const WEAPON_SPECS = {
    fists: { dmg: 8, rate: 2 },
    chispa: { dmg: 18, mag: 12, reserve: 60, rate: 3 },
    zumbido: { dmg: 10, mag: 30, reserve: 120, rate: 10 },
    trueno: { dmg: 6, mag: 6, reserve: 24, rate: 1 }
};

let currentWeapon = 'fists';
let ammo = { fists: { cur: Infinity, res: 0 }, chispa: { cur: 12, res: 60 }, zumbido: { cur: 30, res: 120 }, trueno: { cur: 6, res: 24 } };

export function initCombat() {}

export function switchWeapon(name) {
    currentWeapon = name;
}

export function nextWeapon() {
    const weapons = Object.keys(WEAPON_SPECS);
    currentWeapon = weapons[(weapons.indexOf(currentWeapon) + 1) % weapons.length];
}

export function reloadWeapon() {
    const spec = WEAPON_SPECS[currentWeapon];
    if (spec.mag && ammo[currentWeapon].res > 0) {
        const reload = Math.min(spec.mag - ammo[currentWeapon].cur, ammo[currentWeapon].res);
        ammo[currentWeapon].cur += reload;
        ammo[currentWeapon].res -= reload;
    }
}

export function updateCombat(dt) {}

export function fireWeapon(target) {
    const spec = WEAPON_SPECS[currentWeapon];
    if (ammo[currentWeapon].cur > 0) {
        ammo[currentWeapon].cur--;
        // hitscan logic
    }
}

export function getAmmo() {
    return { current: ammo[currentWeapon].cur, reserve: ammo[currentWeapon].res, index: Object.keys(WEAPON_SPECS).indexOf(currentWeapon) };
}
// Add 100+ lines of implementation...
