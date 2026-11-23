import { VEHICLE_ROSTER } from './vehicles.js';

const root = document.getElementById('screen-root');

function createScreenBase() {
  root.innerHTML = '';
  root.style.cssText = 'position:fixed; left:0; top:0; width:100%; height:100%; z-index:10; background:rgb(11,14,20); color:#eee; display:flex; flex-direction:column; padding:20px;';
  root.style.display = 'block';
}

export function closeCurrentScreen() {
  root.innerHTML = '';
  root.style.display = 'none';
}

export function openMenu({title, build}) {
  createScreenBase();
  const div = document.createElement('div');
  div.innerHTML = `<h1>${title}</h1>`;
  const items = build();
  items.forEach(item => {
    const btn = document.createElement('button');
    btn.textContent = `${item.label} - ${item.detail}`;
    btn.disabled = item.disabled;
    btn.onclick = () => { item.action(); openMenu({title, build}); };
    div.appendChild(btn);
  });
  root.appendChild(div);
}

export function openStartScreen(save, {onContinue, onNewGame}) {
  createScreenBase();
  root.innerHTML = `
    <h1>CALDERA BAY</h1>
    <button id="cont">CONTINUE — JOB ${save.missionIndex + 1}/8 · REP ${save.rep} · $${save.cash.toLocaleString()}</button>
    <button id="new">NEW GAME</button>
    <div>AUTOSAVE ON · SLOT 1 · ${save.lastSaveClock}</div>
    <h2>YOUR RISE</h2>
    <div>CARS STOLEN ${save.stats.carsStolen} · TOP SPEED ${save.stats.topSpeed} · MAX HEAT ${save.stats.maxHeat}</div>
  `;
  document.getElementById('cont').onclick = onContinue;
  document.getElementById('new').onclick = onNewGame;
}

export function openGarageScreen(save, callbacks) {
  createScreenBase();
  let html = `<h1>IRIS'S GARAGE — CHOP & REPAIR</h1>
              <h2>YOUR CARS (${save.ownedCars.length}/4)</h2>`;
  save.ownedCars.forEach((car, i) => {
    html += `<div>${car.name} - ${car.condition}%
      <button id="rep-${i}">REPAIR $80</button>
      <button id="roll-${i}">ROLL OUT</button>
      <button id="chop-${i}">CHOP</button></div>`;
  });
  html += `<h2>CHOP CATALOG (12)</h2>`;
  VEHICLE_ROSTER.forEach(v => {
    const price = v.chop > 0 ? `$${v.chop}` : 'TOO HOT';
    html += `<div>${v.name} - ${price}</div>`;
  });
  html += `<button id="back">BACK TO CITY [ESC]</button>`;
  root.innerHTML = html;
  document.getElementById('back').onclick = closeCurrentScreen;
  save.ownedCars.forEach((_, i) => {
    if (callbacks.repair) document.getElementById(`rep-${i}`).onclick = () => callbacks.repair(i);
    if (callbacks.rollOut) document.getElementById(`roll-${i}`).onclick = () => callbacks.rollOut(i);
    if (callbacks.chop) document.getElementById(`chop-${i}`).onclick = () => callbacks.chop(i);
  });
}
