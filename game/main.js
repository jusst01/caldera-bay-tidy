import * as THREE from './three.module.min.js';
import { createRNG, groundHeight, districtAt, collideCircle, eject, buildCity, updateSun, setFinaleDusk } from './city.js';
import { VEHICLE_ROSTER, createVehicleMesh, spawnVehicle, updateVehicle, damageVehicle, markStolen } from './vehicles.js';
import { initTraffic, spawnTraffic, updateTraffic, getTrafficCars, markStolen as markTrafficStolen } from './traffic.js';
import { initPedestrians, updatePedestrians, witnessesAt, getPedestrians, damagePedestrian, debugSetPed } from './pedestrians.js';
import { initPolice, reportCrime, setPointsFloor, setPoints, getHeat, getPoints, getHeatPoints, getUnits, respray, forceRoadblock, updatePolice, spawnUnit, stageCover, coverAudit, getPoliceUnits } from './police.js';
import { WEAPON_SPECS, initCombat, switchWeapon, nextWeapon, reloadWeapon, updateCombat, fireWeapon, damagePlayer, getAmmo, getCombatState, showWeaponWheel } from './combat.js';
import { JOBS, createMissions } from './missions.js';
import { REP_TIERS, tierFor, tierNameFor, emptySave, canonicalSave, takeoverCount, loadSave, saveSave, clearSave } from './save.js';
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

    player = { x: 0, z: 0, inCar: null, armour: save.armour, hp: save.hp };

    const urlParams = new URLSearchParams(window.location.search);
    const bootSeed = parseInt(urlParams.get('seed')) || 1;
    buildCity(scene, bootSeed);
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
    const pPos = player ? {x: player.x, z: player.z} : {x: 0, z: 0};
    updatePedestrians(dt, pPos);
    updatePolice(dt, pPos);
    updateCombat(dt);
    updateSun(dt);
};

const updateHud = (extra = {}) => {
    const units = getPoliceUnits(player ? {x: player.x, z: player.z} : {x: 0, z: 0});
    const snapshot = {
        player: player ? {
            hp: player.hp ?? save.hp ?? 100,
            armour: player.armour ?? save.armour ?? 0,
            ammo: getAmmo().current,
            inCar: !!player.inCar,
            x: player.x,
            z: player.z,
            speed: 0
        } : {},
        heat: getHeat(),
        points: getPoints(),
        police: { units: units.map(u => ({ name: u.name, tactic: u.tactic, dist: u.dist })) },
        cash: save.cash,
        rep: save.rep,
        tier: tierNameFor(save.rep),
        takeoverCount: takeoverCount(save.takeover),
        jobsDone: save.jobsDone,
        objective: missions.currentObjective(),
        dialogue: null,
        eventLine: null,
        radio: getCurrentStationInfo(save),
        ...extra
    };
    hud.update(snapshot);
};

window.__photo = {
    load: (spec) => {
        isFrozen = true;
        closeCurrentScreen();

        // Reset world
        while(scene.children.length > 0) scene.remove(scene.children[0]);
        buildCity(scene, spec.seed || 1);
        initTraffic(scene);
        initPedestrians(scene);
        initPolice();
        initCombat();
        initRadio();

        save = Object.assign(save, canonicalSave());
        save.missionIndex = spec.job - 1;
        missions.forceStage(spec.job - 1, spec.jobStage ?? 0);
        setPoints(spec.heat);

        player = { x: -300, z: 300, inCar: null, armour: save.armour, hp: save.hp };

        if (spec.mode === 'drive') {
            player.inCar = spawnVehicle('zorro', -300, 300, 0, scene);
            // Spawn pack
            const heat = getHeat();
            for (let i = 0; i < [0,2,4,6,8,10][heat]; i++) {
                spawnUnit({ x: player.x, z: player.z });
            }
            stageCover(camera, {x: player.x, z: player.z});
            hud.setPanels('cover');
            const gh = groundHeight(player.x, player.z);
            camera.position.set(player.x, gh + 3.5, player.z + 8);
            camera.lookAt(player.x, gh + 1.0, player.z);
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

        updateHud({
            dialogue: spec.dialogue,
            eventLine: spec.event
        });
        if (spec.dialogue) hud.showDialogue(spec.dialogue.name || spec.dialogue.speaker, spec.dialogue.text);

        camera.updateMatrixWorld();
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
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
    stageCover: () => {
        const units = getUnits();
        units.forEach((u, idx) => {
            const offset = new THREE.Vector3((idx % 3 - 1) * 2, 0, -4 - (idx * 1.5)).applyQuaternion(camera.quaternion);
            u.x = camera.position.x + offset.x;
            u.z = camera.position.z + offset.z;
        });
    },
    coverAudit: () => {
        camera.updateMatrixWorld();
        camera.updateProjectionMatrix();
        const units = getUnits();
        return units.map(u => {
            const v = new THREE.Vector3(u.x, groundHeight(u.x, u.z) + 1, u.z);
            v.project(camera);
            const sx = (v.x * 0.5 + 0.5) * 100;
            const sy = (-(v.y * 0.5) + 0.5) * 100;
            return { name: u.name, tactic: u.tactic, distance: 0, sx, sy };
        });
    },
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
