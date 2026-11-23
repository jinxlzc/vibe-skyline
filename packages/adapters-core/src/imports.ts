import { NormalizedObservation, SourceSeries, ActivityBundle, safeAdd, Metric, DateKey, SafeInt } from '@vibeskyline/contracts';
import {aggregateCodex,codexParser} from './index';
export type ImportKind='codex'|'claude'|'gemini'|'cursor'|'manual';
const utf8=new TextDecoder('utf-8',{fatal:true});
async function digest(s:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('');}
function jsonRows(text:string):any[]{try {const v=JSON.parse(text);return Array.isArray(v)?v:[v];}catch{return text.split(/\r?\n/).filter(Boolean).map(line=>{try{return JSON.parse(line);}catch{throw Error('Malformed JSON record');}});}}
export function claudeAccumulator(){
 const revisions=new Map<string,{observation:NormalizedObservation;echoKey:string;side:boolean}>();
 return {
 async add(bytes:Uint8Array){for(const row of jsonRows(utf8.decode(bytes))){
  if(row.type!=='assistant')continue;
  const m=row.message,u=m?.usage;if(!u)continue;
  if(typeof m.id!=='string'||typeof row.requestId!=='string')throw Error('Claude identity missing; unsupported incomplete transcript');
  for(const k of ['input_tokens','output_tokens','cache_creation_input_tokens','cache_read_input_tokens'])
   if(!SafeInt.safeParse(u[k]).success)throw Error('Claude usage component unknown or invalid; use a complete transcript');
  const id=await digest('claude:'+m.id+':'+row.requestId);
  const tokens={in:safeAdd(safeAdd(u.input_tokens,u.cache_creation_input_tokens),u.cache_read_input_tokens),out:u.output_tokens,cacheWrite:u.cache_creation_input_tokens,cacheRead:u.cache_read_input_tokens};
  const observation=NormalizedObservation.parse({id,timestamp:row.timestamp,client:'claude',tokens}),side=!!row.isSidechain;
  const echoKey=typeof row.sessionId==='string'&&row.sessionId?await digest(row.sessionId+':'+m.id+':'+row.timestamp):'';
  const prior=revisions.get(id);
  if(prior&&!prior.side&&side)continue;
  if(prior&&prior.side===side){
   const keys=['in','out','cacheWrite','cacheRead'] as const;
   const greater=keys.every(k=>tokens[k]>=(prior.observation.tokens[k]??0));
   const lesser=keys.every(k=>tokens[k]<=(prior.observation.tokens[k]??0));
   if(!greater&&!lesser)throw Error('Conflicting Claude revisions; choose one complete export');
   if(!greater)continue;
   if(lesser&&prior.observation.timestamp!==observation.timestamp)throw Error("Conflicting Claude timestamps; choose one export");
  }
  revisions.set(id,{observation,echoKey,side});
 }},
 finish(){const main=new Set([...revisions.values()].filter(r=>!r.side&&r.echoKey).map(r=>r.echoKey));return [...revisions.values()].filter(r=>!r.side||!r.echoKey||!main.has(r.echoKey)).map(r=>r.observation);}
 };
}
export async function parseClaude(bytes:Uint8Array){const a=claudeAccumulator();await a.add(bytes);return a.finish();}
export async function parseGemini(bytes:Uint8Array){
 const rows=jsonRows(utf8.decode(bytes)), revisions=new Map<string,NormalizedObservation>();
 let session='';
 for(const root of rows){
  if(root.sessionId)session=String(root.sessionId);
  // Rewind/patch records require session replay, not guessed usage.
  if(root.$patch||root.$rewindTo||root.$set)throw Error('Gemini revision format unsupported; export a full conversation JSON');
  for(const m of root.messages??root.$set?.messages??[root]){
   if(m.type!=='gemini'||!m.tokens)continue;
   if(!session||typeof m.id!=='string')throw Error('Gemini session/message identity missing');
   const t=m.tokens;for(const k of ['input','output','cached'])SafeInt.parse(t[k]);for(const k of ['tool','thoughts'])if(t[k]!==undefined)SafeInt.parse(t[k]);
   const input=safeAdd(t.input,t.tool??0),output=safeAdd(t.output,t.thoughts??0);
   if(t.total!==undefined&&t.total!==safeAdd(input,output))throw Error('Gemini accounting profile mismatch');
   const id=await digest('gemini:'+session+':'+m.id);
   const o=NormalizedObservation.parse({id,timestamp:m.timestamp,client:'gemini',tokens:{in:input,out:output,cacheRead:t.cached,reasoning:t.thoughts}});
   const prior=revisions.get(id);if(prior&&(prior.timestamp!==o.timestamp||JSON.stringify(prior.tokens)!==JSON.stringify(o.tokens)))throw Error('Conflicting Gemini snapshots; select one complete export');
   revisions.set(id,o);
  }
 }
 return [...revisions.values()];
}
export function aggregateAgent(observations:NormalizedObservation[],kind:'claude'|'gemini',year:number,tz:string){
 const final=new Map<string,NormalizedObservation>();
 for(const o of observations){const p=final.get(o.id);if(p&&(p.timestamp!==o.timestamp||JSON.stringify(p.tokens)!==JSON.stringify(o.tokens)))throw Error('Overlapping snapshots require reconciliation');if(!p)final.set(o.id,o);}
 const result=aggregateCodex([...final.values()],year,tz);
 result.id=kind;result.client=kind==='claude'?'Claude Code':'Gemini CLI';result.provenanceIds=[kind+'-local'];
 return SourceSeries.parse(result);
}
export function decodeCSV(bytes:Uint8Array){try{return {text:utf8.decode(bytes).replace(/^\uFEFF/,''),encoding:'UTF-8'};}catch{return {text:new TextDecoder('gb18030',{fatal:true}).decode(bytes),encoding:'GB18030'};}}
export function csvRows(text:string){
 const rows:string[][]=[],row:string[]=[];let field='',quote=false,afterQuote=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(afterQuote&&!['\r','\n',','].includes(c))throw Error('Malformed CSV after quote');if(c==='"'){if(quote&&text[i+1]==='"'){field+='"';i++;}else if(quote||!field){quote=!quote;afterQuote=!quote;}else throw Error('Malformed CSV quotes');}
 else if(!quote&&(c===','||c==='\n')){row.push(field.replace(/\r$/,''));field='';afterQuote=false;if(c==='\n'){if(row.some(Boolean))rows.push([...row]);row.length=0;}}else field+=c;}
 if(quote)throw Error('Unclosed CSV quote');row.push(field.replace(/\r$/,''));if(row.some(Boolean))rows.push(row);return rows;
}
export const cursorColumns=['Date','Input (w/ Cache Write)','Input (w/o Cache Write)','Cache Read','Output Tokens','Total Tokens'];
export const manualColumns=['date','source','metric','value','timezone','quality'];
export function previewCSV(bytes:Uint8Array){const {text,encoding}=decodeCSV(bytes),rows=csvRows(text),headers=rows.shift()??[];return {encoding,headers,rows:rows.length,kind:headers.includes('Date')?'cursor':'manual'};}
function integer(s:string){if(!/^\d+$/.test(s))throw Error('Expected nonnegative integer');const n=Number(s);if(!Number.isSafeInteger(n))throw Error('Unsafe integer');return n;}
export function parseCSV(bytes:Uint8Array,year:number,mapping:Record<string,string>={},timezone='UTC'){
 const {text}=decodeCSV(bytes),rows=csvRows(text),headers=rows.shift()??[],cursor=mapping._profile?mapping._profile==='cursor':headers.includes(mapping.Date??'Date');
 const required=cursor?cursorColumns:manualColumns;
 if(new Set(headers).size!==headers.length||new Set(required.map(k=>mapping[k]??k)).size!==required.length)throw Error('Ambiguous CSV mapping');
 for(const name of required)if(!headers.includes(mapping[name]??name))throw Error('CSV column mapping required');
 const at=(row:string[],key:string)=>row[headers.indexOf(mapping[key]??key)]??'';
 const sources=new Map<string,SourceSeries>(); const seen=new Set<string>();
 for(const row of rows){
  if(row.length!==headers.length)throw Error('CSV column count mismatch');
  const rawDate=at(row,cursor?'Date':'date');
  if(cursor&&!/(Z|[+-]\d{2}:?\d{2})$/.test(rawDate))throw Error('Cursor timestamp must include timezone offset');
  const parts=cursor?new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(rawDate)):[];
  const date=cursor?['year','month','day'].map(k=>parts.find(p=>p.type===k)!.value).join('-'):DateKey.parse(rawDate);
  if(!date.startsWith(String(year)))continue;
  const source=cursor?'cursor':at(row,'source'),metric=cursor?'tokens':Metric.parse(at(row,'metric'));
  if(!/^[a-z0-9-]+$/.test(source))throw Error('Use an anonymous source ID (letters, numbers, hyphens)');
  const rowTimezone=cursor?timezone:at(row,'timezone');new Intl.DateTimeFormat('en',{timeZone:rowTimezone});
  const key=source+':'+metric,dup=cursor?row.join('\0'):key+':'+date;
  if(seen.has(dup))throw Error('Overlapping CSV records require explicit reconciliation');seen.add(dup);
  let tokens;
  if(cursor){const write=integer(at(row,'Input (w/ Cache Write)')),uncached=integer(at(row,'Input (w/o Cache Write)')),read=integer(at(row,'Cache Read')),out=integer(at(row,'Output Tokens'));
   tokens={in:safeAdd(safeAdd(write,uncached),read),out,cacheWrite:write,cacheRead:read};
   if(integer(at(row,'Total Tokens'))!==safeAdd(tokens.in,tokens.out))throw Error('Cursor accounting profile mismatch');}
  const value=tokens?safeAdd(tokens.in,tokens.out):integer(at(row,'value'));
  let series=sources.get(key);
  if(!series){series={id:source,client:cursor?'Cursor':source,accountingProfile:cursor?'cursor-disjoint-to-inclusive-v1':'manual-v1',scopeId:'import',metric,unitScale:1,calendar:{timezone:rowTimezone,dateBasis:cursor?'timestamp-derived':'source-reported'},coverage:[],days:[],provenanceIds:[source+'-import'],sample:false};sources.set(key,series);}
  if(series.calendar.timezone!==rowTimezone)throw Error('Mixed timezones require reconciliation');
  if(!cursor&&!['reported','derived','estimated','manual'].includes(at(row,'quality')))throw Error('Invalid quality');
  const existing=series.days.find(d=>d.date===date);
  if(existing&&tokens&&existing.tokens){existing.value=safeAdd(existing.value!,value);for(const k of ['in','out','cacheRead','cacheWrite'] as const)existing.tokens[k]=safeAdd(existing.tokens[k]??0,tokens[k]);existing.state=existing.value?'observed':'known-zero';}
  else {series.days.push({date,value,tokens,state:value?'observed':'known-zero',completeness:'partial',quality:cursor?'reported':at(row,'quality') as 'reported'|'derived'|'estimated'|'manual'});series.coverage.push({from:date,to:date,kind:'partial'});}
 }
 return [...sources.values()].map(s=>SourceSeries.parse(s));
}
export async function importLocal(files:{name:string;bytes:Uint8Array}[],year:number,tz:string,mapping:Record<string,string>={}){
 const observations:{codex:NormalizedObservation[];claude:NormalizedObservation[];gemini:NormalizedObservation[]}={codex:[],claude:[],gemini:[]}; const sources:SourceSeries[]=[];const claude=claudeAccumulator();let total=0;
 for(const f of files){
  total+=f.bytes.length;if(total>512*1024*1024)throw Error('Batch limit exceeded');
  if(f.bytes.length>256*1024*1024)throw Error('Expanded file exceeds 256 MiB');
  if(f.name.toLowerCase().endsWith('.csv')){sources.push(...parseCSV(f.bytes,year,mapping,tz));continue;}
  if(!/\.jsonl?(?:\.zst)?$/i.test(f.name))throw Error('Unsupported file');
  const text=utf8.decode(f.bytes);
  if(text.includes('"token_count"')&&text.includes('"event_msg"')){observations.codex.push(...await codexParser.parse(f.bytes));continue;}
  const rows=jsonRows(text);
  if(rows[0]?.schema==='vibeskyline.activity.v1'){if(files.length!==1)throw Error('Import one bundle at a time');const bundle=ActivityBundle.parse(rows[0]);if(!bundle.sources.length||(bundle.sources.some(s=>s.sample)&&bundle.sources.some(s=>!s.sample)))throw Error('Choose a nonempty, unmixed bundle');return bundle;}
  if(rows.some(r=>r.message?.usage)){await claude.add(f.bytes);}
  else if(rows.some(r=>r.messages||r.sessionId||r.type==='gemini')){observations.gemini.push(...await parseGemini(f.bytes));}
  else observations.codex.push(...await codexParser.parse(f.bytes));
 }
 observations.claude=claude.finish();
 for(const kind of ['codex','claude','gemini'] as const)if(observations[kind].length){const series=kind==='codex'?aggregateCodex(observations.codex,year,tz):aggregateAgent(observations[kind],kind,year,tz);if(series.days.length)sources.push(series);}
 if(!sources.length)throw Error('No supported events in selected year');
 return ActivityBundle.parse({schema:'vibeskyline.activity.v1',year,generatedAt:new Date().toISOString(),sources,provenance:sources.map(s=>({id:s.provenanceIds[0],adapter:s.id,version:'m2',method:s.scopeId==='import'?'manual':'local',status:s.scopeId==='import'?'manual':'fixture-tested'})),reconciliation:[]});
}
