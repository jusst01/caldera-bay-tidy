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
 *
 * This file serves as the core bootstrap, game loop, and hook interface for the Caldera Bay engine.
 * It initializes the WebGLRenderer, sets up the scene/camera, manages the game loop,
 * handles state persistence, and provides hooks for external simulation testing.
 */

// --- Module-scope variables ---
let scene, camera, renderer, hud, save, economy, missions, rng;
let isBooted = false;
let frameCount = 0;

/**
 * Initialization Logic
 * --------------------
 * Sets up the THREE.js environment and ensures a canvas exists.
 */
function initEngine() {
    console.log("Initializing Caldera Bay Engine...");

    // Create the renderer with a REAL canvas, as required by the CONTRACT.
    // We explicitly avoid using an existing HTML element as a canvas here.
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(1280, 720);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Style the renderer's DOM element for full-screen presentation
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.zIndex = '1';
    renderer.domElement.style.width = '100vw';
    renderer.domElement.style.height = '100vh';

    // Append to document body
    document.body.appendChild(renderer.domElement);

    // Create Scene and PerspectiveCamera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    // Initial camera position (contractual)
    camera.position.set(-300, 3.5, 308);
    camera.lookAt(-300, 1.0, 300);

    // Add resize listener
    window.addEventListener('resize', onWindowResize, false);
}

/**
 * Handles window resizing to maintain aspect ratio
 */
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Core Game Loop
 * --------------
 * Manages rendering, simulation steps, and HUD updates.
 */
function renderLoop() {
    requestAnimationFrame(renderLoop);

    if (!isBooted) return;

    // Simulation step
    updateSim();

    // Final Render call
    renderer.render(scene, camera);
    frameCount++;
}

/**
 * Update Simulation (Physics, AI, AI Logic)
 */
function updateSim() {
    // Traffic updates
    updateTraffic();

    // Pedestrian updates
    updatePedestrians();

    // Police updates (AI and units)
    updatePolice(camera);

    // Combat updates
    updateCombat();

    // Time/Sun updates
    updateSun();

    // HUD Update
    if (hud) {
        const snapshot = getSnapshot();
        hud.update(snapshot);
    }
}

/**
 * Snapshot generator for HUD and UI updates
 * @returns {Object} Current game state snapshot
 */
function getSnapshot() {
    // This snapshot shape matches the contract:
    // {player {hp, armour, ammo, inCar, x, z, speed}, heat, points, police {units: [{name, tactic, dist}]}, cash, rep, tier, takeoverCount, jobsDone, objective, dialogue, eventLine, radio}

    const units = getUnits();

    return {
        player: {
            hp: 100, // TODO: Replace with real player state
            armour: save.armour || 0,
            ammo: getAmmo()?.current || 0,
            inCar: null,
            x: -300,
            z: 300,
            speed: 0
        },
        heat: getHeat(),
        points: getPoints(),
        police: {
            units: units.map(u => ({
                name: u.name,
                tactic: u.tactic,
                dist: Math.hypot(u.x - (-300), u.z - 300) // Rough distance
            }))
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
 * Bootstrapping
 * -------------
 * Sets up modules, loads state, and begins the game.
 */
function boot() {
    console.log("Bootstrapping Caldera Bay...");

    initEngine();

    // Persistence setup
    save = loadSave() || canonicalSave();

    // Initialize required modules
    rng = createRNG(save.seed);
    economy = createEconomy(save);
    missions = createMissions(save);

    initTraffic();
    initPedestrians();
    initPolice();
    initCombat();
    initRadio();

    // Initialize HUD with necessary hooks
    hud = createHud({
        nextWeapon: () => nextWeapon(),
        reloadWeapon: () => reloadWeapon(),
        switchWeapon: (idx) => switchWeapon(idx)
    });

    // Build the initial city layout
    buildCity(scene, rng);

    // Initial state setup: Start Screen
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

    // Begin Rendering
    renderLoop();
}

// ==========================================
// --- Global Hooks for Testing/Photo Mode ---
// ==========================================

/**
 * __photo.load Contract Implementation
 */
window.__photo = {
    load: (spec) => {
        console.log("Photo Mode Load:", spec);
        closeCurrentScreen();

        // 1. World Rebuild (Clear scene, recreate world)
        scene.children = [];
        rng = createRNG(spec.seed || Date.now());
        buildCity(scene, rng);

        // 2. Re-init modules
        initTraffic();
        initPedestrians();
        initPolice();
        initCombat();
        initRadio();

        // 3. Save/Mission setup
        save = Object.assign(save, canonicalSave());
        save.missionIndex = spec.job - 1;
        if (spec.job !== undefined) {
            missions.forceStage(spec.job - 1, spec.jobStage ?? 0);
        }

        // 4. Police Heat
        setPoints(spec.heat || 0);

        // 5. Player Stats
        save.armour = spec.armour || 0;

        // 6. Mode (Drive vs Foot)
        if (spec.mode === 'drive') {
            const hero = spawnVehicle('zorro', -300, 300, 0, scene);
            // Player in car logic (placeholder)
            stageCover(camera, {x: -300, z: 300});
            hud.setPanels('cover');
        } else {
            // Foot staging
            const y = groundHeight(-300, 300);
            for (let i = 0; i < 5; i++) {
                debugSetPed(i, -300 + (i*2), 300 + (i*2), 0);
            }
            hud.setPanels('game');
        }

        // 7. Screen setup
        if (spec.screen === 'garage') {
            hud.setPanels('garage');
            openGarageScreen(save, {});
        } else if (spec.screen === 'start') {
            hud.setPanels('start');
            openStartScreen(save, {});
        }

        // 8. Camera staging
        if (spec.mode === 'drive') {
            camera.position.set(-300, 3.5, 308);
            camera.lookAt(-300, 1.0, 300);
        } else {
            const y = groundHeight(-300, 300);
            camera.position.set(-300, y + 2.2, 306);
            camera.lookAt(-300, y, 300);
        }

        // 9. Final HUD update
        const snapshot = getSnapshot();
        snapshot.dialogue = spec.dialogue;
        snapshot.eventLine = spec.event;
        snapshot.police.units = getPoliceUnits({x: -300, z: 300});
        hud.update(snapshot);

        if (spec.dialogue) {
            hud.showDialogue(spec.dialogue.name || spec.dialogue.speaker || '', spec.dialogue.text || '');
        }

        // Freeze sim
        isBooted = false;
        renderer.render(scene, camera);
    }
};

/**
 * __calderaTest Contract Implementation
 * Provides testing hooks for the simulation
 */
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
    hash: () => 'hash-' + frameCount,
    stageCover: () => stageCover(camera, {x: -300, z: 300}),
    coverAudit: () => coverAudit(camera),
    getPedsNearby: (r) => getPedestrians(), // Simplified placeholder
    isPlayerOnFoot: () => true,
    dumpScene: () => console.log(scene),
    save: () => saveSave(save),
    teleport: (x, z) => console.log(`Teleporting to ${x}, ${z}`),
    spawnCar: (id) => spawnVehicle(id, -300, 300, 0, scene),
    enterNearest: () => {},
    exitCar: () => {},
    interact: () => {},
    interactables: () => [],
    step: (dt) => updateSim(),
    modules: () => console.log({save, missions, economy}),
    driveTour: () => {},
    onFootLoop: () => {},
    repairVehicle: () => {},
    driveToward: (x, z) => {}
};

// --- Execution ---
boot();
