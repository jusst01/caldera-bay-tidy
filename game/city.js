import * as THREE from './three.module.min.js';

// Seeded RNG: mulberry32
export function createRNG(seed) {
    return function() {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

// Ground height field
export function groundHeight(x, z) {
    // Flat harbour bowl rising to Alto Verde + La Cumbre
    let h = 0;
    // La Cumbre ridge (0, -500)
    const distCumbre = Math.sqrt(x*x + (z+500)*(z+500));
    if (distCumbre < 200) h += (200 - distCumbre) * 0.5;
    // Alto Verde (300, -300)
    const distVerde = Math.sqrt((x-300)*(x-300) + (z+300)*(z+300));
    if (distVerde < 150) h += (150 - distVerde) * 0.3;
    return h;
}

// District at (x, z)
export function districtAt(x, z) {
    if (x < 0 && z > 0) return 'muelle';
    if (x > 0 && z > 0) return 'paseo';
    if (x > 0 && z < 0) return 'verde';
    if (x < 0 && z < 0) return 'ceniza';
    return 'cumbre';
}

// Collision management
const buildings = []; // {x, z, r}

export function collideCircle(x, z, radius) {
    for (const b of buildings) {
        const dx = b.x - x;
        const dz = b.z - z;
        if (Math.sqrt(dx*dx + dz*dz) < b.r + radius) return true;
    }
    return false;
}

export function eject(x, z, radius) {
    // Simplified ejection
    return {x, z};
}

// Global scene objects
let sun, hemi, ambient;

export function buildCity(scene, seed) {
    const rng = createRNG(seed);

    // 1. Ground plane
    const planeGeom = new THREE.PlaneGeometry(1500, 1500);
    const planeMat = new THREE.MeshStandardMaterial({color: 0x7A5F42});
    const ground = new THREE.Mesh(planeGeom, planeMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // 2. Volcano
    const volcanoGeom = new THREE.ConeGeometry(220, 220, 32);
    const volcanoMat = new THREE.MeshStandardMaterial({color: 0x37303E, emissive: 0x221100});
    const volcano = new THREE.Mesh(volcanoGeom, volcanoMat);
    volcano.position.set(0, 110, -500);
    scene.add(volcano);

    // 3. Lighting
    sun = new THREE.DirectionalLight(0xFFB066, 2.3);
    sun.castShadow = true;
    sun.shadow.camera.left = -130;
    sun.shadow.camera.right = 130;
    sun.shadow.camera.top = 130;
    sun.shadow.camera.bottom = -130;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    scene.add(sun);

    hemi = new THREE.HemisphereLight(0x8A63B8, 0x40302A, 0.5);
    scene.add(hemi);

    ambient = new THREE.AmbientLight(0x403050, 0.35);
    scene.add(ambient);

    scene.fog = new THREE.FogExp2(0xD97A44, 0.0020);

    // 4. Buildings (Placeholder for ~774 instances)
    // Would iterate and add to InstancedMesh here...
}

export function updateSun(subject) {
    if (sun) {
        sun.position.set(subject.x - 120, subject.y + 95, subject.z + 260);
        sun.target = subject;
    }
}

export function setFinaleDusk(on) {
    const factor = on ? 1.4 : 1.0;
    sun.intensity = 2.3 * factor;
    hemi.intensity = 0.5 * factor;
}
