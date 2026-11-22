import * as THREE from './three.module.min.js';

/**
 * Caldera Bay City Module (v2 art city, sky, light rig)
 * Authoritative implementation providing seeded world build, ground height,
 * districts, building colliders, sun tracking, and finale dusk.
 */

export function createRNG(seed) {
  let s = seed | 0;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Ground height field: flat harbour bowl rising to Alto Verde + La Cumbre ridge / volcano.
 */
export function groundHeight(x, z) {
  let h = 0;
  // Volcano cone near (0, -500), radius 220m, height 220m
  const dx = x;
  const dz = z - (-500);
  const distVolc = Math.sqrt(dx * dx + dz * dz);
  if (distVolc < 220) {
    const f = 1 - distVolc / 220;
    h += 220 * Math.pow(f, 1.6);
  }
  // Southern ridge / Alto Verde / Cumbre elevation
  if (z < -50) {
    const sFactor = Math.min(1, (-50 - z) / 450);
    h += sFactor * (45 + 25 * Math.sin(x * 0.008) * Math.cos(z * 0.008));
  }
  // Rolling terrain / harbour bowl
  h += Math.sin(x * 0.004) * Math.cos(z * 0.004) * 12;
  return Math.max(0, h);
}

/**
 * District lookup for the five districts: muelle, paseo, verde, ceniza, cumbre.
 * Centres: [-300,300] / [330,60] / [300,-300] / [-300,-300] / [0,-500]
 */
export function districtAt(x, z) {
  const ds = [
    { id: 'muelle', cx: -300, cz: 300 },
    { id: 'paseo', cx: 330, cz: 60 },
    { id: 'verde', cx: 300, cz: -300 },
    { id: 'ceniza', cx: -300, cz: -300 },
    { id: 'cumbre', cx: 0, cz: -500 }
  ];
  let best = 'muelle';
  let minDist = Infinity;
  for (const d of ds) {
    const dist = Math.hypot(x - d.cx, z - d.cz);
    if (dist < minDist) {
      minDist = dist;
      best = d.id;
    }
  }
  return best;
}

const buildingColliders = [];

export function collideCircle(x, z, radius) {
  for (const b of buildingColliders) {
    const dx = x - b.x;
    const dz = z - b.z;
    if (Math.hypot(dx, dz) < radius + b.radius) {
      return true;
    }
  }
  return false;
}

export function eject(x, z, radius) {
  let px = x;
  let pz = z;
  for (const b of buildingColliders) {
    const dx = px - b.x;
    const dz = pz - b.z;
    const dist = Math.hypot(dx, dz);
    const minDist = radius + b.radius;
    if (dist < minDist && dist > 0.0001) {
      const ov = minDist - dist;
      px += (dx / dist) * ov;
      pz += (dz / dist) * ov;
    } else if (dist <= 0.0001) {
      px += minDist;
    }
  }
  return { x: px, z: pz };
}

let sunLight = null;
let hemiLight = null;
let ambientLight = null;
let sceneRef = null;

/**
 * Builds the seeded world city, roads, buildings, palms, street lamps, volcano, sky, and light rig.
 */
export function buildCity(scene, rng) {
  sceneRef = scene;
  buildingColliders.length = 0;

  // 1. Ground Plane (1500x1500) with canvas texture
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Sand background (#7A5F42)
  ctx.fillStyle = '#7A5F42';
  ctx.fillRect(0, 0, 1024, 1024);

  // Asphalt strips (#2C2A27) - 15m grid on 64m spacing offset -576
  ctx.fillStyle = '#2C2A27';
  for (let c = -576; c <= 924; c += 64) {
    const px = ((c + 576) / 1500) * 1024;
    const pw = (15 / 1500) * 1024;
    ctx.fillRect(px - pw/2, 0, pw, 1024);
    ctx.fillRect(0, px - pw/2, 1024, pw);
  }

  // Sidewalks (#8A7A64) - 1.2m outside asphalt
  ctx.fillStyle = '#8A7A64';
  for (let c = -576; c <= 924; c += 64) {
    const px = ((c + 576) / 1500) * 1024;
    const pw = (15 / 1500) * 1024;
    const sw = (1.2 / 1500) * 1024;
    ctx.fillRect(px - pw/2 - sw, 0, sw, 1024);
    ctx.fillRect(px + pw/2, 0, sw, 1024);
    ctx.fillRect(0, px - pw/2 - sw, 1024, sw);
    ctx.fillRect(0, px + pw/2, 1024, sw);
  }

  const groundTex = new THREE.CanvasTexture(canvas);
  groundTex.wrapS = THREE.RepeatWrapping;
  groundTex.wrapT = THREE.RepeatWrapping;

  const groundGeo = new THREE.PlaneGeometry(1500, 1500, 64, 64);
  groundGeo.rotateX(-Math.PI / 2);
  const posAttr = groundGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    posAttr.setY(i, groundHeight(vx, vz));
  }
  groundGeo.computeVertexNormals();

  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    roughness: 0.9,
    metalness: 0.1
  });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  // 2. Facade Textures & Instanced Buildings (~774 buildings, 4 families)
  const facadeMats = [];
  for (let f = 0; f < 4; f++) {
    const fCanvas = document.createElement('canvas');
    fCanvas.width = 256;
    fCanvas.height = 256;
    const fCtx = fCanvas.getContext('2d');

    const baseColors = ['#4A4642', '#3E424A', '#4A3E3E', '#3E4A42'];
    fCtx.fillStyle = baseColors[f];
    fCtx.fillRect(0, 0, 256, 256);

    const cols = 6;
    const rows = 10;
    const cw = 256 / cols;
    const ch = 256 / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const rnd = rng();
        if (rnd < 0.65) {
          const wRnd = rng();
          if (wRnd < 0.7) fCtx.fillStyle = '#FFC46B';
          else if (wRnd < 0.9) fCtx.fillStyle = '#BFE3FF';
          else fCtx.fillStyle = '#FFE9B0';
          fCtx.fillRect(c * cw + 4, r * ch + 4, cw - 8, ch - 8);
        } else {
          fCtx.fillStyle = '#1A1A1A';
          fCtx.fillRect(c * cw + 4, r * ch + 4, cw - 8, ch - 8);
        }
      }
    }

    const fTex = new THREE.CanvasTexture(fCanvas);
    const mat = new THREE.MeshStandardMaterial({
      map: fTex,
      emissive: new THREE.Color(0xFFB066),
      emissiveMap: fTex,
      emissiveIntensity: 1.0,
      envMapIntensity: 0.25,
      roughness: 0.5
    });
    facadeMats.push(mat);
  }

  const bGeo = new THREE.BoxGeometry(1, 1, 1);
  const familyInstances = [[], [], [], []];
  const spawnClearRadius = 60;

  for (let gx = -8; gx <= 8; gx++) {
    for (let gz = -8; gz <= 8; gz++) {
      const blockX = gx * 64;
      const blockZ = gz * 64;
      const countPerBlock = 3 + Math.floor(rng() * 3);
      for (let b = 0; b < countPerBlock; b++) {
        const bx = blockX + (rng() - 0.5) * 36;
        const bz = blockZ + (rng() - 0.5) * 36;

        if (Math.hypot(bx, bz) < spawnClearRadius) continue;
        if (Math.abs(bx % 64) < 14 || Math.abs(bz % 64) < 14) continue;

        const w = 12 + rng() * 16;
        const d = 12 + rng() * 16;
        const h = 25 + rng() * 60;
        const by = groundHeight(bx, bz);

        const radius = Math.hypot(w, d) * 0.55;
        if (collideCircle(bx, bz, radius + 2)) continue;

        buildingColliders.push({ x: bx, z: bz, radius });

        const familyIdx = Math.floor(rng() * 4);
        familyInstances[familyIdx].push({ x: bx, y: by + h / 2, z: bz, w, h, d });
      }
    }
  }

  for (let f = 0; f < 4; f++) {
    const list = familyInstances[f];
    if (list.length === 0) continue;
    const instMesh = new THREE.InstancedMesh(bGeo, facadeMats[f], list.length);
    instMesh.castShadow = true;
    instMesh.receiveShadow = true;
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      matrix.makeScale(item.w, item.h, item.d);
      matrix.setPosition(item.x, item.y, item.z);
      instMesh.setMatrixAt(i, matrix);
    }
    instMesh.instanceMatrix.needsUpdate = true;
    scene.add(instMesh);
  }

  // 3. Palm Trees (~300 palms)
  const palmGroup = new THREE.Group();
  for (let i = 0; i < 300; i++) {
    const onX = rng() > 0.5;
    const gridLine = (Math.floor(rng() * 19) - 9) * 64;
    const otherCoord = (rng() - 0.5) * 1000;
    const offset = (rng() > 0.5 ? 1 : -1) * 10.5;

    const px = onX ? gridLine + offset : otherCoord;
    const pz = onX ? otherCoord : gridLine + offset;

    if (Math.hypot(px, pz) < 40) continue;

    const py = groundHeight(px, pz);
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 8, 5);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(px, py + 4, pz);
    trunk.rotation.z = (rng() - 0.5) * 0.2;
    palmGroup.add(trunk);
  }
  scene.add(palmGroup);

  // 4. Street Lamps along boulevards every 36m
  const lampGroup = new THREE.Group();
  for (let c = -576; c <= 576; c += 36) {
    const boulevards = [256, -256];
    for (const bCoord of boulevards) {
      const lx = c;
      const lz = bCoord + 8;
      const ly = groundHeight(lx, lz);

      const poleGeo = new THREE.CylinderGeometry(0.15, 0.15, 6, 4);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(lx, ly + 3, lz);
      lampGroup.add(pole);

      const bulbGeo = new THREE.SphereGeometry(0.3, 8, 8);
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xFFE9B0 });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(lx, ly + 6, lz);
      lampGroup.add(bulb);
    }
  }
  scene.add(lampGroup);

  // 5. Caldera Volcano & Crater
  const volcGeo = new THREE.ConeGeometry(220, 220, 32);
  const volcMat = new THREE.MeshStandardMaterial({ color: 0x37303E, roughness: 0.9 });
  const volcano = new THREE.Mesh(volcGeo, volcMat);
  volcano.position.set(0, groundHeight(0, -500) + 110, -500);
  scene.add(volcano);

  const craterGeo = new THREE.CircleGeometry(40, 16);
  craterGeo.rotateX(-Math.PI / 2);
  const craterMat = new THREE.MeshBasicMaterial({ color: 0xFF6A1A });
  const crater = new THREE.Mesh(craterGeo, craterMat);
  crater.position.set(0, volcano.position.y + 110, -500);
  scene.add(crater);

  // 6. Sky dome & Sun Disc
  const skyGeo = new THREE.SphereGeometry(800, 32, 15);
  const skyMat = new THREE.MeshBasicMaterial({ color: 0x8A63B8, side: THREE.BackSide });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  const sunDiscGeo = new THREE.CircleGeometry(35, 16);
  const sunDiscMat = new THREE.MeshBasicMaterial({ color: 0xFFB066 });
  const sunDisc = new THREE.Mesh(sunDiscGeo, sunDiscMat);
  sunDisc.position.set(-300, 400, -600);
  scene.add(sunDisc);

  // 7. Light Rig
  ambientLight = new THREE.AmbientLight(0x403050, 0.35);
  scene.add(ambientLight);

  hemiLight = new THREE.HemisphereLight(0x8A63B8, 0x40302A, 0.5);
  scene.add(hemiLight);

  sunLight = new THREE.DirectionalLight(0xFFB066, 2.3);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 600;
  const sd = 130;
  sunLight.shadow.camera.left = -sd;
  sunLight.shadow.camera.right = sd;
  sunLight.shadow.camera.top = sd;
  sunLight.shadow.camera.bottom = -sd;
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.03;
  scene.add(sunLight);

  scene.fog = new THREE.FogExp2(0xD97A44, 0.0020);

  updateSun(null);
}

export function updateSun(subject) {
  if (!sunLight) return;
  const sx = subject && typeof subject.x === 'number' ? subject.x : 0;
  const sy = subject && typeof subject.y === 'number' ? subject.y : 0;
  const sz = subject && typeof subject.z === 'number' ? subject.z : 0;
  sunLight.position.set(sx - 120, sy + 95, sz + 260);
  sunLight.target.position.set(sx, sy, sz);
  sunLight.target.updateMatrixWorld();
}

export function setFinaleDusk(on) {
  if (!sunLight || !hemiLight || !ambientLight) return;
  const mul = on ? 1.4 : 1.0;
  sunLight.intensity = 2.3 * mul;
  hemiLight.intensity = 0.5 * mul;
  ambientLight.intensity = 0.35 * mul;
  if (sceneRef && sceneRef.fog) {
    sceneRef.fog.color.setHex(on ? 0x8B3A2B : 0xD97A44);
    sceneRef.fog.density = on ? 0.0030 : 0.0020;
  }
}
