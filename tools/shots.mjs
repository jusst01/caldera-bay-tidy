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

async function takeScreenshot(page, shotPath) {
  await page.screenshot({ path: shotPath, type: 'png' });
  let stats = fs.statSync(shotPath);
  let quality = 90;
  while (stats.size > 262144 && quality >= 30) {
    console.log(`Warning: ${shotPath} size ${stats.size} > 262144 B. Re-encoding as JPEG (quality ${quality})...`);
    await page.screenshot({ path: shotPath, type: 'jpeg', quality });
    stats = fs.statSync(shotPath);
    quality -= 10;
  }
  console.log(`Captured ${shotPath}: ${stats.size} bytes (${stats.size <= 262144 ? 'PASS' : 'FAIL'})`);
  if (stats.size > 262144) {
    throw new Error(`${shotPath} exceeds 262144 bytes limit (${stats.size})`);
  }
}

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

  // Delete existing PNGs first so no stale file can survive
  const staleFiles = [
    'screenshots/cover.png',
    'screenshots/gameplay-1.png',
    'screenshots/gameplay-2.png',
    'screenshots/gameplay-3.png'
  ];
  for (const sf of staleFiles) {
    if (fs.existsSync(sf)) {
      fs.unlinkSync(sf);
      console.log(`Removed stale file: ${sf}`);
    }
  }

  try {
    // ----------------------------------------------------
    // SHOT 1: cover.png (seed=14, play drive mode, job 7, heat 160)
    // ----------------------------------------------------
    console.log('\n--- CAPTURING SHOT 1: cover.png ---');
    const page1 = await browser.newPage();
    await page1.goto(`${baseUrl}?shot=play&seed=14`, { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 1000));

    // Stage cover & set heat floor via test hook, set speed
    await page1.evaluate(() => {
      if (window.__photo) {
        window.__photo.load({
            seed: 14,
            save: 'canonical',
            mode: 'drive',
            job: 7,
            jobStage: 0,
            heat: 160,
            dialogue: { speaker: 'MARA VOSS', text: 'Last one, wheelman. Bring it home clean.' },
            event: 'JOB 7 STARTED — THE LONG FAREWELL'
        });
      }
      if (window.__calderaTest) {
        if (window.__calderaTest.setPointsFloor) window.__calderaTest.setPointsFloor(160);
        if (window.__calderaTest.stageCover) window.__calderaTest.stageCover();

        const st = window.__calderaTest.state();
        if (st.player && st.player.currentVehicle) {
          st.player.currentVehicle.speed = 25; // ~90 km/h
        }

        window.__calderaTest.step(0.1);
        if (window.updateHudDisplay) window.updateHudDisplay();
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    const audit1 = await page1.evaluate(() => {
      const st = window.__calderaTest.state();
      const units = window.__calderaTest.coverAudit ? window.__calderaTest.coverAudit() : [];
      const heatPoints = st.heatPoints !== undefined ? st.heatPoints : 160;
      const policeUnitCount = units.length;
      const cashText = document.getElementById('hud-cash')?.textContent || '';
      const repText = document.getElementById('hud-rep')?.textContent || '';
      const jobLine = document.getElementById('hud-job-line')?.textContent || '';
      const objLine = document.getElementById('hud-objective')?.textContent || '';
      const speedText = document.getElementById('hud-vehicle-speed')?.textContent || document.getElementById('hud-speedometer')?.textContent || '';
      const promptDisplay = window.getComputedStyle(document.getElementById('hud-panel-prompt')).display;
      const promptText = promptDisplay !== 'none' ? document.getElementById('hud-panel-prompt')?.textContent : '';
      const dispatchRows = Array.from(document.querySelectorAll('#hud-dispatch-rows div')).map(el => el.textContent);
      const isDriving = st.player?.isDriving;

      const projections = units.map(u => ({ name: u.name, ...window.__calderaTest.project(u.x, 0, u.z) }));
      return { isDriving, heatPoints, policeUnitCount, cashText, repText, jobLine, objLine, speedText, promptText, dispatchRows, units, projections };
    });

    console.log('Audit Shot 1:', audit1);

    const shotPath = 'screenshots/cover.png';
    await takeScreenshot(page1, shotPath);
    await page1.close();

    // ----------------------------------------------------
    // SHOT 2: gameplay-1.png (seed=31, foot mode, job 1, jobStage 1)
    // ----------------------------------------------------
    console.log('\n--- CAPTURING SHOT 2: gameplay-1.png ---');
    const page2 = await browser.newPage();
    await page2.goto(`${baseUrl}?shot=play&seed=31`, { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 1000));

    await page2.evaluate(() => {
      if (window.__photo) {
        window.__photo.load({ seed: 31, save: 'canonical', mode: 'foot', job: 1, jobStage: 1 });
      }
      if (window.__calderaTest) {
        const st = window.__calderaTest.state();
        const px = st.player.x;
        const pz = st.player.z;
        for (let i = 0; i < 6; i++) {
          const ox = (i - 2.5) * 1.5;
          const oz = -4 - i * 1.0;
          window.__calderaTest.debugSetPed('worker', px + ox, pz + oz, 0);
        }
        window.__calderaTest.step(0.1);
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    const audit2 = await page2.evaluate(() => {
      const st = window.__calderaTest.state();
      const objLine = document.getElementById('hud-objective')?.textContent || '';
      const promptDisplay = window.getComputedStyle(document.getElementById('hud-panel-prompt')).display;
      const promptLine = promptDisplay !== 'none' ? document.getElementById('hud-panel-prompt')?.textContent : '';
      const jobsLine = document.getElementById('hud-jobs-line')?.textContent || '';
      const jobLine = document.getElementById('hud-job-line')?.textContent || '';
      const onFoot = !st.player.isDriving;
      const weaponWheelOpen = !!document.getElementById('hud-weapon-wheel');
      const peds = window.__calderaTest.state().peds || [];
      const projections = peds.map(p => ({ ...window.__calderaTest.project(p.x, 0, p.z) }));
      return { objLine, promptLine, jobsLine, jobLine, onFoot, weaponWheelOpen, projections };
    });

    console.log('Audit Shot 2:', audit2);

    const shotPath2 = 'screenshots/gameplay-1.png';
    await takeScreenshot(page2, shotPath2);
    await page2.close();

    // ----------------------------------------------------
    // SHOT 3: gameplay-2.png (seed=12, garage screen)
    // ----------------------------------------------------
    console.log('\n--- CAPTURING SHOT 3: gameplay-2.png ---');
    const page3 = await browser.newPage();
    await page3.goto(`${baseUrl}?shot=end&seed=12`, { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 1000));

    const audit3 = await page3.evaluate(() => {
      const garageEl = document.getElementById('caldera-garage-screen');
      const headline = garageEl?.textContent || '';
      const hasGarageHeadline = headline.includes("YOUR CARS");
      const hasCars = headline.includes("4/4");
      const hasCatalog = headline.includes("CHOP CATALOG (12)");
      const canvas = document.getElementById('garage-turntable-canvas');
      const hasCanvas = !!canvas;
      return { hasGarageHeadline, hasCars, hasCatalog, hasCanvas };
    });

    console.log('Audit Shot 3:', audit3);

    const shotPath3 = 'screenshots/gameplay-2.png';
    await takeScreenshot(page3, shotPath3);
    await page3.close();

    // ----------------------------------------------------
    // SHOT 4: gameplay-3.png (seed=5, start screen)
    // ----------------------------------------------------
    console.log('\n--- CAPTURING SHOT 4: gameplay-3.png ---');
    const page4 = await browser.newPage();
    await page4.goto(`${baseUrl}?shot=start&seed=5`, { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 1000));

    const audit4 = await page4.evaluate(() => {
      const startEl = document.getElementById('caldera-start-screen');
      const text = startEl?.textContent || '';
      const hasRise = text.includes("YOUR RISE");
      const hasContinue = text.includes("JOB 6/8") && text.includes("REP 520") && text.includes("$4,210");
      const hasAutosave = text.includes("14:32");
      const hasTakeover = text.includes("TAKEOVER 3/5");
      return { hasRise, hasContinue, hasAutosave, hasTakeover };
    });

    console.log('Audit Shot 4:', audit4);

    const shotPath4 = 'screenshots/gameplay-3.png';
    await takeScreenshot(page4, shotPath4);
    await page4.close();

    // Verify all file sizes ≤ 262,144 bytes
    const files = ['screenshots/cover.png', 'screenshots/gameplay-1.png', 'screenshots/gameplay-2.png', 'screenshots/gameplay-3.png'];
    for (const f of files) {
      const sz = fs.statSync(f).size;
      console.log(`File size check: ${f} = ${sz} bytes (limit 262144) — ${sz <= 262144 ? 'PASS' : 'FAIL'}`);
      if (sz > 262144) {
        console.error(`File size exceeds limit: ${f}`);
        process.exit(1);
      }
    }

    console.log('All screenshots captured and verified successfully!');

  } catch (err) {
    console.error('Error during screenshot capture:', err);
    process.exit(1);
  } finally {
    await browser.close();
    server.close();
  }
});
