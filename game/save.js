// game/save.js
const SAVE_KEY = 'caldera_save_v1';

export const REP_TIERS = [
  { name: 'NOBODY', min: 0 },
  { name: 'RUNNER', min: 100 },
  { name: 'WHEELMAN', min: 250 },
  { name: 'FIXER', min: 500 },
  { name: 'BROKER', min: 900 },
  { name: 'LEYENDA', min: 1400 }
];

export function tierFor(rep) {
  for (let i = REP_TIERS.length - 1; i >= 0; i--) {
    if (rep >= REP_TIERS[i].min) return REP_TIERS[i].name;
  }
  return 'NOBODY';
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
    ammo: [[0, 0], [12, 48], [30, 90], [6, 18]],
    armour: 60,
    ownedCars: [
      { spec: 'zorro', durability: 86 },
      { spec: 'corsario', durability: 91 },
      { spec: 'mula', durability: 74 },
      { spec: 'sirena', durability: 100 }
    ],
    stats: { carsStolen: 41, topSpeed: 247, maxHeat: 5, contractsDone: 9, trialsWon: 4, jobsFailed: 1 },
    playtimeSec: 8712,
    radioStation: 0,
    lastSaveClock: '14:32'
  };
}

export function takeoverCount(save) {
  let count = 0;
  for (const district in save.takeover) {
    if (save.takeover[district] >= 50) count++;
  }
  return count;
}

export function loadSave() {
  try {
    const data = localStorage.getItem(SAVE_KEY);
    if (!data) return emptySave();
    const saved = JSON.parse(data);
    return { ...emptySave(), ...saved };
  } catch (e) {
    return emptySave();
  }
}

export function saveSave(save) {
  const now = new Date();
  save.lastSaveClock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}
