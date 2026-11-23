import { expect, it } from 'vitest';
import { relayEnvironment } from './config';
import { createRelay } from './handler';

it.each([undefined, '', '   '])('production has no default CORS origins (%s)', RELAY_ORIGINS => {
  expect(relayEnvironment({ NODE_ENV: 'production', RELAY_ORIGINS }, ['http://localhost:4173']).origins).toEqual([]);
});

it.each(['198.18.0.0/15', '10.0.0.0/8', 'malformed'])('production ignores fake-IP opt-in (%s)', RELAY_LOCAL_FAKE_IP_CIDRS => {
  const options = relayEnvironment({ NODE_ENV: 'production', RELAY_LOCAL_FAKE_IP_CIDRS,
    RELAY_ORIGINS: 'https://skyline.example' }, ['http://localhost:4173']);
  expect(options).toEqual({ origins: ['https://skyline.example'], fakeIpCidrs: [] });
  expect(() => createRelay(options)).not.toThrow();
});

it('has no implicit local exception or proxy opt-in', () => {
  const options = relayEnvironment({ NODE_ENV: 'development', HTTPS_PROXY: 'http://127.0.0.1:7890' }, ['http://localhost:4173']);
  expect(options).toEqual({ origins: ['http://localhost:4173'], fakeIpCidrs: [] });
});

it('parses shell settings for both relay entry points', () => {
  const options = relayEnvironment({ RELAY_LOCAL_FAKE_IP_CIDRS: '198.18.0.0/24, 198.19.0.0/24',
    RELAY_ORIGINS: 'http://localhost:4173, http://192.168.0.10:4173' }, []);
  expect(options).toEqual({ origins: ['http://localhost:4173', 'http://192.168.0.10:4173'],
    fakeIpCidrs: ['198.18.0.0/24', '198.19.0.0/24'] });
  expect(() => createRelay(options)).not.toThrow();
});

it.each(['10.0.0.0/8', '198.18.0.0/15,', '198.18.0.0/15,,198.19.0.0/16',
  Array(17).fill('198.18.0.0/15').join(',')])('fails at startup for invalid CIDR setting %s', value => {
  expect(() => createRelay(relayEnvironment({ RELAY_LOCAL_FAKE_IP_CIDRS: value }, []))).toThrow('Invalid local fake-IP CIDR');
});

it.each(['*', 'http://192.168.0.10:4173/', 'http://user:pass@192.168.0.10:4173',
  'http://192.168.0.10:4173/path', 'null'])('fails at startup for non-exact origin %s', value => {
  expect(() => createRelay(relayEnvironment({ RELAY_ORIGINS: value }, []))).toThrow();
});
