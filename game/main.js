import * as THREE from './three.module.min.js';
import { createRNG, groundHeight, districtAt, collideCircle, eject, buildCity, updateSun, setFinaleDusk } from './city.js';
import { VEHICLE_ROSTER, createVehicleMesh, spawnVehicle, updateVehicle, damageVehicle, markStolen } from './vehicles.js';
import { initTraffic, spawnTraffic, updateTraffic, getTrafficCars } from './traffic.js';
import { initPedestrians, updatePedestrians, witnessesAt, getPedestrians, damagePedestrian, debugSetPed } from './pedestrians.js';
import { initPolice, reportCrime, setPointsFloor, setPoints, getHeat, getPoints, getHeatPoints, getUnits, respray, forceRoadblock, updatePolice, spawnUnit, stageCover, coverAudit, getPoliceUnits } from './police.js';
import { WEAPON_SPECS, initCombat, switchWeapon, nextWeapon, reloadWeapon, updateCombat, fireWeapon, damagePlayer, getAmmo, getCombatState, showWeaponWheel } from './combat.js';
import { JOBS, createMissions } from './missions.js';
import { REP_TIERS, tierFor, emptySave, canonicalSave, takeoverCount, loadSave, saveSave, clearSave } from './save.js';
import { SHOP_POS, PRICES, TIME_TRIALS, createEconomy } from './economy.js';
import { createHud } from './hud.js';
import { closeCurrentScreen, openStartScreen, openGarageScreen, openMenu } from './screens.js';
import { initRadio, startRadio, cycleStation, getCurrentStationInfo, stopRadio } from './radio.js';

let scene, camera, renderer, hud, save, economy, missions, rng;
let isBooted = false;

function initEngine() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(-300, 3.5, 308);
    camera.lookAt(-300, 1.0, 300);
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function updateSim() {
    updateTraffic();
    updatePedestrians();
    updatePolice(camera);
    updateCombat();
    updateSun();
    if (hud) {
        hud.update({
            player: { hp: 100, armour: save.armour, ammo: getAmmo()?.current || 0 },
            heat: getHeat(),
            points: getPoints(),
            cash: save.cash,
            rep: save.rep,
            tier: tierFor(save.rep),
            objective: missions.currentObjective(),
            radio: getCurrentStationInfo(save)
        });
    }
}

function renderLoop() {
    requestAnimationFrame(renderLoop);
    if (!isBooted) return;
    updateSim();
    renderer.render(scene, camera);
}

function boot() {
    initEngine();
    save = loadSave() || canonicalSave();
    rng = createRNG(save.seed);
    economy = createEconomy(save);
    missions = createMissions(save);

    initTraffic();
    initPedestrians();
    initPolice();
    initCombat();
    initRadio();

    hud = createHud({
        nextWeapon: () => nextWeapon(),
        reloadWeapon: () => reloadWeapon(),
        switchWeapon: (idx) => switchWeapon(idx)
    });

    buildCity(scene, rng);

    window.addEventListener('keydown', (e) => {
        if (e.key === 'F5') saveSave(save);
    });

    openStartScreen(save, {
        onContinue: () => { closeCurrentScreen(); isBooted = true; },
        onNewGame: () => { clearSave(); save = canonicalSave(); closeCurrentScreen(); isBooted = true; }
    });

    renderLoop();
}

boot();
