// CALDERA BAY — game/missions.js
// Mission arc (8 jobs), stage verbs, dark figure hostiles, objectives, marker, guards, and completion logic.

import * as THREE from './three.module.min.js';
import { eject, groundHeight, setFinaleDusk } from './city.js';
import { spawnVehicle, damageVehicle } from './vehicles.js';
import { setPointsFloor } from './police.js';

export const JOBS = [
  {
    id: 0,
    title: "Dockside Delivery",
    district: "muelle",
    cash: 400,
    rep: 50,
    repGate: 0,
    startPos: { x: -300, z: 300 },
    stages: [
      { verb: 'STEAL_CAR', spec: 'sirena', at: { x: -250, z: 250 } },
      { verb: 'DRIVE_TO', at: { x: -100, z: 150 } },
      { verb: 'DELIVER', at: { x: -50, z: 200 }, radius: 10, needCar: true }
    ]
  },
  {
    id: 1,
    title: "Paseo Pursuit",
    district: "paseo",
    cash: 700,
    rep: 75,
    repGate: 100,
    startPos: { x: 330, z: 60 },
    stages: [
      { verb: 'STEAL_CAR', spec: 'corsario', at: { x: 280, z: 100 } },
      { verb: 'SHOOTOUT', at: { x: 350, z: 0 }, count: 3 },
      { verb: 'DRIVE_TO', at: { x: 400, z: 120 } }
    ]
  },
  {
    id: 2,
    title: "Verde Heist",
    district: "verde",
    cash: 1000,
    rep: 90,
    repGate: 250,
    startPos: { x: 300, z: -300 },
    stages: [
      { verb: 'STEAL_CAR', spec: 'zorro', at: { x: 250, z: -250 } },
      { verb: 'SURVIVE', seconds: 45, floor: 2 },
      { verb: 'DELIVER', at: { x: 320, z: -320 }, radius: 10, needCar: true }
    ]
  },
  {
    id: 3,
    title: "Ceniza Run",
    district: "ceniza",
    cash: 1200,
    rep: 100,
    repGate: 500,
    startPos: { x: -300, z: -300 },
    stages: [
      { verb: 'STEAL_CAR', spec: 'mula', at: { x: -260, z: -260 } },
      { verb: 'CHECKLIST', specs: ['mula', 'colibri'], at: { x: -320, z: -320 }, radius: 12, timeLimit: 180 },
      { verb: 'RESPRAY', at: { x: -384, z: -192 } }
    ]
  },
  {
    id: 4,
    title: "Cumbre Climb",
    district: "cumbre",
    cash: 1500,
    rep: 120,
    repGate: 900,
    startPos: { x: 0, z: -500 },
    stages: [
      { verb: 'STEAL_CAR', spec: 'relampago', at: { x: 0, z: -420 } },
      { verb: 'DRIVE_TO', at: { x: 0, z: -550 } },
      { verb: 'SHOOTOUT', at: { x: 50, z: -500 }, count: 4 }
    ]
  },
  {
    id: 5,
    title: "Underground Sweep",
    district: "muelle",
    cash: 1100,
    rep: 80,
    repGate: 900,
    startPos: { x: -300, z: 300 },
    stages: [
      { verb: 'SHOOTOUT', at: { x: -280, z: 280 }, count: 5 },
      { verb: 'SURVIVE', seconds: 60, floor: 3 }
    ]
  },
  {
    id: 6,
    title: "Midnight Courier",
    district: "paseo",
    cash: 1150,
    rep: 85,
    repGate: 900,
    startPos: { x: 330, z: 60 },
    stages: [
      { verb: 'STEAL_CAR', spec: 'fantasma', at: { x: 300, z: 80 } },
      { verb: 'DRIVE_TO', at: { x: 150, z: 100 } },
      { verb: 'DELIVER', at: { x: 330, z: 60 }, radius: 10, needCar: true }
    ]
  },
  {
    id: 7,
    title: "Leyenda Final",
    district: "cumbre",
    cash: 1400,
    rep: 150,
    repGate: 1400,
    startPos: { x: 0, z: -500 },
    setFinaleDusk: true,
    stages: [
      { verb: 'SHOOTOUT', at: { x: 0, z: -480 }, count: 6 },
      { verb: 'SURVIVE', seconds: 90, floor: 4 },
      { verb: 'DRIVE_TO', at: { x: 0, z: -520 } }
    ]
  }
];

export function createMissions(ctx) {
  let activeJobIndex = null;
  let activeStageIndex = 0;
  let stageCar = null;
  let jobCar = null;
  let hostiles = [];
  let stageTimer = 0;
  let edgeLatchArmed = false;
  let removeInteractableFn = null;

  function mulberry32(seed) {
    let s = seed >>> 0;
    return function() {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function spawnHostilesForStage(jobId, stageIdx, at) {
    hostiles = [];
    const stage = JOBS[jobId].stages[stageIdx];
    const count = stage.count || 4;
    const rng = mulberry32(9000 + jobId * 37 + stageIdx);

    for (let i = 0; i < count; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = 8 + rng() * 6;
      let hx = at.x + Math.sin(angle) * dist;
      let hz = at.z + Math.cos(angle) * dist;
      const ejected = eject(hx, hz, 0.8);
      hx = ejected.x;
      hz = ejected.z;
      const hy = groundHeight(hx, hz);

      const geo = new THREE.BoxGeometry(0.8, 1.7, 0.6);
      const mat = new THREE.MeshStandardMaterial({ color: 0x3E3A45, roughness: 0.8 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(hx, hy + 0.85, hz);
      mesh.castShadow = true;
      if (ctx.scene) ctx.scene.add(mesh);

      hostiles.push({
        x: hx,
        z: hz,
        y: hy,
        hp: 45,
        maxHp: 45,
        dead: false,
        mesh,
        fireTimer: 1.6 + rng() * 1.1,
        strafeAngle: rng() * Math.PI * 2
      });
    }
  }

  function clearHostiles() {
    for (const h of hostiles) {
      if (h.mesh && h.mesh.parent) {
        h.mesh.parent.remove(h.mesh);
      }
    }
    hostiles = [];
  }

  function setupStage(jobId, stageIdx) {
    activeJobIndex = jobId;
    activeStageIndex = stageIdx;
    edgeLatchArmed = false;
    clearHostiles();

    const job = JOBS[jobId];
    const stage = job.stages[stageIdx];

    if (job.setFinaleDusk) {
      setFinaleDusk(true);
    }

    if (stage.verb === 'STEAL_CAR') {
      stageCar = spawnVehicle(stage.spec, stage.at.x, stage.at.z, 0, ctx.scene);
      jobCar = stageCar;
    } else if (stage.verb === 'SHOOTOUT') {
      spawnHostilesForStage(jobId, stageIdx, stage.at);
    } else if (stage.verb === 'SURVIVE') {
      stageTimer = stage.seconds || 45;
    } else if (stage.verb === 'CHECKLIST') {
      stageTimer = stage.timeLimit || 180;
    }
  }

  function startJob(i) {
    if (i !== ctx.save.missionIndex) {
      ctx.notify("Mission locked or invalid sequence.", 2500);
      return false;
    }
    const job = JOBS[i];
    if (!job) return false;
    if (ctx.save.rep < job.repGate) {
      ctx.notify(`Requires ${job.repGate} REP (Current: ${ctx.save.rep})`, 3000);
      return false;
    }

    activeJobIndex = i;
    setupStage(i, 0);
    ctx.dialogue(job.district.toUpperCase(), `Job started: ${job.title}. Check your map objectives.`);
    ctx.notify(`STARTED: ${job.title}`, 3000);
    return true;
  }

  function armJobStart() {
    if (removeInteractableFn) {
      removeInteractableFn();
      removeInteractableFn = null;
    }
    const nextIdx = ctx.save.missionIndex;
    if (nextIdx >= JOBS.length) return;
    const job = JOBS[nextIdx];

    removeInteractableFn = ctx.registerInteractable({
      pos: job.startPos,
      radius: 6.0,
      label: () => `Press E to Start Job: ${job.title} (${job.repGate} REP req)`,
      action: () => {
        startJob(nextIdx);
      }
    });
  }

  function forceStage(jobId, stageIdx) {
    if (JOBS[jobId] && JOBS[jobId].stages[stageIdx]) {
      setupStage(jobId, stageIdx);
    }
  }

  function reset() {
    activeJobIndex = null;
    activeStageIndex = 0;
    stageCar = null;
    jobCar = null;
    clearHostiles();
    stageTimer = 0;
    setFinaleDusk(false);
    if (removeInteractableFn) {
      removeInteractableFn();
      removeInteractableFn = null;
    }
  }

  function currentObjective() {
    if (activeJobIndex === null) return null;
    const job = JOBS[activeJobIndex];
    const stage = job.stages[activeStageIndex];
    if (!stage) return null;

    let objText = stage.verb;
    if (stage.verb === 'STEAL_CAR') objText = `Steal ${stage.spec.toUpperCase()}`;
    else if (stage.verb === 'DRIVE_TO') objText = `Drive to checkpoint`;
    else if (stage.verb === 'DELIVER') objText = `Deliver vehicle to dropzone`;
    else if (stage.verb === 'SURVIVE') objText = `Survive police pursuit (${Math.ceil(stageTimer)}s)`;
    else if (stage.verb === 'SHOOTOUT') objText = `Eliminate hostile forces (${hostiles.filter(h => !h.dead).length} remaining)`;
    else if (stage.verb === 'CHECKLIST') objText = `Collect checkpoint cars (${Math.ceil(stageTimer)}s)`;
    else if (stage.verb === 'RESPRAY') objText = `Respray vehicle at shop`;

    return {
      jobLabel: job.title,
      objective: objText,
      next: activeStageIndex + 1 < job.stages.length ? job.stages[activeStageIndex + 1].verb : 'Complete',
      stageLabel: `Stage ${activeStageIndex + 1}/${job.stages.length}`,
      timer: stageTimer > 0 ? Math.ceil(stageTimer) : null
    };
  }

  function marker() {
    if (activeJobIndex === null) return null;
    const job = JOBS[activeJobIndex];
    const stage = job.stages[activeStageIndex];
    if (!stage) return null;

    let targetAt = stage.at;
    if (stage.verb === 'STEAL_CAR' && stageCar) {
      targetAt = { x: stageCar.x, z: stageCar.z };
    }
    return {
      x: targetAt.x,
      z: targetAt.z,
      label: job.title,
      type: stage.verb
    };
  }

  function jobActive() {
    return activeJobIndex !== null;
  }

  function resprayStageActive() {
    if (activeJobIndex === null) return false;
    const job = JOBS[activeJobIndex];
    const stage = job.stages[activeStageIndex];
    return stage && stage.verb === 'RESPRAY';
  }

  function damageHostile(h, dmg) {
    if (h.dead) return;
    h.hp -= dmg;
    if (h.hp <= 0) {
      h.dead = true;
      if (h.mesh) {
        h.mesh.rotation.x = Math.PI / 2;
        h.mesh.position.y = h.y + 0.4;
      }
    }
  }

  function onPlayerDown() {
    if (activeJobIndex === null) return;
    const job = JOBS[activeJobIndex];
    ctx.save.stats.jobsFailed++;
    ctx.notify(`MISSION FAILED: ${job.title}`, 4000);
    ctx.dialogue("FAILURE", "You were wasted on the job. Try again when ready.");
    reset();
    armJobStart();
  }

  function update(dt, playerPos, playerCar) {
    if (activeJobIndex === null) return;
    const job = JOBS[activeJobIndex];
    const stage = job.stages[activeStageIndex];

    // Job car guard for STEAL_CAR
    if (stage.verb === 'STEAL_CAR' && stageCar) {
      if (stageCar.dead && !ctx.player.isDriving) {
        // Respawn fresh
        stageCar = spawnVehicle(stage.spec, stage.at.x, stage.at.z, 0, ctx.scene);
        jobCar = stageCar;
        ctx.notify("Job vehicle replaced.", 2000);
      }
    }

    // Job car dying mid-DELIVER
    if (stage.verb === 'DELIVER' && jobCar && jobCar.dead) {
      ctx.notify("Job vehicle destroyed! Rewinding stage.", 3000);
      setupStage(activeJobIndex, 0);
      return;
    }

    // Hostiles AI update
    for (const h of hostiles) {
      if (h.dead) continue;
      const dx = playerPos.x - h.x;
      const dz = playerPos.z - h.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      h.fireTimer -= dt;
      if (h.fireTimer <= 0) {
        h.fireTimer = 1.6 + 1.1;
        if (dist <= 42) {
          const hitChance = Math.max(0.25, Math.min(0.78, 0.78 - dist * 0.012));
          if (Math.random() < hitChance) {
            ctx.damagePlayer(6);
          }
        }
      }

      // Strafe movement
      const strafeSpeed = 2.0;
      h.x += Math.sin(h.strafeAngle) * strafeSpeed * dt;
      h.z += Math.cos(h.strafeAngle) * strafeSpeed * dt;
      if (Math.random() < 0.02) h.strafeAngle += (Math.random() - 0.5) * 2;
      h.mesh.position.set(h.x, h.y + 0.85, h.z);
    }

    // Stage progression logic
    let targetPos = stage.at;
    if (stage.verb === 'STEAL_CAR' && stageCar) {
      targetPos = { x: stageCar.x, z: stageCar.z };
    }

    const dx = playerPos.x - targetPos.x;
    const dz = playerPos.z - targetPos.z;
    const distToTarget = Math.sqrt(dx * dx + dz * dz);
    const radius = stage.radius || 8.0;

    // Edge latch for DRIVE_TO / DELIVER
    if (stage.verb === 'DRIVE_TO' || stage.verb === 'DELIVER') {
      if (distToTarget >= radius + 6) {
        edgeLatchArmed = true;
      }
    } else {
      edgeLatchArmed = true;
    }

    let stageCompleted = false;

    if (stage.verb === 'STEAL_CAR') {
      if (ctx.player.isDriving && ctx.player.currentVehicle === stageCar) {
        stageCompleted = true;
      }
    } else if (stage.verb === 'DRIVE_TO') {
      if (edgeLatchArmed && distToTarget <= radius) {
        stageCompleted = true;
      }
    } else if (stage.verb === 'DELIVER') {
      if (edgeLatchArmed && distToTarget <= radius) {
        if (!stage.needCar || (ctx.player.isDriving && ctx.player.currentVehicle === jobCar)) {
          stageCompleted = true;
          if (jobCar && ctx.player.isDriving && ctx.player.currentVehicle === jobCar) {
            // consume or park
            jobCar = null;
          }
        }
      }
    } else if (stage.verb === 'SURVIVE') {
      setPointsFloor(stage.floor || 2);
      stageTimer -= dt;
      if (stageTimer <= 0) {
        stageCompleted = true;
      }
    } else if (stage.verb === 'SHOOTOUT') {
      const aliveCount = hostiles.filter(h => !h.dead).length;
      if (aliveCount === 0) {
        stageCompleted = true;
      }
    } else if (stage.verb === 'CHECKLIST') {
      stageTimer -= dt;
      if (distToTarget <= radius) {
        stageCompleted = true;
      }
      if (stageTimer <= 0) {
        onPlayerDown();
        return;
      }
    } else if (stage.verb === 'RESPRAY') {
      if (distToTarget <= radius) {
        stageCompleted = true;
      }
    }

    if (stageCompleted) {
      if (activeStageIndex + 1 < job.stages.length) {
        setupStage(activeJobIndex, activeStageIndex + 1);
        ctx.notify("Stage complete. Next objective active.", 2500);
      } else {
        // Job complete!
        ctx.save.cash += job.cash;
        ctx.save.rep += job.rep;
        ctx.save.jobsDone++;
        ctx.save.missionIndex++;
        if (!ctx.save.takeover[job.district]) ctx.save.takeover[job.district] = 0;
        ctx.save.takeover[job.district] = Math.min(100, ctx.save.takeover[job.district] + 20);

        ctx.notify(`JOB COMPLETE: +$${job.cash}, +${job.rep} REP`, 4000);
        ctx.dialogue(job.title.toUpperCase(), `Clean work. District takeover in ${job.district} advanced.`);
        reset();
        armJobStart();
      }
    }
  }

  return {
    startJob,
    armJobStart,
    forceStage,
    reset,
    currentObjective,
    marker,
    jobActive,
    stageCar: () => stageCar,
    jobCar: () => jobCar,
    resprayStageActive,
    damageHostile,
    onPlayerDown,
    update,
    getHostiles: () => hostiles
  };
}
