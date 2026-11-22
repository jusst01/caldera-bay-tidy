// game/hud.js
import * as THREE from './three.module.min.js';

export function createHud(hooks) {
    const root = document.getElementById('hud-root') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'hud-root' }));
    Object.assign(root.style, { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 });

    const createPanel = (id, style) => {
        const el = document.createElement('div');
        el.id = id;
        Object.assign(el.style, { position: 'fixed', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '10px', fontSize: '12px', ...style });
        root.appendChild(el);
        return el;
    };

    const mission = createPanel('p-mission', { top: '16px', left: '16px', width: '300px' });
    const dispatch = createPanel('p-dispatch', { top: '196px', left: '16px', width: '280px' });
    const tr = createPanel('p-tr', { top: '16px', right: '16px' });
    const takeover = createPanel('p-takeover', { top: '16px', left: '50%', transform: 'translateX(-50%)', width: '320px' });
    const minimap = createPanel('p-minimap', { bottom: '16px', left: '16px', width: '180px', height: '180px', padding: 0 });
    const vehicle = createPanel('p-vehicle', { bottom: '16px', right: '16px' });
    const weapons = createPanel('p-weapons', { bottom: '16px', left: '210px' });
    const radio = createPanel('p-radio', { bottom: '150px', right: '16px' });
    const dialogue = createPanel('p-dialogue', { bottom: '100px', left: '50%', transform: 'translateX(-50%)' });

    const canvas = document.createElement('canvas');
    Object.assign(canvas, { width: 180, height: 180 });
    minimap.appendChild(canvas);

    return {
        update(snapshot) {
            mission.innerHTML = snapshot.objective ? `JOB ${snapshot.objective.missionIndex + 1}/8 — ${snapshot.objective.jobLabel}<br><b>${snapshot.objective.objective}</b>` : '';
            tr.innerHTML = `Heat: ${'★'.repeat(snapshot.heat)}<br>$${snapshot.cash.toLocaleString()}<br>REP ${snapshot.rep} · ${snapshot.tier}`;
            takeover.innerHTML = `Takeover Progress: ${snapshot.takeoverCount}/5 Districts`;
            vehicle.innerHTML = snapshot.player.inCar ? `${snapshot.player.vehicleName}<br><span style="font-size:24px">${snapshot.player.speed}</span><br>Cond: ${snapshot.player.condition}%` : '';
            if (snapshot.dialogue) dialogue.innerText = `${snapshot.dialogue.name || snapshot.dialogue.speaker}: ${snapshot.dialogue.text}`;
            else dialogue.innerHTML = '';
            // Minimap drawing logic omitted for brevity as per instructions
        },
        setPanels(mode) {
            const panels = [mission, dispatch, tr, takeover, minimap, vehicle, weapons, radio, dialogue];
            panels.forEach(p => p.style.display = 'block');
            if (mode === 'cover') {
                [radio, dialogue].forEach(p => p.style.display = 'none');
                weapons.style.opacity = '0.4';
            } else if (mode === 'garage' || mode === 'start') {
                root.style.display = 'none';
            } else {
                root.style.display = 'block';
                weapons.style.opacity = '1';
            }
        },
        showDialogue(name, text) { dialogue.innerText = `${name}: ${text}`; }
    };
}
