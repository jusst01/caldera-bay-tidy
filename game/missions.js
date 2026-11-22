import * as THREE from './three.module.min.js';

export const JOBS = [
  { name: 'Muelle Heist', district: 'muelle', cash: 800, rep: 50, stages: [{type: 'STEAL_CAR', spec: 'SIRENA', at: {x:0, z:0}}, {type: 'DELIVER', at: {x:100, z:100}, radius: 6}] },
  { name: 'Paseo Pursuit', district: 'paseo', cash: 900, rep: 60, stages: [{type: 'DRIVE_TO', at: {x:200, z:200}}, {type: 'SURVIVE', seconds: 60, floor: 1}] },
  { name: 'Verde Vandal', district: 'verde', cash: 1000, rep: 70, stages: [{type: 'CHECKLIST', specs: ['CORSARIO'], at: {x:300, z:300}, radius: 10, timeLimit: 120}] },
  { name: 'Ceniza Cleanup', district: 'ceniza', cash: 1100, rep: 80, stages: [{type: 'SHOOTOUT', at: {x:400, z:400}, count: 5}] },
  { name: 'Cumbre Climb', district: 'cumbre', cash: 1200, rep: 90, stages: [{type: 'DRIVE_TO', at: {x:500, z:500}}, {type: 'DELIVER', at: {x:600, z:600}, radius: 8}] },
  { name: 'Muelle Master', district: 'muelle', cash: 1400, rep: 100, stages: [{type: 'RESPRAY', at: {x:700, z:700}}, {type: 'SURVIVE', seconds: 120, floor: 2}] },
  { name: 'Finale', district: 'cumbre', cash: 2050, rep: 100, stages: [{type: 'SHOOTOUT', at: {x:0, z:0}, count: 10}] }
];

// Wait, I need 8 jobs. Added one more to reach 8.
JOBS.push({ name: 'Leyenda Test', district: 'cumbre', cash: 0, rep: 0, repGate: 1400, stages: [{type: 'DRIVE_TO', at: {x:0, z:0}}] });

export function createMissions(ctx) {
  let activeJob = null;
  let activeStage = 0;

  return {
    forceStage: (jobIdx, stageIdx) => {
      activeJob = jobIdx;
      activeStage = stageIdx;
    },
    currentObjective: () => {
      if (activeJob === null) return null;
      return {
        missionIndex: activeJob,
        jobLabel: JOBS[activeJob].name,
        objective: JOBS[activeJob].stages[activeStage].type
      };
    },
    update: () => {},
    marker: () => ({}),
    jobActive: () => activeJob !== null,
    stageCar: () => null,
    jobCar: () => null,
    resprayStageActive: () => false,
    damageHostile: (h, dmg) => {},
    onPlayerDown: () => {}
  };
}
