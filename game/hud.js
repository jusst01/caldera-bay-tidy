export function createHud(hooks) {
  const root = document.getElementById('hud-root');
  root.innerHTML = '';
  const panels = {};

  const createPanel = (id, style) => {
    const el = document.createElement('div');
    el.id = id;
    Object.assign(el.style, {
      position: 'fixed',
      zIndex: 5,
      background: 'rgba(0,0,0,0.7)',
      color: '#fff',
      padding: '10px',
      ...style
    });
    root.appendChild(el);
    return el;
  };

  panels.mission = createPanel('hud-mission', { left: '16px', top: '16px', width: '300px' });
  panels.dispatch = createPanel('hud-dispatch', { left: '16px', top: '196px', width: '280px' });
  panels.topRight = createPanel('hud-top-right', { right: '16px', top: '16px', textAlign: 'right' });
  panels.takeover = createPanel('hud-takeover', { left: '50%', transform: 'translateX(-50%)', top: '16px', width: '320px', textAlign: 'center' });
  panels.status = createPanel('hud-status', { left: '200px', bottom: '16px' });
  panels.minimap = createPanel('hud-minimap', { left: '16px', bottom: '16px', width: '180px', height: '180px', padding: '0' });
  panels.vehicle = createPanel('hud-vehicle', { right: '16px', bottom: '16px', width: '200px' });
  panels.weapon = createPanel('hud-weapon', { left: '200px', bottom: '60px' });
  panels.radio = createPanel('hud-radio', { right: '16px', bottom: '150px', width: '200px' });
  panels.dialogue = createPanel('hud-dialogue', { left: '50%', transform: 'translateX(-50%)', bottom: '100px', textAlign: 'center', display: 'none' });
  panels.callout = createPanel('hud-callout', { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'none' });
  panels.prompt = createPanel('hud-prompt', { left: '50%', bottom: '20px', transform: 'translateX(-50%)' });
  panels.eventLine = createPanel('hud-event', { left: '50%', top: '60px', transform: 'translateX(-50%)' });

  const canvas = document.createElement('canvas');
  canvas.width = 180;
  canvas.height = 180;
  panels.minimap.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let lastUnits = null;

  return {
    update(snapshot) {
      if (snapshot.objective) {
        panels.mission.textContent = `JOB ${snapshot.objective.missionIndex + 1}/8 — ${snapshot.objective.jobLabel}\n${snapshot.objective.objective}`;
        panels.mission.style.display = 'block';
      } else {
        panels.mission.style.display = 'none';
      }

      if (snapshot.police.units !== lastUnits) {
        lastUnits = snapshot.police.units;
        panels.dispatch.innerHTML = '<strong>Dispatch</strong><br/>' +
          snapshot.police.units.map(u => `${u.name}: ${u.tactic} (${Math.round(u.dist)}m)`).join('<br/>');
      }

      panels.topRight.innerHTML = `Heat: ${'★'.repeat(snapshot.heat)}<br/>$${snapshot.cash.toLocaleString()}<br/>REP ${snapshot.rep} · ${snapshot.tier}`;
      panels.takeover.textContent = `Takeover Progress: ${snapshot.takeoverCount}/5 Districts`;
      panels.status.innerHTML = `HP: ${snapshot.player.hp}%<br/>AR: ${snapshot.player.armour}%<br/>AMMO: ${snapshot.player.ammo}`;

      ctx.fillStyle = '#1a2a3a';
      ctx.fillRect(0, 0, 180, 180);
      ctx.fillStyle = '#2a4a6a';
      ctx.fillRect(40, 40, 100, 100);
      ctx.fillStyle = 'red';
      snapshot.police.units.forEach(u => ctx.fillRect(180/2 + (Math.random()-0.5)*50, 180/2 + (Math.random()-0.5)*50, 4, 4));
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.moveTo(90, 80); ctx.lineTo(95, 100); ctx.lineTo(85, 100); ctx.fill();
      ctx.fillStyle = 'yellow';
      ctx.fillRect(150, 150, 10, 10);

      panels.eventLine.textContent = snapshot.eventLine;
      panels.radio.textContent = snapshot.radio || 'OFF';
      if (snapshot.player.inCar) {
        panels.vehicle.textContent = 'Vehicle Status: OK';
        panels.vehicle.style.display = 'block';
      } else {
        panels.vehicle.style.display = 'none';
      }
    },
    setPanels(mode) {
      const all = Object.values(panels);
      if (mode === 'game') {
        all.forEach(p => p.style.display = 'block');
        panels.radio.style.display = 'block';
        panels.dialogue.style.display = 'none';
        panels.weapon.style.opacity = '1';
      } else if (mode === 'cover') {
        panels.mission.style.display = 'block';
        panels.dispatch.style.display = 'block';
        panels.topRight.style.display = 'block';
        panels.minimap.style.display = 'block';
        panels.vehicle.style.display = 'block';
        panels.takeover.style.display = 'block';
        panels.weapon.style.opacity = '0.4';
        panels.radio.style.display = 'none';
        panels.dialogue.style.display = 'none';
      } else {
        all.forEach(p => p.style.display = 'none');
      }
    },
    showDialogue(name, text) {
      panels.dialogue.style.display = 'block';
      panels.dialogue.innerHTML = `<strong>${name?.name || name?.speaker || 'Unknown'}</strong><br/>${text || name?.text}`;
    }
  };
}
