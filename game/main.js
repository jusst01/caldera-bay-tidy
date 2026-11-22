import * as THREE from 'three';
import { createRNG, groundHeight, districtAt, collideCircle, eject, buildCity, updateSun, setFinaleDusk } from './city.js';
import { VEHICLE_ROSTER, createVehicleMesh, spawnVehicle, updateVehicle, damageVehicle, markStolen } from './vehicles.js';
import { initTraffic, spawnTraffic, updateTraffic, getTrafficCars, markStolen as markStolenTraffic } from './traffic.js';
import { initPedestrians, updatePedestrians, witnessesAt, getPedestrians, damagePedestrian, debugSetPed } from './pedestrians.js';
import { initPolice, reportCrime, setPointsFloor, setPoints, getHeat, getPoints, respray, forceRoadblock, updatePolice, spawnUnit, stageCover, coverAudit, getPoliceUnits } from './police.js';
import { WEAPON_SPECS, initCombat, switchWeapon, nextWeapon, reloadWeapon, updateCombat, fireWeapon, getAmmo } from './combat.js';
import { JOBS, createMissions } from './missions.js';
import { REP_TIERS, tierFor, emptySave, canonicalSave, takeoverCount, loadSave, saveSave, clearSave } from './save.js';
import { SHOP_POS, PRICES, TIME_TRIALS, createEconomy } from './economy.js';
import { createHud } from './hud.js';
import { closeCurrentScreen, openStartScreen, openGarageScreen, openMenu } from './screens.js';
import { initRadio, startRadio, cycleStation } from './radio.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
document.getElementById('game').appendChild(renderer.domElement);

let save = emptySave();
const missions = createMissions();
const economy = createEconomy();
const hud = createHud({});

window.__photo = {
  load: (spec) => {
    // 1. Seed & World
    const rng = createRNG(spec.seed);
    buildCity(scene, rng);
    initTraffic();
    initPedestrians();
    initPolice();
    initCombat();
    initRadio();

    // 2. Save
    save = Object.assign(save, canonicalSave());

    // 3. Job
    if (spec.job !== undefined) {
      save.missionIndex = spec.job - 1;
      missions.forceStage(spec.job - 1, spec.jobStage ?? 0);
    }

    // 4. Heat
    if (spec.heat !== undefined) {
      setPoints(spec.heat);
    }

    // Player state
    // ...

    // 5. Mode Staging
    if (spec.mode === 'drive') {
      // Spawn hero car...
      // Hud set panels cover
    } else if (spec.mode === 'foot') {
      // Spawn peds...
      // Hud set panels game
    }

    // Screen / Camera...

    // 6. Hud update
  }
};

window.__calderaTest = {
  state: () => ({ cash: save.cash, rep: save.rep, heat: getHeat(), points: getPoints(), missionIndex: save.missionIndex, playerPos: {x: 0, z: 0} }),
  hash: () => 'hash',
  stageCover: () => stageCover(),
  coverAudit: () => coverAudit(),
  getPedsNearby: (r) => [],
  isPlayerOnFoot: () => true,
  dumpScene: () => {},
  save: () => save,
  teleport: (x, z) => {},
  spawnCar: (id) => {},
  enterNearest: () => {},
  exitCar: () => {},
  interact: () => {},
  interactables: () => [],
  step: (dt) => {},
  modules: () => ({}),
  driveTour: () => {},
  onFootLoop: () => {},
  repairVehicle: () => {},
  driveToward: (x, z) => {}
};

function loop(time) {
  requestAnimationFrame(loop);
  // ... accumulator update ...
}
requestAnimationFrame(loop);
