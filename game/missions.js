import * as THREE from './three.module.min.js';

export const JOBS = [
    { name: 'Muelle Heist', district: 'muelle', cash: 500, rep: 50, stages: [{ type: 'STEAL_CAR', spec: 'Sirena', at: [100, 100] }, { type: 'DELIVER', at: [-200, -200], radius: 10, needCar: 'Sirena' }] },
    { name: 'Paseo Pursuit', district: 'paseo', cash: 800, rep: 70, stages: [{ type: 'DRIVE_TO', at: [300, 300] }, { type: 'SHOOTOUT', at: [300, 300], count: 3 }] },
    { name: 'Verde Vandal', district: 'verde', cash: 1000, rep: 80, stages: [{ type: 'SURVIVE', seconds: 60, floor: 1 }, { type: 'DRIVE_TO', at: [500, 0] }] },
    { name: 'Ceniza Cargo', district: 'ceniza', cash: 1200, rep: 90, stages: [{ type: 'STEAL_CAR', spec: 'Mula', at: [0, 500] }, { type: 'DELIVER', at: [0, 0], radius: 15, needCar: 'Mula' }] },
    { name: 'Cumbre Climb', district: 'cumbre', cash: 1500, rep: 100, stages: [{ type: 'CHECKLIST', specs: ['Car'], at: [500, 500], timeLimit: 300 }] },
    { name: 'Muelle Cleanup', district: 'muelle', cash: 1200, rep: 100, stages: [{ type: 'RESPRAY', at: [-384, -192] }, { type: 'SHOOTOUT', at: [100, 100], count: 5 }] },
    { name: 'Final Showdown', district: 'cumbre', cash: 2250, rep: 160, stages: [{ type: 'SURVIVE', seconds: 120, floor: 3 }, { type: 'SHOOTOUT', at: [0, 0], count: 10 }] }
];

export function createMissions(ctx) {
    let currentJob = null;
    let currentStage = 0;

    return {
        forceStage(jobIdx, stageIdx) {
            currentJob = JOBS[jobIdx];
            currentStage = stageIdx;
        },
        currentObjective() {
            if (!currentJob) return null;
            return {
                missionIndex: JOBS.indexOf(currentJob),
                jobLabel: currentJob.name,
                objective: currentJob.stages[currentStage].type
            };
        }
    };
}
