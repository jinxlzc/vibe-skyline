import { it, expect, vi } from 'vitest';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { createRelay, type RelayOptions } from './handler';
import { assertUpstream, publicIPv4, resolvePublic } from './upstream';
import { calendarHandler } from '../../../packages/calendars/src/index';
const fixture = () => readFile(new URL('../../../fixtures/calendars/github.html', import.meta.url), 'utf8');
async function running(options: Partial<RelayOptions>, fn: (base: string) => Promise<void>) {
  const server = createServer(createRelay({origins: ['https://site.example'], ...options}));
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address() as {port: number};
  try { await fn(`http://127.0.0.1:${address.port}`); }
  finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
}
const route = '/api/calendar/github/orchard?year=2026';
it('blocks non-allowlisted hosts, credentials, metadata, loopback and DNS rebinding', async () => {
  for (const url of ['http://github.com/', 'https://github.com.evil/', 'https://169.254.169.254/', 'https://127.0.0.1/', 'https://[::1]/', 'https://token@github.com/', 'https://github.com:8443/'])
    expect(() => assertUpstream(url)).toThrow();
  for (const ip of ['127.0.0.1','169.254.169.254','10.1.1.1','172.16.1.1','192.168.1.1','100.100.100.200','0.0.0.0','::ffff:127.0.0.1','::1']) expect(publicIPv4(ip)).toBe(false);
  expect(publicIPv4('140.82.112.3')).toBe(true);
  const resolver = vi.fn(async () => [{address: '140.82.112.3', family: 4}, {address:'169.254.169.254', family:4}]);
  await expect(resolvePublic('github.com', resolver as any)).rejects.toThrow('Blocked');
});
it.each([undefined, ['198.18.0.0/15']])('actual relay enforces CORS, method and credential restrictions before upstream (CIDRs: %s)', async fakeIpCidrs => {
  const fetcher = vi.fn(async () => new Response(await fixture()));
  await running({fetcher, fakeIpCidrs}, async base => {
    expect((await fetch(base + route, {headers:{origin:'https://evil.example'}})).status).toBe(403);
    expect((await fetch(base + route, {method:'POST', body:'raw logs'})).status).toBe(405);
    expect((await fetch(base + route, {headers:{authorization:'CANARY'}})).status).toBe(400);
    expect((await fetch(base + route, {headers:{cookie:'CANARY'}})).status).toBe(400);
    const pre = await fetch(base + route, {method:'OPTIONS', headers:{origin:'https://site.example','access-control-request-method':'GET'}});
    expect(pre.status).toBe(204);
    expect(fetcher).not.toHaveBeenCalled();
    const r = await fetch(base + route, {headers:{origin:'https://site.example'}});
    expect(r.status).toBe(200); expect(r.headers.get('access-control-allow-origin')).toBe('https://site.example');
    expect(r.headers.get('cache-control')).toBe('no-store'); expect(r.headers.get('vary')).toBe('Origin');
    expect(r.headers.get('access-control-allow-credentials')).toBeNull();
  });
});
it.each([undefined, ['198.18.0.0/15']])('rejects injection/redirects, sanitizes errors, times out stalled fetch/body (CIDRs: %s)', async fakeIpCidrs => {
  const fetcher = vi.fn(async () => new Response('', {status:302,headers:{Location:'http://169.254.169.254/'}}));
  await running({fetcher, fakeIpCidrs}, async base => {
    for (const path of ['/api/calendar/metadata/orchard?year=2026',route+'&url=http://169.254.169.254', '/api/calendar/github/%2f%2flocalhost?year=2026'])
      expect((await fetch(base + path)).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
    expect((await fetch(base + route)).status).toBe(502);
    expect(fetcher.mock.calls[0]).toMatchObject([expect.stringContaining('https://github.com/'), {redirect:'error'}]);
  });
  for (const fetcher of [() => new Promise<Response>(() => {}), async () => new Response(new ReadableStream({start(){}}))]) {
    await running({fetcher, fakeIpCidrs, timeoutMs:25}, async base => {
      const r = await fetch(base + route); expect(r.status).toBe(504); expect(await r.text()).not.toContain('orchard');
    });
  }
});
it.each([undefined, ['198.18.0.0/15']])('rate limits include cache hits, ignore spoofed forwarding, reset and cap concurrency (CIDRs: %s)', async fakeIpCidrs => {
  let now = 0;
  await running({fakeIpCidrs, now:()=>now, perMinute:1, fetcher:async()=>new Response(await fixture())}, async base => {
    expect((await fetch(base + route)).status).toBe(200);
    const limited = await fetch(base + route, {headers:{'x-forwarded-for':'8.8.8.8'}});
    expect(limited.status).toBe(429); expect(limited.headers.get('retry-after')).toBe('60');
    now = 60001; expect((await fetch(base + route)).status).toBe(200);
  });
  await running({fakeIpCidrs, concurrency:0}, async base => expect((await fetch(base + route)).status).toBe(429));
  await running({fakeIpCidrs, globalPerMinute:0}, async base => expect((await fetch(base + route)).status).toBe(429));
});
it('cache keys isolate source/handle/year and returns cannot mutate another request; expiry refetches', async () => {
  let now = 0;
  const html = await fixture();
  const fetcher = vi.fn(async () => new Response(html));
  const handle = calendarHandler(fetcher, {now:()=>now});
  const a = await handle(route); a.days[0].value = 999;
  expect((await handle(route)).days[0].value).toBe(0);
  const b = await handle(route.replace('orchard','maple'));
  expect(b.publicIdentity?.value).toBe('maple'); expect(fetcher).toHaveBeenCalledTimes(2);
  await expect(handle(route.replace('2026','2025'))).rejects.toThrow();
  await expect(handle(route.replace('github','gitee'))).rejects.toThrow();
  now = 3600001; await handle(route); expect(fetcher).toHaveBeenCalledTimes(5);
});
