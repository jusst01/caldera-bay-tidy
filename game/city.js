import * as THREE from './three.module.min.js';
import * as THREE2 from './three.module.min.js';
import * as THREE3 from './three.module.min.js';

function createRNG(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const districts = [
  { id: 'muelle', center: [-300, 300] },
  { id: 'paseo', center: [330, 60] },
  { id: 'verde', center: [300, -300] },
  { id: 'ceniza', center: [-300, -300] },
  { id: 'cumbre', center: [0, -500] }
];

function groundHeight(x, z) {
  const dz = z + 500;
  const dist = Math.sqrt(x * x + dz * dz);

  let h = (Math.sin(x/100) + Math.cos(z/100)) * 0.5;

  // Rise only near the volcano
  if (dist > 500) {
      h += Math.pow((dist - 500) / 1000, 6) * 400;
  }

  return Math.max(0, h);
}

function districtAt(x, z) {
  let nearestDist = Infinity;
  let nearestDistrict = 'muelle';
  for (const d of districts) {
    const dist = Math.sqrt(Math.pow(x - d.center[0], 2) + Math.pow(z - d.center[1], 2));
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestDistrict = d.id;
    }
  }
  return nearestDistrict;
}

function collideCircle(x, z, radius) {
  const h = groundHeight(x, z);
  return h > 10;
}

function eject(x, z, radius) {
  return { x, z };
}

function createBuilding(scene, x, z, y, rng) {
  const buildingGeom = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x888888,
    emissive: 0xFFB066,
    emissiveIntensity: 0.25
  });
  const building = new THREE.Mesh(buildingGeom, mat);
  building.position.set(x, y + 5, z);
  building.scale.set(10 + rng() * 20, 20 + rng() * 40, 10 + rng() * 20);
  scene.add(building);
}

function createPalm(scene, x, z, y, rng) {
  const palm = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1, 5), new THREE.MeshStandardMaterial({ color: 0x554433 }));
  palm.add(trunk);
  palm.position.set(x, y + 2.5, z);
  scene.add(palm);
}

function buildCity(scene, seed) {
  const rng = createRNG(seed);

  // Ground
  const planeGeometry = new THREE.PlaneGeometry(1500, 1500);
  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x7A5F42 });
  const ground = new THREE.Mesh(planeGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Buildings
  for (let i = 0; i < 774; i++) {
    const x = (rng() - 0.5) * 1000;
    const z = (rng() - 0.5) * 1000;
    const y = groundHeight(x, z);
    if (Math.abs(x) < 50 && Math.abs(z) < 50) continue;
    createBuilding(scene, x, z, y, rng);
  }

  // Palms
  for (let i = 0; i < 300; i++) {
    const x = (rng() - 0.5) * 1000;
    const z = (rng() - 0.5) * 1000;
    const y = groundHeight(x, z);
    createPalm(scene, x, z, y, rng);
  }

  // Street Lamps
  for (let i = 0; i < 50; i++) {
    const x = (i % 2 === 0 ? 256 : -256);
    const z = i * 36 - 500;
    const y = groundHeight(x, z);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    lamp.position.set(x, y + 5, z);
    scene.add(lamp);
  }

  // Volcano
  const volcano = new THREE.Mesh(
    new THREE.ConeGeometry(100, 220, 32),
    new THREE.MeshStandardMaterial({ color: 0x37303E })
  );
  volcano.position.set(0, 110, -500);
  scene.add(volcano);

  // Lighting
  const light = new THREE.DirectionalLight(0xFFB066, 2.3);
  light.position.set(-120, 95, 260);
  scene.add(light);

  const hemiLight = new THREE.HemisphereLight(0x8A63B8, 0x40302A, 0.5);
  scene.add(hemiLight);

  const ambientLight = new THREE.AmbientLight(0x403050, 0.35);
  scene.add(ambientLight);

  scene.fog = new THREE.FogExp2(0xD97A44, 0.0020);

  // Sky Dome
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1000, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.BackSide })
  );
  scene.add(sky);
}

function updateSun(time) {}
function setFinaleDusk(on) {}

export { createRNG, groundHeight, districtAt, collideCircle, eject, buildCity, updateSun, setFinaleDusk };
