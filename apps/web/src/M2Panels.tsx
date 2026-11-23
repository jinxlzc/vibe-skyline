import type {Geometry} from '@vibeskyline/geometry';
import fusionPixelNotice from '../../../packages/geometry/assets/grid-licenses/OFL.txt?url&no-inline';
import arkPixelNotice from '../../../packages/geometry/assets/grid-licenses/LICENSES/ark-pixel/OFL.txt?url&no-inline';
import cubic11Notice from '../../../packages/geometry/assets/grid-licenses/LICENSES/cubic-11/OFL.txt?url&no-inline';
import galmuriNotice from '../../../packages/geometry/assets/grid-licenses/LICENSES/galmuri/LICENSE.txt?url&no-inline';

const fontNotices = [
  { name: 'Fusion Pixel', url: fusionPixelNotice },
  { name: 'Ark Pixel', url: arkPixelNotice },
  { name: 'Cubic 11', url: cubic11Notice },
  { name: 'Galmuri', url: galmuriNotice },
];

export function IdentityPanel({geometry,zh,onFont}:{geometry?:Geometry;zh:boolean;onFont:(f:File)=>void}){
 const name=geometry?.identity?.name,year=geometry?.identity?.year;
 return <section className="m2-panel" data-testid="glyph-validation"><h3>{zh?'文字与打印特征':'Engraving & features'}</h3>
 <p>{zh?'目标：笔画 ≥ 0.80 mm，间隙 ≥ 0.60 mm。轮廓只放大或换行，不填补字腔。':'Targets: stroke ≥ 0.80 mm; gap ≥ 0.60 mm. Outlines enlarge or reflow; counters stay open.'}</p>
 {[[zh?'名称':'Name',name],[zh?'年份':'Year',year]].map(([label,v])=>{const m=v as typeof name;return m&&<p key={String(label)}><strong>{String(label)} · {m.sizeMm.toFixed(1)} mm</strong><br/>{zh?'笔画 / 间隙':'Stroke / gap'}: {m.minStrokeMm?.toFixed(3)??'—'} / {m.minGapMm?.toFixed(3)??'—'} mm</p>;})}
 <p className="fine">{zh?'八方向对壁卡尺测量；尖端与未采样曲壁未验证。几何经过检查，尚未实物打印。':'Eight-direction opposing-wall measurements; tips and unsampled curved walls unverified. Geometry checked, not physically printed.'}</p>
 <details data-testid="font-license">
   <summary>{zh?'字体与许可':'Font & license'}</summary>
   <p>{zh?'VibeSkyline Grid：Fusion Pixel 12px 简体中文比例版的重命名子集，SIL OFL 1.1。像素风格；中西文使用同一条轮廓处理路径。':'VibeSkyline Grid: renamed subset of Fusion Pixel 12px proportional Simplified Chinese, SIL OFL 1.1. Pixel styling; one outline pipeline for CJK and Latin.'}</p>
   <p>{zh?'覆盖 GB2312 一级全部 3,755 字，含拉丁字母、数字和常用标点。覆盖不等于所有尺寸均能容纳。':'All 3,755 GB2312 L1 characters, plus Latin, digits and common punctuation. Coverage does not guarantee a fit at every size.'}</p>
   <ul>
     {fontNotices.map(({ name, url }) => (
       <li key={name}><a href={url} target="_blank" rel="noreferrer">{name}{zh ? ' 许可声明' : ' license notice'}</a></li>
     ))}
   </ul>
   <p><a href="https://github.com/TakWolf/fusion-pixel-font/releases/tag/2026.11.10" target="_blank" rel="noreferrer">{zh?'官方来源 · 2026.11.10':'Official source · 2026.11.10'}</a> · <a href="https://openfontlicense.org/ofl-faq/#1-1" target="_blank" rel="noreferrer">{zh?'OFL：可销售打印作品':'OFL: printed objects may be sold'}</a></p>
   <p className="fine">{zh?'S/M/L 是实际测量后的尺寸预设；不会为某个姓名手绘或替换字形。尚未实物打印。':'S/M/L are measured size presets. No hand-drawn or substituted glyphs for individual names. Not physically printed.'}</p>
 </details>
 <label className="local-file">{zh?'补充本地字体（不上传）':'Supply local font (never uploaded)'}<input aria-label="Local font" hidden type="file" accept=".ttf,.otf" onChange={e=>{const f=e.target.files?.[0];if(f)onFont(f);}}/></label></section>;
}
export function LogoPanel({zh,ack,setAck,onLogo,loaded,measurements}:{zh:boolean;ack:boolean;setAck:(v:boolean)=>void;onLogo:(f:File)=>void;loaded:boolean;measurements?:Geometry["logoMeasurements"]}){
 return <section className="m2-panel"><h3>{zh?'可替换标记':'Replaceable assets'}</h3><p>{zh?'GitHub 官方 Invertocat 默认开启。VibeSkyline 与 GitHub 无隶属、背书或赞助关系。所有者已接受商标政策风险；不声称获得再分发或打印衍生授权。Gitee 也内置官方白色标志；VibeSkyline 与其所有者深圳市奥思网络科技有限公司无隶属、背书或赞助关系。自带 SVG 仅覆盖当前来源。':'GitHub’s official Invertocat is on by default. VibeSkyline is not affiliated with, endorsed by, or sponsored by GitHub. The owner accepted brand-policy risk; no redistribution or printable-derivative grant is claimed. Gitee also bundles its official white mark; VibeSkyline is independent of its owner, Shenzhen AOSI Network Technology Co., Ltd., without affiliation, endorsement or sponsorship. Your SVG overrides this source only.'}</p>
 <label><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/>{zh?'我确认有权使用所选标记。文件只在本地处理。':'I acknowledge responsibility for my right to use this mark. Processing stays local.'}</label>
 <label className="local-file">{zh?'自带 SVG':'Bring your own SVG'}<input aria-label="Local SVG logo" hidden type="file" accept=".svg" disabled={!ack} onChange={e=>{const f=e.target.files?.[0];if(f)onLogo(f);}}/></label>{loaded&&<p>{zh?'已为当前来源选择本地 SVG，适配 12.5 mm 标志位；细节可能需要修改。切片前请检查预览与笔画/间隙测量。':'Local SVG selected for this source. Fitted within 12.5 mm; thin features may need revision. Inspect the preview and measured stroke / gap before slicing.'}</p>}
 {measurements?.map((m,i)=><p key={i}>{zh?"标记笔画 / 间隙":"Logo stroke / gap"}: {m.minStrokeMm?.toFixed(3)??"—"} / {m.minGapMm?.toFixed(3)??"—"} mm · {zh?"未获打印认证":"Not print-qualified"}{m.discardedSubmicronIslands?` · ${m.discardedSubmicronIslands} ${zh?"个小于 0.001 mm 的外部碎片已移除":"exterior fragments below 0.001 mm removed"}`:""}</p>)}
 </section>;
}
export function Privacy({zh,onClose}:{zh:boolean;onClose:()=>void}){return <article className="privacy-page"><button onClick={onClose}>{zh?'返回工作室':'Back to studio'}</button><h1>{zh?'你的记录，留在本机。':'Your records stay on your machine.'}</h1><p>{zh?'选中的字体和 SVG 在浏览器内处理，从不上传。网站不读取本机活动记录。':'Selected fonts and SVGs are processed in your browser, never uploaded. The website does not read local activity records.'}</p><p>{zh?'只有你主动查询公开日历时，用户名和年份会发往配置的日历中继，再发送到 GitHub、Gitee 或 GitLab。没有遥测、账号或云存储。':'Only an explicit public calendar request sends a handle and year to the configured calendar relay and GitHub, Gitee or GitLab. No telemetry, accounts or cloud storage.'}</p><p>{zh?'中继只缓存公开日历，最长一小时；响应禁止共享 HTTP 缓存。中继运营方与来源会看到用户名、年份和网络地址。跨境访问可能延迟或失败。':'The relay caches public calendars for up to one hour; HTTP responses prohibit shared caching. Relay operators and sources see the username, year and network address. Cross-border requests may be slow or fail.'}</p><p>{zh?'名称只默认采用主动提供的公开来源用户名；仅对应当前选中的来源。没有公开用户名时使用 skyline-demo，并提示手动输入。不会从邮箱、路径或会话推断身份。':'The name defaults only to an explicitly supplied public username: for the selected source. Without one, skyline-demo prompts an edit. Emails, paths and sessions never supply identity.'}</p><p>{zh?'导出包含几何、颜色、材料体积、材料分组及测量结果。默认不附带原始日志、路径、用户名元数据或活动明细。雕刻的名字仍可从模型上看到。分享前请自行检查。':'Exports contain geometry, colors, material volumes, material groups and measurements. Raw logs, paths, identity metadata and activity records are excluded by default. Engraved names remain visible in the mesh: inspect before sharing.'}</p><p>{zh?'关闭页面会清除本次字体和 SVG。依赖安装会访问软件包仓库；应用静态资产由本地服务器提供。':'Closing the page clears this session’s fonts and SVG. Dependency installation contacts package registries; app assets are served locally.'}</p></article>;}
