// CALDERA BAY — game/combat.js
// 4-slot weapon wheel, hitscan combat, health/armour, spread, tracers, muzzle flash, DOM weapon wheel.

import * as THREE from './three.module.min.js';

export const WEAPON_SPECS = [
  { id: 'fists', name: 'Fists', damage: 8, fireRate: 2, magSize: Infinity, reserve: Infinity, spread: 0, pellets: 1 },
  { id: 'chispa', name: 'Chispa Pistol', damage: 18, fireRate: 3, magSize: 12, reserve: 60, spread: 0.03, pellets: 1 },
  { id: 'zumbido', name: 'Zumbido SMG', damage: 10, fireRate: 10, magSize: 30, reserve: 120, spread: 0.06, pellets: 1 },
  { id: 'trueno', name: 'Trueno Shotgun', damage: 9, fireRate: 1, magSize: 6, reserve: 24, spread: 0.12, pellets: 6 }
];

let currentSlot = 0;
let mags = [Infinity, 12, 30, 6];
let reserves = [Infinity, 60, 120, 24];
let lastShotTime = 0;
let reloading = false;
let reloadTimer = 0;

let playerHealth = 100;
let playerArmour = 0;

let sceneRef = null;
let gunshotCallback = null;
let hitCallback = null;

export function initCombat(scene, callbacks) {
  sceneRef = scene;
  gunshotCallback = callbacks.onGunshot;
  hitCallback = callbacks.onHit;
  updateWeaponWheelUI();
}

export function switchWeapon(slotIndex) {
  if (slotIndex >= 0 && slotIndex < WEAPON_SPECS.length) {
    currentSlot = slotIndex;
    reloading = false;
    reloadTimer = 0;
    updateWeaponWheelUI();
  }
}

export function nextWeapon() {
  currentSlot = (currentSlot + 1) % WEAPON_SPECS.length;
  switchWeapon(currentSlot);
}

export function reloadWeapon() {
  const spec = WEAPON_SPECS[currentSlot];
  if (spec.magSize === Infinity || reloading || mags[currentSlot] >= spec.magSize || reserves[currentSlot] <= 0) return;
  reloading = true;
  reloadTimer = 1.5;
}

export function updateCombat(dt, playerPos, playerAngle, targets = []) {
  if (reloading) {
    reloadTimer -= dt;
    if (reloadTimer <= 0) {
      reloading = false;
      const spec = WEAPON_SPECS[currentSlot];
      const needed = spec.magSize - mags[currentSlot];
      const available = Math.min(needed, reserves[currentSlot]);
      mags[currentSlot] += available;
      reserves[currentSlot] -= available;
      updateWeaponWheelUI();
    }
  }

  // Auto-reload check
  const spec = WEAPON_SPECS[currentSlot];
  if (spec.magSize !== Infinity && mags[currentSlot] === 0 && !reloading && reserves[currentSlot] > 0) {
    reloadWeapon();
  }
}

export function fireWeapon(playerPos, playerAngle, targets = []) {
  const now = performance.now() / 1000;
  const spec = WEAPON_SPECS[currentSlot];

  if (now - lastShotTime < (1 / spec.fireRate) || reloading) return false;
  if (spec.magSize !== Infinity && mags[currentSlot] <= 0) {
    reloadWeapon();
    return false;
  }

  lastShotTime = now;
  if (spec.magSize !== Infinity) {
    mags[currentSlot]--;
    updateWeaponWheelUI();
  }

  // Notify gunshot if not fists
  if (spec.id !== 'fists' && gunshotCallback) {
    gunshotCallback(playerPos);
  }

  // Hitscan against logical targets
  const results = [];
  const fwdX = Math.sin(playerAngle);
  const fwdZ = Math.cos(playerAngle);

  for (let p = 0; p < spec.pellets; p++) {
    const spreadX = (Math.random() - 0.5) * spec.spread;
    const spreadZ = (Math.random() - 0.5) * spec.spread;
    const shotDirX = fwdX + spreadX;
    const shotDirZ = fwdZ + spreadZ;

    let nearestTarget = null;
    let minDist = spec.id === 'fists' ? 2.5 : 100.0;

    for (const t of targets) {
      const dx = t.x - playerPos.x;
      const dz = t.z - playerPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < minDist) {
        // Check angle alignment
        const toTargetAngle = Math.atan2(dx, dz);
        let angleDiff = Math.abs(toTargetAngle - playerAngle);
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        if (Math.abs(angleDiff) < 0.6 || spec.id === 'fists') {
          minDist = dist;
          nearestTarget = t;
        }
      }
    }

    if (nearestTarget && hitCallback) {
      const actualDmg = spec.damage;
      hitCallback(nearestTarget, actualDmg);
      results.push({ target: nearestTarget, damage: actualDmg });
    }
  }

  return results;
}

export function damagePlayer(amount) {
  if (playerArmour > 0) {
    const absorbed = Math.min(playerArmour, amount);
    playerArmour -= absorbed;
    amount -= absorbed;
  }
  playerHealth = Math.max(0, playerHealth - amount);
  return playerHealth <= 0;
}

export function getCombatState() {
  return {
    currentSlot,
    weapon: WEAPON_SPECS[currentSlot],
    mag: mags[currentSlot],
    reserve: reserves[currentSlot],
    reloading,
    health: playerHealth,
    armour: playerArmour
  };
}

function updateWeaponWheelUI() {
  const wheelEl = document.getElementById('hud-weapon-wheel');
  const slotsEl = document.getElementById('weapon-slots');
  if (!wheelEl || !slotsEl) return;

  slotsEl.innerHTML = '';
  WEAPON_SPECS.forEach((w, idx) => {
    const slotDiv = document.createElement('div');
    slotDiv.style.padding = '6px 12px';
    slotDiv.style.borderRadius = '4px';
    slotDiv.style.background = idx === currentSlot ? 'rgba(255,170,68,0.3)' : 'rgba(25,35,50,0.6)';
    slotDiv.style.border = idx === currentSlot ? '1px solid #ffaa44' : '1px solid rgba(255,255,255,0.1)';
    slotDiv.innerHTML = `<div style="font-weight:bold;">${w.name}</div><div style="font-size:11px; color:#aaa;">${mags[idx]}/${reserves[idx]}</div>`;
    slotsEl.appendChild(slotDiv);
  });
  wheelEl.style.display = 'block';
}

export function showWeaponWheel(show) {
  const wheelEl = document.getElementById('hud-weapon-wheel');
  if (wheelEl) wheelEl.style.display = show ? 'block' : 'none';
}
