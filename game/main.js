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

/**
 * Caldera Bay - Main Entry Point (main.js)
 * Bootstrap, Loop, and Photo/Test Hooks.
 */

// Module-scope variables
let scene, camera, renderer, hud, save, economy, missions, rng;
let isBooted = false;

/**
 * Initialize the renderer, scene, and camera.
 * Fixes the "canvas.getContext is not a function" error.
 */
function initEngine() {
    // Create the renderer with a REAL canvas
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(1280, 720);

    // Style the renderer's DOM element
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.zIndex = '1';

    // Append to document body
    document.body.appendChild(renderer.domElement);

    // Scene and camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 1280 / 720, 0.1, 1000);

    // Initial camera position
    camera.position.set(-300, 3.5, 308);
    camera.lookAt(-300, 1.0, 300);
}

/**
 * Game Loop
 */
function renderLoop() {
    requestAnimationFrame(renderLoop);
    if (!isBooted) return;

    // Update game logic (sim)
    updateSim();

    // Render
    renderer.render(scene, camera);
}

function updateSim() {
    // Perform per-frame updates
    updateTraffic();
    updatePedestrians();
    updatePolice(camera);
    updateCombat();
    updateSun();

    // Update HUD with current snapshot
    if (hud) {
        const snapshot = getSnapshot();
        hud.update(snapshot);
    }
}

function getSnapshot() {
    // Assemble snapshot for HUD
    return {
        player: {
            hp: 100, // TODO: Get actual player HP
            armour: save.armour || 0,
            ammo: getAmmo()?.current || 0,
            inCar: null, // TODO: Handle
            x: -300, // TODO: Get player X
            z: 300,  // TODO: Get player Z
            speed: 0 // TODO: Get speed
        },
        heat: getHeat(),
        points: getPoints(),
        police: {
            units: getUnits()
        },
        cash: save.cash || 0,
        rep: save.rep || 0,
        tier: tierFor(save.rep || 0),
        takeoverCount: takeoverCount(),
        jobsDone: save.jobsDone || 0,
        objective: missions.currentObjective(),
        dialogue: null,
        eventLine: null,
        radio: getCurrentStationInfo(save)
    };
}

/**
 * Bootstrap logic
 */
function boot() {
    initEngine();

    // Load persisted save
    save = loadSave() || canonicalSave();

    // Initialize modules
    rng = createRNG(save.seed);
    economy = createEconomy(save);
    missions = createMissions(save);

    initTraffic();
    initPedestrians();
    initPolice();
    initCombat();
    initRadio();

    // Create HUD
    hud = createHud({
        // Define HUD hooks here
        nextWeapon,
        reloadWeapon,
        switchWeapon
    });

    // Build world
    buildCity(scene, rng);

    // Show Start Screen
    openStartScreen(save, {
        onContinue() {
            closeCurrentScreen();
            isBooted = true;
        },
        onNewGame() {
            clearSave();
            save = canonicalSave();
            closeCurrentScreen();
            isBooted = true;
        }
    });

    // Start rendering
    renderLoop();
}

// Global hooks
window.__photo = {
    load: (spec) => {
        closeCurrentScreen();

        // Seed reset + world rebuild
        scene.children = [];
        rng = createRNG(spec.seed || Date.now());
        buildCity(scene, rng);
        initTraffic();
        initPedestrians();
        initPolice();
        initCombat();
        initRadio();

        // Save/Mission setup
        save = Object.assign(save, canonicalSave());
        save.missionIndex = spec.job - 1;
        missions.forceStage(spec.job - 1, spec.jobStage ?? 0);

        // Police/Heat
        setPoints(spec.heat);

        // Player setup
        save.armour = spec.armour || 0;

        // Mode setup
        if (spec.mode === 'drive') {
            const hero = spawnVehicle('zorro', -300, 300, 0, scene);
            // Player in car logic
            stageCover(camera, {x: -300, z: 300});
            hud.setPanels('cover');
        } else {
            // Foot setup
            const y = groundHeight(-300, 300);
            // Spawn 5 peds
            for (let i = 0; i < 5; i++) {
                debugSetPed(i, -300 + (i*2), 300 + (i*2), 0);
            }
            hud.setPanels('game');
        }

        // Screen setup
        if (spec.screen === 'garage') {
            hud.setPanels('garage');
            openGarageScreen(save, {}); // TODO: Pass callbacks
        } else if (spec.screen === 'start') {
            hud.setPanels('start');
            openStartScreen(save, {});
        }

        // Camera
        if (spec.mode === 'drive') {
            camera.position.set(-300, 3.5, 308);
            camera.lookAt(-300, 1.0, 300);
        } else {
            // Foot camera
            camera.position.set(-300, y + 2.2, 306);
            camera.lookAt(-300, y, 300);
        }

        // Final UI
        const snapshot = getSnapshot();
        snapshot.dialogue = spec.dialogue;
        snapshot.eventLine = spec.event;
        snapshot.police.units = getPoliceUnits({x: -300, z: 300});
        hud.update(snapshot);
        hud.showDialogue(spec.dialogue?.name || spec.dialogue?.speaker || '', spec.dialogue?.text || '');

        // Freeze sim
        isBooted = false;
    }
};

window.__calderaTest = {
    state: () => ({
        player: { x: -300, z: 300, y: groundHeight(-300, 300), angle: 0, speed: 0, isDriving: false, currentVehicle: null },
        save,
        heat: getHeat(),
        heatPoints: getHeatPoints(),
        points: getPoints(),
        missionState: missions.currentObjective(),
        units: getUnits(),
        peds: getPedestrians()
    }),
    hash: () => 'hash', // TODO
    stageCover: () => stageCover(camera, {x: -300, z: 300}),
    coverAudit: () => coverAudit(camera),
    getPedsNearby: (r) => getPedestrians().filter(p => true), // TODO: Implement radius check
    isPlayerOnFoot: () => true, // TODO: Implement
    dumpScene: () => console.log(scene),
    save: () => saveSave(save),
    teleport: (x, z) => {}, // TODO
    spawnCar: (id) => spawnVehicle(id, -300, 300, 0, scene),
    enterNearest: () => {}, // TODO
    exitCar: () => {}, // TODO
    interact: () => {}, // TODO
    interactables: () => [], // TODO
    step: (dt) => updateSim(),
    modules: () => {}, // TODO
    driveTour: () => {}, // TODO
    onFootLoop: () => {}, // TODO
    repairVehicle: () => {}, // TODO
    driveToward: (x, z) => {} // TODO
};

// Boot game
boot();
