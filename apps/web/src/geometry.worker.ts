import {generateGeometry,generateCalibrationCoupon,initGeometry,validateMesh,findNameLayoutAlternatives} from '@vibeskyline/geometry';
import type {EngravingOptions} from '@vibeskyline/geometry';
import fontURL from '../../../packages/geometry/assets/VibeSkylineGrid-Regular.ttf?url';
import wasmURL from '../../../packages/geometry/node_modules/manifold-3d/manifold.wasm?url';
let fontBytes:Promise<ArrayBuffer>|undefined;
function font(){return fontBytes??=fetch(fontURL).then(r=>{if(!r.ok)throw Error('Font load failed');return r.arrayBuffer();});}
onmessage=async({data})=>{
 let bytes:ArrayBuffer|undefined;
 const options:EngravingOptions={localFontBytes:data.fontBytes};
 try{
  await initGeometry(wasmURL);
  bytes=await font();
  if (!data.coupon) {
   const {compileSourceLogo}=await import('@vibeskyline/logos');
   const source=data.plan.districts[0].id;
   const tile=await compileSourceLogo(source,data.plan.recipe.logoMode,{
    localSVG:data.logoSVG,
    officialEnabled:data.officialLogosEnabled !== false && import.meta.env.VITE_OFFICIAL_LOGOS !== 'off',
    disabledSources:(import.meta.env.VITE_DISABLED_OFFICIAL_LOGO_SOURCES ?? '').split(',').map((id:string)=>id.trim()),
   });
   if(tile) options.logoTiles={[source]:tile};
  }
  const geometry=data.coupon?await generateCalibrationCoupon(bytes,options):await generateGeometry(data.plan,bytes,options);
  const validation=validateMesh(geometry.mono,geometry.plan);
  if(!validation.valid)throw Error('Geometry failed: '+validation.errors.join(', '));
  postMessage({id:data.id,key:data.key,coupon:data.coupon,geometry,validation});
 }catch(e){
  const error=e instanceof Error?e.message:'Geometry failed';
  const alternatives=!data.coupon&&data.plan.recipe.layout!=="first-edition"&&bytes&&/Name size|Name layout/.test(error)?findNameLayoutAlternatives(data.plan,bytes,options):[];
  postMessage({id:data.id,key:data.key,coupon:data.coupon,error,alternatives});
 }
};
