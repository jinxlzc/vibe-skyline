import { demoBundle } from "./demo";
import { it, expect } from 'vitest';
import { registry } from '@vibeskyline/registry';
import { relayBase, bundleKind } from './online';
it('demo is synthetic even if a sample contains declared public identity', () => {
  const b = demoBundle();
  b.sources[0].publicIdentity = {provider:'github',kind:'username',value:'orchard',provenance:'explicit-public-handle'};
  expect(bundleKind(b)).toBe('synthetic');
  b.sources.forEach(s => { s.sample = false; });
  expect(bundleKind(b)).toBe('synthetic');
  expect(registry.find(s=>s.id==='github')?.status).toBe('verified');
  expect(registry.find(s=>s.id==='gitee')?.status).toBe('verified');
  expect(registry.find(s=>s.id==='gitlab')?.status).toBe('fixture-tested');
});
it('relay config accepts a single chosen region; rejects credentials and URL paths', () => {
  expect(relayBase()).toBe(''); expect(relayBase('https://relay.example/')).toBe('https://relay.example');
  expect(relayBase('http://127.0.0.1:8787')).toContain('8787');
  for (const raw of ['https://secret@relay.example','http://remote.example','https://relay.example/?token=x','https://relay.example/path'])
    expect(()=>relayBase(raw)).toThrow();
});
