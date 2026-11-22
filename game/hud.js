// CALDERA BAY — game/hud.js
import * as THREE from './three.module.min.js';

/**
 * HUD Implementation for Caldera Bay.
 * Handles rendering the game interface: health, armour, ammo, minimap,
 * mission objectives, police dispatch, takeover status, and dialogue.
 */

export function createHud(hooks) {
  const root = document.getElementById('hud-root');
  if (!root) throw new Error('HUD root not found');

  // --- Panel Creation Helpers ---

  /**
   * Creates a new HUD panel element and appends it to the HUD root.
   * @param {string} className - The CSS class name for the panel.
   * @returns {HTMLElement} The created panel element.
   */
  const createPanel = (className) => {
    const el = document.createElement('div');
    el.className = `hud-panel ${className}`;
    root.appendChild(el);
    return el;
  };

  /**
   * Creates a status element for displaying health, armour, or ammo.
   * @param {string} className - The CSS class name.
   * @returns {HTMLElement} The created element.
   */
  const createStatusElement = (className) => {
    const el = document.createElement('div');
    el.className = className;
    return el;
  };

  // --- Define Panel Elements ---
  const missionPanel = createPanel('mission');
  const dispatchPanel = createPanel('dispatch');
  const heatCashTierPanel = createPanel('top-right');
  const takeoverStrip = createPanel('takeover');
  const statusPanel = createPanel('status');

  const minimapCanvas = document.createElement('canvas');
  minimapCanvas.width = 180;
  minimapCanvas.height = 180;
  minimapCanvas.className = 'hud-panel minimap';
  root.appendChild(minimapCanvas);

  const vehicleCard = createPanel('vehicle');
  const weaponRow = createPanel('weapons');
  const radioCard = createPanel('radio');
  const dialogueCard = createPanel('dialogue');

  const centreCallout = createPanel('callout');
  const promptPanel = createPanel('prompt');
  const eventLine = createPanel('event');

  // --- Sub-elements ---
  const hpBar = createStatusElement('bar hp');
  const armourBar = createStatusElement('bar armour');
  const ammoBar = createStatusElement('bar ammo');
  statusPanel.appendChild(hpBar);
  statusPanel.appendChild(armourBar);
  statusPanel.appendChild(ammoBar);

  // State
  let lastDispatch = null;
  let currentMode = 'game';

  // --- Helper: Render Minimap Detail ---

  /**
   * Renders the minimap background, including grid lines.
   * @param {CanvasRenderingContext2D} ctx - The canvas context.
   */
  function drawMapBackground(ctx) {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 180, 180);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 0; i < 180; i += 30) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, 180);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i); ctx.lineTo(180, i);
      ctx.stroke();
    }
  }

  /**
   * Renders the player arrow on the minimap.
   * @param {CanvasRenderingContext2D} ctx - The canvas context.
   * @param {object} player - The player state object.
   */
  function drawPlayerArrow(ctx, player) {
    ctx.save();
    ctx.translate(90, 90);
    ctx.rotate(player.angle);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(6, 6);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /**
   * Renders police unit dots on the minimap.
   * @param {CanvasRenderingContext2D} ctx - The canvas context.
   * @param {Array} units - The list of active police units.
   */
  function drawPoliceDots(ctx, units) {
    ctx.fillStyle = '#0000ff';
    units.forEach(u => {
      const x = 90 + (u.x / 10);
      const z = 90 + (u.z / 10);
      ctx.beginPath();
      ctx.arc(x, z, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /**
   * Updates the minimap rendering.
   * @param {object} player - The player state object.
   * @param {object} policeData - The police state data.
   */
  function renderMinimap(player, policeData) {
    const ctx = minimapCanvas.getContext('2d');
    drawMapBackground(ctx);
    drawPoliceDots(ctx, policeData?.units || []);
    drawPlayerArrow(ctx, player);
  }

  // --- Helper: Formatters ---

  /**
   * Formats a money value to a string with a dollar sign.
   * @param {number} amount - The money amount.
   * @returns {string} The formatted money string.
   */
  function formatMoney(amount) {
    return "$" + amount.toLocaleString();
  }

  // --- Helper: Render Panels ---

  function renderMissionPanel(objective) {
    if (objective) {
      missionPanel.innerHTML = `<h3>JOB ${objective.missionIndex + 1}/8 — ${objective.jobLabel}</h3><p>${objective.objective}</p>`;
      missionPanel.style.display = 'block';
    } else {
      missionPanel.style.display = 'none';
    }
  }

  function renderDispatchPanel(units) {
    const dispatchSignature = JSON.stringify(units.map(u => ({n: u.name, t: u.tactic})));
    if (dispatchSignature !== lastDispatch) {
      lastDispatch = dispatchSignature;
      dispatchPanel.innerHTML = `<h3>Dispatch</h3><ul>${units.map(u => `<li>${u.name}: ${u.tactic} (${Math.round(u.dist)}m)</li>`).join('')}</ul>`;
    }
  }

  function renderTopRight(heat, cash, tier) {
    heatCashTierPanel.innerHTML = `
      <div class="heat">Heat: ${'★'.repeat(heat || 0)}</div>
      <div class="cash">${formatMoney(cash || 0)}</div>
      <div class="tier">REP: ${tier || 0} | Tier: ${tier || 0}</div>
    `;
  }

  function renderTakeover(count) {
    takeoverStrip.innerHTML = `<p>Takeover Progress: ${count || 0}/5 Districts</p>`;
  }

  function renderStatus(player) {
    hpBar.textContent = `HP: ${Math.round(player.hp || 0)}%`;
    armourBar.textContent = `AR: ${Math.round(player.armour || 0)}%`;
    ammoBar.textContent = `AMMO: ${player.ammo || 0}`;
  }

  function renderVehicle(vehicle) {
    if (vehicle) {
      vehicleCard.innerHTML = `<p>Driving: ${vehicle.name || 'Vehicle'}</p>`;
      vehicleCard.style.display = 'block';
    } else {
      vehicleCard.style.display = 'none';
    }
  }

  function renderWeapons() {
    weaponRow.innerHTML = `<div class="slot">W1</div><div class="slot">W2</div><div class="slot">W3</div><div class="slot">W4</div>`;
    weaponRow.style.opacity = (currentMode === 'cover') ? '0.4' : '1';
  }

  function renderRadio(station) {
    radioCard.innerHTML = `<p>Radio: ${station || 'OFF'}</p>`;
    radioCard.style.display = (currentMode === 'cover') ? 'none' : 'block';
  }

  function renderDialogue(dialogue) {
    if (dialogue) {
      dialogueCard.innerHTML = `<h3>${dialogue.name}</h3><p>${dialogue.text}</p>`;
      dialogueCard.style.display = 'block';
    } else if (currentMode !== 'cover') {
      dialogueCard.style.display = 'none';
    }
  }

  function renderCallout(text) {
    if (text) {
      centreCallout.innerHTML = `<h2>${text}</h2>`;
      centreCallout.style.display = 'block';
    } else {
      centreCallout.style.display = 'none';
    }
  }

  function renderPrompt(text) {
    if (text) {
      promptPanel.innerHTML = `<p>${text}</p>`;
      promptPanel.style.display = 'block';
    } else {
      promptPanel.style.display = 'none';
    }
  }

  function renderEventLine(text) {
    if (text) {
      eventLine.innerHTML = `<span>${text}</span>`;
      eventLine.style.display = 'block';
    } else {
      eventLine.style.display = 'none';
    }
  }

  // API Methods
  return {
    update(snapshot) {
      renderMissionPanel(snapshot.objective);
      renderDispatchPanel(snapshot.police?.units || []);
      renderTopRight(snapshot.heat, snapshot.cash, snapshot.tier);
      renderTakeover(snapshot.takeoverCount);
      renderStatus(snapshot.player);
      renderMinimap(snapshot.player, snapshot.police);
      renderVehicle(snapshot.player.inCar);
      renderWeapons();
      renderRadio(snapshot.radio);
      renderDialogue(snapshot.dialogue);
      renderCallout(snapshot.callout);
      renderPrompt(snapshot.prompt);
      renderEventLine(snapshot.eventLine);
    },

    setPanels(mode) {
      currentMode = mode;

      const setVisible = (el, visible) => {
        el.style.display = visible ? 'block' : 'none';
      };

      if (mode === 'cover') {
        setVisible(missionPanel, true);
        setVisible(dispatchPanel, true);
        setVisible(heatCashTierPanel, true);
        setVisible(minimapCanvas, true);
        setVisible(vehicleCard, true);
        setVisible(takeoverStrip, true);
        weaponRow.style.opacity = '0.4';
        setVisible(radioCard, false);
        setVisible(dialogueCard, false);
      } else if (mode === 'garage' || mode === 'start') {
        root.style.display = 'none';
      } else {
        root.style.display = 'block';
        setVisible(missionPanel, true);
        setVisible(dispatchPanel, true);
        setVisible(heatCashTierPanel, true);
        setVisible(minimapCanvas, true);
        setVisible(vehicleCard, true);
        setVisible(takeoverStrip, true);
        weaponRow.style.opacity = '1';
        setVisible(radioCard, true);
        setVisible(dialogueCard, true);
      }
    },

    showDialogue(name, text) {
      dialogueCard.innerHTML = `<h3>${name}</h3><p>${text}</p>`;
      dialogueCard.style.display = 'block';
    }
  };
}
