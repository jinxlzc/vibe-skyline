import { afterEach, expect, it, vi } from 'vitest';
import { lookup } from 'node:dns/promises';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProductionServer } from '../server/app';
import { respond } from '../../relay/src/upstream.test-support';

// Only outbound DNS/HTTPS are synthetic; HTTP routing, relay and parser are real.
vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }));
vi.mock('node:https', () => ({ request: vi.fn() }));
afterEach(() => vi.clearAllMocks());

async function running(env: NodeJS.ProcessEnv, run: (origin: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), 'skyline-production-relay-'));
  await writeFile(join(root, 'index.html'), '<div id="root"></div>');
  const server = createProductionServer(root, { NODE_ENV: 'production', ...env });
  try {
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    await run(`http://127.0.0.1:${(server.address() as { port: number }).port}`);
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
}
const route = '/api/calendar/github/orchard?year=2026';

it.each([undefined, '', '   '])('empty production origins (%s) permit no-Origin GETs but reject localhost and foreign Origins', async RELAY_ORIGINS => {
  vi.mocked(lookup).mockResolvedValue([{ address: '140.82.112.3', family: 4 }] as never);
  respond(200, await readFile(new URL('../../../fixtures/calendars/github.html', import.meta.url), 'utf8'));
  await running({ RELAY_ORIGINS }, async origin => {
    const response = await fetch(origin + route);
    expect(response.status).toBe(200);
    expect((await response.json()).publicIdentity.value).toBe('orchard');
    for (const originHeader of ['http://localhost:4173', 'http://127.0.0.1:5173', 'https://evil.example']) {
      expect((await fetch(origin + route, { headers: { origin: originHeader } })).status).toBe(403);
    }
  });
});

it.each(['198.18.0.40', '127.0.0.1', '10.1.2.3', '169.254.169.254'])('production rejects DNS %s despite fake-IP environment opt-in', async address => {
  vi.mocked(lookup).mockResolvedValue([{ address, family: 4 }] as never);
  respond(200, await readFile(new URL('../../../fixtures/calendars/github.html', import.meta.url), 'utf8'));
  await running({ RELAY_LOCAL_FAKE_IP_CIDRS: '198.18.0.0/15' }, async origin => {
    const response = await fetch(origin + route);
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('orchard');
  });
});

it.each([undefined, 'development'])('the production server keeps fake-IP blocked even with NODE_ENV=%s', async NODE_ENV => {
  vi.mocked(lookup).mockResolvedValue([{ address: '198.18.0.40', family: 4 }] as never);
  respond(200, await readFile(new URL('../../../fixtures/calendars/github.html', import.meta.url), 'utf8'));
  await running({ NODE_ENV, RELAY_LOCAL_FAKE_IP_CIDRS: '198.18.0.0/15' }, async origin => {
    expect((await fetch(origin + route)).status).toBe(502);
  });
});
