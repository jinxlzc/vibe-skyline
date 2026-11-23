import { afterAll, beforeAll, expect, it } from 'vitest';
import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { get, createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

let root: string;
let entry: string;
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'skyline-entry-'));
  entry = join(root, 'server/dist/index.mjs');
  await mkdir(join(root, 'dist'), { recursive: true });
  await writeFile(join(root, 'dist/index.html'), '<div id="root">Synthetic build</div>');
  await writeFile(join(root, 'dist/large.bin'), Buffer.alloc(8 * 1024 * 1024, 42));
  // Simulate an outbound dependency handle left alive after inbound HTTP closes.
  await writeFile(join(root, 'lingering.mjs'), 'setInterval(() => {}, 1000);');
  await build({ entryPoints: [fileURLToPath(new URL('../server/index.ts', import.meta.url))],
    outfile: entry, bundle: true, platform: 'node', format: 'esm', target: 'node22', logLevel: 'silent' });
});
afterAll(async () => { if (root) await rm(root, { recursive: true, force: true }); });

it.each([undefined, '', ' ', '0', '-1', '65536', '1.5', 'NaN', '1e3', '0x1234', '3000oops'])('compiled production entry rejects PORT=%s', async PORT => {
  const child = spawn(process.execPath, [entry], { cwd: tmpdir(), env: { NODE_ENV: 'production', ...(PORT === undefined ? {} : { PORT }) } });
  let stderr = '';
  child.stderr.on('data', data => { stderr += data; });
  const [code] = await once(child, 'exit');
  expect(code).not.toBe(0);
  expect(stderr).toContain('PORT');
});

it.each([['SIGINT', false], ['SIGTERM', false], ['SIGTERM', true]] as const)('compiled server drains on %s (lingering dependency: %s)', async (signal, lingering) => {
  const probe = createServer();
  probe.listen(0, '0.0.0.0');
  await once(probe, 'listening');
  const port = (probe.address() as { port: number }).port;
  await new Promise<void>(resolve => probe.close(() => resolve()));
  const child = spawn(process.execPath, [...(lingering ? ['--import', join(root, 'lingering.mjs')] : []), entry], {
    cwd: tmpdir(), env: { NODE_ENV: 'production', PORT: String(port) },
  });
  const exit = once(child, 'exit');
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Startup timed out')), 10000);
      let stdout = '';
      child.stdout.on('data', data => {
        stdout += data;
        if (stdout.includes(`0.0.0.0:${port}`)) { clearTimeout(timer); resolve(); }
      });
      child.once('exit', () => { clearTimeout(timer); reject(Error('Exited before listening')); });
      child.once('error', reject);
    });
    expect(await (await fetch(`http://127.0.0.1:${port}/`)).text()).toContain('Synthetic build');
    expect((await fetch(`http://127.0.0.1:${port}/healthz`)).status).toBe(200);
    const size = await new Promise<number>((resolve, reject) => {
      get(`http://127.0.0.1:${port}/large.bin`, response => {
        response.pause();
        child.kill(signal);
        let bytes = 0;
        response.on('data', chunk => { bytes += chunk.length; });
        response.on('end', () => resolve(bytes));
        response.on('error', reject);
        setTimeout(() => response.resume(), 50);
      }).on('error', reject);
    });
    expect(size).toBe(8 * 1024 * 1024);
    let deadline: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([exit, new Promise(resolve => {
        deadline = setTimeout(() => resolve('Shutdown exceeded deadline'), 16000);
      })]);
      expect(result).toEqual([lingering ? 1 : 0, null]);
    } finally { clearTimeout(deadline); }
    await expect(fetch(`http://127.0.0.1:${port}/healthz`)).rejects.toThrow();
  } finally {
    if (child.exitCode === null && child.signalCode === null) { child.kill('SIGKILL'); await exit; }
  }
}, 25000);
