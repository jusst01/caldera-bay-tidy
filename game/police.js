import * as THREE from './three.module.min.js';

let seed = 12345;
function random() {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
}

function getGroundHeight(x, z) {
  return 0;
}

let points = 0;
let pointsFloor = 0;
let policeUnits = [];

function initPolice() {
  points = 0;
  pointsFloor = 0;
  policeUnits = [];
}

function reportCrime(crime) {
  const crimes = { carjack: 10, 'ped hit': 15, mug: 15, gunshot: 5, 'cop kill': 40, 'police car steal': 40 };
  points += crimes[crime] || 0;
}

function setPointsFloor(p) { pointsFloor = p; }
function setPoints(p) { points = p; }
function getHeat() {
  if (points >= 150) return 5;
  if (points >= 100) return 4;
  if (points >= 60) return 3;
  if (points >= 30) return 2;
  if (points >= 10) return 1;
  return 0;
}
function getPoints() { return points; }
function respray() { points = pointsFloor; }
function forceRoadblock() {}
function updatePolice() {}
function spawnUnit() {
  policeUnits.push({ name: 'Unit' + Math.floor(random() * 1000), tactic: 'PURSUIT', x: 0, z: 0 });
}
function stageCover(camera, playerPos) {}
function coverAudit(camera) { return []; }
function getPoliceUnits(playerPos) { return []; }
function getUnits() { return policeUnits; }
function getHeatPoints() { return points; }

export { initPolice, reportCrime, setPointsFloor, setPoints, getHeat, getPoints, respray, forceRoadblock, updatePolice, spawnUnit, stageCover, coverAudit, getPoliceUnits, getUnits, getHeatPoints };
