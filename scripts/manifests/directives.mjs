import path from 'node:path';
import { readLines, clamp } from './utils.mjs';

export function parseDirectives(line){
  const out = { maxColumns: undefined, aspectRatio: undefined, titleDisplay: undefined };
  if (!line) return out;
  const s = line.trim(); let m;
  if ((m = s.match(/^max_columns\s*=\s*(\d+)\s*$/i))) {
    out.maxColumns = clamp(parseInt(m[1],10), 1, 8);
  } else if ((m = s.match(/^aspect_ratio\s*=\s*(0|(\d+)\s*\/\s*(\d+))\s*$/i))) {
    out.aspectRatio = m[1] === '0' ? '0' : `${+m[2]}/${+m[3]}`;
  } else if ((m = s.match(/^title_display\s*=\s*(0|1|true|false)\s*$/i))) {
    out.titleDisplay = /^(1|true)$/i.test(m[1]) ? 1 : 0;
  }
  return out;
}

/**
 * Reads `.order` and returns:
 *  - order: normalized ordered entries (no directives, no dotted/hide lines)
 *  - directives: { maxColumns, aspectRatio, titleDisplay } if present
 *  - hiddenFromOrder: set of names (lowercased basenames) that were dotted in .order
 *
 * Normalization:
 *  - strips inline "# comments"
 *  - strips trailing "/" from folder entries
 *  - trims whitespace
 *  - case-insensitive compare done by callers using `.toLowerCase()`
 */
export async function readOrderWithDirectives(dir){
  const lines = await readLines(path.join(dir, '.order'));

  const normLines = lines
    .map(s => s.replace(/\s+#.*$/, ''))   // remove inline comments
    .map(s => s.replace(/\/+$/, ''))      // remove trailing slashes
    .map(s => s.trim())
    .filter(Boolean);

  // Directive is allowed on the first meaningful line
  let directives = { maxColumns: undefined, aspectRatio: undefined, titleDisplay: undefined };
  for (const raw of normLines){
    const l = raw.trim();
    if (!l || l.startsWith('#')) continue;
    directives = parseDirectives(l);
    break;
  }

  // Hide-by-dot list (folders or files) from .order
  const hiddenFromOrder = new Set(
    normLines
      .filter(l => /^\s*\./.test(l))
      .map(l => l.replace(/^\s*\./,''))
      .map(l => path.basename(l))   // normalize to basename
      .map(s => s.toLowerCase())
  );

  // The order list excludes directives and dotted (hidden) entries
  const order = normLines
    .filter(l => !/^\s*(max_columns|aspect_ratio|title_display)\s*=/.test(l))
    .filter(l => !/^\s*\./.test(l));

  return { order, directives, hiddenFromOrder };
}
