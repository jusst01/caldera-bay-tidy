import * as THREE from './three.module.min.js';

export const SHOP_POS = {
    weapons: [320, 192],
    spray: [-384, -192],
    chop: [-320, -256],
    garage: [-256, 448],
    safehouse: [-320, 320]
};

export const PRICES = {
    ammo: [0, 30, 60, 120],
    armour: 150,
    respray: 200,
    repair: 80
};

export const TIME_TRIALS = [
    { name: 'DOCK SPRINT', cp: 4, time: 70, cash: 300, rep: 15 },
    { name: 'BOULEVARD LOOP', cp: 6, time: 105, cash: 500, rep: 20 },
    { name: 'RIDGE CLIMB', cp: 5, time: 125, cash: 800, rep: 25 }
];

export function createEconomy(ctx) {
    return {
        contractInfo() { return null; },
        trialInfo() { return TIME_TRIALS; },
        travelTo(districtId) { return true; },
        buyAmmo(slot) { return PRICES.ammo[slot]; },
        buyArmour() { return PRICES.armour; },
        storeCurrentCar() { return true; },
        recallCar(i) { return true; }
    };
}
