// CALDERA BAY — game/screens.js
// START screen, GARAGE screen, and generic menu helper per design specs.

import { REP_TIERS, tierFor, takeoverCount } from './save.js';
import { VEHICLE_ROSTER } from './vehicles.js';
import { JOBS } from './missions.js';

let activeOverlay = null;

export function openStartScreen(save, callbacks) {
  closeCurrentScreen();

  const overlay = document.createElement('div');
  overlay.id = 'caldera-start-screen';
  overlay.style.cssText = 'position:fixed; inset:0; background:radial-gradient(circle at center, #1b263b 0%, #0d1b2a 100%); z-index:200; display:flex; padding:40px; box-sizing:border-box; color:#fff; font-family:sans-serif; overflow-y:auto;';

  const jobsDone = save.jobsDone || 6;
  const missionIdx = save.missionIndex || 6;
  const rep = save.rep || 520;
  const cash = save.cash || 4210;
  const tierName = tierFor(rep);
  const tCount = takeoverCount(save);

  overlay.innerHTML = `
    <div style="flex:1; display:flex; flex-direction:column; justify-content:center; padding-right:40px; border-right:1px solid rgba(255,255,255,0.15);">
      <h1 style="font-size:72px; font-weight:900; letter-spacing:6px; margin:0 0 10px 0; color:#ffaa44; text-shadow:0 4px 30px rgba(255,170,68,0.4);">CALDERA BAY</h1>
      <p style="font-size:18px; color:#a0aec0; margin:0 0 30px 0; letter-spacing:1px; font-weight:bold;">8 JOBS · 5 DISTRICTS · ONE CITY TO TAKE</p>

      <div style="display:flex; flex-direction:column; gap:16px; max-width:420px;">
        <button id="start-continue-btn" style="background:#ffaa44; color:#0d1b2a; border:none; padding:16px 24px; font-size:18px; font-weight:bold; border-radius:8px; cursor:pointer; text-align:left; box-shadow:0 4px 20px rgba(255,170,68,0.3); transition:transform 0.2s;">
          <div>CONTINUE</div>
          <div style="font-size:13px; font-weight:normal; opacity:0.85; margin-top:2px;">JOB ${missionIdx}/8 · REP ${rep} (${tierName}) · $${cash.toLocaleString()}</div>
        </button>
        <button id="start-new-btn" style="background:rgba(255,255,255,0.1); color:#fff; border:1px solid rgba(255,255,255,0.3); padding:16px 24px; font-size:18px; font-weight:bold; border-radius:8px; cursor:pointer; text-align:left; transition:background 0.2s;">
          <div>NEW GAME</div>
          <div style="font-size:13px; font-weight:normal; color:#a0aec0; margin-top:2px;">Reset progress and start fresh at Muelle Docks</div>
        </button>
      </div>

      <div style="margin-top:40px; font-size:13px; color:#718096; font-family:monospace;">
        AUTOSAVE ON · SLOT 1 · ${save.lastSaveClock || '14:32'}
      </div>
    </div>

    <div style="flex:1; display:flex; flex-direction:column; justify-content:center; padding-left:40px;">
      <h2 style="font-size:24px; font-weight:bold; color:#ffaa44; margin:0 0 16px 0; letter-spacing:1px;">YOUR RISE</h2>

      <!-- REP Curve SVG -->
      <div style="background:rgba(10,15,25,0.7); border:1px solid rgba(255,255,255,0.15); border-radius:8px; padding:16px; margin-bottom:20px;">
        <div style="font-size:13px; color:#a0aec0; margin-bottom:8px;">REP PROGRESS (${rep} / 1400)</div>
        <svg viewBox="0 0 400 60" style="width:100%; height:60px;">
          <polyline points="0,50 80,42 160,32 240,22 320,12 400,4" fill="none" stroke="#2b6cb0" stroke-width="4" stroke-linecap="round"/>
          <circle cx="${Math.min(400, (rep / 1400) * 400)}" cy="${50 - (rep / 1400) * 46}" r="6" fill="#ffaa44" stroke="#fff" stroke-width="2"/>
        </svg>
        <div style="display:flex; justify-content:space-between; font-size:10px; color:#718096; margin-top:4px;">
          <span>NOBODY</span><span>RUNNER</span><span>WHEELMAN</span><span>FIXER</span><span>BROKER</span><span>LEYENDA</span>
        </div>
      </div>

      <!-- 8 Named Jobs -->
      <div style="background:rgba(10,15,25,0.7); border:1px solid rgba(255,255,255,0.15); border-radius:8px; padding:12px 16px; margin-bottom:16px; max-height:160px; overflow-y:auto;">
        <div style="font-size:13px; font-weight:bold; color:#ffaa44; margin-bottom:8px;">JOB ARC (8/8)</div>
        <div style="display:flex; flex-direction:column; gap:4px; font-size:12px;">
          ${JOBS.map((j, i) => {
            const status = i < jobsDone ? '✓ DONE' : (i === missionIdx ? '▶ ACTIVE' : '· LOCKED');
            const color = i < jobsDone ? '#48bb78' : (i === missionIdx ? '#ffaa44' : '#718096');
            return `<div style="display:flex; justify-content:space-between; color:${color};"><span>${i+1}. ${j.title} (${j.district})</span><span style="font-weight:bold;">${status}</span></div>`;
          }).join('')}
        </div>
      </div>

      <!-- City Takeover Map -->
      <div style="background:rgba(10,15,25,0.7); border:1px solid rgba(255,255,255,0.15); border-radius:8px; padding:12px 16px;">
        <div style="font-size:13px; font-weight:bold; color:#ffaa44; margin-bottom:8px;">CITY TAKEOVER (${tCount}/5)</div>
        <div style="display:flex; gap:8px;">
          ${['muelle', 'paseo', 'verde', 'ceniza', 'cumbre'].map(d => {
            const pct = (save.takeover && save.takeover[d]) || 0;
            return `<div style="flex:1; background:rgba(255,255,255,0.05); padding:6px; border-radius:4px; text-align:center;">
              <div style="font-size:11px; text-transform:uppercase; color:#a0aec0;">${d}</div>
              <div style="font-size:13px; font-weight:bold; color:${pct >= 50 ? '#48bb78' : '#fff'};">${pct}%</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  activeOverlay = overlay;

  document.getElementById('start-continue-btn').addEventListener('click', () => {
    closeCurrentScreen();
    if (callbacks && callbacks.onContinue) callbacks.onContinue();
  });

  document.getElementById('start-new-btn').addEventListener('click', () => {
    closeCurrentScreen();
    if (callbacks && callbacks.onNewGame) callbacks.onNewGame();
  });
}

export function openGarageScreen(save, callbacks) {
  closeCurrentScreen();

  const overlay = document.createElement('div');
  overlay.id = 'caldera-garage-screen';
  overlay.style.cssText = 'position:fixed; inset:0; background:rgba(13,27,42,0.96); z-index:200; display:flex; flex-direction:column; padding:30px; box-sizing:border-box; color:#fff; font-family:sans-serif;';

  const ownedCars = save.ownedCars || [];
  const cash = save.cash || 4210;
  const rep = save.rep || 520;
  const rosterKeys = Object.keys(VEHICLE_ROSTER);

  overlay.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; border-bottom:1px solid rgba(255,255,255,0.15); padding-bottom:16px;">
      <div>
        <h2 style="font-size:28px; font-weight:900; color:#ffaa44; margin:0 0 4px 0; letter-spacing:1px;">IRIS'S GARAGE — CHOP & REPAIR</h2>
        <div style="font-size:14px; color:#a0aec0;">Manage stored vehicles, roll out to city, or trade up at the chop catalog.</div>
      </div>
      <div>
        <button id="garage-back-btn" style="background:rgba(255,255,255,0.1); color:#fff; border:1px solid rgba(255,255,255,0.3); padding:10px 20px; font-size:14px; font-weight:bold; border-radius:6px; cursor:pointer;">BACK TO CITY [ESC]</button>
      </div>
    </div>

    <div style="display:flex; flex:1; gap:24px; overflow:hidden;">
      <!-- Left: Stored Cars (n/4) -->
      <div style="width:340px; background:rgba(10,15,25,0.75); border:1px solid rgba(255,255,255,0.15); border-radius:8px; padding:16px; display:flex; flex-direction:column;">
        <h3 style="font-size:16px; font-weight:bold; color:#ffaa44; margin:0 0 12px 0;">YOUR CARS (${ownedCars.length}/4)</h3>
        <div style="display:flex; flex-direction:column; gap:10px; overflow-y:auto; flex:1;">
          ${ownedCars.length === 0 ? '<div style="color:#718096; font-style:italic;">No cars stored in garage. Park at garage and press E.</div>' : ''}
          ${ownedCars.map((car, idx) => {
            const spec = VEHICLE_ROSTER[car.spec] || { name: car.spec };
            return `<div style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:12px;">
              <div style="font-weight:bold; font-size:15px; margin-bottom:4px; color:#fff;">${spec.name}</div>
              <div style="font-size:12px; color:#a0aec0; margin-bottom:8px;">Condition: ${car.durability}%</div>
              <div style="display:flex; gap:6px;">
                <button class="garage-action-btn" data-action="roll" data-idx="${idx}" style="flex:1; background:#ffaa44; color:#0d1b2a; border:none; padding:6px; font-weight:bold; border-radius:4px; cursor:pointer; font-size:12px;">ROLL OUT</button>
                <button class="garage-action-btn" data-action="repair" data-idx="${idx}" style="flex:1; background:#4299e1; color:#fff; border:none; padding:6px; font-weight:bold; border-radius:4px; cursor:pointer; font-size:12px;">REPAIR $80</button>
                <button class="garage-action-btn" data-action="chop" data-idx="${idx}" style="flex:1; background:#e53e3e; color:#fff; border:none; padding:6px; font-weight:bold; border-radius:4px; cursor:pointer; font-size:12px;">CHOP</button>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Centre: Turntable Staged Car -->
      <div style="flex:1; background:rgba(10,15,25,0.75); border:1px solid rgba(255,255,255,0.15); border-radius:8px; padding:20px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;">
        <div style="font-size:32px; font-weight:900; color:#ffaa44; margin-bottom:8px;">TURNTABLE STAGE</div>
        <div style="font-size:16px; color:#a0aec0; margin-bottom:20px;">Live 3D Inspection & Tuning</div>
        <div style="width:200px; height:200px; border-radius:50%; border:2px dashed rgba(255,170,68,0.4); display:flex; align-items:center; justify-content:center; margin-bottom:20px; background:radial-gradient(circle, rgba(255,170,68,0.1) 0%, transparent 70%);">
          <span style="font-size:48px;">🚗</span>
        </div>
        <div style="font-size:14px; color:#cbd5e0;">Selected car active on turntable. Inspect durability and specs before deployment.</div>
      </div>

      <!-- Right: Chop Catalog (12) -->
      <div style="width:360px; background:rgba(10,15,25,0.75); border:1px solid rgba(255,255,255,0.15); border-radius:8px; padding:16px; display:flex; flex-direction:column;">
        <h3 style="font-size:16px; font-weight:bold; color:#ffaa44; margin:0 0 12px 0;">CHOP CATALOG (${rosterKeys.length})</h3>
        <div style="display:flex; flex-direction:column; gap:8px; overflow-y:auto; flex:1;">
          ${rosterKeys.map(key => {
            const spec = VEHICLE_ROSTER[key];
            const price = spec.chop ? `$${spec.chop * 4}` : 'TOO HOT';
            return `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:8px 12px; border-radius:6px; font-size:13px;">
              <div>
                <div style="font-weight:bold; color:#fff;">${spec.name}</div>
                <div style="font-size:11px; color:#a0aec0;">Top Speed: ${spec.topSpeed || 140} km/h</div>
              </div>
              <div style="font-weight:bold; color:${spec.chop ? '#48bb78' : '#e53e3e'};">${price}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; border-top:1px solid rgba(255,255,255,0.15); padding-top:16px;">
      <div style="font-size:24px; font-weight:bold; font-family:monospace; color:#4fd1c5;">CASH: $${cash.toLocaleString()}</div>
      <div id="garage-msg" style="font-size:14px; color:#ffcc66;">Ready for deployment</div>
      <div style="font-size:13px; color:#a0aec0;">AUTOSAVE 14:32 · REP ${rep}</div>
    </div>
  `;

  document.body.appendChild(overlay);
  activeOverlay = overlay;

  const backHandler = () => {
    closeCurrentScreen();
    if (callbacks && callbacks.onBack) callbacks.onBack();
  };

  document.getElementById('garage-back-btn').addEventListener('click', backHandler);

  overlay.querySelectorAll('.garage-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = e.target.getAttribute('data-action');
      const idx = parseInt(e.target.getAttribute('data-idx'), 10);
      if (callbacks && callbacks.onCarAction) {
        callbacks.onCarAction(action, idx);
      }
    });
  });

  const escListener = (e) => {
    if (e.key === 'Escape') {
      window.removeEventListener('keydown', escListener);
      backHandler();
    }
  };
  window.addEventListener('keydown', escListener);
}

export function openMenu({ title, rows, onSelect, onClose }) {
  closeCurrentScreen();

  const overlay = document.createElement('div');
  overlay.id = 'caldera-generic-menu';
  overlay.style.cssText = 'position:fixed; inset:0; background:rgba(10,15,25,0.85); backdrop-filter:blur(6px); z-index:200; display:flex; justify-content:center; align-items:center; color:#fff; font-family:sans-serif;';

  function renderRows() {
    return rows.map((r, i) => {
      const disabled = r.disabled;
      const opacity = disabled ? '0.4' : '1.0';
      const bg = disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)';
      return `<div class="menu-row" data-index="${i}" style="background:${bg}; border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:12px 20px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; cursor:${disabled ? 'not-allowed' : 'pointer'}; opacity:${opacity}; min-width:360px;">
        <div>
          <div style="font-weight:bold; font-size:16px; color:#ffaa44;">[${i+1}] ${r.label}</div>
          ${r.detail ? `<div style="font-size:12px; color:#a0aec0; margin-top:2px;">${r.detail}</div>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  overlay.innerHTML = `
    <div style="background:rgba(15,22,34,0.95); border:1px solid rgba(255,170,68,0.4); border-radius:10px; padding:24px; box-shadow:0 8px 30px rgba(0,0,0,0.6); max-width:480px; width:100%;">
      <div style="font-size:22px; font-weight:900; color:#ffaa44; margin-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.15); padding-bottom:8px; text-transform:uppercase; letter-spacing:1px;">${title}</div>
      <div id="menu-rows-container" style="display:flex; flex-direction:column; margin-bottom:16px;">
        ${renderRows()}
      </div>
      <div style="text-align:right; font-size:12px; color:#718096;">Press [1-${rows.length}] to select, [ESC] to close</div>
    </div>
  `;

  document.body.appendChild(overlay);
  activeOverlay = overlay;

  const closeMenu = () => {
    closeCurrentScreen();
    if (onClose) onClose();
  };

  const keyHandler = (e) => {
    if (e.key === 'Escape') {
      cleanup();
      closeMenu();
      return;
    }
    const num = parseInt(e.key, 10);
    if (!isNaN(num) && num >= 1 && num <= rows.length) {
      const idx = num - 1;
      const row = rows[idx];
      if (row && !row.disabled) {
        const res = row.action ? row.action() : null;
        if (onSelect) onSelect(idx, row);
        if (res === 'close') {
          cleanup();
          closeMenu();
        }
      }
    }
  };

  function cleanup() {
    window.removeEventListener('keydown', keyHandler);
  }

  window.addEventListener('keydown', keyHandler);

  overlay.querySelectorAll('.menu-row').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.getAttribute('data-index'), 10);
      const row = rows[idx];
      if (row && !row.disabled) {
        const res = row.action ? row.action() : null;
        if (onSelect) onSelect(idx, row);
        if (res === 'close') {
          cleanup();
          closeMenu();
        }
      }
    });
  });
}

export function closeCurrentScreen() {
  if (activeOverlay && activeOverlay.parentNode) {
    activeOverlay.parentNode.removeChild(activeOverlay);
    activeOverlay = null;
  }
}
