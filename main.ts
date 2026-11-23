import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Resolve module directory and target output path
const currentModulePath = fileURLToPath(import.meta.url);
const baseDir = dirname(currentModulePath);
const targetOutputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// Ensure the root output directory exists
mkdirSync(targetOutputDir, { recursive: true });

// Helper to copy directory if source exists
function copyDirectoryAssets(srcSubpath: string, destSubpath: string) {
  const sourcePath = join(baseDir, srcSubpath);
  const destinationPath = join(targetOutputDir, destSubpath);
  if (existsSync(sourcePath)) {
    mkdirSync(destinationPath, { recursive: true });
    cpSync(sourcePath, destinationPath, { recursive: true });
  }
}

// Copy game files and screenshots
copyDirectoryAssets('game', 'game');
copyDirectoryAssets('screenshots', 'screenshots');

// Construct capabilities object for dossier generation
const createCaps = () => ({
  text_max_bytes: 163840,
  screenshots: {
    max: 4,
    max_bytes: 262144,
  },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

// Generate and write dossier.json
const dossierBytes = buildDossier(targetOutputDir, createCaps());
writeFileSync(join(targetOutputDir, 'dossier.json'), dossierBytes);
