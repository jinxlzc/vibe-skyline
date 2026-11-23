import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import * as zlib from "node:zlib";
import { Decompress } from "fzstd";
import { codexParser, aggregateCodex } from "@vibeskyline/adapters-core";
import type { NormalizedObservation } from "@vibeskyline/contracts";
export function decodeZstd(bytes: Uint8Array): Uint8Array {
  const native = (
    zlib as typeof zlib & {
      zstdDecompressSync?: (
        b: Uint8Array,
        o?: { maxOutputLength: number },
      ) => Uint8Array;
    }
  ).zstdDecompressSync;
  if (native) return native(bytes, { maxOutputLength: 256 * 1024 * 1024 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  const decoder = new Decompress((chunk) => {
    size += chunk.length;
    if (size > 256 * 1024 * 1024) throw Error("Expanded file exceeds 256 MiB");
    chunks.push(chunk);
  });
  decoder.push(bytes, true);
  const result = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    result.set(chunk, at);
    at += chunk.length;
  }
  return result;
}
export async function collectCodex(root: string, year: number, tz: string) {
  const observations: NormalizedObservation[] = [];
  let count = 0,
    total = 0;
  async function walk(dir: string) {
    let items;
    try {
      items = await readdir(dir, { withFileTypes: true });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return;
      throw Error("Cannot read Codex fixture/input directory");
    }
    for (const item of items) {
      if (item.isSymbolicLink()) continue;
      const path = join(dir, item.name);
      if (item.isDirectory()) await walk(path);
      else if (/\.jsonl(?:\.zst)?$/.test(item.name)) {
        if (++count > 5000) throw Error("Too many files");
        if ((await stat(path)).size > 50 * 1024 * 1024)
          throw Error("Input exceeds 50 MiB");
        const bytes = await readFile(path);
        if (bytes.length > 50 * 1024 * 1024)
          throw Error("Input exceeds 50 MiB");
        const raw = item.name.endsWith(".zst") ? decodeZstd(bytes) : bytes;
        total += raw.length;
        if (total > 512 * 1024 * 1024) throw Error("Batch exceeds 512 MiB");
        observations.push(...(await codexParser.parse(raw)));
      }
    }
  }
  await walk(join(root, "sessions"));
  await walk(join(root, "archived_sessions"));
  return aggregateCodex(observations, year, tz);
}

/** Only invoked for an explicitly selected Claude directory; no implicit scan. */
export async function collectClaude(root:string,year:number,tz:string){
 const {claudeAccumulator,aggregateAgent}=await import('@vibeskyline/adapters-core');
 const accumulator=claudeAccumulator();let count=0,total=0;
 async function walk(dir:string){
  let entries;try{entries=await readdir(dir,{withFileTypes:true});}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return;throw Error('Cannot read selected Claude directory');}
  for(const e of entries){if(e.isSymbolicLink())continue;const path=join(dir,e.name);if(e.isDirectory())await walk(path);else if(e.isFile()&&e.name.endsWith('.jsonl')){
   if(++count>5000||(await stat(path)).size>50*1024*1024)throw Error('Input limit exceeded');
   const bytes=await readFile(path);if(bytes.length>50*1024*1024)throw Error('Input limit exceeded');total+=bytes.length;if(total>256*1024*1024)throw Error('Batch limit exceeded');await accumulator.add(bytes);
  }}
 }
 await walk(join(root,'projects'));
 return aggregateAgent(accumulator.finish(), 'claude',year,tz);
}
