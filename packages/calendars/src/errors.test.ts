import {it,expect} from 'vitest';
import {calendarHandler,calendarErrorResponse} from './index';
it('restricted proxy preserves rate limit/network categories without leaking handles or bodies',async()=>{
 for(const [fetcher,status] of [[async()=>new Response('PRIVATE_BODY',{status:429}),429],[async()=>{throw Error('PRIVATE_HANDLE')},502]] as const){try{await calendarHandler(fetcher as typeof fetch)('/api/calendar/github/synthetic?year=2026');throw Error('expected failure');}catch(e){const r=calendarErrorResponse(e);expect(r.status).toBe(status);expect(JSON.stringify(r)).not.toContain('PRIVATE');}}
 try{await calendarHandler()('/api/calendar/evil/anything?year=2026');}catch(e){expect(calendarErrorResponse(e).status).toBe(400);}
});
