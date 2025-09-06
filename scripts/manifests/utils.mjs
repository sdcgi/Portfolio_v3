/* ---------- scripts/manifests/utils.mjs (full replacement) ---------- */
import fs from 'node:fs/promises';
import path from 'node:path';

export async function ensureDir(p){ await fs.mkdir(p, { recursive: true }); }
export function isHidden(name){ return name.startsWith('.'); }
export function isCoverFilename(name){ return name.toLowerCase().endsWith('.cover'); }
export function stripCover(name){ return name.replace(/\.cover$/i,''); }
export function pretty(name){ return name.replace(/[-_]+/g,' ').replace(/\b\w/g, s=>s.toUpperCase()); }
export function clamp(n, lo, hi){ return Math.max(lo, Math.min(hi, n)); }
export function stripLeadingDot(s){ return s?.startsWith('.') ? s.slice(1) : s; }

export function urlFromAbs(PUB, abs){
  const rel = '/' + path.relative(PUB, abs).split(path.sep).join('/');
  return encodeURI(rel);
}

export async function resolveCaseInsensitive(dir, requested){
  const base = path.basename(requested);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) if (e.name === base) return path.join(dir, e.name);
  const lower = base.toLowerCase();
  for (const e of entries) if (e.name.toLowerCase() === lower) return path.join(dir, e.name);
  return null;
}

export async function readLines(file){
  try {
    const txt = await fs.readFile(file,'utf8');
    return txt.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export async function writeJSON(file, data){
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n');
}

export async function writeHelperFile(file, headerLines, bodyLines){
  // Always overwrite. Strip leading dots from names.
  await ensureDir(path.dirname(file));
  const header = (headerLines || []).join('\n') + (headerLines?.length ? '\n\n' : '');
  const body = (bodyLines || []).map(stripLeadingDot).join('\n') + (bodyLines?.length ? '\n' : '');
  await fs.writeFile(file, header + body, 'utf8');
}

// Stills covers (*.cover image copied to /public/_covers)
export async function copyCoverFile(COVERS_OUT, srcAbs){
  const crypto = await import('node:crypto');
  const base = path.basename(stripCover(srcAbs));
  await ensureDir(COVERS_OUT);
  const hash = crypto.createHash('md5').update(srcAbs).digest('hex').slice(0,8);
  const finalName = `${hash}-${base}`;
  const outAbs = path.join(COVERS_OUT, finalName);
  await fs.copyFile(srcAbs, outAbs);
  return `/_covers/${finalName}`;
}

/* ---------- Image metadata helpers (width/height + tiny blur) ---------- */
/* Uses sharp at build-time; gracefully degrades if unavailable/unsupported. */
export async function readImageMeta(abs){
  let sharp;
  try {
    // dynamic import keeps this optional and build-time only
    sharp = (await import('sharp')).default || (await import('sharp'));
  } catch {
    return null; // sharp not installed
  }
  try {
    const img = sharp(abs);
    const meta = await img.metadata();
    const w = meta.width || 0;
    const h = meta.height || 0;

    // Skip blur for formats sharp might not decode well (svg, etc.)
    const ext = path.extname(abs).toLowerCase();
    if (!w || !h || ext === '.svg') {
      return { w, h, blurDataURL: null };
    }

    // Tiny blur preview (e.g., ~24px wide JPEG)
    const buf = await img
      .resize({ width: 24, withoutEnlargement: true, fit: 'inside' })
      .jpeg({ quality: 40, mozjpeg: true })
      .toBuffer();
    const blurDataURL = `data:image/jpeg;base64,${buf.toString('base64')}`;

    return { w, h, blurDataURL };
  } catch {
    return null; // unreadable image, or sharp error
  }
}
