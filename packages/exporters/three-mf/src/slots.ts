import type { Geometry } from '@vibeskyline/geometry';
/** Historical API name retained for callers; this describes groups, never printer slots. */
export function slotIntent(geometry: Geometry) {
  return {schema:'vibeskyline.material-groups.v2', audience:geometry.coupon?'private calibration':'user export',
    qualification:'Core 3MF material groups; filament mapping belongs to the slicer',
    assignments:geometry.budget.materials.map((m,i)=>({objectId:i+2,objectName:`Material ${i+1} ${m.color}`,group:i+1,roles:m.roleKeys??[],color:m.color,volumeCm3:m.volumeCm3,grams:m.grams})),
    purge:'unknown until sliced',printTime:'unknown until sliced',profilesModified:false};
}
export const mappingInstructions = `Core 3MF / 标准多零件多材料 3MF
Geometry is measured in millimeters. Import as one assembly with multiple named material parts. Choose your own printer, process, and filament mapping in your slicer. No printer or process profile is included. Some slicers may flatten colors or parts; compatibility is not universally verified. Inspect dimensions, disconnected parts, thin features, overhangs and every layer before printing. Purge and time are unknown until sliced. Not sliced or physically printed.
几何单位为毫米。请在切片软件中选择自己的打印机、工艺和耗材映射。未附带打印机配置；部分软件可能合并颜色或零件，尚未验证所有软件的兼容性。请检查尺寸、薄壁、悬垂、分离零件及每层路径。清料与时间未知；尚未切片或实物打印。`;
