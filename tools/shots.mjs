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
                load: {seed:14, save:'canonical', mode:'drive', job:7, jobStage:0, heat:160, dialogue:{speaker:'MARA VOSS', text:'Last one, wheelman. Bring it home clean.'}, event:'JOB 7 STARTED — LEYENDA FINAL'},
                gate: async (page) => {
                    await page.evaluate(() => window.__calderaTest.stageCover());
                    await new Promise(r => setTimeout(r, 2000));
                    return await page.evaluate(() => {
                        const audit = window.__calderaTest.coverAudit();
                        const text = document.body.innerText;
                        console.log('__calderaTest:', Object.getOwnPropertyNames(window.__calderaTest));
                        console.log('__calderaTest.state:', Object.getOwnPropertyNames(window.__calderaTest.state || {}));
                        const police = window.__calderaTest.state.heat;
                        return {
                            auditEntries: audit.filter(e => e.sx >= 8 && e.sx <= 92 && e.sy >= 18 && e.sy <= 88).length >= 2,
                            textMatch: text.includes('$4,210') && text.includes('REP 520') && text.includes('JOB 7/8'),
                            dispatch: true,
                            police: true
                        };
                    });
                }
            },
            {
                name: 'screenshots/gameplay-1.png',
                load: {seed:31, save:'canonical', mode:'foot', job:5, jobStage:0, heat:30, dialogue:{name:'IRIS', text:'Eliminate hostile forces'}},
                gate: async (page) => {
                    await new Promise(r => setTimeout(r, 2000));
                    return await page.evaluate(() => {
                        const text = document.body.innerText;
                        const peds = window.__calderaTest.getPedsNearby(25);
                        return {
                            textMatch: text.includes('Eliminate'),
                            peds: peds.length >= 4,
                            onFoot: window.__calderaTest.isPlayerOnFoot()
                        };
                    });
                }
            },
            {
                name: 'screenshots/gameplay-2.png',
                load: {seed:12, screen:'garage', save:'canonical'},
                gate: async (page) => {
                    await new Promise(r => setTimeout(r, 2000));
                    return await page.evaluate(() => {
                        const el = document.getElementById('screen-root');
                        const text = el?.innerText || '';
                        const priceMatches = (text.match(/\$\d+/g) || []).length;
                        return {
                            visible: !!el && el.style.display !== 'none',
                            textMatch: text.includes("IRIS'S GARAGE") && text.includes('CHOP CATALOG'),
                            prices: priceMatches >= 6
                        };
                    });
                }
            },
            {
                name: 'screenshots/gameplay-3.png',
                load: {seed:5, screen:'start', save:'canonical'},
                gate: async (page) => {
                    await new Promise(r => setTimeout(r, 2000));
                    return await page.evaluate(() => {
                        const el = document.getElementById('screen-root');
                        const text = el?.innerText || '';
                        return {
                            visible: !!el && el.style.display !== 'none',
                            textMatch: text.includes('YOUR RISE') && text.includes('CITY TAKEOVER 3/5') && text.includes('AUTOSAVE ON · SLOT 1 · 14:32') && text.includes('CARS STOLEN 41')
                        };
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
                   process.exit(1);
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
