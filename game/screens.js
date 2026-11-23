import { VEHICLE_ROSTER } from './vehicles.js';
import { JOBS } from './missions.js';
import { takeoverCount, tierFor } from './save.js';

const root = document.getElementById('screen-root');

function createScreenBase() {
  root.innerHTML = '';
  root.style.cssText = 'position:fixed; left:0; top:0; width:100%; height:100%; z-index:10; background:rgb(11,14,20); color:#eee; display:flex; flex-direction:column; padding:20px; overflow-y:auto;';
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
  const tCount = takeoverCount(save.takeover);
  const currentTierNum = tierFor(save.rep);
  const tiers = [
    { name: 'Nobody', rep: 0 },
    { name: 'Runner', rep: 100 },
    { name: 'Wheelman', rep: 250 },
    { name: 'Fixer', rep: 500 },
    { name: 'Broker', rep: 900 },
    { name: 'Leyenda', rep: 1400 }
  ];
  let tierStr = tiers.map((t, i) => `${t.name} ${t.rep}${i === currentTierNum ? ' [ACTIVE]' : ''}`).join(' / ');

  let jobsHtml = '';
  JOBS.forEach((job, idx) => {
    let state = 'LOCKED';
    if (idx < (save.jobsDone ?? 0)) state = 'DONE';
    else if (idx === (save.missionIndex ?? save.jobsDone ?? 0)) state = 'NEXT';
    jobsHtml += `<div>JOB ${idx + 1}: ${job.name} — ${state}</div>`;
  });

  root.innerHTML = `
    <h1>CALDERA BAY</h1>
    <div style="font-size:14px; color:#aaa; margin-bottom:10px;">8 JOBS · 5 DISTRICTS · ONE CITY TO TAKE</div>
    <div id="takeover-line" style="font-weight:bold; margin-bottom:5px;">CITY TAKEOVER ${tCount}/5</div>
    <div style="font-size:12px; margin-bottom:15px;">MUELLE ${save.takeover.muelle}% · PASEO ${save.takeover.paseo}% · VERDE ${save.takeover.verde}% · CENIZA ${save.takeover.ceniza}% · CUMBRE ${save.takeover.cumbre}%</div>
    <button id="cont">CONTINUE — JOB ${save.jobsDone + 1}/8 · REP ${save.rep} · $${save.cash.toLocaleString()}</button>
    <button id="new">NEW GAME</button>
    <div style="margin:10px 0; font-size:12px;">AUTOSAVE ON · SLOT 1 · ${save.lastSaveClock || '14:32'}</div>
    <h2>YOUR RISE</h2>
    <div style="font-size:13px; margin-bottom:10px;">${tierStr}</div>
    <div style="font-size:12px; margin-bottom:10px;">CARS STOLEN ${save.stats.carsStolen} · TOP SPEED ${save.stats.topSpeed} · MAX HEAT ${save.stats.maxHeat}</div>
    <h2>JOBS</h2>
    ${jobsHtml}
    <div style="margin-top:20px; font-size:11px; color:#888;">CONTROLS: WASD / ARROWS TO DRIVE · SPACE TO HANDBRAKE · ESC FOR MENU</div>
  `;
  document.getElementById('cont').onclick = onContinue;
  document.getElementById('new').onclick = onNewGame;
}

export function openGarageScreen(save, callbacks) {
  createScreenBase();
  let html = `<h1>IRIS'S GARAGE — CHOP & REPAIR</h1>
              <div id="cash-footer" style="font-size:16px; font-weight:bold; color:#4af; margin-bottom:10px;">CASH: $${save.cash.toLocaleString()}</div>
              <h2>YOUR CARS (${save.ownedCars.length}/4)</h2>`;
  save.ownedCars.forEach((car, i) => {
    html += `<div>${car.name} - ${car.condition}%
      <button id="rep-${i}">REPAIR $80</button>
      <button id="roll-${i}">ROLL OUT</button>
      <button id="chop-${i}">CHOP</button></div>`;
  });

  const selectedCar = save.ownedCars[0] || { name: 'Zorro GT' };
  const rosterMatch = VEHICLE_ROSTER.find(v => v.name === selectedCar.name || v.id === selectedCar.id) || VEHICLE_ROSTER[7];
  html += `<h2>SELECTED CAR DETAILS</h2>
           <div style="background:#151922; padding:10px; margin-bottom:10px;">
             NAME: ${rosterMatch.name} · CLASS: ${rosterMatch.class} · TOP SPEED: ${rosterMatch.topSpeed} · GRIP: ${rosterMatch.grip} · ACCEL: ${rosterMatch.accel}
           </div>`;

  html += `<h2>CHOP CATALOG (12)</h2>`;
  VEHICLE_ROSTER.forEach(v => {
    const price = v.chop > 0 ? `$${v.chop}` : 'TOO HOT';
    html += `<div>${v.name} - ${price}</div>`;
  });
  html += `<button id="back" style="margin-top:15px;">BACK TO CITY [ESC]</button>`;
  root.innerHTML = html;
  document.getElementById('back').onclick = closeCurrentScreen;
  save.ownedCars.forEach((_, i) => {
    if (callbacks && callbacks.repair) document.getElementById(`rep-${i}`).onclick = () => callbacks.repair(i);
    if (callbacks && callbacks.rollOut) document.getElementById(`roll-${i}`).onclick = () => callbacks.rollOut(i);
    if (callbacks && callbacks.chop) document.getElementById(`chop-${i}`).onclick = () => callbacks.chop(i);
  });
}
