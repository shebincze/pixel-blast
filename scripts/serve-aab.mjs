// Tiny CORS-enabled static server so the browser pane can pull the signed
// bundle from disk (Play Console's file input needs a real File object).
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const file = process.argv[2];
const port = Number(process.argv[3] || 5174);
const body = readFileSync(file);

createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  // Chrome's Private Network Access preflight for public site -> localhost.
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  res.setHeader('Content-Type', 'application/octet-stream');
  res.end(body);
}).listen(port, '127.0.0.1', () => console.log(`serving ${file} on ${port}`));
