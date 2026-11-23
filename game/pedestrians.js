import * as THREE from './three.module.min.js';
import { groundHeight } from './city.js';

let seed = 1337;
function seededRandom() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

const ARCHETYPES = [
    { type: 'Docker', color: 0x335577, speed: 1.4 },
    { type: 'Fisher', color: 0x448866, speed: 1.2 },
    { type: 'Tourist', color: 0xCC6633, speed: 1.0 },
    { type: 'Vendor', color: 0x994499, speed: 1.3 },
    { type: 'Student', color: 0x3366CC, speed: 1.6 },
    { type: 'Guard', color: 0x222222, speed: 1.5 },
    { type: 'Mechanic', color: 0x885522, speed: 1.3 },
    { type: 'Surfer', color: 0xCCAA33, speed: 1.7 }
];

let peds = [];

export function initPedestrians(scene) {
    peds = [];
    seed = 1337;

    for (let i = 0; i < 48; i++) {
        const arch = ARCHETYPES[i % ARCHETYPES.length];

        // City-wide distribution across 1152m map (-550 to 550) snapped near streets
        const rx = (seededRandom() - 0.5) * 1050;
        const rz = (seededRandom() - 0.5) * 1050;
        const x = Math.round(rx / 16) * 16 + (seededRandom() > 0.5 ? 4 : -4);
        const z = Math.round(rz / 16) * 16 + (seededRandom() > 0.5 ? 4 : -4);
        const y = typeof groundHeight === 'function' ? groundHeight(x, z) : 0;

        const angle = seededRandom() * Math.PI * 2;
        const speed = arch.speed * (0.8 + seededRandom() * 0.4);

        const group = new THREE.Group();

        // Capsule/cylinder body + head meshes
        const bodyGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8);
        const bodyMat = new THREE.MeshLambertMaterial({ color: arch.color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.6;
        body.castShadow = true;
        group.add(body);

        const headGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const headMat = new THREE.MeshLambertMaterial({ color: 0xffdbac });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.35;
        group.add(head);

        // Limbs for walk animation
        const leftLegGeo = new THREE.BoxGeometry(0.15, 0.6, 0.15);
        const rightLegGeo = new THREE.BoxGeometry(0.15, 0.6, 0.15);
        const legMat = new THREE.MeshLambertMaterial({ color: 0x222233 });
        const leftLeg = new THREE.Mesh(leftLegGeo, legMat);
        leftLeg.position.set(-0.15, 0.3, 0);
        const rightLeg = new THREE.Mesh(rightLegGeo, legMat);
        rightLeg.position.set(0.15, 0.3, 0);
        group.add(leftLeg);
        group.add(rightLeg);

        group.position.set(x, y, z);
        group.rotation.y = angle;

        if (scene && typeof scene.add === 'function') {
            scene.add(group);
        }

        peds.push({
            x,
            z,
            y,
            angle,
            speed,
            state: 'wandering',
            hp: 100,
            maxHp: 100,
            type: arch.type,
            mesh: group,
            leftLeg,
            rightLeg,
            walkTimer: seededRandom() * 10
        });
    }
    return peds;
}

export function updatePedestrians(dt, playerPos, heatLevel) {
    const time = Date.now() * 0.001;
    for (let i = 0; i < peds.length; i++) {
        const p = peds[i];
        if (p.state === 'down') {
            if (p.mesh) {
                p.mesh.rotation.z = Math.PI / 2;
                p.mesh.position.y = p.y + 0.2;
            }
            continue;
        }

        // Witness fleeing at high heat
        if (heatLevel > 2 && playerPos) {
            const dx = p.x - playerPos.x;
            const dz = p.z - playerPos.z;
            const distSq = dx * dx + dz * dz;
            if (distSq < 2500) {
                p.state = 'fleeing';
                p.angle = Math.atan2(dx, dz);
            }
        } else if (p.state === 'fleeing' && heatLevel <= 1) {
            p.state = 'wandering';
        }

        if (p.state === 'wandering') {
            p.walkTimer += dt;
            if (p.walkTimer > 5) {
                p.walkTimer = 0;
                p.angle += (seededRandom() - 0.5) * 1.5;
            }
        }

        const moveSpeed = p.state === 'fleeing' ? p.speed * 2.2 : p.speed;
        p.x += Math.sin(p.angle) * moveSpeed * dt;
        p.z += Math.cos(p.angle) * moveSpeed * dt;

        if (p.x < -550 || p.x > 550 || p.z < -550 || p.z > 550) {
            p.angle += Math.PI;
            p.x = Math.max(-550, Math.min(550, p.x));
            p.z = Math.max(-550, Math.min(550, p.z));
        }

        p.y = typeof groundHeight === 'function' ? groundHeight(p.x, p.z) : 0;

        // Sync mesh position & rotation EVERY call
        if (p.mesh) {
            p.mesh.position.set(p.x, p.y, p.z);
            p.mesh.rotation.y = p.angle;

            if (p.state === 'wandering' || p.state === 'fleeing') {
                const swing = Math.sin(time * moveSpeed * 8) * 0.4;
                if (p.leftLeg) p.leftLeg.rotation.x = swing;
                if (p.rightLeg) p.rightLeg.rotation.x = -swing;
            }
        }
    }
}

export function witnessesAt(x, z, radius) {
    const calmPeds = [];
    const rSq = radius * radius;
    for (let i = 0; i < peds.length; i++) {
        const p = peds[i];
        if (p.state === 'wandering' && p.hp > 0) {
            const dx = p.x - x;
            const dz = p.z - z;
            if (dx * dx + dz * dz <= rSq) {
                calmPeds.push(p);
            }
        }
    }
    return calmPeds;
}

export function getPedestrians() {
    return peds;
}

export function damagePedestrian(ped, amount) {
    if (!ped) return;
    ped.hp = Math.max(0, ped.hp - amount);
    if (ped.hp === 0) {
        ped.state = 'down';
        if (ped.mesh) {
            ped.mesh.rotation.z = Math.PI / 2;
            ped.mesh.position.y = ped.y + 0.2;
        }
    }
}

export function debugSetPed(index, x, z, angle) {
    if (index >= 0 && index < peds.length) {
        const p = peds[index];
        p.x = x;
        p.z = z;
        p.y = typeof groundHeight === 'function' ? groundHeight(x, z) : 0;
        if (angle !== undefined) {
            p.angle = angle;
        }
        if (p.mesh) {
            p.mesh.position.set(p.x, p.y, p.z);
            p.mesh.rotation.y = p.angle;
        }
    }
}
