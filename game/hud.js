// game/hud.js

export function createHud(hooks) {
    const root = document.getElementById('hud-root');
    if (!root) {
        console.error('HUD root not found');
        return;
    }
    root.style.position = 'absolute';
    root.style.top = '0';
    root.style.left = '0';
    root.style.width = '100vw';
    root.style.height = '100vh';
    root.style.pointerEvents = 'none';

    // Helper to create panels
    function createPanel(id, styles = {}) {
        const div = document.createElement('div');
        div.id = id;
        div.style.position = 'fixed';
        div.style.background = 'rgba(0,0,0,0.7)';
        div.style.color = '#fff';
        div.style.zIndex = '5';
        Object.assign(div.style, styles);
        root.appendChild(div);
        return div;
    }

    const mission = createPanel('hud-mission', { top: '16px', left: '16px', width: '300px' });
    const dispatch = createPanel('hud-dispatch', { top: '196px', left: '16px', width: '280px' });
    const topRight = createPanel('hud-top-right', { top: '16px', right: '16px', textAlign: 'right' });
    const takeover = createPanel('hud-takeover', { top: '16px', left: 'calc(50% - 160px)', width: '320px', textAlign: 'center' });

    const minimap = document.createElement('canvas');
    minimap.id = 'hud-minimap';
    minimap.width = 180;
    minimap.height = 180;
    minimap.style.position = 'fixed';
    minimap.style.bottom = '16px';
    minimap.style.left = '16px';
    minimap.style.background = '#333';
    minimap.style.zIndex = '5';
    root.appendChild(minimap);

    const status = createPanel('hud-status', { bottom: '210px', left: '16px', width: '180px' });
    const vehicle = createPanel('hud-vehicle', { bottom: '16px', right: '16px' });
    const weapon = createPanel('hud-weapon', { bottom: '16px', left: '210px' });
    const radio = createPanel('hud-radio', { bottom: '100px', right: '16px' });
    const dialogue = createPanel('hud-dialogue', { bottom: '16px', left: 'calc(50% - 150px)', width: '300px', display: 'none' });
    const callout = createPanel('hud-callout', { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
    const prompt = createPanel('hud-prompt', { bottom: '20px', left: '50%', transform: 'translateX(-50%)' });
    const eventLine = createPanel('hud-event', { top: '60px', left: 'calc(50% - 150px)', width: '300px', textAlign: 'center' });

    function drawMinimap(snapshot) {
        const ctx = minimap.getContext('2d');
        ctx.clearRect(0, 0, 180, 180);
        // Draw background
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, 180, 180);
        // Draw units
        if (snapshot && snapshot.police && snapshot.police.units) {
            ctx.fillStyle = 'red';
            snapshot.police.units.forEach(u => {
                ctx.beginPath();
                ctx.arc(90 + (Math.random()*40-20), 90 + (Math.random()*40-20), 3, 0, Math.PI*2);
                ctx.fill();
            });
        }
        // Draw player
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.moveTo(90, 80);
        ctx.lineTo(85, 100);
        ctx.lineTo(95, 100);
        ctx.fill();
    }

    return {
        update(snapshot) {
            if (!snapshot) return;
            // Mission
            mission.innerText = snapshot.objective ? `JOB ${snapshot.objective.missionIndex + 1}/8 — ${snapshot.objective.jobLabel}\n${snapshot.objective.objective}` : '';
            mission.style.display = snapshot.objective ? 'block' : 'none';

            // Dispatch
            dispatch.innerHTML = `<div>Dispatch</div>` + (snapshot.police?.units?.map(u => `<div>${u.name}: ${u.tactic} (${Math.round(u.dist)}m)</div>`).join('') || '');

            // Top right
            topRight.innerHTML = `<div>Heat: ${'★'.repeat(snapshot.heat)}</div><div>$${snapshot.cash.toLocaleString()}</div><div>REP ${snapshot.rep} · ${snapshot.tier}</div>`;

            // Takeover
            takeover.innerText = `Takeover Progress: ${snapshot.takeoverCount}/5 Districts`;

            // Status
            status.innerText = `HP: ${snapshot.player.hp}%\nAR: ${snapshot.player.armour}%\nAMMO: ${snapshot.player.ammo}%`;

            // Event line
            eventLine.innerText = snapshot.eventLine || '';

            // Radio
            radio.innerText = snapshot.radio || 'Radio: OFF';

            // Minimap
            drawMinimap(snapshot);
        },
        setPanels(mode) {
            const isVisible = !(mode === 'garage' || mode === 'start');
            root.style.display = isVisible ? 'block' : 'none';
            if (mode === 'cover') {
                weapon.style.opacity = '0.4';
                radio.style.display = 'none';
                dialogue.style.display = 'none';
            } else {
                weapon.style.opacity = '1';
                radio.style.display = 'block';
            }
        },
        showDialogue(name, text) {
            dialogue.style.display = 'block';
            dialogue.innerHTML = `<strong>${name.name || name.speaker || name}</strong><br>${text || name.text}`;
        }
    };
}
