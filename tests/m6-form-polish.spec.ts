import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const shots = 'test-results/m6-form-polish';

async function checkControls(page: Page) {
  const provider = page.getByLabel('Provider');
  const handle = page.getByLabel('Public handle');
  const year = page.getByLabel('Calendar year');
  const submit = page.getByRole('button', { name: 'Fetch calendar' });
  const sourceBox = (await provider.boundingBox())!;
  const handleBox = (await handle.boundingBox())!;
  const yearBox = (await year.boundingBox())!;
  expect(Math.abs(sourceBox.y - handleBox.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(sourceBox.x + sourceBox.width - handleBox.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(yearBox.x - handleBox.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(yearBox.width - handleBox.width)).toBeLessThanOrEqual(1);
  for (const control of [provider, handle, year, submit]) {
    expect((await control.boundingBox())!.height).toBe(48);
  }
  for (const control of [provider, handle]) {
    const textFit = await control.evaluate(el => {
      const style = getComputedStyle(el);
      const context = document.createElement('canvas').getContext('2d')!;
      context.font = style.font;
      const text = el instanceof HTMLSelectElement ? el.selectedOptions[0].text : (el as HTMLInputElement).placeholder;
      const left = parseFloat(style.paddingLeft), right = parseFloat(style.paddingRight);
      return { text, padding: left, required: context.measureText(text).width + left + right, available: el.clientWidth };
    });
    expect(textFit.padding).toBeGreaterThanOrEqual(16);
    expect(textFit.required, `${textFit.text} fits with inner padding`).toBeLessThanOrEqual(textFit.available);
  }
  const summary = page.getByTestId('source-qualification').locator('summary');
  expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

async function shot(region: Locator, name: string) {
  await mkdir(shots, { recursive: true });
  await region.scrollIntoViewIfNeeded();
  const page = region.page();
  const box = (await region.boundingBox())!;
  const scrollY = await page.evaluate(() => window.scrollY);
  // Include the outside focus ring, not just the control's border box.
  const x = Math.max(0, box.x - 8);
  await page.screenshot({
    path: `${shots}/${name}.png`,
    fullPage: true,
    clip: { x, y: Math.max(0, box.y + scrollY - 8), width: Math.min(box.width + 16, page.viewportSize()!.width - x), height: box.height + 16 },
  });
}

for (const locale of ['en', 'zh-CN']) {
  for (const width of [1440, 375]) {
    test(`calendar form spacing and keyboard flow (${locale}, ${width}px)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('/');
      if (locale === 'zh-CN') await page.getByRole('button', { name: '中文', exact: true }).click();
      const provider = page.getByLabel('Provider');
      const handle = page.getByLabel('Public handle');
      const submit = page.getByRole('button', { name: 'Fetch calendar' });
      const details = page.getByTestId('source-qualification');
      const region = page.locator('.landing-input');
      await checkControls(page);
      await expect(submit).toBeDisabled();
      await expect(submit).toHaveCSS('opacity', '1');
      const disabledFill = await submit.evaluate(el => getComputedStyle(el).backgroundColor);
      await shot(region, `landing-${locale}-${width}-empty`);

      await provider.focus();
      await page.keyboard.press('ArrowDown');
      await expect(provider).toHaveValue('gitee');
      await page.keyboard.press('Tab');
      await expect(handle).toBeFocused();
      await expect(page.locator('.calendar-input')).toHaveCSS('outline-style', 'solid');
      await expect(handle).toHaveCSS('outline-style', 'none');
      await shot(region, `landing-${locale}-${width}-focus`);
      await handle.fill('synthetic');
      await page.keyboard.press('Tab');
      await expect(page.getByLabel('Calendar year')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(submit).toBeFocused();
      await expect(submit).toBeEnabled();
      await expect(submit).not.toHaveCSS('background-color', disabledFill);
      await provider.selectOption('github');
      await shot(region, `landing-${locale}-${width}-ready`);
      await provider.selectOption('gitlab');
      await expect(page.getByTestId('selected-qualification')).toContainText('Beta');
      await checkControls(page);
      await page.keyboard.press('Tab');
      await expect(details.locator('summary')).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(details).toHaveAttribute('open', '');
      await shot(region, `landing-${locale}-${width}-gitlab`);
      await page.keyboard.press('Space');
      await expect(details).not.toHaveAttribute('open');
      await page.keyboard.press('Tab');
      const explore = page.getByRole('button', { name: locale === 'en' ? 'Explore the sample studio' : '探索示例工作室' });
      await expect(explore).toBeFocused();
      await explore.click();
      await checkControls(page);
      await shot(page.locator('.add-source'), `studio-${locale}-${width}`);
    });
  }
}

test('calendar submit stays opaque and available while fetching, then recovers after a relay error', async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/calendar/github/synthetic?year=2025', async route => {
    await pending;
    await route.fulfill({ status: 503, body: 'Synthetic relay failure' });
  });
  await page.goto('/');
  const handle = page.getByLabel('Public handle');
  const submit = page.getByRole('button', { name: 'Fetch calendar' });
  await handle.fill('   ');
  await expect(submit).toBeDisabled();
  await page.getByLabel('Calendar year').fill('2025');
  await handle.fill('synthetic');
  const request = page.waitForRequest('**/api/calendar/github/synthetic?year=2025');
  await handle.press('Enter');
  await request;
  await expect(submit).toBeEnabled();
  await expect(submit).toHaveText('Fetching public calendar…');
  await expect(submit).toHaveCSS('opacity', '1');
  release();
  await expect(page.getByRole('alert')).toContainText('Calendar could not be loaded');
  await expect(submit).toBeEnabled();
  await expect(handle).toHaveValue('synthetic');
  await expect(page.getByLabel('Calendar year')).toHaveValue('2025');
});
