// Flamingo Key Cover Studio — local preview server.
//
// Serves app/ over HTTP on 127.0.0.1:8080 so desktop Chrome can open the
// editor (module scripts do not run from file://). Node 22, stdlib only.
// Usage: node serve.ts  — then open http://localhost:8080/

import { createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = join(fileURLToPath(new URL('.', import.meta.url)), 'app');
const PORT = 8080;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const file = resolve(join(appDir, decodeURIComponent(url.pathname === '/' ? 'index.html' : url.pathname)));
  if (!file.startsWith(appDir)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }
  res.setHeader('Content-Type', MIME[extname(file).toLowerCase()] ?? 'application/octet-stream');
  const stream = createReadStream(file);
  stream.on('error', () => {
    res.writeHead(404);
    res.end('not found');
  });
  stream.pipe(res);
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Flamingo Key Cover Studio at http://localhost:${PORT}/`);
});
