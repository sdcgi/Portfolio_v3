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
