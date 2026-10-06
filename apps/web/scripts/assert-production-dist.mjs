import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '../dist');
const forbidden = [
  'admin123',
  'DemoInitial@123',
  'demo-session',
  'linxiaoyu',
  'faker',
  'msw',
  'mockServiceWorker',
];

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

if (!existsSync(dist)) {
  console.error('production dist missing; run pnpm --filter @keel/web build first');
  process.exit(1);
}

const files = walk(dist);
const demoChunks = files.filter((file) => {
  const name = file.split('/').pop() ?? '';
  return name.startsWith('demo-');
});
if (demoChunks.length > 0) {
  console.error('production dist contains demo- chunk filenames:');
  for (const file of demoChunks) console.error(`  ${file}`);
  process.exit(1);
}

const hits = [];
for (const file of files) {
  if (!/\.(js|mjs|cjs|css|html|map)$/.test(file)) continue;
  const text = readFileSync(file, 'utf8');
  for (const needle of forbidden) {
    if (text.includes(needle)) hits.push(`${file}: ${needle}`);
  }
}
if (hits.length > 0) {
  console.error('production dist contains demo or mock identifiers:');
  for (const hit of hits) console.error(`  ${hit}`);
  process.exit(1);
}

console.log('production dist has no demo chunks, demo secrets, or mock libraries');
