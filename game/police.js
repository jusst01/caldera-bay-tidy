import * as THREE from './three.module.min.js';

let heat = 0;
let points = 0;
let units = [];
const surnames = ["PERALTA", "MENDOZA", "CAMPOS", "ROCHA", "GARCIA", "LOPEZ", "RODRIGUEZ", "SANCHEZ", "TORRES", "FLORES"];

export function initPolice() {}

export function reportCrime(type) {
    if (type === 'carjack') points += 10;
    // ...
}

export function setPointsFloor(p) { points = Math.max(points, p); }
export function setPoints(p) { points = p; }
export function getHeat() { return heat; }
export function getPoints() { return points; }
export function respray() { points = 0; }
export function forceRoadblock(pos, heading) {}

export function updatePolice(dt) {
    // heat thresholds, spawning, search, decay
}

export function spawnUnit() {
    units.push({
        name: surnames[Math.floor(Math.random() * surnames.length)],
        tactic: 'PURSUIT',
        dist: 0
    });
}

export function stageCover(camera, playerPos) {}
export function coverAudit(camera) { return []; }
export function getPoliceUnits(playerPos) { return units; }
// Add 200+ lines of implementation...
