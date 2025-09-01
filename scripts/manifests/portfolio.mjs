import path from 'node:path';
import {
  ensureDir, isHidden, isCoverFilename, stripCover, pretty,
  urlFromAbs, resolveCaseInsensitive, readLines, writeJSON, copyCoverFile
} from './utils.mjs';
import { readOrderWithDirectives } from './directives.mjs';

export async function buildPortfolioManifest(ctx, dir){
  const { PUB, COVERS_OUT } = ctx;
  const fs = await import('node:fs/promises');

  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files   = entries.filter(e=>e.isFile()      && !isHidden(e.name));
  const subdirs = entries.filter(e=>e.isDirectory() && !isHidden(e.name));

  // cover: prefer *.cover file, else .cover text (name), else first image
  const fileCovers = files.filter(f=> isCoverFilename(f.name));
  let coverUrl = null;
  if (fileCovers.length){
    coverUrl = await copyCoverFile(COVERS_OUT, path.join(dir, fileCovers[0].name));
  } else {
    const coverTxt = (await readLines(path.join(dir,'.cover')))[0];
    if (coverTxt){
      const abs = await resolveCaseInsensitive(dir, coverTxt);
      if (abs) coverUrl = urlFromAbs(PUB, abs);
    }
  }

  if (subdirs.length){
    const { order, directives, hiddenFromOrder } = await readOrderWithDirectives(dir);
    const orderLower = new Map(order.map((n,i)=>[n.toLowerCase(), i]));

    let folders = await Promise.all(subdirs
      .filter(s => !hiddenFromOrder.has(s.name.toLowerCase()))
      .map(async s => {
        const sm = await buildPortfolioManifest(ctx, path.join(dir,s.name));
        await writeJSON(path.join(dir,s.name,'manifest.json'), sm);
        const counts = { images: (sm.items?.length)||0, folders: (sm.folders?.length)||0 };
        const abs = path.join(dir, s.name);
        return {
          name: s.name,
          displayName: pretty(s.name),
          path: encodeURI('/' + path.relative(PUB, abs).split(path.sep).join('/')),
          cover: sm.cover || null,
          counts
        };
      })
    );

    folders.sort((a,b)=>{
      const ai = orderLower.get(a.name.toLowerCase()) ?? 1e9;
      const bi = orderLower.get(b.name.toLowerCase()) ?? 1e9;
      return ai !== bi ? ai - bi : a.name.localeCompare(b.name, undefined, { numeric:true, sensitivity:'base' });
    });

    if (!coverUrl){
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
  const imagesOnDisk = files.map(f=> f.name);

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

  const items = finalList.map(name => ({ src: urlFromAbs(PUB, path.join(dir, name)) }));
  return {
    kind: 'stills-gallery',
    cover: coverUrl || (items[0]?.src || null),
    items,
    ...(directives.maxColumns !== undefined ? { maxColumns: directives.maxColumns } : {}),
    ...(directives.aspectRatio !== undefined ? { aspectRatio: directives.aspectRatio } : {}),
    ...(directives.titleDisplay !== undefined ? { titleDisplay: directives.titleDisplay } : {}),
  };
}

export async function scanPortfolio({ PUB, PORTFOLIO, COVERS_OUT }){
  await ensureDir(PORTFOLIO);
  const fs = await import('node:fs/promises');
  const dirs = await fs.readdir(PORTFOLIO, { withFileTypes: true });
  let folders = [];
  for (const d of dirs){
    if (!d.isDirectory() || isHidden(d.name)) continue;
    const p = path.join(PORTFOLIO, d.name);
    const m = await buildPortfolioManifest({ PUB, COVERS_OUT }, p);
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

  const { order, hiddenFromOrder } = await readOrderWithDirectives(PORTFOLIO);
  const idx = new Map(order.map((n,i)=>[n.toLowerCase(), i]));
  folders = folders.filter(f => !hiddenFromOrder.has(f.name.toLowerCase()));
  folders.sort((a,b)=>{
    const ai = idx.get(a.name.toLowerCase()) ?? 1e9;
    const bi = idx.get(b.name.toLowerCase()) ?? 1e9;
    return ai !== bi ? ai - bi : a.name.localeCompare(b.name, undefined, { numeric:true, sensitivity:'base' });
  });

  await writeJSON(path.join(PORTFOLIO,'manifest.json'), { kind:'portfolio-root', folders });
}
