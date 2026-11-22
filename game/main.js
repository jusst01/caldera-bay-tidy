import * as THREE from './three.module.min.js';
import { initPedestrians, updatePedestrians } from './pedestrians.js';
import { initCombat, updateCombat } from './combat.js';
import { initPolice, updatePolice, reportCrime } from './police.js';

function init() {
    initPedestrians();
    initCombat();
    initPolice();
}

function update(dt) {
    updatePedestrians(dt);
    updateCombat(dt);
    updatePolice(dt);
}

// ... wiring ...
