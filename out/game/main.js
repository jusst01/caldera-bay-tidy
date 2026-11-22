// CALDERA BAY — game/main.js
// Core boot, fixed-step 1/60 sim, chase cam, on-foot controller, carjacking, combat, pedestrians, police integration, save state, photo mode, test hooks.

import * as THREE from './three.module.min.js';
import { buildCity, groundHeight, districtAt, collideCircle, eject, setFinaleDusk, updateSun } from './city.js';
import { VEHICLE_ROSTER, createVehicleMesh, spawnVehicle, updateVehicle, damageVehicle, markStolen } from './vehicles.js';
import { initTraffic, updateTraffic, getTrafficCars } from './traffic.js';
import { initPedestrians, updatePedestrians, witnessesAt, getPedestrians, damagePedestrian, debugSetPed } from './pedestrians.js';
import { initCombat, switchWeapon, nextWeapon, reloadWeapon, updateCombat, fireWeapon, damagePlayer, getCombatState, showWeaponWheel } from './combat.js';
import { initPolice, reportCrime, setPointsFloor, respray, getHeat, getHeatPoints, getUnits, forceRoadblock, stageCover, coverAudit, updatePolice } from './police.js';

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
let save = {
  cash: 4210,
  rep: 520,
  repTitle: 'FIXER',
  jobs: '6/8',
  mission: '7 active',
  takeover: '3/5',
  autosave: '14:32',
  stolen: 41,
  topSpeed: 247,
  maxHeat: 5,
  ammo: 100,
  health: 100
};

export function gatherSave() {
  return { ...save };
}

export function persistSave() {
  if (window.__photoActive) return;
  try {
    localStorage.setItem('caldera_bay_save', JSON.stringify(save));
  } catch (e) {}
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

export function notify(msg, duration = 3000) {
  const el = document.getElementById('hud-notify');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => {
    el.style.display = 'none';
  }, duration);
}

export function dialogue(speaker, text, duration = 4000) {
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

registerInteractable({
  pos: { x: -300, z: 300 },
  radius: 3.5,
  label: () => "Press E to Save Game & Rest",
  action: () => {
    persistSave();
    respray();
    notify("GAME SAVED AT MUELLE SAFEHOUSE", 2500);
    dialogue("SAFEHOUSE", "Rested up. Wanted level cleared, cash and reputation secured.");
  }
});

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
        // Vehicle target
        damageVehicle(target, damage);
      } else if (target.arch !== undefined) {
        // Pedestrian target
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

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === 'e' || e.key === 'E') {
      handleInteractPress();
    }
    if (e.key === 'f' || e.key === 'F') {
      handleMugPress();
    }
    if (e.key === 'r' || e.key === 'R') {
      reloadWeapon();
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
    if (e.button === 0 && !player.isDriving) {
      const peds = getPedestrians();
      const cars = getTrafficCars();
      const unitsList = getUnits();
      const allTargets = [...peds, ...cars, ...unitsList];
      fireWeapon({ x: player.x, z: player.z }, player.angle, allTargets);
    }
  });

  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      const overlay = document.getElementById('title-overlay');
      if (overlay) overlay.style.opacity = '0';
      setTimeout(() => {
        if (overlay) overlay.style.display = 'none';
      }, 500);
    });
  }

  lastTime = performance.now();
  requestAnimationFrame(mainLoop);
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
  save.stolen++;
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

  accumulator += Math.min(0.1, frameDt);

  while (accumulator >= FIXED_DT) {
    fixedUpdate(FIXED_DT);
    accumulator -= FIXED_DT;
  }

  renderFrame();
  requestAnimationFrame(mainLoop);
}

function fixedUpdate(dt) {
  const playerPos = player.isDriving ? { x: player.currentVehicle.x, z: player.currentVehicle.z } : { x: player.x, z: player.z };
  updateSun(playerPos.x, player.y, playerPos.z);
  updateTraffic(dt, player.isDriving ? player.currentVehicle : null);

  // Gunshot events timer
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

  // Pedestrian run-over check
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

  updateHudDisplay();
}

function updateHudDisplay() {
  const cashEl = document.getElementById('hud-cash');
  const repEl = document.getElementById('hud-rep');
  const heatEl = document.getElementById('hud-heat');
  const missionEl = document.getElementById('hud-mission');
  const districtEl = document.getElementById('hud-district-name');
  const autosaveEl = document.getElementById('hud-autosave');
  const speedEl = document.getElementById('hud-speedometer');
  const promptEl = document.getElementById('hud-prompt');

  if (cashEl) cashEl.textContent = `CASH: $${save.cash.toLocaleString()}`;
  if (repEl) repEl.textContent = `REP: ${save.rep} (${save.repTitle})`;
  if (heatEl) {
    const heatVal = getHeat();
    const stars = '★'.repeat(heatVal) + '☆'.repeat(5 - heatVal);
    heatEl.textContent = `HEAT: ${stars}`;
  }
  if (missionEl) missionEl.textContent = missionState.name;
  if (districtEl) {
    const distId = districtAt(player.x, player.z).toUpperCase();
    districtEl.textContent = `DISTRICT: ${distId}`;
  }
  if (autosaveEl) autosaveEl.textContent = `AUTOSAVE ${save.autosave}`;

  if (speedEl) {
    const speedKmh = player.isDriving && player.currentVehicle ? Math.round(Math.abs(player.currentVehicle.speed) * 3.6) : 0;
    speedEl.textContent = `${speedKmh} KM/H`;
  }

  if (promptEl) {
    let promptText = null;
    let minDist = 2.2;
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

    if (!promptText && !player.isDriving) {
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
    } else if (!promptText && player.isDriving) {
      promptText = "Press E to Exit Vehicle";
    }

    if (promptText) {
      promptEl.textContent = promptText;
      promptEl.style.display = 'block';
    } else {
      promptEl.style.display = 'none';
    }
  }
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

    if (spec && Array.isArray(spec.inputs)) {
      for (const inp of spec.inputs) {
        keys = inp.keys || {};
        fixedUpdate(1/60);
      }
    }

    if (spec && spec.state) {
      if (spec.state.cash !== undefined) save.cash = spec.state.cash;
      if (spec.state.rep !== undefined) save.rep = spec.state.rep;
      if (spec.state.heat !== undefined) setPointsFloor(spec.state.heat * 30);
      if (spec.state.mission !== undefined) missionState.name = spec.state.mission;
      if (spec.state.x !== undefined) player.x = spec.state.x;
      if (spec.state.z !== undefined) player.z = spec.state.z;
      player.y = groundHeight(player.x, player.z);
    }

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
      player: { x: player.x, z: player.z },
      save: gatherSave(),
      heat: getHeat()
    };
  }
};

window.__calderaTest = {
  state: () => ({ player, save, heat: getHeat(), missionState }),
  hash: () => computeStateHash(),
  driveTour: () => {
    const trafficCars = getTrafficCars();
    if (trafficCars.length > 0) {
      enterVehicle(trafficCars[0]);
    }
  },
  onFootLoop: () => {
    if (player.isDriving) exitVehicle();
  },
  modules: ['main.js', 'city.js', 'vehicles.js', 'traffic.js', 'pedestrians.js', 'combat.js', 'police.js'],
  step: (dt) => { fixedUpdate(dt || 1/60); renderFrame(); },
  teleport: (x, z) => {
    player.x = x;
    player.z = z;
    player.y = groundHeight(x, z);
    if (player.isDriving && player.currentVehicle) {
      player.currentVehicle.x = x;
      player.currentVehicle.z = z;
      player.currentVehicle.y = player.y;
    }
  },
  spawnCar: (typeKey, x, z, angle, color) => spawnVehicle(typeKey, x, z, angle || 0, scene, color || 0x3366cc),
  enterNearest: () => handleInteractPress(),
  exitCar: () => exitVehicle(),
  repairVehicle: () => {
    if (player.isDriving && player.currentVehicle) {
      player.currentVehicle.durability = 100;
      player.currentVehicle.dead = false;
    }
  },
  driveToward: (x, z) => {
    if (player.isDriving && player.currentVehicle) {
      const car = player.currentVehicle;
      car.angle = Math.atan2(x - car.x, z - car.z);
      car.speed = 15;
    }
  },
  interactables: () => interactables,
  interact: () => handleInteractPress(),
  save: gatherSave(),
  debugSetPed,
  stageCover,
  coverAudit,
  forceRoadblock,
  setPointsFloor,
  respray
};

window.addEventListener('DOMContentLoaded', init);
