import * as THREE from './three.module.min.js';

export const WEAPON_SPECS = [
    { name: 'Fists', dmg: 8, rate: 2, mag: 0, reserve: 0, spread: 0 },
    { name: 'Chispa Pistol', dmg: 18, rate: 3, mag: 12, reserve: 60, spread: 0.03 },
    { name: 'Zumbido SMG', dmg: 10, rate: 10, mag: 30, reserve: 120, spread: 0.05 },
    { name: 'Trueno Shotgun', dmg: 6, pellets: 9, rate: 1, mag: 6, reserve: 24, spread: 0.08 }
];

let currentWeaponIdx = 0;
let currentMag = 12;
let currentReserve = 60;
let armour = 100;
let health = 100;
let fireCooldown = 0;
let reloadTimer = 0;
let wheelEl = null;
let fireCallback = null;
let muzzleFlashMesh = null;
let activeTracers = [];
let combatInitialized = false;

export function initCombat(domContainer, onFireCb) {
    fireCallback = onFireCb;
    currentWeaponIdx = 0;
    combatInitialized = true;
    syncAmmoForWeapon();

    if (domContainer) {
        wheelEl = document.createElement('div');
        wheelEl.id = 'weapon-wheel-dom';
        wheelEl.style.position = 'absolute';
        wheelEl.style.bottom = '20px';
        wheelEl.style.right = '20px';
        wheelEl.style.background = 'rgba(0,0,0,0.7)';
        wheelEl.style.color = '#fff';
        wheelEl.style.padding = '10px';
        wheelEl.style.fontFamily = 'monospace';
        wheelEl.style.fontSize = '12px';
        wheelEl.style.zIndex = '1000';
        domContainer.appendChild(wheelEl);
        updateWheelDOM();
    }
}

function syncAmmoForWeapon() {
    const spec = WEAPON_SPECS[currentWeaponIdx];
    currentMag = spec.mag;
    currentReserve = spec.reserve;
}

export function switchWeapon(idx) {
    if (idx >= 0 && idx < WEAPON_SPECS.length) {
        currentWeaponIdx = idx;
        syncAmmoForWeapon();
        updateWheelDOM();
    }
}

export function nextWeapon() {
    currentWeaponIdx = (currentWeaponIdx + 1) % WEAPON_SPECS.length;
    syncAmmoForWeapon();
    updateWheelDOM();
}

export function reloadWeapon() {
    const spec = WEAPON_SPECS[currentWeaponIdx];
    if (spec.mag === 0 || currentMag >= spec.mag || currentReserve <= 0) return;
    reloadTimer = 1.5;
}

export function updateCombat(dt, camera, targets) {
    if (!combatInitialized) return;
    if (fireCooldown > 0) fireCooldown -= dt;
    if (reloadTimer > 0) {
        reloadTimer -= dt;
        if (reloadTimer <= 0) {
            const spec = WEAPON_SPECS[currentWeaponIdx];
            const needed = spec.mag - currentMag;
            const take = Math.min(needed, currentReserve);
            currentMag += take;
            currentReserve -= take;
            updateWheelDOM();
        }
    }
}

export function fireWeapon(camera, targets) {
    if (fireCooldown > 0 || reloadTimer > 0) return false;
    const spec = WEAPON_SPECS[currentWeaponIdx];

    if (spec.mag > 0) {
        if (currentMag <= 0) {
            reloadWeapon();
            return false;
        }
        currentMag--;
        updateWheelDOM();
    }

    fireCooldown = 1 / spec.rate;

    if (fireCallback) {
        fireCallback(camera);
    }

    if (targets && targets.length > 0 && camera) {
        const ray = new THREE.Raycaster();
        const center = new THREE.Vector2(0, 0);
        ray.setFromCamera(center, camera);

        for (let i = 0; i < targets.length; i++) {
            const t = targets[i];
            if (!t || !t.mesh) continue;
            const dist = camera.position.distanceTo(t.mesh.position);
            if (dist < 50) {
                const spreadVal = spec.spread || 0;
                const hitChance = Math.max(0.1, 1.0 - dist / 60 - spreadVal);
                if (Math.random() < hitChance) {
                    const pellets = spec.pellets || 1;
                    const totalDmg = spec.dmg * pellets;
                    if (typeof t.damage === 'function') {
                        t.damage(totalDmg);
                    }
                    break;
                }
            }
        }
    }
    return true;
}

export function getAmmo() {
    return {
        current: currentMag,
        reserve: currentReserve,
        index: currentWeaponIdx
    };
}

function updateWheelDOM() {
    if (!wheelEl) return;
    const spec = WEAPON_SPECS[currentWeaponIdx];
    wheelEl.innerHTML = `Weapon: <b>${spec.name}</b><br>Ammo: ${currentMag} / ${currentReserve}`;
}

export function getCombatStats() {
    return {
        health: health,
        armour: armour,
        weapon: WEAPON_SPECS[currentWeaponIdx].name,
        mag: currentMag,
        reserve: currentReserve
    };
}

export function damagePlayer(amount) {
    if (armour > 0) {
        const absorb = Math.min(armour, amount);
        armour -= absorb;
        amount -= absorb;
    }
    health = Math.max(0, health - amount);
    return health <= 0;
}

export function healPlayer(amount) {
    health = Math.min(100, health + amount);
}

export function validateCombatState() {
    return combatInitialized && currentWeaponIdx >= 0 && currentWeaponIdx < WEAPON_SPECS.length;
}
