// Tiny static server for local play. It sends no-store, because the browser
// otherwise keeps ES modules for minutes and you end up testing a stale mix of
// old and new files. Port comes from PORT, defaulting to 5173.

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const port = Number(process.env.PORT) || 5173;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

http
  .createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(req.url.split('?')[0]));
    const file = join(root, path === '/' ? '/index.html' : path);
    try {
      const body = await readFile(file);
      res.setHeader('Cache-Control', 'no-store, must-revalidate');
      res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
      res.end(body);
    } catch {
      res.statusCode = 404;
      res.end('not found');
    }
  })
  .listen(port, () => console.log(`Pixel Blast na http://localhost:${port}`));
