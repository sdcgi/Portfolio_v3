import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import chokidar from 'chokidar';

const ROOT = process.cwd();
const PUB  = path.join(ROOT, 'public');
const PORTFOLIO = path.join(PUB, 'Portfolio');
const MOTION    = path.join(PUB, 'Motion');
const COVERS_OUT = path.join(PUB, '_covers');
const REGISTRY   = path.join(ROOT, 'data', 'videos-registry.json');

const IMG_EXT = new Set(['.jpg','.jpeg','.png','.webp','.avif','.gif','.svg']);
const WATCH = process.argv.includes('--watch');

/* ---------- helpers ---------- */
async function ensureDir(p){ await fs.mkdir(p, { recursive: true }); }
function isHidden(name){ return name.startsWith('.'); }
function isCoverFilename(name){ return name.toLowerCase().endsWith('.cover'); }
function stripCover(name){ return name.replace(/\.cover$/i,''); }
function pretty(name){ return name.replace(/[-_]+/g,' ').replace(/\b\w/g, s=>s.toUpperCase()); }
function clamp(n, lo, hi){ return Math.max(lo, Math.min(hi, n)); }

// encode URL path from an absolute file path under /public
function urlFromAbs(abs) {
  const rel = '/' + path.relative(PUB, abs).split(path.sep).join('/');
  return encodeURI(rel);
}

// resolve a filename from .order case-insensitively to the actual on-disk case
async function resolveCaseInsensitive(dir, requested) {
  const base = path.basename(requested);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) if (e.name === base) return path.join(dir, e.name);
  const lower = base.toLowerCase();
  for (const e of entries) if (e.name.toLowerCase() === lower) return path.join(dir, e.name);
  return null;
}

async function readLines(file){
  try {
    const txt = await fs.readFile(file,'utf8');
    return txt.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/* ---------- directive parsing ---------- */
function parseDirectives(firstLine){
  const out = { maxColumns: undefined, aspectRatio: undefined, titleDisplay: undefined };
  if (!firstLine) return out;
  const s = firstLine.trim();
  let m;
  if ((m = s.match(/^max_columns\s*=\s*(\d+)\s*$/i))) {
    out.maxColumns = clamp(parseInt(m[1], 10), 1, 8);
  } else if ((m = s.match(/^aspect_ratio\s*=\s*(0|(\d+)\s*\/\s*(\d+))\s*$/i))) {
    out.aspectRatio = m[1] === '0' ? '0' : `${parseInt(m[2],10)}/${parseInt(m[3],10)}`;
  } else if ((m = s.match(/^title_display\s*=\s*(0|1|true|false)\s*$/i))) {
    const v = m[1].toLowerCase();
    out.titleDisplay = (v === '1' || v === 'true') ? 1 : 0;
  }
  return out;
}

async function readOrderWithDirectives(dir){
  const lines = await readLines(path.join(dir, '.order'));
  let directives = { maxColumns: undefined, aspectRatio: undefined, titleDisplay: undefined };
  // first meaningful line may be a directive
  for (const raw of lines){
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    directives = parseDirectives(line);
    break;
  }
  // Remove directive lines; hide entries starting with a dot
  const order = lines
    .filter(l => !/^\s*(max_columns|aspect_ratio|title_display)\s*=/.test(l))
    .filter(l => !/^\s*\./.test(l));
  // Also record dotted names so parents can hide subfolders by name if they want
  const hiddenFromOrder = new Set(
    lines
      .filter(l => /^\s*\./.test(l))
      .map(l => l.replace(/^\s*\./,'').toLowerCase())
  );
  return { order, directives, hiddenFromOrder };
}

/* ---------- covers ---------- */
async function copyCoverFile(srcAbs){
  const base = path.basename(stripCover(srcAbs));
  await ensureDir(COVERS_OUT);
  const hash = (await import('node:crypto')).createHash('md5').update(srcAbs).digest('hex').slice(0,8);
  const finalName = `${hash}-${base}`;
  const outAbs = path.join(COVERS_OUT, finalName);
  await fs.copyFile(srcAbs, outAbs);
  return `/_covers/${finalName}`;
}

/* ---------- stills (portfolio) ---------- */
async function buildPortfolioManifest(dir){
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files   = entries.filter(e=>e.isFile()      && !isHidden(e.name));
  const subdirs = entries.filter(e=>e.isDirectory() && !isHidden(e.name));

  // cover: prefer *.cover file, else .cover text (name), else first image
  const fileCovers = files.filter(f=> isCoverFilename(f.name) && IMG_EXT.has(path.extname(stripCover(f.name)).toLowerCase()));
  let coverUrl = null;
  if (fileCovers.length){
    coverUrl = await copyCoverFile(path.join(dir, fileCovers[0].name));
  } else {
    const coverTxt = (await readLines(path.join(dir,'.cover')))[0];
    if (coverTxt){
      const abs = await resolveCaseInsensitive(dir, coverTxt);
      if (abs) coverUrl = urlFromAbs(abs);
    }
  }

  if (subdirs.length){
    // subgallery index (list child folders)
    const { order, directives, hiddenFromOrder } = await readOrderWithDirectives(dir);
    const orderLower = new Map(order.map((n,i)=>[n.toLowerCase(), i]));

    let folders = await Promise.all(subdirs
      .filter(s => !hiddenFromOrder.has(s.name.toLowerCase()))
      .map(async s => {
        const sm = await buildPortfolioManifest(path.join(dir,s.name));
        await writeJSON(path.join(dir,s.name,'manifest.json'), sm);
        const counts = { images: (sm.items?.length)||0, folders: (sm.folders?.length)||0 };
        const cov = sm.cover || null;
        const abs = path.join(dir, s.name);
        return {
          name: s.name,
          displayName: pretty(s.name),
          path: encodeURI('/' + path.relative(PUB, abs).split(path.sep).join('/')),
          cover: cov,
          counts
        };
      })
    );

    // sort: .order first (case-insensitive), then CII alphabetical
    folders.sort((a,b)=>{
      const ai = orderLower.has(a.name.toLowerCase()) ? orderLower.get(a.name.toLowerCase()) : 1e9;
      const bi = orderLower.has(b.name.toLowerCase()) ? orderLower.get(b.name.toLowerCase()) : 1e9;
      if (ai !== bi) return ai - bi;
      return a.name.localeCompare(b.name, undefined, { numeric:true, sensitivity:'base' });
    });

    // Fallback cover from first child with cover
    if (!coverUrl) {
      const firstChildWithCover = folders.find(f => f.cover);
      if (firstChildWithCover?.cover) coverUrl = firstChildWithCover.cover;
    }

    return {
      kind: 'portfolio-folder',
      cover: coverUrl,
      folders,
      ...(directives.maxColumns !== undefined ? { maxColumns: directives.maxColumns } : {}),
      ...(directives.aspectRatio !== undefined ? { aspectRatio: directives.aspectRatio } : {}),
      ...(directives.titleDisplay !== undefined ? { titleDisplay: directives.titleDisplay } : {}),
    };
  }

  // leaf images
  const { order, directives } = await readOrderWithDirectives(dir);
  const imagesOnDisk = files
    .filter(f=> !isCoverFilename(f.name))
    .filter(f=> IMG_EXT.has(path.extname(f.name).toLowerCase()))
    .map(f=> f.name);

  // resolve .order entries to on-disk case and within the folder only
  const resolvedOrder = [];
  for (const line of order){
    const abs = await resolveCaseInsensitive(dir, line);
    if (abs && path.dirname(abs) === dir) resolvedOrder.push(path.basename(abs));
  }
  const setOrdered = new Set(resolvedOrder);
  const tail = imagesOnDisk
    .filter(n=> !setOrdered.has(n))
    .sort((a,b)=> a.localeCompare(b, undefined, { numeric:true, sensitivity:'base' }));
  const finalList = resolvedOrder.concat(tail);

  const items = finalList.map(name => ({ src: urlFromAbs(path.join(dir, name)) }));
  return {
    kind: 'stills-gallery',
    cover: coverUrl || (items[0]?.src || null),
    items,
    ...(directives.maxColumns !== undefined ? { maxColumns: directives.maxColumns } : {}),
    ...(directives.aspectRatio !== undefined ? { aspectRatio: directives.aspectRatio } : {}),
    ...(directives.titleDisplay !== undefined ? { titleDisplay: directives.titleDisplay } : {}),
  };
}

async function scanPortfolio(){
  await ensureDir(PORTFOLIO);
  const dirs = await fs.readdir(PORTFOLIO, { withFileTypes: true });
  let folders = [];
  for (const d of dirs){
    if (!d.isDirectory() || isHidden(d.name)) continue;
    const p = path.join(PORTFOLIO, d.name);
    const m = await buildPortfolioManifest(p);
    await writeJSON(path.join(p,'manifest.json'), m);
    const counts = { images: (m.items?.length)||0, folders: (m.folders?.length)||0 };
    folders.push({
      name: d.name,
      displayName: pretty(d.name),
      path: encodeURI('/' + path.relative(PUB, p).split(path.sep).join('/')),
      cover: m.cover || null,
      counts
    });
  }
  // .order for top-level folders (also allow hiding via dot line)
  const { order, hiddenFromOrder } = await readOrderWithDirectives(PORTFOLIO);
  const idx = new Map(order.map((n,i)=>[n.toLowerCase(), i]));
  folders = folders.filter(f => !hiddenFromOrder.has(f.name.toLowerCase()));
  folders.sort((a,b)=>{
    const ai = idx.has(a.name.toLowerCase()) ? idx.get(a.name.toLowerCase()) : 1e9;
    const bi = idx.has(b.name.toLowerCase()) ? idx.get(b.name.toLowerCase()) : 1e9;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name, undefined, { numeric:true, sensitivity:'base' });
  });

  await writeJSON(path.join(PORTFOLIO,'manifest.json'), { kind:'portfolio-root', folders });
}

/* ---------- motion ---------- */
async function scanMotion(){
  await ensureDir(MOTION);
  let registry = [];
  try { registry = JSON.parse(await fs.readFile(REGISTRY,'utf8')); } catch { registry = []; }

  const projects = (await fs.readdir(MOTION, { withFileTypes:true }))
    .filter(e=> e.isDirectory() && !isHidden(e.name) && e.name !== '_covers');

  const inAny = new Set();
  const projectCards = [];

  for (const p of projects){
    const pdir = path.join(MOTION, p.name);
    const { order, directives, hiddenFromOrder } = await readOrderWithDirectives(pdir);

    // Build items from registry keys (ignore dotted keys in .order via readOrderWithDirectives)
    const clips = order.map(k => registry.find(r=> r.key === k)).filter(Boolean);
    clips.forEach(c=> inAny.add(c.key));

    // cover: .cover text (poster URL) or first clip poster
    let coverPoster = null;
    const coverTxt = await readLines(path.join(pdir,'.cover'));
    if (coverTxt[0]) coverPoster = coverTxt[0];
    if (!coverPoster && clips[0]?.poster) coverPoster = clips[0].poster;

    const items = clips.map(c=> ({
      key: c.key,
      displayName: c.displayName || c.key,
      url: c.url,
      poster: c.poster || null
    }));

    await writeJSON(path.join(pdir,'manifest.json'), {
      kind:'motion-project',
      name: p.name,
      displayName: pretty(p.name),
      items,
      ...(directives.maxColumns !== undefined ? { maxColumns: directives.maxColumns } : {}),
      ...(directives.aspectRatio !== undefined ? { aspectRatio: directives.aspectRatio } : {}),
      ...(directives.titleDisplay !== undefined ? { titleDisplay: directives.titleDisplay } : {}),
    });

    projectCards.push({
      name: p.name,
      displayName: pretty(p.name),
      path: '/Motion/' + encodeURIComponent(p.name),
      coverPoster,
      count: { videos: items.length }
    });
  }

  const { order: topOrder, hiddenFromOrder: hiddenProjects } = await readOrderWithDirectives(MOTION);
  const idx = new Map(topOrder.map((k,i)=>[k.toLowerCase(),i]));

  // leaf videos are registry entries not present in any project
  const leafVideos = registry
    .filter(r=> !inAny.has(r.key))
    .map(r=> ({ key: r.key, displayName: r.displayName || r.key, url: r.url, poster: r.poster || null }));

  function orderBy(list, pick){
    if (!topOrder.length) return list.slice().sort((a,b)=> String(pick(a)).localeCompare(String(pick(b)), undefined, { numeric:true, sensitivity:'base' }));
    return list.slice().sort((a,b)=> (idx.get(String(pick(a)).toLowerCase()) ?? 1e9) - (idx.get(String(pick(b)).toLowerCase()) ?? 1e9));
  }

  const projectsOut = orderBy(projectCards, p=> p.name).filter(p => !hiddenProjects.has(p.name.toLowerCase()));

  await writeJSON(path.join(MOTION,'manifest.json'), {
    kind:'motion-root',
    projects: projectsOut,
    leafVideos: orderBy(leafVideos, v=> v.key)
  });
}

/* ---------- core runner & watcher ---------- */
async function writeJSON(file, data){
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n');
}

async function run(){
  await ensureDir(PUB);
  await ensureDir(COVERS_OUT);
  await scanPortfolio();
  await scanMotion();
  console.log('[gen] manifests updated');
}

if (WATCH){
  // Robust watchers: base dirs + directories, include dot renames; ignore generated artifacts
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

  // Deep watch everything under Portfolio/Motion (no dot ignore); also watch registry
  const deep = chokidar.watch([PORTFOLIO, MOTION, REGISTRY], {
    ignoreInitial: true,
    alwaysStat: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    ignored
  });

  deep
    .on('add', go)
    .on('change', go)
    .on('unlink', go)
    .on('addDir', go)
    .on('unlinkDir', go)
    .on('ready', go);

} else {
  run().catch(e=>{ console.error(e); process.exit(1); });
}
