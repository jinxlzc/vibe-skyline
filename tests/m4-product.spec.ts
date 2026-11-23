import { test, expect, type Page } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parseCalendar } from "../packages/calendars/src/index";
import { validate3MF } from "../packages/exporters/three-mf/src/index";
import { validateMesh } from "../packages/geometry/src/index";
import { readSTL } from "../packages/exporters/stl/src/index";
import { contrastRatio } from "../packages/core/src/index";
const shots = "test-results/m4-regression",
  out = "test-results/m4-regression-exports";
async function shot(page: Page, name: string) {
  await mkdir(shots, { recursive: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  const panel = page.locator(".tab-content");
  if (await panel.count())
    expect((await panel.boundingBox())!.width).toBeGreaterThanOrEqual(300);
  await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
}
async function ready(page: Page) {
  await expect(page.getByTestId("dimensions")).toContainText("mm", {
    timeout: 120000,
  });
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.waitForTimeout(700);
}
async function evidence(page: Page, text: string) {
  await page.evaluate((text) => {
    const e = document.createElement("p");
    e.textContent = text;
    e.style.cssText =
      "background:#eaf0e9;color:#234c40;padding:10px 24px;margin:0;font:13px system-ui";
    document.body.prepend(e);
  }, text);
}
test("M4 desktop and mobile: live model hero, username flow, material freedom and bilingual privacy", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(3000);
  await expect(page.getByLabel("Provider")).toHaveValue("github");
  await expect(page.getByTestId("advanced-import")).toHaveCount(0);
  await shot(page, "landing-en");
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await shot(page, "landing-zh");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot(page, "landing-mobile-zh");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "探索示例工作室" }).click();
  await ready(page);
  await shot(page, "synthetic-demo-studio-zh");
  await page.getByRole("tab", { name: "配色", exact: true }).click();
  await page.getByLabel("textColor", { exact: true }).fill("#234567");
  await ready(page);
  await shot(page, "customize-materials-zh");
  await page.getByRole("tab", { name: "导出", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "导出 Core 3MF" }),
  ).toBeEnabled();
  await expect(page.getByTestId("export-dimensions")).toContainText("mm");
  await expect(page.locator("aside")).not.toContainText(/AMS|Bambu|A1|\/ 4/);
  await expect(page.locator("aside")).toContainText("4 个材料组");
  await shot(page, "export-five-materials-zh");
  const freeMaterials = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 Core 3MF" }).click();
  const freePath = await (await freeMaterials).path();
  expect(
    validate3MF(new Uint8Array(await readFile(freePath!))).budget.count,
  ).toBe(4);

  await page.setViewportSize({ width: 390, height: 844 });
  await shot(page, "studio-mobile-zh");
  await page.getByRole("button", { name: "隐私", exact: true }).click();
  await shot(page, "privacy-mobile-zh");
});
test("M4 mocked GitHub and Gitee username calendars remain the main path", async ({
  page,
}) => {
  for (const provider of ["github", "gitee"] as const) {
    const fixture = await readFile(
      `fixtures/calendars/${provider === "github" ? "github.html" : "gitee.txt"}`,
      "utf8",
    );
    await page.route(`**/api/calendar/${provider}/synthetic?year=2026`, (r) =>
      r.fulfill({ json: parseCalendar(provider, fixture, 2026) }),
    );
    await page.goto("/");
    await evidence(
      page,
      `MOCKED ${provider} response · synthetic test fixture, not a real account`,
    );
    await page.getByLabel("Provider").selectOption(provider);
    await page.getByLabel("Public handle").fill("synthetic");
    await shot(page, `${provider}-username-mocked`);
    await page.getByRole("button", { name: "Fetch calendar" }).click();
    await ready(page);
    await page.getByRole("tab", { name: "Shape", exact: true }).click();
    await expect(
      page.getByLabel("Printable name", { exact: true }),
    ).toHaveValue("synthetic");
    await shot(page, `${provider}-model-mocked`);
  }
});
test("Code-hosting sample downloads and keyboard smoke", async ({
  page,
}) => {
  const unexpected: string[] = [];
  page.on("request", (r) => {
    if (
      r.url().includes("/api/") ||
      (!r.url().startsWith("http://127.0.0.1:4173") &&
        !r.url().startsWith("blob:") &&
        !r.url().startsWith("data:"))
    )
      unexpected.push(r.url());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Explore the sample studio" }).click();
  await ready(page);
  await expect(page.locator(".viewer .pill")).toContainText("SYNTHETIC DEMO");
  await page.getByRole("tab", { name: "Shape", exact: true }).click();
  await expect(page.getByLabel("Printable name", { exact: true })).toHaveValue(
    "skyline-demo",
  );
  const shape = page.getByRole("tab", { name: "Shape", exact: true });
  await shape.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Colors", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await page.getByRole("tab", { name: "Export", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Export Core 3MF" }),
  ).toBeEnabled();
  await shot(page, "synthetic-calendar-export-ready");
  const summary: Record<string, unknown> = {};
  for (const [label, file] of [
    ["Export Core 3MF", "synthetic-activity.3mf"],
    ["Export mono STL", "synthetic-activity.stl"],
  ]) {
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: label }).click();
    await (await pending).saveAs(`${out}/${file}`);
    const bytes = new Uint8Array(await readFile(`${out}/${file}`));
    const validation = file.endsWith(".3mf")
      ? validate3MF(bytes)
      : validateMesh(readSTL(bytes));
    expect(validation.valid).toBe(true);
    summary[file] = {
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length,
      synthetic: true,
      validation: "browser download reopened: mesh / spatial / Core 3MF",
      sliced: false,
      physicallyPrinted: false,
    };
  }
  await writeFile(
    `${out}/summary.json`,
    JSON.stringify(summary, null, 2) + "\n",
  );
  expect(unexpected).toEqual([]);
  for (const [fg, bg] of [
    ["#202d29", "#f7f8f6"],
    ["#52605a", "#ffffff"],
    ["#ffffff", "#234c40"],
  ])
    expect(contrastRatio(fg, bg)).toBeGreaterThan(4.5);
});
