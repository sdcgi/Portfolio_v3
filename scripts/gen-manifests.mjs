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

// encode URL path from an absolute file path under /public
function urlFromAbs(abs) {
  const rel = '/' + path.relative(PUB, abs).split(path.sep).join('/');
  // encode spaces and other reserved chars but leave slashes
  return encodeURI(rel);
}

// resolve a filename from .order case-insensitively to the actual on-disk case
async function resolveCaseInsensitive(dir, requested) {
  const base = path.basename(requested);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  // exact match first
  for (const e of entries) if (e.name === base) return path.join(dir, e.name);
  // case-insensitive fallback
  const lower = base.toLowerCase();
  for (const e of entries) if (e.name.toLowerCase() === lower) return path.join(dir, e.name);
  return null; // not found
}

async function readLines(file){
  try { const txt = await fs.readFile(file,'utf8'); return txt.split(/\r?\n/).map(s=>s.trim()).filter(Boolean); } catch { return []; }
}

/* ---------- covers ---------- */
async function copyCoverFile(srcAbs){
  const base = path.basename(stripCover(srcAbs));
  await ensureDir(COVERS_OUT);
  const hash = (await import('node:crypto')).createHash('md5').update(srcAbs).digest('hex').slice(0,8);
  const finalName = `${hash}-${base}`;
  const outAbs = path.join(COVERS_OUT, finalName);
  await fs.copyFile(srcAbs, outAbs);
  return `/_covers/${finalName}`; // already a web path; no encode needed
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
    // folder index
    // Optional ordering for subfolders via .order (one folder name per line)
    const order = await readLines(path.join(dir,'.order'));
    const orderLower = new Map(order.map((n,i)=>[n.toLowerCase(), i]));

    // filter (no dot folders) – already done
    let folders = await Promise.all(subdirs.map(async s => {
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
    }));

    // order: .order first (case-insensitive), then cii alphabetical
    folders.sort((a,b)=>{
      const ai = orderLower.has(a.name.toLowerCase()) ? orderLower.get(a.name.toLowerCase()) : 1e9;
      const bi = orderLower.has(b.name.toLowerCase()) ? orderLower.get(b.name.toLowerCase()) : 1e9;
      if (ai !== bi) return ai - bi;
      return a.name.localeCompare(b.name, undefined, { numeric:true, sensitivity:'base' });
    });

    return { kind:'portfolio-folder', cover: coverUrl, folders };
  }

  // leaf images
  const order = await readLines(path.join(dir,'.order'));
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
  const setOrdered = new Set(resolvedOrder.map(x=>x));
  const tail = imagesOnDisk
    .filter(n=> !setOrdered.has(n))
    .sort((a,b)=> a.localeCompare(b, undefined, { numeric:true, sensitivity:'base' }));
  const finalList = resolvedOrder.concat(tail);

  const items = finalList.map(name => ({ src: urlFromAbs(path.join(dir, name)) }));
  return { kind:'stills-gallery', cover: coverUrl || (items[0]?.src || null), items };
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
  // .order for top-level folders
  const topOrder = await readLines(path.join(PORTFOLIO,'.order'));
  const idx = new Map(topOrder.map((n,i)=>[n.toLowerCase(), i]));
  folders.sort((a,b)=>{
    const ai = idx.has(a.name.toLowerCase()) ? idx.get(a.name.toLowerCase()) : 1e9;
    const bi = idx.has(b.name.toLowerCase()) ? idx.get(b.name.toLowerCase()) : 1e9;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name, undefined, { numeric:true, sensitivity:'base' });
  });

  await writeJSON(path.join(PORTFOLIO,'manifest.json'), { kind:'portfolio-root', folders });
}

/* ---------- motion (unchanged behavior + URL encoding) ---------- */
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
    const order = await readLines(path.join(pdir,'.order'));
    const clips = order.map(k => registry.find(r=> r.key === k)).filter(Boolean);
    clips.forEach(c=> inAny.add(c.key));

    let coverPoster = null;
    const coverTxt = await readLines(path.join(pdir,'.cover'));
    if (coverTxt[0]) coverPoster = coverTxt[0];
    if (!coverPoster && clips[0]?.poster) coverPoster = clips[0].poster;

    const items = clips.map(c=> ({ key: c.key, displayName: c.displayName || c.key, url: c.url, poster: c.poster || null }));
    await writeJSON(path.join(pdir,'manifest.json'), { kind:'motion-project', name: p.name, displayName: pretty(p.name), items });

    projectCards.push({ name: p.name, displayName: pretty(p.name), path: '/Motion/' + p.name, coverPoster, count: { videos: items.length } });
  }

  const topOrder = await readLines(path.join(MOTION,'.order'));
  const idx = new Map(topOrder.map((k,i)=>[k,i]));

  // leaf videos are registry entries not present in any project
  const leafVideos = registry.filter(r=> !inAny.has(r.key))
    .map(r=> ({ key: r.key, displayName: r.displayName || r.key, url: r.url, poster: r.poster || null }));

  function orderBy(list, pick){
    if (!topOrder.length) return list.slice().sort((a,b)=> String(pick(a)).localeCompare(String(pick(b)), undefined, { numeric:true, sensitivity:'base' }));
    return list.slice().sort((a,b)=> (idx.get(pick(a)) ?? 1e9) - (idx.get(pick(b)) ?? 1e9));
    }

  await writeJSON(path.join(MOTION,'manifest.json'), {
    kind:'motion-root',
    projects: orderBy(projectCards, p=> p.name),
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
  // Watch only **inputs**; ignore generated artifacts (manifest.json, _covers) to avoid self-trigger loops
  const globs = [
    // Stills inputs
    path.join(PORTFOLIO, '**/.order'),
    path.join(PORTFOLIO, '**/.cover'),
    path.join(PORTFOLIO, '**/*.cover'),
    path.join(PORTFOLIO, '**/*.{jpg,jpeg,png,webp,avif,gif,svg}'),
    // Motion inputs
    path.join(MOTION, '.order'),
    path.join(MOTION, '**/.order'),
    path.join(MOTION, '**/.cover'),
    path.join(MOTION, '.covers/*.cover'),
    // Registry
    REGISTRY
  ];

  const watcher = chokidar.watch(globs, {
    ignoreInitial: false,
    ignored: (p) => {
      const b = path.basename(p);
      return (
        b === 'manifest.json' ||
        p.includes(`${path.sep}_covers${path.sep}`) ||
        b.startsWith('.git') ||
        b === '.DS_Store'
      );
    }
  });

  const debounce = (fn, ms)=> { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };
  const go = debounce(run, 150);
  watcher.on('add', go).on('change', go).on('unlink', go).on('ready', go);
} else {
  run().catch(e=>{ console.error(e); process.exit(1); });
}
