import * as THREE from './three.module.min.js';

export const JOBS = [
  { name: 'Muelle Theft', district: 'muelle', cash: 500, rep: 50, stages: [
    { type: 'STEAL_CAR', spec: 'Sirena', at: {x: 100, z: 100} },
    { type: 'DELIVER', at: {x: -200, z: -200}, radius: 10, needCar: true }
  ]},
  { name: 'Paseo Courier', district: 'paseo', cash: 800, rep: 75, stages: [
    { type: 'DRIVE_TO', at: {x: 0, z: 0} },
    { type: 'SURVIVE', seconds: 60, floor: 1 }
  ]},
  { name: 'Verde Shootout', district: 'verde', cash: 1000, rep: 100, stages: [
    { type: 'SHOOTOUT', at: {x: 300, z: 300}, count: 5 }
  ]},
  { name: 'Ceniza Checklist', district: 'ceniza', cash: 1200, rep: 100, stages: [
    { type: 'CHECKLIST', specs: ['weapon', 'armour'], at: {x: -100, z: 400}, timeLimit: 300 }
  ]},
  { name: 'Cumbre Race', district: 'cumbre', cash: 1500, rep: 125, stages: [
    { type: 'DRIVE_TO', at: {x: 500, z: 500} },
    { type: 'DELIVER', at: {x: 0, z: 600}, radius: 15 }
  ]},
  { name: 'Muelle Respray', district: 'muelle', cash: 1000, rep: 50, stages: [
    { type: 'RESPRAY', at: {x: -384, z: -192} }
  ]},
  { name: 'Finale', district: 'cumbre', cash: 2450, rep: 150, repGate: 1400, stages: [
    { type: 'SHOOTOUT', at: {x: 0, z: 0}, count: 10 },
    { type: 'SURVIVE', seconds: 120, floor: 2 }
  ]},
  { name: 'Side Hustle', district: 'paseo', cash: 0, rep: 0, stages: [
    { type: 'DRIVE_TO', at: {x: 100, z: -100} }
  ]}
];

export const createMissions = (ctx) => {
  let activeJob = null;
  let activeStage = 0;

  return {
    forceStage: (jobIdx, stageIdx) => {
      if (JOBS[jobIdx]) {
        activeJob = jobIdx;
        activeStage = stageIdx;
      }
    },
    currentObjective: () => {
      if (activeJob === null) return null;
      return {
        missionIndex: activeJob,
        jobLabel: JOBS[activeJob].name,
        objective: JOBS[activeJob].stages[activeStage].type
      };
    },
    reset: () => {
      activeJob = null;
      activeStage = 0;
    }
  };
};
