import path from 'node:path';
import { ensureDir, isHidden, pretty, writeJSON, readLines } from './utils.mjs';
import { readOrderWithDirectives } from './directives.mjs';

export async function scanMotion({ MOTION, REGISTRY }){
  await ensureDir(MOTION);

  const fs = await import('node:fs/promises');
  let registry = [];
  try { registry = JSON.parse(await fs.readFile(REGISTRY,'utf8')); } catch { registry = []; }

  const projects = (await fs.readdir(MOTION, { withFileTypes:true }))
    .filter(e=> e.isDirectory() && !isHidden(e.name) && e.name !== '_covers');

  const inAny = new Set();
  const projectCards = [];

  for (const p of projects){
    const pdir = path.join(MOTION, p.name);
    const { order, directives } = await readOrderWithDirectives(pdir);

    const clips = order.map(k => registry.find(r=> r.key === k)).filter(Boolean);
    clips.forEach(c=> inAny.add(c.key));

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
