import { it, expect, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { buildPlan, buildSourcePlans, defaultRecipe, demoBundle } from '../../core/src/index';
import { generateGeometry, validateMesh } from './index';
import { compileLocalSVG } from '../../logos/src/index';
import { exportSTL, readSTL } from '../../exporters/stl/src/index';
import { export3MF, validate3MF } from '../../exporters/three-mf/src/index';
const bytes = await readFile(new URL('../assets/VibeSkylineGrid-Regular.ttf', import.meta.url));
const font = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
it('rejects fused default plans and isolates source identity, logo and serialized geometry', async () => {
 const bundle=demoBundle(2026,2);
 bundle.sources[1].days=bundle.sources[1].days.map(d=>({...d,date:d.date.replace("2026","2025")}));
 expect(()=>buildPlan(bundle,defaultRecipe)).toThrow(/one source/i);
 const plans=buildSourcePlans(bundle,defaultRecipe,{github:{name:'git-demo',year:2026},codex:{name:'ai-demo',year:2025}});
 expect(plans.map(p=>p.districts.map(d=>d.id))).toEqual([['github'],['codex']]);
 const tile=await compileLocalSVG('<svg viewBox="0 0 10 10"><path d="M0 0H10V10H0Z M3 3V7H7V3Z" fill-rule="evenodd"/></svg>',{seatMm:12.5});
 const a=await generateGeometry(plans[0],font,{logoTiles:{github:tile}}),b=await generateGeometry(plans[1],font,{logoTiles:{github:tile}});
 expect(a.identity?.name.text).toBe('git-demo');expect(b.identity?.name.text).toBe('ai-demo');
 expect(b.identity?.year.text).toBe('2025');expect(a.logoMeasurements).toHaveLength(1);expect(b.logoMeasurements).toHaveLength(0);
 expect(a.plan!.depth).toBeCloseTo(36.734,2);expect(a.plan!.height).toBe(36);
 expect(a.lockup!.logo.x+a.lockup!.logo.width+2.4).toBeCloseTo(a.lockup!.name.x);
 expect(a.lockup!.name.x+a.lockup!.name.width+4).toBeLessThanOrEqual(a.lockup!.year.x);
 for(const g of [a,b]){expect(validateMesh(g.mono,g.plan)).toMatchObject({valid:true,components:1});expect(validateMesh(readSTL(exportSTL(g.mono))).valid).toBe(true);expect(validate3MF(export3MF(g)).valid).toBe(true);}
 expect(exportSTL(a.mono)).not.toEqual(exportSTL(b.mono));
 expect(a.regions.flatMap(r=>r.roleKeys??[])).not.toContain('source:codex');
 expect(b.regions.flatMap(r=>r.roleKeys??[])).not.toContain('source:github');
},120000);
it('Saturday is at the front, Sunday at the back; first-edition mm constants',()=>{
 const bundle=demoBundle(2025,1),p=buildPlan(bundle,{...defaultRecipe,year:2025});
 expect(p.width).toBeCloseTo(170.402577,4);
 const sat=p.solids[3],sun=p.solids[4];expect(sat.y).toBeLessThan(sun.y);
 expect(sat.w).toBe(2.5);expect(p.height).toBe(36);
});

it('keeps the first-print footprint in January and gives an actionable blank-ID error',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2027-01-03T12:00:00Z'));
 try {
  const p=buildPlan(demoBundle(2027,1),{...defaultRecipe,year:2027});
  expect(p.width).toBeCloseTo(152.402577,4);
  const g=await generateGeometry(p,font);expect(validateMesh(g.mono).valid).toBe(true);
  await expect(generateGeometry({...p,recipe:{...p.recipe,name:''}},font)).rejects.toThrow('enter a printable ID');
 } finally {vi.useRealTimers();}
});
it('validates the default Grid lockup with sloped region boundaries',async()=>{
 const p=buildPlan(demoBundle(2026,1),defaultRecipe),g=await generateGeometry(p,font);
 expect(validate3MF(export3MF(g)).valid).toBe(true);
});

it('official Invertocat relief survives STL/3MF, while neutral and none emit no official geometry',async()=>{
 const {compileSourceLogo}=await import('../../logos/src/index');
 const {unzipSync,strFromU8}=await import('fflate');
 const p=buildPlan(demoBundle(2026,1),defaultRecipe);
 const tile=await compileSourceLogo('github','brand');
 const official=await generateGeometry(p,font,{logoTiles:{github:tile!}});
 const neutral=await generateGeometry({...p,recipe:{...p.recipe,logoMode:'neutral'}},font,{logoTiles:{github:tile!}});
 const none=await generateGeometry({...p,recipe:{...p.recipe,logoMode:'none'}},font,{logoTiles:{github:tile!}});
 expect(official.lockup?.logo.present).toBe(true);
 expect(official.logoMeasurements?.[0]).toMatchObject({qualified:false,minStrokeMm:expect.closeTo(.957,3),minGapMm:expect.closeTo(.538,3)});
 expect(official.mono.triangles.length).toBeGreaterThan(neutral.mono.triangles.length+100);
 for(const g of [official,neutral,none]){
  expect(validateMesh(readSTL(exportSTL(g.mono))).valid).toBe(true);
  const archive=export3MF(g);expect(validate3MF(archive).valid).toBe(true);
  const features=JSON.parse(strFromU8(unzipSync(archive)['features.json']));
  expect(features.logos).toHaveLength(g===official?1:0);
 }
 expect(exportSTL(official.mono)).not.toEqual(exportSTL(neutral.mono));
 expect(exportSTL(neutral.mono)).not.toEqual(exportSTL(none.mono));
 expect(none.regions.flatMap(r=>r.roleKeys??[])).not.toContain('logo');
},120000);
