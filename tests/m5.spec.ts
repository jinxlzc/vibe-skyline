import {test,expect,type Page} from '@playwright/test';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import {unzipSync,strFromU8} from 'fflate';
import {validate3MF} from '../packages/exporters/three-mf/src/index';
import {readSTL} from '../packages/exporters/stl/src/index';
import {validateMesh} from '../packages/geometry/src/index';
const out='examples/m5';
async function ready(page:Page){await expect(page.getByTestId('dimensions')).toContainText('mm',{timeout:60000});await expect(page.getByRole('alert')).toHaveCount(0);}
test('M5 source switcher isolates identity, year, local SVG and exported files',async({page})=>{
 await mkdir(out,{recursive:true});await page.clock.setFixedTime(new Date('2026-11-20T12:00:00Z'));
 const requests:string[]=[];page.on('request',r=>{if(r.url().includes('/api/')||(!r.url().startsWith('http://127.0.0.1:4173')&&!r.url().startsWith('blob:')&&!r.url().startsWith('data:')))requests.push(r.url());});
 await page.goto('/');await ready(page);await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(250);await page.screenshot({path:`${out}/landing-desktop.png`,fullPage:true});
 await page.getByRole('button',{name:'Explore the sample studio'}).click();await page.getByRole('tab',{name:'Shape',exact:true}).click();
 await page.getByLabel('Printable name',{exact:true}).fill('git-demo');await page.getByRole('checkbox').check();await page.getByLabel('Local SVG logo').setInputFiles('fixtures/logos/synthetic-frame.svg');await ready(page);

 const files:Record<string,Uint8Array>={};
 async function download(source:string){await page.getByRole('tab',{name:'Export',exact:true}).click();await ready(page);for(const ext of ['stl','3mf']){const pending=page.waitForEvent('download');await page.getByRole('button',{name:ext==='stl'?'Export mono STL':'Export Core 3MF'}).click();const d=await pending;expect(d.suggestedFilename()).toMatch(new RegExp(`^vibeskyline-${source}-2026\\.${ext}$`));await d.saveAs(`${out}/${source==='github'?'vibeskyline-github-byo-2026.'+ext:d.suggestedFilename()}`);files[source+'.'+ext]=new Uint8Array(await readFile(`${out}/${source==='github'?'vibeskyline-github-byo-2026.'+ext:d.suggestedFilename()}`));}}
 await download('github');
 await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(250);await page.screenshot({path:`${out}/github-byo-desktop.png`,fullPage:true});await page.locator('.viewer').screenshot({path:`${out}/github-byo-model.png`});
 await page.getByRole('group',{name:'Independent models'}).getByRole('button',{name:'Gitee',exact:true}).click();await page.getByRole('tab',{name:'Shape',exact:true}).click();await ready(page);
 await expect(page.getByLabel('Printable name',{exact:true})).toHaveValue('skyline-demo');await expect(page.locator('aside')).not.toContainText('Local SVG selected');
 await page.getByLabel('Printable name',{exact:true}).fill('gitee-demo');await ready(page);await download('gitee');
 const git=validate3MF(files['github.3mf']),gitee=validate3MF(files['gitee.3mf']);
 expect(git.budget.materials.flatMap(m=>m.roleKeys??[])).toContain('source:github');expect(git.budget.materials.flatMap(m=>m.roleKeys??[])).not.toContain('source:gitee');
 expect(gitee.budget.materials.flatMap(m=>m.roleKeys??[])).toContain('source:gitee');expect(gitee.budget.materials.flatMap(m=>m.roleKeys??[])).not.toContain('source:github');
 const features=(b:Uint8Array)=>JSON.parse(strFromU8(unzipSync(b)['features.json']));expect(features(files['github.3mf']).logos).toHaveLength(1);expect(features(files['gitee.3mf']).logos).toHaveLength(1);
 for(const id of ['github','gitee']) expect(validateMesh(readSTL(files[id+'.stl'])).valid).toBe(true);
 expect(files['github.stl']).not.toEqual(files['gitee.stl']);
 await page.getByRole('tab',{name:'Shape',exact:true}).click();await page.getByLabel('Year',{exact:true}).fill('2025');await ready(page);
 await page.getByRole('group',{name:'Independent models'}).getByRole('button',{name:'GitHub',exact:true}).click();await ready(page);
 await expect(page.getByLabel('Printable name',{exact:true})).toHaveValue('git-demo');await expect(page.getByLabel('Year',{exact:true})).toHaveValue('2026');await expect(page.locator('aside')).toContainText('Local SVG selected');
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'中文',exact:true}).click();await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(250);await page.screenshot({path:`${out}/switcher-mobile-zh.png`,fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(requests).toEqual([]);
 await writeFile(`${out}/README.md`,'# M5 model examples refreshed for M6\n\nGitHub and Gitee are separate models, exported through the browser. Activity is deterministic synthetic demo data, frozen at 2026-11-20. skyline-demo uses the official GitHub Invertocat in the default preview and exports; git-demo uses the original synthetic-frame.svg BYO fixture in the separately labeled byo files; gitee-demo uses the official Gitee mark. Official files are bundled with owner-accepted brand-policy risk and no redistribution or printable-derivative grant claimed. Invertocat measures about 0.957 mm stroke / 0.538 mm gap and is not print-qualified. No personal AI logs, slicer or printer. See ../../licenses/TRADEMARKS.md for provenance and kill switches.\n');
});

test('official GitHub default preview and exports; global and source kill switches preserve BYO',async({page})=>{
 await mkdir(out,{recursive:true});await page.clock.setFixedTime(new Date('2026-11-20T12:00:00Z'));
 await page.goto('/');await expect(page.getByTestId('logo-state')).toHaveText('Official Invertocat · not print-qualified',{timeout:60000});
 await page.getByRole('button',{name:'Explore the sample studio'}).click();await ready(page);
 const download=async(ext:'stl'|'3mf',path?:string)=>{
  await page.getByRole('tab',{name:'Export',exact:true}).click();await ready(page);
  const button=page.getByRole('button',{name:ext==='stl'?'Export mono STL':'Export Core 3MF'});await expect(button).toBeEnabled();
  const pending=page.waitForEvent('download');await button.click();const d=await pending;
  const file=path??`test-results/logo-switch-${ext}`;await d.saveAs(file);return new Uint8Array(await readFile(file));
 };
 const features=(b:Uint8Array)=>JSON.parse(strFromU8(unzipSync(b)['features.json']));
 const stl=await download('stl',`${out}/vibeskyline-github-2026.stl`);
 const mf=await download('3mf',`${out}/vibeskyline-github-2026.3mf`);
 const official=features(mf);expect(official.logos).toHaveLength(1);
 expect(official.logos[0]).toMatchObject({minStrokeMm:expect.closeTo(.957,3),minGapMm:expect.closeTo(.538,3),qualified:false,provenance:{kind:'official',brand:'github',licenseStatus:'owner-accepted-risk',sha256:'bce494189797623c34e39a41c2c38a132bdca23ce4e6ac06b70116ed7e91ce26'}});
 expect(validate3MF(mf).valid).toBe(true);expect(validateMesh(readSTL(stl)).valid).toBe(true);
 await page.locator('.viewer').screenshot({path:`${out}/github-model.png`});
 await page.getByRole('tab',{name:'Shape',exact:true}).click();await page.screenshot({path:`${out}/github-official-desktop.png`,fullPage:true});
 await page.getByRole('button',{name:'Use empty plate for this source',exact:true}).click();await expect(page.getByTestId('logo-state')).toHaveText('Reserved empty plate');
 const neutralSTL=await download('stl');expect(neutralSTL).not.toEqual(stl);
 expect(readSTL(stl).triangles.length).toBeGreaterThan(readSTL(neutralSTL).triangles.length+100);
 expect(features(await download('3mf')).logos).toHaveLength(0);
 await page.getByRole('tab',{name:'Shape',exact:true}).click();
 await page.getByRole('group',{name:'Independent models'}).getByRole('button',{name:'Gitee',exact:true}).click();await expect(page.getByLabel('Logo mode')).toHaveValue('brand');await expect(page.getByTestId('logo-state')).toHaveText('Official Gitee logo · not print-qualified');
 await page.getByRole('group',{name:'Independent models'}).getByRole('button',{name:'GitHub',exact:true}).click();await expect(page.getByLabel('Logo mode')).toHaveValue('neutral');
 await page.getByLabel('Logo mode').selectOption('none');await expect(page.getByTestId('logo-state')).toHaveText('No logo artwork');
 const none=await download('3mf');expect(features(none).logos).toHaveLength(0);expect(validate3MF(none).budget.materials.flatMap(m=>m.roleKeys??[])).not.toContain('logo');
 await page.getByRole('tab',{name:'Shape',exact:true}).click();await page.getByLabel('Logo mode').selectOption('brand');await expect(page.getByTestId('logo-state')).toHaveText('Official Invertocat · not print-qualified');
 await page.getByRole('button',{name:'Disable official marks for all sources',exact:true}).click();await expect(page.getByTestId('logo-state')).toHaveText('Reserved empty plate');expect(features(await download('3mf')).logos).toHaveLength(0);
 await page.getByRole('tab',{name:'Shape',exact:true}).click();await page.getByRole('checkbox').check();await page.getByLabel('Local SVG logo').setInputFiles('fixtures/logos/synthetic-frame.svg');await expect(page.getByTestId('logo-state')).toHaveText('Local SVG · not print-qualified');
 const byo=features(await download('3mf'));expect(byo.logos).toHaveLength(1);expect(byo.logos[0]).not.toHaveProperty('provenance');
 await page.getByRole('tab',{name:'Shape',exact:true}).click();await page.getByRole('button',{name:'Remove local SVG',exact:true}).click();await expect(page.getByTestId('logo-state')).toHaveText('Reserved empty plate');
 await page.getByRole('button',{name:'Enable official marks for all sources',exact:true}).click();await expect(page.getByTestId('logo-state')).toHaveText('Official Invertocat · not print-qualified');
});


test('a delayed BYO read cannot re-enable another source logo',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Explore the sample studio'}).click();
 await page.getByRole('tab',{name:'Shape',exact:true}).click();await page.getByLabel('Logo mode').selectOption('neutral');await page.getByRole('checkbox').check();
 await page.evaluate(()=>{
  const read=File.prototype.text;
  File.prototype.text=function(){return new Promise(resolve=>{(window as any).releaseSVG=async()=>resolve(await read.call(this));});};
 });
 await page.getByLabel('Local SVG logo').setInputFiles('fixtures/logos/synthetic-frame.svg');
 await page.getByRole('group',{name:'Independent models'}).getByRole('button',{name:'Gitee',exact:true}).click();await page.getByLabel('Logo mode').selectOption('none');
 await page.evaluate(()=>(window as any).releaseSVG());
 await expect(page.getByLabel('Logo mode')).toHaveValue('none');await expect(page.getByTestId('logo-state')).toHaveText('No logo artwork',{timeout:60000});
 await page.getByRole('group',{name:'Independent models'}).getByRole('button',{name:'GitHub',exact:true}).click();
 await expect(page.getByLabel('Logo mode')).toHaveValue('brand');await expect(page.getByTestId('logo-state')).toHaveText('Local SVG · not print-qualified',{timeout:60000});
});


test.afterAll(async()=>{
 const manifest:Record<string,unknown>={};
 for(const file of (await readdir(out)).filter(f=>/\.(png|stl|3mf)$/.test(f)).sort()){
  const bytes=await readFile(`${out}/${file}`);
  const geometry=file.endsWith('.stl')?readSTL(bytes):undefined;
  manifest[file]={sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,
   activity:'deterministic synthetic',logo:file.includes('gitee')?'official Gitee mark':file.includes('byo')||file.startsWith('switcher')?'synthetic BYO':'official GitHub Invertocat',
   sliced:false,physicallyPrinted:false,
   ...(geometry?{triangles:geometry.triangles.length/3,extentsMm:validateMesh(geometry).bounds}:{}),
   ...(file.endsWith('.3mf')?{logos:JSON.parse(strFromU8(unzipSync(bytes)['features.json'])).logos}:{}),
  };
 }
 await writeFile(`${out}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
});
