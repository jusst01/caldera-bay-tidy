import * as THREE from './three.module.min.js';
import { initPedestrians, updatePedestrians } from './pedestrians.js';
import { initCombat, updateCombat } from './combat.js';
import { initPolice, updatePolice, reportCrime } from './police.js';
import { loadSave, saveSave } from './save.js';
import { createMissions } from './missions.js';
import { createEconomy } from './economy.js';

let missions, economy, save;

function init() {
    initPedestrians();
    initCombat();
    initPolice();
    save = loadSave();
    missions = createMissions({ save });
    economy = createEconomy({ save });
}

function update(dt) {
    updatePedestrians(dt);
    updateCombat(dt);
    updatePolice(dt);
}

// F5 for manual save
window.addEventListener('keydown', (e) => {
    if (e.key === 'F5') saveSave(save);
});
