import * as THREE from './three.module.min.js';

function createRNG(seed) {
  return function() {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | Math.imul(seed ^ (seed >>> 13), 61));
    return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
  };
}

function groundHeight(x, z) {
  const d = Math.sqrt(x * x + z * z);
  const bowl = Math.max(0, 100 - d * 0.2);
  const ridge = Math.max(0, (z + 500) * 0.1, (x - 300) * 0.1);
  return bowl + ridge;
}

function districtAt(x, z) {
  const dists = {
    muelle: [-300, 300],
    paseo: [330, 60],
    verde: [300, -300],
    ceniza: [-300, -300],
    cumbre: [0, -500]
  };
  let closest = 'muelle';
  let minD = Infinity;
  for (const [id, [dx, dz]] of Object.entries(dists)) {
    const d = Math.hypot(x - dx, z - dz);
    if (d < minD) { minD = d; closest = id; }
  }
  return closest;
}

function collideCircle(x, z, radius) {
  // Simplistic collider: assume buildings at grid points
  const gx = Math.floor(x / 64) * 64;
  const gz = Math.floor(z / 64) * 64;
  return Math.abs(x - gx) < radius + 10 || Math.abs(z - gz) < radius + 10;
}

function eject(x, z, radius) {
  let nx = x, nz = z;
  while (collideCircle(nx, nz, radius)) {
    nx += 64; nz += 64;
  }
  return [nx, nz];
}

const sunLight = new THREE.DirectionalLight(0xFFB066, 2.3);
const hemiLight = new THREE.HemisphereLight(0x8A63B8, 0x40302A, 0.5);
const ambientLight = new THREE.AmbientLight(0x403050, 0.35);

function buildCity(scene, seed) {
  const rng = createRNG(seed);

  // Ground
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(1500, 1500),
    new THREE.MeshStandardMaterial({ color: 0x7A5F42 })
  );
  plane.rotation.x = -Math.PI / 2;
  scene.add(plane);

  // Buildings (InstancedMeshes)
  const geometries = [new THREE.BoxGeometry(20, 50, 20), new THREE.BoxGeometry(25, 60, 25), new THREE.BoxGeometry(30, 70, 30), new THREE.BoxGeometry(20, 80, 20)];
  const material = new THREE.MeshStandardMaterial({
    color: 0x555555,
    emissive: 0xFFB066,
    emissiveIntensity: 1.0
  });

  geometries.forEach((geo, i) => {
    const mesh = new THREE.InstancedMesh(geo, material, 200);
    for (let j = 0; j < 200; j++) {
      const x = (rng() - 0.5) * 1000;
      const z = (rng() - 0.5) * 1000;
      const y = groundHeight(x, z) + 25;
      const matrix = new THREE.Matrix4().setPosition(x, y, z);
      mesh.setMatrixAt(j, matrix);
    }
    scene.add(mesh);
  });

  // Volcano
  const volcano = new THREE.Mesh(
    new THREE.ConeGeometry(200, 220),
    new THREE.MeshStandardMaterial({ color: 0x37303E, emissive: 0xFF6A1A, emissiveIntensity: 0.5 })
  );
  volcano.position.set(0, 110, -600);
  scene.add(volcano);

  // Lighting
  sunLight.position.set(-120, 95, 260);
  scene.add(sunLight, hemiLight, ambientLight);
}

function updateSun(subjectPosition) {
  sunLight.position.set(subjectPosition.x - 120, subjectPosition.y + 95, subjectPosition.z + 260);
  sunLight.target.position.copy(subjectPosition);
}

function setFinaleDusk(on) {
  const multiplier = on ? 1.4 : 1.0;
  sunLight.intensity = 2.3 * multiplier;
}

export { createRNG, groundHeight, districtAt, collideCircle, eject, buildCity, updateSun, setFinaleDusk };
