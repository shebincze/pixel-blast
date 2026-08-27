// Copies the playable files into www/, which is what Capacitor ships to Android.
// Keeping the web root clean of node_modules/android is the whole point.
import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'www');
const ITEMS = ['index.html', 'style.css', 'src'];

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const item of ITEMS) {
  await cp(join(root, item), join(out, item), { recursive: true });
}

console.log(`www/ built: ${ITEMS.join(', ')}`);
