import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { lookup } from 'node:dns/promises';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { respond } from '../../relay/src/upstream.test-support';
vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }));
vi.mock('node:https', () => ({ request: vi.fn() }));
beforeEach(() => {
  vi.mocked(lookup).mockResolvedValue([{ address: '198.18.0.40', family: 4 }] as never);
});
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); });

it.each(['dev', 'preview'])('actual Vite %s reads explicit runtime CIDRs/origins and keeps defaults closed', async mode => {
  const { createServer: viteServer, preview } = await import('vite');
  const { calendars } = await import('../vite.config');
  const root = await mkdtemp(join(tmpdir(), 'vibeskyline-relay-test-'));
  const html = await readFile(new URL('../../../fixtures/calendars/github.html', import.meta.url), 'utf8');
  await mkdir(join(root, 'dist'));
  await writeFile(join(root, 'dist/index.html'), '<p>Synthetic preview fixture</p>');
  const lan = 'http://192.168.0.10:4173'; // Header only; never contacted.
  try {
    for (const enabled of [false, true]) {
      vi.stubEnv('RELAY_LOCAL_FAKE_IP_CIDRS', enabled ? '198.18.0.0/15' : undefined);
      vi.stubEnv('RELAY_ORIGINS', enabled ? lan : undefined);
      vi.stubEnv('NODE_ENV', 'development'); // Development alone must never enable the exception.
      respond(200, html);
      const config = { configFile: false as const, root, logLevel: 'silent' as const, plugins: [calendars()] };
      // Vite 6 treats dev port 0 as its default; allow a free port when other tests own it.
      const server = mode === 'dev'
        ? await viteServer({ ...config, server: { host: '127.0.0.1', port: 0, strictPort: false } })
        : await preview({ ...config, preview: { host: '127.0.0.1', port: 0, strictPort: true } });
      if ('listen' in server) await server.listen();
      try {
        const { port } = server.httpServer!.address() as { port: number };
        const url = `http://127.0.0.1:${port}/api/calendar/github/orchard?year=2026`;
        const noOrigin = await fetch(url);
        expect(noOrigin.status).toBe(enabled ? 200 : 502);
        const allowed = await fetch(url, { headers: { origin: lan } });
        expect(allowed.status).toBe(enabled ? 200 : 403);
        expect(allowed.headers.get('access-control-allow-origin')).toBe(enabled ? lan : null);
        const preflight = await fetch(url, { method: 'OPTIONS', headers: { origin: lan, 'access-control-request-method': 'GET' } });
        expect(preflight.status).toBe(enabled ? 204 : 403);
        const denied = await fetch(url, { headers: { origin: 'http://unlisted.example:4173' } });
        expect(denied.status).toBe(403);
        expect(denied.headers.get('access-control-allow-origin')).toBeNull();
        expect(allowed.headers.get('access-control-allow-credentials')).toBeNull();
      } finally {
        await server.close();
      }
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
