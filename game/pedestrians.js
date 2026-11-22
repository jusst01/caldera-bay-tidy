import * as THREE from './three.module.min.js';

let seed = 12345;
function random() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
}

const archetypes = {
    worker: { hp: 30, wallet: [5, 20] },
    tourist: { hp: 30, wallet: [10, 40] },
    thug: { hp: 45, wallet: [20, 40] }
};

let peds = [];

function createPed(i) {
    const arch = ['worker', 'tourist', 'thug'][Math.floor(random() * 3)];
    return {
        id: i,
        archetype: arch,
        hp: archetypes[arch].hp,
        pos: new THREE.Vector3(random() * 300 - 150, 0, random() * 300 - 150),
        heading: random() * Math.PI * 2,
        state: 'IDLE',
        dead: false
    };
}

export function initPedestrians() {
    peds = [];
    for (let i = 0; i < 48; i++) {
        peds.push(createPed(i));
    }
}

function updateMovement(p, dt) {
    // Boulevard-aware movement
    if (p.state === 'IDLE') {
        p.heading += (random() - 0.5) * 0.1;
        const vel = new THREE.Vector3(Math.sin(p.heading), 0, Math.cos(p.heading)).multiplyScalar(0.5 * dt);
        p.pos.add(vel);
    }
}

function updateState(p, dt) {
    // Fleeing logic
    if (p.state === 'FLEEING') {
        // Run away
    }
}

export function updatePedestrians(dt) {
    peds.forEach(p => {
        if (p.dead) return;
        updateMovement(p, dt);
        updateState(p, dt);
    });
    // Recycling
    peds.forEach(p => {
        if (p.pos.length() > 200) {
            // Respawn
            Object.assign(p, createPed(p.id));
        }
    });
}

export function witnessesAt(pos, radius) {
    return peds.filter(p => !p.dead && p.state === 'IDLE' && p.pos.distanceTo(pos) < radius).length;
}

export function getPedestrians() {
    return peds;
}

export function damagePedestrian(id, amount) {
    const p = peds.find(p => p.id === id);
    if (p) {
        p.hp -= amount;
        if (p.hp <= 0) p.dead = true;
    }
}

export function debugSetPed(index, x, z, angle) {
    if (peds[index]) {
        peds[index].pos.set(x, 0, z);
        peds[index].heading = angle;
    }
}
