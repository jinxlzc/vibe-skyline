import type { BuildPlan } from '@vibeskyline/contracts';
import { layoutText, type EngravingOptions } from './engraving';
import type { Vec2 } from 'manifold-3d';
export const FIRST = {height:14,side:14*Math.tan(Math.PI/12),front:14/Math.tan(Math.PI/3),seat:12.5,relief:.8};
export function firstEditionLockup(plan:BuildPlan,bytes:ArrayBuffer,options:EngravingOptions) {
 if(!plan.recipe.name.trim()) throw Error('Name layout: enter a printable ID for the front lockup.');
 if(plan.sourceCount!==1||plan.districts.length!==1) throw Error('First edition requires one source');
 const side=FIRST.side, face=FIRST.height/Math.sin(Math.PI/3), center=face*.48;
 const id=plan.districts[0].id;
 const tile=plan.recipe.logoMode==='brand'&&options.logoTiles&&Object.hasOwn(options.logoTiles,id)?options.logoTiles[id]:undefined;
 if(tile && (tile.height>12.501||tile.width>12.501||tile.paths.some(p=>p.some(([x,y])=>!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>tile.width+.001||y>tile.height+.001)))) throw Error('SVG exceeds the 12.5 mm logo seat');
 const logo={x:side*.48+3.6,y:center-FIRST.seat/2,width:FIRST.seat,height:FIRST.seat,present:!!tile};
 const yearText=layoutText(String(plan.recipe.year),bytes,options,5,plan.width);
 const nameText=layoutText(plan.recipe.name,bytes,options,plan.recipe.nameSize==='large'?7:5,plan.width);
 const year={x:plan.width-side*.48-6-yearText.width,y:center-yearText.height/2,width:yearText.width,height:yearText.height};
 const name={x:logo.x+logo.width+2.4,y:center-nameText.height/2,width:nameText.width,height:nameText.height};
 if(nameText.report.lines.length>1 || name.x+name.width+4>year.x || name.height>12.5 || year.height>12.5) throw Error('Name layout: shorten the ID or choose a smaller font to fit the front lockup.');
 const paths=(p:Vec2[][],x:number,y:number)=>p.map(r=>r.map(([a,b]):Vec2=>[a+x,b+y]));
 // An outlined reserved plate, never a substitute brand mark.
 const ring:Vec2[][]=[[[0,0],[12.5,0],[12.5,12.5],[0,12.5]],[[.8,.8],[.8,11.7],[11.7,11.7],[11.7,.8]]];
 return {logo,name,year,face,
  nameText,yearText,
  namePaths:paths(nameText.paths,name.x,name.y),yearPaths:paths(yearText.paths,year.x,year.y),
  logoPaths:paths(plan.recipe.logoMode==='none'?[]:tile?.paths??ring,logo.x+(12.5-(tile?.width??12.5))/2,logo.y+(12.5-(tile?.height??12.5))/2),tile};
}
