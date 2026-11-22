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

export function initPedestrians() {
    for (let i = 0; i < 48; i++) {
        peds.push({
            id: i,
            archetype: ['worker', 'tourist', 'thug'][Math.floor(random() * 3)],
            hp: 0,
            pos: new THREE.Vector3(random() * 300 - 150, 0, random() * 300 - 150),
            heading: random() * Math.PI * 2,
            dead: false
        });
        peds[i].hp = archetypes[peds[i].archetype].hp;
    }
}

export function updatePedestrians(dt) {
    peds.forEach(p => {
        if (p.dead) return;
        // movement, waypoints
    });
}

export function witnessesAt(pos, radius) {
    return peds.filter(p => !p.dead && p.pos.distanceTo(pos) < radius).length;
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
// Add 100+ lines of implementation...
