// CALDERA BAY — game/screens.js
// Interactive Start Screen, Iris's Garage Screen, and Modal Menus.

import * as THREE from './three.module.min.js';
import { VEHICLE_ROSTER, createVehicleMesh } from './vehicles.js';
import { JOBS } from './missions.js';
import { REP_TIERS, tierFor, takeoverCount } from './save.js';

let activeScreenEl = null;
let garageAnimId = null;

function ensureScreenRoot() {
  let root = document.getElementById('screen-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'screen-root';
    document.body.appendChild(root);
  }
  Object.assign(root.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: '100%',
    height: '100%',
    zIndex: '10',
    display: 'none',
    background: '#0b0e14',
    overflowY: 'auto',
    color: '#fff',
    fontFamily: 'sans-serif',
    userSelect: 'none'
  });
  return root;
}

function hideHud(hide) {
  const hud = document.getElementById('hud');
  if (hud) hud.style.display = hide ? 'none' : 'block';
  const notifyEl = document.getElementById('hud-notify');
  if (notifyEl && hide) notifyEl.style.display = 'none';
}

export function closeCurrentScreen() {
  if (garageAnimId) {
    cancelAnimationFrame(garageAnimId);
    garageAnimId = null;
  }
  const root = document.getElementById('screen-root');
  if (root) {
    root.innerHTML = '';
    root.style.display = 'none';
  }
  hideHud(false);
  activeScreenEl = null;
}

// ESC key handler for closing screens
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    closeCurrentScreen();
  }
});

export function openStartScreen(save, callbacks = {}) {
  const root = ensureScreenRoot();
  root.innerHTML = '';
  root.style.display = 'flex';
  hideHud(true);

  const container = document.createElement('div');
  Object.assign(container.style, {
    display: 'flex',
    width: '100%',
    minHeight: '100%',
    background: '#0b0e14',
    padding: '40px',
    boxSizing: 'border-box',
    justifyContent: 'space-between',
    gap: '40px'
  });

  // Left Column
  const leftCol = document.createElement('div');
  Object.assign(leftCol.style, {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '24px',
    maxWidth: '520px'
  });

  const title = document.createElement('h1');
  title.textContent = 'CALDERA BAY';
  Object.assign(title.style, {
    fontSize: '72px',
    fontWeight: '900',
    margin: '0',
    color: '#ffaa44',
    letterSpacing: '6px',
    textShadow: '0 4px 30px rgba(255,170,68,0.4)'
  });
  leftCol.appendChild(title);

  const subline = document.createElement('p');
  subline.textContent = '8 JOBS · 5 DISTRICTS · ONE CITY TO TAKE';
  Object.assign(subline.style, {
    fontSize: '18px',
    color: '#a0aec0',
    margin: '0',
    fontWeight: 'bold',
    letterSpacing: '2px'
  });
  leftCol.appendChild(subline);

  const currentJobNum = Math.min((save.jobsDone || 0) + 1, 8);
  const contBtn = document.createElement('button');
  contBtn.textContent = `CONTINUE — JOB ${currentJobNum}/8 · REP ${save.rep || 0} · $${(save.cash || 0).toLocaleString()}`;
  Object.assign(contBtn.style, {
    background: '#ffaa44',
    color: '#0d1b2a',
    border: 'none',
    padding: '20px 32px',
    fontSize: '20px',
    fontWeight: 'bold',
    borderRadius: '10px',
    cursor: 'pointer',
    boxShadow: '0 4px 25px rgba(255,170,68,0.4)',
    textAlign: 'left',
    transition: 'transform 0.2s, background 0.2s'
  });
  contBtn.onmouseover = () => contBtn.style.transform = 'scale(1.02)';
  contBtn.onmouseout = () => contBtn.style.transform = 'scale(1)';
  contBtn.onclick = () => {
    closeCurrentScreen();
    if (callbacks.onContinue) callbacks.onContinue();
  };
  leftCol.appendChild(contBtn);

  const newGameBtn = document.createElement('button');
  newGameBtn.textContent = 'NEW GAME';
  Object.assign(newGameBtn.style, {
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.2)',
    padding: '16px 32px',
    fontSize: '16px',
    fontWeight: 'bold',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.2s'
  });
  newGameBtn.onmouseover = () => newGameBtn.style.background = 'rgba(255,255,255,0.2)';
  newGameBtn.onmouseout = () => newGameBtn.style.background = 'rgba(255,255,255,0.1)';
  newGameBtn.onclick = () => {
    closeCurrentScreen();
    if (callbacks.onNewGame) callbacks.onNewGame();
  };
  leftCol.appendChild(newGameBtn);

  const autosaveLine = document.createElement('div');
  autosaveLine.textContent = `AUTOSAVE ON · SLOT 1 · ${save.lastSaveClock || '14:32'}`;
  Object.assign(autosaveLine.style, {
    fontSize: '14px',
    color: '#718096',
    letterSpacing: '1px'
  });
  leftCol.appendChild(autosaveLine);

  container.appendChild(leftCol);

  // Right Column
  const rightCol = document.createElement('div');
  Object.assign(rightCol.style, {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '20px',
    maxWidth: '560px',
    background: 'rgba(15, 23, 42, 0.6)',
    padding: '30px',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.1)'
  });

  const riseHeader = document.createElement('div');
  riseHeader.textContent = 'YOUR RISE — REP TIERS';
  Object.assign(riseHeader.style, { fontSize: '16px', fontWeight: 'bold', color: '#ffaa44', letterSpacing: '1px' });
  rightCol.appendChild(riseHeader);

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "60");
  svg.setAttribute("viewBox", "0 0 500 60");

  const polyline = document.createElementNS(svgNS, "polyline");
  polyline.setAttribute("points", "0,50 100,40 200,30 300,20 400,12 500,5");
  polyline.setAttribute("fill", "none");
  polyline.setAttribute("stroke", "#ffaa44");
  polyline.setAttribute("stroke-width", "3");
  svg.appendChild(polyline);

  const repVal = save.rep || 0;
  const maxRep = 1400;
  const markerX = Math.min(Math.max((repVal / maxRep) * 500, 10), 490);
  const markerY = 50 - (repVal / maxRep) * 45;

  const dot = document.createElementNS(svgNS, "circle");
  dot.setAttribute("cx", markerX);
  dot.setAttribute("cy", markerY);
  dot.setAttribute("r", "6");
  dot.setAttribute("fill", "#fff");
  dot.setAttribute("stroke", "#ffaa44");
  dot.setAttribute("stroke-width", "3");
  svg.appendChild(dot);
  rightCol.appendChild(svg);

  const jobsHeader = document.createElement('div');
  jobsHeader.textContent = 'JOBS';
  Object.assign(jobsHeader.style, { fontSize: '14px', fontWeight: 'bold', color: '#a0aec0' });
  rightCol.appendChild(jobsHeader);

  const jobsList = document.createElement('div');
  Object.assign(jobsList.style, { display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' });
  JOBS.forEach((job, idx) => {
    const row = document.createElement('div');
    const isDone = idx < (save.jobsDone || 0);
    const isNext = idx === (save.jobsDone || 0);
    const statusText = isDone ? '✓ DONE' : (isNext ? '▶ NEXT' : `🔒 REP ${job.repGate || 0}`);
    row.textContent = `${idx + 1}. ${job.title} (${job.district.toUpperCase()}) — ${statusText}`;
    Object.assign(row.style, {
      fontSize: '13px',
      padding: '6px 10px',
      borderRadius: '6px',
      background: isNext ? 'rgba(255,170,68,0.15)' : 'rgba(255,255,255,0.05)',
      color: isDone ? '#48bb78' : (isNext ? '#ffaa44' : '#718096')
    });
    jobsList.appendChild(row);
  });
  rightCol.appendChild(jobsList);

  const takeoverHead = document.createElement('div');
  const takeoverCnt = takeoverCount(save);
  takeoverHead.textContent = `CITY TAKEOVER ${takeoverCnt}/5`;
  Object.assign(takeoverHead.style, { fontSize: '16px', fontWeight: 'bold', color: '#ffaa44', letterSpacing: '1px' });
  rightCol.appendChild(takeoverHead);

  const districtsContainer = document.createElement('div');
  Object.assign(districtsContainer.style, { display: 'flex', gap: '8px', flexWrap: 'wrap' });
  const districts = ['muelle', 'paseo', 'verde', 'ceniza', 'cumbre'];
  districts.forEach(d => {
    const pct = (save.takeover && save.takeover[d]) || 0;
    const chip = document.createElement('div');
    chip.innerHTML = `<div style="font-weight:bold; font-size:12px; text-transform:uppercase;">${d}</div><div style="font-size:11px; color:#ffaa44;">${pct}%</div>`;
    Object.assign(chip.style, {
      flex: '1',
      background: 'rgba(255,255,255,0.05)',
      padding: '8px',
      borderRadius: '6px',
      textAlign: 'center',
      border: pct >= 50 ? '1px solid rgba(255,170,68,0.5)' : '1px solid rgba(255,255,255,0.1)'
    });
    districtsContainer.appendChild(chip);
  });
  rightCol.appendChild(districtsContainer);

  const stats = save.stats || { carsStolen: 0, topSpeed: 0, maxHeat: 0 };
  const statsRow = document.createElement('div');
  statsRow.textContent = `CARS STOLEN ${stats.carsStolen} · TOP SPEED ${stats.topSpeed} · MAX HEAT ${stats.maxHeat}`;
  Object.assign(statsRow.style, {
    fontSize: '13px',
    color: '#a0aec0',
    textAlign: 'center',
    letterSpacing: '1px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    paddingTop: '10px'
  });
  rightCol.appendChild(statsRow);

  container.appendChild(rightCol);
  root.appendChild(container);
}

export function openGarageScreen(save, callbacks = {}) {
  const root = ensureScreenRoot();
  root.innerHTML = '';
  root.style.display = 'flex';
  hideHud(true);

  let selectedCarIdx = 0;
  let selectedCatalogKey = 'zorro';

  const container = document.createElement('div');
  Object.assign(container.style, {
    display: 'flex',
    flexDirection: 'column',
    width: '100vw',
    height: '100vh',
    background: '#0b0e14',
    padding: '24px',
    boxSizing: 'border-box',
    justifyContent: 'space-between'
  });

  const header = document.createElement('div');
  header.innerHTML = `IRIS'S GARAGE — CHOP & REPAIR`;
  Object.assign(header.style, {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#ffaa44',
    letterSpacing: '2px'
  });
  container.appendChild(header);

  const body = document.createElement('div');
  Object.assign(body.style, {
    display: 'flex',
    flex: '1',
    gap: '24px',
    margin: '20px 0',
    minHeight: '0'
  });

  const leftCol = document.createElement('div');
  Object.assign(leftCol.style, {
    width: '320px',
    background: 'rgba(15, 23, 42, 0.8)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    overflowY: 'auto'
  });

  const ownedCars = save.ownedCars || [];
  const carsHeader = document.createElement('div');
  carsHeader.textContent = `YOUR CARS (${ownedCars.length}/4)`;
  Object.assign(carsHeader.style, { fontSize: '16px', fontWeight: 'bold', color: '#a0aec0' });
  leftCol.appendChild(carsHeader);

  if (ownedCars.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.textContent = 'No stored cars. Steal vehicles and store them at Safehouse or Chop Shop.';
    Object.assign(emptyMsg.style, { color: '#718096', fontSize: '14px', fontStyle: 'italic', marginTop: '20px' });
    leftCol.appendChild(emptyMsg);
  } else {
    ownedCars.forEach((car, idx) => {
      const spec = VEHICLE_ROSTER[car.spec] || VEHICLE_ROSTER.colibri;
      const card = document.createElement('div');
      Object.assign(card.style, {
        background: idx === selectedCarIdx ? 'rgba(255,170,68,0.15)' : 'rgba(255,255,255,0.05)',
        border: idx === selectedCarIdx ? '1px solid #ffaa44' : '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        padding: '12px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      });
      card.onclick = () => {
        selectedCarIdx = idx;
        openGarageScreen(save, callbacks);
      };

      const topRow = document.createElement('div');
      topRow.innerHTML = `<span style="font-weight:bold; color:#fff;">${spec.name}</span> <span style="float:right; color:#48bb78;">${car.durability}% HP</span>`;
      card.appendChild(topRow);

      const btnRow = document.createElement('div');
      Object.assign(btnRow.style, { display: 'flex', gap: '6px', marginTop: '4px' });

      const repairBtn = document.createElement('button');
      repairBtn.textContent = 'REPAIR $80';
      Object.assign(repairBtn.style, { flex: '1', background: '#3182ce', color: '#fff', border: 'none', padding: '6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' });
      repairBtn.onclick = (e) => {
        e.stopPropagation();
        if (callbacks.onCarAction) callbacks.onCarAction('repair', idx);
      };
      btnRow.appendChild(repairBtn);

      const rollBtn = document.createElement('button');
      rollBtn.textContent = 'ROLL OUT';
      Object.assign(rollBtn.style, { flex: '1', background: '#d69e2e', color: '#fff', border: 'none', padding: '6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' });
      rollBtn.onclick = (e) => {
        e.stopPropagation();
        if (callbacks.onCarAction) callbacks.onCarAction('roll', idx);
      };
      btnRow.appendChild(rollBtn);

      const chopBtn = document.createElement('button');
      chopBtn.textContent = 'CHOP';
      Object.assign(chopBtn.style, { flex: '1', background: '#e53e3e', color: '#fff', border: 'none', padding: '6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' });
      chopBtn.onclick = (e) => {
        e.stopPropagation();
        if (callbacks.onCarAction) callbacks.onCarAction('chop', idx);
      };
      btnRow.appendChild(chopBtn);

      card.appendChild(btnRow);
      leftCol.appendChild(card);
    });
  }
  body.appendChild(leftCol);

  const centreCol = document.createElement('div');
  Object.assign(centreCol.style, {
    flex: '1',
    background: 'rgba(15, 23, 42, 0.8)',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    border: '1px solid rgba(255,255,255,0.1)',
    position: 'relative',
    overflow: 'hidden'
  });

  const selectedSpecKey = ownedCars[selectedCarIdx] ? ownedCars[selectedCarIdx].spec : selectedCatalogKey;
  const currentSpec = VEHICLE_ROSTER[selectedSpecKey] || VEHICLE_ROSTER.zorro;

  const carNameHeader = document.createElement('div');
  carNameHeader.textContent = currentSpec.name.toUpperCase();
  Object.assign(carNameHeader.style, { fontSize: '32px', fontWeight: '900', color: '#ffaa44', letterSpacing: '3px' });
  centreCol.appendChild(carNameHeader);

  const canvasContainer = document.createElement('div');
  Object.assign(canvasContainer.style, { width: '100%', flex: '1', position: 'relative', minHeight: '220px' });
  const previewCanvas = document.createElement('canvas');
  Object.assign(previewCanvas.style, { width: '100%', height: '100%', display: 'block' });
  canvasContainer.appendChild(previewCanvas);
  centreCol.appendChild(canvasContainer);

  const statsBox = document.createElement('div');
  statsBox.innerHTML = `TOP SPEED: <b>${currentSpec.topSpeed} KM/H</b> · GRIP: <b>${currentSpec.grip}</b> · CLASS: <b>${currentSpec.class.toUpperCase()}</b>`;
  Object.assign(statsBox.style, { fontSize: '14px', color: '#a0aec0', letterSpacing: '1px', padding: '10px' });
  centreCol.appendChild(statsBox);

  body.appendChild(centreCol);

  const rightCol = document.createElement('div');
  Object.assign(rightCol.style, {
    width: '320px',
    background: 'rgba(15, 23, 42, 0.8)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    overflowY: 'auto'
  });

  const catalogHeader = document.createElement('div');
  catalogHeader.textContent = `CHOP CATALOG (${Object.keys(VEHICLE_ROSTER).length})`;
  Object.assign(catalogHeader.style, { fontSize: '16px', fontWeight: 'bold', color: '#a0aec0' });
  rightCol.appendChild(catalogHeader);

  Object.entries(VEHICLE_ROSTER).forEach(([key, spec]) => {
    const item = document.createElement('div');
    const priceText = spec.chop ? `$${spec.chop}` : 'TOO HOT';
    item.innerHTML = `<span style="font-weight:bold; color:#fff;">${spec.name}</span> <span style="float:right; color:${spec.chop ? '#48bb78' : '#e53e3e'};">${priceText}</span>`;
    Object.assign(item.style, {
      background: selectedCatalogKey === key ? 'rgba(255,170,68,0.15)' : 'rgba(255,255,255,0.03)',
      border: selectedCatalogKey === key ? '1px solid #ffaa44' : '1px solid rgba(255,255,255,0.08)',
      padding: '10px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '13px'
    });
    item.onclick = () => {
      selectedCatalogKey = key;
      openGarageScreen(save, callbacks);
    };
    rightCol.appendChild(item);
  });
  body.appendChild(rightCol);

  container.appendChild(body);

  const footer = document.createElement('div');
  Object.assign(footer.style, {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255,255,255,0.1)'
  });

  const cashDisplay = document.createElement('div');
  cashDisplay.textContent = `CASH: $${(save.cash || 0).toLocaleString()} · REP: ${save.rep || 0} (${tierFor(save.rep)})`;
  Object.assign(cashDisplay.style, { fontSize: '24px', fontWeight: 'bold', color: '#48bb78' });
  footer.appendChild(cashDisplay);

  const backBtn = document.createElement('button');
  backBtn.textContent = 'BACK TO CITY [ESC]';
  Object.assign(backBtn.style, {
    background: '#e53e3e',
    color: '#fff',
    border: 'none',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 'bold',
    borderRadius: '6px',
    cursor: 'pointer'
  });
  backBtn.onclick = () => {
    closeCurrentScreen();
    if (callbacks.onBack) callbacks.onBack();
  };
  footer.appendChild(backBtn);

  container.appendChild(footer);
  root.appendChild(container);

  const width = previewCanvas.clientWidth || 300;
  const height = previewCanvas.clientHeight || 200;
  const scene3d = new THREE.Scene();
  const camera3d = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera3d.position.set(0, 2.5, 5.5);
  camera3d.lookAt(0, 0.5, 0);

  const renderer3d = new THREE.WebGLRenderer({ canvas: previewCanvas, antialias: true, alpha: true });
  renderer3d.setSize(width, height);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene3d.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffaa44, 2.5);
  dirLight.position.set(5, 8, 5);
  scene3d.add(dirLight);

  const carGroup = createVehicleMesh(selectedSpecKey, 0x3366cc, 0xffaa44);
  scene3d.add(carGroup);

  let angle = 0;
  function animateTurntable() {
    garageAnimId = requestAnimationFrame(animateTurntable);
    angle += 0.01;
    carGroup.rotation.y = angle;
    renderer3d.render(scene3d, camera3d);
  }
  animateTurntable();
}

export function openMenu(options = {}) {
  const { title = 'MENU', build = () => [] } = options;
  const root = ensureScreenRoot();
  root.innerHTML = '';
  root.style.display = 'flex';
  hideHud(true);

  const container = document.createElement('div');
  Object.assign(container.style, {
    display: 'flex',
    flexDirection: 'column',
    width: '460px',
    margin: 'auto',
    background: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '16px',
    padding: '30px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
    gap: '20px'
  });

  const titleEl = document.createElement('h2');
  titleEl.textContent = title;
  Object.assign(titleEl.style, { fontSize: '24px', fontWeight: 'bold', color: '#ffaa44', margin: '0 0 10px 0', textAlign: 'center', letterSpacing: '2px' });
  container.appendChild(titleEl);

  const rowsContainer = document.createElement('div');
  Object.assign(rowsContainer.style, { display: 'flex', flexDirection: 'column', gap: '10px' });
  container.appendChild(rowsContainer);

  function renderRows() {
    rowsContainer.innerHTML = '';
    const rows = build() || [];
    rows.forEach((row, idx) => {
      const btn = document.createElement('div');
      const keyNum = idx + 1;
      btn.innerHTML = `<span style="color:#ffaa44; font-weight:bold; margin-right:10px;">[${keyNum}]</span> <span style="font-weight:bold;">${row.label}</span> ${row.detail ? `<span style="color:#a0aec0; float:right;">${row.detail}</span>` : ''}`;
      Object.assign(btn.style, {
        background: row.disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)',
        color: row.disabled ? '#718096' : '#fff',
        padding: '12px 16px',
        borderRadius: '8px',
        cursor: row.disabled ? 'not-allowed' : 'pointer',
        border: '1px solid rgba(255,255,255,0.1)',
        transition: 'background 0.2s'
      });

      if (!row.disabled) {
        btn.onmouseover = () => btn.style.background = 'rgba(255,170,68,0.2)';
        btn.onmouseout = () => btn.style.background = 'rgba(255,255,255,0.06)';
        btn.onclick = () => {
          const res = row.action ? row.action() : null;
          if (res === 'close') {
            closeCurrentScreen();
          } else {
            renderRows();
          }
        };
      }
      rowsContainer.appendChild(btn);
    });
  }

  renderRows();
  root.appendChild(container);
}
