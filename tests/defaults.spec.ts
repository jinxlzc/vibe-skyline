import { demoBundle } from "../apps/web/src/demo";
import { test, expect, type Download, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { unzipSync, strFromU8 } from 'fflate';
import { buildPlan, contrastRatio, defaultRecipe } from '../packages/core/src/index';
import { themes } from '../packages/registry/src/index';
import { parseCalendar } from '../packages/calendars/src/index';
import { generateGeometry, validateMesh, validateSpatial, type Mesh } from '../packages/geometry/src/index';
import { readSTL } from '../packages/exporters/stl/src/index';
import { compileSourceLogo } from '../packages/logos/src/index';
import { validate3MF } from '../packages/exporters/three-mf/src/index';

const out = 'test-results/m2-defaults-examples';
const shots = 'test-results/m2-defaults-shots';
async function ready(page: Page) {
  await expect(page.getByTestId('dimensions')).toContainText('mm', { timeout: 120000 });
  await expect(page.getByText('Building exact geometry…')).toBeHidden();
  await expect(page.getByRole('alert')).toHaveCount(0);
}
async function shot(page: Page, name: string) {
  await mkdir(shots, { recursive: true });
  await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
function meshBounds(meshes: Mesh[]) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const mesh of meshes) for (let i = 0; i < mesh.vertices.length; i++) {
    lo[i % 3] = Math.min(lo[i % 3], mesh.vertices[i]);
    hi[i % 3] = Math.max(hi[i % 3], mesh.vertices[i]);
  }
  return hi.map((v, i) => v - lo[i]);
}
async function save(download: Download, name: string) {
  await mkdir(out, { recursive: true });
  const path = `${out}/${name}`;
  await download.saveAs(path);
  // Reopen persisted bytes: validation does not use the browser's in-memory mesh.
  const bytes = new Uint8Array(await readFile(path));
  let details: any = {};
  if (name.endsWith('.stl')) {
    const mesh = readSTL(bytes), topology = validateMesh(mesh), spatial = validateSpatial([mesh]);
    expect(topology.valid).toBe(true); expect(spatial.valid).toBe(true);
    details = { dimensionsMm: topology.bounds, volumeCm3: topology.volume / 1000, grams: topology.volume / 1000 * 1.24, materialCount: 1, topology, spatial };
  } else if (name.endsWith('.3mf')) {
    const validated = validate3MF(bytes), files = unzipSync(bytes);
    const slotIntent = JSON.parse(strFromU8(files['material-groups.json']));
    const features = JSON.parse(strFromU8(files['features.json']));
    const topology = validated.meshes.map(m => validateMesh(m, undefined, false));
    const spatial = validateSpatial(validated.meshes);
    expect(topology.every(t => t.valid)).toBe(true);
    expect(validated.spatial.valid).toBe(true); expect(spatial.valid).toBe(true);
    expect(validated.budget.count).toBeLessThanOrEqual(4);
    expect(features.text).toHaveLength(name.includes('coupon') ? 11 : 2);
    if (name.includes('coupon')) {
      expect(features.audience).toContain('private calibration');
      expect(slotIntent.audience).toContain('private calibration');
      expect(strFromU8(files['3D/3dmodel.model'])).toContain('PRIVATE CALIBRATION');
    }
    for (const text of features.text) {
      expect(text.minStrokeMm).toBeGreaterThanOrEqual(.8);
      if (text.minGapMm !== null) expect(text.minGapMm).toBeGreaterThanOrEqual(.6);
    }
    const assignment = (role: string) => slotIntent.assignments.find((a: any) => a.roles.includes(role));
    expect(assignment('text').group).not.toBe(assignment('base').group);
    const color = (role: string) => validated.budget.materials.find(m => m.roleKeys?.includes(role))!.color;
    const contrast = contrastRatio(color('text'), color('base'));
    expect(contrast).toBeGreaterThanOrEqual(3);
    details = { dimensionsMm: meshBounds(validated.meshes), volumeCm3: validated.budget.totalVolumeCm3, grams: validated.budget.totalGrams, materialCount: validated.budget.count, slots: slotIntent.slots, assignments: slotIntent.assignments, contrastRatio: contrast, features, topology, spatial };
    expect(Object.keys(files).some(k => /project_settings|model_settings/.test(k))).toBe(false);
  } else details = { slotIntent: JSON.parse(strFromU8(bytes)) };
  let summary: Record<string, unknown> = {};
  try { summary = JSON.parse(await readFile(`${out}/summary.json`, 'utf8')); } catch { /* first artifact */ }
  summary[name] = { label: name.includes('coupon') ? 'PRIVATE CALIBRATION — PHYSICAL VERIFICATION REQUIRED' : 'SYNTHETIC-DEMO', provenance: 'Actual Playwright browser download; Download.saveAs; independently reopened and validated', sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, ...details };
  await writeFile(`${out}/summary.json`, JSON.stringify(summary, null, 2) + '\n');
  return { bytes, details };
}
async function download(page: Page, button: string, name: string) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: button }).click();
  return save(await pending, name);
}
async function print(page: Page) {
  await page.getByRole('tab', { name: 'Export', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Export Core 3MF' })).toBeEnabled();
  const contrast = Number((await page.getByTestId('text-contrast').innerText()).match(/contrast: ([\d.]+)/)![1]);
  expect(contrast).toBeGreaterThanOrEqual(3);
  await expect(page.getByTestId('export-dimensions')).toContainText('mm');
}

test('fresh public demo exports with free material groups; all six themes are verified', async ({ page }) => {
  test.setTimeout(420000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const requests: string[] = []; page.on('request', request => requests.push(request.url()));
  await page.goto('/'); await shot(page, 'landing');
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Explore the sample studio' }).click();
  await page.getByRole('button', { name: 'Load demo data' }).click();
  await ready(page);
  await expect(page.locator('.source-card')).toHaveCount(3);
  await expect(page.getByTestId('dimensions')).toContainText('36.7 × 36.0');
  await shot(page, 'default-studio');
  await page.getByRole('tab', { name: 'Shape', exact: true }).click();
  await expect(page.getByLabel('Printable name', { exact: true })).toHaveValue('skyline-demo');
  await page.getByText('Typography & sizing',{exact:true}).click();
  await expect(page.getByLabel('Name size', { exact: true })).toHaveValue('medium');
  await expect(page.getByLabel('Name placement')).toHaveCount(0);
  await expect(page.getByTestId('name-origin')).toContainText('Neutral sample ID');
  await print(page); await shot(page, 'print-ams');
  // No capacity resolution or slot-default button has been used before this download.
  const baseline = await download(page, 'Export Core 3MF', 'default.3mf');
  expect(baseline.details.materialCount).toBe(3);
  expect(baseline.details.dimensionsMm[1]).toBeCloseTo(36.734,2);
  await download(page, 'Export mono STL', 'default-mono.stl');
  const themeChecks = [];
  for (const theme of themes) {
    await page.getByRole('tab', { name: 'Colors', exact: true }).click();
    await page.getByRole('button', { name: theme.name }).click();
    await ready(page); await shot(page, `theme-${theme.id}`); await print(page);

    themeChecks.push({ id: theme.id, contrast: await page.getByTestId('text-contrast').innerText(), materials: await page.getByTestId('export-dimensions').innerText() });
    if (theme.id === 'obsidian') await download(page, 'Export Core 3MF', 'alternate-theme.3mf');
  }
  await page.getByRole('tab', { name: 'Colors', exact: true }).click();
  await page.getByRole('button', { name: themes[0].name }).click(); await ready(page);
  await page.getByLabel('textColor', { exact: true }).fill('#123456'); await ready(page);
  await page.getByRole('tab', { name: 'Export', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Export Core 3MF' })).toBeEnabled();
  await shot(page, 'over-capacity');
  await page.getByRole('tab', { name: 'Colors', exact: true }).click();
  await expect(page.getByLabel('textColor', { exact: true })).toHaveValue('#123456');
  await page.getByRole('button', { name: themes[0].name }).click(); await ready(page); await print(page);
  await page.getByRole('tab', { name: 'Shape', exact: true }).click();
  await page.getByText('Typography & sizing',{exact:true}).click(); await page.getByTestId('font-license').locator('summary').click(); await shot(page, 'font-license');
  await page.getByTestId('font-license').locator('summary').click(); await shot(page, 'logo-panel');
  await page.getByRole('button', { name: 'Privacy', exact: true }).click(); await shot(page, 'privacy');
  await page.getByRole('button', { name: 'Back to studio' }).click();
  await page.getByRole('button', { name: '中文', exact: true }).click(); await shot(page, 'zh-cn');
  await page.setViewportSize({ width: 390, height: 844 }); await shot(page, 'mobile');
  expect(errors).toEqual([]);
  await writeFile(`${out}/recipe-source.json`, JSON.stringify({ label: 'SYNTHETIC-DEMO', source: 'demoBundle(2026): three deterministic synthetic GitHub, Gitee, GitLab beta series; no personal logs or upstream responses', recipe: defaultRecipe, baselineDimensionsMm: [171.8, 87.2, 21.2], themes: themeChecks, githubExample: { handle: 'synthetichandle', source: 'locally mocked GitHub calendar response', nameProvenance: 'explicit typed public handle', export: 'github-handle.3mf' }, manualExample: { name: 'custom-maker', source: 'locally mocked GitHub and Gitee responses', export: 'manual-custom.3mf', verification: 'exported mesh equals independently generated expected mesh; different from source-name geometry' }, privateCoupon: 'PRIVATE CALIBRATION ONLY; existing owner-requested character specimens; no usage activity; not a public default', font: 'VibeSkylineGrid-Regular.ttf; renamed generic Fusion Pixel subset; four upstream OFL notices', densityGramsPerCm3: 1.24, slicerConnection: false, printerConnection: false, physicalPrint: false, purge: 'unknown until sliced', printTime: 'unknown until sliced' }, null, 2) + '\n');
});

test('typed GitHub identity reaches the mesh; manual name survives switching back after adding a source', async ({ page }) => {
  const github = parseCalendar('github', '<td data-date="2026-01-01" data-level="2"></td><td data-date="2026-01-02" data-level="0"></td>', 2026);
  const gitee = parseCalendar('gitee', '3个贡献：2026-01-01 0个贡献：2026-01-02', 2026);
  await page.route('**/api/calendar/github/synthetichandle?year=2026', route => route.fulfill({ json: github }));
  await page.route('**/api/calendar/gitee/another-maker?year=2026', route => route.fulfill({ json: gitee }));
  await page.goto('/');
  await page.getByLabel('Public handle').fill('synthetichandle');
  await page.getByRole('button', { name: 'Fetch calendar' }).click(); await ready(page);
  await page.getByRole('tab', { name: 'Shape', exact: true }).click();
  await expect(page.getByLabel('Printable name', { exact: true })).toHaveValue('synthetichandle');
  await expect(page.getByTestId('name-origin')).toContainText('From GitHub: synthetichandle');
  await ready(page);
  await expect(page.getByTestId('dimensions')).toContainText('36.7');
  await expect(page.locator('canvas')).toBeVisible();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await shot(page, 'name-from-github'); await print(page);
  const sourceExport = await download(page, 'Export Core 3MF', 'github-handle.3mf');
  const font = Uint8Array.from(await readFile('packages/geometry/assets/VibeSkylineGrid-Regular.ttf')).buffer;
  const bundle = { ...demoBundle(2026), year: 2026, sources: [github], provenance: [{ id: 'github-public', adapter: 'github', version: 'm1', method: 'public-http' as const, status: 'verified' as const }] };
  const logoTiles = {github:(await compileSourceLogo('github','brand'))!};
  const expectedSource = await generateGeometry(buildPlan(bundle, { ...defaultRecipe, name: 'synthetichandle' }), font, {logoTiles});
  expect(validate3MF(sourceExport.bytes).meshes).toEqual(expectedSource.regions.map(r => r.mesh));
  await page.getByRole('tab', { name: 'Shape', exact: true }).click();
  await page.getByLabel('Printable name', { exact: true }).fill('custom-maker'); await ready(page);
  await expect(page.getByTestId('name-origin')).toContainText('Your edit');
  await page.getByRole('tab', { name: 'Sources', exact: true }).click();
  await page.getByLabel('Provider', { exact: true }).selectOption('gitee');
  await page.getByLabel('Public handle').fill('another-maker');
  await page.getByRole('button', { name: 'Fetch calendar' }).click(); await ready(page);
  await expect(page.locator('.source-card')).toHaveCount(2);
  await expect(page.locator('.edition')).toContainText('Gitee');
  await page.getByRole('tab', { name: 'Shape', exact: true }).click();
  await expect(page.getByLabel('Printable name', { exact: true })).toHaveValue('another-maker');
  await page.locator('.model-switcher').getByRole('button', { name: 'GitHub', exact: true }).click();
  await expect(page.getByLabel('Printable name', { exact: true })).toHaveValue('custom-maker');
  await ready(page);
  await print(page);
  const custom = await download(page, 'Export Core 3MF', 'manual-custom.3mf');
  const customBundle = { ...bundle, sources: [github] };
  const expectedCustom = await generateGeometry(buildPlan(customBundle, { ...defaultRecipe, name: 'custom-maker' }), font, {logoTiles});
  const wrongSource = await generateGeometry(buildPlan(customBundle, { ...defaultRecipe, name: 'synthetichandle' }), font, {logoTiles});
  const customMeshes = validate3MF(custom.bytes).meshes;
  expect(customMeshes).toEqual(expectedCustom.regions.map(r => r.mesh));
  expect(customMeshes).not.toEqual(wrongSource.regions.map(r => r.mesh));
  await page.getByRole('tab', { name: 'Shape', exact: true }).click();
  await page.getByRole('button', { name: 'Use source username', exact: true }).click(); await ready(page);
  await expect(page.getByLabel('Printable name', { exact: true })).toHaveValue('synthetichandle');
  await expect(page.getByTestId('name-origin')).toContainText('From GitHub: synthetichandle');
});
