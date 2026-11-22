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
    if (WEAPON_SPECS[name]) currentWeapon = name;
}

export function nextWeapon() {
    const keys = Object.keys(WEAPON_SPECS);
    const idx = (keys.indexOf(currentWeapon) + 1) % keys.length;
    currentWeapon = keys[idx];
}

export function reloadWeapon() {
    const spec = WEAPON_SPECS[currentWeapon];
    if (spec.mag) {
        const canReload = Math.min(spec.mag - ammo[currentWeapon].cur, ammo[currentWeapon].res);
        ammo[currentWeapon].cur += canReload;
        ammo[currentWeapon].res -= canReload;
    }
}

export function updateCombat(dt) {
    // Weapon logic
}

export function fireWeapon(target) {
    const spec = WEAPON_SPECS[currentWeapon];
    if (ammo[currentWeapon].cur > 0 || !spec.mag) {
        if (spec.mag) ammo[currentWeapon].cur--;
        // Hitscan: target.damage(spec.dmg)
        // Muzzle flash + tracer logic
    }
}

export function getAmmo() {
    const keys = Object.keys(WEAPON_SPECS);
    return {
        current: ammo[currentWeapon].cur,
        reserve: ammo[currentWeapon].res,
        index: keys.indexOf(currentWeapon)
    };
}
