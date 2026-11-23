import {test,expect,type Page,type Route} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {unzipSync,strFromU8} from 'fflate';
import {validateMesh,validateSpatial,meshVolume} from '../packages/geometry/src/index';
import {readSTL} from '../packages/exporters/stl/src/index';
import {validate3MF} from '../packages/exporters/three-mf/src/index';
const out='test-results/legacy-examples',shots='test-results/legacy-shots';
async function shot(page:Page,name:string){await mkdir(shots,{recursive:true});await page.screenshot({path:`${shots}/${name}.png`,fullPage:true});}
async function ready(page:Page){await expect(page.getByText('Building exact geometry…')).toBeHidden({timeout:120000});await expect(page.getByRole('alert')).toHaveCount(0);}
async function artifact(path:string){const bytes=new Uint8Array(await readFile(path));let details:any;
 if(path.endsWith('.stl')){const mesh=readSTL(bytes),v=validateMesh(mesh),spatial=validateSpatial([mesh]);expect(v.valid).toBe(true);expect(spatial.valid).toBe(true);details={materialCount:1,dimensionsMm:v.bounds,volumeCm3:v.volume/1000,grams:v.volume/1000*1.24,spatial};}
 else if(path.endsWith('.3mf')){const v=validate3MF(bytes),files=unzipSync(bytes),slots=JSON.parse(strFromU8(files['material-groups.json'])),features=JSON.parse(strFromU8(files['features.json']));expect(features.text).toHaveLength(path.includes('coupon')?11:2);if(path.includes('coupon'))expect(features.logos).toHaveLength(3);if(path.includes('byo-logo'))expect(features.logos).toHaveLength(1);expect(v.spatial.valid).toBe(true);const vertices=v.meshes.flatMap(m=>m.vertices);const bounds=[0,1,2].map(k=>{const a=vertices.filter((_,i)=>i%3===k);return Math.max(...a)-Math.min(...a);});details={dimensionsMm:bounds,volumeCm3:v.meshes.reduce((n,m)=>n+meshVolume(m),0)/1000,materials:v.budget.count,grams:v.budget.totalGrams,slots:slots.slots,features};expect(Object.keys(files).some(k=>/project_settings|model_settings/.test(k))).toBe(false);}
 else details={slots:JSON.parse(new TextDecoder().decode(bytes))};
 const p=out+'/summary.json';let summary:any={};try{summary=JSON.parse(await readFile(p,'utf8'));}catch{/* first artifact */}
 summary[path]={label:path.includes('coupon')?'PRIVATE CALIBRATION — PHYSICAL VERIFICATION REQUIRED':'SYNTHETIC-DEMO',sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,...details};await writeFile(p,JSON.stringify(summary,null,2)+'\n');
}
async function download(page:Page,button:string,name:string){const wait=page.waitForEvent('download');await page.getByRole('button',{name:button}).click();const d=await wait;const path=out+'/'+name;await d.saveAs(path);await artifact(path);}
test('CJK geometry, material groups, local SVG and validated downloads',async({page})=>{
 await mkdir(out,{recursive:true});const requests:string[]=[];page.on('request',r=>requests.push(r.url()));
 await page.goto('/');await expect(page.locator('canvas')).toBeVisible();
 await page.getByRole('button',{name:'Explore the sample studio'}).click();await ready(page);
 await page.getByRole('tab',{name:'Shape',exact:true}).click();await page.getByLabel('Printable name',{exact:true}).fill('林小川');await ready(page);
 await page.getByText('Typography & sizing',{exact:true}).click();await expect(page.getByTestId('glyph-validation')).toContainText('Stroke / gap');await shot(page,'glyph-validation');await page.locator('canvas').screenshot({path:shots+'/cjk-close-up.png'});
 await page.getByRole('tab',{name:'Export',exact:true}).click();await ready(page);await ready(page);await shot(page,'material-groups');
 await download(page,'Export mono STL','cjk-name.stl');await download(page,'Export Core 3MF','three-source.3mf');

 await page.getByRole('tab',{name:'Shape',exact:true}).click();await page.getByRole('checkbox').check();await page.getByLabel('Local SVG logo').setInputFiles('fixtures/logos/synthetic-frame.svg');await ready(page);await expect(page.locator('aside')).toContainText('Logo stroke / gap');await shot(page,'logo-panel');
 await page.getByRole('tab',{name:'Export',exact:true}).click();await download(page,'Export Core 3MF','byo-logo.3mf');

 await page.getByRole('tab',{name:'Shape',exact:true}).click();await page.getByLabel('Local SVG logo').setInputFiles('fixtures/logos/malicious.svg');await expect(page.getByRole('alert')).toContainText(/SVG/i,{timeout:30000});await shot(page,'error-state');expect(requests.some(r=>r.includes('example.invalid'))).toBe(false);
 await page.getByRole('button',{name:'Retry without custom SVG'}).click();await page.getByLabel('Printable name',{exact:true}).fill('龘');await expect(page.getByRole('alert')).toContainText('龘',{timeout:30000});
 await page.getByLabel('Printable name',{exact:true}).fill('林小川');await ready(page);
 await page.getByRole('button',{name:'中文',exact:true}).click();await shot(page,'zh-cn');await page.setViewportSize({width:390,height:844});await shot(page,'mobile');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('recoverable proxy errors and bilingual privacy page',async({page})=>{
 await page.route('**/api/calendar/**',r=>r.fulfill({status:429,json:{error:'rate_limit'}}));await page.goto('/');await page.getByLabel('Public handle').fill('synthetic');await page.getByRole('button',{name:'Fetch calendar'}).click();await expect(page.getByRole('alert')).toContainText(/rate limited/i);
 await page.getByRole('button',{name:'Privacy',exact:true}).click();await expect(page.locator('article.privacy-page')).toContainText('never uploaded');await shot(page,'privacy');await page.getByRole('button',{name:'中文',exact:true}).click();await expect(page.locator('article.privacy-page')).toContainText('没有遥测');
});
test('failed recipe cannot export stale mesh',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Explore the sample studio'}).click();await ready(page);
 await page.getByRole('tab',{name:'Shape',exact:true}).click();await page.getByLabel('Printable name',{exact:true}).fill('maker-demo');await ready(page);await page.getByRole('tab',{name:'Export',exact:true}).click();await expect(page.getByRole('button',{name:'Export mono STL'})).toBeEnabled();
 await page.getByRole('tab',{name:'Shape',exact:true}).click();await page.getByLabel('Printable name',{exact:true}).fill('龘');await expect(page.getByRole('alert')).toContainText('龘');
 let pending:Route|undefined;await page.route('**/api/calendar/**',r=>{pending=r;});await page.getByRole('tab',{name:'Sources',exact:true}).click();await page.getByLabel('Public handle').fill('synthetic');await page.getByRole('button',{name:'Fetch calendar'}).click();await expect.poll(()=>!!pending).toBe(true);await expect(page.getByRole('alert')).toContainText('龘');await expect(page.getByTestId('dimensions')).toContainText('Unavailable');
 await page.getByRole('tab',{name:'Export',exact:true}).click();await expect(page.getByRole('button',{name:'Export mono STL'})).toBeDisabled();
 await pending!.fulfill({status:400,json:{error:'bad_handle'}});await expect(page.getByTestId('calendar-error')).toContainText('Check the public username and year');await expect(page.getByRole('alert')).toHaveCount(2);
});

test('the Gitee color editor keeps its physical material after GitHub is removed', async ({ page }) => {
 await page.goto('/');
 await page.getByRole('button', { name: 'Explore the sample studio' }).click();
 await page.getByRole('tab', { name: 'Colors', exact: true }).click();
 await page.getByLabel('Gitee color', { exact: true }).fill('#123456');
 await page.getByRole('tab', { name: 'Export', exact: true }).click();

 await page.getByRole('tab', { name: 'Sources', exact: true }).click();
 await page.getByRole('button', { name: 'Remove GitHub' }).click();
 await page.getByRole('tab', { name: 'Colors', exact: true }).click();
 await expect(page.getByLabel('Gitee color', { exact: true })).toHaveValue('#123456');
 await page.getByRole('tab', { name: 'Export', exact: true }).click();
 const pending = page.waitForEvent('download');
 await page.getByRole('button', { name: 'Export Core 3MF' }).click();
 const file = await (await pending).path();
 const bytes = await readFile(file!);
 const { budget } = validate3MF(bytes);
 expect(budget.materials.find(m => m.roleKeys?.includes('source:gitee')))
   .toMatchObject({ color: '#123456' });
 expect(budget.materials.find(m => m.roleKeys?.includes('source:gitlab'))).toBeUndefined();
});
