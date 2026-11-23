import { realpathSync, statSync } from 'node:fs';
import { open, realpath } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { relayEnvironment } from '../../relay/src/config';
import { createRelay } from '../../relay/src/handler';

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
};

function text(req: IncomingMessage, res: ServerResponse, status: number, body: string) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(req.method === 'HEAD' ? undefined : body);
}

export function createProductionServer(staticDir: string, env: NodeJS.ProcessEnv = process.env) {
  const root = realpathSync(staticDir);
  const inside = (path: string) => path.startsWith(root + sep);
  const index = realpathSync(resolve(root, 'index.html'));
  if (!inside(index) || !statSync(index).isFile()) throw Error('Missing browser build index.html');
  // This entry is always production-safe, even if NODE_ENV was omitted/overridden.
  const relay = createRelay(relayEnvironment({ ...env, NODE_ENV: 'production' }, []));

  async function serveFile(req: IncomingMessage, res: ServerResponse, path: string, immutable = false) {
    const file = await open(path, 'r');
    try {
      const stat = await file.stat();
      if (!stat.isFile()) { text(req, res, 404, 'Not found\n'); return; }
      res.writeHead(200, {
        'Content-Type': contentTypes[extname(path).toLowerCase()] ?? 'application/octet-stream',
        'Content-Length': stat.size,
        'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
      });
      if (req.method === 'HEAD') res.end();
      else await pipeline(file.createReadStream({ autoClose: false }), res);
    } finally { await file.close(); }
  }

  async function handle(req: IncomingMessage, res: ServerResponse) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    let path: string;
    try { path = decodeURIComponent((req.url ?? '').split('?')[0]); }
    catch { text(req, res, 400, 'Bad request\n'); return; }
    // Inspect before URL normalization can hide traversal. Never expose dotfiles.
    if (!path.startsWith('/') || path.startsWith('//') || /[\\\x00-\x1f\x7f]/.test(path) ||
        path.split('/').some(segment => segment.startsWith('.'))) {
      text(req, res, 400, 'Bad request\n'); return;
    }
    if (path === '/api/calendar' || path.startsWith('/api/calendar/')) {
      await relay(req, res); return;
    }
    if (path === '/api' || path.startsWith('/api/') || path === '/protocol/v2' || path.startsWith('/protocol/v2/')) {
      text(req, res, 404, 'Not found\n'); return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      text(req, res, 405, 'Method not allowed\n'); return;
    }
    if (path === '/healthz') { text(req, res, 200, 'ok\n'); return; }
    if (path === '/') { await serveFile(req, res, index); return; }

    let file: string;
    try { file = await realpath(resolve(root, '.' + path)); }
    catch (error) {
      if (!['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
      if (extname(path) || path === '/assets' || path.startsWith('/assets/')) {
        text(req, res, 404, 'Not found\n'); return;
      }
      await serveFile(req, res, index); return;
    }
    if (!inside(file)) { text(req, res, 404, 'Not found\n'); return; }
    const immutable = /^\/assets\/.+-[\w-]{8,}\.[\w]+$/.test(path) && extname(file) !== '.html';
    await serveFile(req, res, file, immutable);
  }

  const server = createServer((req, res) => {
    void handle(req, res).catch(() => {
      if (res.headersSent || res.destroyed) res.destroy();
      else text(req, res, 500, 'Internal server error\n');
    });
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.maxHeadersCount = 32;
  return server;
}
