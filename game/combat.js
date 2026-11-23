import * as THREE from './three.module.min.js';

/**
 * WEAPON_SPECS contains the configuration for each weapon in the game.
 * Each weapon includes damage, range, fire interval (in ms), mag size, and total reserve ammo.
 */
export const WEAPON_SPECS = {
    FISTS: { name: 'Fists', damage: 5, range: 2, interval: 500, mag: 0, reserve: 0 },
    PIEZA_9MM: { name: 'Pieza 9mm', damage: 20, range: 50, interval: 200, mag: 15, reserve: 60 },
    VIUDA_SMG: { name: 'Viuda SMG', damage: 10, range: 30, interval: 80, mag: 30, reserve: 120 },
    CAZADORA: { name: 'Cazadora Shotgun', damage: 50, range: 15, interval: 1000, mag: 8, reserve: 32 }
};

// Internal state representing the player's combat status
let state = {
    weaponIndex: 0,
    ammo: 0,
    reserve: 0,
    reloading: false,
    reloadTimer: 0,
    fireTimer: 0,
    hp: 100,
    armour: 50
};

// Internal state for the weapon selection UI
let wheel = {
    visible: false,
    selectedIndex: 0
};

/**
 * Initializes the combat system with default values.
 */
export function initCombat() {
    state = {
        weaponIndex: 0,
        ammo: 0,
        reserve: 0,
        reloading: false,
        reloadTimer: 0,
        fireTimer: 0,
        hp: 100,
        armour: 50
    };
    wheel = { visible: false, selectedIndex: 0 };
}

/**
 * Switches to a specific weapon based on index.
 * @param {number} index - The index of the weapon to switch to.
 */
export function switchWeapon(index) {
    const specs = Object.values(WEAPON_SPECS);
    if (index >= 0 && index < specs.length) {
        state.weaponIndex = index;
        const weapon = specs[index];
        state.ammo = weapon.mag;
        state.reserve = weapon.reserve;
    }
}

/**
 * Cycles to the next available weapon in the specification list.
 */
export function nextWeapon() {
    const specs = Object.values(WEAPON_SPECS);
    state.weaponIndex = (state.weaponIndex + 1) % specs.length;
    switchWeapon(state.weaponIndex);
}

/**
 * Initiates the reload process for the current weapon.
 */
export function reloadWeapon() {
    if (state.reloading) return;
    const specs = Object.values(WEAPON_SPECS);
    const weapon = specs[state.weaponIndex];
    if (weapon.mag === 0 || state.reserve <= 0 || state.ammo === weapon.mag) return;

    state.reloading = true;
    state.reloadTimer = 2000; // Reload takes 2 seconds
}

/**
 * Updates the combat state, handling timers for firing and reloading.
 * @param {number} deltaTime - The time elapsed since the last update in milliseconds.
 */
export function updateCombat(deltaTime) {
    if (state.reloading) {
        state.reloadTimer -= deltaTime;
        if (state.reloadTimer <= 0) {
            const specs = Object.values(WEAPON_SPECS);
            const weapon = specs[state.weaponIndex];
            const needed = weapon.mag - state.ammo;
            const reloadAmount = Math.min(needed, state.reserve);
            state.ammo += reloadAmount;
            state.reserve -= reloadAmount;
            state.reloading = false;
        }
    }
    if (state.fireTimer > 0) {
        state.fireTimer -= deltaTime;
    }
}

/**
 * Attempts to fire the current weapon.
 * @returns {boolean} True if the weapon fired, false otherwise.
 */
export function fireWeapon() {
    if (state.reloading || state.fireTimer > 0) return false;

    const specs = Object.values(WEAPON_SPECS);
    const weapon = specs[state.weaponIndex];

    // Check ammo for non-fist weapons
    if (weapon.mag > 0 && state.ammo <= 0) return false;

    if (weapon.mag > 0) state.ammo -= 1;
    state.fireTimer = weapon.interval;
    return true;
}

/**
 * Returns the current ammo state.
 * @returns {Object} An object containing current ammo, reserve ammo, and weapon index.
 */
export function getAmmo() {
    return {
        current: state.ammo,
        reserve: state.reserve,
        index: state.weaponIndex
    };
}

/**
 * Applies damage to the player's health or armour.
 * @param {number} amount - The amount of damage to inflict.
 */
export function damagePlayer(amount) {
    if (state.armour > 0) {
        const damageToArmour = Math.min(state.armour, amount);
        state.armour -= damageToArmour;
        amount -= damageToArmour;
    }
    state.hp = Math.max(0, state.hp - amount);
}

/**
 * Returns a snapshot of the current combat state.
 * @returns {Object} The current combat state object.
 */
export function getCombatState() {
    const specs = Object.values(WEAPON_SPECS);
    return {
        weaponIndex: state.weaponIndex,
        weapon: specs[state.weaponIndex],
        ammo: state.ammo,
        reserve: state.reserve,
        reloading: state.reloading,
        hp: state.hp,
        armour: state.armour
    };
}

/**
 * Records and returns the visibility status of the weapon wheel.
 * @param {boolean} visible - Whether the wheel should be visible.
 * @returns {Object} The current visibility and selected index.
 */
export function showWeaponWheel(visible) {
    wheel.visible = visible;
    return {
        visible: wheel.visible,
        selectedIndex: wheel.selectedIndex
    };
}
