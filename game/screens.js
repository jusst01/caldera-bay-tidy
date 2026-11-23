const VEHICLE_ROSTER = [
  { id: 1, name: 'Zorro GT 86', topSpeed: 180, grip: 0.8, class: 'sport', chop: 500 },
  { id: 2, name: 'Corsario S 91', topSpeed: 190, grip: 0.85, class: 'sport', chop: 600 },
  { id: 3, name: 'Mula 74', topSpeed: 120, grip: 0.6, class: 'truck', chop: 300 },
  { id: 4, name: 'Sirena 100', topSpeed: 200, grip: 0.9, class: 'sport', chop: 700 },
  { id: 5, name: 'Patrol Cruiser', topSpeed: 160, grip: 0.7, class: 'police', chop: 0 },
  { id: 6, name: 'SWAT Van', topSpeed: 100, grip: 0.5, class: 'SWAT', chop: 0 },
  { id: 7, name: 'Police Heli', topSpeed: 150, grip: 0.4, class: 'heli', chop: 0 },
  { id: 8, name: 'Sedan A', topSpeed: 140, grip: 0.7, class: 'sedan', chop: 200 },
  { id: 9, name: 'Sedan B', topSpeed: 145, grip: 0.7, class: 'sedan', chop: 250 },
  { id: 10, name: 'Coupe A', topSpeed: 160, grip: 0.8, class: 'sport', chop: 400 },
  { id: 11, name: 'SUV A', topSpeed: 130, grip: 0.6, class: 'suv', chop: 350 },
  { id: 12, name: 'Truck A', topSpeed: 110, grip: 0.5, class: 'truck', chop: 300 }
];

function getRoot() {
  return document.getElementById('screen-root');
}

function createContainer() {
  const root = getRoot();
  root.innerHTML = '';
  root.style.display = 'block';
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.zIndex = '10';
  container.style.background = 'rgb(11,14,20)';
  container.style.color = 'white';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.padding = '40px';
  root.appendChild(container);
  return container;
}

export function closeCurrentScreen() {
  const root = getRoot();
  root.innerHTML = '';
  root.style.display = 'none';
}

export function openMenu({title, build}) {
  const container = createContainer();
  const titleEl = document.createElement('h1');
  titleEl.innerText = title;
  container.appendChild(titleEl);
  const menuContainer = document.createElement('div');
  container.appendChild(menuContainer);
  const rows = build();
  rows.forEach((row, index) => {
    const rowEl = document.createElement('div');
    rowEl.innerText = `${index + 1}. ${row.label} - ${row.detail || ''}`;
    if (row.disabled) rowEl.style.opacity = '0.5';
    else rowEl.onclick = row.action;
    menuContainer.appendChild(rowEl);
  });
}

export function openStartScreen(save, {onContinue, onNewGame}) {
  const container = createContainer();
  container.style.flexDirection = 'row';

  const left = document.createElement('div');
  left.style.flex = '1';
  container.appendChild(left);

  const title = document.createElement('h1');
  title.innerText = 'CALDERA BAY';
  title.style.fontSize = '72px';
  left.appendChild(title);

  const subline = document.createElement('p');
  subline.innerText = '8 JOBS · 5 DISTRICTS · ONE CITY TO TAKE';
  left.appendChild(subline);

  const continueBtn = document.createElement('button');
  continueBtn.innerText = `CONTINUE — JOB ${save.missionIndex + 1}/8 · REP ${save.rep} · $${save.cash.toLocaleString()}`;
  continueBtn.onclick = onContinue;
  left.appendChild(continueBtn);

  const newGameBtn = document.createElement('button');
  newGameBtn.innerText = 'NEW GAME';
  newGameBtn.onclick = onNewGame;
  left.appendChild(newGameBtn);

  const autosave = document.createElement('p');
  autosave.innerText = `AUTOSAVE ON · SLOT 1 · ${save.lastSaveClock}`;
  left.appendChild(autosave);

  const right = document.createElement('div');
  right.style.flex = '1';
  container.appendChild(right);

  const yourRise = document.createElement('h2');
  yourRise.innerText = 'YOUR RISE';
  right.appendChild(yourRise);

  const REP_TIERS = [
    { name: 'Nobody', min: 0 },
    { name: 'Runner', min: 100 },
    { name: 'Wheelman', min: 250 },
    { name: 'Fixer', min: 500 },
    { name: 'Broker', min: 900 },
    { name: 'Leyenda', min: 1400 }
  ];

  REP_TIERS.forEach(tier => {
    const tierEl = document.createElement('div');
    tierEl.innerText = `${tier.name} ${tier.min}`;
    if (save.rep >= tier.min) tierEl.style.fontWeight = 'bold';
    right.appendChild(tierEl);
  });

  const jobsTitle = document.createElement('h3');
  jobsTitle.innerText = 'JOBS';
  right.appendChild(jobsTitle);

  for(let i=0; i<8; i++) {
    const jobEl = document.createElement('div');
    const name = save.jobNames && save.jobNames[i] ? save.jobNames[i] : `JOB ${i+1}`;
    let status = 'LOCKED';
    if(i < save.jobsDone) status = 'DONE';
    else if(i === save.jobsDone) status = 'NEXT';
    jobEl.innerText = `${name} (${status})`;
    right.appendChild(jobEl);
  }

  const takeoverCount = Object.values(save.takeover).filter(v => v > 30).length;
  const takeoverTitle = document.createElement('h3');
  takeoverTitle.innerText = `CITY TAKEOVER ${takeoverCount}/5`;
  right.appendChild(takeoverTitle);

  const districts = ['muelle', 'paseo', 'verde', 'ceniza', 'cumbre'];
  districts.forEach(d => {
    const chip = document.createElement('span');
    chip.innerText = `${d.toUpperCase()} ${save.takeover[d]}%`;
    chip.style.marginRight = '10px';
    right.appendChild(chip);
  });

  const stats = document.createElement('p');
  stats.innerText = `CARS STOLEN ${save.stats.carsStolen} · TOP SPEED ${save.stats.topSpeed} · MAX HEAT ${save.stats.maxHeat}`;
  right.appendChild(stats);
}

export function openGarageScreen(save, callbacks) {
  const container = createContainer();
  const header = document.createElement('h1');
  header.innerText = 'IRIS\'S GARAGE — CHOP & REPAIR';
  container.appendChild(header);

  const main = document.createElement('div');
  main.style.display = 'flex';
  container.appendChild(main);

  const left = document.createElement('div');
  left.style.flex = '1';
  main.appendChild(left);
  left.innerText = `YOUR CARS (${save.ownedCars.length}/4)`;
  save.ownedCars.forEach((car, i) => {
    const row = document.createElement('div');
    row.innerText = `${car.name} ${car.condition}%`;

    const repairBtn = document.createElement('button');
    repairBtn.innerText = 'REPAIR $80';
    repairBtn.onclick = () => callbacks.repair?.(i);
    row.appendChild(repairBtn);

    const rollOutBtn = document.createElement('button');
    rollOutBtn.innerText = 'ROLL OUT';
    rollOutBtn.onclick = () => callbacks.rollOut?.(i);
    row.appendChild(rollOutBtn);

    const chopBtn = document.createElement('button');
    chopBtn.innerText = 'CHOP';
    chopBtn.onclick = () => callbacks.chop?.(i);
    row.appendChild(chopBtn);

    left.appendChild(row);
  });

  const centre = document.createElement('div');
  centre.style.flex = '1';
  main.appendChild(centre);

  if (save.ownedCars.length > 0) {
    const selected = save.ownedCars[0];
    const carDetails = VEHICLE_ROSTER.find(v => v.name === selected.name);
    if(carDetails) {
      const nameEl = document.createElement('h2');
      nameEl.innerText = selected.name;
      nameEl.style.fontSize = '32px';
      centre.appendChild(nameEl);
      centre.appendChild(document.createElement('div')).innerText = `Top Speed: ${carDetails.topSpeed}`;
      centre.appendChild(document.createElement('div')).innerText = `Grip: ${carDetails.grip}`;
      centre.appendChild(document.createElement('div')).innerText = `Class: ${carDetails.class}`;
    }
  }

  const right = document.createElement('div');
  right.style.flex = '1';
  main.appendChild(right);
  right.innerText = 'CHOP CATALOG (12)';
  VEHICLE_ROSTER.forEach(v => {
    const item = document.createElement('div');
    const price = (v.class === 'police' || v.class === 'SWAT' || v.class === 'heli' || v.chop === 0) ? 'TOO HOT' : `$${v.chop}`;
    item.innerText = `${v.name} - ${price}`;
    right.appendChild(item);
  });

  const footer = document.createElement('div');
  footer.innerText = `CASH: $${save.cash} · REP: ${save.rep} · BACK TO CITY [ESC]`;
  container.appendChild(footer);
}
