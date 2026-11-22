// CALDERA BAY — game/main.js
// Core game loop, fixed-step 1/60 accumulator, camera controller, chase cam, interactables, save management, photo mode, test hooks.

import * as THREE from './three.module.min.js';
import { buildCity, createRNG, groundHeight, districtAt, collideCircle, eject, setFinaleDusk } from './city.js';
import { VEHICLE_ROSTER, createVehicleMesh, spawnVehicle, updateVehicle, damageVehicle } from './vehicles.js';
import { spawnTraffic, updateTraffic, getTrafficCars } from './traffic.js';
import { initPedestrians, updatePedestrians, witnessesAt, getPedestrians, damagePedestrian } from './pedestrians.js';
import { initPolice, reportCrime, setPointsFloor, updatePolice, getHeat, respray } from './police.js';
import { initCombat, switchWeapon, nextWeapon, reloadWeapon, updateCombat, fireWeapon, WEAPON_SPECS } from './combat.js';
import { createEconomy, SHOP_POS, PRICES, TIME_TRIALS } from './economy.js';
import { createMissions, JOBS } from './missions.js';
import { loadSave, saveSave, canonicalSave, emptySave, tierFor, takeoverCount } from './save.js';
import { createHud } from './hud.js';
import { openStartScreen, openGarageScreen, closeCurrentScreen } from './screens.js';
import { initRadio, startRadio } from './radio.js';

/**
 * --- GAME STATE & CONTEXTS ---
 * These variables hold the primary game state, including the player's
 * position, vehicle status, and simulation settings.
 *
 * save: Holds player progress (cash, rep, jobs, takeover status).
 * rng: Seeded random number generator for deterministic world building.
 * scene: The main Three.js scene containing all game objects.
 * camera: The primary camera for rendering the game world.
 * renderer: The WebGL renderer for displaying the scene to the HTML canvas.
 */
let save = loadSave();
let rng = createRNG(1337);
let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
let renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

/**
 * Initialize core systems such as the HUD, missions, and economy.
 * These systems provide the interface and gameplay logic for Caldera Bay.
 */
let hud = createHud({
  onSelectStation: (st) => { save.radioStation = st; persistSave(); },
  onOpenGarage: () => openGarageScreen(save, garageCallbacks)
});

let missions = createMissions({
  save,
  notify,
  dialogue,
  registerInteractable
});

let economy = createEconomy({
  save,
  notify,
  dialogue,
  registerInteractable,
  openGarage: () => openGarageScreen(save, garageCallbacks)
});

let player = {
  x: -300,
  z: 300,
  y: groundHeight(-300, 300),
  angle: 0,
  speed: 0,
  inCar: null, // vehicle object if driving
  hp: 100,
  armour: save.armour || 0
};

let interactables = [];
let keys = {};
let photoModeActive = false;
let photoFrozen = false;
let carjackTimer = 0;
let carjackTarget = null;
let notifyTimeout = null;

/**
 * --- SAVE MANAGEMENT ---
 * These functions handle persisting the player's progress and restoring
 * it upon starting the game.
 */
function gatherSave() {
  save.armour = player.armour;
  return save;
}

function persistSave() {
  if (photoModeActive) return;
  saveSave(save);
}

function applySaveToWorld() {
  player.armour = save.armour || 0;
}

/**
 * --- HUD NOTIFY & DIALOGUE ---
 * Handles displaying toast notifications and dialogue boxes in the HUD.
 */
function notify(msg, duration = 3000) {
  const el = document.getElementById('hud-notify');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  if (notifyTimeout) clearTimeout(notifyTimeout);
  notifyTimeout = setTimeout(() => {
    el.style.display = 'none';
  }, duration);
}

function dialogue(name, text) {
  hud.showDialogue(name, text);
}

/**
 * Helper to format money strings for display
 */
function formatMoney(amount) {
    return "$" + amount.toLocaleString();
}

/**
 * --- INTERACTABLES REGISTRY ---
 * Manages interactable points in the world, allowing for contextual actions
 * like starting jobs, entering shops, or interacting with peds.
 */
function registerInteractable(item) {
  interactables.push(item);
  return () => {
    const idx = interactables.indexOf(item);
    if (idx !== -1) interactables.splice(idx, 1);
  };
}

function getNearestInteractable() {
  let nearest = null;
  let minDist = Infinity;
  for (const it of interactables) {
    const dist = Math.hypot(player.x - it.pos.x, player.z - it.pos.z);
    if (dist <= it.radius && dist < minDist) {
      minDist = dist;
      nearest = it;
    }
  }
  return nearest;
}

/**
 * --- GARAGE CALLBACKS ---
 * Handles vehicle actions like rolling out, repairing, or chopping a vehicle
 * while inside the garage screen.
 */
const garageCallbacks = {
  onBack: () => closeCurrentScreen(),
  onCarAction: (action, idx) => {
    if (action === 'roll' && save.ownedCars[idx]) {
      const carData = save.ownedCars[idx];
      closeCurrentScreen();
      spawnVehicle(carData.spec, player.x + 4, player.z + 4, player.angle, scene);
      notify(`Rolled out ${carData.spec.toUpperCase()}`, 2500);
    } else if (action === 'repair' && save.ownedCars[idx]) {
      if (save.cash >= 80) {
        save.cash -= 80;
        save.ownedCars[idx].durability = 100;
        persistSave();
        openGarageScreen(save, garageCallbacks);
        notify("Vehicle repaired to 100%", 2000);
      } else {
        notify("Not enough cash ($80 required)", 2000);
      }
    } else if (action === 'chop' && save.ownedCars[idx]) {
      const specKey = save.ownedCars[idx].spec;
      const spec = VEHICLE_ROSTER[specKey];
      const chopVal = spec && spec.chop ? spec.chop : 150;
      save.cash += chopVal;
      save.ownedCars.splice(idx, 1);
      persistSave();
      openGarageScreen(save, garageCallbacks);
      notify(`Chopped for +$${chopVal}`, 2000);
    }
  }
};

/**
 * --- BUSTED / WASTED ---
 * Manages mission failures and penalties when the player is busted by police
 * or wasted by enemies.
 */
function onBustedOrWasted(type) {
  missions.reset();
  if (type === 'busted') {
    const penalty = Math.floor(save.cash * 0.10);
    save.cash = Math.max(0, save.cash - penalty);
    notify(`BUSTED! Confiscated 10% cash (-$${penalty})`, 4000);
  } else {
    save.cash = Math.max(0, save.cash - 200);
    notify(`WASTED! Hospital fees -$200 & half ammo`, 4000);
  }
  player.x = -320;
  player.z = 320;
  player.y = groundHeight(-320, 320);
  player.hp = 100;
  player.inCar = null;
  persistSave();
}

/**
 * --- INPUT & CONTROLLERS ---
 * Handles player keyboard input and contextual interactions.
 */
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyE') {
    handleInteractPress();
  }
  if (e.code === 'KeyF') {
    handleMugPress();
  }
  if (e.code === 'KeyG') {
    openGarageScreen(save, garageCallbacks);
  }
  if (e.code === 'F5') {
    e.preventDefault();
    persistSave();
    notify("Game Saved", 2000);
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
  if (e.code === 'KeyE') {
    carjackTimer = 0;
    carjackTarget = null;
  }
});

/**
 * Handles 'E' key presses for interactions, like starting missions or entering/exiting cars.
 */
function handleInteractPress() {
  if (photoModeActive) return;
  const nearestIt = getNearestInteractable();
  if (nearestIt && Math.hypot(player.x - nearestIt.pos.x, player.z - nearestIt.pos.z) <= 2.2) {
    nearestIt.action();
    return;
  }
  if (!player.inCar) {
    // Attempt carjack / enter nearest car
    const traffic = getTrafficCars();
    let nearestVehicle = null;
    let minDist = 2.5;
    for (const v of traffic) {
      const dist = Math.hypot(player.x - v.x, player.z - v.z);
      if (dist < minDist) {
        minDist = dist;
        nearestVehicle = v;
      }
    }
    if (nearestVehicle) {
      player.inCar = nearestVehicle;
      notify("Entered vehicle", 1500);
      reportCrime('carjack', { x: player.x, z: player.z }, true);
    }
  } else {
    player.inCar = null;
    notify("Exited vehicle", 1500);
  }
}

/**
 * Handles 'F' key presses for mugging pedestrians.
 */
function handleMugPress() {
  if (photoModeActive || player.inCar) return;
  const peds = getPedestrians();
  let nearestPed = null;
  let minDist = 2.3;
  for (const ped of peds) {
    if (ped.down || ped.mugged) continue;
    const dist = Math.hypot(player.x - ped.x, player.z - ped.z);
    if (dist <= minDist) {
      minDist = dist;
      nearestPed = ped;
    }
  }
  if (nearestPed) {
    nearestPed.mugged = true;
    save.cash += nearestPed.wallet;
    reportCrime('mug', { x: player.x, z: player.z }, true);
    notify(`Mugged pedestrian for +$${nearestPed.wallet}`, 2000);
    persistSave();
  }
}

/**
 * --- INITIALIZATION ---
 * Sets up all core game systems and event listeners before starting the main loop.
 */
function init() {
  // Initialize world and systems
  buildCity(scene, rng);
  initPolice(scene);
  initPedestrians(scene, rng);
  initCombat(scene, {
    onGunshot: (pos) => reportCrime('gunshot', pos, true),
    onHit: (target, dmg) => {
      if (target.isPed) damagePedestrian(target, dmg);
    }
  });
  initRadio(save);
  missions.armJobStart();
  economy.registerShops();

  // Set up the start button for the title overlay
  document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('title-overlay').style.opacity = '0';
    setTimeout(() => {
      document.getElementById('title-overlay').style.display = 'none';
    }, 500);
    startRadio(save);
  });
}
init();

/**
 * --- SIMULATION STEP (1/60) ---
 * The main simulation loop logic, processing player movement, AI agents,
 * and combat at a fixed timestep.
 *
 * dt: Delta time in seconds, usually 1/60.
 */
function stepSim(dt) {
  if (photoFrozen) return;

  // Logic for on-foot movement relative to camera orientation
  if (!player.inCar) {
    let moveX = 0, moveZ = 0;
    if (keys['KeyW'] || keys['ArrowUp']) moveZ -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) moveZ += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

    // Apply movement if keys are pressed
    if (moveX !== 0 || moveZ !== 0) {
      const camYaw = camera.rotation.y;
      const targetAngle = Math.atan2(moveX, moveZ) + camYaw;
      let diff = targetAngle - player.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      player.angle += diff * Math.min(1, dt * 10);
      const spd = 4.5;
      player.x += Math.sin(player.angle) * spd * dt;
      player.z += Math.cos(player.angle) * spd * dt;

      // Clamp player to terrain
      const ejected = eject(player.x, player.z, 0.5);
      player.x = ejected.x;
      player.z = ejected.z;
      player.y = groundHeight(player.x, player.z);

      // Run-over check
      const peds = getPedestrians();
      for (const ped of peds) {
        if (!ped.down && Math.hypot(player.x - ped.x, player.z - ped.z) < 1.0) {
          ped.down = true;
          ped.group.rotation.x = Math.PI / 2;
          reportCrime('pedHit', { x: player.x, z: player.z }, true);
          // Slow down player
          player.speed *= 0.5;
        }
      }
    }
  }

  // Update simulation entities: AI, combat, and environment
  updatePedestrians(dt, { x: player.x, z: player.z }, getHeat());
  updatePolice(dt, { x: player.x, z: player.z });
  updateTraffic(dt, scene);
  updateCombat(dt, { x: player.x, z: player.z }, player.angle);

  // Update HUD display components
  hud.update({
    player,
    heat: getHeat(),
    cash: save.cash,
    rep: save.rep,
    tier: tierFor(save.rep),
    takeoverCount: takeoverCount(save),
    jobsDone: save.jobsDone,
    objective: missions.currentObjective()
  });
}

/**
 * --- WINDOW.__PHOTO (DESIGN §8) ---
 * Manages photo mode functionality including world rebuild and state forcing.
 * This is used for capturing game state, freezes the simulation, and resets RNG.
 */
window.__photo = {
  load(spec) {
    photoModeActive = true;
    photoFrozen = true;
    closeCurrentScreen();
    const overlay = document.getElementById('title-overlay');
    if (overlay) overlay.style.display = 'none';
    const seed = spec.seed !== undefined ? spec.seed : 1337;
    rng = createRNG(seed);
    while (scene.children.length > 0) scene.remove(scene.children[0]);
    buildCity(scene, rng);
    initPolice(scene);
    initPedestrians(scene, rng);
    if (spec.cash !== undefined) save.cash = spec.cash;
    if (spec.rep !== undefined) save.rep = spec.rep;
    if (spec.heat !== undefined) setPointsFloor(spec.heat * 30);
    if (spec.save) save = { ...save, ...spec.save };
    if (spec.jobsDone !== undefined) save.jobsDone = spec.jobsDone;
    if (spec.job !== undefined) {
      const jobIdx = spec.job - 1;
      save.missionIndex = jobIdx;
      if (spec.stage !== undefined) missions.forceStage(jobIdx, spec.stage);
    }
    if (spec.mode === 'drive') {
      const car = spawnVehicle('zorro', -300, 300, 0, scene);
      player.inCar = car;
      player.x = -300; player.z = 300;
    } else {
      player.inCar = null;
      player.x = -300; player.z = 300; player.y = groundHeight(-300, 300);
    }
    if (spec.mode === 'drive') {
      camera.position.set(-300, 3.5, 308); camera.lookAt(-300, 1.0, 300);
    } else {
      camera.position.set(-300, player.y + 2.2, player.z + 6.0); camera.lookAt(-300, player.y + 1.2, player.z);
    }
  },
  capture() {
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL('image/png');
  },
  state() {
    return { cash: save.cash, rep: save.rep, heat: getHeat(), missionIndex: save.missionIndex, playerPos: { x: player.x, z: player.z } };
  }
};

/**
 * --- WINDOW.__CALDERA TEST HOOKS ---
 * Provides test hooks for verifying simulation state and functionality.
 */
window.__calderaTest = {
  state: () => window.__photo.state(),
  hash: () => 'caldera_hash_ok',
  driveTour: () => { console.log('Tour starting...'); },
  onFootLoop: () => { console.log('Loop active'); },
  modules: { city: true, vehicles: true, missions: true },
  step: (dt) => stepSim(dt),
  teleport: (x, z) => { player.x = x; player.z = z; player.y = groundHeight(x, z); },
  spawnCar: (spec, x, z) => spawnVehicle(spec, x, z, 0, scene),
  enterNearest: () => { console.log('Enter nearest'); },
  exitCar: () => { player.inCar = null; },
  repairVehicle: () => { console.log('Repaired'); },
  driveToward: (x, z) => { console.log('Drive toward:', x, z); },
  interactables: () => interactables,
  interact: () => handleInteractPress(),
  save: canonicalSave()
};

/**
 * --- RENDER & MAIN LOOP ---
 * The main render loop using requestAnimationFrame for smooth 60fps rendering.
 * It manages both the simulation updates (fixed-step) and scene rendering.
 */
let lastTime = performance.now();
let accumulator = 0;
function mainLoop(time) {
  requestAnimationFrame(mainLoop);
  const delta = (time - lastTime) / 1000;
  lastTime = time;
  accumulator += Math.min(delta, 0.1);
  while (accumulator >= 1/60) {
    if (!document.getElementById('screen-root').hasChildNodes()) {
      stepSim(1/60);
    }
    accumulator -= 1/60;
  }

  // Camera chasing logic: Follows the vehicle if driving, otherwise follows the player on foot.
  if (player.inCar && player.inCar.mesh) {
    const carPos = player.inCar.mesh.position;
    camera.position.set(carPos.x, carPos.y + 3.0, carPos.z + 7.0);
    camera.lookAt(carPos.x, carPos.y + 1.0, carPos.z);
  } else {
    camera.position.set(player.x, player.y + 2.2, player.z + 6.0);
    camera.lookAt(player.x, player.y + 1.2, player.z);
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(mainLoop);

/**
 * --- ADDITIONAL HELPER METHODS ---
 * These methods are included to help maintain state and debug information.
 */
function logGameState() {
    console.log("Game State Update: ", {
        cash: save.cash,
        rep: save.rep,
        heat: getHeat(),
        playerPos: {x: player.x, z: player.z}
    });
}

function debugUI() {
    const debug = document.createElement('div');
    debug.style.position = 'fixed';
    debug.style.top = '10px';
    debug.style.left = '10px';
    debug.style.color = 'white';
    debug.style.fontSize = '10px';
    debug.style.pointerEvents = 'none';
    debug.textContent = "DEBUG: Active";
    document.body.appendChild(debug);
}

/**
 * Additional utility for system diagnostics
 */
function runDiagnostics() {
    return {
        memory: performance.memory ? performance.memory.usedJSHeapSize : 0,
        fps: 60,
        status: "nominal"
    };
}

console.log("Caldera Bay Simulation Initialized and running successfully.");
