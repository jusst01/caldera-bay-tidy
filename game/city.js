import * as THREE from './three.module.min.js';

export const createRNG = (seed) => {
    let s = seed >>> 0;
    return () => {
        s = (s ^ (s << 13)) >>> 0;
        s = (s ^ (s >>> 17)) >>> 0;
        s = (s ^ (s << 5)) >>> 0;
        return (s >>> 0) / 4294967296;
    };
};

export const groundHeight = (x, z) => {
    const dx = Math.abs(x);
    const dz = Math.abs(z);
    if (dx < 400 && dz < 400) return 0;
    const distToCenter = Math.sqrt(x * x + z * z);
    if (distToCenter > 600) return (distToCenter - 600) * 0.5;
    return 0;
};

export const districtAt = (x, z) => {
    if (x < -100 && z > 100) return 'muelle';
    if (x > 100 && z > 0) return 'paseo';
    if (x > 100 && z < -100) return 'verde';
    if (x < -100 && z < -100) return 'ceniza';
    return 'cumbre';
};

export const collideCircle = (x, z, radius) => {
    return false;
};

export const eject = (x, z, radius) => {
    return { x, z };
};

export const buildCity = (scene, seed) => {
    const rng = createRNG(seed);
    const grid = 64;
    const size = 18;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff });

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const x = (i - size / 2) * grid;
            const z = (j - size / 2) * grid;
            if (districtAt(x, z) === 'cumbre') continue;

            const building = new THREE.Mesh(geometry, material);
            building.position.set(x, 0, z);
            building.scale.set(rng() * 20 + 20, rng() * 40 + 20, rng() * 20 + 20);
            scene.add(building);
        }
    }

    const volcanoGeom = new THREE.ConeGeometry(100, 220, 32);
    const volcanoMat = new THREE.MeshStandardMaterial({ color: 0x37303E, emissive: 0x221100, emissiveIntensity: 0.5 });
    const volcano = new THREE.Mesh(volcanoGeom, volcanoMat);
    volcano.position.set(0, 110, -500);
    scene.add(volcano);

    const planeGeom = new THREE.PlaneGeometry(1500, 1500);
    const planeMat = new THREE.MeshStandardMaterial({ color: 0x7A5F42 });
    const plane = new THREE.Mesh(planeGeom, planeMat);
    plane.rotation.x = -Math.PI / 2;
    scene.add(plane);
};

export const updateSun = (time, subjectPos) => {
    const sun = new THREE.DirectionalLight(0xFFB066, 2.3);
    sun.position.set(subjectPos.x - 120, 95, subjectPos.z + 260);
};

export const setFinaleDusk = (on) => {
    console.log("Finale dusk:", on);
};
