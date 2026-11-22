// CALDERA BAY — game/hud.js
// Complete HUD implementation per DESIGN §6 grammar and screen layouts.

import { districtAt } from './city.js';
import { tierFor, takeoverCount } from './save.js';

export function createHud(hooks) {
  let root = document.getElementById('hud-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'hud-root';
    root.style.cssText = 'position:fixed; inset:0; pointer-events:none; z-index:15; font-family:sans-serif; color:#fff; overflow:hidden;';
    const hudContainer = document.getElementById('hud');
    if (hudContainer) {
      hudContainer.appendChild(root);
    } else {
      document.body.appendChild(root);
    }
  }

  // Pre-render offscreen minimap canvas once
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = 1200;
  offscreenCanvas.height = 1200;
  const offCtx = offscreenCanvas.getContext('2d');
  preRenderCityMinimap(offCtx);

  // Build HUD DOM structure
  root.innerHTML = `
    <!-- Mission Panel (16, 16, width 300) -->
    <div id="hud-panel-mission" style="position:absolute; left:16px; top:16px; width:300px; background:rgba(12,17,26,0.85); border:1px solid rgba(255,255,255,0.15); border-radius:8px; padding:12px; backdrop-filter:blur(6px);">
      <div id="hud-job-line" style="font-size:13px; color:#ffaa44; font-weight:bold; margin-bottom:4px; letter-spacing:0.5px;">JOB 7/8 · MIDNIGHT COURIER</div>
      <div id="hud-objective" style="font-size:18px; font-weight:bold; margin-bottom:6px; color:#ffffff;">Deliver vehicle to dropzone</div>
      <div id="hud-stage-line" style="font-size:13px; color:#a0aec0; margin-bottom:2px;">Stage 3/3</div>
      <div id="hud-next-line" style="font-size:12px; color:#718096; margin-bottom:6px;">NEXT: Complete</div>
      <div id="hud-timer" style="font-size:20px; font-weight:bold; font-family:monospace; color:#ffcc66; display:none; margin-bottom:4px;">00:45</div>
      <div id="hud-jobs-merged" style="font-size:12px; color:#cbd5e0; border-top:1px solid rgba(255,255,255,0.1); padding-top:6px; margin-top:4px;">JOBS 6/8 ✓✓✓✓✓✓··</div>
      <div id="hud-side-line" style="font-size:12px; color:#4fd1c5; margin-top:2px; display:none;">Contract: Zorro ($150)</div>
      <div id="hud-district-name" style="font-size:12px; color:#4fd1c5; margin-top:6px; border-top:1px solid rgba(255,255,255,0.1); padding-top:4px; font-weight:bold;">DISTRICT: MUELLE</div>
      <div id="hud-autosave" style="font-size:11px; color:#a0aec0; margin-top:2px;">AUTOSAVE 14:32</div>
    </div>

    <!-- Dispatch Panel (16, 196, width 280) -->
    <div id="hud-panel-dispatch" style="position:absolute; left:16px; top:196px; width:280px; background:rgba(12,17,26,0.85); border:1px solid rgba(255,75,75,0.4); border-radius:8px; padding:10px; backdrop-filter:blur(6px); display:none;">
      <div id="hud-dispatch-header" style="font-size:13px; font-weight:bold; color:#ff4d4d; margin-bottom:6px; letter-spacing:0.5px;">DISPATCH · HEAT 3 · 4 UNITS</div>
      <div id="hud-dispatch-rows" style="display:flex; flex-direction:column; gap:4px; font-size:12px; font-family:monospace; color:#e2e8f0;">
        <!-- rows inserted dynamically -->
      </div>
    </div>

    <!-- Top-Right Heat, Cash, REP -->
    <div id="hud-panel-heat-cash" style="position:absolute; right:16px; top:16px; display:flex; flex-direction:column; align-items:flex-end; gap:6px; background:rgba(12,17,26,0.85); border:1px solid rgba(255,255,255,0.15); border-radius:8px; padding:10px 14px; backdrop-filter:blur(6px);">
      <div id="hud-heat" style="font-size:18px; letter-spacing:2px; color:#ffaa44;">★★★★☆</div>
      <div id="hud-cash" style="font-size:22px; font-weight:bold; font-family:monospace; color:#4fd1c5;">$4,210</div>
      <div id="hud-rep" style="font-size:13px; color:#a0aec0; font-weight:bold;">REP 520 (FIXER)</div>
    </div>

    <!-- Takeover Strip Top-Center (width 320) -->
    <div id="hud-panel-takeover" style="position:absolute; left:50%; transform:translateX(-50%); top:16px; width:320px; background:rgba(12,17,26,0.85); border:1px solid rgba(255,255,255,0.15); border-radius:8px; padding:8px 12px; backdrop-filter:blur(6px); text-align:center;">
      <div id="hud-takeover-title" style="font-size:12px; font-weight:bold; color:#ffaa44; margin-bottom:4px; letter-spacing:1px;">TAKEOVER 3/5</div>
      <div id="hud-takeover-segments" style="display:flex; gap:4px; height:6px;">
        <!-- 5 segments -->
      </div>
    </div>

    <!-- Minimap Bottom-Left (180px canvas) -->
    <div id="hud-panel-minimap" style="position:absolute; left:16px; bottom:16px; width:180px; height:180px; background:rgba(10,15,22,0.9); border:2px solid rgba(255,255,255,0.2); border-radius:50%; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.6);">
      <canvas id="hud-minimap-canvas" width="180" height="180" style="display:block; width:100%; height:100%;"></canvas>
    </div>

    <!-- Health / Armour / Ammo above Minimap -->
    <div id="hud-panel-status-bars" style="position:absolute; left:210px; bottom:130px; display:flex; flex-direction:column; gap:4px; width:200px;">
      <div style="display:flex; align-items:center; gap:6px; font-size:11px; font-weight:bold; color:#a0aec0;">
        <span>HP</span>
        <div style="flex:1; height:6px; background:rgba(255,255,255,0.15); border-radius:3px; overflow:hidden;">
          <div id="hud-hp-fill" style="width:100%; height:100%; background:#48bb78; transition:width 0.2s;"></div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:6px; font-size:11px; font-weight:bold; color:#a0aec0;">
        <span>ARMOUR</span>
        <div style="flex:1; height:6px; background:rgba(255,255,255,0.15); border-radius:3px; overflow:hidden;">
          <div id="hud-armour-fill" style="width:60%; height:100%; background:#4299e1; transition:width 0.2s;"></div>
        </div>
      </div>
      <div id="hud-ammo-line" style="font-size:12px; font-family:monospace; color:#ffcc66; margin-top:2px;">AMMO: 12 / 48</div>
    </div>

    <!-- Vehicle Card Bottom-Right -->
    <div id="hud-panel-vehicle" style="position:absolute; right:16px; bottom:16px; width:240px; background:rgba(12,17,26,0.85); border:1px solid rgba(255,255,255,0.15); border-radius:8px; padding:10px 14px; backdrop-filter:blur(6px); display:none;">
      <div id="hud-vehicle-name" style="font-size:14px; font-weight:bold; color:#ffaa44; margin-bottom:2px;">ZORRO GT</div>
      <div id="hud-vehicle-speed" style="font-size:48px; font-weight:bold; font-family:monospace; color:#ffffff; line-height:1; margin-bottom:6px;">184</div>
      <div style="font-size:10px; color:#a0aec0; margin-bottom:2px;">CONDITION</div>
      <div style="width:100%; height:6px; background:rgba(255,255,255,0.15); border-radius:3px; overflow:hidden;">
        <div id="hud-vehicle-condition" style="width:85%; height:100%; background:#48bb78;"></div>
      </div>
    </div>

    <!-- Weapon Row (4 slots) -->
    <div id="hud-panel-weapons" style="position:absolute; right:280px; bottom:16px; display:flex; gap:6px;">
      <!-- 4 weapon slots -->
    </div>

    <!-- Radio Card -->
    <div id="hud-panel-radio" style="position:absolute; right:16px; bottom:140px; background:rgba(12,17,26,0.85); border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:8px 12px; font-size:12px; max-width:220px;">
      <div style="font-weight:bold; color:#ffaa44; margin-bottom:2px;">RADIO CALDERA FM</div>
      <div id="hud-radio-sub" style="font-size:11px; color:#a0aec0;">Brisa de Ceniza — Los Faros</div>
    </div>

    <!-- Dialogue Card -->
    <div id="hud-panel-dialogue" style="position:absolute; bottom:90px; left:50%; transform:translateX(-50%); width:520px; background:rgba(12,17,26,0.95); border:1px solid rgba(255,170,68,0.4); border-radius:8px; padding:14px 18px; display:none; backdrop-filter:blur(8px);">
      <div style="display:flex; gap:12px; align-items:center;">
        <div id="hud-dialogue-portrait" style="width:40px; height:40px; background:#ffaa44; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; color:#0d1b2a; font-size:18px;">I</div>
        <div>
          <div id="hud-dialogue-name" style="font-size:13px; font-weight:bold; color:#ffaa44; margin-bottom:2px;">IRIS</div>
          <div id="hud-dialogue-line" style="font-size:16px; color:#ffffff; line-height:1.4;">Clean work. District takeover in muelle advanced.</div>
        </div>
      </div>
    </div>

    <!-- Centre Callout -->
    <div id="hud-panel-callout" style="position:absolute; top:80px; left:50%; transform:translateX(-50%); background:rgba(180,40,40,0.9); padding:10px 24px; border-radius:6px; font-size:18px; font-weight:bold; letter-spacing:1px; display:none; box-shadow:0 4px 20px rgba(0,0,0,0.5);">
      MISSION COMPLETED: +$400
    </div>

    <!-- Centre-Bottom Prompt -->
    <div id="hud-panel-prompt" style="position:absolute; bottom:40px; left:50%; transform:translateX(-50%); background:rgba(20,30,45,0.9); border:1px solid #ffaa44; padding:10px 24px; border-radius:6px; font-size:16px; font-weight:bold; color:#ffcc66; display:none; box-shadow:0 4px 20px rgba(0,0,0,0.5);">
      Press E to interact
    </div>
  `;

  let currentPanelsMode = 'full';
  let cache = {};

  function setPanels(mode) {
    currentPanelsMode = mode;
    const missionEl = document.getElementById('hud-panel-mission');
    const dispatchEl = document.getElementById('hud-panel-dispatch');
    const heatCashEl = document.getElementById('hud-panel-heat-cash');
    const takeoverEl = document.getElementById('hud-panel-takeover');
    const minimapEl = document.getElementById('hud-panel-minimap');
    const statusBarsEl = document.getElementById('hud-panel-status-bars');
    const vehicleEl = document.getElementById('hud-panel-vehicle');
    const weaponsEl = document.getElementById('hud-panel-weapons');
    const radioEl = document.getElementById('hud-panel-radio');
    const dialogueEl = document.getElementById('hud-panel-dialogue');

    if (mode === 'off') {
      root.style.display = 'none';
      return;
    }
    root.style.display = 'block';

    if (mode === 'cover') {
      if (missionEl) missionEl.style.display = 'block';
      if (dispatchEl) dispatchEl.style.display = 'block';
      if (heatCashEl) heatCashEl.style.display = 'block';
      if (takeoverEl) takeoverEl.style.display = 'block';
      if (minimapEl) minimapEl.style.display = 'block';
      if (statusBarsEl) statusBarsEl.style.display = 'block';
      if (vehicleEl) vehicleEl.style.display = 'block';
      if (weaponsEl) {
        weaponsEl.style.display = 'flex';
        weaponsEl.style.opacity = '0.4';
      }
      if (radioEl) radioEl.style.display = 'none';
      if (dialogueEl) dialogueEl.style.display = 'none';
    } else {
      // 'full'
      if (missionEl) missionEl.style.display = 'block';
      if (dispatchEl) dispatchEl.style.display = 'block';
      if (heatCashEl) heatCashEl.style.display = 'block';
      if (takeoverEl) takeoverEl.style.display = 'block';
      if (minimapEl) minimapEl.style.display = 'block';
      if (statusBarsEl) statusBarsEl.style.display = 'block';
      if (vehicleEl) vehicleEl.style.display = 'block';
      if (weaponsEl) {
        weaponsEl.style.display = 'flex';
        weaponsEl.style.opacity = '1.0';
      }
      if (radioEl) radioEl.style.display = 'block';
      if (dialogueEl) {
        // visibility controlled by dialogue age
      }
    }
  }

  function update(snapshot) {
    if (!snapshot) return;
    if (snapshot.screenOpen || currentPanelsMode === 'off') {
      root.style.display = 'none';
      return;
    }
    root.style.display = 'block';

    // Dirty-check helper
    function setVal(id, text) {
      const el = document.getElementById(id);
      if (el && cache[id] !== text) {
        el.textContent = text;
        cache[id] = text;
      }
    }

    const save = snapshot.save || {};
    const player = snapshot.player || {};
    const heat = snapshot.heat || 0;

    // Mission panel
    const obj = snapshot.mission || {};
    setVal('hud-job-line', obj.jobLabel ? `JOB ${save.missionIndex || 1}/8 · ${obj.jobLabel.toUpperCase()}` : `JOB ${save.missionIndex || 1}/8 · CALDERA BAY`);
    setVal('hud-objective', obj.objective || 'Explore Caldera Bay');
    setVal('hud-stage-line', obj.stageLabel || 'Free Roam');
    setVal('hud-next-line', obj.next ? `NEXT: ${obj.next}` : 'NEXT: Open World');

    const timerEl = document.getElementById('hud-timer');
    if (timerEl) {
      if (obj.timer !== undefined && obj.timer !== null) {
        timerEl.style.display = 'block';
        const mm = String(Math.floor(obj.timer / 60)).padStart(2, '0');
        const ss = String(Math.floor(obj.timer % 60)).padStart(2, '0');
        setVal('hud-timer', `${mm}:${ss}`);
      } else {
        timerEl.style.display = 'none';
      }
    }

    const jobsDone = save.jobsDone || 6;
    let jobChecks = '';
    for (let i = 0; i < 8; i++) {
      jobChecks += i < jobsDone ? '✓' : '·';
    }
    setVal('hud-jobs-merged', `JOBS ${jobsDone}/8 ${jobChecks}`);

    // Dispatch panel
    const dispatchEl = document.getElementById('hud-panel-dispatch');
    const units = snapshot.units || [];
    if (dispatchEl) {
      if (heat > 0) {
        dispatchEl.style.display = 'block';
        setVal('hud-dispatch-header', `DISPATCH · HEAT ${heat} · ${units.length} UNITS`);
        const rowsEl = document.getElementById('hud-dispatch-rows');
        if (rowsEl) {
          let rowsHtml = '';
          const maxShow = Math.min(4, units.length);
          for (let i = 0; i < maxShow; i++) {
            const u = units[i];
            const dist10 = Math.round((u.dist || 40) / 10) * 10;
            const tactic = u.tactic || 'PURSUIT';
            rowsHtml += `<div style="display:flex; justify-content:space-between;"><span>${u.name || 'CRUISER'}</span><span>${dist10}m · ${tactic}</span></div>`;
          }
          if (units.length > 4) {
            rowsHtml += `<div style="color:#a0aec0; text-align:center;">+${units.length - 4} more</div>`;
          }
          if (rowsEl.innerHTML !== rowsHtml) {
            rowsEl.innerHTML = rowsHtml;
          }
        }
      } else {
        dispatchEl.style.display = 'none';
      }
    }

    // Heat, cash, rep, district, autosave
    const stars = '★'.repeat(heat) + '☆'.repeat(5 - heat);
    setVal('hud-heat', stars);
    setVal('hud-heat-pips', stars);
    setVal('hud-cash', `$${(save.cash || 0).toLocaleString()}`);
    setVal('hud-cash-display', `$${(save.cash || 0).toLocaleString()}`);
    setVal('hud-rep', `REP ${save.rep || 0} (${tierFor(save.rep || 0)})`);
    setVal('hud-rep-display', `REP ${save.rep || 0} (${tierFor(save.rep || 0)})`);

    const curDist = districtAt(player.x || 0, player.z || 0).toUpperCase();
    setVal('hud-district-name', `DISTRICT: ${curDist}`);
    setVal('hud-autosave', `AUTOSAVE ${save.lastSaveClock || '14:32'}`);

    // Takeover strip
    const takeover = save.takeover || { muelle: 100, paseo: 80, verde: 60, ceniza: 30, cumbre: 10 };
    const tCount = takeoverCount(save);
    setVal('hud-takeover-title', `TAKEOVER ${tCount}/5`);
    const segContainer = document.getElementById('hud-takeover-segments');
    if (segContainer) {
      const districts = ['muelle', 'paseo', 'verde', 'ceniza', 'cumbre'];
      let segHtml = '';
      for (const d of districts) {
        const pct = takeover[d] || 0;
        const color = pct >= 50 ? '#48bb78' : '#cbd5e0';
        segHtml += `<div style="flex:1; background:rgba(255,255,255,0.2); border-radius:2px; overflow:hidden;"><div style="width:${pct}%; height:100%; background:${color};"></div></div>`;
      }
      if (segContainer.innerHTML !== segHtml) {
        segContainer.innerHTML = segHtml;
      }
    }

    // Minimap canvas update
    const miniCanvas = document.getElementById('hud-minimap-canvas');
    if (miniCanvas) {
      const ctx = miniCanvas.getContext('2d');
      ctx.clearRect(0, 0, 180, 180);
      ctx.save();
      ctx.translate(90, 90);
      const heading = player.angle || 0;
      ctx.rotate(-heading);
      const px = player.x || 0;
      const pz = player.z || 0;
      ctx.drawImage(offscreenCanvas, -px - 600, -pz - 600);

      // Draw player arrow
      ctx.fillStyle = '#ffaa44';
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(6, 8);
      ctx.lineTo(0, 4);
      ctx.lineTo(-6, 8);
      ctx.closePath();
      ctx.fill();

      // Draw police dots
      if (snapshot.units) {
        ctx.fillStyle = '#ff4d4d';
        for (const u of snapshot.units) {
          const dx = (u.x || 0) - px;
          const dz = (u.z || 0) - pz;
          ctx.beginPath();
          ctx.arc(dx, dz, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw objective diamond
      if (snapshot.marker) {
        ctx.fillStyle = '#ecc94b';
        const mx = (snapshot.marker.x || 0) - px;
        const mz = (snapshot.marker.z || 0) - pz;
        ctx.beginPath();
        ctx.moveTo(mx, mz - 5);
        ctx.lineTo(mx + 5, mz);
        ctx.lineTo(mx, mz + 5);
        ctx.lineTo(mx - 5, mz);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }

    // Health, Armour, Ammo
    const hpFill = document.getElementById('hud-hp-fill');
    if (hpFill) hpFill.style.width = `${Math.max(0, Math.min(100, player.health !== undefined ? player.health : 100))}%`;
    const armourFill = document.getElementById('hud-armour-fill');
    if (armourFill) armourFill.style.width = `${Math.max(0, Math.min(100, save.armour || 0))}%`;
    setVal('hud-ammo-line', `AMMO: ${snapshot.ammoLoaded || 12} / ${snapshot.ammoReserve || 48}`);

    // Vehicle card
    const vehiclePanel = document.getElementById('hud-panel-vehicle');
    if (vehiclePanel) {
      if (player.isDriving && player.currentVehicle) {
        vehiclePanel.style.display = 'block';
        const car = player.currentVehicle;
        setVal('hud-vehicle-name', car.spec ? car.spec.name.toUpperCase() : 'VEHICLE');
        const speedKmh = Math.round(Math.abs(car.speed || 0) * 3.6);
        setVal('hud-vehicle-speed', speedKmh);
        const condFill = document.getElementById('hud-vehicle-condition');
        if (condFill) condFill.style.width = `${car.durability || 100}%`;
      } else {
        vehiclePanel.style.display = 'none';
      }
    }

    // Weapon row
    const weaponsPanel = document.getElementById('hud-panel-weapons');
    if (weaponsPanel) {
      const weapons = snapshot.weapons || [
        { name: 'Fists', ammo: '∞' },
        { name: 'Pistol', ammo: '12/48' },
        { name: 'SMG', ammo: '30/90' },
        { name: 'Shotgun', ammo: '6/18' }
      ];
      const activeIdx = snapshot.activeWeaponIndex || 0;
      let wHtml = '';
      for (let i = 0; i < weapons.length; i++) {
        const w = weapons[i];
        const active = i === activeIdx;
        const bg = active ? 'rgba(255,170,68,0.25)' : 'rgba(12,17,26,0.85)';
        const border = active ? '#ffaa44' : 'rgba(255,255,255,0.15)';
        wHtml += `<div style="background:${bg}; border:1px solid ${border}; border-radius:6px; padding:6px 12px; font-size:12px; text-align:center; min-width:60px;">
          <div style="font-weight:bold; color:${active ? '#ffaa44' : '#fff'};">${w.name}</div>
          <div style="font-size:10px; color:#a0aec0; font-family:monospace;">${w.ammo}</div>
        </div>`;
      }
      if (weaponsPanel.innerHTML !== wHtml) {
        weaponsPanel.innerHTML = wHtml;
      }
    }

    // Radio card
    const radioSub = document.getElementById('hud-radio-sub');
    if (radioSub && snapshot.station) {
      setVal('hud-radio-sub', `${snapshot.station.subtitle} (${snapshot.station.name})`);
    }

    // Prompt
    const promptPanel = document.getElementById('hud-panel-prompt');
    if (promptPanel) {
      if (snapshot.prompt) {
        promptPanel.style.display = 'block';
        promptPanel.textContent = snapshot.prompt;
      } else {
        promptPanel.style.display = 'none';
      }
    }

    // Dialogue card (7 sim seconds)
    const dialoguePanel = document.getElementById('hud-panel-dialogue');
    if (dialoguePanel) {
      if (snapshot.dialogue && snapshot.dialogue.age < 7.0) {
        dialoguePanel.style.display = 'block';
        setVal('hud-dialogue-name', snapshot.dialogue.speaker || 'IRIS');
        setVal('hud-dialogue-line', snapshot.dialogue.text || '');
      } else {
        dialoguePanel.style.display = 'none';
      }
    }

    // Centre Callout (2.6 sim seconds)
    const calloutPanel = document.getElementById('hud-panel-callout');
    if (calloutPanel) {
      if (snapshot.callout && snapshot.callout.age < 2.6) {
        calloutPanel.style.display = 'block';
        setVal('hud-panel-callout', snapshot.callout.text || '');
      } else {
        calloutPanel.style.display = 'none';
      }
    }

    // Centre-Bottom Prompt
    const promptPanel = document.getElementById('hud-panel-prompt');
    if (promptPanel) {
      if (snapshot.prompt) {
        promptPanel.style.display = 'block';
        setVal('hud-panel-prompt', snapshot.prompt);
      } else {
        promptPanel.style.display = 'none';
      }
    }
  }

  return {
    setPanels,
    update
  };
}

function preRenderCityMinimap(ctx) {
  ctx.fillStyle = '#0b0e14';
  ctx.fillRect(0, 0, 1200, 1200);

  // Draw districts with subtle tints
  const districts = [
    { name: 'muelle', color: 'rgba(50, 80, 120, 0.35)', x: 300, z: 900, r: 250 },
    { name: 'paseo', color: 'rgba(80, 50, 120, 0.35)', x: 930, z: 660, r: 250 },
    { name: 'verde', color: 'rgba(50, 120, 80, 0.35)', x: 900, z: 300, r: 250 },
    { name: 'ceniza', color: 'rgba(120, 70, 50, 0.35)', x: 300, z: 300, r: 250 },
    { name: 'cumbre', color: 'rgba(90, 90, 90, 0.35)', x: 600, z: 100, r: 300 }
  ];

  for (const d of districts) {
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.arc(d.x, d.z, d.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Road grid and boulevards (wider/warmer)
  ctx.strokeStyle = '#e28743';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(600, 0); ctx.lineTo(600, 1200);
  ctx.moveTo(0, 600); ctx.lineTo(1200, 600);
  ctx.stroke();

  ctx.strokeStyle = '#2a3b5c';
  ctx.lineWidth = 3;
  for (let x = 200; x < 1200; x += 200) {
    if (x === 600) continue;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1200); ctx.stroke();
  }
  for (let y = 200; y < 1200; y += 200) {
    if (y === 600) continue;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1200, y); ctx.stroke();
  }

  // Volcano glyph at cumbre center (600, 100)
  ctx.fillStyle = '#ffaa44';
  ctx.beginPath();
  ctx.arc(600, 100, 24, 0, Math.PI * 2);
  ctx.fill();
}
