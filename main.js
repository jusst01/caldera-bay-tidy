// main.js
import * as THREE from './three.module.min.js';
import { initRadio, startRadio } from './game/radio.js';
import { createHud } from './game/hud.js';
import { openStartScreen } from './game/screens.js';

let isPaused = false;
let save = { missionIndex: 0, rep: 0, cash: 0, lastSaveClock: '00:00', radioStation: 0 };
const hud = createHud();

document.addEventListener('keydown', (e) => {
    if (e.key === 'F5') { /* save() */ console.log('Saved'); }
    if (e.key === 'r' || e.key === 'R') { /* cycleStation() */ }
    startRadio();
});

document.addEventListener('click', () => startRadio());

function boot() {
    // world build
    // applySaveToWorld(save)
    isPaused = true;
    openStartScreen(save);
}

function update() {
    if (isPaused) return;
    // simulation logic
    hud.update({ /* snapshot */ });
}

boot();
// requestAnimationFrame(update);
