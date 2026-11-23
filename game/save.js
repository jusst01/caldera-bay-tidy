
export const REP_TIERS = {
    NOBODY: 0,
    RUNNER: 100,
    WHEELMAN: 250,
    FIXER: 500,
    BROKER: 900,
    LEYENDA: 1400
};

export function tierFor(rep) {
    if (rep >= REP_TIERS.LEYENDA) return 'Leyenda';
    if (rep >= REP_TIERS.BROKER) return 'Broker';
    if (rep >= REP_TIERS.FIXER) return 'Fixer';
    if (rep >= REP_TIERS.WHEELMAN) return 'Wheelman';
    if (rep >= REP_TIERS.RUNNER) return 'Runner';
    return 'Nobody';
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
        missionIndex: 6,
        jobsDone: 6,
        takeover: { muelle: 100, paseo: 80, verde: 60, ceniza: 30, cumbre: 10 },
        ammo: [[0, 0], [12, 48], [30, 90], [6, 18]],
        armour: 60,
        hp: 100,
        ownedCars: [
            { model: 'Zorro GT', condition: 86 },
            { model: 'Corsario S', condition: 91 },
            { model: 'Mula', condition: 74 },
            { model: 'Sirena', condition: 100 }
        ],
        stats: { carsStolen: 41, topSpeed: 247, maxHeat: 5, contractsDone: 9, trialsWon: 4, jobsFailed: 1 },
        playtimeSec: 8712,
        lastSaveClock: '14:32'
    };
}

export function takeoverCount(takeover) {
    return Object.values(takeover).filter(v => v > 30).length;
}

export function loadSave() {
    try {
        const data = localStorage.getItem('caldera_save_v1');
        if (!data) return emptySave();
        return JSON.parse(data);
    } catch (e) {
        console.error('Failed to load save', e);
        return emptySave();
    }
}

export function saveSave(data) {
    const now = new Date();
    data.lastSaveClock = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    localStorage.setItem('caldera_save_v1', JSON.stringify(data));
}

export function clearSave() {
    localStorage.removeItem('caldera_save_v1');
}
