import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {importLocal,parseCSV,decodeCSV,parseClaude,parseGemini} from './imports';
const file=(name:string)=>({name,bytes:readFileSync(new URL('../../../fixtures/adapters/m2/'+name,import.meta.url))});
it('Claude final revision, subagent echo suppression and inclusive cache golden',async()=>{const b=await importLocal([file('claude.jsonl'),file('claude.jsonl')],2026,'UTC');expect(b.sources[0].days[0].value).toBe(25);expect(JSON.stringify(b)).not.toContain('CANARY');expect(b.provenance[0].status).toBe('fixture-tested');});
it('Gemini includes thoughts/tool and cache subset; drops content',async()=>{const b=await importLocal([file('gemini.json')],2026,'UTC');expect(b.sources[0].days[0].tokens).toMatchObject({in:23,out:7,cacheRead:8,reasoning:2});expect(JSON.stringify(b)).not.toContain('CANARY');});
it('Cursor disjoint CSV and manual CSV; duplicates rejected',async()=>{const b=await importLocal([file('cursor.csv'),file('manual.csv')],2026,'UTC');expect(b.sources.map(s=>s.days[0].value)).toEqual([25,5]);expect(JSON.stringify(b)).not.toContain('CANARY');await expect(importLocal([file('manual.csv'),file('manual.csv')],2026,'UTC')).rejects.toThrow();});
it('encoding sniff, BOM, explicit mapping, invalid numbers and unhandled revisions',async()=>{expect(decodeCSV(new Uint8Array([0xD6,0xD0])).encoding).toBe('GB18030');expect(parseCSV(new TextEncoder().encode('\uFEFF'+new TextDecoder().decode(file('manual.csv').bytes)),2026)).toHaveLength(1);expect(()=>parseCSV(new TextEncoder().encode('date,source,metric,value,timezone,quality\n2026-01-01,x,tokens,-1,UTC,manual'),2026)).toThrow();await expect(parseClaude(new TextEncoder().encode('{bad}'))).rejects.toThrow();await expect(parseGemini(new TextEncoder().encode('{"$rewindTo":"x"}'))).rejects.toThrow();});
it('Claude suppresses proven replay only, keeps child calls and complete revision in either order',async()=>{
 const original=JSON.parse(new TextDecoder().decode(file('claude.jsonl').bytes).split('\n')[1]);
 const child=structuredClone(original);child.message.id='child';child.requestId='child-request';child.isSidechain=true;child.message.usage={input_tokens:4,output_tokens:6,cache_creation_input_tokens:0,cache_read_input_tokens:0};
 const later=structuredClone(original);later.timestamp='2026-01-04T12:00:01Z';later.requestId='new-call';later.isSidechain=true;later.message.usage={input_tokens:2,output_tokens:3,cache_creation_input_tokens:0,cache_read_input_tokens:0};
 const bytes=new TextEncoder().encode([original,child,later].map(r=>JSON.stringify(r)).join('\n'));
 const b=await importLocal([{name:'claude.jsonl',bytes},file('claude.jsonl')],2026,'UTC');expect(b.sources[0].days[0].value).toBe(40);
 const missing=structuredClone(original);delete missing.message.usage.cache_read_input_tokens;await expect(parseClaude(new TextEncoder().encode(JSON.stringify(missing)))).rejects.toThrow(/unknown/);
});
it('rejects Gemini checkpoints, negative components and ambiguous copies',async()=>{
 const root=JSON.parse(new TextDecoder().decode(file('gemini.json').bytes));root.messages[0].tokens.tool=-3;root.messages[0].tokens.total=24;
 await expect(parseGemini(new TextEncoder().encode(JSON.stringify(root)))).rejects.toThrow();
 await expect(parseGemini(new TextEncoder().encode('{"$set":{"messages":[]}}'))).rejects.toThrow(/unsupported/);
 const conflicting=JSON.parse(new TextDecoder().decode(file('gemini.json').bytes));conflicting.messages[0].tokens.output=2;conflicting.messages[0].tokens.total=27;
 await expect(importLocal([file('gemini.json'),{name:'other.json',bytes:new TextEncoder().encode(JSON.stringify(conflicting))}],2026,'UTC')).rejects.toThrow(/reconciliation/);
});
it('buckets Cursor by selected timezone and preserves manual quality',()=>{
 const csv=new TextDecoder().decode(file('cursor.csv').bytes).replace('2026-01-04T12:00:00Z','2025-12-31T20:00:00-08:00');
 expect(parseCSV(new TextEncoder().encode(csv),2026,{},'America/Los_Angeles')).toHaveLength(0);
 const manual=new TextDecoder().decode(file('manual.csv').bytes).replace(',UTC,manual',',UTC,estimated');
 expect(parseCSV(new TextEncoder().encode(manual),2026)[0].days[0].quality).toBe('estimated');
});
it('Codex sniff preserves malformed-line tolerance and rejects empty/mixed bundles',async()=>{
 const {decodeZstd}=await import('../../adapters-node/src/index');
 const raw=decodeZstd(readFileSync(new URL('../../../fixtures/adapters/codex/sessions/compressed.jsonl.zst',import.meta.url)));
 expect((await importLocal([{name:'synthetic.jsonl',bytes:raw}],2026,'UTC')).sources[0].days).toHaveLength(2);
 const {demoBundle}=await import('../../core/src/index');const bundle=demoBundle();bundle.sources=[];
 await expect(importLocal([{name:'empty.json',bytes:new TextEncoder().encode(JSON.stringify(bundle))}],2026,'UTC')).rejects.toThrow(/nonempty/);
 const mixed=demoBundle();mixed.sources[0].sample=false;await expect(importLocal([{name:'mixed.json',bytes:new TextEncoder().encode(JSON.stringify(mixed))}],2026,'UTC')).rejects.toThrow(/unmixed/);
});
it('same Gemini identity with conflicting dates cannot move usage by file order',async()=>{
 const changed=JSON.parse(new TextDecoder().decode(file('gemini.json').bytes));changed.messages[0].timestamp='2026-01-05T12:00:00Z';
 for(const files of [[file('gemini.json'),{name:'changed.json',bytes:new TextEncoder().encode(JSON.stringify(changed))}],[{name:'changed.json',bytes:new TextEncoder().encode(JSON.stringify(changed))},file('gemini.json')]])await expect(importLocal(files,2026,'UTC')).rejects.toThrow(/reconciliation/);
});
