// Local-only browser acceptance for Vite's build-time official-logo kill switches.
// Run: pnpm exec tsx scripts/check-logo-operator.ts
import { execFileSync, spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { unzipSync, strFromU8 } from 'fflate';
import { parseCalendar } from '../packages/calendars/src/index';
const root=await mkdtemp(join(tmpdir(),'vibeskyline-logo-operator-'));
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try {
 for(const variant of ['all','github'] as const){
  const out=join(root,variant);
  execFileSync('pnpm',['--filter','@vibeskyline/web','exec','vite','build','--outDir',out],{
   env:{...process.env,VITE_OFFICIAL_LOGOS:variant==='all'?'off':'on',VITE_DISABLED_OFFICIAL_LOGO_SOURCES:variant==='github'?'github':''},stdio:'pipe',maxBuffer:20*1024*1024,
  });
  const server=spawn('pnpm',['--filter','@vibeskyline/web','exec','vite','preview','--host','127.0.0.1','--port','4174','--strictPort','--outDir',out],{stdio:'ignore',detached:true});
  const page=await browser.newPage();await page.clock.setFixedTime(new Date('2026-11-20T12:00:00Z'));
  try {
   await expect.poll(async()=>{try{return (await fetch('http://127.0.0.1:4174')).status;}catch{return 0;}},{timeout:15000}).toBe(200);
   await page.goto('http://127.0.0.1:4174');
   await expect(page.getByTestId('logo-state')).toHaveText('Reserved empty plate',{timeout:60000});
   await page.getByRole('button',{name:'Explore the sample studio'}).click();
   await page.getByRole('tab',{name:'Shape',exact:true}).click();
   if(variant==='all') await expect(page.getByRole('button',{name:'Disable official marks for all sources',exact:true})).toBeDisabled();
   const logos=async()=>{
    await page.getByRole('tab',{name:'Export',exact:true}).click();
    const button=page.getByRole('button',{name:'Export Core 3MF'});await expect(button).toBeEnabled({timeout:60000});
    const pending=page.waitForEvent('download');await button.click();const d=await pending;const file=join(root,'export.3mf');await d.saveAs(file);
    return JSON.parse(strFromU8(unzipSync(await readFile(file))['features.json'])).logos;
   };
   expect(await logos()).toHaveLength(0);
   await page.getByRole('tab',{name:'Shape',exact:true}).click();await page.getByRole('checkbox').check();
   await page.getByLabel('Local SVG logo').setInputFiles('fixtures/logos/synthetic-frame.svg');
   await expect(page.getByTestId('logo-state')).toHaveText('Local SVG · not print-qualified',{timeout:60000});
   const byo=await logos();expect(byo).toHaveLength(1);expect(byo[0]).not.toHaveProperty('provenance');
   // Per-source disabling must leave the other bundled source available.
   await page.route('**/api/calendar/gitee/synthetic-gitee?year=2026',route=>route.fulfill({json:parseCalendar('gitee','3个贡献：2026-01-01 0个贡献：2026-01-02',2026)}));
   await page.getByRole('tab',{name:'Sources',exact:true}).click();await page.getByLabel('Provider',{exact:true}).selectOption('gitee');
   await page.getByLabel('Public handle').fill('synthetic-gitee');await page.getByRole('button',{name:'Fetch calendar',exact:true}).click();
   await expect(page.getByTestId('logo-state')).toHaveText(variant==='all'?'Reserved empty plate':'Official Gitee logo · not print-qualified',{timeout:60000});
   const gitee=await logos();expect(gitee).toHaveLength(variant==='all'?0:1);
   if(variant==='github') expect(gitee[0]).toMatchObject({qualified:false,provenance:{kind:'official',brand:'gitee'}});
   console.log(`PASS operator ${variant}: default/export disabled; BYO preserved; Gitee ${variant==='all'?'disabled':'enabled'}`);
  } finally {await page.close();if(server.pid)process.kill(-server.pid,'SIGTERM');}
 }
} finally {await browser.close();await rm(root,{recursive:true,force:true});}
