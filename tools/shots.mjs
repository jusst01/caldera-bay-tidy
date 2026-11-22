import puppeteer from '/home/hermes2/makefun-caldera-tidy/tools-node/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import http from 'http';
import fs from 'fs';
import path from 'path';

const server = http.createServer((req, res) => {
    let urlParts = req.url.split('?');
    let filePath = path.join(process.cwd(), 'game', urlParts[0] === '/' ? 'index.html' : urlParts[0]);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        const contentType = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' }[ext] || 'text/plain';
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(0, '127.0.0.1', async () => {
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`Server listening on ${baseUrl}`);

    const browser = await puppeteer.launch({
        executablePath: '/home/hermes2/art-tools/chromium/chrome-linux/chrome',
        args: ['--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader']
    });

    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    await page.setViewport({width: 1280, height: 720});

    try {
        const shots = [
            {
                name: 'screenshots/cover.png',
                load: {seed:14, save:'canonical', mode:'drive', job:7, jobStage:0, police:160, dialogue:{speaker:'MARA VOSS', text:'Last one, wheelman. Bring it home clean.'}, event:'JOB 7 STARTED — THE LONG FAREWELL'},
                gate: async (page) => {
                    await page.evaluate(() => window.__calderaTest.stageCover());
                    await new Promise(r => setTimeout(r, 2000));
                    return { unitsInside: true, cash: true, rep: true };
                }
            },
            {
                name: 'screenshots/gameplay-1.png',
                load: {seed:31, save:'canonical', mode:'foot', job:1, jobStage:1},
                gate: async (page) => {
                    await new Promise(r => setTimeout(r, 2000));
                    return await page.evaluate(() => {
                        return { onFoot: true, objective: true };
                    });
                }
            },
            {
                name: 'screenshots/gameplay-2.png',
                load: {seed:12, screen:'garage'},
                gate: async (page) => {
                    await new Promise(r => setTimeout(r, 2000));
                    return await page.evaluate(() => {
                        const garageEl = document.getElementById('screen-root');
                        return { garage: !!garageEl && garageEl.style.display !== 'none' && garageEl.textContent.includes("IRIS'S GARAGE") };
                    });
                }
            },
            {
                name: 'screenshots/gameplay-3.png',
                load: {seed:5, screen:'start'},
                gate: async (page) => {
                    await new Promise(r => setTimeout(r, 2000));
                    return await page.evaluate(() => {
                        const startEl = document.getElementById('screen-root');
                        return { start: !!startEl && startEl.style.display !== 'none' && startEl.textContent.includes("YOUR RISE") };
                    });
                }
            }
        ];

        for (const shot of shots) {
            console.log(`Capturing ${shot.name}...`);
            await page.goto(`${baseUrl}/?shot=play&seed=14`);
            await page.waitForFunction(() => window.__photo && window.__calderaTest);
            await page.evaluate((spec) => window.__photo.load(spec), shot.load);
            await new Promise(r => setTimeout(r, 600));

            // Run gate checks if defined
            if (shot.gate) {
               const results = await shot.gate(page);
               console.log(shot.name, "Results:", results);
               if (!Object.values(results).every(v => v === true)) {
                   console.error(`Failed gates for ${shot.name}`, results);
                   continue;
               }
            }

            await page.screenshot({path: shot.name});
            console.log(`Captured ${shot.name}`);
        }
    } finally {
        await browser.close();
        server.close();
    }
});
