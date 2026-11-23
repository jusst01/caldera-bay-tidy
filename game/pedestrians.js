import * as THREE from './three.module.min.js';

let peds = [];
let sceneRef = null;
let rngSeed = 1337;

function seededRng() {
    rngSeed = (rngSeed * 1664525 + 1013904223) | 0;
    return (rngSeed >>> 0) / 4294967296;
}

const ARCHETYPES = [
    { name: 'worker', hp: 30, minMoney: 5, maxMoney: 20, color: 0x3366cc },
    { name: 'tourist', hp: 30, minMoney: 10, maxMoney: 40, color: 0xcc9933 },
    { name: 'thug', hp: 45, minMoney: 20, maxMoney: 40, color: 0x663333 }
];

export function initPedestrians(scene) {
    sceneRef = scene;
    peds = [];
    for (let i = 0; i < 48; i++) {
        spawnPedestrian();
    }
}

function spawnPedestrian(overridePos) {
    if (!sceneRef) return;
    const arch = ARCHETYPES[Math.floor(seededRng() * ARCHETYPES.length)];
    const angle = seededRng() * Math.PI * 2;
    const dist = 30 + seededRng() * 120;
    const x = overridePos ? overridePos.x + (seededRng() - 0.5) * 40 : Math.cos(angle) * dist;
    const z = overridePos ? overridePos.z + (seededRng() - 0.5) * 40 : Math.sin(angle) * dist;
    const y = 0;

    const group = new THREE.Group();
    const torsoMat = new THREE.MeshLambertMaterial({ color: arch.color });
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffcc99 });

    const torsoGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 6);
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 0.6;
    group.add(torso);

    const headGeo = new THREE.SphereGeometry(0.2, 6, 6);
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.35;
    group.add(head);

    group.position.set(x, y, z);
    sceneRef.add(group);

    peds.push({
        mesh: group,
        archetype: arch.name,
        hp: arch.hp,
        maxHp: arch.hp,
        money: Math.floor(arch.minMoney + seededRng() * (arch.maxMoney - arch.minMoney)),
        state: 'walk',
        targetAngle: seededRng() * Math.PI * 2,
        speed: 1.2 + seededRng() * 0.8,
        fleeTimer: 0
    });
}

export function updatePedestrians(dt, playerPos, playerVel, gunshots, heatLevel) {
    if (!sceneRef) return;
    for (let i = 0; i < peds.length; i++) {
        const p = peds[i];
        if (p.state === 'down') continue;

        const dx = p.mesh.position.x - playerPos.x;
        const dz = p.mesh.position.z - playerPos.z;
        const distSq = dx * dx + dz * dz;

        if (distSq > 170 * 170) {
            const angle = seededRng() * Math.PI * 2;
            const dist = 60 + seededRng() * 80;
            p.mesh.position.x = playerPos.x + Math.cos(angle) * dist;
            p.mesh.position.z = playerPos.z + Math.sin(angle) * dist;
            p.mesh.position.y = 0;
            p.hp = p.maxHp;
            p.state = 'walk';
            continue;
        }

        let fleeing = false;
        if (gunshots && gunshots.length > 0) {
            for (let g = 0; g < gunshots.length; g++) {
                const gs = gunshots[g];
                const gdx = p.mesh.position.x - gs.x;
                const gdz = p.mesh.position.z - gs.z;
                if (gdx * gdx + gdz * gdz < 60 * 60) {
                    fleeing = true;
                    break;
                }
            }
        }
        if (heatLevel >= 3 && distSq < 20 * 20) {
            fleeing = true;
        }

        if (fleeing) {
            p.state = 'flee';
            p.fleeTimer = 3.0;
            const angleToPlayer = Math.atan2(dz, dx);
            p.targetAngle = angleToPlayer + (seededRng() - 0.5) * 0.5;
            p.speed = 3.5;
        } else if (p.state === 'flee') {
            p.fleeTimer -= dt;
            if (p.fleeTimer <= 0) {
                p.state = 'walk';
                p.speed = 1.2 + seededRng() * 0.8;
            }
        } else {
            if (seededRng() < 0.02) {
                p.targetAngle += (seededRng() - 0.5) * Math.PI;
            }
        }

        const moveDist = p.speed * dt;
        p.mesh.position.x += Math.cos(p.targetAngle) * moveDist;
        p.mesh.position.z += Math.sin(p.targetAngle) * moveDist;
        p.mesh.rotation.y = -p.targetAngle + Math.PI / 2;
    }
}

export function witnessesAt(pos, radius) {
    let count = 0;
    const rSq = radius * radius;
    for (let i = 0; i < peds.length; i++) {
        const p = peds[i];
        if (p.state === 'down') continue;
        const dx = p.mesh.position.x - pos.x;
        const dz = p.mesh.position.z - pos.z;
        if (dx * dx + dz * dz <= rSq) {
            count++;
        }
    }
    return count;
}

export function getPedestrians() {
    return peds;
}

export function damagePedestrian(ped, damage) {
    if (!ped || ped.state === 'down') return false;
    ped.hp -= damage;
    if (ped.hp <= 0) {
        ped.state = 'down';
        ped.mesh.rotation.x = Math.PI / 2;
        ped.mesh.position.y = 0.2;
        return true;
    }
    ped.state = 'flee';
    ped.fleeTimer = 5.0;
    ped.speed = 4.0;
    return false;
}

export function debugSetPed(index, x, z, angle) {
    if (index >= 0 && index < peds.length) {
        const p = peds[index];
        p.mesh.position.set(x, 0, z);
        p.x = x;
        p.z = z;
        p.targetAngle = angle;
        p.mesh.rotation.y = -angle + Math.PI / 2;
        p.state = 'walk';
        p.hp = p.maxHp;
    }
}

// End of module validation helper
export function validatePedestriansState() {
    return peds.length > 0;
}
