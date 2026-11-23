import { VEHICLE_ROSTER } from './vehicles.js';

const screenRoot = document.getElementById('screen-root');

function setupScreen(content) {
  screenRoot.innerHTML = '';
  Object.assign(screenRoot.style, {
    position: 'fixed',
    left: '0', top: '0', width: '100%', height: '100%',
    zIndex: 10,
    backgroundColor: 'rgb(11,14,20)',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  });
  screenRoot.appendChild(content);
  screenRoot.style.display = 'block';
}

export function closeCurrentScreen() {
  screenRoot.innerHTML = '';
  screenRoot.style.display = 'none';
}

export function openStartScreen(save, { onContinue, onNewGame }) {
  const container = document.createElement('div');
  container.innerHTML = `
    <h1>CALDERA BAY</h1>
    <p>8 JOBS · 5 DISTRICTS · ONE CITY TO TAKE</p>
    <button id="continue">CONTINUE — JOB ${save.missionIndex + 1}/8 · REP ${save.rep} · $${save.cash.toLocaleString()}</button>
    <button id="newgame">NEW GAME</button>
    <p>AUTOSAVE ON · SLOT 1 · ${save.lastSaveClock}</p>
    <div id="stats">
      <h3>YOUR RISE</h3>
      <p>CITY TAKEOVER ${Object.values(save.takeover).filter(v => v > 30).length}/5</p>
      <p>CARS STOLEN ${save.stats.carsStolen} · TOP SPEED ${save.stats.topSpeed} · MAX HEAT ${save.stats.maxHeat}</p>
    </div>
  `;
  container.querySelector('#continue').onclick = onContinue;
  container.querySelector('#newgame').onclick = onNewGame;
  setupScreen(container);
}

export function openGarageScreen(save, callbacks) {
  const container = document.createElement('div');
  container.innerHTML = `
    <h1>IRIS'S GARAGE — CHOP & REPAIR</h1>
    <div id="cars">
      <h2>YOUR CARS (${save.ownedCars.length}/4)</h2>
      ${save.ownedCars.map((c, i) => `<div>${c.name} - ${c.condition}% <button id="rep${i}">REPAIR</button></div>`).join('')}
    </div>
    <div id="catalog">
      <h2>CHOP CATALOG (12)</h2>
      ${VEHICLE_ROSTER.map(v => `<div>${v.name} - ${v.chop > 0 ? '$'+v.chop : 'TOO HOT'}</div>`).join('')}
    </div>
  `;
  setupScreen(container);
}

export function openMenu({ title, build }) {
  const container = document.createElement('div');
  container.innerHTML = `<h1>${title}</h1>`;
  build().forEach(row => {
    const item = document.createElement('div');
    item.textContent = row.label;
    item.onclick = row.action;
    container.appendChild(item);
  });
  setupScreen(container);
}
