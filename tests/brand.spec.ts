import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const locale of ['en', 'zh-CN']) {
  test(`concept A header remains accessible and fits desktop/mobile (${locale})`, async ({ page }, testInfo) => {
    const zh = locale === 'zh-CN';
    await page.goto('/');
    if (zh) await page.getByRole('button', { name: '中文', exact: true }).click();
    const home = page.getByRole('button', { name: 'VibeSkyline', exact: true });
    const lockup = home.locator('img');
    await expect(home).toBeVisible();
    await expect(lockup).toHaveJSProperty('naturalWidth', 348);
    const src = await lockup.getAttribute('src');
    expect(src).toMatch(/\.svg$/);
    const art = await (await page.request.get(src!)).text();
    expect(art).toBe(await readFile('docs/brand/m8/concept-a/lockup.svg', 'utf8'));

    for (const width of [1440, 800, 390, 360]) {
      await page.setViewportSize({ width, height: 1000 });
      const box = (await home.boundingBox())!;
      const nav = (await page.locator('header nav').boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x + box.width).toBeLessThanOrEqual(nav.x);
      expect(nav.x + nav.width).toBeLessThanOrEqual(width);
      await expect(lockup).toHaveCSS('height', width <= 800 ? '35px' : '40px');
      if (width > 1100) {
        await expect(home.locator('.alpha')).toHaveText(zh ? '活动 → 实物' : 'ACTIVITY → OBJECT');
        await expect(home.locator('.alpha')).toBeVisible();
      } else await expect(home.locator('.alpha')).toBeHidden();
      await page.locator('header').screenshot({ path: testInfo.outputPath(`header-${width}.png`) });
    }

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('button', { name: zh ? '探索示例工作室' : 'Explore the sample studio' }).click();
    await page.getByRole('tab', { name: zh ? '配色' : 'Colors', exact: true }).click();
    await page.getByRole('button', { name: zh ? '黑曜桌面' : 'Obsidian Desk' }).click();
    await expect(page.locator('.app')).toHaveAttribute('data-theme', 'obsidian');
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(lockup).toHaveAttribute('src', src!);
    await page.locator('header').screenshot({ path: testInfo.outputPath('header-obsidian-dark-tab.png') });

    // Keep keyboard activation and the original demo-reset/return-to-landing behavior.
    await page.getByRole('group', { name: zh ? '独立模型' : 'Independent models' })
      .getByRole('button', { name: 'Gitee', exact: true }).click();
    await home.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: zh ? '探索示例工作室' : 'Explore the sample studio' })).toBeVisible();
    // The existing demo loader preserves the active source and resets the form to it.
    await expect(page.getByLabel('Provider')).toHaveValue('gitee');
  });
}

test('production build serves concept A icons and linked metadata', async ({ page, request }) => {
  const assets = [
    ['favicon.svg', 'image/svg+xml'],
    ['favicon.ico', 'image/x-icon'],
    ['favicon-16.png', 'image/png'],
    ['favicon-32.png', 'image/png'],
    ['apple-touch-icon.png', 'image/png'],
    ['icon-192.png', 'image/png'],
    ['icon-512.png', 'image/png'],
    ['og.png', 'image/png'],
    ['manifest.webmanifest', 'application/manifest+json'],
  ];
  for (const [name, type] of assets) {
    const response = await request.get(`/${name}`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe(type);
    expect(await response.body()).toEqual(await readFile(`apps/web/public/${name}`));
  }
  const ico = await (await request.get('/favicon.ico')).body();
  expect([...ico.subarray(0, 6)]).toEqual([0, 0, 1, 0, 2, 0]);
  for (const [index, size] of [16, 32].entries()) {
    const entry = 6 + 16 * index;
    expect([ico[entry], ico[entry + 1]]).toEqual([size, size]);
    const length = ico.readUInt32LE(entry + 8), offset = ico.readUInt32LE(entry + 12);
    expect(ico.subarray(offset, offset + length)).toEqual(await readFile(`apps/web/public/favicon-${size}.png`));
  }
  for (const [name, width, height] of [
    ['favicon-16', 16, 16], ['favicon-32', 32, 32], ['apple-touch-icon', 180, 180],
    ['icon-192', 192, 192], ['icon-512', 512, 512], ['og', 1200, 630],
  ] as const) {
    const png = await (await request.get(`/${name}.png`)).body();
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([width, height]);
  }
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest).toEqual({
    name: 'VibeSkyline', short_name: 'VibeSkyline', start_url: '/', display: 'standalone',
    theme_color: '#f3f0e9', background_color: '#f7f8f6',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  });
  await page.goto('/');
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute('href', '/favicon.svg');
  await expect(page.locator('link[rel="icon"][sizes="any"]')).toHaveAttribute('href', '/favicon.ico');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/apple-touch-icon.png');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#f3f0e9');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://vibeskyline.com/og.png');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'VibeSkyline');
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', 'Your year, built.');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  const protocol = await request.get('/protocol/v2/spec.md');
  expect(protocol.status()).toBe(404);
  expect(await protocol.text()).not.toMatch(/daily activity protocol|vibeskyline\.activity\.v2|\$schema/);
});
