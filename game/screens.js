// game/screens.js
import { VEHICLE_ROSTER } from './vehicles.js';

let activeEscListener = null;

export function closeCurrentScreen() {
    const root = document.getElementById('screen-root');
    if (root) {
        root.innerHTML = '';
        root.style.display = 'none';
        root.style.pointerEvents = 'none';
    }
    if (activeEscListener) {
        window.removeEventListener('keydown', activeEscListener);
        activeEscListener = null;
    }
}

function setupScreenRoot() {
    const root = document.getElementById('screen-root');
    if (!root) return null;
    root.innerHTML = '';
    root.style.position = 'fixed';
    root.style.left = '0';
    root.style.top = '0';
    root.style.width = '100%';
    root.style.height = '100%';
    root.style.zIndex = '10';
    root.style.background = 'rgb(11, 14, 20)';
    root.style.color = '#f0f3f6';
    root.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    root.style.display = 'flex';
    root.style.flexDirection = 'column';
    root.style.boxSizing = 'border-box';
    root.style.pointerEvents = 'auto';
    return root;
}

export function openMenu({ title, build }) {
    const root = setupScreenRoot();
    if (!root) return;

    const container = document.createElement('div');
    container.style.cssText = 'max-width: 600px; margin: auto; padding: 40px; background: rgba(20, 24, 33, 0.95); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; width: 100%;';

    const h1 = document.createElement('h1');
    h1.textContent = title;
    h1.style.cssText = 'margin-top: 0; font-size: 28px; letter-spacing: 1px; color: #fff; margin-bottom: 24px;';
    container.appendChild(h1);

    const listEl = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';

    function renderRows() {
        listEl.innerHTML = '';
        const rows = build();
        rows.forEach((row, idx) => {
            const rowDiv = document.createElement('div');
            rowDiv.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; margin-bottom: 8px; background: ${row.disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)'}; border-radius: 4px; cursor: ${row.disabled ? 'not-allowed' : 'pointer'}; opacity: ${row.disabled ? 0.5 : 1};`;

            const left = document.createElement('div');
            left.innerHTML = `<span style="opacity: 0.5; margin-right: 12px;">[${idx + 1}]</span><strong>${row.label}</strong>`;
            if (row.detail) {
                left.innerHTML += ` <span style="opacity: 0.6; font-size: 14px; margin-left: 8px;">${row.detail}</span>`;
            }
            rowDiv.appendChild(left);

            if (!row.disabled && row.action) {
                rowDiv.addEventListener('click', () => {
                    row.action();
                    renderRows();
                });
            }
            listEl.appendChild(rowDiv);
        });
    }

    container.appendChild(listEl);
    root.appendChild(container);

    activeEscListener = (e) => {
        if (e.key === 'Escape') {
            closeCurrentScreen();
        } else {
            const num = parseInt(e.key, 10);
            if (!isNaN(num)) {
                const rows = build();
                if (rows[num - 1] && !rows[num - 1].disabled && rows[num - 1].action) {
                    rows[num - 1].action();
                    renderRows();
                }
            }
        }
    };
    window.addEventListener('keydown', activeEscListener);
}

export function openStartScreen(save, { onContinue, onNewGame }) {
    const root = setupScreenRoot();
    if (!root) return;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; width: 100%; height: 100%; padding: 40px; box-sizing: border-box; justify-content: space-between;';

    // Left Column
    const leftCol = document.createElement('div');
    leftCol.style.cssText = 'flex: 1; display: flex; flex-direction: column; justify-content: center; padding-right: 40px;';

    const title = document.createElement('h1');
    title.textContent = 'CALDERA BAY';
    title.style.cssText = 'font-size: 72px; font-weight: 900; margin: 0 0 10px 0; letter-spacing: -2px; color: #fff;';
    leftCol.appendChild(title);

    const skyline = document.createElement('div');
    skyline.style.cssText = 'height: 60px; background: linear-gradient(90deg, #ff4e50, #f9d423); opacity: 0.8; margin-bottom: 20px; border-radius: 4px;';
    leftCol.appendChild(skyline);

    const subline = document.createElement('p');
    subline.textContent = '8 JOBS · 5 DISTRICTS · ONE CITY TO TAKE';
    subline.style.cssText = 'font-size: 16px; letter-spacing: 2px; color: #a0aec0; margin-bottom: 40px;';
    leftCol.appendChild(subline);

    const formattedCash = (save.cash || 0).toLocaleString();
    const continueBtn = document.createElement('button');
    continueBtn.textContent = `CONTINUE — JOB ${(save.missionIndex || 0) + 1}/8 · REP ${save.rep || 0} · $${formattedCash}`;
    continueBtn.style.cssText = 'padding: 20px; font-size: 18px; font-weight: bold; background: #3182ce; color: white; border: none; border-radius: 6px; cursor: pointer; margin-bottom: 12px; text-align: left;';
    continueBtn.onclick = onContinue;
    leftCol.appendChild(continueBtn);

    const newGameBtn = document.createElement('button');
    newGameBtn.textContent = 'NEW GAME';
    newGameBtn.style.cssText = 'padding: 20px; font-size: 18px; font-weight: bold; background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 6px; cursor: pointer; text-align: left;';
    newGameBtn.onclick = onNewGame;
    leftCol.appendChild(newGameBtn);

    const autosaveInfo = document.createElement('p');
    autosaveInfo.textContent = `AUTOSAVE ON · SLOT 1 · ${save.lastSaveClock || '00:00'}`;
    autosaveInfo.style.cssText = 'margin-top: 20px; font-size: 14px; color: #718096;';
    leftCol.appendChild(autosaveInfo);

    wrapper.appendChild(leftCol);

    // Right Column
    const rightCol = document.createElement('div');
    rightCol.style.cssText = 'flex: 1; display: flex; flex-direction: column; justify-content: center; background: rgba(0,0,0,0.2); padding: 30px; border-radius: 8px;';

    const riseTitle = document.createElement('h2');
    riseTitle.textContent = 'YOUR RISE';
    riseTitle.style.cssText = 'margin-top: 0; font-size: 20px; letter-spacing: 1px; margin-bottom: 15px;';
    rightCol.appendChild(riseTitle);

    const tiers = [
        { name: 'Nobody', rep: 0 },
        { name: 'Runner', rep: 100 },
        { name: 'Wheelman', rep: 250 },
        { name: 'Fixer', rep: 500 },
        { name: 'Broker', rep: 900 },
        { name: 'Leyenda', rep: 1400 }
    ];
    const repVal = save.rep || 0;
    const tiersContainer = document.createElement('div');
    tiersContainer.style.cssText = 'display: flex; gap: 4px; margin-bottom: 20px;';
    tiers.forEach(t => {
        const isCurrent = repVal >= t.rep;
        const tierEl = document.createElement('div');
        tierEl.style.cssText = `flex: 1; padding: 8px 4px; background: ${isCurrent ? '#3182ce' : 'rgba(255,255,255,0.05)'}; border-radius: 4px; text-align: center; font-size: 12px;`;
        tierEl.innerHTML = `<strong>${t.name}</strong><br><span style="font-size:10px; opacity:0.7;">${t.rep}</span>`;
        tiersContainer.appendChild(tierEl);
    });
    rightCol.appendChild(tiersContainer);

    // Jobs
    const jobsTitle = document.createElement('h3');
    jobsTitle.textContent = 'JOBS';
    jobsTitle.style.cssText = 'font-size: 16px; margin: 0 0 8px 0;';
    rightCol.appendChild(jobsTitle);

    const jobsContainer = document.createElement('div');
    jobsContainer.style.cssText = 'display: flex; gap: 4px; margin-bottom: 20px;';
    const jobsDone = save.jobsDone || 0;
    for (let i = 0; i < 8; i++) {
        const jobBox = document.createElement('div');
        const status = i < jobsDone ? 'DONE' : (i === jobsDone ? 'NEXT' : 'LOCKED');
        const bg = i < jobsDone ? '#2f855a' : (i === jobsDone ? '#d69e2e' : 'rgba(255,255,255,0.05)');
        jobBox.style.cssText = `flex: 1; padding: 6px; background: ${bg}; border-radius: 4px; text-align: center; font-size: 10px;`;
        jobBox.innerHTML = `JOB ${i+1}<br><strong>${status}</strong>`;
        jobsContainer.appendChild(jobBox);
    }
    rightCol.appendChild(jobsContainer);

    // City Takeover
    const takeover = save.takeover || {};
    const districts = [
        { key: 'muelle', name: 'MUELLE' },
        { key: 'paseo', name: 'PASEO' },
        { key: 'verde', name: 'VERDE' },
        { key: 'ceniza', name: 'CENIZA' },
        { key: 'cumbre', name: 'CUMBRE' }
    ];
    let takeoverCount = 0;
    districts.forEach(d => {
        if ((takeover[d.key] || 0) > 30) takeoverCount++;
    });

    const takeoverTitle = document.createElement('h3');
    takeoverTitle.textContent = `CITY TAKEOVER ${takeoverCount}/5`;
    takeoverTitle.style.cssText = 'font-size: 16px; margin: 0 0 8px 0;';
    rightCol.appendChild(takeoverTitle);

    const districtsContainer = document.createElement('div');
    districtsContainer.style.cssText = 'display: flex; gap: 6px; margin-bottom: 20px;';
    districts.forEach(d => {
        const val = takeover[d.key] || 0;
        const chip = document.createElement('div');
        chip.style.cssText = 'flex: 1; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; text-align: center; font-size: 11px;';
        chip.innerHTML = `${d.name}<br><strong>${val}%</strong>`;
        districtsContainer.appendChild(chip);
    });
    rightCol.appendChild(districtsContainer);

    // Stats
    const stats = save.stats || {};
    const statsLine = document.createElement('div');
    statsLine.textContent = `CARS STOLEN ${stats.carsStolen || 0} · TOP SPEED ${stats.topSpeed || 0} · MAX HEAT ${stats.maxHeat || 0}`;
    statsLine.style.cssText = 'font-size: 12px; color: #a0aec0; letter-spacing: 1px;';
    rightCol.appendChild(statsLine);

    wrapper.appendChild(rightCol);
    root.appendChild(wrapper);
}

export function openGarageScreen(save, callbacks = {}) {
    const root = setupScreenRoot();
    if (!root) return;

    const container = document.createElement('div');
    container.style.cssText = 'display: flex; flex-direction: column; width: 100%; height: 100%; padding: 30px; box-sizing: border-box;';

    // Headline
    const headline = document.createElement('h1');
    headline.textContent = "IRIS'S GARAGE — CHOP & REPAIR";
    headline.style.cssText = 'margin: 0 0 20px 0; font-size: 24px; letter-spacing: 1px;';
    container.appendChild(headline);

    // Main Content Grid
    const grid = document.createElement('div');
    grid.style.cssText = 'display: flex; gap: 20px; flex: 1; overflow: hidden;';

    // Left: Your Cars
    const leftCol = document.createElement('div');
    leftCol.style.cssText = 'flex: 1; background: rgba(0,0,0,0.2); padding: 20px; border-radius: 8px; display: flex; flex-direction: column;';

    const ownedCars = save.ownedCars || [];
    const carsTitle = document.createElement('h2');
    carsTitle.textContent = `YOUR CARS (${ownedCars.length}/4)`;
    carsTitle.style.cssText = 'margin-top: 0; font-size: 18px; margin-bottom: 15px;';
    leftCol.appendChild(carsTitle);

    const carsList = document.createElement('div');
    carsList.style.cssText = 'display: flex; flex-direction: column; gap: 10px; overflow-y: auto;';

    ownedCars.forEach((car, i) => {
        const carRow = document.createElement('div');
        carRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 6px;';

        const info = document.createElement('div');
        info.innerHTML = `<strong>${car.name || car}</strong><br><span style="font-size: 12px; opacity: 0.7;">Condition: ${car.condition || 100}%</span>`;
        carRow.appendChild(info);

        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display: flex; gap: 6px;';

        const repairBtn = document.createElement('button');
        repairBtn.textContent = 'REPAIR $80';
        repairBtn.style.cssText = 'padding: 6px 10px; background: #2f855a; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 11px;';
        repairBtn.onclick = () => callbacks.repair && callbacks.repair(i);
        btnGroup.appendChild(repairBtn);

        const rollOutBtn = document.createElement('button');
        rollOutBtn.textContent = 'ROLL OUT';
        rollOutBtn.style.cssText = 'padding: 6px 10px; background: #3182ce; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 11px;';
        rollOutBtn.onclick = () => callbacks.rollOut && callbacks.rollOut(i);
        btnGroup.appendChild(rollOutBtn);

        const chopBtn = document.createElement('button');
        chopBtn.textContent = 'CHOP';
        chopBtn.style.cssText = 'padding: 6px 10px; background: #c53030; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 11px;';
        chopBtn.onclick = () => callbacks.chop && callbacks.chop(i);
        btnGroup.appendChild(chopBtn);

        carRow.appendChild(btnGroup);
        carsList.appendChild(carRow);
    });
    leftCol.appendChild(carsList);
    grid.appendChild(leftCol);

    // Centre: Selected Car Details
    const centreCol = document.createElement('div');
    centreCol.style.cssText = 'flex: 1; background: rgba(0,0,0,0.2); padding: 20px; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;';

    const selectedCar = ownedCars[0] || { name: 'Zorro GT 86' };
    const carNameStr = typeof selectedCar === 'string' ? selectedCar : (selectedCar.name || 'Zorro GT 86');
    const rosterMatch = VEHICLE_ROSTER.find(v => v.name === carNameStr || v.id === carNameStr) || { topSpeed: 247, grip: 8.5, class: 'sport' };

    const selectedTitle = document.createElement('h2');
    selectedTitle.textContent = carNameStr;
    selectedTitle.style.cssText = 'font-size: 30px; font-weight: bold; margin-bottom: 20px; color: #fff;';
    centreCol.appendChild(selectedTitle);

    const specs = document.createElement('div');
    specs.style.cssText = 'font-size: 14px; line-height: 1.8; opacity: 0.8;';
    specs.innerHTML = `TOP SPEED: <strong>${rosterMatch.topSpeed || 200} MPH</strong><br>GRIP: <strong>${rosterMatch.grip || 5.0}</strong><br>CLASS: <strong style="text-transform: uppercase;">${rosterMatch.class || 'Standard'}</strong>`;
    centreCol.appendChild(specs);

    grid.appendChild(centreCol);

    // Right: Chop Catalog
    const rightCol = document.createElement('div');
    rightCol.style.cssText = 'flex: 1; background: rgba(0,0,0,0.2); padding: 20px; border-radius: 8px; display: flex; flex-direction: column;';

    const catalogTitle = document.createElement('h2');
    catalogTitle.textContent = 'CHOP CATALOG (12)';
    catalogTitle.style.cssText = 'margin-top: 0; font-size: 18px; margin-bottom: 15px;';
    rightCol.appendChild(catalogTitle);

    const catalogList = document.createElement('div');
    catalogList.style.cssText = 'display: flex; flex-direction: column; gap: 8px; overflow-y: auto; flex: 1;';

    VEHICLE_ROSTER.forEach(v => {
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 4px; font-size: 13px;';

        const isTooHot = ['police', 'SWAT', 'heli'].includes(v.class) || !v.chop || v.chop === 0;
        const priceStr = isTooHot ? '<span style="color: #fc8181;">TOO HOT</span>' : `$${v.chop}`;

        item.innerHTML = `<span>${v.name}</span><strong>${priceStr}</strong>`;
        catalogList.appendChild(item);
    });

    rightCol.appendChild(catalogList);
    grid.appendChild(rightCol);

    container.appendChild(grid);

    // Footer
    const footer = document.createElement('div');
    footer.style.cssText = 'margin-top: 20px; display: flex; justify-content: space-between; font-size: 14px; opacity: 0.8; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px;';
    footer.innerHTML = `<div>CASH: $${save.cash || 0} &nbsp;&nbsp;|&nbsp;&nbsp; REP: ${save.rep || 0}</div><div>BACK TO CITY [ESC]</div>`;
    container.appendChild(footer);

    root.appendChild(container);

    activeEscListener = (e) => {
        if (e.key === 'Escape') {
            closeCurrentScreen();
        }
    };
    window.addEventListener('keydown', activeEscListener);
}
