import * as THREE from './three.module.min.js';
import { createRNG, groundHeight, districtAt, collideCircle, eject, buildCity, updateSun, setFinaleDusk } from './city.js';
import { VEHICLE_ROSTER, createVehicleMesh, spawnVehicle, updateVehicle, damageVehicle, markStolen } from './vehicles.js';
import { initTraffic, spawnTraffic, updateTraffic, getTrafficCars } from './traffic.js';
import { initPedestrians, updatePedestrians, witnessesAt, getPedestrians, damagePedestrian, debugSetPed } from './pedestrians.js';
import { initPolice, reportCrime, setPointsFloor, setPoints, getHeat, getPoints, getHeatPoints, getUnits, respray, forceRoadblock, updatePolice, spawnUnit, stageCover, coverAudit, getPoliceUnits } from './police.js';
import { WEAPON_SPECS, initCombat, switchWeapon, nextWeapon, reloadWeapon, updateCombat, fireWeapon, damagePlayer, getAmmo, getCombatState, showWeaponWheel } from './combat.js';
import { JOBS, createMissions, forceStage, currentObjective } from './missions.js';
import { REP_TIERS, tierFor, emptySave, canonicalSave, takeoverCount, loadSave, saveSave, clearSave } from './save.js';
import { SHOP_POS, PRICES, TIME_TRIALS, createEconomy } from './economy.js';
import { createHud } from './hud.js';
import { closeCurrentScreen, openStartScreen, openGarageScreen, openMenu } from './screens.js';
import { initRadio, startRadio, cycleStation, getCurrentStationInfo, stopRadio } from './radio.js';

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(1280, 720);
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.left = '0';
renderer.domElement.style.top = '0';
renderer.domElement.style.zIndex = '1';
document.body.appendChild(renderer.domElement);

// Scene and Camera
let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(75, 1280 / 720, 0.1, 1000);
let save = {};
let player = {
    hp: 100,
    armour: 0,
    inCar: null,
    x: -300,
    z: 300,
    speed: 0
};
let hud = createHud({
    onShop: () => openGarageScreen(save, garageCallbacks),
    onMenu: () => openMenu()
});

const garageCallbacks = {
    onBuyAmmo: () => {},
    onBuyArmour: () => {},
    onStoreCar: () => {},
    onRecallCar: () => {}
};

// Global Photo interface
window.__photo = {
    load: (spec) => {
        closeCurrentScreen();
        // Seed reset + world rebuild
        scene = new THREE.Scene();
        // Re-initialize modules
        buildCity(scene);
        initTraffic();
        initPedestrians();
        initPolice();
        initCombat();
        initRadio();
        createMissions({scene, player, hud});
        createEconomy({scene, player, hud});

        save = Object.assign(save, canonicalSave());
        save.missionIndex = spec.job - 1;
        forceStage(spec.job - 1, spec.jobStage ?? 0);

        setPoints(spec.heat);
        player.armour = save.armour;
        player.hp = 100;

        if (spec.mode === 'drive') {
            const hero = spawnVehicle('zorro', -300, 300, 0, scene);
            player.inCar = hero;
            player.x = -300;
            player.z = 300;

            const heat = getHeat();
            const count = [0, 2, 4, 6, 8, 10][heat];
            for (let i = 0; i < count; i++) {
                spawnUnit(player.x, player.z);
            }
            stageCover(camera, new THREE.Vector3(player.x, 0, player.z));
            hud.setPanels('cover');
            camera.position.set(-300, 3.5, 308);
            camera.lookAt(-300, 1.0, 300);
        } else {
            player.inCar = null;
            player.x = -300;
            player.z = 300;
            player.y = groundHeight(-300, 300);

            for (let i = 0; i < 5; i++) {
                debugSetPed(i, player.x + (i*2), player.z + (i*2), 0);
            }
            hud.setPanels('game');
            camera.position.set(player.x, player.y + 2.2, player.z + 6);
            camera.lookAt(player.x, player.y, player.z);
        }

        if (spec.screen === 'garage') {
            hud.setPanels('garage');
            openGarageScreen(save, garageCallbacks);
        } else if (spec.screen === 'start') {
            hud.setPanels('start');
            openStartScreen(save, {onContinue(){}, onNewGame(){}});
        }

        // Final HUD update
        hud.update({
            player,
            heat: getHeat(),
            points: getPoints(),
            police: { units: getPoliceUnits(new THREE.Vector3(player.x, 0, player.z)) },
            cash: save.cash,
            rep: save.rep,
            tier: tierFor(save.rep),
            takeoverCount: takeoverCount(save),
            jobsDone: save.jobsDone,
            objective: currentObjective(),
            dialogue: spec.dialogue,
            eventLine: spec.event,
            radio: getCurrentStationInfo(save)
        });

        if (spec.dialogue) {
            hud.showDialogue(spec.dialogue.speaker || spec.dialogue.name, spec.dialogue.text);
        }

        // Simulation freeze (inferred)
    }
};

window.__calderaTest = {
    state: () => ({
        player,
        save,
        heat: getHeat(),
        heatPoints: getHeatPoints(),
        points: getHeatPoints(),
        missionState: currentObjective(),
        units: getUnits(),
        peds: getPedestrians()
    }),
    hash: () => {},
    stageCover: () => stageCover(camera, new THREE.Vector3(player.x, 0, player.z)),
    coverAudit: () => coverAudit(camera),
    getPedsNearby: (r) => [],
    isPlayerOnFoot: () => !player.inCar,
    dumpScene: () => {},
    save: () => saveSave(save),
    teleport: (x, z) => { player.x = x; player.z = z; },
    spawnCar: (id) => {},
    enterNearest: () => {},
    exitCar: () => {},
    interact: () => {},
    interactables: () => [],
    step: (dt) => {
        updateTraffic();
        updatePedestrians();
        updatePolice();
        updateCombat();
        // ...
    },
    modules: () => {},
    driveTour: () => {},
    onFootLoop: () => {},
    repairVehicle: () => {},
    driveToward: (x, z) => {}
};

function renderLoop() {
    requestAnimationFrame(renderLoop);
    // Update logic
    renderer.render(scene, camera);
}

// Initial Boot
buildCity(scene);
save = loadSave();
document.addEventListener('keydown', (e) => { if (e.key === 'F5') saveSave(save); });
openStartScreen(save, {
    onContinue: () => { closeCurrentScreen(); },
    onNewGame: () => { clearSave(); closeCurrentScreen(); }
});
renderLoop();
