/* ---------- scripts/manifests/portfolio.mjs (full replacement) ---------- */
import path from 'node:path';
import {
  ensureDir, isHidden, isCoverFilename, stripCover, pretty,
  urlFromAbs, resolveCaseInsensitive, readLines, writeJSON,
  copyCoverFile, writeHelperFile, readImageMeta
} from './utils.mjs';
import { readOrderWithDirectives } from './directives.mjs';

const IMAGES_HEADER = [
  'max_columns = 3   # overrides the maximum columns for this gallery (1–8)',
  'aspect_ratio = 0  # 0 = respect each image’s original aspect; or use 4/5, 1/1, 3/2, etc',
  'title_display = 0 # 0 = hide titles, 1 = show titles',
  '',
  '------------ Overrides above --------------',
];

const IMG_EXT = new Set(['.jpg','.jpeg','.png','.webp','.avif','.gif','.svg']);

export async function buildPortfolioManifest(ctx, dir){
  const { PUB, COVERS_OUT } = ctx;
  const fs = await import('node:fs/promises');

  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files   = entries.filter(e=>e.isFile()      && !isHidden(e.name));
  const subdirs = entries.filter(e=>e.isDirectory() && !isHidden(e.name));

  // cover: prefer *.cover file, else .cover text (name), else first image
  const fileCovers = files.filter(
    f=> isCoverFilename(f.name) && IMG_EXT.has(path.extname(stripCover(f.name)).toLowerCase())
  );

  let coverUrl = null;
  let coverMeta = null; // { w, h, blurDataURL } or null

  if (fileCovers.length){
    const coverAbs = path.join(dir, fileCovers[0].name);
    coverUrl = await copyCoverFile(COVERS_OUT, coverAbs);
    const srcAbs = path.join(dir, stripCover(fileCovers[0].name));
    coverMeta = await readImageMeta(srcAbs);
  } else {
    const coverTxt = (await readLines(path.join(dir,'.cover')))[0];
    if (coverTxt){
      const abs = await resolveCaseInsensitive(dir, coverTxt);
      if (abs) {
        coverUrl = urlFromAbs(PUB, abs);
        coverMeta = await readImageMeta(abs);
      }
    }
  }

  if (subdirs.length){
    // Subgallery index (list child folders)
    const { order, directives, hiddenFromOrder } = await readOrderWithDirectives(dir);
    const orderLower = new Map(order.map((n,i)=>[n.toLowerCase(), i]));

    let folders = await Promise.all(
      subdirs
        // Hide-by-dot via .order (in addition to actual dot-dirs filtered above)
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
            // pass through child’s cover meta for Grid perf
            ...(sm.coverMeta ? {
              coverW: sm.coverMeta.w || undefined,
              coverH: sm.coverMeta.h || undefined,
              coverBlur: sm.coverMeta.blurDataURL || undefined,
            } : {}),
            counts
          };
        })
    );

    // Convenience .folders (no header, per your request)
    await writeHelperFile(
      path.join(dir, '.folders'),
      [],                                    // no directive header here
      folders.map(f => f.name)
    );

    // Sort: .order first (case-insensitive), then CII alphabetical
    folders.sort((a,b)=>{
      const ai = orderLower.get(a.name.toLowerCase()) ?? 1e9;
      const bi = orderLower.get(b.name.toLowerCase()) ?? 1e9;
      return ai !== bi ? ai - bi : a.name.localeCompare(b.name, undefined, { numeric:true, sensitivity:'base' });
    });

    // Fallback cover from first child with cover (and propagate its meta)
    if (!coverUrl) {
      const firstChildWithCover = folders.find(f => f.cover);
      if (firstChildWithCover?.cover) {
        coverUrl = firstChildWithCover.cover;
        coverMeta = {
          w: firstChildWithCover.coverW || 0,
          h: firstChildWithCover.coverH || 0,
          blurDataURL: firstChildWithCover.coverBlur || null
        };
      }
    }

    return {
      kind: 'portfolio-folder',
      cover: coverUrl,
      coverMeta: coverMeta || null,
      folders,
      ...(directives.maxColumns !== undefined ? { maxColumns: directives.maxColumns } : {}),
      ...(directives.aspectRatio !== undefined ? { aspectRatio: directives.aspectRatio } : {}),
      ...(directives.titleDisplay !== undefined ? { titleDisplay: directives.titleDisplay } : {}),
    };
  }

  // Leaf images
  const { order, directives, hiddenFromOrder } = await readOrderWithDirectives(dir);
  const imagesOnDisk = files
    .filter(f=> !isCoverFilename(f.name))
    .filter(f=> IMG_EXT.has(path.extname(f.name).toLowerCase()))
    // hide-by-dot via .order
    .filter(f=> !hiddenFromOrder.has(f.name.toLowerCase()))
    .map(f=> f.name);

  // Resolve .order entries to on-disk case and within the folder only
  const resolvedOrder = [];
  for (const line of order){
    const abs = await resolveCaseInsensitive(dir, line);
    if (abs && path.dirname(abs) === dir) resolvedOrder.push(path.basename(abs));
  }
  const setOrdered = new Set(resolvedOrder);
  const tail = imagesOnDisk
    .filter(n=> !setOrdered.has(n))
    // ensure hidden entries never leak back in via tail
    .filter(n=> !hiddenFromOrder.has(n.toLowerCase()))
    .sort((a,b)=> a.localeCompare(b, undefined, { numeric:true, sensitivity:'base' }));
  const finalList = resolvedOrder.concat(tail);

  // Build items with metadata
  const items = await Promise.all(finalList.map(async (name) => {
    const abs = path.join(dir, name);
    const meta = await readImageMeta(abs);
    return {
      src: urlFromAbs(PUB, abs),
      ...(meta ? {
        w: meta.w || undefined,
        h: meta.h || undefined,
        blurDataURL: meta.blurDataURL || undefined
      } : {})
    };
  }));

  // Convenience .images (always overwrite; keep header)
  await writeHelperFile(
    path.join(dir, '.images'),
    IMAGES_HEADER,
    finalList
  );

  return {
    kind: 'stills-gallery',
    cover: coverUrl || (items[0]?.src || null),
    coverMeta: coverMeta || null,
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
      ...(m.coverMeta ? {
        coverW: m.coverMeta.w || undefined,
        coverH: m.coverMeta.h || undefined,
        coverBlur: m.coverMeta.blurDataURL || undefined,
      } : {}),
      counts
    });
  }

  // Apply top-level .order: sort + hide-by-dot
  const { order, hiddenFromOrder } = await readOrderWithDirectives(PORTFOLIO);
  const idx = new Map(order.map((n,i)=>[n.toLowerCase(), i]));

  // hide-by-dot from .order at the root
  folders = folders.filter(f => !hiddenFromOrder.has(f.name.toLowerCase()));

  folders.sort((a,b)=>{
    const ai = idx.get(a.name.toLowerCase()) ?? 1e9;
    const bi = idx.get(b.name.toLowerCase()) ?? 1e9;
    return ai !== bi ? ai - bi : a.name.localeCompare(b.name, undefined, { numeric:true, sensitivity:'base' });
  });

  // Convenience .folders at root (no header)
  await writeHelperFile(
    path.join(PORTFOLIO, '.folders'),
    [],
    folders.map(f => f.name)
  );

  await writeJSON(path.join(PORTFOLIO,'manifest.json'), { kind:'portfolio-root', folders });
}
