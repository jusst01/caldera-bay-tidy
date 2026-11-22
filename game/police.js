import * as THREE from './three.module.min.js';

let _seed = 42;
function seededRandom() {
  _seed = (_seed * 9301 + 49297) % 233280;
  return _seed / 233280;
}

const SURNAMES = [
  'Silva', 'Rojas', 'Mendoza', 'Vargas', 'Morales', 'Paredes', 'Castillo',
  'Ortega', 'Medina', 'Rios', 'Guzman', 'Campos', 'Navarro', 'Soto', 'Cruz'
];
const FIRST_NAMES = [
  'Lt. Ramirez', 'Ofc. Gomez', 'Sgt. Perez', 'Det. Flores', 'Ofc. Torres',
  'Insp. Diaz', 'Ofc. Ruiz', 'Sgt. Castro', 'Ofc. Ortiz', 'Det. Rubio'
];

const CRIME_POINTS = {
  carjack: 10,
  pedHit: 15,
  mug: 15,
  gunshot: 5,
  copKill: 40,
  policeCarSteal: 40
};

let points = 0;
let pointsFloor = 0;
let units = [];
let searchTimer = 0;
let isSearching = false;
let isBusted = false;
let roadblockActive = false;

export function initPolice() {
  points = 0;
  pointsFloor = 0;
  units = [];
  searchTimer = 0;
  isSearching = false;
  isBusted = false;
  roadblockActive = false;
}

export function reportCrime(crimeType) {
  const pts = CRIME_POINTS[crimeType] || 10;
  points = Math.min(200, points + pts);
  isSearching = false;
  searchTimer = 0;
}

export function setPointsFloor(floor) {
  pointsFloor = Math.max(0, floor);
  points = Math.max(points, pointsFloor);
}

export function setPoints(val) {
  points = Math.max(pointsFloor, Math.min(200, val));
}

export function getHeat() {
  if (points >= 150) return 5;
  if (points >= 100) return 4;
  if (points >= 60) return 3;
  if (points >= 30) return 2;
  if (points >= 10) return 1;
  return 0;
}

export function getPoints() {
  return points;
}

export function getHeatPoints() {
  return points;
}

export function respray() {
  points = 0;
  pointsFloor = 0;
  units = [];
  isSearching = false;
  searchTimer = 0;
  roadblockActive = false;
}

export function forceRoadblock() {
  roadblockActive = true;
}

export function getUnits() {
  return units;
}

export function spawnUnit(type = 'cruiser') {
  const first = FIRST_NAMES[Math.floor(seededRandom() * FIRST_NAMES.length)];
  const last = SURNAMES[units.length % SURNAMES.length];
  const name = `${first} ${last}`;

  const rx = (Math.floor(seededRandom() * 10) - 5) * 20;
  const rz = (Math.floor(seededRandom() * 10) - 5) * 20;

  const unit = {
    name,
    type,
    tactic: 'PURSUIT',
    x: rx,
    y: 0,
    z: rz,
    vx: 0,
    vz: 0,
    speed: 0
  };
  units.push(unit);
  return unit;
}

export function updatePolice(dt, playerPos) {
  const heat = getHeat();

  let targetCount = 0;
  if (heat === 1) targetCount = 2;
  else if (heat === 2) targetCount = 4;
  else if (heat === 3) targetCount = 6;
  else if (heat === 4) targetCount = 8;
  else if (heat >= 5) targetCount = 10;

  while (units.length < targetCount) {
    const isVan = (heat >= 5 && units.length >= 8);
    spawnUnit(isVan ? 'van' : 'cruiser');
  }
  while (units.length > targetCount) {
    units.pop();
  }

  units.forEach((u, idx) => {
    if (heat >= 4) u.tactic = 'SPOTLIGHT';
    else if (heat >= 3) u.tactic = 'RAMMING';
    else if (heat >= 2) u.tactic = 'BOX-IN';
    else u.tactic = 'PURSUIT';

    if (playerPos) {
      const dx = playerPos.x - u.x;
      const dz = playerPos.z - u.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 3) {
        const speed = 12 + heat * 2;
        u.x += (dx / dist) * speed * dt;
        u.z += (dz / dist) * speed * dt;
      }
    }
  });

  if (heat === 0 && points > 0) {
    if (!isSearching) {
      isSearching = true;
      searchTimer = 15;
    } else {
      searchTimer -= dt;
      if (searchTimer <= 0) {
        points = Math.max(0, points - dt * 10);
      }
    }
  }
}

export function getPoliceUnits(playerPos) {
  return units.map(u => {
    const dx = playerPos ? playerPos.x - u.x : 0;
    const dz = playerPos ? playerPos.z - u.z : 0;
    const dist = Math.sqrt(dx * dx + dz * dz);
    return {
      name: u.name,
      tactic: u.tactic,
      dist
    };
  });
}

export function stageCover(camera, playerPos) {
  units.forEach((u, i) => {
    if (!playerPos) return;
    if (i < 2) {
      const offsetLat = (i === 0 ? -8.5 : 8.5);
      u.x = playerPos.x + offsetLat;
      u.z = playerPos.z - 4;
    } else {
      const queueDist = 16 + (i * 10);
      u.x = playerPos.x + (i % 2 === 0 ? -12 : 12);
      u.z = playerPos.z - queueDist;
    }
  });
}

export function coverAudit(camera) {
  const results = [];
  const tempV = new THREE.Vector3();

  units.forEach(u => {
    tempV.set(u.x, u.y, u.z);
    tempV.project(camera);

    const sx = (tempV.x * 0.5 + 0.5) * 100;
    const sy = (-(tempV.y * 0.5) + 0.5) * 100;
    const distance = Math.sqrt(u.x * u.x + u.z * u.z);

    results.push({
      name: u.name,
      tactic: u.tactic,
      distance,
      sx,
      sy
    });
  });

  return results;
}
