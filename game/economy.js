// CALDERA BAY — game/economy.js
// Economy system, shops, prices, REP tier unlocks, contracts, time trials, car storage/chopping, and fast travel.

import { VEHICLE_ROSTER } from './vehicles.js';
import { resry as policeRespray } from './police.js';

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
  let currentContract = null; // { spec, timeLeft, expiresAt }
  let contractCooldown = 0;
  let activeTrial = null; // { id, cpIndex, timer, paidRep }
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

  function registerShops() {
    // Weapons shop at [320, 192]
    interactablesCleanup.push(ctx.registerInteractable({
      pos: SHOP_POS.weapons,
      radius: 4.0,
      label: () => "Press E to Visit Gunsmith (Weapons & Armour)",
      action: () => {
        const tierIdx = getRepTierIndex(ctx.save.rep);
        if (tierIdx < 2) {
          ctx.notify("Locked: Requires WHEELMAN tier (250 REP)", 3000);
          return;
        }
        // buy armour or ammo
        if (ctx.save.cash >= PRICES.armour && ctx.save.armour < 100) {
          ctx.save.cash -= PRICES.armour;
          ctx.save.armour = 100;
          ctx.notify("Purchased Full Armour ($150)", 2500);
        } else {
          ctx.notify("Armour full or insufficient cash.", 2000);
        }
      }
    }));

    // Respray shop at [-384, -192]
    interactablesCleanup.push(ctx.registerInteractable({
      pos: SHOP_POS.spray,
      radius: 4.0,
      label: () => "Press E for Respray ($200)",
      action: () => {
        if (ctx.save.cash >= PRICES.respray) {
          ctx.save.cash -= PRICES.respray;
          policeRespray();
          if (ctx.player.isDriving && ctx.player.currentVehicle) {
            // Repaint vehicle mesh
            const car = ctx.player.currentVehicle;
            if (car.mesh && car.mesh.children[0] && car.mesh.children[0].material) {
              car.mesh.children[0].material.color.setHex(Math.floor(Math.random() * 0xffffff));
            }
          }
          ctx.notify("Vehicle resprayed & heat cleared! ($200)", 2500);
        } else {
          ctx.notify("Insufficient cash for respray ($200)", 2500);
        }
      }
    }));

    // Chop shop at [-320, -256]
    interactablesCleanup.push(ctx.registerInteractable({
      pos: SHOP_POS.chop,
      radius: 4.0,
      label: () => "Press E at Chop Shop / Deliver Contract",
      action: () => {
        const tierIdx = getRepTierIndex(ctx.save.rep);
        if (tierIdx < 1) {
          ctx.notify("Locked: Requires RUNNER tier (100 REP)", 3000);
          return;
        }
        if (ctx.player.isDriving && ctx.player.currentVehicle) {
          const car = ctx.player.currentVehicle;
          if (car.spec.police || car.spec.swat || car.spec.heli) {
            ctx.notify("Chop shop refuses police/emergency hardware.", 3000);
            return;
          }
          const isOwned = ctx.save.ownedCars.some(oc => oc.spec === car.typeKey);
          if (isOwned) {
            ctx.notify("Chop shop refuses your registered personal vehicles.", 3000);
            return;
          }

          // Check contract delivery
          if (currentContract && car.typeKey === currentContract.spec) {
            ctx.save.cash += 150 + (car.spec.chop || 100);
            ctx.save.rep += 10;
            if (!ctx.save.takeover['ceniza']) ctx.save.takeover['ceniza'] = 0;
            ctx.save.takeover['ceniza'] = Math.min(100, ctx.save.takeover['ceniza'] + 5);
            ctx.save.stats.contractsDone++;
            ctx.notify("Contract Delivered! +$150 +10 REP", 3000);
            currentContract = null;
            contractCooldown = 180;
            // Remove car
            car.dead = true;
            if (car.mesh && car.mesh.parent) car.mesh.parent.remove(car.mesh);
            ctx.player.isDriving = false;
            ctx.player.currentVehicle = null;
            return;
          }

          // Regular chop
          const chopVal = car.spec.chop || 50;
          ctx.save.cash += chopVal;
          ctx.save.stats.carsStolen++;
          ctx.notify(`Chopped ${car.spec.name}: +$${chopVal}`, 2500);
          car.dead = true;
          if (car.mesh && car.mesh.parent) car.mesh.parent.remove(car.mesh);
          ctx.player.isDriving = false;
          ctx.player.currentVehicle = null;
        } else {
          ctx.notify("Drive a vehicle into the chop shop to sell/deliver.", 2500);
        }
      }
    }));

    // Garage / Storage at [-256, 448]
    interactablesCleanup.push(ctx.registerInteractable({
      pos: SHOP_POS.garage,
      radius: 4.0,
      label: () => "Press E to Store / Manage Garage (Max 4)",
      action: () => {
        const tierIdx = getRepTierIndex(ctx.save.rep);
        if (tierIdx < 3) {
          ctx.notify("Locked: Requires FIXER tier (500 REP)", 3000);
          return;
        }
        if (ctx.player.isDriving && ctx.player.currentVehicle) {
          const car = ctx.player.currentVehicle;
          if (car.spec.police || car.spec.swat || car.spec.heli) {
            ctx.notify("Garage refuses emergency vehicles.", 2500);
            return;
          }
          if (ctx.save.ownedCars.length >= 4) {
            ctx.notify("Garage is full (Max 4 vehicles).", 2500);
            return;
          }
          ctx.save.ownedCars.push({ spec: car.typeKey, durability: Math.round(car.durability) });
          ctx.notify(`Stored ${car.spec.name} in garage.`, 3000);
          car.dead = true;
          if (car.mesh && car.mesh.parent) car.mesh.parent.remove(car.mesh);
          ctx.player.isDriving = false;
          ctx.player.currentVehicle = null;
        } else {
          ctx.notify(`Garage has ${ctx.save.ownedCars.length}/4 cars stored.`, 2500);
        }
      }
    }));

    // Safehouse fast travel / rest at [-320, 320]
    interactablesCleanup.push(ctx.registerInteractable({
      pos: SHOP_POS.safehouse,
      radius: 4.0,
      label: () => "Press E at Safehouse (Rest & Fast Travel)",
      action: () => {
        const tierIdx = getRepTierIndex(ctx.save.rep);
        if (tierIdx < 4) {
          ctx.notify("Locked: Requires BROKER tier (900 REP) for fast travel", 3000);
          return;
        }
        ctx.notify("Safehouse rested: Heat cleared, stats saved.", 2500);
      }
    }));
  }

  function travelTo(districtId) {
    const tierIdx = getRepTierIndex(ctx.save.rep);
    if (tierIdx < 4) {
      return "Refused: Requires BROKER tier (900 REP).";
    }
    if (ctx.missionActive && ctx.missionActive()) {
      return "Refused: Cannot fast travel during active mission.";
    }
    if (currentContract) {
      return "Refused: Active contract in progress.";
    }
    if (activeTrial) {
      return "Refused: Time trial in progress.";
    }
    // Teleport player based on district
    const coords = {
      muelle: { x: -300, z: 300 },
      paseo: { x: 330, z: 60 },
      verde: { x: 300, z: -300 },
      ceniza: { x: -300, z: -300 },
      cumbre: { x: 0, z: -500 }
    };
    const dest = coords[districtId];
    if (!dest) return "Invalid district.";
    ctx.player.x = dest.x;
    ctx.player.z = dest.z;
    ctx.player.y = groundHeight(dest.x, dest.z);
    if (ctx.player.isDriving && ctx.player.currentVehicle) {
      ctx.player.currentVehicle.x = dest.x;
      ctx.player.currentVehicle.z = dest.z;
      ctx.player.currentVehicle.y = ctx.player.y;
    }
    ctx.notify(`Fast traveled to ${districtId.toUpperCase()}`, 3000);
    return `Traveled to ${districtId}`;
  }

  function startTrial(trialId) {
    if (activeTrial) return "Trial already active.";
    if (ctx.save.cash < PRICES.trialFee) return "Insufficient cash ($100 fee).";
    const trial = TIME_TRIALS.find(t => t.id === trialId);
    if (!trial) return "Trial not found.";

    ctx.save.cash -= PRICES.trialFee;
    activeTrial = {
      id: trial.id,
      cpIndex: 0,
      timer: trial.targetSec,
      paidRep: false
    };
    ctx.notify(`Started Time Trial: ${trial.name}`, 3000);
    return `Trial started`;
  }

  function update(dt, playerPos) {
    if (contractCooldown > 0) contractCooldown -= dt;
    else if (!currentContract && Math.random() < 0.005) {
      const idx = (ctx.save.stats.contractsDone * 5 + 3) % civilianKeys.length;
      currentContract = {
        spec: civilianKeys[idx],
        timeLeft: 240,
        expiresAt: 240
      };
      ctx.notify(`New Chop Contract available: Steal ${VEHICLE_ROSTER[currentContract.spec].name}`, 4000);
    }

    if (currentContract) {
      currentContract.timeLeft -= dt;
      if (currentContract.timeLeft <= 0) {
        currentContract = null;
        contractCooldown = 60;
        ctx.notify("Contract expired.", 3000);
      }
    }

    if (activeTrial) {
      activeTrial.timer -= dt;
      const trialDef = TIME_TRIALS.find(t => t.id === activeTrial.id);
      if (trialDef && activeTrial.cpIndex < trialDef.checkpoints.length) {
        const cp = trialDef.checkpoints[activeTrial.cpIndex];
        const dx = playerPos.x - cp.x;
        const dz = playerPos.z - cp.z;
        if (Math.sqrt(dx * dx + dz * dz) <= 17) {
          activeTrial.cpIndex++;
          if (activeTrial.cpIndex >= trialDef.checkpoints.length) {
            // Win!
            ctx.save.cash += trialDef.cash;
            ctx.save.stats.trialsWon++;
            if (!activeTrial.paidRep) {
              ctx.save.rep += trialDef.rep;
              activeTrial.paidRep = true;
            }
            ctx.notify(`TRIAL WON! +$${trialDef.cash}, +${trialDef.rep} REP`, 4000);
            activeTrial = null;
          } else {
            ctx.notify(`Checkpoint reached (${activeTrial.cpIndex}/${trialDef.checkpoints.length})`, 2000);
          }
        }
      }
      if (activeTrial && activeTrial.timer <= 0) {
        ctx.notify("Time Trial Failed (Time expired).", 3000);
        activeTrial = null;
      }
    }
  }

  registerShops();

  return {
    travelTo,
    startTrial,
    update,
    currentContract: () => currentContract,
    activeTrial: () => activeTrial,
    contractInfo: () => currentContract ? `Contract: ${VEHICLE_ROSTER[currentContract.spec].name} (${Math.ceil(currentContract.timeLeft)}s)` : null,
    trialInfo: () => activeTrial ? `Trial active: CP ${activeTrial.cpIndex} (${Math.ceil(activeTrial.timer)}s)` : null,
    reset: () => {
      currentContract = null;
      activeTrial = null;
      contractCooldown = 0;
      for (const fn of interactablesCleanup) fn();
      interactablesCleanup = [];
    }
  };
}
