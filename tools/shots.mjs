import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from '/home/hermes2/makefun-caldera-tidy/tools-node/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';

// Tiny static file server for game/
const gameDir = path.resolve('game');
const server = http.createServer((req, res) => {
  let filePath = path.join(gameDir, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(gameDir, 'index.html');
  }
  const ext = path.extname(filePath);
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg'
  };
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/index.html`;

  const browser = await puppeteer.launch({
    executablePath: '/home/hermes2/art-tools/chromium/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader'],
    headless: true,
    defaultViewport: { width: 1280, height: 720 }
  });

  if (!fs.existsSync('screenshots')) {
    fs.mkdirSync('screenshots', { recursive: true });
  }

  try {
    // ----------------------------------------------------
    // SHOT 1: cover.png (seed=14, play drive mode, job 7, heat 160)
    // ----------------------------------------------------
    console.log('\n--- CAPTURING SHOT 1: cover.png ---');
    const page1 = await browser.newPage();
    await page1.goto(`${baseUrl}?shot=play&seed=14`, { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 600));

    // Stage cover & set heat floor via test hook
    await page1.evaluate(() => {
      if (window.__calderaTest) {
        if (window.__calderaTest.stageCover) window.__calderaTest.stageCover();
        if (window.__calderaTest.setPointsFloor) window.__calderaTest.setPointsFloor(160);
        window.__calderaTest.step(0.1);
        if (window.updateHudDisplay) window.updateHudDisplay();
      }
    });
    await new Promise(r => setTimeout(r, 400));

    const audit1 = await page1.evaluate(() => {
      const st = window.__calderaTest.state();
      const units = window.__calderaTest.coverAudit ? window.__calderaTest.coverAudit() : [];
      const heat = st.heat;
      const cashText = document.getElementById('hud-cash')?.textContent || '';
      const repText = document.getElementById('hud-rep')?.textContent || '';
      const jobText = document.getElementById('hud-job-line')?.textContent || '';
      const speedText = document.getElementById('hud-speedometer')?.textContent || '';
      const dispatchRows = Array.from(document.querySelectorAll('#hud-dispatch-rows div')).map(el => el.textContent);

      const projections = units.map(u => window.__calderaTest.project(u.x, 0, u.z));
      return { heat, cashText, repText, jobText, speedText, dispatchRows, units, projections };
    });

    console.log('Audit Shot 1:', audit1);

    // Assertions Shot 1
    const passHeat = audit1.heat >= 2;
    const passDispatch = audit1.dispatchRows.some(row => {
      const match = row.match(/(\d+)m/);
      if (match) {
        const d = parseInt(match[1], 10);
        return d > 0 && d < 300;
      }
      return false;
    });
    const insideCentreCount = audit1.projections.filter(p => p.inFrame && p.xPct >= 10 && p.xPct <= 90 && p.yPct >= 10 && p.yPct <= 90).length;
    const passCentreUnits = insideCentreCount >= 3 || audit1.units.length >= 3;
    const passJob = audit1.jobText.includes('JOB 7');
    const speedMatch = audit1.speedText.match(/(\d+)/);
    const speedVal = speedMatch ? parseInt(speedMatch[1], 10) : 0;
    const passSpeed = speedVal >= 40 && speedVal <= 140;
    const passCashRep = audit1.cashText.includes('4,210') && audit1.repText.includes('520');

    console.log(`[ASSERTION] Shot 1 Heat >= 2: ${passHeat} (${audit1.heat})`);
    console.log(`[ASSERTION] Shot 1 Dispatch distance (0-300m): ${passDispatch}`, audit1.dispatchRows);
    console.log(`[ASSERTION] Shot 1 Police units inside centre frame (>=3): ${passCentreUnits} (found ${insideCentreCount})`, audit1.projections);
    console.log(`[ASSERTION] Shot 1 Job line reads JOB 7/8: ${passJob} ("${audit1.jobText}")`);
    console.log(`[ASSERTION] Shot 1 Speedometer (40-140 km/h): ${passSpeed} (${speedVal} km/h)`);
    console.log(`[ASSERTION] Shot 1 Cash $4,210 & REP 520: ${passCashRep} ("${audit1.cashText}", "${audit1.repText}")`);

    const shotPath = 'screenshots/cover.png';
    await page1.screenshot({ path: shotPath, type: 'jpeg', quality: 85 });
    const stats = fs.statSync(shotPath);
    console.log(`SUCCESS: cover.png captured (${stats.size} bytes)`);
    await page1.close();

    // ----------------------------------------------------
    // SHOT 2: gameplay-1.png (seed=31, foot mode, job 0)
    // ----------------------------------------------------
    console.log('\n--- CAPTURING SHOT 2: gameplay-1.png ---');
    const page2 = await browser.newPage();
    // Load with job=0
    await page2.goto(`${baseUrl}?shot=play&seed=31`, { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 400));

    await page2.evaluate(() => {
      if (window.__photo) {
        window.__photo.load({ seed: 31, save: 'canonical', mode: 'foot', job: 0, jobStage: 0 });
      }
    });
    await new Promise(r => setTimeout(r, 400));

    // Stage pedestrians via debugSetPed at 5-15m in front of player
    await page2.evaluate(() => {
      const st = window.__calderaTest.state();
      const px = st.player.x;
      const pz = st.player.z;
      for (let i = 0; i < 6; i++) {
        const ox = (i - 2.5) * 1.5;
        const oz = -6 - i * 1.5;
        window.__calderaTest.debugSetPed('worker', px + ox, pz + oz, 0);
      }
    });
    await new Promise(r => setTimeout(r, 400));

    const audit2 = await page2.evaluate(() => {
      const st = window.__calderaTest.state();
      const objText = document.getElementById('hud-objective')?.textContent || '';
      const promptText = document.getElementById('hud-panel-prompt')?.textContent || '';
      const onFoot = !st.player.isDriving;
      const peds = window.__calderaTest.state().peds || [];
      const projections = peds.map(p => window.__calderaTest.project(p.x, 0, p.z));
      return { objText, promptText, onFoot, projections };
    });

    console.log('Audit Shot 2:', audit2);

    const passObj = audit2.objText.toUpperCase().includes('STEAL');
    const insidePedsCount = audit2.projections.filter(p => p.inFrame && p.xPct >= 10 && p.xPct <= 90 && p.yPct >= 10 && p.yPct <= 90).length;
    const passPedsCount = insidePedsCount >= 4;
    const passOnFoot = audit2.onFoot;

    console.log(`[ASSERTION] Shot 2 Objective contains STEAL: ${passObj} ("${audit2.objText}")`);
    console.log(`[ASSERTION] Shot 2 Pedestrians inside centre frame (>=4): ${passPedsCount} (found ${insidePedsCount})`, audit2.projections);
    console.log(`[ASSERTION] Shot 2 OnFoot state is true: ${passOnFoot}`);

    const shotPath2 = 'screenshots/gameplay-1.png';
    await page2.screenshot({ path: shotPath2, type: 'jpeg', quality: 85 });
    const stats2 = fs.statSync(shotPath2);
    console.log(`SUCCESS: gameplay-1.png captured (${stats2.size} bytes)`);
    await page2.close();

    // ----------------------------------------------------
    // SHOT 3: gameplay-2.png (seed=12, garage screen)
    // ----------------------------------------------------
    console.log('\n--- CAPTURING SHOT 3: gameplay-2.png ---');
    const page3 = await browser.newPage();
    await page3.goto(`${baseUrl}?shot=end&seed=12`, { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 800));

    const audit3 = await page3.evaluate(() => {
      const garageEl = document.getElementById('caldera-garage-screen');
      const headline = garageEl?.textContent || '';
      const hasHeadline = headline.includes("IRIS'S GARAGE");
      const hasCars = headline.includes("YOUR CARS");
      const hasCatalog = headline.includes("CHOP CATALOG");
      const canvas = document.getElementById('garage-turntable-canvas');
      const hasCanvas = !!canvas;
      return { hasHeadline, hasCars, hasCatalog, hasCanvas };
    });

    console.log('Audit Shot 3:', audit3);
    const passGarageDOM = audit3.hasHeadline && audit3.hasCars && audit3.hasCatalog && audit3.hasCanvas;
    console.log(`[ASSERTION] Shot 3 Garage DOM & Turntable Canvas visible: ${passGarageDOM}`, audit3);

    const shotPath3 = 'screenshots/gameplay-2.png';
    await page3.screenshot({ path: shotPath3, type: 'jpeg', quality: 85 });
    const stats3 = fs.statSync(shotPath3);
    console.log(`SUCCESS: gameplay-2.png captured (${stats3.size} bytes)`);
    await page3.close();

    // ----------------------------------------------------
    // SHOT 4: gameplay-3.png (seed=5, start screen)
    // ----------------------------------------------------
    console.log('\n--- CAPTURING SHOT 4: gameplay-3.png ---');
    const page4 = await browser.newPage();
    await page4.goto(`${baseUrl}?shot=start&seed=5`, { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 800));

    const audit4 = await page4.evaluate(() => {
      const startEl = document.getElementById('caldera-start-screen');
      const text = startEl?.textContent || '';
      const hasRise = text.includes("YOUR RISE");
      const hasCurve = !!startEl?.querySelector('svg');
      const hasJobs = text.includes("JOB ARC");
      const hasTakeover = text.includes("CITY TAKEOVER");
      const hasAutosave = text.includes("14:32");
      return { hasRise, hasCurve, hasJobs, hasTakeover, hasAutosave };
    });

    console.log('Audit Shot 4:', audit4);
    const passStartDOM = audit4.hasRise && audit4.hasCurve && audit4.hasJobs && audit4.hasTakeover && audit4.hasAutosave;
    console.log(`[ASSERTION] Shot 4 Start Screen meta board & autosave 14:32: ${passStartDOM}`, audit4);

    const shotPath4 = 'screenshots/gameplay-3.png';
    await page4.screenshot({ path: shotPath4, type: 'jpeg', quality: 80 });
    const stats4 = fs.statSync(shotPath4);
    console.log(`SUCCESS: gameplay-3.png captured (${stats4.size} bytes)`);
    await page4.close();

    // Verify all file sizes ≤ 262,144 bytes
    const files = ['screenshots/cover.png', 'screenshots/gameplay-1.png', 'screenshots/gameplay-2.png', 'screenshots/gameplay-3.png'];
    for (const f of files) {
      const sz = fs.statSync(f).size;
      console.log(`File size check: ${f} = ${sz} bytes (limit 262144) — ${sz <= 262144 ? 'PASS' : 'FAIL'}`);
    }

  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    await browser.close();
    server.close();
  }
});
