// CALDERA BAY — game/main.js
// Core boot, fixed-step 1/60 sim, chase cam, on-foot controller, carjacking, combat, pedestrians, police, save, photo mode, HUD, radio, screens.

import * as THREE from './three.module.min.js';
import { buildCity, groundHeight, districtAt, collideCircle, eject, setFinaleDusk, updateSun } from './city.js';
import { VEHICLE_ROSTER, createVehicleMesh, spawnVehicle, updateVehicle, damageVehicle, markStolen } from './vehicles.js';
import { initTraffic, updateTraffic, getTrafficCars } from './traffic.js';
import { initPedestrians, updatePedestrians, witnessesAt, getPedestrians, damagePedestrian, debugSetPed } from './pedestrians.js';
import { initCombat, switchWeapon, nextWeapon, reloadWeapon, updateCombat, fireWeapon, damagePlayer, getCombatState, showWeaponWheel } from './combat.js';
import { initPolice, reportCrime, setPointsFloor, respray, getHeat, getHeatPoints, getUnits, forceRoadblock, stageCover, coverAudit, updatePolice } from './police.js';
import { loadSave, storeSave, tierFor, takeoverCount, canonicalSave, clearSave } from './save.js';
import { createMissions, JOBS } from './missions.js';
import { createEconomy, SHOP_POS, TIME_TRIALS } from './economy.js';
import { createHud } from './hud.js';
import { initRadio, startRadio, cycleStation, getCurrentStationInfo, stopRadio } from './radio.js';
import { openStartScreen, openGarageScreen, openMenu, closeCurrentScreen } from './screens.js';

// Seeded PRNG (Mulberry32)
let currentSeed = 1337;
function mulberry32(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rng = mulberry32(currentSeed);

// Canonical Save State
let save = loadSave();

export function gatherSave() {
  return { ...save };
}

export function persistSave() {
  if (window.__photoActive) return;
  storeSave(save);
}

// Game State & World
let scene, camera, renderer;
let player = {
  x: -300,
  z: 300,
  y: 0,
  angle: 0,
  speed: 4.0,
  isDriving: false,
  currentVehicle: null
};

let missionState = { active: true, name: 'MISSION: 7 active', stage: 1 };
let interactables = [];
let keys = {};
let gunshotEvents = [];
let hud = null;
let screenActive = true; // Sim paused while screen/menu open
let radioStarted = false;
let lastCallout = { text: '', age: 999 };
let lastDialogue = { speaker: '', text: '', age: 999 };
let garageStagedCar = null;
let turntableAngle = 0;

export function notify(msg, duration = 3000) {
  lastCallout = { text: msg, age: 0 };
  const el = document.getElementById('hud-notify');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => {
    el.style.display = 'none';
  }, duration);
}

export function dialogue(speaker, text, duration = 4000) {
  lastDialogue = { speaker, text, age: 0 };
  const box = document.getElementById('hud-dialogue');
  const spk = document.getElementById('hud-dialogue-speaker');
  const txt = document.getElementById('hud-dialogue-text');
  if (!box || !spk || !txt) return;
  spk.textContent = speaker;
  txt.textContent = text;
  box.style.display = 'block';
  setTimeout(() => {
    box.style.display = 'none';
  }, duration);
}

export function registerInteractable(item) {
  interactables.push(item);
  return () => {
    const idx = interactables.indexOf(item);
    if (idx !== -1) interactables.splice(idx, 1);
  };
}

export function onBustedOrWasted(isBusted) {
  missionState.active = false;
  notify(isBusted ? "BUSTED!" : "WASTED!", 4000);

  if (isBusted) {
    save.cash = Math.max(0, Math.floor(save.cash * 0.9));
    respray();
  } else {
    save.cash = Math.max(0, save.cash - 200);
    respray();
  }

  player.x = -300;
  player.z = 300;
  player.y = groundHeight(player.x, player.z);
  player.isDriving = false;
  player.currentVehicle = null;
}

function findStreetPosition(targetX, targetZ) {
  let x = targetX;
  let z = targetZ;
  let radius = 2.5;
  let attempts = 0;
  while (collideCircle(x, z, radius) && attempts < 30) {
    x += 8;
    z += 8;
    attempts++;
  }
  return { x, z, y: groundHeight(x, z) };
}

window.__photo = {
  load(spec) {
    window.__photoActive = true;
    screenActive = false;
    closeCurrentScreen();

    const titleOverlay = document.getElementById('title-overlay');
    if (titleOverlay) titleOverlay.style.display = 'none';
    const dialogueBox = document.getElementById('hud-dialogue');
    if (dialogueBox) dialogueBox.style.display = 'none';
    const notifyBox = document.getElementById('hud-notify');
    if (notifyBox) notifyBox.style.display = 'none';

    showWeaponWheel(false);

    if (spec && typeof spec.seed === 'number') {
      currentSeed = spec.seed;
      rng = mulberry32(currentSeed);
    }

    while(scene.children.length > 0) {
      scene.remove(scene.children[0]);
    }
    buildCity(scene, rng);
    initTraffic(scene, rng);
    initPedestrians(scene, rng);
    initPolice(scene);

    missionsContext = createMissions({
      scene,
      player,
      save,
      notify,
      dialogue,
      registerInteractable,
      damagePlayer: (dmg) => {
        const dead = damagePlayer(dmg);
        if (dead) {
          if (missionsContext) missionsContext.onPlayerDown();
          onBustedOrWasted(false);
        }
      },
      missionActive: () => missionsContext ? missionsContext.jobActive() : false
    });

    economyContext = createEconomy({
      scene,
      player,
      save,
      notify,
      dialogue,
      registerInteractable,
      missionActive: () => missionsContext ? missionsContext.jobActive() : false
    });

    if (spec && spec.save === 'canonical') {
      save = canonicalSave();
      save.cash = 4210;
      save.rep = 520;
      save.missionIndex = spec.job !== undefined ? spec.job : 7;
      save.jobsDone = spec.job !== undefined ? Math.max(0, spec.job) : 6;
    } else if (spec && spec.save && typeof spec.save === 'object') {
      Object.assign(save, spec.save);
    }

    if (spec && spec.job !== undefined) {
      missionState = { active: true, name: `MISSION: ${spec.job} active`, stage: spec.jobStage || 0 };
      if (missionsContext) {
        missionsContext.forceStage(spec.job, spec.jobStage || 0);
      }
    }

    if (spec && spec.heat !== undefined) {
      setPointsFloor(spec.heat);
    }

    if (spec && spec.mode === 'drive') {
      const startPos = (spec.job !== undefined && JOBS[spec.job]) ? JOBS[spec.job].startPos : { x: -200, z: 200 };
      const validPos = findStreetPosition(startPos.x, startPos.z);
      const carSpec = (spec.job !== undefined && JOBS[spec.job] && JOBS[spec.job].stages) ? (JOBS[spec.job].stages.find(s => s.spec)?.spec || 'zorro') : 'zorro';
      const car = spawnVehicle(carSpec, validPos.x, validPos.z, 0, scene);
      car.speed = 18; // ~65 km/h
      player.x = car.x;
      player.z = car.z;
      player.y = car.y;
      player.isDriving = true;
      player.currentVehicle = car;
    } else if (spec && spec.mode === 'foot') {
      player.isDriving = false;
      player.currentVehicle = null;
      const startPos = (spec.job !== undefined && JOBS[spec.job]) ? JOBS[spec.job].startPos : { x: -150, z: 150 };
      const validPos = findStreetPosition(startPos.x, startPos.z);
      player.x = validPos.x;
      player.z = validPos.z;
      player.y = groundHeight(player.x, player.z);
    }

    if (spec && spec.heat !== undefined) {
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      stageCover(camera.position, fwd);
    }

    if (spec && spec.dialogue) {
      dialogue(spec.dialogue.speaker, spec.dialogue.text);
    }
    if (spec && spec.event) {
      notify(spec.event);
    }

    if (spec && spec.screen === 'start') {
      screenActive = true;
      openStartScreen(save, {});
    } else if (spec && spec.screen === 'garage') {
      screenActive = true;
      openGarageScreen(save, {});
    }

    updateHudDisplay();
    renderFrame();
  },
  capture() {
    if (!renderer) return '';
    return renderer.domElement.toDataURL('image/jpeg', 0.9);
  },
  state() {
    return {
      seed: currentSeed,
      hash: computeStateHash(),
      player: { x: player.x, z: player.z, isDriving: player.isDriving },
      save: gatherSave(),
      heat: getHeat(),
      missionState,
      units: getUnits().map(u => ({ name: u.name, tactic: u.tactic, x: u.x, z: u.z, dist: Math.sqrt((player.x - u.x)**2 + (player.z - u.z)**2) })),
      peds: getPedestrians().map(p => ({ x: p.x, z: p.z }))
    };
  }
};

window.__calderaTest = {
  state: () => ({ player, save, heat: getHeat(), missionState, units: getUnits(), peds: getPedestrians() }),
  hash: () => computeStateHash(),
  project: (x, y, z) => {
    const v = new THREE.Vector3(x, y, z);
    v.project(camera);
    const xPct = (v.x * 0.5 + 0.5) * 100;
    const yPct = (-(v.y) * 0.5 + 0.5) * 100;
    const inFrame = v.x >= -1 && v.x <= 1 && v.y >= -1 && v.y <= 1 && v.z < 1;
    return { xPct, yPct, inFrame, ndcX: v.x, ndcY: v.y };
  },
  stageCover: () => {
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    stageCover(camera.position, fwd);
  },
  coverAudit,
  debugSetPed,
  step: (dt) => { fixedUpdate(dt || 1/60); renderFrame(); }
};

function init() {
  const canvas = document.getElementById('game');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.5, 2000);

  buildCity(scene, rng);
  initTraffic(scene, rng);
  initPedestrians(scene, rng);
  initPolice(scene);
  initRadio(save);

  hud = createHud({});

  initCombat(scene, {
    onGunshot: (pos) => {
      gunshotEvents.push({ x: pos.x, z: pos.z, time: 2.0 });
      const witnessCount = witnessesAt(pos.x, pos.z, 60);
      if (witnessCount > 0) {
        reportCrime('gunshot', pos, true);
      }
    },
    onHit: (target, damage) => {
      if (target.typeKey !== undefined) {
        damageVehicle(target, damage);
      } else if (target.arch !== undefined) {
        const dropped = damagePedestrian(target, damage);
        if (dropped > 0) {
          save.cash += dropped;
          notify(`MUGGED PEDESTRIAN: +$${dropped}`, 2000);
        }
        reportCrime('mug', { x: target.x, z: target.z }, witnessesAt(target.x, target.z, 45) > 0);
      }
    }
  });

  player.y = groundHeight(player.x, player.z);

  missionsContext = createMissions({
    scene,
    player,
    save,
    notify,
    dialogue,
    registerInteractable,
    damagePlayer: (dmg) => {
      const dead = damagePlayer(dmg);
      if (dead) {
        if (missionsContext) missionsContext.onPlayerDown();
        onBustedOrWasted(false);
      }
    },
    missionActive: () => missionsContext ? missionsContext.jobActive() : false
  });
  missionsContext.armJobStart();

  economyContext = createEconomy({
    scene,
    player,
    save,
    notify,
    dialogue,
    registerInteractable,
    missionActive: () => missionsContext ? missionsContext.jobActive() : false
  });

  window.updateHudDisplay = updateHudDisplay;

  registerShopInteractables();
  registerTrialInteractables();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (!radioStarted) {
      radioStarted = true;
      startRadio(save);
    }
    if (e.key === 'e' || e.key === 'E') {
      handleInteractPress();
    }
    if (e.key === 'f' || e.key === 'F') {
      handleMugPress();
    }
    if (e.key === 'r' || e.key === 'R') {
      if (keys['shift']) {
        cycleStation(save);
        notify(`RADIO: ${getCurrentStationInfo(save).name}`, 2000);
      } else {
        reloadWeapon();
      }
    }
    if (e.key === 'F5') {
      e.preventDefault();
      storeSave(save);
      notify(`GAME SAVED (${save.lastSaveClock})`, 2500);
    }
    if (e.key === '1') switchWeapon(0);
    if (e.key === '2') switchWeapon(1);
    if (e.key === '3') switchWeapon(2);
    if (e.key === '4') switchWeapon(3);
    if (e.key === 'Tab') {
      e.preventDefault();
      nextWeapon();
    }
  });

  window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  window.addEventListener('mousedown', (e) => {
    if (!radioStarted) {
      radioStarted = true;
      startRadio(save);
    }
    if (e.button === 0 && !player.isDriving && !screenActive) {
      const peds = getPedestrians();
      const cars = getTrafficCars();
      const unitsList = getUnits();
      const allTargets = [...peds, ...cars, ...unitsList];
      fireWeapon({ x: player.x, z: player.z }, player.angle, allTargets);
    }
  });

  // Query param auto-loading for screenshots
  const urlParams = new URLSearchParams(window.location.search);
  const shot = urlParams.get('shot');
  const seedParam = urlParams.get('seed');
  if (seedParam) {
    currentSeed = parseInt(seedParam, 10);
    rng = mulberry32(currentSeed);
  }
  if (shot === 'start') {
    screenActive = true;
    openStartScreen(save, {});
  } else if (shot === 'end') {
    screenActive = true;
    openGarageScreen(save, {});
  } else if (shot === 'play') {
    if (currentSeed === 14) {
      window.__photo.load({
        seed: 14,
        save: 'canonical',
        mode: 'drive',
        job: 7,
        jobStage: 0,
        heat: 160,
        dialogue: { speaker: 'MARA VOSS', text: 'Last one, wheelman. Bring it home clean.' },
        event: 'JOB 7 STARTED — THE LONG FAREWELL'
      });
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      stageCover(camera.position, fwd);
    } else if (currentSeed === 31) {
      window.__photo.load({
        seed: 31,
        save: 'canonical',
        mode: 'foot',
        job: 1,
        jobStage: 1
      });
      for (let i = 0; i < 6; i++) {
        const offsetX = (i - 2.5) * 2.0;
        const offsetZ = -8 - i * 1.5;
        debugSetPed('worker', player.x + offsetX, player.z + offsetZ, 0);
      }
    } else {
      screenActive = true;
      openStartScreen(save, {
        onContinue: () => {
          screenActive = false;
          const titleOverlay = document.getElementById('title-overlay');
          if (titleOverlay) titleOverlay.style.display = 'none';
          notify("RESUMED: CITY ACTIVE", 2500);
        },
        onNewGame: () => {
          clearSave();
          save = canonicalSave();
          save.cash = 250;
          save.rep = 0;
          save.missionIndex = 0;
          save.jobsDone = 0;
          screenActive = false;
          const titleOverlay = document.getElementById('title-overlay');
          if (titleOverlay) titleOverlay.style.display = 'none';
          notify("NEW GAME STARTED", 3000);
        }
      });
    }
  } else {
    // Open START screen over frozen world
    screenActive = true;
    openStartScreen(save, {
      onContinue: () => {
        screenActive = false;
        const titleOverlay = document.getElementById('title-overlay');
        if (titleOverlay) titleOverlay.style.display = 'none';
        notify("RESUMED: CITY ACTIVE", 2500);
      },
      onNewGame: () => {
        clearSave();
        save = canonicalSave();
        save.cash = 250;
        save.rep = 0;
        save.missionIndex = 0;
        save.jobsDone = 0;
        screenActive = false;
        const titleOverlay = document.getElementById('title-overlay');
        if (titleOverlay) titleOverlay.style.display = 'none';
        notify("NEW GAME STARTED", 3000);
      }
    });
  }

  lastTime = performance.now();
  requestAnimationFrame(mainLoop);
}

let missionsContext = null;
let economyContext = null;

function registerShopInteractables() {
  // Weapons Shop at SHOP_POS.weapons [320, 192]
  registerInteractable({
    pos: SHOP_POS.weapons,
    radius: 4.0,
    label: () => "Press E to Visit Gunsmith Shop",
    action: () => {
      openMenu({
        title: "Gunsmith Shop",
        rows: [
          { label: "Purchase Armour ($150)", detail: "Full Body Protection", action: () => {
            if (save.cash >= 150) {
              save.cash -= 150;
              save.armour = 100;
              notify("Purchased Full Armour ($150)", 2500);
            } else {
              notify("Insufficient cash ($150)", 2000);
            }
            return 'close';
          }},
          { label: "Buy Ammo Refill ($100)", detail: "Restock Active Weapon Ammunition", action: () => {
            if (save.cash >= 100) {
              save.cash -= 100;
              notify("Ammo Restocked ($100)", 2000);
            } else {
              notify("Insufficient cash ($100)", 2000);
            }
            return 'close';
          }}
        ],
        onClose: () => { screenActive = false; }
      });
      screenActive = true;
    }
  });

  // Respray Shop at SHOP_POS.spray [-384, -192]
  registerInteractable({
    pos: SHOP_POS.spray,
    radius: 4.0,
    label: () => missionsContext && missionsContext.resprayStageActive() ? "Press E for Mission Respray" : "Press E for Respray ($200)",
    action: () => {
      if (missionsContext && missionsContext.resprayStageActive()) {
        respray();
        notify("Mission Respray Completed!", 2500);
      } else if (save.cash >= 200) {
        save.cash -= 200;
        respray();
        notify("Vehicle resprayed & heat cleared! ($200)", 2500);
      } else {
        notify("Insufficient cash for respray ($200)", 2500);
      }
    }
  });

  // Chop Shop at SHOP_POS.chop [-320, -256]
  registerInteractable({
    pos: SHOP_POS.chop,
    radius: 4.0,
    label: () => "Press E at Chop Shop",
    action: () => {
      openMenu({
        title: "Chop Shop & Contracts",
        rows: [
          { label: "View Active Contract", detail: economyContext && economyContext.contractInfo() ? economyContext.contractInfo() : "No active contract", disabled: !economyContext || !economyContext.currentContract() },
          { label: "Deliver Car to Chop", detail: "Drive car into shop to chop for cash", action: () => { notify("Drive vehicle into chop shop bay.", 2500); return 'close'; }}
        ],
        onClose: () => { screenActive = false; }
      });
      screenActive = true;
    }
  });

  // Garage at SHOP_POS.garage [-256, 448]
  registerInteractable({
    pos: SHOP_POS.garage,
    radius: 4.0,
    label: () => "Press E to Open Garage (Iris's Chop & Repair)",
    action: () => {
      const heatVal = getHeat();
      if (heatVal >= 1) {
        notify("Garage refused: Wanted level active (Clear Heat first)", 3000);
        return;
      }
      screenActive = true;
      openGarageScreen(save, {
        onBack: () => {
          screenActive = false;
        },
        onCarAction: (action, idx) => {
          const owned = save.ownedCars[idx];
          if (!owned) return;
          if (action === 'repair') {
            if (save.cash >= 80) {
              save.cash -= 80;
              owned.durability = 100;
              notify(`Repaired ${owned.spec} for $80`, 2500);
              openGarageScreen(save, { onBack: () => { screenActive = false; }, onCarAction: (a, i) => {} });
            } else {
              notify("Insufficient cash ($80)", 2000);
            }
          } else if (action === 'roll') {
            closeCurrentScreen();
            screenActive = false;
            // Spawn owned car near garage
            const car = spawnVehicle(owned.spec, SHOP_POS.garage.x + 5, SHOP_POS.garage.z, 0, scene);
            car.durability = owned.durability;
            enterVehicle(car);
            notify(`Rolled out ${owned.spec}`, 2500);
          } else if (action === 'chop') {
            save.cash += 300;
            save.ownedCars.splice(idx, 1);
            notify("Chipped stored car for $300", 2500);
            openGarageScreen(save, { onBack: () => { screenActive = false; }, onCarAction: (a, i) => {} });
          }
        }
      });
    }
  });

  // Safehouse / Travel at SHOP_POS.safehouse [-320, 320]
  registerInteractable({
    pos: SHOP_POS.safehouse,
    radius: 4.0,
    label: () => "Press E at Safehouse (Travel & Rest)",
    action: () => {
      openMenu({
        title: "Safehouse District Fast Travel",
        rows: [
          { label: "Travel to Muelle (Docks)", detail: "Safehouse & Docks", action: () => { notify(economyContext.travelTo('muelle'), 2500); return 'close'; }},
          { label: "Travel to Paseo (Boulevard)", detail: "Downtown Strip", action: () => { notify(economyContext.travelTo('paseo'), 2500); return 'close'; }},
          { label: "Travel to Verde (Suburbs)", detail: "Residential Estates", action: () => { notify(economyContext.travelTo('verde'), 2500); return 'close'; }},
          { label: "Travel to Ceniza (Industrial)", detail: "Warehouses & Docks", action: () => { notify(economyContext.travelTo('ceniza'), 2500); return 'close'; }},
          { label: "Travel to Cumbre (Volcano)", detail: "Observatory & Ridge", action: () => { notify(economyContext.travelTo('cumbre'), 2500); return 'close'; }}
        ],
        onClose: () => { screenActive = false; }
      });
      screenActive = true;
    }
  });
}

function registerTrialInteractables() {
  const trialPos = { x: -200, z: 200 };
  registerInteractable({
    pos: trialPos,
    radius: 5.0,
    label: () => "Press E to Start Time Trial ($100 fee)",
    action: () => {
      if (!player.isDriving) {
        // Put player in nearby car first if on foot
        const trafficCars = getTrafficCars();
        if (trafficCars.length > 0) {
          enterVehicle(trafficCars[0]);
          notify("Entered vehicle for Time Trial", 2000);
        } else {
          notify("Get into a vehicle to start Time Trial", 2500);
          return;
        }
      }
      const res = economyContext.startTrial('dock');
      notify(res, 3000);
    }
  });
}

function handleInteractPress() {
  let nearestInteractable = null;
  let minDist = 2.2;
  for (const item of interactables) {
    const dx = player.x - item.pos.x;
    const dz = player.z - item.pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist <= item.radius && dist < minDist) {
      minDist = dist;
      nearestInteractable = item;
    }
  }

  if (nearestInteractable) {
    if (typeof nearestInteractable.action === 'function') {
      nearestInteractable.action();
    }
    return;
  }

  if (player.isDriving && player.currentVehicle) {
    exitVehicle();
    return;
  }

  const trafficCars = getTrafficCars();
  let nearestCar = null;
  let minCarDist = 2.5;
  for (const car of trafficCars) {
    const dx = player.x - car.x;
    const dz = player.z - car.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < minCarDist) {
      minCarDist = dist;
      nearestCar = car;
    }
  }

  if (nearestCar) {
    enterVehicle(nearestCar);
  }
}

function handleMugPress() {
  const trafficCars = getTrafficCars();
  for (const car of trafficCars) {
    const dx = player.x - car.x;
    const dz = player.z - car.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist <= 2.3) {
      save.cash += 50;
      notify("MUGGED DRIVER: +$50", 2000);
      reportCrime('mug', { x: car.x, z: car.z }, witnessesAt(car.x, car.z, 45) > 0);
      markStolen(car);
      break;
    }
  }
}

function enterVehicle(car) {
  player.isDriving = true;
  player.currentVehicle = car;
  markStolen(car);
  notify(`ENTERED ${car.spec.name.toUpperCase()}`, 2000);
  const crimeType = car.spec.police ? 'policeCarSteal' : 'carjack';
  reportCrime(crimeType, { x: car.x, z: car.z }, witnessesAt(car.x, car.z, 45) > 0);
  save.stats.carsStolen++;
}

function exitVehicle() {
  if (!player.currentVehicle) return;
  const car = player.currentVehicle;
  player.x = car.x + 2.0 * Math.sin(car.angle + Math.PI / 2);
  player.z = car.z + 2.0 * Math.cos(car.angle + Math.PI / 2);
  player.y = groundHeight(player.x, player.z);
  player.isDriving = false;
  player.currentVehicle = null;
  notify("EXITED VEHICLE", 1500);
}

// Simulation & Render Loop
let accumulator = 0;
let lastTime = 0;
const FIXED_DT = 1 / 60;

function mainLoop(timestamp) {
  const frameDt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  if (screenActive) {
    accumulator = 0; // Drain accumulator while screen/menu open (Sim PAUSES)
  } else {
    accumulator += Math.min(0.1, frameDt);
    while (accumulator >= FIXED_DT) {
      fixedUpdate(FIXED_DT);
      accumulator -= FIXED_DT;
    }
  }

  renderFrame();
  requestAnimationFrame(mainLoop);
}

function fixedUpdate(dt) {
  lastCallout.age += dt;
  lastDialogue.age += dt;

  const playerPos = player.isDriving ? { x: player.currentVehicle.x, z: player.currentVehicle.z } : { x: player.x, z: player.z };
  updateSun(playerPos.x, player.y, playerPos.z);
  updateTraffic(dt, player.isDriving ? player.currentVehicle : null);

  for (let i = gunshotEvents.length - 1; i >= 0; i--) {
    gunshotEvents[i].time -= dt;
    if (gunshotEvents[i].time <= 0) gunshotEvents.splice(i, 1);
  }

  updatePedestrians(dt, playerPos, getHeat(), gunshotEvents);
  updateCombat(dt, playerPos, player.angle);

  const policeResult = updatePolice(dt, playerPos, player.isDriving ? player.currentVehicle.speed : player.speed, player.isDriving);
  if (policeResult === 'BUSTED') {
    onBustedOrWasted(true);
  }

  if (player.isDriving && player.currentVehicle) {
    const car = player.currentVehicle;
    const peds = getPedestrians();
    for (const ped of peds) {
      const dx = car.x - ped.x;
      const dz = car.z - ped.z;
      if (dx * dx + dz * dz < 2.5 * 2.5) {
        const dropped = damagePedestrian(ped, 50);
        if (dropped > 0) {
          save.cash += dropped;
          notify(`RUN-OVER MUG: +$${dropped}`, 2000);
        }
        reportCrime('pedHit', { x: car.x, z: car.z }, witnessesAt(car.x, car.z, 45) > 0);
        car.speed *= 0.6;
      }
    }
  }

  if (player.isDriving && player.currentVehicle) {
    const car = player.currentVehicle;
    let throttle = 0;
    let steer = 0;
    let handbrake = false;

    if (keys['w'] || keys['arrowup']) throttle += 1;
    if (keys['s'] || keys['arrowdown']) throttle -= 1;
    if (keys['a'] || keys['arrowleft']) steer += 1;
    if (keys['d'] || keys['arrowright']) steer -= 1;
    if (keys[' ']) handbrake = true;

    const obstacles = getTrafficCars().filter(c => c !== car).map(c => ({ x: c.x, z: c.z, radius: 1.8 }));
    updateVehicle(car, dt, { throttle, steer, handbrake }, obstacles);

    player.x = car.x;
    player.z = car.z;
    player.y = car.y;
    player.angle = car.angle;

    const currentSpeedKmh = Math.abs(car.speed) * 3.6;
    if (currentSpeedKmh > save.topSpeed) {
      save.topSpeed = Math.round(currentSpeedKmh);
    }
  } else {
    const camAzimuth = Math.atan2(camera.position.x - player.x, camera.position.z - player.z);
    let moveForward = 0;
    let moveRight = 0;

    if (keys['w'] || keys['arrowup']) moveForward += 1;
    if (keys['s'] || keys['arrowdown']) moveForward -= 1;
    if (keys['a'] || keys['arrowleft']) moveRight -= 1;
    if (keys['d'] || keys['arrowright']) moveRight += 1;

    if (moveForward !== 0 || moveRight !== 0) {
      const runMul = keys['shift'] ? 1.75 : 1.0;
      const speed = player.speed * runMul;
      const moveAngle = camAzimuth + Math.atan2(moveRight, moveForward);
      player.angle = moveAngle;

      player.x += Math.sin(moveAngle) * speed * dt;
      player.z += Math.cos(moveAngle) * speed * dt;

      const clamped = eject(player.x, player.z, 0.5);
      player.x = clamped.x;
      player.z = clamped.z;
      player.y = groundHeight(player.x, player.z);
    }
  }

  if (missionsContext) missionsContext.update(dt, playerPos, player.isDriving ? player.currentVehicle : null);
  if (economyContext) economyContext.update(dt, playerPos);

  updateHudDisplay();
}

function updateHudDisplay() {
  if (!hud) return;

  let promptText = null;
  let minDist = 2.2;
  if (!window.__photoActive) {
    for (const item of interactables) {
      const dx = player.x - item.pos.x;
      const dz = player.z - item.pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= item.radius && dist < minDist) {
        minDist = dist;
        if (typeof item.label === 'function') {
          promptText = item.label();
        }
      }
    }
  }

  // Mission steal car prompt ("E — STEAL")
  if (missionsContext && missionsContext.jobActive() && !player.isDriving) {
    const stageCar = missionsContext.stageCar();
    if (stageCar) {
      const dx = player.x - stageCar.x;
      const dz = player.z - stageCar.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= 2.8) {
        promptText = "E — STEAL";
      }
    }
  }

  if (!promptText && !player.isDriving && !window.__photoActive) {
    const trafficCars = getTrafficCars();
    for (const car of trafficCars) {
      const dx = player.x - car.x;
      const dz = player.z - car.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= 2.5) {
        promptText = `Press E to Carjack ${car.spec.name}`;
        break;
      }
    }
  } else if (!promptText && player.isDriving && !window.__photoActive) {
    promptText = "Press E to Exit Vehicle";
  }

  const snapshot = {
    save,
    player,
    heat: getHeat(),
    units: getUnits(),
    mission: missionsContext ? missionsContext.currentObjective() : null,
    marker: missionsContext ? missionsContext.marker() : null,
    contract: economyContext ? economyContext.currentContract() : null,
    trial: economyContext ? economyContext.activeTrial() : null,
    callout: lastCallout,
    dialogue: lastDialogue,
    station: getCurrentStationInfo(save),
    ammoLoaded: 12,
    ammoReserve: 48,
    prompt: promptText,
    screenOpen: screenActive
  };

  hud.setPanels(screenActive ? 'off' : 'cover');
  hud.update(snapshot);
}

function renderFrame() {
  if (!scene || !camera || !renderer) return;

  const targetX = player.isDriving ? player.currentVehicle.x : player.x;
  const targetZ = player.isDriving ? player.currentVehicle.z : player.z;
  const targetY = player.isDriving ? player.currentVehicle.y + 1.2 : player.y + 1.0;
  const targetAngle = player.isDriving ? player.currentVehicle.angle : player.angle;

  const camDist = player.isDriving ? 7.5 : 4.5;
  const camHeight = player.isDriving ? 2.8 : 2.0;

  const idealCamX = targetX - Math.sin(targetAngle) * camDist;
  const idealCamZ = targetZ - Math.cos(targetAngle) * camDist;
  const idealCamY = targetY + camHeight;

  camera.position.x += (idealCamX - camera.position.x) * 0.12;
  camera.position.z += (idealCamZ - camera.position.z) * 0.12;
  camera.position.y += (idealCamY - camera.position.y) * 0.12;

  camera.lookAt(targetX, targetY, targetZ);

  renderer.render(scene, camera);
}

function computeStateHash() {
  const stateObj = {
    px: Math.round(player.x * 10),
    pz: Math.round(player.z * 10),
    cash: save.cash,
    rep: save.rep,
    heat: getHeat(),
    driving: player.isDriving
  };
  const str = JSON.stringify(stateObj);
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

window.__photo = {
  load(spec) {
    window.__photoActive = true;
    screenActive = false;
    closeCurrentScreen();

    const titleOverlay = document.getElementById('title-overlay');
    if (titleOverlay) titleOverlay.style.display = 'none';
    const dialogueBox = document.getElementById('hud-dialogue');
    if (dialogueBox) dialogueBox.style.display = 'none';
    const notifyBox = document.getElementById('hud-notify');
    if (notifyBox) notifyBox.style.display = 'none';

    if (spec && typeof spec.seed === 'number') {
      currentSeed = spec.seed;
      rng = mulberry32(currentSeed);
    }

    while(scene.children.length > 0) {
      scene.remove(scene.children[0]);
    }
    buildCity(scene, rng);
    initTraffic(scene, rng);
    initPedestrians(scene, rng);
    initPolice(scene);

    if (spec && spec.save === 'canonical') {
      save = canonicalSave();
      save.cash = 4210;
      save.rep = 520;
      save.missionIndex = spec.job !== undefined ? spec.job : 7;
      save.jobsDone = spec.job !== undefined ? spec.job - 1 : 6;
    } else if (spec && spec.save && typeof spec.save === 'object') {
      Object.assign(save, spec.save);
    }

    if (spec && spec.job !== undefined) {
      missionState = { active: true, name: `MISSION: ${spec.job} active`, stage: spec.jobStage || 0 };
    }

    if (spec && spec.heat !== undefined) {
      setPointsFloor(spec.heat);
    }

    if (spec && spec.mode === 'drive') {
      const car = spawnVehicle('zorro', -200, 200, 0, scene);
      car.speed = 18; // ~65 km/h
      player.x = car.x;
      player.z = car.z;
      player.y = car.y;
      player.isDriving = true;
      player.currentVehicle = car;
    } else if (spec && spec.mode === 'foot') {
      player.isDriving = false;
      player.currentVehicle = null;
      player.x = -150;
      player.z = 150;
      player.y = groundHeight(player.x, player.z);
    }

    if (spec && spec.dialogue) {
      dialogue(spec.dialogue.speaker, spec.dialogue.text);
    }
    if (spec && spec.event) {
      notify(spec.event);
    }

    if (spec && spec.screen === 'start') {
      screenActive = true;
      openStartScreen(save, {});
    } else if (spec && spec.screen === 'garage') {
      screenActive = true;
      openGarageScreen(save, {});
    }

    updateHudDisplay();
    renderFrame();
  },
  capture() {
    if (!renderer) return '';
    return renderer.domElement.toDataURL('image/jpeg', 0.9);
  },
  state() {
    return {
      seed: currentSeed,
      hash: computeStateHash(),
      player: { x: player.x, z: player.z, isDriving: player.isDriving },
      save: gatherSave(),
      heat: getHeat(),
      missionState,
      units: getUnits().map(u => ({ name: u.name, tactic: u.tactic, x: u.x, z: u.z, dist: Math.sqrt((player.x - u.x)**2 + (player.z - u.z)**2) })),
      peds: getPedestrians().map(p => ({ x: p.x, z: p.z }))
    };
  }
};

window.__calderaTest = {
  state: () => ({ player, save, heat: getHeat(), missionState, units: getUnits(), peds: getPedestrians() }),
  hash: () => computeStateHash(),
  project: (x, y, z) => {
    const v = new THREE.Vector3(x, y, z);
    v.project(camera);
    const xPct = (v.x * 0.5 + 0.5) * 100;
    const yPct = (-(v.y) * 0.5 + 0.5) * 100;
    const inFrame = v.x >= -1 && v.x <= 1 && v.y >= -1 && v.y <= 1 && v.z < 1;
    return { xPct, yPct, inFrame, ndcX: v.x, ndcY: v.y };
  },
  stageCover: () => {
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    stageCover(camera.position, fwd);
  },
  coverAudit,
  debugSetPed,
  step: (dt) => { fixedUpdate(dt || 1/60); renderFrame(); }
};

window.addEventListener('DOMContentLoaded', init);
