import { it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import manifest from "../manifest.json";
import { LogoManifest, mayVendor, compileOfficialLogo } from "./index";
const github = manifest.find(m => m.brand === 'github')!;
const svg = await readFile(new URL('../assets/github-invertocat.svg', import.meta.url), 'utf8');
it('bundles the exact official GitHub bytes without claiming a license grant', async () => {
  expect(createHash('sha256').update(svg).digest('hex')).toBe('bce494189797623c34e39a41c2c38a132bdca23ce4e6ac06b70116ed7e91ce26');
  expect(Buffer.byteLength(svg)).toBe(873);
  expect(svg).not.toMatch(/<script|href\s*=/i);
  expect(LogoManifest.parse(github).licenseStatus).toBe('owner-accepted-risk');
  expect(mayVendor(github)).toBe(false); // a product override is not a license
  const tile = await compileOfficialLogo(github, svg);
  expect(tile.width).toBe(12.5);
  expect(tile.paths.flat().length).toBeGreaterThan(100); // not a reserved rectangle
  expect(tile.paths).toHaveLength(1);
  expect(tile.measurements.minStrokeMm).toBeCloseTo(.957, 3);
  expect(tile.measurements.minGapMm).toBeCloseTo(.538, 3);
  expect(tile.measurements.qualified).toBe(false);
});
it('unbundled marks remain blocked and no reviewed entry asserts a grant', async () => {
  for (const m of manifest) {
    expect(LogoManifest.parse(m).licenseStatus).not.toBe('approved');
    expect(mayVendor(m)).toBe(false);
    if (!m.review.vendored) await expect(compileOfficialLogo(m, '<svg/>')).rejects.toThrow(/not bundled/);
  }
});
it('rejects changed official bytes, including active or remote content', async () => {
  for (const altered of [svg.replace('<path', '<script/><path'), svg.replace('<path', '<use href="https://example.invalid/x"/><path'), svg.replace('10.226', '10.227')])
    await expect(compileOfficialLogo(github, altered)).rejects.toThrow(/hash/);
});

it('resolves defaults, official kill switches and BYO without inferring official provenance', async () => {
  const {compileSourceLogo} = await import('./index');
  expect((await compileSourceLogo('github','brand'))?.paths).toEqual((await compileOfficialLogo(github,svg)).paths);
  for (const mode of ['neutral','none'] as const) expect(await compileSourceLogo('github',mode,{localSVG:'<script/>'})).toBeUndefined();
  for (const options of [{officialEnabled:false},{disabledSources:['github']}]) {
    expect(await compileSourceLogo('github','brand',options)).toBeUndefined();
    const local=await compileSourceLogo('github','brand',{...options,localSVG:'<svg><circle r="5"/></svg>'});
    expect(local?.width).toBe(12.5);
    expect(local?.measurements).not.toHaveProperty('provenance');
  }
  for (const m of manifest.filter(m=>!m.review.vendored)) expect(await compileSourceLogo(m.brand,'brand')).toBeUndefined();
  expect(await compileSourceLogo('constructor','brand')).toBeUndefined();
});
it('generated bundled text remains byte-identical to the vendored SVG', async()=>{
 const {default:bundled}=await import('./bundled-svg.json');
 for(const m of manifest.filter(m=>m.review.vendored)){
  const original=await readFile(new URL('../'+m.assetPath,import.meta.url),'utf8');
  expect(bundled[m.brand as keyof typeof bundled]).toBe(original);
  expect(createHash('sha256').update(original).digest('hex')).toBe(m.sha256);
  const tile=await compileOfficialLogo(m,original);expect(tile.width).toBe(12.5);expect(tile.measurements.qualified).toBe(false);
 }
});
