import {test, expect, type Page} from '@playwright/test';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {ActivityBundle} from '../packages/contracts/src/index';
import {parseCalendar} from '../packages/calendars/src/index';
import {validate3MF} from '../packages/exporters/three-mf/src/index';
import {readSTL} from '../packages/exporters/stl/src/index';
import {validateMesh} from '../packages/geometry/src/index';
const shots = 'test-results/m3-shots';
const out = 'test-results/m3-examples';
async function shot(page:Page,name:string) {
  await mkdir(shots,{recursive:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:`${shots}/${name}.png`,fullPage:true});
}
async function label(page:Page,text:string) {
  await page.evaluate(text=>{
    let el=document.getElementById('evidence-label');
    if(!el){el=document.createElement('div');el.id='evidence-label';document.body.prepend(el);}
    el.textContent=text;el.style.cssText='padding:12px 24px;background:#fff0b5;color:#222;font:14px sans-serif;';
  },text);
}
async function save(page:Page, button:string, name:string, qualification:string) {
  const waiting=page.waitForEvent('download');await page.getByRole('button',{name:button}).click();
  await (await waiting).saveAs(`${out}/${name}`);
  const bytes=new Uint8Array(await readFile(`${out}/${name}`));
  const materialCount=name.endsWith('3mf')?validate3MF(bytes).budget.count:1;
  if(name.endsWith('stl'))expect(validateMesh(readSTL(bytes)).valid).toBe(true);
  expect(materialCount).toBeLessThanOrEqual(4);
  let summary:Record<string,unknown>={};try{summary=JSON.parse(await readFile(`${out}/summary.json`,'utf8'));}catch{/* first file */}
  summary[name]={qualification,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,materialCount,sliced:false,physicallyPrinted:false,realLogosOnByDefault:'GitHub Invertocat and Gitee white mark; owner-accepted risk, no grant',validation:'Reopened browser download; mesh / Core 3MF validation'};
  await writeFile(`${out}/summary.json`,JSON.stringify(summary,null,2)+'\n');
}

test('username-first flow, source qualifications, demo separation and public export',async({page})=>{
  await mkdir(out,{recursive:true});
  let bundle:ActivityBundle|undefined;
  try{bundle=ActivityBundle.parse(JSON.parse(await readFile(`${out}/public-github-live.bundle.json`,'utf8')));}catch{/* offline fallback clearly labeled */}
  const live=!!bundle, handle=bundle?.sources[0].publicIdentity?.value??'synthetic';
  const source=bundle?.sources[0]??parseCalendar('github',await readFile('fixtures/calendars/github.html','utf8'),2026);
  const evidence=live?`LIVE-RECORDED PUBLIC GitHub / ${handle} — replayed in browser; no sign-in`:'MOCKED PUBLIC GitHub response — SYNTHETIC fixture, not a real account';
  await page.route(`**/api/calendar/github/${handle}?year=2026`,route=>route.fulfill({json:source}));
  await page.goto('/');
  await expect(page.getByLabel('Provider')).toHaveValue('github');
  await expect(page.getByTestId('advanced-import')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Choose daily JSON file (never uploaded)'})).toBeHidden();
  await expect(page.getByRole('button',{name:'Fetch calendar'})).toHaveClass(/primary/);
  await expect(page.locator('.viewer .pill')).toContainText('SYNTHETIC DEMO');
  await shot(page,'landing-github-en');
  await page.getByRole('button',{name:'中文',exact:true}).click();
  await shot(page,'landing-github-zh');
  await page.getByLabel('Provider').selectOption('gitee');
  await page.getByLabel('Public handle').fill('public-example');
  await expect(page.getByTestId('selected-qualification')).toContainText('已验证');
  await shot(page,'gitee-username-zh');
  await page.getByLabel('Provider').selectOption('gitlab');
  await expect(page.getByTestId('selected-qualification')).toContainText('Beta');
  await shot(page,'gitlab-beta-zh');
  await page.getByTestId('source-qualification').locator('summary').click();
  await expect(page.getByTestId('source-qualification')).toContainText('过去 12 个月');
  await shot(page,'source-qualification-zh');
  await page.getByTestId('source-qualification').locator('summary').click();
  await page.getByRole('button',{name:'探索示例工作室'}).click();
  await expect(page.getByTestId('dimensions')).toContainText('mm',{timeout:120000});
  await expect(page.locator('.source-card .status').first()).toContainText('非账号证据');
  await shot(page,'synthetic-demo-zh');
  await page.getByLabel('Provider').selectOption('github');
  await page.getByLabel('Public handle').fill(handle);
  await page.getByRole('button',{name:'Fetch calendar'}).click();
  await expect(page.locator('.source-card strong')).toHaveText(['GitHub']);
  await expect(page.locator('.viewer .pill')).toContainText('已获取公开日历');
  await page.getByRole('tab',{name:'形态',exact:true}).click();
  await expect(page.getByLabel('Printable name',{exact:true})).toHaveValue(handle);
  await label(page,evidence);
  await expect(page.getByTestId('dimensions')).toContainText('mm',{timeout:120000});
  await shot(page,'source-username-zh');
  await page.getByRole('tab',{name:'导出',exact:true}).click();
  await expect(page.getByRole('button',{name:'导出 Core 3MF'})).toBeEnabled({timeout:120000});
  await expect(page.locator('footer')).toContainText(/· [1-9]/);
  await shot(page,'github-ready-export-zh');
  await save(page,'导出 Core 3MF',`public-github-${live?'live-recorded':'fixture'}.3mf`,evidence);
  await save(page,'导出单色 STL',`public-github-${live?'live-recorded':'fixture'}.stl`,evidence);
  await page.getByRole('button',{name:'隐私',exact:true}).click();
  await shot(page,'privacy-zh');
});
