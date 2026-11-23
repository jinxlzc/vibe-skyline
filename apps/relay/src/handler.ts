import type { IncomingMessage, ServerResponse } from 'node:http';
import { calendarHandler, calendarErrorResponse } from '../../../packages/calendars/src/index';
import { createPublicFetch } from './upstream';

export interface RelayOptions {
  origins: string[];
  fakeIpCidrs?: readonly string[];
  fetcher?: typeof fetch;
  now?: () => number;
  perMinute?: number;
  globalPerMinute?: number;
  concurrency?: number;
  timeoutMs?: number;
}
export function createRelay(options: RelayOptions) {
  for (const origin of options.origins) {
    const parsed = new URL(origin);
    if (parsed.origin !== origin || !['http:', 'https:'].includes(parsed.protocol)) throw Error('Invalid CORS origin');
  }
  const origins = new Set(options.origins);
  const now = options.now ?? Date.now;
  const transport = createPublicFetch({ fakeIpCidrs: options.fakeIpCidrs });
  const handle = calendarHandler(options.fetcher ?? transport, { timeoutMs: options.timeoutMs, now });
  const clients = new Map<string, { start: number; count: number }>();
  let global = { start: now(), count: 0 }, active = 0;
  return async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Vary', 'Origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const send = (status: number, error: string) => { res.statusCode = status; res.end(JSON.stringify({ error })); };
    const origin = req.headers.origin;
    if (origin && !origins.has(origin)) { send(403, 'Origin not allowed'); return; }
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    if (req.method === 'OPTIONS') {
      if (!origin || req.headers['access-control-request-method'] !== 'GET' || req.headers['access-control-request-headers']) {
        send(403, 'Preflight not allowed'); return;
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET'); res.statusCode = 204; res.end(); return;
    }
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET, OPTIONS'); send(405, 'GET only'); return; }
    if (req.headers.authorization || req.headers.cookie) { send(400, 'Credentials are not accepted'); return; }
    // Never trust client-supplied X-Forwarded-For. Behind a proxy this shares its quota.
    const key = req.socket.remoteAddress ?? 'unknown', time = now();
    if (time - global.start >= 60000) { global = { start: time, count: 0 }; clients.clear(); }
    const client = clients.get(key) ?? { start: time, count: 0 };
    if (time - client.start >= 60000) { client.start = time; client.count = 0; }
    if (++global.count > (options.globalPerMinute ?? 300) || ++client.count > (options.perMinute ?? 30) ||
      active >= (options.concurrency ?? 8) || (!clients.has(key) && clients.size >= 2048)) {
      res.setHeader('Retry-After', '60'); send(429, 'Rate limited. Retry in a minute.'); return;
    }
    clients.set(key, client);
    active++;
    try {
      // Origin-form only: this is a fixed calendar route, never a URL proxy.
      if (!req.url?.startsWith('/api/calendar/')) throw Error('Invalid calendar request');
      const data = await handle(req.url);
      res.end(JSON.stringify(data));
    } catch (error) {
      const safe = calendarErrorResponse(error); send(safe.status, safe.error);
    } finally { active--; }
  };
}
