// Adds a content version to every module URL: src/main.js?v=abc123 and the same
// suffix on each relative import inside src/. GitHub Pages serves the files with
// max-age=600, so without this a returning player can run a stale mix of old and
// new modules for ten minutes after a release. Versioned URLs sidestep that.

import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const srcDir = join(root, 'src');
const stripStamp = (text) => text.replace(/\.js\?v=[0-9a-f]+/g, '.js');

const files = (await readdir(srcDir)).filter((name) => name.endsWith('.js')).sort();
const sources = new Map();
for (const name of files) sources.set(name, await readFile(join(srcDir, name), 'utf8'));

const indexPath = join(root, 'index.html');
const indexHtml = await readFile(indexPath, 'utf8');

// The version is the hash of the unstamped sources, so it only moves when the
// code really changes.
const hash = createHash('sha256');
for (const name of files) hash.update(name).update(stripStamp(sources.get(name)));
const version = hash.digest('hex').slice(0, 8);

for (const [name, text] of sources) {
  const stamped = stripStamp(text).replace(/(from\s+'\.\/[\w.-]+\.js)'/g, `$1?v=${version}'`);
  if (stamped !== text) await writeFile(join(srcDir, name), stamped);
}

const stampedIndex = indexHtml.replace(
  /src="src\/main\.js(\?v=[0-9a-f]+)?"/,
  `src="src/main.js?v=${version}"`,
);
if (stampedIndex !== indexHtml) await writeFile(indexPath, stampedIndex);

console.log(`stamped ${files.length} modules with v=${version}`);
