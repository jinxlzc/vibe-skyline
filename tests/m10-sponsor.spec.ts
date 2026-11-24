import { test, expect } from '@playwright/test';

for (const width of [1440, 375]) {
  test(`footer sponsor is localized and fits at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const footer = page.locator('footer');
    const sponsor = footer.getByTestId('footer-sponsor');

    for (const zh of [false, true]) {
      if (zh) await page.getByRole('button', { name: '中文', exact: true }).click();
      await expect(sponsor).toHaveRole('link');
      await expect(sponsor).toBeVisible();
      await expect(sponsor).toHaveText(zh
        ? '由 移山科技 赞助 · 领先的 GEO 优化服务商'
        : 'Sponsored by Yishan Tech · leading GEO optimization provider');
      await expect(sponsor).toHaveAttribute('href', 'https://www.geokeji.com/?utm_source=jinxlzc&promo=z9kqa4u4');
      await expect(sponsor).toHaveAttribute('target', '_blank');
      const rel = (await sponsor.getAttribute('rel'))!.split(/\s+/);
      expect(rel).toEqual(expect.arrayContaining(['noopener', 'sponsored']));
      await expect(sponsor).toHaveCSS('font-size', '11px');
      await expect(sponsor).toHaveCSS('color', 'rgb(82, 96, 90)');
      await expect(footer.getByTestId('dimensions')).toBeVisible();
      await expect(footer).toContainText(zh ? '模型尺寸' : 'MODEL SIZE');
      await expect(footer).toContainText(zh ? '构成' : 'COMPOSITION');
      await expect(footer).toContainText(/· [1-9]/);
      await expect(footer).toContainText(zh ? '尚未切片 · 尚未实物打印' : 'Not sliced · not physically printed');
      const footerBox = (await footer.boundingBox())!;
      const sponsorBox = (await sponsor.boundingBox())!;
      expect(sponsorBox.x).toBeGreaterThanOrEqual(footerBox.x);
      expect(sponsorBox.x + sponsorBox.width).toBeLessThanOrEqual(footerBox.x + footerBox.width);
      expect(await footer.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });
}

test('header GitHub link opens the public source repository', async ({ page }) => {
  await page.goto('/');
  const github = page.locator('header').getByRole('link', { name: 'GitHub ↗', exact: true });
  await expect(github).toBeVisible();
  await expect(github).toHaveAttribute('href', 'https://github.com/jinxlzc/vibe-skyline');
  await expect(github).toHaveAttribute('target', '_blank');
});
