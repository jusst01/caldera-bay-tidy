import * as THREE from './three.module.min.js';
import { createRNG, groundHeight, districtAt, collideCircle, eject, buildCity, updateSun, setFinaleDusk } from './city.js';
import { VEHICLE_ROSTER, createVehicleMesh, spawnVehicle, updateVehicle, damageVehicle, markStolen as markVehicleStolen } from './vehicles.js';
import { initTraffic, spawnTraffic, updateTraffic, getTrafficCars, markStolen as markTrafficStolen } from './traffic.js';
import { initPedestrians, updatePedestrians, witnessesAt, getPedestrians, damagePedestrian, debugSetPed } from './pedestrians.js';
import { initPolice, reportCrime, setPointsFloor, setPoints, getHeat, getPoints, getHeatPoints, getUnits, respray, forceRoadblock, updatePolice, spawnUnit, stageCover, coverAudit, getPoliceUnits } from './police.js';
import { WEAPON_SPECS, initCombat, switchWeapon, nextWeapon, reloadWeapon, updateCombat, fireWeapon, damagePlayer, getAmmo, getCombatState, showWeaponWheel } from './combat.js';
import { JOBS, createMissions } from './missions.js';
import { REP_TIERS, tierFor, emptySave, canonicalSave, takeoverCount, loadSave, saveSave, clearSave } from './save.js';
import { SHOP_POS, PRICES, TIME_TRIALS, createEconomy } from './economy.js';
import { createHud } from './hud.js';
import { closeCurrentScreen, openStartScreen, openGarageScreen, openMenu } from './screens.js';
import { initRadio, startRadio, cycleStation, getCurrentStationInfo, stopRadio } from './radio.js';

// --- Renderer, Scene, Camera Setup ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth || 1280, window.innerHeight || 720);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.left = '0px';
renderer.domElement.style.top = '0px';
renderer.domElement.style.zIndex = '1';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.FogExp2(0x87ceeb, 0.0025);

const camera = new THREE.PerspectiveCamera(60, (window.innerWidth || 1280) / (window.innerHeight || 720), 0.1, 2000);

window.addEventListener('resize', () => {
  const width = window.innerWidth || 1280;
  const height = window.innerHeight || 720;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});

// --- Game State & Systems ---
let save = loadSave() || canonicalSave();
let rng = createRNG(save.seed || 12345);
let missions = createMissions();
let economy = createEconomy(save);

let player = {
  x: -300,
  z: 300,
  y: groundHeight(-300, 300),
  angle: 0,
  speed: 0,
  hp: 100,
  armour: save.armour || 100,
  inCar: null
};

let dialogueQueue = null;
let eventLineQueue = null;
let isSimFrozen = false;
let clock = new THREE.Clock();

const keys = { w: false, a: false, s: false, d: false, space: false, shift: false, e: false, f: false, r: false, tab: false, m: false };

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'w' || k === 'arrowup') keys.w = true;
  if (k === 'a' || k === 'arrowleft') keys.a = true;
  if (k === 's' || k === 'arrowdown') keys.s = true;
  if (k === 'd' || k === 'arrowright') keys.d = true;
  if (e.code === 'Space') keys.space = true;
  if (e.shiftKey) keys.shift = true;
  if (k === 'e') { keys.e = true; handleInteract(); }
  if (k === 'f') { keys.f = true; fireWeapon(); }
  if (k === 'r') { keys.r = true; reloadWeapon(); }
  if (k === 'tab') { e.preventDefault(); nextWeapon(); }
  if (k === 'm') {
    keys.m = true;
    openMenu(save, { onResume() { closeCurrentScreen(); }, onQuit() { openStartScreen(save, startCallbacks); } });
  }
});

window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'w' || k === 'arrowup') keys.w = false;
  if (k === 'a' || k === 'arrowleft') keys.a = false;
  if (k === 's' || k === 'arrowdown') keys.s = false;
  if (k === 'd' || k === 'arrowright') keys.d = false;
  if (e.code === 'Space') keys.space = false;
  if (!e.shiftKey) keys.shift = false;
  if (k === 'e') keys.e = false;
  if (k === 'f') keys.f = false;
  if (k === 'r') keys.r = false;
  if (k === 'm') keys.m = false;
});

// --- HUD & Callbacks ---
const garageCallbacks = {
  buyAmmo(type) { economy.buyAmmo(type); },
  buyArmour() { economy.buyArmour(); },
  storeCar() { economy.storeCurrentCar(player.inCar); },
  recallCar(id) {
    const car = economy.recallCar(id, scene, player.x, player.z);
    if (car) player.inCar = car;
  },
  close() { closeCurrentScreen(); }
};

const startCallbacks = {
  onContinue() {
    closeCurrentScreen();
  },
  onNewGame() {
    save = canonicalSave();
    saveSave(save);
    closeCurrentScreen();
  }
};

const hudHooks = {
  onMenu() { openMenu(save, { onResume() { closeCurrentScreen(); } }); },
  onRadio() { cycleStation(); }
};

const hud = createHud(hudHooks);

// --- Initialization ---
function initWorld(seed = 12345) {
  while (scene.children.length > 0) {
    scene.remove(scene.children[0]);
  }
  buildCity(scene, seed);
  initTraffic(scene);
  initPedestrians(scene);
  initPolice();
  initCombat();
  initRadio();
  startRadio();
  missions = createMissions();
  economy = createEconomy(save);
}

initWorld(save.seed || 12345);

// Show start screen on boot
hud.setPanels('start');
openStartScreen(save, startCallbacks);

// --- Interaction Handler ---
function handleInteract() {
  if (player.inCar) {
    // Exit car
    player.x = player.inCar.position.x + 2;
    player.z = player.inCar.position.z + 2;
    player.y = groundHeight(player.x, player.z);
    player.inCar = null;
  } else {
    // Enter nearest vehicle or shop/mission
    const trafficList = getTrafficCars() || [];
    let nearestCar = null;
    let minDist = 5;
    for (const car of trafficList) {
      const d = Math.hypot(car.position.x - player.x, car.position.z - player.z);
      if (d < minDist) {
        minDist = d;
        nearestCar = car;
      }
    }
    if (nearestCar) {
      player.inCar = nearestCar;
      markTrafficStolen(nearestCar);
    } else {
      // Check shops
      for (const [name, pos] of Object.entries(SHOP_POS)) {
        if (Math.hypot(pos.x - player.x, pos.z - player.z) < 5) {
          if (name.includes('garage') || name.includes('safehouse')) {
            hud.setPanels('garage');
            openGarageScreen(save, garageCallbacks);
          }
        }
      }
    }
  }
}

// --- Main Loop ---
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);

  if (!isSimFrozen) {
    updateSim(dt);
  }

  renderFrame();
}

function updateSim(dt) {
  updateSun(clock.getElapsedTime() * 0.05);

  if (player.inCar) {
    const activeKeys = {
      forward: keys.w,
      reverse: keys.s,
      left: keys.a,
      right: keys.d,
      brake: keys.space
    };
    updateVehicle(player.inCar, dt, activeKeys, getTrafficCars());
    player.x = player.inCar.position?.x || 0;
    player.z = player.inCar.position?.z || 0;
    player.y = player.inCar.position?.y || 0;
    player.angle = player.inCar.rotation.y;
    player.speed = player.inCar.speed || 0;
  } else {
    // On-foot movement
    let moveSpeed = keys.shift ? 8 : 4;
    let dx = 0, dz = 0;
    if (keys.w) dz -= 1;
    if (keys.s) dz += 1;
    if (keys.a) dx -= 1;
    if (keys.d) dx += 1;
    if (dx !== 0 || dz !== 0) {
      const len = Math.hypot(dx, dz);
      dx /= len;
      dz /= len;
      player.x += dx * moveSpeed * dt;
      player.z += dz * moveSpeed * dt;
      player.angle = Math.atan2(dx, dz);
    }
    player.y = groundHeight(player.x, player.z);
  }

  updateTraffic(dt, new THREE.Vector3(player.x, player.y, player.z));
  updatePedestrians(dt, new THREE.Vector3(player.x, player.y, player.z));
  updatePolice(dt, new THREE.Vector3(player.x, player.y, player.z), !!player.inCar);
  updateCombat(dt);
}

function renderFrame() {
  // Camera update
  if (!isSimFrozen) {
    if (player.inCar) {
      const car = player.inCar;
      const offset = new THREE.Vector3(0, 3.5, -8).applyQuaternion(car.quaternion || new THREE.Quaternion());
      camera.position.copy(car.position || new THREE.Vector3()).add(offset);
      camera.lookAt(car.position?.clone().add(new THREE.Vector3(0, 1, 0)) || new THREE.Vector3());
    } else {
      const targetPos = new THREE.Vector3(player.x, player.y + 1.5, player.z);
      const camOffset = new THREE.Vector3(Math.sin(player.angle) * -6, 2.2, Math.cos(player.angle) * -6);
      camera.position.copy(targetPos).add(camOffset);
      camera.lookAt(targetPos);
    }
  }

  renderer.render(scene, camera);

  // HUD Update
  const policeUnits = getPoliceUnits(new THREE.Vector3(player.x, player.y, player.z)) || getUnits() || [];
  const snapshot = {
    player: {
      hp: player.hp,
      armour: player.armour,
      ammo: Number.isFinite(getAmmo().current) ? getAmmo().current : 0,
      inCar: !!player.inCar,
      x: player.x,
      z: player.z,
      speed: player.speed || 0
    },
    heat: getHeat(),
    points: getPoints(),
    police: {
      units: policeUnits.map(u => ({ name: u.name || 'Unit', tactic: u.tactic || 'patrol', dist: u.dist || 5 }))
    },
    cash: save.cash || 0,
    rep: save.rep || 0,
    tier: tierFor(save.rep || 0),
    takeoverCount: takeoverCount(save),
    jobsDone: save.jobsDone || 0,
    objective: missions.currentObjective(),
    dialogue: dialogueQueue,
    eventLine: eventLineQueue,
    radio: getCurrentStationInfo(save)
  };

  hud.update(snapshot);
  if (dialogueQueue) dialogueQueue = null;
  if (eventLineQueue) eventLineQueue = null;
}

requestAnimationFrame(animate);

// --- __photo Contract Implementation ---
window.__photo = {
  load(spec) {
    closeCurrentScreen();
    isSimFrozen = false;

    // 1. Seed reset + world rebuild
    const seed = spec.seed || 12345;
    initWorld(seed);

    // 2. Save
    if (spec.save === 'canonical') {
      save = canonicalSave();
    } else {
      save = loadSave() || canonicalSave();
    }

    // 3. Job
    if (spec.job !== undefined) {
      save.missionIndex = spec.job - 1;
      missions.forceStage(spec.job - 1, spec.jobStage ?? 0);
    }

    // 4. Heat
    if (spec.heat !== undefined) {
      setPoints(spec.heat);
    }

    // 5. Player stats
    player.armour = save.armour ?? 100;
    player.hp = 100;

    // 6. Mode
    if (spec.mode === 'drive') {
      const hero = spawnVehicle('zorro', -300, 300, 0, scene);
      player.inCar = hero;
      player.x = -300;
      player.z = 300;
      player.y = groundHeight(-300, 300);
      player.inCar.position = player.inCar.position || new THREE.Vector3(player.x, player.y, player.z);
      player.inCar.quaternion = player.inCar.quaternion || new THREE.Quaternion();

      const packCount = [0, 2, 4, 6, 8, 10][Math.min(getHeat(), 5)] || 0;
      for (let i = 0; i < packCount; i++) {
        spawnUnit(-300 + (Math.random() - 0.5) * 10, 300 + (Math.random() - 0.5) * 10);
      }
      // Pose camera before stageCover
      camera.position.set(player.x, player.y + 3.5, player.z + 8);
      camera.lookAt(player.x, player.y + 1.0, player.z);
      camera.updateMatrixWorld();

      stageCover(camera, new THREE.Vector3(-300, player.y, 300));
      hud.setPanels('cover');
    } else if (spec.mode === 'foot') {
      player.inCar = null;
      player.x = -300;
      player.z = 300;
      player.y = groundHeight(-300, 300);

      // Pose camera here
      camera.position.set(player.x, player.y + 2.2, player.z + 6);
      camera.lookAt(player.x, player.y + 1.0, player.z);
      camera.updateMatrixWorld();

      const pedOffsets = [{x: 3, z: 2}, {x: -4, z: 5}, {x: 6, z: -3}, {x: -2, z: -6}, {x: 8, z: 6}];
      for (let i = 0; i < 5; i++) {
        debugSetPed(i, player.x + pedOffsets[i].x, player.z + pedOffsets[i].z, 0);
      }
      hud.setPanels('game');
    }

    // 7. Screen
    if (spec.screen === 'garage') {
      hud.setPanels('garage');
      openGarageScreen(save, garageCallbacks);
    } else if (spec.screen === 'start') {
      hud.setPanels('start');
      openStartScreen(save, { onContinue() {}, onNewGame() {} });
    } else if (spec.screen === 'menu') {
      openMenu(save, { onResume() { closeCurrentScreen(); } });
    }

    // 9. Dialogue / Event queues
    dialogueQueue = spec.dialogue || null;
    eventLineQueue = spec.event || null;

    // 10. Final render & freeze
    isSimFrozen = true;
    renderFrame();
    if (spec.dialogue) {
      hud.showDialogue(spec.dialogue.name || spec.dialogue.speaker, spec.dialogue.text);
    }
  }
};

// --- __calderaTest Test Hooks Implementation ---
window.__calderaTest = {
  state() {
    return {
      player: {
        x: player.x,
        z: player.z,
        y: player.y,
        angle: player.angle,
        speed: player.speed,
        isDriving: !!player.inCar,
        currentVehicle: player.inCar
      },
      save,
      heat: getHeat(),
      heatPoints: getHeatPoints(),
      points: getHeatPoints(),
      missionState: missions.currentObjective(),
      units: getUnits(),
      peds: getPedestrians()
    };
  },
  hash() {
    return scene.children.length ^ Math.floor(player.x * 100);
  },
  stageCover() {
    stageCover(camera, new THREE.Vector3(player.x, player.y, player.z));
  },
  coverAudit() {
    return coverAudit(camera);
  },
  getPedsNearby(r = 10) {
    const peds = getPedestrians() || [];
    return peds.filter(p => Math.hypot(p.x - player.x, p.z - player.z) <= r);
  },
  isPlayerOnFoot() {
    return !player.inCar;
  },
  dumpScene() {
    return scene.children.map(c => c.type);
  },
  save() {
    return saveSave(save);
  },
  teleport(x, z) {
    player.x = x;
    player.z = z;
    player.y = groundHeight(x, z);
    if (player.inCar) {
      player.inCar.position.set(x, player.y, z);
    }
  },
  spawnCar(id) {
    const car = spawnVehicle(id || 'zorro', player.x + 3, player.z + 3, player.angle, scene);
    return car;
  },
  enterNearest() {
    const trafficList = getTrafficCars() || [];
    if (trafficList.length > 0) {
      player.inCar = trafficList[0];
      return true;
    }
    return false;
  },
  exitCar() {
    if (player.inCar) {
      player.x = player.inCar.position.x + 2;
      player.z = player.inCar.position.z + 2;
      player.y = groundHeight(player.x, player.z);
      player.inCar = null;
      return true;
    }
    return false;
  },
  interact() {
    handleInteract();
  },
  interactables() {
    return Object.entries(SHOP_POS).map(([name, pos]) => ({ name, ...pos }));
  },
  step(dt = 0.016) {
    updateSim(dt);
  },
  modules() {
    return {
      city: !!buildCity,
      vehicles: !!spawnVehicle,
      traffic: !!initTraffic,
      pedestrians: !!initPedestrians,
      police: !!initPolice,
      combat: !!initCombat,
      missions: !!createMissions,
      save: !!loadSave,
      economy: !!createEconomy,
      hud: !!createHud,
      screens: !!openStartScreen,
      radio: !!initRadio
    };
  },
  driveTour() {
    player.speed = 10;
  },
  onFootLoop() {
    player.inCar = null;
  },
  repairVehicle() {
    if (player.inCar) {
      damageVehicle(player.inCar, -100);
    }
  },
  driveToward(x, z) {
    player.angle = Math.atan2(x - player.x, z - player.z);
    player.speed = 15;
  }
};
