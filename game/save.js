const REP_TIERS = [
  { name: 'Nobody', min: 0 },
  { name: 'Runner', min: 100 },
  { name: 'Wheelman', min: 250 },
  { name: 'Fixer', min: 500 },
  { name: 'Broker', min: 900 },
  { name: 'Leyenda', min: 1400 }
];

function tierFor(rep) {
  for (let i = REP_TIERS.length - 1; i >= 0; i--) {
    if (rep >= REP_TIERS[i].min) return i;
  }
  return 0;
}

function emptySave() {
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

function canonicalSave() {
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
      { model: 'Zorro GT', condition: 86 },
      { model: 'Corsario S', condition: 91 },
      { model: 'Mula 4x4', condition: 74 },
      { model: 'Sirena', condition: 100 }
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

function takeoverCount() {
  let count = 0;
  const t = canonicalSave().takeover; // Needs to use current state
  // But wait, the contract says "canonicalSave() returns EXACTLY...",
  // and "takeoverCount() counts districts with value > 30 (canonical = 3)."
  // I should probably pass a `state` object or make it a method on the save object.
  // The prompt says "takeoverCount() counts districts...".
  // I'll make it take the current save state.
  return count;
}
// Rethink: Maybe `takeoverCount` should be exported to take a save object?
// "save.js exports: REP_TIERS, tierFor, emptySave, canonicalSave, takeoverCount, loadSave, saveSave, clearSave."
// Let's adjust `takeoverCount`.

function getTakeoverCount(saveState) {
  return Object.values(saveState.takeover).filter(v => v > 30).length;
}

function loadSave() {
  const data = localStorage.getItem('caldera_save_v1');
  if (!data) return emptySave();
  try {
    return JSON.parse(data);
  } catch (e) {
    return emptySave();
  }
}

function saveSave(saveState) {
  const now = new Date();
  saveState.lastSaveClock = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  localStorage.setItem('caldera_save_v1', JSON.stringify(saveState));
}

function clearSave() {
  localStorage.removeItem('caldera_save_v1');
}

export { REP_TIERS, tierFor, emptySave, canonicalSave, getTakeoverCount as takeoverCount, loadSave, saveSave, clearSave };
