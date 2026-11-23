import { test, expect } from '@playwright/test';

for (const locale of ['en', 'zh-CN']) {
  test(`code calendars only on landing, studio and privacy (${locale})`, async ({ page }) => {
    await page.goto('/');
    if (locale === 'zh-CN') await page.getByRole('button', { name: '中文', exact: true }).click();
    const assertCodeOnly = async () => {
      await expect(page.getByTestId('advanced-import')).toHaveCount(0);
      await expect(page.getByTestId('file-input')).toHaveCount(0);
      await expect(page.locator('a[href*="/protocol/"], textarea[aria-label="Agent export prompt"]')).toHaveCount(0);
      await expect(page.locator('body')).not.toContainText(/Codex|Claude|Gemini|Cursor|DeepSeek|Copilot|AI daily|AI 每日|智能体提示词/);
    };
    await assertCodeOnly();
    await expect(page.getByLabel('Provider').locator('option')).toHaveText(['GitHub', 'Gitee', 'GitLab · Beta']);
    const models = page.getByRole('group', { name: locale === 'en' ? 'Independent models' : '独立模型' });
    await expect(models.getByRole('button')).toHaveText(['GitHub', 'Gitee', 'GitLab · Beta']);
    await page.getByRole('button', { name: locale === 'en' ? 'Explore the sample studio' : '探索示例工作室' }).click();
    await assertCodeOnly();
    const drop = await page.evaluateHandle(() => {
      const data = new DataTransfer();
      data.items.add(new File(['{"schema":"vibeskyline.activity.v2"}'], 'activity.json'));
      return data;
    });
    await page.locator('main').dispatchEvent('drop', { dataTransfer: drop });
    await expect(models.getByRole('button')).toHaveText(['GitHub', 'Gitee', 'GitLab · Beta']);
    await page.getByRole('button', { name: locale === 'en' ? 'Privacy' : '隐私', exact: true }).click();
    await assertCodeOnly();
    await expect(page.locator('.privacy-page')).not.toContainText(/daily bundle|每日汇总|CLI/);
  });
}

test('production preview does not distribute any v2 protocol file', async ({ request }) => {
  for (const file of ['spec.md', 'activity.schema.json', 'synthetic.bundle.json', 'offline-pack.zip', 'activity-v2.schema.json']) {
    const response = await request.get(`/protocol/v2/${file}`);
    const body = await response.text();
    expect(response.status()).toBe(404);
    expect(body).not.toMatch(/daily activity protocol|vibeskyline\.activity\.v2|\$schema/);
  }
});

test('GitLab calendar remains beta and cannot be replaced by another source', async ({ page }) => {
  const { parseCalendar } = await import('../packages/calendars/src/index');
  const source = parseCalendar('gitlab', '{"2026-01-01":3,"2026-01-02":0}', 2026);
  await page.route('**/api/calendar/gitlab/synthetic?year=2026', route => route.fulfill({ json: source }));
  await page.goto('/');
  await page.getByLabel('Provider').selectOption('gitlab');
  await page.getByLabel('Public handle').fill('synthetic');
  await page.getByRole('button', { name: 'Fetch calendar' }).click();
  await expect(page.locator('.source-card strong')).toHaveText('GitLab · Beta');
  await expect(page.locator('.source-card .status')).toContainText('Beta · fixture-tested');
  await expect(page.getByTestId('logo-state')).toHaveText('Reserved empty plate', { timeout: 60000 });
  await page.getByRole('tab', { name: 'Shape', exact: true }).click();
  await expect(page.getByLabel('Printable name', { exact: true })).toHaveValue('synthetic');
  await page.getByRole('tab', { name: 'Sources', exact: true }).click();
  await page.route('**/api/calendar/gitlab/synthetic?year=2026', route => route.fulfill({ json: { ...source, id: 'codex', metric: 'tokens' } }));
  await page.getByRole('button', { name: 'Fetch calendar' }).click();
  await expect(page.getByRole('alert')).toContainText('Invalid calendar source');
  await expect(page.locator('.source-card strong')).toHaveText('GitLab · Beta');
});
