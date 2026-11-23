import {test,expect,type Page,type Download} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {unzipSync,strFromU8} from 'fflate';
import {validateMesh,validateSpatial} from '../packages/geometry/src/index';
import {readSTL} from '../packages/exporters/stl/src/index';
import {validate3MF} from '../packages/exporters/three-mf/src/index';
const out='test-results/legacy-lettering',shots='test-results/legacy-lettering/shots';
async function ready(page:Page){await expect(page.getByTestId('dimensions')).not.toContainText('Recomputing',{timeout:120000});await expect(page.getByText('Building exact geometry…')).toBeHidden();await expect(page.getByRole('alert')).toHaveCount(0);}
async function shot(page:Page,name:string){await mkdir(shots,{recursive:true});await page.screenshot({path:`${shots}/${name}.png`,fullPage:true});}
async function save(d:Download,name:string){await mkdir(out,{recursive:true});const path=out+'/'+name;await d.saveAs(path);const bytes=new Uint8Array(await readFile(path));let details:any={};
 if(name.endsWith('.stl')){const mesh=readSTL(bytes),v=validateMesh(mesh),s=validateSpatial([mesh]);expect(v.valid).toBe(true);expect(s.valid).toBe(true);details={dimensionsMm:v.bounds,volumeCm3:v.volume/1000,grams:v.volume/1000*1.24,materialCount:1,spatial:s};}
 if(name.endsWith('.3mf')){const v=validate3MF(bytes),files=unzipSync(bytes),slots=JSON.parse(strFromU8(files['material-groups.json'])),features=JSON.parse(strFromU8(files['features.json']));expect(v.spatial.valid).toBe(true);for(const t of features.text){expect(t.minStrokeMm).toBeGreaterThanOrEqual(.8);if(t.minGapMm!==null)expect(t.minGapMm).toBeGreaterThanOrEqual(.6);}const vertices=v.meshes.flatMap(m=>m.vertices);details={dimensionsMm:[0,1,2].map(k=>{const a=vertices.filter((_,i)=>i%3===k);return Math.max(...a)-Math.min(...a);}),volumeCm3:v.budget.totalVolumeCm3,grams:v.budget.totalGrams,materialCount:v.budget.count,slots:slots.slots,features,spatial:v.spatial};if(name.includes('coupon')){expect(features.text).toHaveLength(11);expect(slots.assignments.find((a:any)=>a.roles.includes('text')).slot).not.toBe(slots.assignments.find((a:any)=>a.roles.includes('base')).slot);}}
 if(name.endsWith('.json'))details={slotIntent:JSON.parse(new TextDecoder().decode(bytes))};
 const summaryPath=out+'/summary.json';let summary:any={};try{summary=JSON.parse(await readFile(summaryPath,'utf8'));}catch{/* first run */}summary[name]={label:name.includes('coupon')?'PRIVATE CALIBRATION — PHYSICAL VERIFICATION REQUIRED':'SYNTHETIC-DEMO',sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,...details};await writeFile(summaryPath,JSON.stringify(summary,null,2)+'\n');return details;
}
async function download(page:Page,label:string,name:string){const wait=page.waitForEvent('download');await page.getByRole('button',{name:label}).click();return save(await wait,name);}
async function studio(page:Page){await page.goto('/');await page.getByRole('button',{name:'Explore the sample studio'}).click();await ready(page);await page.getByRole('tab',{name:'Shape',exact:true}).click();await page.getByLabel('Printable name',{exact:true}).fill('林小川');await ready(page);await page.getByText('Typography & sizing',{exact:true}).click();}
test('CJK front identity, explicit overflow recovery and validated downloads',async({page})=>{
 await studio(page);await expect(page.getByTestId('dimensions')).toContainText('36.7');await shot(page,'default-cjk-porcelain');await page.getByTestId('font-license').locator('summary').click();await shot(page,'font-license');await page.getByTestId('font-license').locator('summary').click();
 for(const size of ['small','medium','large']){await page.getByLabel('Name size',{exact:true}).selectOption(size);await ready(page);await shot(page,'name-size-'+size);}
 await page.getByLabel('Name size',{exact:true}).selectOption('medium');await ready(page);await page.getByRole('tab',{name:'Export',exact:true}).click();await expect(page.getByRole('button',{name:'Export Core 3MF'})).toBeEnabled();await shot(page,'default-print');
 await ready(page);
 await ready(page);await ready(page);await shot(page,'material-groups');
 const model=await download(page,'Export Core 3MF','default-three-source.3mf');expect(model.dimensionsMm[1]).toBeLessThanOrEqual(87.21);expect(model.materialCount).toBe(3);await download(page,'Export mono STL','mono.stl');


 await page.getByRole('tab',{name:'Shape',exact:true}).click();await page.getByLabel('Printable name',{exact:true}).fill('maker-demo');await ready(page);await expect(page.getByTestId('dimensions')).toContainText('36.7');await shot(page,'maker-demo-medium-front');await page.getByRole('tab',{name:'Export',exact:true}).click();await download(page,'Export Core 3MF','maker-demo.3mf');await page.getByRole('tab',{name:'Shape',exact:true}).click();await page.getByLabel('Printable name',{exact:true}).fill('欧阳司马诸葛上官夏侯东方南宫长孙');await expect(page.getByTestId('name-recommendations')).toBeVisible();await shot(page,'long-name-recommendation');await page.getByLabel('Printable name',{exact:true}).fill('林小川');await ready(page);await shot(page,'shortened-name-front');await page.getByRole('tab',{name:'Export',exact:true}).click();await download(page,'Export Core 3MF','shortened-name-front.3mf');
 await page.getByRole('tab',{name:'Shape',exact:true}).click();await expect(page.locator('aside')).toContainText('GitHub’s official Invertocat is on by default');await shot(page,'logo-panel');await page.getByLabel('Printable name',{exact:true}).fill('林小川');await ready(page);await page.getByRole('button',{name:'中文',exact:true}).click();await shot(page,'zh-cn');await page.setViewportSize({width:390,height:844});await shot(page,'mobile');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await writeFile(out+'/recipe-source.json',JSON.stringify({label:'SYNTHETIC-DEMO',source:'demoBundle(2026), three deterministic synthetic source series; no fetched responses',name:'林小川',nameSize:'medium',namePlacement:'front',theme:'porcelain',resolution:'unresolved',materials:'free material groups; no hardware slot defaults',rearExample:'欧阳司马诸葛上官夏侯东方南宫长孙, same resolution, Medium rear horizontal apron',coupon:'PRIVATE CALIBRATION — owner name and handle at Small, Medium and Large, plus dense characters, digits and feature gauges. No usage activity. Physical verification required.',font:'VibeSkylineGrid-Regular.ttf, OFL-1.1; generic Fusion Pixel subset',density:1.24,physicalPrint:false,slicerConnection:false},null,2)+'\n');
});
test('footer hides stale dimensions throughout held geometry rebuild and final bounds match download',async({page})=>{
 await page.addInitScript(()=>{const send=Worker.prototype.postMessage;const state:any={hold:false,queue:[]};(window as any).__geometryGate=state;Worker.prototype.postMessage=function(message:any,...args:any[]){if(message.plan&&state.hold){state.queue.push(()=>send.call(this,message,...args as [any]));return;}send.call(this,message,...args as [any]);};state.release=()=>{state.hold=false;state.queue.splice(0).forEach((f:()=>void)=>f());};});
 await studio(page);
 for(const [label,value] of [['Name size','large'],['Name size','medium']]){
  const old=await page.getByTestId('dimensions').innerText();await page.evaluate(()=>{const s=(window as any).__geometryGate;s.hold=true;s.values=[];s.observer=new MutationObserver(()=>s.values.push(document.querySelector('[data-testid="dimensions"]')?.textContent));s.observer.observe(document.querySelector('[data-testid="dimensions"]')!,{childList:true,subtree:true,characterData:true});});
  await page.getByLabel(label,{exact:true}).selectOption(value);await expect(page.getByTestId('dimensions')).toHaveText('Recomputing…');await expect.poll(()=>page.evaluate(()=>(window as any).__geometryGate.queue.length)).toBeGreaterThan(0);await shot(page,'recomputing-footer');const values=await page.evaluate(()=>(window as any).__geometryGate.values);expect(values.length).toBeGreaterThan(0);expect(values.every((v:string)=>v==='Recomputing…')).toBe(true);expect(await page.getByTestId('dimensions').innerText()).not.toBe(old);await page.evaluate(()=>{const s=(window as any).__geometryGate;s.observer.disconnect();s.release();});await ready(page);
 }
 const dims=(await page.getByTestId('dimensions').innerText()).match(/[\d.]+/g)!.map(Number);await page.getByRole('tab',{name:'Export',exact:true}).click();const result=await download(page,'Export mono STL','medium-front.stl');result.dimensionsMm.forEach((v:number,i:number)=>expect(Math.abs(v-dims[i])).toBeLessThan(.051));
});

test('a long name that exceeds the front band explains the space limit in Chinese and offers recovery',async({page})=>{
 await studio(page);await page.getByRole('button',{name:'中文',exact:true}).click();await page.getByLabel('Printable name',{exact:true}).fill('欧阳司马诸葛上官夏侯东方南宫长孙');await expect(page.getByRole('alert')).toContainText('前侧刻字区空间不足',{timeout:30000});await expect(page.getByTestId('dimensions')).toContainText('无法计算');await page.getByLabel('Printable name',{exact:true}).fill('林小川');await expect(page.getByRole('alert')).toHaveCount(0,{timeout:30000});await expect(page.getByTestId('dimensions')).toContainText('mm',{timeout:30000});
});

test('the built app serves all original Grid font notices through the license panel', async ({ page }) => {
  await studio(page);
  const panel = page.getByTestId('font-license');
  await panel.locator('summary').click();
  const notices = [
    ['Fusion Pixel license notice', 'Fusion Pixel 许可声明', 'OFL.txt'],
    ['Ark Pixel license notice', 'Ark Pixel 许可声明', 'LICENSES/ark-pixel/OFL.txt'],
    ['Cubic 11 license notice', 'Cubic 11 许可声明', 'LICENSES/cubic-11/OFL.txt'],
    ['Galmuri license notice', 'Galmuri 许可声明', 'LICENSES/galmuri/LICENSE.txt'],
  ];
  const links = [];
  for (const [en, zh, file] of notices) {
    const link = panel.getByRole('link', { name: en, exact: true });
    await expect(link).toHaveAttribute('href', /^\/assets\//);
    const href = (await link.getAttribute('href'))!;
    const response = await page.request.get(href, { maxRedirects: 0 });
    expect(response.ok(), en).toBe(true);
    const original = await readFile(new URL(`../packages/geometry/assets/grid-licenses/${file}`, import.meta.url));
    expect((await response.body()).equals(original), en).toBe(true);
    links.push({ zh, href });
  }
  await page.getByRole('button', { name: '中文', exact: true }).click();
  for (const { zh, href } of links) {
    await expect(panel.getByRole('link', { name: zh, exact: true })).toHaveAttribute('href', href);
  }
});
