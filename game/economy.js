import * as THREE from './three.module.min.js';
import { respray } from './police.js';

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

export const TIME_TRIALS = {
    'DOCK SPRINT': { cp: 4, time: 70, cash: 300, rep: 15 },
    'BOULEVARD LOOP': { cp: 6, time: 105, cash: 500, rep: 20 },
    'RIDGE CLIMB': { cp: 5, time: 125, cash: 800, rep: 25 }
};

const REP_TIERS = [0, 100, 250, 500, 900, 1400];
function getTierIndex(rep) {
    for (let i = REP_TIERS.length - 1; i >= 0; i--) {
        if (rep >= REP_TIERS[i]) return i;
    }
    return 0;
}

function mulberry32(a) {
    return function() {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        var t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}
const rng = mulberry32(12345);

export function createEconomy(ctx) {
    const state = {
        activeContract: null,
        cooldowns: {}
    };

    const getTier = () => getTierIndex(ctx.save.rep);

    const buyAmmo = (slot) => {
        if (getTier() < 2) return "Locked";
        const price = PRICES.ammo[slot];
        if (ctx.save.cash < price) return "No cash";
        ctx.save.cash -= price;
        ctx.save.ammo[slot][1] += 30;
        return "Bought";
    };

    const buyArmour = () => {
        if (getTier() < 2) return "Locked";
        if (ctx.save.cash < PRICES.armour) return "No cash";
        ctx.save.cash -= PRICES.armour;
        ctx.save.armour = 100;
        return "Bought";
    };

    const resprayService = () => {
        if (ctx.save.cash < PRICES.respray) return "No cash";
        ctx.save.cash -= PRICES.respray;
        respray();
        return "Resprayed";
    };

    const repair = () => {
        if (ctx.save.cash < PRICES.repair) return "No cash";
        ctx.save.cash -= PRICES.repair;
        // Logic for vehicle repair
        return "Repaired";
    };

    const storeCurrentCar = () => {
        if (getTier() < 3) return "Locked";
        if (ctx.save.ownedCars.length >= 4) return "Full";
        // Logic to store current car
        return "Stored";
    };

    const recallCar = (i) => {
        if (getTier() < 3) return "Locked";
        // Logic to recall car i
        return "Recalled";
    };

    const repairStoredCar = (i) => {
        if (getTier() < 3) return "Locked";
        // Logic to repair car i
        return "Repaired";
    };

    const sellStoredCar = (i) => {
        if (getTier() < 1) return "Locked";
        // Logic to sell car i
        return "Sold";
    };

    const sellCurrentCar = () => {
        if (getTier() < 1) return "Locked";
        // Logic to sell current car
        return "Sold";
    };

    const sellCar = (car) => {
        if (getTier() < 1) return "Locked";
        // Logic to sell car
        return "Sold";
    };

    const contractInfo = () => state.activeContract;
    const trialInfo = () => TIME_TRIALS;

    const travelTo = (districtId) => {
        if (getTier() < 4) return "Locked";
        // Logic to travel
        return "Traveled";
    };

    const reset = () => {
        state.activeContract = null;
    };

    return {
        contractInfo,
        trialInfo,
        travelTo,
        buyAmmo,
        buyArmour,
        respray: resprayService,
        repair,
        sellCurrentCar,
        sellCar,
        storeCurrentCar,
        recallCar,
        repairStoredCar,
        sellStoredCar,
        reset
    };
}
