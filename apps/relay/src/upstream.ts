import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';

const hosts = new Set(['github.com', 'gitee.com', 'gitlab.com']);
export function assertUpstream(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== 'https:' || !hosts.has(url.hostname) || url.port || url.username || url.password)
    throw Error('Blocked upstream');
  return url;
}
// Conservative public-unicast check. IPv6 egress is intentionally unsupported.
export function publicIPv4(address: string) {
  if (isIP(address) !== 4) return false;
  const [a, b] = address.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && [0, 168].includes(b)) ||
    (a === 198 && [18, 19, 51].includes(b)) || (a === 203 && b === 0));
}
type IpRange = { start: number; end: number };
const ipv4Number = (address: string) => address.split('.').reduce((n, part) => n * 256 + Number(part), 0);
// Local TUN exception only: canonical subnets of the benchmarking pool, never
// arbitrary private/reserved networks. Invalid configuration fails at startup.
function fakeIpRanges(cidrs: readonly string[]): IpRange[] {
  if (cidrs.length > 16) throw Error('Invalid local fake-IP CIDR configuration');
  return cidrs.map(cidr => {
    const match = /^(\d+\.\d+\.\d+\.\d+)\/(\d{1,2})$/.exec(cidr);
    if (!match || isIP(match[1]) !== 4) throw Error('Invalid local fake-IP CIDR');
    const prefix = Number(match[2]), start = ipv4Number(match[1]);
    const size = 2 ** (32 - prefix), pool = ipv4Number('198.18.0.0');
    if (prefix < 15 || prefix > 32 || start % size !== 0 || start < pool || start + size > pool + 131072)
      throw Error('Invalid local fake-IP CIDR');
    return { start, end: start + size - 1 };
  });
}
async function resolveChecked(host: string, resolver: typeof lookup, ranges: IpRange[]) {
  if (!hosts.has(host)) throw Error('Blocked upstream');
  const addresses = await resolver(host, { all: true, family: 4 });
  const allowed = (address: string) => publicIPv4(address) || (isIP(address) === 4 &&
    ranges.some(range => ipv4Number(address) >= range.start && ipv4Number(address) <= range.end));
  if (!addresses.length || addresses.some(a => !allowed(a.address))) throw Error('Blocked address');
  return addresses[0].address;
}
export async function resolvePublic(host: string, resolver = lookup, fakeIpCidrs: readonly string[] = []) {
  return resolveChecked(host, resolver, fakeIpRanges(fakeIpCidrs));
}
// DNS is checked once and pinned to the TLS connection; no DNS-rebinding gap.
// This fetch adapter never follows redirects and never forwards browser headers.
export function createPublicFetch(options: { fakeIpCidrs?: readonly string[] } = {}): typeof fetch {
  const ranges = fakeIpRanges(options.fakeIpCidrs ?? []);
  return async (input, init) => {
    const url = assertUpstream(String(input));
    const signal = init?.signal;
    signal?.throwIfAborted();
    const address = await resolveChecked(url.hostname, lookup, ranges);
    signal?.throwIfAborted();
    return new Promise<Response>((resolve, reject) => {
      const req = request(url, {
        // A fresh direct agent avoids global-agent proxy settings and pooled
        // connections bypassing this request's checked/pinned DNS address.
        agent: false,
        family: 4,
        servername: url.hostname, rejectUnauthorized: true,
        method: 'GET', signal: signal ?? undefined,
        headers: url.hostname === 'gitee.com' ? { 'X-Requested-With': 'XMLHttpRequest' } : {},
        lookup: (_hostname, _options, callback) => callback(null, address, 4),
      }, res => {
        const status = res.statusCode ?? 502;
        if (status >= 300 && status < 400) { res.destroy(); reject(Error('Redirect blocked')); return; }
        const chunks: Buffer[] = []; let size = 0;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > 2 * 1024 * 1024) { req.destroy(Error('Response too large')); return; }
          chunks.push(chunk);
        });
        res.on('error', reject);
        res.on('end', () => resolve(new Response(status === 204 || status === 304 ? null : Buffer.concat(chunks), { status })));
      });
      req.on('error', reject);
      req.end();
    });
  };
}
export const publicFetch = createPublicFetch();
