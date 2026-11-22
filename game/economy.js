// game/economy.js
import { VEHICLE_ROSTER } from './vehicles.js';
import { respray } from './police.js';

export const SHOP_POS = {
  weapons: { x: 320, z: 192 },
  spray: { x: -384, z: -192 },
  chop: { x: -320, z: -256 },
  garage: { x: -256, z: 448 },
  safehouse: { x: -320, z: 320 }
};

export const PRICES = {
  ammo: [0, 30, 60, 120],
  armour: 150,
  respray: 200,
  repair: 80,
  trialFee: 100
};

export const TIME_TRIALS = [
  {
    id: 'dock',
    name: 'Dock Sprint',
    targetSec: 70,
    cash: 300,
    rep: 15,
    checkpoints: [
      { x: -250, z: 200 },
      { x: -150, z: 120 },
      { x: -80, z: 220 },
      { x: -300, z: 300 }
    ]
  },
  {
    id: 'boulevard',
    name: 'Boulevard Loop',
    targetSec: 105,
    cash: 500,
    rep: 20,
    checkpoints: [
      { x: 330, z: 60 },
      { x: 200, z: 0 },
      { x: 100, z: -100 },
      { x: 250, z: -200 },
      { x: 350, z: -100 },
      { x: 330, z: 60 }
    ]
  },
  {
    id: 'ridge',
    name: 'Ridge Climb',
    targetSec: 125,
    cash: 800,
    rep: 25,
    checkpoints: [
      { x: 0, z: -200 },
      { x: -100, z: -300 },
      { x: 0, z: -400 },
      { x: 100, z: -450 },
      { x: 0, z: -500 }
    ]
  }
];

export function createEconomy(ctx) {
  let interactablesCleanup = [];
  let currentContract = null;
  let contractCooldown = 0;
  let activeTrial = null;
  let trialCooldown = 0;

  const civilianKeys = ['colibri', 'sirena', 'caiman', 'mula', 'boxer', 'fantasma', 'corsario', 'zorro', 'relampago'];

  function getRepTierIndex(rep) {
    if (rep >= 1400) return 5;
    if (rep >= 900) return 4;
    if (rep >= 500) return 3;
    if (rep >= 250) return 2;
    if (rep >= 100) return 1;
    return 0;
  }

  function buyAmmo(slot) {
    const p = PRICES.ammo[slot] || 0;
    if (ctx.save.cash < p) return "Insufficient cash.";
    ctx.save.cash -= p;
    return `Purchased ammo slot ${slot}.`;
  }

  function buyArmour() {
    if (ctx.save.cash < PRICES.armour) return "Insufficient cash.";
    ctx.save.cash -= PRICES.armour;
    ctx.save.armour = 100;
    return "Purchased full armour.";
  }

  function resprayService() {
    if (ctx.save.cash < PRICES.respray) return "Insufficient cash.";
    ctx.save.cash -= PRICES.respray;
    respray();
    return "Vehicle resprayed & heat cleared.";
  }

  function repairService() {
    if (ctx.save.cash < PRICES.repair) return "Insufficient cash.";
    ctx.save.cash -= PRICES.repair;
    if (ctx.player && ctx.player.inCar) {
      ctx.player.inCar.durability = 100;
    }
    return "Vehicle repaired.";
  }

  function sellCurrentCar() {
    if (!ctx.player || !ctx.player.inCar) return "No vehicle.";
    const car = ctx.player.inCar;
    const spec = VEHICLE_ROSTER[car.spec];
    if (!spec || !spec.chop) return "Cannot chop this vehicle.";
    ctx.save.cash += spec.chop;
    ctx.save.stats.carsStolen++;
    car.dead = true;
    if (car.mesh && car.mesh.parent) car.mesh.parent.remove(car.mesh);
    ctx.player.inCar = null;
    return `Sold for $${spec.chop}.`;
  }

  function storeCurrentCar() {
    if (!ctx.player || !ctx.player.inCar) return "No vehicle.";
    const car = ctx.player.inCar;
    if (ctx.save.ownedCars.length >= 4) return "Garage full (max 4).";
    ctx.save.ownedCars.push({ spec: car.spec, durability: Math.round(car.durability || 100) });
    car.dead = true;
    if (car.mesh && car.mesh.parent) car.mesh.parent.remove(car.mesh);
    ctx.player.inCar = null;
    return "Vehicle stored in garage.";
  }

  function recallCar(i) {
    if (i < 0 || i >= ctx.save.ownedCars.length) return "Invalid car slot.";
    const data = ctx.save.ownedCars[i];
    // spawn logic handled via main or callback
    return `Recalled ${data.spec}.`;
  }

  function repairStoredCar(i) {
    if (i < 0 || i >= ctx.save.ownedCars.length) return "Invalid car slot.";
    if (ctx.save.cash < PRICES.repair) return "Insufficient cash ($80).";
    ctx.save.cash -= PRICES.repair;
    ctx.save.ownedCars[i].durability = 100;
    return "Stored car repaired.";
  }

  function sellStoredCar(i) {
    if (i < 0 || i >= ctx.save.ownedCars.length) return "Invalid car slot.";
    const data = ctx.save.ownedCars[i];
    const spec = VEHICLE_ROSTER[data.spec];
    const val = spec && spec.chop ? spec.chop : 150;
    ctx.save.cash += val;
    ctx.save.ownedCars.splice(i, 1);
    return `Sold stored car for $${val}.`;
  }

  function registerShops() {
    interactablesCleanup.push(ctx.registerInteractable({
      pos: SHOP_POS.weapons,
      radius: 4.0,
      label: () => "Press E to Visit Gunsmith",
      action: () => {
        const msg = buyArmour();
        ctx.notify(msg, 2000);
      }
    }));

    interactablesCleanup.push(ctx.registerInteractable({
      pos: SHOP_POS.spray,
      radius: 4.0,
      label: () => "Press E for Respray ($200)",
      action: () => {
        const msg = resprayService();
        ctx.notify(msg, 2000);
      }
    }));

    interactablesCleanup.push(ctx.registerInteractable({
      pos: SHOP_POS.chop,
      radius: 4.0,
      label: () => "Press E at Chop Shop",
      action: () => {
        const msg = sellCurrentCar();
        ctx.notify(msg, 2000);
      }
    }));

    interactablesCleanup.push(ctx.registerInteractable({
      pos: SHOP_POS.garage,
      radius: 4.0,
      label: () => "Press E at Garage",
      action: () => {
        if (ctx.openGarage) ctx.openGarage();
      }
    }));

    interactablesCleanup.push(ctx.registerInteractable({
      pos: SHOP_POS.safehouse,
      radius: 4.0,
      label: () => "Press E at Safehouse",
      action: () => {
        ctx.notify("Safehouse: Resting...", 2000);
      }
    }));
  }

  function travelTo(districtId) {
    const tier = getRepTierIndex(ctx.save.rep);
    if (tier < 4) return "Refused: Requires BROKER tier (900 REP).";
    return `Traveled to ${districtId}`;
  }

  function update(dt, playerPos) {
    if (contractCooldown > 0) contractCooldown -= dt;
    else if (!currentContract && Math.random() < 0.005) {
      const idx = (ctx.save.stats.contractsDone * 5 + 3) % civilianKeys.length;
      currentContract = {
        spec: civilianKeys[idx],
        timeLeft: 240
      };
    }
    if (currentContract) {
      currentContract.timeLeft -= dt;
      if (currentContract.timeLeft <= 0) currentContract = null;
    }
  }

  return {
    buyAmmo,
    buyArmour,
    respray: resprayService,
    repair: repairService,
    sellCurrentCar,
    storeCurrentCar,
    recallCar,
    repairStoredCar,
    sellStoredCar,
    travelTo,
    registerShops,
    update,
    currentContract: () => currentContract,
    activeTrial: () => activeTrial,
    contractInfo: () => currentContract ? `Contract: ${currentContract.spec}` : null,
    trialInfo: () => activeTrial ? `Trial active` : null,
    reset: () => {
      currentContract = null;
      activeTrial = null;
      for (const fn of interactablesCleanup) fn();
      interactablesCleanup = [];
    }
  };
}
