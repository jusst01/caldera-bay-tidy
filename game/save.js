import * as THREE from './three.module.min.js';

export const REP_TIERS = {
    NOBODY: 0,
    RUNNER: 100,
    WHEELMAN: 250,
    FIXER: 500,
    BROKER: 900,
    LEYENDA: 1400
};

export const tierFor = (rep) => {
    if (rep >= REP_TIERS.LEYENDA) return 5;
    if (rep >= REP_TIERS.BROKER) return 4;
    if (rep >= REP_TIERS.FIXER) return 3;
    if (rep >= REP_TIERS.WHEELMAN) return 2;
    if (rep >= REP_TIERS.RUNNER) return 1;
    return 0;
};

export const emptySave = () => ({
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
});

export const canonicalSave = () => ({
    cash: 4210,
    rep: 520,
    missionIndex: 6,
    jobsDone: 6,
    takeover: { muelle: 100, paseo: 80, verde: 60, ceniza: 30, cumbre: 10 },
    ammo: [[0, 0], [12, 48], [30, 90], [6, 18]],
    armour: 60,
    hp: 100,
    ownedCars: [
        { name: 'ZORRO GT', cond: 86 },
        { name: 'CORSARIO S', cond: 91 },
        { name: 'MULA 4X4', cond: 74 },
        { name: 'SIRENA', cond: 100 }
    ],
    stats: { carsStolen: 41, topSpeed: 247, maxHeat: 5, contractsDone: 9, trialsWon: 4, jobsFailed: 1 },
    playtimeSec: 8712,
    radioStation: 0,
    lastSaveClock: '14:32'
});

export const takeoverCount = (takeover) => {
    return Object.values(takeover).filter(v => v >= 50).length;
};

export const loadSave = () => {
    try {
        const data = localStorage.getItem('caldera_save_v1');
        if (!data) return emptySave();
        return JSON.parse(data);
    } catch (e) {
        console.error('Save load failed', e);
        return emptySave();
    }
};

export const saveSave = (save) => {
    const now = new Date();
    save.lastSaveClock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    localStorage.setItem('caldera_save_v1', JSON.stringify(save));
};

export const clearSave = () => {
    localStorage.removeItem('caldera_save_v1');
};
