import path from 'node:path';
import { ensureDir } from './utils.mjs';
import { scanPortfolio } from './portfolio.mjs';
import { scanMotion } from './motion.mjs';
import { createWatchers } from './watcher.mjs';

const ROOT = process.cwd();
const PUB  = path.join(ROOT, 'public');
const PORTFOLIO = path.join(PUB, 'Portfolio');
const MOTION    = path.join(PUB, 'Motion');
const COVERS_OUT = path.join(PUB, '_covers');
const REGISTRY   = path.join(ROOT, 'data', 'videos-registry.json');
const WATCH = process.argv.includes('--watch');

export async function run() {
  await ensureDir(PUB);
  await ensureDir(COVERS_OUT);
  await scanPortfolio({ PUB, PORTFOLIO, COVERS_OUT });
  await scanMotion({ MOTION, REGISTRY });
  console.log('[gen] manifests updated');
}

if (WATCH) {
  createWatchers({ PORTFOLIO, MOTION, REGISTRY, run });
} else {
  run().catch(e => { console.error(e); process.exit(1); });
}
