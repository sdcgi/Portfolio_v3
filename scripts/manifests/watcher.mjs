import chokidar from 'chokidar';
import path from 'node:path';

export function createWatchers({ PORTFOLIO, MOTION, REGISTRY, run }){
  const ignored = (p) => {
    const b = path.basename(p);
    return (
      b === 'manifest.json' ||
      p.includes(`${path.sep}_covers${path.sep}`) ||
      p.includes(`${path.sep}.next${path.sep}`) ||
      p.includes(`${path.sep}node_modules${path.sep}`) ||
      b.startsWith('.git') ||
      b === '.DS_Store'
    );
  };

  const debounce = (fn, ms)=> { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };
  const go = debounce(run, 150);

  const deep = chokidar.watch([PORTFOLIO, MOTION, REGISTRY], {
    ignoreInitial: true,
    alwaysStat: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    ignored
  });

  deep.on('add', go)
      .on('change', go)
      .on('unlink', go)
      .on('addDir', go)
      .on('unlinkDir', go)
      .on('ready', go);

  return { close: async () => { await deep.close(); } };
}
