import { afterAll, beforeAll, expect, it } from 'vitest';
import { once } from 'node:events';
import { copyFile, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProductionServer } from '../server/app';

let root: string;
let origin: string;
let server: ReturnType<typeof createProductionServer>;
const index = '<!doctype html><div id="root">Synthetic skyline</div>';
const route = '/api/calendar/github/orchard?year=2026';
const brandAssets = [
  ['favicon.svg', 'image/svg+xml'],
  ['favicon.ico', 'image/x-icon'],
  ['favicon-16.png', 'image/png'],
  ['favicon-32.png', 'image/png'],
  ['apple-touch-icon.png', 'image/png'],
  ['icon-192.png', 'image/png'],
  ['icon-512.png', 'image/png'],
  ['og.png', 'image/png'],
  ['manifest.webmanifest', 'application/manifest+json'],
];

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'skyline-production-'));
  const dist = join(root, 'dist');
  await mkdir(join(dist, 'assets'), { recursive: true });
  await writeFile(join(dist, 'index.html'), index);
  await writeFile(join(dist, 'assets/app-Ab12_cd3.js'), 'export const synthetic = true;');
  await writeFile(join(dist, 'assets/app-Ab12_cd3.css'), 'body { color: black; }');
  await writeFile(join(dist, 'assets/font-Ab12_cd3.woff2'), 'synthetic font');
  await writeFile(join(dist, 'icon.svg'), '<svg/>');
  for (const [name] of brandAssets) {
    await copyFile(new URL(`../public/${name}`, import.meta.url), join(dist, name));
  }
  // Even a copied protocol document must stay inaccessible in production.
  await mkdir(join(dist, 'protocol/v2'), { recursive: true });
  await writeFile(join(dist, 'protocol/v2/spec.md'), 'daily activity protocol vibeskyline.activity.v2');
  await writeFile(join(root, 'secret.txt'), 'OUTSIDE_CANARY');
  await symlink(join(root, 'secret.txt'), join(dist, 'link.txt'));
  server = createProductionServer(dist, { NODE_ENV: 'production', RELAY_ORIGINS: 'https://skyline.example' });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});

afterAll(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
  if (root) await rm(root, { recursive: true, force: true });
});

it.each(['/', '/index.html', '/customize/skyline'])('serves uncached index at %s', async path => {
  const response = await fetch(origin + path);
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
  expect(response.headers.get('cache-control')).toBe('no-cache');
  expect(await response.text()).toBe(index);
});

it.each([
  ['js', 'text/javascript; charset=utf-8'],
  ['css', 'text/css; charset=utf-8'],
  ['woff2', 'font/woff2'],
])('serves immutable hashed %s assets with their MIME type', async (extension, type) => {
  const name = extension === 'woff2' ? 'font' : 'app';
  const response = await fetch(`${origin}/assets/${name}-Ab12_cd3.${extension}`);
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe(type);
  expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
  expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
});

it('serves unhashed files without immutable caching and HEAD without a body', async () => {
  const response = await fetch(origin + '/icon.svg', { method: 'HEAD' });
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('image/svg+xml');
  expect(response.headers.get('cache-control')).toBe('no-cache');
  expect(response.headers.get('content-length')).toBe('6');
  expect(await response.text()).toBe('');
});

it.each(brandAssets)('serves the public brand asset %s with its MIME type', async (name, type) => {
  const response = await fetch(`${origin}/${name}`);
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe(type);
  expect(response.headers.get('cache-control')).toBe('no-cache');
  expect(Buffer.from(await response.arrayBuffer())).toEqual(await readFile(new URL(`../public/${name}`, import.meta.url)));
});

it('answers health without an upstream call or Origin restriction', async () => {
  const response = await fetch(origin + '/healthz', { headers: { origin: 'https://evil.example' } });
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
  expect(await response.text()).toBe('ok\n');
});

it('uses the real relay for CORS, credentials, method and fixed-route rejection', async () => {
  expect((await fetch(origin + route, { headers: { origin: 'https://evil.example' } })).status).toBe(403);
  for (const name of ['authorization', 'cookie']) {
    expect((await fetch(origin + route, { headers: { [name]: 'SYNTHETIC' } })).status).toBe(400);
  }
  for (const path of ['/api/calendar', '/api/calendar/evil.example/orchard?year=2026', route + '&url=http://127.0.0.1']) {
    const response = await fetch(origin + path);
    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).not.toContain('<!doctype');
  }
  expect((await fetch(origin + route, { method: 'POST' })).status).toBe(405);
  const preflight = await fetch(origin + route, { method: 'OPTIONS', headers: {
    origin: 'https://skyline.example', 'access-control-request-method': 'GET',
  } });
  expect(preflight.status).toBe(204);
  expect(preflight.headers.get('access-control-allow-origin')).toBe('https://skyline.example');
  expect(preflight.headers.get('access-control-allow-credentials')).toBeNull();
});

it.each(['/api', '/api/unknown', '/api/calendarish', '/assets/missing.js', '/assets/missing', '/protocol/v2/spec.md'])('does not fall through to HTML for %s', async path => {
  const response = await fetch(origin + path);
  expect(response.status).toBe(404);
  expect(await response.text()).not.toMatch(/Synthetic skyline|daily activity protocol|vibeskyline\.activity\.v2|\$schema/);
});

it.each(['/../secret.txt', '/%2e%2e/secret.txt', '/..%2fsecret.txt', '/%5c..%5csecret.txt', '/link.txt', '/.env', '/%00', '/%ZZ'])('blocks unsafe static path %s', async path => {
  // Raw HTTP preserves traversal that fetch would normalize away.
  const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = request(origin, { path }, res => {
      let body = '';
      res.setEncoding('utf8').on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode!, body }));
    });
    req.on('error', reject).end();
  });
  expect([400, 404]).toContain(response.status);
  expect(response.body).not.toContain('OUTSIDE_CANARY');
});

it('rejects POST to static and health routes', async () => {
  for (const path of ['/', '/healthz']) expect((await fetch(origin + path, { method: 'POST' })).status).toBe(405);
});

it('fails at startup when the browser build is missing', () => {
  expect(() => createProductionServer(join(root, 'missing'), { NODE_ENV: 'production' })).toThrow();
});
