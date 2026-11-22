// CALDERA BAY — game/city.js
// V2 art city, sky, light rig, districts, ground height field, building colliders, palms, street lamps, volcano, and refinery flare.

import * as THREE from './three.module.min.js';

const DISTRICTS = [
  { id: 'muelle', cx: -300, cz: 300, r: 250 },
  { id: 'paseo', cx: 330, cz: 60, r: 250 },
  { id: 'verde', cx: 300, cz: -300, r: 250 },
  { id: 'ceniza', cx: -300, cz: -300, r: 250 },
  { id: 'cumbre', cx: 0, cz: -500, r: 300 }
];

export function districtAt(x, z) {
  let closest = DISTRICTS[0];
  let minDist = Infinity;
  for (const d of DISTRICTS) {
    const dx = x - d.cx;
    const dz = z - d.cz;
    const dist = dx * dx + dz * dz;
    if (dist < minDist) {
      minDist = dist;
      closest = d;
    }
  }
  return closest.id;
}

export function groundHeight(x, z) {
  const distCumbre = Math.sqrt(x * x + (z + 500) * (z + 500));
  const cumbreRise = Math.max(0, (350 - distCumbre) * 0.25);
  const verdeRise = Math.max(0, (300 - Math.sqrt((x - 300) * (x - 300) + (z + 300) * (z + 300))) * 0.15);
  const harbourBowl = Math.max(0, (-z - 100) * 0.02);
  const noise = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 1.5;
  return Math.max(0, cumbreRise + verdeRise + harbourBowl + noise);
}

const buildingBoxes = [];

export function collideCircle(x, z, radius) {
  for (const b of buildingBoxes) {
    const dx = x - b.x;
    const dz = z - b.z;
    const minDist = radius + b.r;
    if (dx * dx + dz * dz < minDist * minDist) {
      return true;
    }
  }
  return false;
}

export function eject(x, z, radius) {
  let cx = x;
  let cz = z;
  for (const b of buildingBoxes) {
    const dx = cx - b.x;
    const dz = cz - b.z;
    const distSq = dx * dx + dz * dz;
    const minDist = radius + b.r;
    if (distSq < minDist * minDist && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const overlap = minDist - dist;
      cx += (dx / dist) * overlap;
      cz += (dz / dist) * overlap;
    }
  }
  return { x: cx, z: cz };
}

let directionalLight = null;
let sunSphere = null;
let skyDome = null;
let sceneRef = null;
let finaleDuskActive = false;

const defaultLightConfig = {
  sunColor: 0xFFB066,
  sunIntensity: 2.3,
  hemiSky: 0x8A63B8,
  hemiGround: 0x40302A,
  hemiIntensity: 0.5,
  ambientColor: 0x403050,
  ambientIntensity: 0.35,
  fogColor: 0xD97A44,
  fogDensity: 0.0020
};

export function setFinaleDusk(on) {
  finaleDuskActive = on;
  const mul = on ? 1.4 : 1.0;
  if (directionalLight) {
    directionalLight.intensity = defaultLightConfig.sunIntensity * mul;
  }
}

export function updateSun(targetX, targetY, targetZ) {
  if (!directionalLight) return;
  const sunX = targetX - 120 + 300;
  const sunY = targetY + 300;
  const sunZ = targetZ + 260 + 300;
  directionalLight.position.set(sunX, sunY, sunZ);
  directionalLight.target.position.set(targetX, targetY, targetZ);
  directionalLight.target.updateMatrixWorld();
}

function createFacadeCanvas(typeIndex) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (typeIndex === 0) ctx.fillStyle = '#C8B99A';
  else if (typeIndex === 1) ctx.fillStyle = '#8C8882';
  else if (typeIndex === 2) ctx.fillStyle = '#5A4E44';
  else ctx.fillStyle = '#D8D0C4';

  ctx.fillRect(0, 0, 256, 256);

  const cols = 6;
  const rows = 8;
  const wWidth = 24;
  const wHeight = 22;
  const xStep = 256 / cols;
  const yStep = 256 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = c * xStep + (xStep - wWidth) / 2;
      const wy = r * yStep + (yStep - wHeight) / 2;

      const litHash = Math.sin(r * 12.9898 + c * 78.233) * 43758.5453;
      const isLit = (litHash - Math.floor(litHash)) < 0.5;

      if (isLit) {
        const colorHash = Math.sin(r * 45.1 + c * 12.3);
        const colVal = colorHash - Math.floor(colorHash);
        if (colVal < 0.7) ctx.fillStyle = '#FFC46B';
        else if (colVal < 0.9) ctx.fillStyle = '#BFE3FF';
        else ctx.fillStyle = '#FFE9B0';
      } else {
        ctx.fillStyle = '#1A1816';
      }
      ctx.fillRect(wx, wy, wWidth, wHeight);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createGroundTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#7A5F42';
  ctx.fillRect(0, 0, 1024, 1024);

  ctx.fillStyle = '#6B5239';
  for (let i = 0; i < 200; i++) {
    const x = (Math.sin(i * 99.1) * 0.5 + 0.5) * 1024;
    const y = (Math.cos(i * 33.3) * 0.5 + 0.5) * 1024;
    const r = 30 + (i % 50);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#2C2A27';
  const stripW = 15;
  for (let p = 0; p <= 1024; p += 128) {
    ctx.fillRect(p - stripW / 2, 0, stripW, 1024);
    ctx.fillRect(0, p - stripW / 2, 1024, stripW);
  }

  ctx.strokeStyle = '#8A7A64';
  ctx.lineWidth = 3;
  for (let p = 0; p <= 1024; p += 128) {
    ctx.strokeRect(p - stripW / 2 - 2, 0, stripW + 4, 1024);
    ctx.strokeRect(0, p - stripW / 2 - 2, 1024, stripW + 4);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createSunGlareTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(255,230,180,0.8)');
  grad.addColorStop(1, 'rgba(255,140,66,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function createSkyGradientTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#232C4E');
  grad.addColorStop(0.45, '#6E4468');
  grad.addColorStop(0.68, '#C65D4E');
  grad.addColorStop(0.85, '#FF8C42');
  grad.addColorStop(1, '#FFC46B');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createLampGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,196,107,1)');
  grad.addColorStop(0.5, 'rgba(255,140,66,0.5)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

export function buildCity(scene, rng) {
  sceneRef = scene;

  scene.fog = new THREE.FogExp2(defaultLightConfig.fogColor, defaultLightConfig.fogDensity);

  const skyGeo = new THREE.SphereGeometry(1600, 32, 15);
  const skyMat = new THREE.MeshBasicMaterial({
    map: createSkyGradientTexture(),
    side: THREE.BackSide,
    fog: false
  });
  skyDome = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyDome);

  const ambient = new THREE.AmbientLight(defaultLightConfig.ambientColor, defaultLightConfig.ambientIntensity);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(defaultLightConfig.hemiSky, defaultLightConfig.hemiGround, defaultLightConfig.hemiIntensity);
  scene.add(hemi);

  directionalLight = new THREE.DirectionalLight(defaultLightConfig.sunColor, defaultLightConfig.sunIntensity);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 1500;
  const d = 130;
  directionalLight.shadow.camera.left = -d;
  directionalLight.shadow.camera.right = d;
  directionalLight.shadow.camera.top = d;
  directionalLight.shadow.camera.bottom = -d;
  directionalLight.shadow.bias = -0.0004;
  directionalLight.shadow.normalBias = 0.03;
  scene.add(directionalLight);
  scene.add(directionalLight.target);

  const sunGeo = new THREE.SphereGeometry(60, 24, 24);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xFFE8C0, fog: false });
  sunSphere = new THREE.Mesh(sunGeo, sunMat);
  sunSphere.position.set(400, 900, -1200);
  scene.add(sunSphere);

  const glareMat = new THREE.SpriteMaterial({
    map: createSunGlareTexture(),
    color: 0xffaa66,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const glareSprite = new THREE.Sprite(glareMat);
  glareSprite.scale.set(520, 520, 1);
  sunSphere.add(glareSprite);

  const cloudMat = new THREE.SpriteMaterial({
    color: 0xFF9A6A,
    transparent: true,
    opacity: 0.45,
    depthWrite: false
  });
  for (let i = 0; i < 6; i++) {
    const cloud = new THREE.Sprite(cloudMat);
    const angle = (i / 6) * Math.PI * 2;
    const dist = 800 + (rng() * 300);
    cloud.position.set(Math.cos(angle) * dist, 140 + rng() * 100, Math.sin(angle) * dist);
    cloud.scale.set(300, 120, 1);
    scene.add(cloud);
  }

  // Ground Plane
  const groundGeo = new THREE.PlaneGeometry(1500, 1500, 64, 64);
  groundGeo.rotateX(-Math.PI / 2);
  const posAttr2 = groundGeo.attributes.position;
  for (let i = 0; i < posAttr2.count; i++) {
    const vx = posAttr2.getX(i);
    const vz = posAttr2.getZ(i);
    posAttr2.setY(i, groundHeight(vx, vz));
  }
  groundGeo.computeVertexNormals();

  const groundMat = new THREE.MeshStandardMaterial({
    map: createGroundTexture(),
    roughness: 0.85,
    metalness: 0.1
  });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  // Buildings (~774 buildings)
  const facadeTextures = [0, 1, 2, 3].map(i => createFacadeCanvas(i));
  const buildingMaterials = facadeTextures.map(tex => new THREE.MeshStandardMaterial({
    map: tex,
    emissive: 0xFFB066,
    emissiveMap: tex,
    emissiveIntensity: 1.0,
    envMapIntensity: 0.25,
    roughness: 0.5
  }));

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const countPerFamily = Math.floor(774 / 4);
  const instancedBuildings = buildingMaterials.map(mat => new THREE.InstancedMesh(boxGeo, mat, countPerFamily));

  let bIndex = [0, 0, 0, 0];
  const dummy = new THREE.Object3D();

  for (let gx = -9; gx <= 9; gx++) {
    for (let gz = -9; gz <= 9; gz++) {
      const bx = gx * 64;
      const bz = gz * 64;

      if (Math.abs(bx) < 32 || Math.abs(bz) < 32) continue;

      const fam = Math.floor(rng() * 4);
      if (bIndex[fam] >= countPerFamily) continue;

      const w = 16 + rng() * 16;
      const h = 20 + rng() * 45;
      const d = 16 + rng() * 16;
      const py = groundHeight(bx, bz) + h / 2;

      dummy.position.set(bx, py, bz);
      dummy.scale.set(w, h, d);
      dummy.updateMatrix();

      instancedBuildings[fam].setMatrixAt(bIndex[fam], dummy.matrix);
      instancedBuildings[fam].instanceMatrix.needsUpdate = true;
      bIndex[fam]++;

      buildingBoxes.push({
        x: bx,
        z: bz,
        w: w,
        d: d,
        r: Math.max(w, d) * 0.6
      });
    }
  }

  for (const im of instancedBuildings) {
    im.castShadow = true;
    im.receiveShadow = true;
    scene.add(im);
  }

  // Palms (~300)
  const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 5.2, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6B5A44, roughness: 0.9 });
  const palmInstanced = new THREE.InstancedMesh(trunkGeo, trunkMat, 300);

  const frondGeo = new THREE.PlaneGeometry(2.6, 0.55, 6, 1);
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x2F6B33, side: THREE.DoubleSide, roughness: 0.7 });

  for (let i = 0; i < 300; i++) {
    const px = (rng() - 0.5) * 1000;
    const pz = (rng() - 0.5) * 1000;
    if (Math.abs(px) < 28 || Math.abs(pz) < 28) continue;
    const py = groundHeight(px, pz) + 2.6;

    dummy.position.set(px, py, pz);
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, rng() * Math.PI * 2, 0.1);
    dummy.updateMatrix();
    palmInstanced.setMatrixAt(i, dummy.matrix);

    for (let f = 0; f < 7; f++) {
      const frondMesh = new THREE.Mesh(frondGeo, frondMat);
      const angle = (f / 7) * Math.PI * 2;
      frondMesh.position.set(px, py + 2.6, pz);
      frondMesh.rotation.set(0.3, angle, 0);
      scene.add(frondMesh);
    }
  }
  palmInstanced.instanceMatrix.needsUpdate = true;
  scene.add(palmInstanced);

  // Street Lamps along boulevards every 36m alternating sides
  const lampPoleGeo = new THREE.CylinderGeometry(0.12, 0.15, 5.6, 6);
  const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x2A2A30, roughness: 0.7 });
  const lampHeadGeo = new THREE.BoxGeometry(0.6, 0.3, 0.6);
  const lampHeadMat = new THREE.MeshBasicMaterial({ color: 0xFFC46B });
  const lampGlowMat = new THREE.SpriteMaterial({
    map: createLampGlowTexture(),
    transparent: true,
    opacity: 0.20,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  for (let zPos = -400; zPos <= 400; zPos += 36) {
    const side = (Math.abs(zPos) % 72 === 0) ? 14 : -14;
    const lx = 256 + side;
    const lz = zPos;
    const ly = groundHeight(lx, lz) + 2.8;

    const pole = new THREE.Mesh(lampPoleGeo, lampPoleMat);
    pole.position.set(lx, ly, lz);
    scene.add(pole);

    const head = new THREE.Mesh(lampHeadGeo, lampHeadMat);
    head.position.set(lx, ly + 2.8, lz);
    scene.add(head);

    // Sprites for lamps nearest x=256, z -180...0
    if (lz >= -180 && lz <= 0) {
      const glowSprite = new THREE.Sprite(lampGlowMat);
      glowSprite.position.set(lx, ly + 2.8, lz);
      glowSprite.scale.set(2.6, 2.6, 1);
      scene.add(glowSprite);
    }
  }

  // Volcano at north edge
  const volcanoGeo = new THREE.ConeGeometry(220, 160, 32);
  const volcanoMat = new THREE.MeshStandardMaterial({ color: 0x37303E, roughness: 0.9 });
  const volcano = new THREE.Mesh(volcanoGeo, volcanoMat);
  volcano.position.set(0, groundHeight(0, -700) + 80, -700);
  scene.add(volcano);

  const craterGeo = new THREE.CircleGeometry(40, 24);
  const craterMat = new THREE.MeshBasicMaterial({ color: 0xFF6A1A, fog: false });
  const crater = new THREE.Mesh(craterGeo, craterMat);
  crater.rotation.x = -Math.PI / 2;
  crater.position.set(0, 160, -700);
  volcano.add(crater);

  const smokeMat = new THREE.SpriteMaterial({
    color: 0xD88A6A,
    transparent: true,
    opacity: 0.35,
    depthWrite: false
  });
  for (let s = 0; s < 5; s++) {
    const smoke = new THREE.Sprite(smokeMat);
    smoke.position.set((s - 2) * 20, 200 + s * 30, -700 + s * 15);
    smoke.scale.set(60, 60, 1);
    scene.add(smoke);
  }

  // Ceniza Refinery Flare
  const flareGeo = new THREE.CylinderGeometry(2, 4, 30, 8);
  const flareMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5 });
  const flareTower = new THREE.Mesh(flareGeo, flareMat);
  flareTower.position.set(-300, groundHeight(-300, -300) + 15, -300);
  scene.add(flareTower);

  const flareTipMat = new THREE.MeshBasicMaterial({ color: 0xFF6A1A });
  const flareTip = new THREE.Mesh(new THREE.SphereGeometry(6, 12, 12), flareTipMat);
  flareTip.position.set(-300, groundHeight(-300, -300) + 32, -300);
  scene.add(flareTip);
}
