export function createHud(hooks) {
  const root = document.getElementById('hud-root');
  root.innerHTML = '';
  root.style.position = 'fixed';
  root.style.left = '0';
  root.style.top = '0';
  root.style.width = '100%';
  root.style.height = '100%';
  root.style.pointerEvents = 'none';

  const panel = (id, style) => {
    const el = document.createElement('div');
    el.id = id;
    Object.assign(el.style, { position: 'fixed', zIndex: 5, backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff', padding: '10px', fontSize: '14px', ...style });
    root.appendChild(el);
    return el;
  };

  const mission = panel('hud-mission', { left: '16px', top: '16px', width: '300px' });
  const dispatch = panel('hud-dispatch', { left: '16px', top: '196px', width: '280px' });
  const topRight = panel('hud-top-right', { right: '16px', top: '16px', width: '200px', textAlign: 'right' });
  const takeover = panel('hud-takeover', { left: '50%', transform: 'translateX(-50%)', top: '16px', width: '320px', textAlign: 'center' });
  const status = panel('hud-status', { left: '16px', bottom: '200px', width: '200px' });

  const minimapCanvas = document.createElement('canvas');
  minimapCanvas.width = 180;
  minimapCanvas.height = 180;
  minimapCanvas.style.position = 'fixed';
  minimapCanvas.style.left = '16px';
  minimapCanvas.style.bottom = '16px';
  minimapCanvas.style.zIndex = '5';
  root.appendChild(minimapCanvas);
  const ctx = minimapCanvas.getContext('2d');

  const vehicleCard = panel('hud-vehicle', { right: '16px', bottom: '16px', width: '250px' });
  const weaponRow = panel('hud-weapon', { left: '210px', bottom: '16px', width: '300px' });
  const radioCard = panel('hud-radio', { right: '16px', bottom: '250px', width: '200px', textAlign: 'right' });
  const dialogueCard = panel('hud-dialogue', { left: '50%', transform: 'translateX(-50%)', bottom: '100px', width: '400px', textAlign: 'center' });
  const callout = panel('hud-callout', { left: '50%', transform: 'translateX(-50%)', top: '50%', textAlign: 'center' });
  const prompt = panel('hud-prompt', { left: '50%', transform: 'translateX(-50%)', bottom: '50px', textAlign: 'center' });
  const eventLine = panel('hud-event', { left: '50%', transform: 'translateX(-50%)', top: '70px', width: '400px', textAlign: 'center' });

  return {
    update(snapshot) {
      if (snapshot.objective) {
        mission.textContent = `JOB ${snapshot.objective.missionIndex + 1}/8 — ${snapshot.objective.jobLabel}: ${snapshot.objective.objective}`;
        mission.style.display = 'block';
      } else {
        mission.style.display = 'none';
      }

      dispatch.innerHTML = '<strong>Dispatch</strong>';
      snapshot.police.units.forEach(u => {
        const row = document.createElement('div');
        row.textContent = `${u.name}: ${u.tactic} (${Math.round(u.dist)}m)`;
        dispatch.appendChild(row);
      });

      topRight.innerHTML = `Heat: ${'★'.repeat(snapshot.heat)}<br>$${snapshot.cash.toLocaleString()}<br>REP ${snapshot.rep} · ${snapshot.tier}`;
      takeover.textContent = `Takeover Progress: ${snapshot.takeoverCount}/5 Districts`;
      status.textContent = `HP: ${snapshot.player.hp}% | AR: ${snapshot.player.armour}% | AMMO: ${snapshot.player.ammo}`;

      // Minimap drawing
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, 180, 180);
      // Simplified: draw a player arrow and some units
      ctx.fillStyle = '#0f0';
      ctx.beginPath();
      ctx.moveTo(90, 80); ctx.lineTo(80, 100); ctx.lineTo(100, 100);
      ctx.fill();

      snapshot.police.units.forEach(u => {
        ctx.fillStyle = '#f00';
        ctx.beginPath();
        ctx.arc(Math.random() * 180, Math.random() * 180, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      vehicleCard.textContent = snapshot.player.inCar ? 'Vehicle: Active' : 'On Foot';
      weaponRow.textContent = 'Weapon: Loaded';
      radioCard.textContent = `Radio: ${snapshot.radio || 'OFF'}`;
      if (snapshot.dialogue) {
        dialogueCard.textContent = `${snapshot.dialogue.name || snapshot.dialogue.speaker}: ${snapshot.dialogue.text}`;
        dialogueCard.style.display = 'block';
      } else {
        dialogueCard.style.display = 'none';
      }
      eventLine.textContent = snapshot.eventLine || '';
    },
    setPanels(mode) {
      const display = mode === 'game' ? 'block' : 'none';
      [mission, dispatch, topRight, takeover, status, vehicleCard, weaponRow].forEach(p => p.style.display = display);
      if (mode === 'cover') {
        weaponRow.style.opacity = '0.4';
        radioCard.style.display = 'none';
        dialogueCard.style.display = 'none';
      } else {
        weaponRow.style.opacity = '1';
        radioCard.style.display = display;
      }
      if (['garage', 'start'].includes(mode)) {
        root.style.display = 'none';
      } else {
        root.style.display = 'block';
      }
    },
    showDialogue(name, text) {
      dialogueCard.textContent = `${name}: ${text}`;
      dialogueCard.style.display = 'block';
    }
  };
}
