import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {unzipSync} from 'fflate';
import {validate3MF,export3MF,slotIntent} from './index';
import type {Geometry} from '@vibeskyline/geometry';
it('preserves distinct same-color spools and writes no printer/process profiles',()=>{
 const old=validate3MF(readFileSync(new URL('../../../../docs/examples/m1/synthetic-demo.3mf',import.meta.url)));
 const g:Geometry={mono:old.meshes[0],regions:old.meshes.map((mesh,i)=>({mesh,color:old.budget.materials[i].color})),budget:old.budget};
 g.budget.materials[0].slot=1;g.budget.materials[1].slot=2;
 g.budget.materials[1].color=g.budget.materials[0].color;
 expect(slotIntent(g).assignments[0].grams).toBeGreaterThan(0);
 expect(slotIntent(g).assignments[1].grams).toBeGreaterThan(0);
 // Use a connected single region for writer topology gate; no profiles are inputs.
 g.regions=[g.regions[0]];g.budget={...g.budget,count:1,overCapacity:false,materials:[g.budget.materials[0]]};
 const files=Object.keys(unzipSync(export3MF(g)));
 expect(files).toContain('material-groups.json');
 expect(files.some(k=>/model_settings|project_settings|printer|process|\.config/i.test(k))).toBe(false);
});
it('partial assignments reserve occupied slots before resolving defaults',async()=>{
 const {resolvePhysicalSlots}=await import('@vibeskyline/contracts');
 expect(resolvePhysicalSlots([{}, {slot:1}, {}])).toEqual([2,1,3]);
 expect(()=>resolvePhysicalSlots([{slot:2},{slot:2}])).toThrow();
});
