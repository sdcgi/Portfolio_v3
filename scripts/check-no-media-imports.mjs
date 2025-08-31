import fg from 'fast-glob';
import fs from 'node:fs/promises';

const patterns = [
  'app/**/*.{ts,tsx,js,jsx,mjs,cjs}',
  'components/**/*.{ts,tsx,js,jsx,mjs,cjs}',
];
const files = await fg(patterns, { dot:false });

const bad = [];
const rx = /\b(import|require)\b[^(]*['"][^'"]+\.(png|jpe?g|webp|gif|avif|svg|mp4|mov|m4v|webm)['"]/i;

for (const f of files) {
  const src = await fs.readFile(f, 'utf8');
  if (rx.test(src) || src.includes('new URL(') && /\.(png|jpe?g|webp|gif|avif|svg|mp4|mov|m4v|webm)\b/i.test(src)) {
    bad.push(f);
  }
}

if (bad.length) {
  console.error('❌ Media imported in code:\n' + bad.map(x=>' - '+x).join('\n'));
  process.exit(1);
}
console.log('✓ No media imports found in app/components');
