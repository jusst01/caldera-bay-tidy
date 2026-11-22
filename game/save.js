import * as THREE from './three.module.min.js';

export const REP_TIERS = { Nobody: 0, Runner: 100, Wheelman: 250, Fixer: 500, Broker: 900, Leyenda: 1400 };

export function tierFor(rep) {
  if (rep >= 1400) return 'Leyenda';
  if (rep >= 900) return 'Broker';
  if (rep >= 500) return 'Fixer';
  if (rep >= 250) return 'Wheelman';
  if (rep >= 100) return 'Runner';
  return 'Nobody';
}

export function emptySave() {
  return {
    cash: 250,
    rep: 0,
    missionIndex: 0,
    jobsDone: 0,
    takeover: { muelle: 0, paseo: 0, verde: 0, ceniza: 0, cumbre: 0 },
    ammo: [[0,0],[12,60],[30,120],[6,24]],
    armour: 0,
    hp: 100,
    ownedCars: [],
    stats: { carsStolen: 0, topSpeed: 0, maxHeat: 0, contractsDone: 0, trialsWon: 0, jobsFailed: 0 },
    playtimeSec: 0,
    radioStation: 0,
    lastSaveClock: ''
  };
}

export function canonicalSave() {
  return {
    cash: 4210,
    rep: 520,
    jobsDone: 6,
    missionIndex: 6,
    takeover: { muelle: 100, paseo: 80, verde: 60, ceniza: 30, cumbre: 10 },
    armour: 60,
    hp: 100,
    ammo: [[0,0],[12,48],[30,90],[6,18]],
    ownedCars: ["ZORRO GT 86", "CORSARIO S 91", "MULA 4X4 74", "SIRENA 100"],
    stats: { carsStolen: 41, topSpeed: 247, maxHeat: 5, contractsDone: 9, trialsWon: 4, jobsFailed: 1 },
    playtimeSec: 8712,
    lastSaveClock: '14:32'
  };
}

export function takeoverCount(takeover) {
  let count = 0;
  for (const d in takeover) {
    if (takeover[d] >= 50) count++;
  }
  return count;
}

const STORAGE_KEY = 'caldera_save_v1';

export function loadSave() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : emptySave();
  } catch (e) {
    return emptySave();
  }
}

export function storeSave(save) {
  const now = new Date();
  save.lastSaveClock = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
}

export function clearSave() {
  localStorage.removeItem(STORAGE_KEY);
}
