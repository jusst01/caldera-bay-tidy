import * as THREE from './three.module.min.js';
import { createRNG, groundHeight, districtAt, collideCircle, eject, buildCity, updateSun, setFinaleDusk } from './city.js';
import { VEHICLE_ROSTER, createVehicleMesh, spawnVehicle, updateVehicle, damageVehicle, markStolen } from './vehicles.js';
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

let scene, camera, renderer, hud, missions, economy, player, save, clock;
let isFrozen = false;

const init = () => {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(1280, 720);
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.zIndex = '1';
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 1280 / 720, 0.1, 2000);

    clock = new THREE.Clock();

    save = loadSave();
    if (!save) save = canonicalSave();

    buildCity(createRNG(), scene);
    initTraffic(scene);
    initPedestrians(scene);
    initPolice();
    initCombat();
    initRadio();
    missions = createMissions();
    economy = createEconomy();
    hud = createHud({
        onOpenMenu: openMenu,
        onOpenGarage: () => openGarageScreen(save, {}),
        onCycleRadio: cycleStation
    });

    openStartScreen(save, {
        onContinue: () => { closeCurrentScreen(); },
        onNewGame: () => {
            save = canonicalSave();
            closeCurrentScreen();
        }
    });

    requestAnimationFrame(renderLoop);
};

const renderLoop = (time) => {
    if (!isFrozen) {
        const dt = clock.getDelta();
        updateSim(dt);
        renderer.render(scene, camera);
        updateHud();
    }
    requestAnimationFrame(renderLoop);
};

const updateSim = (dt) => {
    updateTraffic(dt);
    updatePedestrians(dt);
    updatePolice(dt);
    updateCombat(dt);
    updateSun(dt);
};

const updateHud = () => {
    const units = getPoliceUnits(player ? {x: player.x, z: player.z} : {x: 0, z: 0});
    const snapshot = {
        player: player ? {
            hp: 100, // Dummy for now
            armour: 0, // Dummy
            ammo: getAmmo().current,
            inCar: !!player.inCar,
            x: player.x,
            z: player.z,
            speed: 0
        } : {},
        heat: getHeat(),
        points: getPoints(),
        police: { units: units.map(u => ({ name: u.name, tactic: u.tactic, dist: 0 })) },
        cash: save.cash,
        rep: save.rep,
        tier: save.tier,
        takeoverCount: save.takeoverCount,
        jobsDone: save.jobsDone,
        objective: missions.currentObjective(),
        dialogue: null,
        eventLine: null,
        radio: getCurrentStationInfo(save)
    };
    hud.update(snapshot);
};

window.__photo = {
    load: (spec) => {
        isFrozen = true;
        closeCurrentScreen();

        // Reset world
        while(scene.children.length > 0) scene.remove(scene.children[0]);
        buildCity(createRNG(), scene);
        initTraffic(scene);
        initPedestrians(scene);
        initPolice();
        initCombat();
        initRadio();

        save = Object.assign(save, canonicalSave());
        save.missionIndex = spec.job - 1;
        missions.forceStage(spec.job - 1, spec.jobStage ?? 0);
        setPoints(spec.heat);

        player = { x: -300, z: 300, inCar: null };

        if (spec.mode === 'drive') {
            player.inCar = spawnVehicle('zorro', -300, 300, 0, scene);
            // Spawn pack
            const heat = getHeat();
            for (let i = 0; i < [0,2,4,6,8,10][heat]; i++) {
                spawnUnit(player.x, player.z);
            }
            stageCover(camera, {x: player.x, z: player.z});
            hud.setPanels('cover');
            camera.position.set(-300, 3.5, 308);
            camera.lookAt(-300, 1.0, 300);
        } else {
            player.y = groundHeight(-300, 300);
            for (let i = 0; i < 5; i++) {
                debugSetPed(i, -300 + (i*2), 300 + (i*2), 0);
            }
            hud.setPanels('game');
            camera.position.set(-300, player.y + 2.2, 300 + 6);
            camera.lookAt(-300, player.y, 300);
        }

        if (spec.screen === 'garage') {
            hud.setPanels('garage');
            openGarageScreen(save, {});
        } else if (spec.screen === 'start') {
            hud.setPanels('start');
            openStartScreen(save, {onContinue(){}, onNewGame(){}});
        }

        hud.update({
            dialogue: spec.dialogue,
            eventLine: spec.event,
            police: { units: getPoliceUnits({x: player.x, z: player.z}) }
        });
        if (spec.dialogue) hud.showDialogue(spec.dialogue.name || spec.dialogue.speaker, spec.dialogue.text);
    }
};

window.__calderaTest = {
    state: () => ({
        player: { ...player, angle: 0, speed: 0, isDriving: !!player?.inCar, currentVehicle: player?.inCar },
        save,
        heat: getHeat(),
        heatPoints: getHeatPoints(),
        points: getHeatPoints(),
        missionState: missions.currentObjective(),
        units: getUnits(),
        peds: getPedestrians()
    }),
    hash: () => {},
    stageCover: () => stageCover(camera, {x: player.x, z: player.z}),
    coverAudit: () => coverAudit(camera),
    getPedsNearby: (r) => getPedestrians().filter(p => true),
    isPlayerOnFoot: () => !player?.inCar,
    dumpScene: () => console.log(scene),
    save: () => saveSave(save),
    teleport: (x, z) => { player.x = x; player.z = z; },
    spawnCar: (id) => spawnVehicle(id, player.x, player.z, 0, scene),
    enterNearest: () => {},
    exitCar: () => {},
    interact: () => {},
    interactables: () => [],
    step: (dt) => updateSim(dt),
    modules: () => ({}),
    driveTour: () => {},
    onFootLoop: () => {},
    repairVehicle: () => {}
};

init();
