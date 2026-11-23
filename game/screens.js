import { VEHICLE_ROSTER } from './vehicles.js';

const root = document.getElementById('screen-root');

function setupRoot() {
  root.style.display = 'block';
  root.style.position = 'fixed';
  root.style.left = '0';
  root.style.top = '0';
  root.style.width = '100%';
  root.style.height = '100%';
  root.style.zIndex = '10';
  root.style.backgroundColor = 'rgb(11,14,20)';
  root.style.color = '#fff';
}

export function closeCurrentScreen() {
  root.innerHTML = '';
  root.style.display = 'none';
}

export function openStartScreen(save, {onContinue, onNewGame}) {
  setupRoot();
  root.innerHTML = `
    <div style="display:flex; height:100%">
      <div style="flex:1; padding:40px">
        <h1 style="font-size:72px">CALDERA BAY</h1>
        <p>8 JOBS · 5 DISTRICTS · ONE CITY TO TAKE</p>
        <button id="btn-continue">CONTINUE — JOB ${save.missionIndex + 1}/8 · REP ${save.rep} · $${save.cash.toLocaleString()}</button>
        <button id="btn-new">NEW GAME</button>
        <p>AUTOSAVE ON · SLOT 1 · ${save.lastSaveClock}</p>
      </div>
      <div style="flex:1; padding:40px">
        <h2>YOUR RISE</h2>
        <p>Tiers: ...</p>
        <p>City Takeover: ${Object.values(save.takeover).filter(v => v > 30).length}/5</p>
        <p>Stats: CARS STOLEN ${save.stats.carsStolen} · TOP SPEED ${save.stats.topSpeed} · MAX HEAT ${save.stats.maxHeat}</p>
      </div>
    </div>
  `;
  document.getElementById('btn-continue').onclick = onContinue;
  document.getElementById('btn-new').onclick = onNewGame;
}

export function openGarageScreen(save, callbacks) {
  setupRoot();
  root.innerHTML = `
    <div style="padding:40px">
      <h1>IRIS'S GARAGE — CHOP & REPAIR</h1>
      <div style="display:flex">
        <div style="flex:1">
          <h2>YOUR CARS (${save.ownedCars.length}/4)</h2>
          ${save.ownedCars.map((car, i) => `
            <div>${car.name} - ${car.condition}%
              <button id="repair-${i}">REPAIR $80</button>
              <button id="rollout-${i}">ROLL OUT</button>
              <button id="chop-${i}">CHOP</button>
            </div>
          `).join('')}
        </div>
        <div style="flex:1"><h2>CHOP CATALOG (12)</h2></div>
      </div>
      <footer>CASH: $${save.cash} REP: ${save.rep} BACK TO CITY [ESC]</footer>
    </div>
  `;
  save.ownedCars.forEach((_, i) => {
    document.getElementById(`repair-${i}`).onclick = () => callbacks.repair?.(i);
    document.getElementById(`rollout-${i}`).onclick = () => callbacks.rollOut?.(i);
    document.getElementById(`chop-${i}`).onclick = () => callbacks.chop?.(i);
  });
}

export function openMenu({title, build}) {
  setupRoot();
  root.innerHTML = `<h1>${title}</h1>`;
  build().forEach(item => {
    const btn = document.createElement('button');
    btn.textContent = item.label;
    btn.onclick = () => { item.action(); openMenu({title, build}); };
    root.appendChild(btn);
  });
}
