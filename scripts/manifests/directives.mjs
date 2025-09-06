//------------------------// scripts/manifests/directives.mjs
import path from 'node:path';
import { readLines, clamp } from './utils.mjs';

export function parseDirectives(line){
  const out = { maxColumns: undefined, aspectRatio: undefined, titleDisplay: undefined };
  if (!line) return out;
  const s = line.trim(); let m;
  if ((m = s.match(/^max_columns\s*=\s*(\d+)\s*$/i))) {
    out.maxColumns = clamp(parseInt(m[1],10), 1, 8);
  } else if ((m = s.match(/^aspect_ratio\s*=\s*(0|(\d+)\s*\/\s*(\d+))\s*$/i))) {
    // normalize to "W / H" (spaces are fine for CSS aspect-ratio)
    out.aspectRatio = m[1] === '0' ? '0' : `${+m[2]} / ${+m[3]}`;
  } else if ((m = s.match(/^title_display\s*=\s*(0|1|true|false)\s*$/i))) {
    out.titleDisplay = /^(1|true)$/i.test(m[1]) ? 1 : 0;
  }
  return out;
}

/**
 * Reads `.order` and returns:
 *  - order: normalized ordered entries (no directives, no dotted/hide lines, no separators)
 *  - directives: { maxColumns, aspectRatio, titleDisplay } merged from all leading directive lines
 *  - hiddenFromOrder: set of names (lowercased basenames) that were dotted in .order
 *
 * Normalization:
 *  - strips inline "# comments"
 *  - strips trailing "/" from folder entries
 *  - trims whitespace
 *  - treats any line like "---", "---- Override above ----", "===..." as a separator
 *  - case-insensitive compare done by callers using `.toLowerCase()`
 */
export async function readOrderWithDirectives(dir){
  const lines = await readLines(path.join(dir, '.order'));

  const normLines = lines
    .map(s => s.replace(/\s+#.*$/, ''))   // remove inline comments after '#'
    .map(s => s.replace(/\/+$/, ''))      // remove trailing slashes
    .map(s => s.trim())
    .filter(Boolean);

  // Collect ALL leading directive lines until a separator or non-directive
  const directives = { maxColumns: undefined, aspectRatio: undefined, titleDisplay: undefined };

  const isSeparator = (l) => /^[-=]{3,}/.test(l) || /override above/i.test(l);
  const isDirective = (l) => /^(max_columns|aspect_ratio|title_display)\s*=/.test(l);

  let idx = 0;
  while (idx < normLines.length) {
    const l = normLines[idx];
    if (isSeparator(l)) { idx++; break; }
    if (!isDirective(l)) break;

    const d = parseDirectives(l);
    if (d.maxColumns !== undefined)  directives.maxColumns  = d.maxColumns;
    if (d.aspectRatio !== undefined) directives.aspectRatio = d.aspectRatio;
    if (d.titleDisplay !== undefined) directives.titleDisplay = d.titleDisplay;
    idx++;
  }

  // Hide-by-dot list (folders or files) from the whole file
  const hiddenFromOrder = new Set(
    normLines
      .filter(l => /^\s*\./.test(l))
      .map(l => l.replace(/^\s*\./,''))
      .map(l => path.basename(l))   // normalize to basename
      .map(s => s.toLowerCase())
  );

  // The order list excludes directive lines, dotted entries, and separators
  const order = normLines
    .slice(idx) // everything after the directive header block (and optional separator)
    .filter(l => !/^\s*\./.test(l))
    .filter(l => !isSeparator(l))
    .filter(l => !isDirective(l));

  return { order, directives, hiddenFromOrder };
}
