import { it, expect } from "vitest";
import { startLiveServer } from "../live-server";
it("owns an ephemeral actual Vite dev proxy and closes its listener", async () => {
  const { server, origin } = await startLiveServer();
  try {
    expect((await fetch(origin)).status).toBe(200);
    const r = await fetch(origin + "/api/calendar/evil/handle?year=2026");
    expect(r.status).toBe(400);
  } finally {
    await server.close();
  }
  await expect(fetch(origin)).rejects.toThrow();
}, 30000);
it('actual dev middleware preserves synthetic upstream 429 and network failure status',async()=>{
 const {createServer}=await import('vite'),{calendars}=await import('../vite.config');
 for(const [fetcher,status] of [[async()=>new Response('CANARY_RESPONSE',{status:429}),429],[async()=>{throw Error('CANARY_HANDLE')},502]] as const){
 const server=await createServer({configFile:false,root:new URL('..',import.meta.url).pathname,logLevel:'silent',plugins:[calendars(fetcher as typeof fetch)],server:{host:'127.0.0.1',port:0,strictPort:true}});
 try{await server.listen();const a=server.httpServer!.address() as {port:number};const r=await fetch(`http://127.0.0.1:${a.port}/api/calendar/github/synthetic?year=2026`);expect(r.status).toBe(status);expect(await r.text()).not.toContain('CANARY');}finally{await server.close();}
 }
});

it('dev does not serve the retired protocol distribution', async () => {
  const { server, origin } = await startLiveServer();
  try {
    for (const name of ['spec.md', 'activity.schema.json', 'synthetic.bundle.json', 'offline-pack.zip']) {
      const r = await fetch(`${origin}/protocol/v2/${name}`);
      const body = await r.text();
      expect(r.status === 404 || (r.headers.get('content-type')?.includes('text/html') && body.includes('<div id="root">'))).toBeTruthy();
      expect(body).not.toMatch(/daily activity protocol|vibeskyline\.activity\.v2|\$schema/);
    }
  } finally { await server.close(); }
}, 30000);
