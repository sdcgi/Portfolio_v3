import fg from 'fast-glob';
import fs from 'node:fs/promises';

const files = await fg(['app/**/*.{ts,tsx,js,mjs}', 'components/**/*.{ts,tsx,js,mjs}']);
const rx = /\bfrom\s+['"](?:fs|node:fs|fs\/promises)['"]|\brequire\(['"]fs(?:\/promises)?['"]\)|fast-glob/;

const offenders = [];
for (const f of files) {
  const s = await fs.readFile(f,'utf8');
  if (rx.test(s)) offenders.push(f);
}
if (offenders.length) {
  console.error('❌ Filesystem/glob usage found in runtime code:\n' + offenders.map(x=>' - '+x).join('\n'));
  process.exit(1);
}
console.log('✓ No fs/glob in runtime code');
