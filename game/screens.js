// game/screens.js
import * as THREE from './three.module.min.js';
import { VEHICLE_ROSTER } from './vehicles.js';

let screenEl = null;

function createScreenContainer() {
    if (screenEl) screenEl.remove();
    screenEl = document.createElement('div');
    Object.assign(screenEl.style, { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10, background: '#111', color: '#fff', padding: '20px' });
    document.body.appendChild(screenEl);
    return screenEl;
}

export function closeCurrentScreen() { if (screenEl) { screenEl.remove(); screenEl = null; } }

export function openStartScreen(saveData) {
    const el = createScreenContainer();
    el.innerHTML = `<h1>CALDERA BAY</h1><p>8 JOBS · 5 DISTRICTS · ONE CITY TO TAKE</p>
        <button>CONTINUE — JOB ${saveData.missionIndex + 1}/8 · REP ${saveData.rep} · $${saveData.cash}</button>
        <button>NEW GAME</button>
        <p>AUTOSAVE ON · SLOT 1 · ${saveData.lastSaveClock}</p>`;
}

export function openGarageScreen(garageData) {
    const el = createScreenContainer();
    el.innerHTML = `<h1>IRIS'S GARAGE — CHOP & REPAIR</h1>
        <div id="cars"></div><div id="turntable"></div>
        <div id="catalogue"><h2>CHOP CATALOG</h2>${VEHICLE_ROSTER.filter(v => v.chop).map(v => `<p>${v.name}: $${v.chopPrice}</p>`).join('')}</div>
        <footer>Cash: $${garageData.cash} | REP: ${garageData.rep} | BACK TO CITY [ESC]</footer>`;
}

export function openMenu(menuData) {
    const el = createScreenContainer();
    el.innerHTML = `<h2>${menuData.title}</h2>` + menuData.build().map(r => `<p>${r.label}</p>`).join('');
}
