import type { ActivityBundle } from '@vibeskyline/contracts';
export function relayBase(raw = '') {
  if (!raw) return '';
  const url = new URL(raw);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))))
    throw Error('Relay must be an HTTPS origin (loopback HTTP allowed for development).');
  return url.origin;
}
export function bundleKind(bundle: ActivityBundle) {
  if (bundle.sources.some(s => s.sample) || bundle.provenance.some(p => p.method === 'synthetic')) return 'synthetic';
  return bundle.provenance.length > 0 && bundle.provenance.every(p => p.method === 'public-http') ? 'public' : 'unknown';
}

export const calendarSources = [
  { id: "github", name: "GitHub", status: "verified" },
  { id: "gitee", name: "Gitee", status: "verified" },
  { id: "gitlab", name: "GitLab · Beta", status: "fixture-tested" },
] as const;
