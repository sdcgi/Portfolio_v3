import path from 'node:path';
import { readLines, clamp } from './utils.mjs';

export function parseDirectives(line){
  const out = { maxColumns: undefined, aspectRatio: undefined, titleDisplay: undefined };
  if (!line) return out;
  const s = line.trim(); let m;
  if ((m = s.match(/^max_columns\s*=\s*(\d+)\s*$/i))) out.maxColumns = clamp(parseInt(m[1],10),1,8);
  else if ((m = s.match(/^aspect_ratio\s*=\s*(0|(\d+)\s*\/\s*(\d+))\s*$/i))) out.aspectRatio = m[1] === '0' ? '0' : `${+m[2]}/${+m[3]}`;
  else if ((m = s.match(/^title_display\s*=\s*(0|1|true|false)\s*$/i))) out.titleDisplay = /^(1|true)$/i.test(m[1]) ? 1 : 0;
  return out;
}

export async function readOrderWithDirectives(dir){
  const lines = await readLines(path.join(dir, '.order'));
  let directives = { maxColumns: undefined, aspectRatio: undefined, titleDisplay: undefined };

  for (const raw of lines){
    const l = raw.trim();
    if (!l || l.startsWith('#')) continue;
    directives = parseDirectives(l);
    break;
  }

  const order = lines
    .filter(l => !/^\s*(max_columns|aspect_ratio|title_display)\s*=/.test(l))
    .filter(l => !/^\s*\./.test(l));

  const hiddenFromOrder = new Set(
    lines.filter(l => /^\s*\./.test(l)).map(l => l.replace(/^\s*\./,'').toLowerCase())
  );

  return { order, directives, hiddenFromOrder };
}
