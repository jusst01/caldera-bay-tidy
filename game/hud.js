export function createHud(hooks) {
  const root = document.getElementById('hud-root');
  root.innerHTML = '';
  const style = document.createElement('style');
  style.textContent = `
    #hud-root > * { position:fixed; z-index:5; background:rgba(0,0,0,0.7); color:#eee; padding:10px; font-family:sans-serif; }
    .minimap { left:16px; bottom:16px; width:180px; height:180px; padding:0; }
  `;
  root.appendChild(style);

  const mission = document.createElement('div');
  mission.style.cssText = 'top:16px; left:16px; width:300px;';
  root.appendChild(mission);

  const dispatch = document.createElement('div');
  dispatch.style.cssText = 'top:196px; left:16px; width:280px;';
  root.appendChild(dispatch);

  const topRight = document.createElement('div');
  topRight.style.cssText = 'top:16px; right:16px; text-align:right;';
  root.appendChild(topRight);

  const takeover = document.createElement('div');
  takeover.style.cssText = 'top:16px; left:50%; transform:translateX(-50%); width:320px; text-align:center;';
  root.appendChild(takeover);

  const status = document.createElement('div');
  status.style.cssText = 'bottom:206px; left:16px;';
  root.appendChild(status);

  const minimap = document.createElement('canvas');
  minimap.className = 'minimap';
  minimap.width = 180;
  minimap.height = 180;
  root.appendChild(minimap);

  const vehicleCard = document.createElement('div');
  vehicleCard.style.cssText = 'bottom:16px; right:16px;';
  root.appendChild(vehicleCard);

  const weaponRow = document.createElement('div');
  weaponRow.style.cssText = 'bottom:16px; left:206px;';
  root.appendChild(weaponRow);

  const radioCard = document.createElement('div');
  radioCard.style.cssText = 'bottom:106px; right:16px;';
  root.appendChild(radioCard);

  const dialogue = document.createElement('div');
  dialogue.style.cssText = 'bottom:16px; left:50%; transform:translateX(-50%); display:none;';
  root.appendChild(dialogue);

  const ctx = minimap.getContext('2d');

  return {
    update(s) {
      if (!s) return;
      mission.innerHTML = s.objective ? `JOB ${s.objective.missionIndex + 1}/8 — ${s.objective.jobLabel}<br>${s.objective.objective}` : '';

      let dHtml = 'Dispatch';
      s.police.units.forEach(u => dHtml += `<br>${u.name}: ${u.tactic} (${Math.round(u.dist)}m)`);
      dispatch.innerHTML = dHtml;

      topRight.innerHTML = `Heat: ${'★'.repeat(s.heat)}<br>$${s.cash.toLocaleString()}<br>REP ${s.rep} · ${s.tier}`;
      takeover.innerHTML = `Takeover Progress: ${s.takeoverCount}/5 Districts`;
      status.innerHTML = `HP: ${s.player.hp}%<br>AR: ${s.player.armour}%<br>AMMO: ${s.player.ammo}`;

      ctx.clearRect(0, 0, 180, 180);
      ctx.fillStyle = '#333';
      ctx.fillRect(0, 0, 180, 180);
      ctx.fillStyle = '#1a3a5a';
      ctx.fillRect(40, 40, 100, 100);

      s.police.units.forEach(u => {
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(90 + (Math.random() - 0.5) * 50, 90 + (Math.random() - 0.5) * 50, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = 'yellow';
      ctx.beginPath();
      ctx.moveTo(90, 80);
      ctx.lineTo(100, 110);
      ctx.lineTo(80, 110);
      ctx.fill();

      ctx.fillStyle = 'white';
      ctx.font = '16px sans-serif';
      ctx.fillText('★', 150, 20);

      vehicleCard.innerHTML = s.player.inCar ? 'Vehicle: Active' : 'On Foot';
      radioCard.innerHTML = `Radio: ${s.radio || 'OFF'}`;
      if (s.dialogue) {
        dialogue.style.display = 'block';
        dialogue.innerHTML = `<strong>${s.dialogue.name || s.dialogue.speaker}</strong>: ${s.dialogue.text}`;
      } else {
        dialogue.style.display = 'none';
      }
    },
    setPanels(mode) {
      const show = mode === 'game' || mode === 'cover';
      root.style.display = (mode === 'garage' || mode === 'start') ? 'none' : 'block';
      weaponRow.style.opacity = mode === 'cover' ? '0.4' : '1';
      radioCard.style.display = mode === 'cover' ? 'none' : 'block';
      dialogue.style.display = mode === 'cover' ? 'none' : 'block';
    },
    showDialogue(name, text) {
      dialogue.style.display = 'block';
      dialogue.innerHTML = `<strong>${name}</strong>: ${text}`;
    }
  };
}
