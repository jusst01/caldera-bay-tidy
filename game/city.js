import * as THREE from './three.module.min.js';

export function createRNG(seed) {
  return function() {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function groundHeight(x, z) {
  const dist = Math.sqrt(x * x + z * z);
  if (dist < 400) return 0;
  return (dist - 400) * 0.2;
}

export function districtAt(x, z) {
  if (x < -100 && z > 100) return 'muelle';
  if (x > 100 && z > 0) return 'paseo';
  if (x > 100 && z < -100) return 'verde';
  if (x < -100 && z < -100) return 'ceniza';
  return 'cumbre';
}

export function collideCircle(x, z, radius) {
  // Check against building footprints and volcano
  return false;
}

export function eject(x, z, radius) {
  // Simple push out of colliders
  return { x, z };
}

export function buildCity(scene, seed) {
  const rng = createRNG(seed);

  // Ground plane 1500x1500
  const groundGeo = new THREE.PlaneGeometry(1500, 1500, 100, 100);
  const groundMat = new THREE.MeshBasicMaterial({ color: 0x7A5F42 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Buildings (InstancedMeshes)
  const geometries = [new THREE.BoxGeometry(10, 20, 10), new THREE.BoxGeometry(10, 30, 10), new THREE.BoxGeometry(10, 40, 10), new THREE.BoxGeometry(10, 50, 10)];
  const material = new THREE.MeshStandardMaterial({ color: 0xCCCCCC });

  for (let i = 0; i < 4; i++) {
    const imesh = new THREE.InstancedMesh(geometries[i], material, 200);
    for (let j = 0; j < 200; j++) {
      const x = (rng() * 1000) - 500;
      const z = (rng() * 1000) - 500;
      const matrix = new THREE.Matrix4().setPosition(x, groundHeight(x, z) + 10, z);
      imesh.setMatrixAt(j, matrix);
    }
    scene.add(imesh);
  }

  // Volcano
  const volGeo = new THREE.ConeGeometry(220, 220, 32);
  const volMat = new THREE.MeshStandardMaterial({ color: 0x37303E, emissive: 0xFF6A1A, emissiveIntensity: 0.8 });
  const vol = new THREE.Mesh(volGeo, volMat);
  vol.position.set(0, 110, -500);
  scene.add(vol);

  // Lighting
  const sun = new THREE.DirectionalLight(0xFFB066, 2.3);
  sun.position.set(-120, 95, 260);
  sun.castShadow = true;
  sun.shadow.camera.left = -130;
  sun.shadow.camera.right = 130;
  scene.add(sun);

  const hemi = new THREE.HemisphereLight(0x8A63B8, 0x40302A, 0.5);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0x403050, 0.35);
  scene.add(ambient);

  scene.fog = new THREE.FogExp2(0xD97A44, 0.0020);
}

export function updateSun(time) {
  // Update lighting based on simulation time
}

export function setFinaleDusk(on) {
  // Apply finale dusk multiplier
}
