export const REP_TIERS = [
  { name: 'Nobody', at: 0 },
  { name: 'Runner', at: 100 },
  { name: 'Wheelman', at: 250 },
  { name: 'Fixer', at: 500 },
  { name: 'Broker', at: 900 },
  { name: 'Leyenda', at: 1400 }
];

export function tierFor(rep) {
  for (let i = REP_TIERS.length - 1; i >= 0; i--) {
    if (rep >= REP_TIERS[i].at) return REP_TIERS[i].name;
  }
  return REP_TIERS[0].name;
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
    hp: 100,
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
    hp: 100,
    ownedCars: [
      { id: 'zorro', name: 'Zorro GT', condition: 86 },
      { id: 'corsario', name: 'Corsario S', condition: 91 },
      { id: 'mula', name: 'Mula', condition: 74 },
      { id: 'sirena', name: 'Sirena', condition: 100 }
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
  return Object.values(save.takeover).filter(val => val > 30).length;
}

const KEY = 'caldera_save_v1';

export function loadSave() {
  const stored = localStorage.getItem(KEY);
  if (!stored) return emptySave();
  try {
    const parsed = JSON.parse(stored);
    return { ...emptySave(), ...parsed };
  } catch (e) {
    return emptySave();
  }
}

export function saveSave(save) {
  localStorage.setItem(KEY, JSON.stringify(save));
}

export function clearSave() {
  localStorage.removeItem(KEY);
}
