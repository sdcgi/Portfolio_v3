//------------------------// scripts/manifests/motion.mjs
import path from 'node:path';
import { ensureDir, isHidden, pretty, writeJSON, readLines } from './utils.mjs';
import { readOrderWithDirectives } from './directives.mjs';

export async function scanMotion({ MOTION, REGISTRY }){
  await ensureDir(MOTION);

  const fs = await import('node:fs/promises');

  // Load registry
  let registry = [];
  try { registry = JSON.parse(await fs.readFile(REGISTRY,'utf8')); } catch { registry = []; }

  // Root .order controls BOTH:
  // - project visibility/order (by folder name)
  // - leaf video visibility/order (by registry key)
  const { order: rootOrder, hiddenFromOrder: rootHidden } = await readOrderWithDirectives(MOTION);
  const rootIdx = new Map(rootOrder.map((v,i)=>[String(v).toLowerCase(), i]));

  // Projects on disk (skip actual dot-dirs), then hide via .order dotted names
  let projects = (await fs.readdir(MOTION, { withFileTypes:true }))
    .filter(e=> e.isDirectory() && !isHidden(e.name) && e.name !== '_covers')
    .filter(p => !rootHidden.has(p.name.toLowerCase()));

  const inAny = new Set();
  const projectCards = [];

  for (const p of projects){
    const pdir = path.join(MOTION, p.name);
    const { order, directives, hiddenFromOrder } = await readOrderWithDirectives(pdir);

    // Per-project clips:
    // - hide dotted keys in this project's .order
    // - case-insensitive key match
    const clips = order
      .filter(k => !hiddenFromOrder.has(String(k).toLowerCase()))
      .map(k => registry.find(r => r.key.toLowerCase() === String(k).toLowerCase()))
      .filter(Boolean);

    clips.forEach(c=> inAny.add(c.key));

    // Cover poster: .cover text > first clip poster
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

  // Order projects by root .order if present
  const projectsOut = projectCards.slice().sort((a,b)=>{
    const ai = rootIdx.get(a.name.toLowerCase()); const bi = rootIdx.get(b.name.toLowerCase());
    if (ai !== undefined || bi !== undefined) return (ai ?? 1e9) - (bi ?? 1e9);
    return a.name.localeCompare(b.name, undefined, { numeric:true, sensitivity:'base' });
  });

  // Leaf videos = registry not used in any project AND not dotted in root .order
  let leafVideos = registry
    .filter(r=> !inAny.has(r.key))
    .filter(r=> !rootHidden.has(r.key.toLowerCase()));

  // Order leaf videos by root .order if keys are listed there
  leafVideos = leafVideos.slice().sort((a,b)=>{
    const ai = rootIdx.get(a.key.toLowerCase()); const bi = rootIdx.get(b.key.toLowerCase());
    if (ai !== undefined || bi !== undefined) return (ai ?? 1e9) - (bi ?? 1e9);
    return String(a.displayName || a.key).localeCompare(String(b.displayName || b.key), undefined, { numeric:true, sensitivity:'base' });
  });

  await writeJSON(path.join(MOTION,'manifest.json'), {
    kind:'motion-root',
    projects: projectsOut,
    leafVideos
  });
}
