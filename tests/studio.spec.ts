import { test, expect } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {unzipSync,strFromU8} from "fflate";
import { defaultRecipe, defaultThemePlan } from "../packages/core/src/index";
import { themes } from "../packages/registry/src/index";
import {
  validateMesh,
  validateSpatial,
  type Mesh,
} from "../packages/geometry/src/index";
import { readSTL } from "../packages/exporters/stl/src/index";
import { validate3MF } from "../packages/exporters/three-mf/src/index";
import { parseCalendar } from "../packages/calendars/src/index";
const artifacts = "test-results/legacy-examples";
const summaries: Record<string, unknown> = {};
async function recordArtifact(
  path: string,
  bytes: Uint8Array,
  details: Record<string, unknown>,
) {
  try {Object.assign(summaries,JSON.parse(await readFile(artifacts+"/summary.json","utf8")));}catch{/* first run */}
  if(path.endsWith(".3mf")){const files=unzipSync(bytes);details={...details,slots:JSON.parse(strFromU8(files["material-groups.json"])).slots,features:JSON.parse(strFromU8(files["features.json"]))};}
  summaries[path] = {
    label: "SYNTHETIC-DEMO",
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    ...details,
  };
  await writeFile(
    artifacts + "/summary.json",
    JSON.stringify(summaries, null, 2) + "\n",
  );
}
function meshBounds(meshes: Mesh[]) {
  const lo = [Infinity, Infinity, Infinity],
    hi = [-Infinity, -Infinity, -Infinity];
  for (const mesh of meshes)
    for (let i = 0; i < mesh.vertices.length; i++) {
      const k = i % 3;
      lo[k] = Math.min(lo[k], mesh.vertices[i]);
      hi[k] = Math.max(hi[k], mesh.vertices[i]);
    }
  return hi.map((v, i) => v - lo[i]);
}
const shot = "test-results/legacy-shots";
test("demo editor, physical material plan and validated downloads", async ({
  page,
}) => {
  await mkdir(shot, { recursive: true });
  await mkdir(artifacts, { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("Building exact geometry…")).toBeHidden({
    timeout: 90000,
  });
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.screenshot({ path: shot + "/landing.png", fullPage: true });
  await page.getByRole("button", { name: "Explore the sample studio" }).click();
  await page.getByRole("button", { name: "Load demo data" }).click();
  await expect(page.getByText("Building exact geometry…")).toBeHidden({
    timeout: 90000,
  });
  await page.screenshot({
    path: shot + "/studio-porcelain.png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Export", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Export Core 3MF" }),
  ).toBeEnabled();
  await page.screenshot({
    path: shot + "/default-print.png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  await page.screenshot({ path: shot + "/colors.png", fullPage: true });
  await page.getByRole("button", { name: "Obsidian Desk" }).click();
  await expect(page.getByText("Building exact geometry…")).toBeHidden({
    timeout: 90000,
  });
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.screenshot({
    path: shot + "/studio-obsidian.png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Shape", exact: true }).click();
  await page
    .getByLabel("Printable name", { exact: true })
    .fill("SYNTHETIC-DEMO");
  await page.getByText("Typography & sizing",{exact:true}).click();
  await page.getByLabel("Name size", {exact:true}).selectOption("large");
  await page.getByLabel("Year", { exact: true }).fill("2024");
  await page.getByLabel("Week start").selectOption("monday");
  await page.getByLabel("Logo mode").selectOption("none");
  await page.getByRole("tab", { name: "Export", exact: true }).click();

  await expect(
    page.getByRole("button", { name: "Export Core 3MF" }),
  ).toBeEnabled({ timeout: 90000 });
  const dims = (await page.getByTestId("dimensions").innerText())
      .match(/[\d.]+/g)!
      .map(Number),
    expected = { width: dims[0], depth: dims[1], height: dims[2] };
  for (const kind of ["STL", "3MF"]) {
    const waiting = page.waitForEvent("download");
    await page
      .getByRole("button", {
        name: kind === "STL" ? "Export mono STL" : "Export Core 3MF",
      })
      .click();
    const download = await waiting;
    const path = `${artifacts}/synthetic-demo.${kind.toLowerCase()}`;
    await download.saveAs(path);
    const bytes = new Uint8Array(await readFile(path));
    if (kind === "STL") {
      const mesh = readSTL(bytes),
        topology = validateMesh(mesh),
        spatial = validateSpatial([mesh]);
      expect(topology.valid).toBe(true);
      topology.bounds.forEach((v,i)=>expect(Math.abs(v-[expected.width,expected.depth,expected.height][i])).toBeLessThan(.051));
      expect(spatial.valid).toBe(true);
      await recordArtifact(path, bytes, {
        dimensionsMm: topology.bounds,
        materialCount: 1,
        volumeCm3: topology.volume / 1000,
        massGrams: (topology.volume / 1000) * 1.24,
        topology,
        spatial,
      });
    } else {
      const result = validate3MF(bytes);
      expect(result.budget.count).toBe(2); // Obsidian shares identity with the selected source color.
      const dimensions = meshBounds(result.meshes);
      dimensions.forEach((v, i) =>
        expect(Math.abs(v-[expected.width,expected.depth,expected.height][i])).toBeLessThan(.051),
      );
      await writeFile(
        artifacts + "/materials.json",
        JSON.stringify(result.budget, null, 2) + "\n",
      );
      await recordArtifact(path, bytes, {
        dimensionsMm: dimensions,
        materialCount: result.budget.count,
        volumeCm3: result.budget.totalVolumeCm3,
        massGrams: result.budget.totalGrams,
        spatial: result.spatial,
      });
    }
  }
  const theme = themes.find((t) => t.id === "obsidian")!;
  const recipe = {
    ...defaultRecipe,
    year: 2024,
    name: "SYNTHETIC-DEMO",
    weekStart: "monday",
    logoMode: "neutral",
    ...defaultThemePlan(theme),
    slotAssignments: undefined,
    resolution: "unresolved",
    nameSize: "large",
  };
  await writeFile(
    artifacts + "/recipe-source.json",
    JSON.stringify(
      {
        label: "SYNTHETIC-DEMO",
        qualification:
          "Engineering test artifact — not owner activity; not print-ready",
        source:
          "Actual browser downloads after Load demo data; deterministic demoBundle(2024), three synthetic GitHub/Gitee/GitLab beta series; no public source fetch",
        densityGramsPerCm3: 1.24,
        recipe,
        twoToneRecipe: { ...recipe, tier: "two-tone" },
        slicerConnection: false,
        printerConnection: false,
      },
      null,
      2,
    ) + "\n",
  );
  await page.getByLabel("Print tier").selectOption("two-tone");
  await expect(
    page.getByRole("button", { name: "Export Core 3MF" }),
  ).toBeEnabled({ timeout: 90000 });
  const twoWait = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Core 3MF" }).click();
  const twoDownload = await twoWait,
    twoPath = artifacts + "/synthetic-demo-two-tone.3mf";
  await twoDownload.saveAs(twoPath);
  const twoBytes = new Uint8Array(await readFile(twoPath)),
    two = validate3MF(twoBytes);
  expect(two.budget.count).toBe(2);
  const baseIndex = two.budget.materials.findIndex(
    (m) => m.color === theme.base.toUpperCase(),
  );
  expect(baseIndex).toBeGreaterThanOrEqual(0);
  const zBounds = two.meshes.map((mesh) => {
    const zs = mesh.vertices.filter((_, i) => i % 3 === 2);
    return [Math.min(...zs), Math.max(...zs)];
  });
  expect(zBounds[baseIndex][1]).toBeCloseTo(14, 4);
  expect(zBounds[1 - baseIndex][0]).toBeLessThan(14); // Sloped identity occupies the front, not a horizontal filament-change layer.
  await writeFile(
    artifacts + "/materials-two-tone.json",
    JSON.stringify(two.budget, null, 2) + "\n",
  );
  await recordArtifact(twoPath, twoBytes, {
    dimensionsMm: meshBounds(two.meshes),
    materialCount: 2,
    volumeCm3: two.budget.totalVolumeCm3,
    massGrams: two.budget.totalGrams,
    zBoundsMm: zBounds,
    boundaryMm: null,
    spatial: two.spatial,
  });
  for (const name of [
    "materials.json",
    "materials-two-tone.json",
    "recipe-source.json",
  ]) {
    const path = artifacts + "/" + name;
    await recordArtifact(path, new Uint8Array(await readFile(path)), {
      kind: "companion JSON",
    });
  }
  await page.getByLabel("Print tier").selectOption("multi");
  await expect(
    page.getByRole("button", { name: "Export Core 3MF" }),
  ).toBeEnabled({ timeout: 90000 });
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await page.screenshot({ path: shot + "/zh-cn-latin.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: shot + "/mobile-latin.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("public calendar UI uses restricted proxy route (mocked upstream response)", async ({
  page,
}) => {
  const series = parseCalendar(
    "github",
    await readFile("fixtures/calendars/github.html", "utf8"),
    2026,
  );
  await page.route("**/api/calendar/github/synthetic?year=2026", (route) =>
    route.fulfill({ json: series }),
  );
  await page.goto("/");
  await page.getByLabel("Public handle").fill("synthetic");
  await page.getByRole("button", { name: "Fetch calendar" }).click();
  await expect(page.locator(".source-card strong")).toHaveText("GitHub");
  await expect(page.locator(".source-meta").first()).toContainText("2 days");
});
test("zh-CN editor translates budget guidance and rejects unsupported CJK names clearly", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore the sample studio" }).click();
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await page.getByRole("tab", { name: "导出", exact: true }).click();
  await expect(page.locator("aside")).toContainText("几何尺寸");
  await expect(page.locator("aside")).toContainText("兼容性因软件而异");
  await page.getByLabel("Print tier").selectOption("two-tone");
  await expect(page.locator("aside")).toContainText("颜色处理");
  await page.getByRole("tab", { name: "形态", exact: true }).click();
  await page.getByLabel("Printable name", { exact: true }).fill("龘");
  await expect(page.getByRole("alert")).toContainText(
    "缺少字形",
    { timeout: 90000 },
  );
  await page.getByRole("tab", { name: "导出", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "导出 Core 3MF" }),
  ).toBeDisabled();
});
