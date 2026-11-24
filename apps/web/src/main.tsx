import { demoBundle } from "./demo";
import React, {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { ActivityBundle, SourceSeries, PublicIdentityValue } from "@vibeskyline/contracts";
import { buildPlan, modelFilename, contrastRatio, selectDefaultIdentity } from "@vibeskyline/core";
import { themes } from "@vibeskyline/registry";
import type { Geometry } from "@vibeskyline/geometry";
import { useStudio } from "./store";
import {IdentityPanel,LogoPanel,Privacy} from "./M2Panels";
import "./style.css";
import brandLockup from "../../../docs/brand/m8/concept-a/lockup.svg";
import { Button } from "./components/ui/button";
import { ChevronDown } from "./components/ChevronDown";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
import { Qualification } from "./OnlinePanels";
import { relayBase, bundleKind, calendarSources } from "./online";
const Scene = lazy(() => import("./Scene"));
type CalendarError = "invalid-handle" | "invalid-year" | "rate-limited" | "invalid-source" | "unavailable";
function App() {
  const s = useStudio(),
    { bundle, recipe, studio, locale, tab, theme } = s,
    zh = locale === "zh-CN",
    t = (en: string, cn: string) => (zh ? cn : en);
  const [fontBytes,setFontBytes]=useState<ArrayBuffer>(),[fontVersion,setFontVersion]=useState(0),[logos,setLogos]=useState<Record<string,string>>({}),[logoAck,setLogoAck]=useState(false),[privacy,setPrivacy]=useState(false);
  const activeSource=bundle.sources.find(x=>x.id===s.activeSourceId)??bundle.sources[0];
  const logoSVG=Object.hasOwn(logos,activeSource.id)?logos[activeSource.id]:"";
  const setLogoSVG=(value:string)=>setLogos(old=>({...old,[activeSource.id]:value}));
  const inputPlan = useMemo(() => buildPlan({...bundle,sources:[activeSource]}, {...recipe,colors:[recipe.colors[bundle.sources.indexOf(activeSource)%recipe.colors.length]]}), [bundle, recipe, activeSource]);
  const officialLogosEnabled = s.officialLogosEnabled && import.meta.env.VITE_OFFICIAL_LOGOS !== "off";
  const sourceOfficialDisabled = (import.meta.env.VITE_DISABLED_OFFICIAL_LOGO_SOURCES ?? "").split(",").map((id:string)=>id.trim()).includes(activeSource.id);
  const planKey = useMemo(() => JSON.stringify({inputPlan,fontVersion,logoSVG,officialLogosEnabled}), [inputPlan,fontVersion,logoSVG,officialLogosEnabled]);
  const [geometryKey, setGeometryKey] = useState("");
  const [failedGeometryKey,setFailedGeometryKey]=useState("");
  const [nameAlternatives,setNameAlternatives]=useState<Array<{nameSize:"small"|"medium"|"large";namePlacement:"front"|"rear";width:number;depth:number}>>([]);
  const requestedGeometryKey=useRef("");
  const [geometry, setGeometry] = useState<Geometry>(),
    [building, setBusy] = useState(true),
    [error, setError] = useState(""),
    [fetching, setFetching] = useState(false);
  const plan = geometryKey===planKey && geometry?.plan ? geometry.plan : inputPlan;
  const busy = building || geometryKey !== planKey;
  // The form may prepare an unfetched provider while the existing model stays visible.
  // Every model activation synchronizes this draft, including reselecting the same model.
  const [handle, setHandle] = useState(""),
    [provider, setProvider] = useState(activeSource.id);
  const [calendarError, setCalendarError] = useState<CalendarError>();
  const [yearDraft, setYearDraft] = useState(String(recipe.year));
  const validYear = /^\d{4}$/.test(yearDraft) && Number(yearDraft) >= 1970 && Number(yearDraft) <= new Date().getUTCFullYear()+1;
  const calendarRequest = useRef<{ generation: number; controller?: AbortController }>({ generation: 0 });
  useEffect(() => { setProvider(activeSource.id); }, [activeSource.id]);
  useEffect(() => { setYearDraft(String(recipe.year)); }, [recipe.year, activeSource.id]);
  useEffect(() => () => {
    calendarRequest.current.generation++;
    calendarRequest.current.controller?.abort();
  }, []);
  function cancelCalendar() {
    calendarRequest.current.generation++;
    calendarRequest.current.controller?.abort();
    setFetching(false);
  }
  function chooseSource(id: string) {
    cancelCalendar();
    setProvider(id);
    s.selectSource(id);
  }
  function chooseProvider(id: string) {
    cancelCalendar();
    setProvider(id);
    if (bundle.sources.some(source => source.id === id)) s.selectSource(id);
  }
  const worker = useRef<Worker | null>(null),
    seq = useRef(0);
  useEffect(() => {
    worker.current = new Worker(
      new URL("./geometry.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.current.onmessage = ({ data }) => {
      if(data.coupon){if(data.error)setError(data.error);else void saveCoupon(data.geometry);return;}
      if (data.id !== seq.current) return;
      setBusy(false);
      if (data.error) {setNameAlternatives(data.alternatives??[]);setFailedGeometryKey(data.key);setGeometry(undefined);setGeometryKey("");setError(data.error);}
      else {
        setGeometryKey(data.key);
        setGeometry(data.geometry);
        setError("");
      }
    };
    worker.current.onerror=()=>{setFailedGeometryKey(requestedGeometryKey.current);setGeometry(undefined);setGeometryKey("");setBusy(false);setError("Worker crashed. Reload the page and try a smaller input.");};
    return () => {
      worker.current?.terminate();
    };
  }, []);
  useEffect(() => {
    setBusy(true);
    setFailedGeometryKey("");
    setNameAlternatives([]);
    requestedGeometryKey.current=planKey;
    setError("");
    const id = ++seq.current;
    const timeout = setTimeout(
      () => worker.current?.postMessage({ id, plan:inputPlan, key: planKey, fontBytes, logoSVG, officialLogosEnabled }),
      150,
    );
    return () => clearTimeout(timeout);
  }, [inputPlan, planKey,studio,fontBytes,logoSVG,officialLogosEnabled]);
  const kind = bundleKind({...bundle,sources:[activeSource]});
  const sample = kind === "synthetic",
    count = geometryKey===planKey&&geometry ? geometry.budget.count : plan.materialColors.length;
  async function calendar() {
    calendarRequest.current.controller?.abort();
    const controller = new AbortController();
    const generation = ++calendarRequest.current.generation;
    calendarRequest.current.controller = controller;
    const isLatest = () => generation === calendarRequest.current.generation;
    const timeout = setTimeout(() => controller.abort(), 18000);
    setFetching(true);
    setCalendarError(undefined);
    let failure: CalendarError = "unavailable";
    try {
      if(!PublicIdentityValue.safeParse(handle).success) { failure = "invalid-handle"; throw Error(); }
      if(!validYear) { failure = "invalid-year"; throw Error(); }
      const r = await fetch(
        `${relayBase(import.meta.env.VITE_CALENDAR_RELAY_URL)}/api/calendar/${provider}/${encodeURIComponent(handle)}?year=${yearDraft}`,
        { credentials: "omit", referrerPolicy: "no-referrer", signal: controller.signal },
      );
      if (!r.ok) { failure = r.status===429 ? "rate-limited" : r.status===400 ? "invalid-handle" : "unavailable"; throw Error(); }
      failure = "invalid-source";
      const response = SourceSeries.parse(await r.json());
      if (response.id !== provider || !["contributions", "activity_level", "events"].includes(response.metric)) throw Error("Invalid calendar source");
      if (!isLatest()) return;
      // Merge into current state: removals and other edits during the request survive.
      const currentBundle = useStudio.getState().bundle;
      const source = SourceSeries.parse({...response,client:calendarSources.find(s=>s.id===provider)!.name,publicIdentity:{provider,kind:"username",value:handle,provenance:"explicit-public-handle"}}),
        sources = currentBundle.sources.filter((x) => !x.sample && x.id !== source.id);
      if (sources.length >= 3) throw Error();
      sources.push(source);
      const provenance = currentBundle.provenance.filter(
        (p) => p.method !== "synthetic" && p.id !== provider + "-public",
      );
      provenance.push({
        id: provider + "-public",
        adapter: provider,
        version: "m1",
        method: "public-http",
        status: calendarSources.find(r=>r.id===provider)!.status,
      });
      s.set({
        studio: true,
        inputMode: "calendar",
        activeSourceId: source.id,
        bundle: ActivityBundle.parse({
          ...currentBundle,
          year: Number(yearDraft),
          sources,
          provenance,
        }),
      });
    } catch {
      if (isLatest()) setCalendarError(controller.signal.aborted ? "unavailable" : failure);
    } finally {
      clearTimeout(timeout);
      if (isLatest()) {
        calendarRequest.current.controller = undefined;
        setFetching(false);
      }
    }
  }
  function saveBytes(bytes:Uint8Array,name:string){const a=document.createElement("a"),url=URL.createObjectURL(new Blob([bytes as BlobPart],{type:"application/octet-stream"}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function saveCoupon(g:Geometry){const {exportSTL}=await import("@vibeskyline/stl"),{export3MF,slotIntent}=await import("@vibeskyline/three-mf");saveBytes(exportSTL(g.mono),"private-calibration-coupon.stl");saveBytes(export3MF(g),"private-calibration-coupon.3mf");saveBytes(new TextEncoder().encode(JSON.stringify(slotIntent(g),null,2)),"private-calibration-coupon-slots.json");}
  async function download(kind: "stl" | "3mf" | "slots") {
    try {
      if (!geometry || busy || error) return;
      const {exportSTL}=await import("@vibeskyline/stl"),{export3MF,slotIntent}=await import("@vibeskyline/three-mf");
      const bytes = kind === "slots" ? new TextEncoder().encode(JSON.stringify(slotIntent(geometry),null,2)) :
        kind === "stl"
          ? exportSTL(geometry.mono)
          : export3MF(geometry);
      const a = document.createElement("a"),
        url = URL.createObjectURL(
          new Blob([bytes as BlobPart], { type: "application/octet-stream" }),
        );
      a.href = url;
      a.download = kind === "slots" ? `vibeskyline-${activeSource.id}-${recipe.year}.json` : modelFilename(plan,kind);
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const inputBlock = (
    <div className="calendar-entry">
      <form className="public-calendar-form" onSubmit={e => { e.preventDefault(); void calendar(); }}>
      <p className="calendar-label">{t("1. Choose source · 2. Enter public username", "1. 选择来源 · 2. 输入公开用户名")}</p>
      <div className="calendar-input">
        <div className="calendar-provider">
        <select
          aria-label="Provider"
          value={provider}
          onChange={(e) => chooseProvider(e.target.value)}
        >
          <option value="github">GitHub</option>
          <option value="gitee">Gitee</option>
          <option value="gitlab">GitLab · Beta</option>
        </select>
        <ChevronDown />
        </div>
        <input
          aria-label="Public handle"
          placeholder={t("Public handle", "公开用户名")}
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
        />
      </div>
      <label className="calendar-year"><span>{t("Calendar year", "日历年份")}</span><input aria-label="Calendar year" type="number" required min="1970" max={new Date().getUTCFullYear()+1} value={yearDraft} onChange={e => { const draft = e.target.value; cancelCalendar(); setYearDraft(draft); const y = Number(draft); if (/^\d{4}$/.test(draft) && y >= 1970 && y <= new Date().getUTCFullYear()+1) s.patch({year:y}); }}/></label>
      <Button className="primary wide" type="submit" aria-label="Fetch calendar" aria-busy={fetching} disabled={!handle.trim() || !validYear}>
        {fetching ? t("Fetching public calendar…", "正在获取公开日历…") : t("Fetch calendar → Generate skyline", "获取日历 → 生成天际线")}
      </Button>
      <p className="calendar-qualification" data-testid="selected-qualification">{provider === 'gitlab' ? t("Beta · fixture-tested only · past 12 months", "Beta · 仅样例测试 · 过去 12 个月") : t("Verified public calendar · history may be incomplete", "公开日历已验证 · 历史可能不完整")}</p>
      </form>
      <Qualification zh={zh}/>

    </div>
  );
  const modelSwitcher = <div className="model-switcher" role="group" aria-label={t("Independent models","独立模型")}>
    <span>{t("One source · one model", "一个来源 · 一个模型")}</span>
    {bundle.sources.map(source=><Button variant={source.id===activeSource.id?"default":"outline"} key={source.id} aria-pressed={source.id===activeSource.id} onClick={()=>chooseSource(source.id)}>{source.client}</Button>)}
  </div>;
  const viewer = (
    <div className={`viewer ${theme === "obsidian" ? "dark" : ""}`}>
      <div className="viewer-top">
        <span className="pill">
          {sample
            ? "合成示例 / SYNTHETIC DEMO"
            : kind === "public" && s.inputMode === "calendar" ? t("Fetched public calendar · no sign-in", "已获取公开日历 · 未登录账号") : t("Calendar preview", "日历预览")}
        </span>
        <span className="edition">{activeSource.client} ·
          {recipe.year} {t("EDITION", "年度版")}
        </span>
      </div>
      {<Suspense
        fallback={
          <div className="loading">
            {t("Building your specimen…", "正在构建作品…")}
          </div>
        }
      >
        <Scene geometry={busy?undefined:geometry} plan={plan} />
      </Suspense>}
      <div className="viewer-bottom">
        <span>
          {studio && busy
            ? t("Building exact geometry…", "正在构建精确几何…")
            : t("↔ Drag to orbit · scroll to zoom", "↔ 拖动旋转 · 滚动缩放")}
        </span>
        <span data-testid="logo-state">{busy?t("Building…","构建中…"):geometry?.logoMeasurements?.length ? (logoSVG?t("Local SVG · not print-qualified","本地 SVG · 未获打印认证"):t(`Official ${activeSource.id==='github'?'Invertocat':'Gitee logo'} · not print-qualified`,"官方标志 · 未获打印认证")) : recipe.logoMode==='none'?t("No logo artwork","无标志图形"):t("Reserved empty plate","预留空白标牌")}</span>
      </div>
    </div>
  );
  return (
    <div className="app" data-theme={theme}>
      <header>
        <Button className="wordmark" aria-label="VibeSkyline" onClick={() => { cancelCalendar(); s.loadDemo(); setProvider(useStudio.getState().activeSourceId); s.set({ studio: false }); }}>
          <img className="brand-lockup" src={brandLockup} width="348" height="80" alt="" />
          <span className="alpha">{t("ACTIVITY → OBJECT", "活动 → 实物")}</span>
        </Button>
        <nav><Button className="quiet" onClick={()=>setPrivacy(true)}>{t("Privacy","隐私")}</Button>
          <span>
            {t("A small monument to making.", "为创造，筑一座小小的纪念碑。")}
          </span>
          <Button
            className="locale"
            onClick={() => s.set({ locale: zh ? "en" : "zh-CN" })}
          >
            {zh ? "EN" : "中文"}
          </Button>
          <a
            href="https://github.com/jinxlzc/vibe-skyline"
            target="_blank"
            rel="noreferrer"
          >
            GitHub ↗
          </a>
        </nav>
      </header>
      {privacy ? <Privacy zh={zh} onClose={()=>setPrivacy(false)}/> : <main>
        {!studio ? (
          <>
            <section className="hero">
              <div className="hero-copy">
                <div className="eyebrow">
                  <span />{" "}
                  {t("DIGITAL DAYS. PHYSICAL FORM.", "数字时光，实体印记。")}
                </div>
                <h1>
                  {zh ? (
                    <>
                      把这一年，
                      <br />
                      <em>筑成天际线。</em>
                    </>
                  ) : (
                    <>
                      Your year,
                      <br />
                      <em>built.</em>
                    </>
                  )}
                </h1>
                <p>
                  {t(
                    "Type a GitHub, Gitee or GitLab (beta) username. Turn its public calendar into a 3D skyline, customize it, then export STL or multicolor 3MF.",
                    "输入 GitHub、Gitee 或 GitLab（Beta） 用户名，将公开日历变成 3D 天际线，预览配色与刻字，再导出 STL 或多色 3MF。",
                  )}
                </p>
                <div className="landing-input">
                {inputBlock}
                <Button
                  className="secondary wide"
                  onClick={() => { cancelCalendar(); s.loadDemo(); setProvider(useStudio.getState().activeSourceId); s.set({ studio: true }); }}
                >
                  {t("Explore the sample studio", "探索示例工作室")}{" "}
                  <span>→</span>
                </Button>
                <div className="small-note">
                  {t(
                    "No install or sign-in. The username and year go to the calendar relay.",
                    "无需安装或登录。用户名与年份会发送到日历中继。",
                  )}
                </div>
                </div>
              </div>
              <div className="hero-object">
                {modelSwitcher}{viewer}
                <div className="specimen-label">
                  <div>
                    <span className="tiny">
                      {t(
                        "FIRST EDITION / No. 001",
                        "首版形态 / 作品 001",
                      )}
                    </span>
                    <h3>
                      {t("Synthetic demo · not a real account", "合成示例 · 不代表真实账号")}
                    </h3>
                  </div>
                  <span className="specimen-number">{recipe.year}</span>
                </div>
              </div>
            </section>
            <section className="principles">
              <article>
                <span>{t("01 / COLLECT", "01 / 收集")}</span>
                <h3>{t("A year, from your sources.", "从你的数据出发。")}</h3>
                <p>
                  {t(
                    "Choose GitHub, Gitee or GitLab (beta), enter a public username and fetch its calendar. No install required.",
                    "选择 GitHub、Gitee 或 GitLab（Beta），输入公开用户名并获取日历。无需安装。",
                  )}
                </p>
              </article>
              <article>
                <span>{t("02 / COMPOSE", "02 / 创作")}</span>
                <h3>{t("Make it feel like you.", "让它成为你的作品。")}</h3>
                <p>
                  {t(
                    "Independent models, a sloped plinth, and your source username beside a reserved logo seat.",
                    "独立模型、斜面基座，以及预留标志位旁的来源用户名。",
                  )}
                </p>
              </article>
              <article>
                <span>{t("03 / MAKE", "03 / 制作")}</span>
                <h3>
                  {t("From pixels to your desk.", "从像素，到你的桌面。")}
                </h3>
                <p>
                  {t(
                    "Inspect actual material volumes. Export STL or Core 3MF. Slicer and print qualification pending.",
                    "查看真实模型体积，导出 STL 或 Core 3MF。切片和实物打印待验证。",
                  )}
                </p>
              </article>
            </section>
          </>
        ) : (
          <>
            <nav className="workflow" aria-label={t("Workflow","流程")}><Button variant="ghost" onClick={()=>s.set({tab:"Sources"})}>01 {t("Input","输入")}</Button><span>→</span><Button variant="ghost" onClick={()=>s.set({tab:"Colors"})}>02 {t("Customize","定制")}</Button><span>→</span><Button variant="ghost" onClick={()=>s.set({tab:"Print"})}>03 {t("Export","导出")}</Button></nav>
            <div className="studio-heading">
              <div>
                <div className="eyebrow">
                  {t("THE SKYLINE STUDIO", "天际线工作室")}
                </div>
                <h1>{t("A year worth keeping.", "值得珍藏的一年。")}</h1>
              </div>
              <Button
                className="secondary"
                onClick={() => {
                  cancelCalendar();
                  s.loadDemo();
                  setProvider(useStudio.getState().activeSourceId);
                }}
              >
                {t("Load demo data", "载入示例数据")}
              </Button>
            </div>
            <div className="studio-grid">
              <section className="object-panel">
                {modelSwitcher}{viewer}
                <div className="legend">
                  {[activeSource].map((x, i) => (
                    <span key={x.id}>
                      <i style={{ background: plan.recipe.colors[i] }} />
                      {x.client}
                      {x.provider ? " · " + x.provider : ""}
                    </span>
                  ))}
                </div>
                <p className="object-note">
                  {t(
                    "Each source is independently normalized · unknown days are recessed",
                    "各来源独立归一化 · 未知日期以凹槽表示",
                  )}
                  <br />
                  {t(
                    "Replaceable assets · physical print not qualified",
                    "可替换图标 · 实物打印尚未验证",
                  )}
                </p>
              </section>
              <aside>
                <Tabs value={tab} onValueChange={value=>s.set({tab:String(value)})}>
                  <TabsList className="tabs" aria-label={t("Studio controls","工作室控制")}>
                    {["Sources","Shape","Colors","Print"].map((x,i)=><TabsTrigger key={x} value={x}>{zh?["来源","形态","配色","导出"][i]:["Sources","Shape","Colors","Export"][i]}</TabsTrigger>)}
                  </TabsList>
                <TabsContent value={tab} className="tab-content">
                  {tab === "Sources" && (
                    <>
                      <div className="panel-title">
                        <h2>{t("Your building blocks", "你的创作来源")}</h2>
                        <span>{bundle.sources.length} / 3</span>
                      </div>
                      <p className="muted">
                        {t(
                          "One independent model per source. Switch previews and export each separately.",
                          "每个来源一个独立模型，切换预览并分别导出。",
                        )}
                      </p>
                      {bundle.sources.map((source, i) => (
                        <article className="source-card" key={source.id}>
                          <Button variant="ghost" type="button" className="source-activate" aria-label={t("Select ", "选择 ")+source.client} aria-pressed={source.id===activeSource.id} onClick={()=>chooseSource(source.id)}>
                          <div
                            className="source-glyph"
                            style={{
                              color: plan.recipe.colors[i],
                              background: plan.recipe.colors[i] + "16",
                            }}
                          >
                            {source.client[0]}
                          </div>
                          <div>
                            <strong>{source.client}</strong>
                            <div className="source-meta">
                              {
                                source.days.filter((d) => d.value !== null)
                                  .length
                              }{" "}
                              {t("days", "天")} ·{" "}
                              {zh
                                ? {
                                    contributions: "贡献",
                                    activity_level: "活动级别",
                                    events: "事件",
                                  }[source.metric as "contributions" | "activity_level" | "events"]
                                : source.metric}
                            </div>
                            <div className="source-meta">
                              {source.coverage[0]?.from} →{" "}
                              {source.coverage.at(-1)?.to} ·{" "}
                              {source.coverage.some((c) => c.kind === "partial")
                                ? t("partial", "部分")
                                : t("covered", "已覆盖")}
                            </div>
                            <span className="status">
                              {source.sample ? t("Synthetic demo · ", "合成示例 · ") : ""}
                              {(() => {
                                if(source.sample) return t("not account evidence", "非账号证据");
                                if(source.id === "gitlab") return "Beta · fixture-tested";
                                const status = (!source.sample ? bundle.provenance.find(p=>source.provenanceIds.includes(p.id))?.status : undefined) ??
                                  calendarSources.find((r) => r.id === source.id)
                                    ?.status ?? "in-progress";
                                return zh
                                  ? {
                                      verified: "已验证 (verified)",
                                      "fixture-tested": "样例测试通过 (fixture-tested)",
                                      "in-progress": "开发中 (in-progress)",
                                      manual: "手动 (manual)",
                                      unsupported: "不支持 (unsupported)",
                                    }[status]
                                  : status;
                              })()}
                            </span>
                          </div>
                          </Button>
                          {bundle.sources.length > 1 && (
                            <Button
                              className="remove"
                              aria-label={t("Remove ", "移除 ") + source.client}
                              onClick={() => {
                                cancelCalendar();
                                s.set({
                                  bundle: {
                                    ...bundle,
                                    sources: bundle.sources.filter(
                                      (x) => x.id !== source.id,
                                    ),
                                  },
                                });
                                setProvider(useStudio.getState().activeSourceId);
                              }}
                            >
                              ×
                            </Button>
                          )}
                        </article>
                      ))}
                      <div className="add-source">{inputBlock}</div>

                    </>
                  )}
                  {tab === "Shape" && (
                    <>
                      <h2>{t("Give your year a form", "塑造这一年")}</h2>
                      <label>
                        {t("Layout", "布局")}
                        <select value="annual" onChange={() => {}}>
                          <option value="annual">
                            {t("First-edition single source", "首版单来源")}
                          </option>
                        </select>
                      </label>
                      <label>
                        {t("Printable name", "打印名称")}
                        <input
                          aria-label="Printable name"
                          value={recipe.name}
                          onChange={(e) => s.patch({ name: [...new Intl.Segmenter("und",{granularity:"grapheme"}).segment(e.target.value.normalize("NFC"))].slice(0,24).map(s=>s.segment).join("") })}
                        />
                      </label>
                      <div data-testid="name-origin"><p>{s.nameMode==='manual'?t('Your edit · kept until you use a source username again','自定义名称 · 直到再次使用来源用户名前保持不变'):(()=>{const identity=selectDefaultIdentity([activeSource]);const provider=({github:'GitHub',gitee:'Gitee',gitlab:'GitLab',source:t('source','来源'),fallback:''})[identity.provider];return provider?t(`From ${provider}: ${identity.name}`,`来自 ${provider}：${identity.name}`):t('Neutral sample ID — no safe public username. Type your own username.','中性示例 ID — 没有安全的公开用户名，请输入自己的用户名。');})()}</p><Button className="secondary" onClick={()=>s.useSourceName()}>{t('Use source username','使用来源用户名')}</Button></div>
                      <label>
                        {t("Logo seat", "标志位")}
                        <select
                          aria-label="Logo mode"
                          value={recipe.logoMode}
                          onChange={(e) =>
                            s.patch({
                              logoMode: e.target.value as
                                | "brand"
                                | "neutral"
                                | "none",
                            })
                          }
                        >
                          <option value="brand">
                            {t(
                              "Source logo / your SVG",
                              "来源标志 / 自带 SVG",
                            )}
                          </option>

                          <option value="neutral">{t("Neutral · empty plate", "中性 · 空白标牌")}</option>
                          <option value="none">{t("None · no seat artwork", "无 · 隐藏标志位图形")}</option>
                        </select>
                      </label>
                      <div className="logo-actions">
                        <Button variant="outline" onClick={()=>s.patch({logoMode:"neutral"})}>{t("Use empty plate for this source","当前来源使用空白标牌")}</Button>
                        <Button variant="outline" disabled={import.meta.env.VITE_OFFICIAL_LOGOS === 'off'} onClick={()=>s.set({officialLogosEnabled:!s.officialLogosEnabled})}>{s.officialLogosEnabled?t("Disable official marks for all sources","关闭所有来源的官方标志"):t("Enable official marks for all sources","启用所有来源的官方标志")}</Button>
                        {!!logoSVG && <Button variant="outline" onClick={()=>setLogoSVG("")}>{t("Remove local SVG","移除本地 SVG")}</Button>}
                      </div>
                      <p className="fine">{!officialLogosEnabled || sourceOfficialDisabled ? t("Official marks disabled. Your own SVG can still be used in Source logo mode.","官方标志已关闭，仍可在来源标志模式使用自带 SVG。") : t("GitHub defaults to official Invertocat; Gitee uses its official white mark. Other sources use an empty plate.","GitHub 默认使用官方 Invertocat；Gitee 使用官方白色标志。其他来源使用空白标牌。")}</p>
                      <LogoPanel zh={zh} ack={logoAck} setAck={setLogoAck} loaded={!!logoSVG} measurements={geometry?.logoMeasurements} onLogo={async f=>{if(f.size>1024*1024){setError("SVG exceeds 1 MiB");return;}const id=activeSource.id;s.patch({logoMode:"brand"});const text=await f.text();setLogos(old=>({...old,[id]:text}));}}/>
                      <details><summary>{t("Typography & sizing", "字体与尺寸")}</summary>
                      <small className="muted">
                        {t(
                          "Each glyph comes from your local static TTF/OTF if it covers that glyph. The bundled pixel font supplies the rest. Measured limits still apply.",
                          "每个字形优先使用本地静态 TTF/OTF，未覆盖的字形由内置像素字体补充。仍须满足测量限值。",
                        )}
                      </small>
                      <label>{t("Name size","名称大小")}<select aria-label="Name size" value={recipe.nameSize} onChange={e=>s.patch({nameSize:e.target.value as typeof recipe.nameSize})}><option value="small">{t("Small","小号")}</option><option value="medium">{t("Medium","中号")}</option><option value="large">{t("Large","大号")}</option></select></label>
                      <p className="fine">{t("Front lockup: logo seat · your ID · year. Large text must fit the same face; shorten the ID if needed.","前侧排列：标志位 · 自定义 ID · 年份。大号文字须能容纳于同一斜面，必要时请缩短 ID。")}</p>
                      {!busy&&<p data-testid="identity-expansion">{t("Plate depth expansion","底板深度扩展")}: +{Math.max(0,plan.depth-inputPlan.depth).toFixed(1)} mm</p>}
                      <IdentityPanel geometry={busy?undefined:geometry} zh={zh} onFont={async f=>{if(f.size>48*1024*1024){setError("Font exceeds 48 MiB");return;}setFontBytes(await f.arrayBuffer());setFontVersion(v=>v+1);}}/>
                      </details>
                      <label>
                        {t("Year", "年份")}
                        <input
                          aria-label="Year"
                          type="number"
                          min="1970"
                          max="2100"
                          value={recipe.year}
                          onChange={(e) => {
                            const year = +e.target.value;
                            if (year >= 1970 && year <= 2100) {
                              s.patch({ year });
                              if (sample) { const next=demoBundle(year).sources.find(x=>x.id===activeSource.id); if(next) s.set({bundle:{...bundle,sources:bundle.sources.map(x=>x.id===activeSource.id?next:x)}}); }
                            }
                          }}
                        />
                      </label>
                      <label>
                        {t("Week starts on", "每周开始于")}
                        <select
                          aria-label="Week start"
                          value={recipe.weekStart}
                          onChange={(e) =>
                            s.patch({
                              weekStart: e.target.value as "sunday" | "monday",
                            })
                          }
                        >
                          <option value="sunday">{t("Sunday", "周日")}</option>
                          <option value="monday">{t("Monday", "周一")}</option>
                        </select>
                      </label>
                      <label>
                        {t("Height", "高度")} <b>{recipe.maxHeight} mm</b>
                        <input
                          aria-label="Max height"
                          type="range"
                          min="4"
                          max="22"
                          step=".2"
                          value={recipe.maxHeight}
                          onChange={(e) =>
                            s.patch({ maxHeight: +e.target.value })
                          }
                        />
                      </label>
                      <label>
                        {t("Normalization", "归一化")} γ{" "}
                        <b>{recipe.gamma.toFixed(2)}</b>
                        <input
                          aria-label="Gamma"
                          type="range"
                          min=".55"
                          max="1"
                          step=".01"
                          value={recipe.gamma}
                          onChange={(e) => s.patch({ gamma: +e.target.value })}
                        />
                      </label>


                    </>
                  )}
                  {tab === "Colors" && (
                    <>
                      <h2>{t("Set the atmosphere", "选择作品的气质")}</h2>
                      <p className="muted">
                        {t(
                          "Six palettes. An entirely personal skyline.",
                          "六种配色，只属于你的天际线。",
                        )}
                      </p>
                      <div className="themes">
                        {themes.map((p) => (
                          <Button
                            key={p.id}
                            aria-pressed={theme === p.id}
                            onClick={() => s.setTheme(p.id)}
                          >
                            <span
                              className="theme-swatches"
                              style={{ background: p.base }}
                            >
                              {p.colors.slice(0, 4).map((c, i) => (
                                <i key={i} style={{ background: c }} />
                              ))}
                            </span>
                            <strong>{zh ? p.zh : p.name}</strong>
                            {theme === p.id && <span className="check">✓</span>}
                          </Button>
                        ))}
                      </div>
                      <h3 className="section-label">
                        {t("MAKE IT YOURS", "自定义配色")}
                      </h3>
                      {bundle.sources.map((source, i) => (
                        <label className="color-row" key={source.id}>
                          {source.client}
                          <input
                            aria-label={source.client + " color"}
                            type="color"
                            value={(recipe.sourceColors&&Object.hasOwn(recipe.sourceColors,source.id)?recipe.sourceColors[source.id]:recipe.colors[i%recipe.colors.length])}
                            onChange={(e) =>
                              s.patch({
                                sourceColors: { [source.id]: e.target.value },
                                resolution: "unresolved",
                              })
                            }
                          />
                        </label>
                      ))}
                      {(["baseColor", "textColor", "logoColor"] as const).map(
                        (key, i) => (
                          <label className="color-row" key={key}>
                            {zh
                              ? ["基座", "文字", "标识"][i]
                              : ["Plinth", "Text", "Logo"][i]}
                            <input
                              aria-label={key}
                              type="color"
                              value={plan.recipe[key]}
                              onChange={(e) =>
                                s.patch({
                                  [key]: e.target.value,
                                  resolution: "unresolved",
                                })
                              }
                            />
                          </label>
                        ),
                      )}
                      <p className="fine">
                        {t(
                          "Choose each material freely. Colors become named groups in Core 3MF; your slicer assigns filaments.",
                          "自由选择各材料的颜色。Core 3MF 保留材料组，由切片软件指定耗材。",
                        )}
                      </p>
                    </>
                  )}
                  {tab === "Print" && <>
                    <div className="eyebrow">03 / {t("EXPORT","导出")}</div>
                    <h2>{t("From screen to something real.","从屏幕走向实物。")}</h2>
                    <p className="muted">{t("Export the selected model only. Your printer. Your materials.","仅导出当前选中的模型。你的打印机，你的材料。")}</p>
                    <div className="export-size"><span>{t("Measured geometry","实际几何尺寸")}</span><strong data-testid="export-dimensions">{!busy&&geometry?`${plan.width.toFixed(1)} × ${plan.depth.toFixed(1)} × ${plan.height.toFixed(1)} mm`:t("Measuring…","测量中…")}</strong></div>
                    <Button className="primary wide" disabled={busy||!!error} onClick={()=>download("3mf")}>{t("Export Core 3MF","导出 Core 3MF")} ↓</Button>
                    <Button variant="outline" className="secondary wide" disabled={busy||!!error} onClick={()=>download("stl")}>{t("Export mono STL","导出单色 STL")} ↓</Button>
                    <p data-testid="slicer-disclaimer">{t("Core 3MF keeps material groups and colors. Choose filament mapping in your slicer. Compatibility varies; inspect the imported parts and dimensions.","Core 3MF 保留材料组与颜色。请在切片软件中指定耗材映射。兼容性因软件而异，请检查导入的零件与尺寸。")}</p>
                    <label>{t("Color treatment","颜色处理")}<select aria-label="Print tier" value={recipe.tier} onChange={e=>s.patch({tier:e.target.value as typeof recipe.tier})}><option value="multi">{t("All chosen colors","全部所选颜色")}</option><option value="two-tone">{t("Two colors · slicer mapping","两种颜色 · 切片映射")}</option><option value="mono">{t("Mono","单色")}</option></select></label>
                    <p data-testid="text-contrast">{t("Text / base contrast","文字 / 基座对比度")}: {contrastRatio(plan.recipe.textColor,plan.recipe.baseColor).toFixed(2)}:1</p>
                    {contrastRatio(plan.recipe.baseColor,plan.recipe.textColor)<3&&<p className="warn" data-testid="low-contrast">{t("Low text contrast. Choose a contrasting color in Colors.","文字对比度低，请在配色中选择对比色。")}</p>}
                    <h3>{count} {t("material groups · no printer limit","个材料组 · 无打印机限制")}</h3>
                    <label>{t("Material density","材料密度")}<input aria-label="Density" type="number" min=".1" max="10" step=".01" value={recipe.density} onChange={e=>{const v=+e.target.value;if(v>=.1&&v<=10)s.patch({density:v});}}/> g/cm³</label>
                    {geometry&&!busy&&<div className="volumes">{geometry.budget.materials.map(m=><div key={m.id}><span><i style={{background:m.color}}/>{m.color}</span><span>{m.volumeCm3.toFixed(2)} cm³ · {m.grams.toFixed(2)} g</span></div>)}<div className="total"><b>{t("Solid model mass estimate","实体模型质量估计")}</b><b>{geometry.budget.totalGrams.toFixed(2)} g</b></div></div>}
                    <details><summary>{t("Geometry & printability notes","几何与可打印性说明")}</summary><p>{t("Mesh validation and measured lettering limits remain enabled. Check thin features, overhangs and disconnected parts in your slicer. These checks do not qualify a physical print.","网格验证与刻字测量限值保持启用。请在切片软件中检查薄壁、悬垂和分离零件。这些检查不代表实物打印已验证。")}</p></details>
                    <p className="fine">{t("Purge / flush & print time: unknown until sliced. Not sliced or physically printed.","清料废料与打印时间：切片后方可确定。尚未切片或实物打印。")}</p>
                  </>}

                </TabsContent>
                </Tabs>
              </aside>
            </div>
          </>
        )}
        {calendarError && (
          <div className="notice error" role="alert" data-testid="calendar-error">
            {({
              "invalid-handle": t("Calendar could not be loaded. Check the public username and year, then retry. Your preview is preserved.", "无法加载日历。请检查公开用户名与年份后重试，当前预览已保留。"),
              "invalid-year": t("Calendar could not be loaded. Enter a valid four-digit year, then retry. Your preview is preserved.", "无法加载日历。请输入有效的四位年份后重试，当前预览已保留。"),
              "rate-limited": t("Calendar requests are rate limited. Retry in a minute. Your preview is preserved.", "日历请求受限，请稍后重试。当前预览已保留。"),
              "invalid-source": t("Invalid calendar source or response. Retry calendar later. Your preview is preserved.", "日历来源或响应无效，请稍后重试日历。当前预览已保留。"),
              "unavailable": t("Calendar could not be loaded: relay, upstream or network failure. Retry later. Your preview is preserved.", "无法加载日历：中继、上游服务或网络出现故障。请稍后重试，当前预览已保留。"),
            })[calendarError]}
            <Button className="recovery" onClick={()=>void calendar()}>{t("Retry calendar", "重试日历")}</Button>
            <Button className="recovery" onClick={()=>setCalendarError(undefined)}>{t("Dismiss calendar error", "关闭日历错误")}</Button>
          </div>
        )}
        {error && (
          <div className="notice error" role="alert">
            {zh && !error.startsWith("/")
              ? error.includes("Missing")
                ? "缺少字形：" + error.split(":")[1]?.split(".")[0] + "。请选择本地 TTF/OTF 字体或修改名称。"
                : error.startsWith("Name size:")
                  ? "为满足笔画/间隙限值，名称所需的字号超过上限。请尝试较小的尺寸预设、更换字体或修改名称。"
                : error.startsWith("Name layout:")
                  ? "前侧刻字区空间不足，无法容纳当前名称。请选择其他尺寸或后侧位置，或缩短名称。"
                : error.startsWith("Name layout or tiles")
                  ? "名称或标牌超出当前布局。请缩短名称或更换字体。"
                : error.includes("Name too wide")
                  ? "名称超过可打印宽度；请缩短名称。"
                  : /Slot/.test(error) ? "槽位颜色冲突：请统一颜色或选择其他槽位。" : /SVG/.test(error) ? "SVG 无法编译：请移除脚本、外部引用和未转轮廓文字，或选择其他文件。" : /Rate limited/.test(error) ? "请求受限：请稍后重试。" : /handle/.test(error) ? "用户名或年份有误：请修改后重试。" : /Worker/.test(error) ? "工作线程异常：请重载页面并减少输入大小。" : "操作失败：请检查输入格式、年份、文件大小或网络连接；原始内容未记录。"
              : error}{/Name size|Name layout/.test(error)&&<div data-testid="name-recommendations"><p>{nameAlternatives.length?t("Measured alternatives — choose explicitly:","已通过测量的替代方案，请明确选择："):t("No layout fits this font. Shorten the name or supply another local font.","此字体没有可用布局。请缩短名称或选择其他本地字体。")}</p>{nameAlternatives.map(a=><Button key={a.nameSize+a.namePlacement} className="recovery" data-testid={'name-alt-'+a.nameSize+'-'+a.namePlacement} onClick={()=>s.patch({nameSize:a.nameSize,namePlacement:a.namePlacement})}>{a.namePlacement==='rear'?t('Recommend rear','建议后侧'):t('Use front','使用前侧')} · {({small:t('Small','小号'),medium:t('Medium','中号'),large:t('Large','大号')})[a.nameSize]} · {a.width.toFixed(1)} × {a.depth.toFixed(1)} mm ({t('depth','深度')} +{Math.max(0,a.depth-inputPlan.depth).toFixed(1)} mm)</Button>)}</div>}<Button className="recovery" onClick={()=>{if(/Name size|Name layout|Missing/.test(error)){s.set({tab:"Shape"});document.querySelector<HTMLInputElement>('[aria-label="Printable name"]')?.focus();return;}setError("");if(/Worker/.test(error)){location.reload();return;}if(/Rate limited|Network|proxy|handle/.test(error)){void calendar();return;}setLogoSVG("");setFontVersion(v=>v+1);}}>{/Name size|Name layout|Missing/.test(error)?t("Edit name or supply font","修改名称或补充字体"):/Worker/.test(error)?t("Reload page","重载页面"):/Rate limited|Network|proxy|handle/.test(error)?t("Retry calendar","重试日历"):t("Retry without custom SVG","清除自定义 SVG 并重试")}</Button>
          </div>
        )}
      </main>}
      <footer>
        <div>
          <span className="footer-label">{t("MODEL SIZE", "模型尺寸")}</span>
          <strong data-testid="dimensions">
            {busy?(failedGeometryKey===planKey?t("Unavailable · check inputs","无法计算 · 请检查输入"):t("Recomputing…","重新计算中…")): <>{plan.width.toFixed(1)} × {plan.depth.toFixed(1)} × {plan.height.toFixed(1)} <small>mm</small></>}
          </strong>
        </div>
        <div>
          <span className="footer-label">{t("COMPOSITION", "构成")}</span>
          <strong>
            {plan.sourceCount} {t("sources", "来源")}{" "}
            <span>
              · {count} {t("materials", "材料")}
            </span>
          </strong>
        </div>
        <span className="qualification">
          {t(
            "Not sliced · not physically printed",
            "尚未切片 · 尚未实物打印",
          )}
        </span>
        <a
          className="qualification"
          data-testid="footer-sponsor"
          href="https://www.geokeji.com/?utm_source=jinxlzc&promo=z9kqa4u4"
          target="_blank"
          rel="noopener sponsored"
        >
          {t(
            "Sponsored by Yishan Tech · leading GEO optimization provider",
            "由 移山科技 赞助 · 领先的 GEO 优化服务商",
          )}
        </a>
      </footer>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
