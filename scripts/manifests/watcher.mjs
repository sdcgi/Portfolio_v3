import chokidar from 'chokidar';
import path from 'node:path';

export function createWatchers({ PORTFOLIO, MOTION, REGISTRY, run }) {
  // Watch ONLY inputs (.order, .cover, *.cover, image files, registry)
  const inputs = [
    // Portfolio inputs
    path.join(PORTFOLIO, '**/.order'),
    path.join(PORTFOLIO, '**/.cover'),
    path.join(PORTFOLIO, '**/*.cover'),
    path.join(PORTFOLIO, '**/*.{jpg,jpeg,png,webp,avif,gif,svg}'),
    // Motion inputs
    path.join(MOTION, '**/.order'),
    path.join(MOTION, '**/.cover'),
    // Registry
    REGISTRY,
  ];

  const IGNORED_BASENAMES = new Set([
    'manifest.json', // generated
    '.images',       // generated
    '.folders',      // generated
    '.videos',       // generated
    '.DS_Store',
  ]);

  const ignored = (p) => {
    const b = path.basename(p);
    if (IGNORED_BASENAMES.has(b)) return true;
    // Generated dirs / build output
    if (p.includes(`${path.sep}_covers${path.sep}`)) return true;
    if (p.includes(`${path.sep}.next${path.sep}`)) return true;
    if (p.includes(`${path.sep}node_modules${path.sep}`)) return true;
    if (b.startsWith('.git')) return true;
    return false;
  };

  // Debounce rebuild so rapid bursts coalesce
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const go = debounce(run, 150);

  const watcher = chokidar.watch(inputs, {
    ignoreInitial: true,              // don't fire on startup
    alwaysStat: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    ignored,
  });

  watcher
    .on('add', go)
    .on('change', go)
    .on('unlink', go)
    .on('addDir', go)
    .on('unlinkDir', go);

  // NOTE: no 'ready' -> no initial run here; call run() once from index.mjs
  return { close: () => watcher.close() };
}
