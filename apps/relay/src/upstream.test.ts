import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { lookup } from 'node:dns/promises';
import { request, type RequestOptions } from 'node:https';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { respond } from './upstream.test-support';
import { createRelay } from './handler';
import { createPublicFetch, publicFetch, publicIPv4, resolvePublic } from './upstream';

// Only DNS and outbound HTTPS are mocked; relay routing/error mapping stay real.
vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }));
vi.mock('node:https', () => ({ request: vi.fn() }));
beforeEach(() => {
  vi.mocked(lookup).mockResolvedValue([{ address: '198.18.0.40', family: 4 }] as never);
  vi.mocked(request).mockImplementation(() => { throw Error('Unexpected outbound HTTPS'); });
});
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); });

const fakeIpCidrs = ['198.18.0.0/15'];
function answer(...addresses: string[]) {
  vi.mocked(lookup).mockResolvedValue(addresses.map(address => ({ address, family: 4 })) as never);
}

it('reproduces fake-ip DNS rejection and the reported no-Origin HTTP 502 with default transport', async () => {
  await expect(resolvePublic('github.com')).rejects.toThrow('Blocked address');
  await expect(publicFetch('https://github.com/users/orchard/contributions?from=2026-01-01&to=2026-12-31'))
    .rejects.toThrow('Blocked address');
  const server = createServer(createRelay({ origins: [] }));
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  try {
    const { port } = server.address() as { port: number };
    const response = await fetch(`http://127.0.0.1:${port}/api/calendar/github/orchard?year=2026`);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Calendar upstream or network failure. Retry later.' });
    expect(request).not.toHaveBeenCalled();
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

it.each(['198.18.0.40', '198.19.255.254', '10.1.1.1', '127.0.0.1', '169.254.169.254',
  '172.16.0.1', '192.168.1.1', '100.100.100.200', '192.0.2.1', '198.51.100.1', '203.0.113.1',
  '0.0.0.0', '224.0.0.1', '255.255.255.255', '::1', '::ffff:198.18.0.40'])('defaults reject %s', async ip => {
  answer(ip);
  expect(publicIPv4(ip)).toBe(false);
  await expect(resolvePublic('github.com')).rejects.toThrow('Blocked address');
});

it.each(['github.com', 'gitee.com', 'gitlab.com'])('allows configured fake IPs only for %s', async host => {
  await expect(resolvePublic(host, lookup, fakeIpCidrs)).resolves.toBe('198.18.0.40');
  answer('198.19.255.255');
  await expect(resolvePublic(host, lookup, fakeIpCidrs)).resolves.toBe('198.19.255.255');
});

it('respects narrower CIDRs, multiple ranges and all DNS answers', async () => {
  await expect(resolvePublic('github.com', lookup, ['198.18.0.40/32'])).resolves.toBe('198.18.0.40');
  answer('198.18.1.40');
  await expect(resolvePublic('github.com', lookup, ['198.18.0.0/24'])).rejects.toThrow('Blocked address');
  await expect(resolvePublic('github.com', lookup, ['198.18.0.0/24', '198.18.1.0/24'])).resolves.toBe('198.18.1.40');
  for (const addresses of [[], ['198.18.0.40', '169.254.169.254'], ['140.82.112.3', '198.19.0.1']]) {
    answer(...addresses);
    await expect(resolvePublic('github.com', lookup, ['198.18.0.0/24'])).rejects.toThrow('Blocked address');
  }
  answer('140.82.112.3');
  await expect(resolvePublic('github.com', lookup, fakeIpCidrs)).resolves.toBe('140.82.112.3');
});

it.each(['10.0.0.1', '127.0.0.1', '169.254.169.254',
  '172.16.0.1', '192.168.1.1', '100.100.100.200', '192.0.2.1', '198.51.100.1', '203.0.113.1',
  '0.0.0.0', '224.0.0.1', '::ffff:198.18.0.40'])('opt-in still rejects %s', async ip => {
  answer(ip);
  await expect(resolvePublic('github.com', lookup, fakeIpCidrs)).rejects.toThrow('Blocked address');
});

it.each(['10.0.0.0/8', '127.0.0.0/8', '169.254.0.0/16', '192.168.0.0/16', '100.64.0.0/10',
  '0.0.0.0/0', '198.0.0.0/8', '198.16.0.0/14', '198.20.0.0/16', '198.18.0.40/15',
  '198.18.0.0/33', '198.18.0.0/-1', '198.18.0.0/015', '198.18.0.0', '198.18.00.0/16',
  '::ffff:198.18.0.0/111', '', '*'])('rejects unsafe or malformed CIDR config: %s', cidr => {
  expect(() => createPublicFetch({ fakeIpCidrs: [cidr] })).toThrow('Invalid local fake-IP CIDR');
});

it('checks the host allowlist before DNS even with opt-in', async () => {
  for (const host of ['evil.example', 'github.com.evil', '169.254.169.254', 'localhost'])
    await expect(resolvePublic(host, lookup, fakeIpCidrs)).rejects.toThrow('Blocked upstream');
  expect(lookup).not.toHaveBeenCalled();
});

it.each(['http://github.com/', 'https://github.com.evil/', 'https://169.254.169.254/',
  'https://198.18.0.40/', 'https://127.0.0.1/', 'https://[::1]/', 'https://token@github.com/',
  'https://user:pass@github.com/', 'https://github.com:8443/'])('opt-in blocks unsafe upstream URL %s', async url => {
  await expect(createPublicFetch({ fakeIpCidrs })(url)).rejects.toThrow('Blocked upstream');
  expect(lookup).not.toHaveBeenCalled();
  expect(request).not.toHaveBeenCalled();
});

it('pins the checked fake IP while retaining hostname TLS identity and excluding browser credentials', async () => {
  respond();
  const result = await createPublicFetch({ fakeIpCidrs })('https://github.com/users/orchard/contributions', {
    headers: { Authorization: 'SYNTHETIC', Cookie: 'SYNTHETIC' },
  });
  expect(await result.text()).toBe('synthetic');
  const [url, options] = vi.mocked(request).mock.calls[0] as unknown as [URL, RequestOptions];
  expect(url.hostname).toBe('github.com');
  expect(options).toMatchObject({ agent: false, servername: 'github.com', rejectUnauthorized: true, method: 'GET', headers: {} });
  expect(options.checkServerIdentity).toBeUndefined();
  answer('169.254.169.254'); // A changed DNS answer cannot change the connection destination.
  const callback = vi.fn();
  options.lookup!('github.com', {}, callback);
  expect(callback).toHaveBeenCalledWith(null, '198.18.0.40', 4);
  expect(lookup).toHaveBeenCalledTimes(1);
});

it.each([301, 302, 307, 308])('opt-in refuses upstream redirect %s', async status => {
  respond(status);
  await expect(createPublicFetch({ fakeIpCidrs })('https://github.com/')).rejects.toThrow('Redirect blocked');
  expect(request).toHaveBeenCalledTimes(1);
});

it('opt-in retains response size limits and cancellation after DNS', async () => {
  respond(200, 'x'.repeat(2 * 1024 * 1024 + 1));
  await expect(createPublicFetch({ fakeIpCidrs })('https://github.com/')).rejects.toThrow('Response too large');
  vi.mocked(request).mockClear();
  const controller = new AbortController();
  vi.mocked(lookup).mockImplementation(async () => {
    controller.abort();
    return [{ address: '198.18.0.40', family: 4 }] as never;
  });
  await expect(createPublicFetch({ fakeIpCidrs })('https://github.com/', { signal: controller.signal })).rejects.toThrow();
  expect(request).not.toHaveBeenCalled();
});

it('returns 504 and never connects when opted-in DNS resolves after the overall deadline', async () => {
  let finishDNS: (() => void) | undefined;
  vi.mocked(lookup).mockImplementation(() => new Promise(resolve => {
    finishDNS = () => resolve([{ address: '198.18.0.40', family: 4 }] as never);
  }));
  const server = createServer(createRelay({ origins: [], fakeIpCidrs, timeoutMs: 20 }));
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  try {
    const { port } = server.address() as { port: number };
    const response = await fetch(`http://127.0.0.1:${port}/api/calendar/github/orchard?year=2026`);
    expect(response.status).toBe(504);
    expect(finishDNS).toBeTypeOf('function');
    finishDNS!();
    await new Promise(resolve => setImmediate(resolve));
    expect(request).not.toHaveBeenCalled();
  } finally {
    finishDNS?.();
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
