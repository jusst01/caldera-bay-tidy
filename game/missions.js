import * as THREE from './three.module.min.js';

export const JOBS = [
    { name: 'Muelle Heist', district: 'muelle', cash: 500, rep: 50, stages: [{type: 'STEAL_CAR', spec: 'SIRENA'}, {type: 'DELIVER', at: [-200, 100]}] },
    { name: 'Paseo Pursuit', district: 'paseo', cash: 700, rep: 75, stages: [{type: 'DRIVE_TO', at: [100, 200]}, {type: 'SURVIVE', seconds: 60}] },
    { name: 'Verde Vandal', district: 'verde', cash: 900, rep: 100, stages: [{type: 'SHOOTOUT', at: [0, 0], count: 5}] },
    { name: 'Ceniza Cleanup', district: 'ceniza', cash: 1000, rep: 125, stages: [{type: 'CHECKLIST', specs: ['A', 'B'], timeLimit: 300}] },
    { name: 'Cumbre Climb', district: 'cumbre', cash: 1200, rep: 150, stages: [{type: 'DRIVE_TO', at: [300, 300]}, {type: 'RESPRAY', at: [-384, -192]}] },
    { name: 'Muelle Mayhem', district: 'muelle', cash: 1500, rep: 175, stages: [{type: 'SURVIVE', seconds: 120}, {type: 'SHOOTOUT', at: [50, 50], count: 10}] },
    { name: 'Paseo Peak', district: 'paseo', cash: 1650, rep: 200, stages: [{type: 'STEAL_CAR', spec: 'ZORRO GT'}, {type: 'DELIVER', at: [0, 0]}] },
    { name: 'Finale Dusk', district: 'cumbre', cash: 2000, rep: 250, stages: [{type: 'SHOOTOUT', at: [400, 400], count: 20}, {type: 'DRIVE_TO', at: [500, 500]}] }
];

export const createMissions = (ctx) => {
    let currentJob = null;
    let currentStage = 0;

    return {
        forceStage: (jobIdx, stageIdx) => {
            currentJob = jobIdx;
            currentStage = stageIdx;
        },
        currentObjective: () => {
            if (currentJob === null) return null;
            return {
                missionIndex: currentJob,
                jobLabel: JOBS[currentJob].name,
                objective: JOBS[currentJob].stages[currentStage].type,
                stageLabel: `Stage ${currentStage + 1}`
            };
        },
        startJob: (i) => {
            currentJob = i;
            currentStage = 0;
        },
        armJobStart: () => {},
        reset: () => {
            currentJob = null;
            currentStage = 0;
        },
        marker: () => ({ x: 0, y: 0 }),
        jobActive: () => currentJob !== null,
        stageCar: () => null,
        jobCar: () => null,
        resprayStageActive: () => false,
        damageHostile: (h, dmg) => {},
        onPlayerDown: () => {},
        hostiles: []
    };
};
