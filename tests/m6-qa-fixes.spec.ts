import { test, expect, type Page, type Route } from '@playwright/test';
import { demoBundle } from '../apps/web/src/demo';

type Provider = 'github' | 'gitee' | 'gitlab';
const names = { github: 'GitHub', gitee: 'Gitee', gitlab: 'GitLab · Beta' };
function calendar(provider: Provider, year = 2026) {
  const source = demoBundle(year).sources.find(source => source.id === provider)!;
  return { ...source, sample: false, days: source.days.slice(0, 2), provenanceIds: [`${provider}-public`] };
}
async function mockCalendars(page: Page) {
  await page.route('**/api/calendar/**', route => {
    const url = new URL(route.request().url());
    return route.fulfill({ json: calendar(url.pathname.split('/')[3] as Provider, Number(url.searchParams.get('year'))) });
  });
}
async function active(page: Page, provider: Provider, studio = false) {
  await expect(page.getByLabel('Provider')).toHaveValue(provider);
  await expect(page.locator('.model-switcher button[aria-pressed="true"]')).toHaveText(names[provider]);
  await expect(page.locator('.edition')).toContainText(names[provider]);
  if (studio) await expect(page.locator('.legend')).toContainText(names[provider]);
}
async function fetchCalendar(page: Page, provider: Provider) {
  await page.getByLabel('Provider').selectOption(provider);
  await page.getByLabel('Public handle').fill('synthetic');
  await page.getByRole('button', { name: 'Fetch calendar', exact: true }).click();
  await expect(page.locator('.source-card strong')).toContainText([names[provider]]);
  await active(page, provider, true);
}
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

test('landing provider and model switcher follow every source choice', async ({ page }) => {
  await page.goto('/');
  for (const provider of ['gitee', 'gitlab', 'github', 'gitlab', 'gitee', 'github'] as const) {
    await page.getByLabel('Provider').selectOption(provider);
    await active(page, provider);
  }
  for (const provider of ['gitlab', 'gitee', 'github'] as const) {
    await page.locator('.model-switcher').getByRole('button', { name: names[provider], exact: true }).click();
    await active(page, provider);
  }
});

test('fetched source becomes active; absent providers keep the preview; repeated and rapid switching works', async ({ page }) => {
  await mockCalendars(page);
  await page.goto('/');
  await fetchCalendar(page, 'github');
  await page.getByLabel('Provider').selectOption('gitee');
  await expect(page.locator('.edition')).toContainText('GitHub');
  await expect(page.locator('.source-card')).toHaveCount(1);
  // Clicking the already-active model must also reset a pending form provider.
  await page.locator('.model-switcher').getByRole('button', { name: 'GitHub', exact: true }).click();
  await active(page, 'github', true);
  await fetchCalendar(page, 'gitee');
  for (const provider of ['github', 'gitee', 'github', 'gitee'] as const) {
    await page.getByLabel('Provider').selectOption(provider);
    await active(page, provider, true);
  }
  await page.locator('.model-switcher').evaluate(el => {
    const buttons = el.querySelectorAll('button');
    for (let i = 0; i < 20; i++) buttons[i % 2].click();
  });
  await active(page, 'gitee', true);
  await fetchCalendar(page, 'gitlab');
  await expect(page.locator('.source-card')).toHaveCount(3);
});

test('source cards activate by click and keyboard, and removal stays independent', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore the sample studio' }).click();
  await page.locator('.source-card').filter({ hasText: 'Gitee' }).getByRole('button', { name: 'Select Gitee', exact: true }).click();
  await active(page, 'gitee', true);
  const gitlab = page.getByRole('button', { name: 'Select GitLab · Beta', exact: true });
  await gitlab.focus();
  await page.keyboard.press('Enter');
  await active(page, 'gitlab', true);
  const github = page.getByRole('button', { name: 'Select GitHub', exact: true });
  await github.focus();
  await page.keyboard.press('Space');
  await active(page, 'github', true);
  await expect(page.getByTestId('dimensions')).toContainText('mm', { timeout: 120000 });
  await page.screenshot({ path: test.info().outputPath('source-cards.png'), fullPage: true });
  await page.getByRole('button', { name: 'Remove Gitee', exact: true }).click();
  await active(page, 'github', true);
  await page.getByRole('button', { name: 'Remove GitHub', exact: true }).click();
  await active(page, 'gitlab', true);
});

test('later Gitee submit wins over delayed GitHub and remains switchable', async ({ page }) => {
  const started = deferred(), release = deferred(), finished = deferred();
  await mockCalendars(page);
  await page.route('**/api/calendar/github/**', async route => {
    started.resolve();
    await release.promise;
    await route.fulfill({ json: calendar('github') });
    finished.resolve();
  });
  await page.goto('/');
  await page.getByLabel('Public handle').fill('synthetic');
  await page.getByRole('button', { name: 'Fetch calendar', exact: true }).click();
  await started.promise;
  const aborted = page.waitForEvent('requestfailed', { predicate: request => request.url().includes('/api/calendar/github/') });
  await fetchCalendar(page, 'gitee');
  await aborted;
  release.resolve();
  await finished.promise;
  await expect(page.locator('.source-card strong')).toHaveText(['Gitee']);
  await active(page, 'gitee', true);
  await expect(page.getByRole('button', { name: 'Fetch calendar', exact: true })).not.toContainText('Fetching');
  await fetchCalendar(page, 'github');
  await page.getByLabel('Provider').selectOption('gitee');
  await active(page, 'gitee', true);
});

for (const staleStatus of [200, 502]) test(`same-provider resubmit ignores an already-delivering stale ${staleStatus} response`, async ({ page }) => {
  // Model a transport that is already delivering a response when cancellation arrives.
  // The separate cross-provider test above verifies actual network abortion.
  await page.addInitScript(() => {
    const fetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      if (String(input).includes('/api/calendar/github/first?')) {
        const response = await fetch(input, { ...init, signal: undefined });
        const body = await response.text();
        document.documentElement.dataset.staleCalendarDelivered = 'true';
        return new Response(body, { status: response.status, headers: response.headers });
      }
      return fetch(input, init);
    };
  });
  let firstRoute!: Route, secondRoute!: Route;
  const first = deferred(), second = deferred();
  await page.route('**/api/calendar/github/**', route => {
    if (route.request().url().includes('/first?')) { firstRoute = route; first.resolve(); }
    else { secondRoute = route; second.resolve(); }
  });
  await page.goto('/');
  const submit = page.getByRole('button', { name: 'Fetch calendar', exact: true });
  await page.getByLabel('Public handle').fill('first');
  await submit.click();
  await first.promise;
  await expect(submit).toBeEnabled();
  await page.getByLabel('Public handle').fill('second');
  await submit.click();
  await second.promise;
  await firstRoute.fulfill({ status: staleStatus, json: staleStatus === 200 ? calendar('github') : { error: 'Synthetic upstream failure' } });
  await expect(page.locator('html')).toHaveAttribute('data-stale-calendar-delivered', 'true');
  await expect(submit).toHaveText('Fetching public calendar…');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('.source-card')).toHaveCount(0);
  await secondRoute.fulfill({ json: calendar('github') });
  await active(page, 'github', true);
  await expect(submit).not.toContainText('Fetching');
  await page.getByRole('tab', { name: 'Shape', exact: true }).click();
  await expect(page.getByLabel('Printable name', { exact: true })).toHaveValue('second');
});

for (const locale of ['en', 'zh-CN']) {
  test(`502 remains a retryable calendar error across geometry and source changes (${locale})`, async ({ page }) => {
    await page.route('**/api/calendar/**', route => route.fulfill({ status: 502, json: { error: 'Calendar upstream or network failure. Retry later.' } }));
    await page.goto('/');
    if (locale === 'zh-CN') await page.getByRole('button', { name: '中文', exact: true }).click();
    await page.getByLabel('Public handle').fill('synthetic');
    await page.getByRole('button', { name: 'Fetch calendar', exact: true }).click();
    const alert = page.getByTestId('calendar-error');
    await expect(alert).toContainText(locale === 'en' ? 'Calendar could not be loaded' : '无法加载日历');
    await expect(alert).not.toContainText(/SVG|字体|font|user not found/i);
    await page.getByLabel('Provider').selectOption('gitee');
    await active(page, 'gitee');
    await page.locator('.model-switcher').getByRole('button', { name: 'GitLab · Beta', exact: true }).click();
    await active(page, 'gitlab');
    await page.getByLabel('Calendar year').fill('2025');
    await expect(page.getByTestId('dimensions')).toContainText('mm', { timeout: 120000 });
    await expect(alert).toBeVisible();
    await alert.screenshot({ path: test.info().outputPath(`calendar-error-${locale}.png`) });
    await mockCalendars(page);
    await alert.getByRole('button', { name: locale === 'en' ? 'Retry calendar' : '重试日历', exact: true }).click();
    await expect(alert).toHaveCount(0);
    await active(page, 'gitlab', true);
    await expect(page.locator('.edition')).toContainText('2025');
  });
}

test('year draft allows empty and partial edits without committing an invalid year', async ({ page }) => {
  await mockCalendars(page);
  await page.goto('/');
  const year = page.getByLabel('Calendar year');
  await year.fill('');
  await expect(year).toHaveValue('');
  await year.pressSequentially('202');
  await expect(year).toHaveValue('202');
  await expect(page.locator('.edition')).toContainText('2026');
  await year.pressSequentially('5');
  await expect(year).toHaveValue('2025');
  await expect(page.locator('.edition')).toContainText('2025');
  await fetchCalendar(page, 'github');
  await expect(page.locator('.edition')).toContainText('2025');
});

for (const failure of ['invalid-handle', '400', '429'] as const) {
  test(`${failure} offers calendar recovery without changing geometry settings`, async ({ page }) => {
    await page.route('**/api/calendar/**', route => route.fulfill({ status: failure === '429' ? 429 : 400, json: { error: 'Synthetic failure' } }));
    await page.goto('/');
    await page.getByLabel('Public handle').fill(failure === 'invalid-handle' ? 'invalid/handle' : 'synthetic');
    await page.getByRole('button', { name: 'Fetch calendar', exact: true }).click();
    const alert = page.getByTestId('calendar-error');
    await expect(alert).toContainText(failure === '429' ? 'rate limited' : 'Check the public username and year');
    await expect(alert.getByRole('button', { name: 'Retry calendar', exact: true })).toBeVisible();
    await expect(alert).not.toContainText(/SVG|font|user not found/i);
    await page.getByRole('button', { name: '中文', exact: true }).click();
    await expect(alert).toContainText(failure === '429' ? '日历请求受限' : '请检查公开用户名与年份');
    await expect(alert.getByRole('button', { name: '重试日历', exact: true })).toBeVisible();
    await alert.getByRole('button', { name: '关闭日历错误', exact: true }).click();
    await expect(alert).toHaveCount(0);
    await active(page, 'github');
  });
}

test('selecting a model cancels pending fetch without requiring a replacement submit', async ({ page }) => {
  const started = deferred();
  let pending!: Route;
  await page.route('**/api/calendar/github/**', route => { pending = route; started.resolve(); });
  await page.goto('/');
  await page.getByLabel('Public handle').fill('synthetic');
  const submit = page.getByRole('button', { name: 'Fetch calendar', exact: true });
  await submit.click();
  await started.promise;
  const aborted = page.waitForEvent('requestfailed', { predicate: request => request.url().includes('/api/calendar/github/') });
  await page.locator('.model-switcher').getByRole('button', { name: 'Gitee', exact: true }).click();
  await aborted;
  await active(page, 'gitee');
  await expect(submit).not.toContainText('Fetching');
  await pending.fulfill({ status: 502, json: { error: 'Synthetic delayed failure' } });
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('.viewer .pill')).toContainText('SYNTHETIC DEMO');
  await active(page, 'gitee');
});
