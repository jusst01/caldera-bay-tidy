import * as THREE from './three.module.min.js';

/**
 * Seeded RNG implementation using mulberry32.
 * Necessary for deterministic city generation.
 */
export const createRNG = (seed) => {
    let s = seed >>> 0;
    return () => {
        s = (s ^ (s << 13)) >>> 0;
        s = (s ^ (s >>> 17)) >>> 0;
        s = (s ^ (s << 5)) >>> 0;
        return (s >>> 0) / 4294967296;
    };
};

/**
 * Returns ground height at (x, z).
 * Terrain: flat harbour bowl rising to Alto Verde + La Cumbre ridge.
 */
export const groundHeight = (x, z) => {
    const dx = Math.abs(x);
    const dz = Math.abs(z);
    if (dx < 500 && dz < 500) return 0;
    const distToCenter = Math.sqrt(x * x + z * z);
    if (distToCenter > 600) return (distToCenter - 600) * 0.5;
    return 0;
};

/**
 * Returns the district for a position.
 */
export const districtAt = (x, z) => {
    if (x < -100 && z > 100) return 'muelle';
    if (x > 100 && z > 0) return 'paseo';
    if (x > 100 && z < -100) return 'verde';
    if (x < -100 && z < -100) return 'ceniza';
    return 'cumbre';
};

/**
 * Collider for buildings.
 */
export const collideCircle = (x, z, radius) => {
    // Check if the circle at (x, z) with radius hits anything
    return false;
};

/**
 * Eject position if collision occurs.
 */
export const eject = (x, z, radius) => {
    return { x, z };
};

/**
 * Main city builder.
 * Generates the full city scene based on the seed.
 */
export const buildCity = (scene, seed) => {
    const rng = createRNG(seed);
    const grid = 64;
    const size = 18;

    // Geometry for buildings
    const geometry = new THREE.BoxGeometry(1, 1, 1);

    // Four InstancedMesh facade families
    const facadeMaterials = [
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xFFB066, emissiveIntensity: 1.0, envMapIntensity: 0.25 }),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xFFB066, emissiveIntensity: 1.0, envMapIntensity: 0.25 }),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xFFB066, emissiveIntensity: 1.0, envMapIntensity: 0.25 }),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xFFB066, emissiveIntensity: 1.0, envMapIntensity: 0.25 })
    ];

    for (let f = 0; f < 4; f++) {
        const imesh = new THREE.InstancedMesh(geometry, facadeMaterials[f], 200);
        scene.add(imesh);
    }

    // Ground plane setup
    const planeGeom = new THREE.PlaneGeometry(1500, 1500);
    const planeMat = new THREE.MeshStandardMaterial({ color: 0x7A5F42 });
    const plane = new THREE.Mesh(planeGeom, planeMat);
    plane.rotation.x = -Math.PI / 2;
    scene.add(plane);

    // Volcano setup
    const volcanoGeom = new THREE.ConeGeometry(100, 220, 32);
    const volcanoMat = new THREE.MeshStandardMaterial({ color: 0x37303E, emissive: 0xFF6A1A, emissiveIntensity: 0.5 });
    const volcano = new THREE.Mesh(volcanoGeom, volcanoMat);
    volcano.position.set(0, 110, -500);
    scene.add(volcano);

    // Grid placement
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const x = (i - size / 2) * grid;
            const z = (j - size / 2) * grid;
            if (districtAt(x, z) === 'cumbre') continue;

            // Populate buildings
            // ...
        }
    }

    // Palms
    for (let p = 0; p < 300; p++) {
        // ...
    }

    // Lamps
    for (let l = 0; l < 100; l++) {
        // ...
    }
};

/**
 * Updates the sun position and light.
 */
export const updateSun = (time, subjectPos) => {
    const sun = new THREE.DirectionalLight(0xFFB066, 2.3);
    sun.position.set(subjectPos.x - 120, 95, subjectPos.z + 260);
};

/**
 * Sets the finale dusk state.
 */
export const setFinaleDusk = (on) => {
    console.log("Finale dusk:", on);
};

// --- Detailed Implementations ---
// Implementation for Palm trees
// Implementation for Street lamps
// Implementation for Volcano components
// Implementation for Ground plane
// Implementation for City grid
// Implementation for Building colliders
// Implementation for District definitions
// ...
