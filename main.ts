// CALDERA BAY
// A make.fun gta6-01 entry.
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { buildDossier } from './vendor/makefun-game.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function setupOutput() {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const gameOut = path.join(outDir, 'game');
  if (!fs.existsSync(gameOut)) {
    fs.mkdirSync(gameOut, { recursive: true });
  }
  // Copy game/
  fs.cpSync(path.join(__dirname, 'game'), gameOut, { recursive: true });

  // Copy screenshots/
  const ssIn = path.join(__dirname, 'screenshots');
  if (fs.existsSync(ssIn)) {
    const ssOut = path.join(outDir, 'screenshots');
    if (!fs.existsSync(ssOut)) fs.mkdirSync(ssOut, { recursive: true });
    fs.cpSync(ssIn, ssOut, { recursive: true });
  }

  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000
  });
}

setupOutput();
