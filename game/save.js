// CALDERA BAY — game/save.js
// Persistent save state, REP tiers, canonical snapshot, and localStorage management.

export const REP_TIERS = [
  { threshold: 0, name: 'NOBODY' },
  { threshold: 100, name: 'RUNNER' },
  { threshold: 250, name: 'WHEELMAN' },
  { threshold: 500, name: 'FIXER' },
  { threshold: 900, name: 'BROKER' },
  { threshold: 1400, name: 'LEYENDA' }
];

export function tierFor(rep) {
  let current = REP_TIERS[0].name;
  for (const tier of REP_TIERS) {
    if (rep >= tier.threshold) {
      current = tier.name;
    } else {
      break;
    }
  }
  return current;
}

export function emptySave() {
  return {
    cash: 250,
    rep: 0,
    missionIndex: 0,
    jobsDone: 0,
    takeover: { muelle: 0, paseo: 0, verde: 0, ceniza: 0, cumbre: 0 },
    ammo: [[0, 0], [12, 60], [30, 120], [6, 24]],
    armour: 0,
    ownedCars: [],
    stats: {
      carsStolen: 0,
      topSpeed: 0,
      maxHeat: 0,
      contractsDone: 0,
      trialsWon: 0,
      jobsFailed: 0
    },
    playtimeSec: 0,
    radioStation: 0,
    lastSaveClock: ''
  };
}

export function canonicalSave() {
  return {
    cash: 4210,
    rep: 520,
    missionIndex: 6,
    jobsDone: 6,
    takeover: { muelle: 100, paseo: 80, verde: 60, ceniza: 30, cumbre: 10 },
    ammo: [[0, 0], [12, 48], [30, 90], [6, 18]],
    armour: 60,
    ownedCars: [
      { spec: 'zorro', durability: 86 },
      { spec: 'corsario', durability: 91 },
      { spec: 'mula', durability: 74 },
      { spec: 'sirena', durability: 100 }
    ],
    stats: {
      carsStolen: 41,
      topSpeed: 247,
      maxHeat: 5,
      contractsDone: 9,
      trialsWon: 4,
      jobsFailed: 1
    },
    playtimeSec: 8712,
    radioStation: 0,
    lastSaveClock: '14:32'
  };
}

export function takeoverCount(save) {
  let count = 0;
  if (!save || !save.takeover) return 0;
  for (const k of Object.keys(save.takeover)) {
    if (save.takeover[k] >= 50) {
      count++;
    }
  }
  return count;
}

const SAVE_KEY = 'caldera_save_v1';

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return canonicalSave();
    const data = JSON.parse(raw);
    const def = canonicalSave();
    return {
      ...def,
      ...data,
      takeover: { ...def.takeover, ...(data.takeover || {}) },
      ammo: data.ammo || def.ammo,
      ownedCars: data.ownedCars || def.ownedCars,
      stats: { ...def.stats, ...(data.stats || {}) }
    };
  } catch (e) {
    return canonicalSave();
  }
}

export function storeSave(save) {
  try {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    save.lastSaveClock = `${hh}:${mm}`;
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (e) {}
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {}
}
