import { ChevronDown } from './components/ChevronDown';

export function Qualification({zh}: {zh: boolean}) {
  return <details className="online-details" data-testid="source-qualification">
    <summary><span>{zh ? '来源资格与历史限制' : 'Source qualification & history limits'}</span><ChevronDown /></summary>
    <dl>
      <dt>GitHub · {zh ? '公开日历已验证' : 'Verified public calendar'}</dt>
      <dd>{zh ? '本仓库已通过真实公开请求。当前使用公开贡献页面；非官方稳定 API，历史可能不完整。' : 'Real public requests have passed in this repo. Uses the public contributions page, not a stable official API; history may be incomplete.'}</dd>
      <dt>Gitee · {zh ? '公开日历已验证' : 'Verified public calendar'}</dt>
      <dd>{zh ? '沿用已验证的日历抓取器。官方 OpenAPI 未找到年度日历操作，不代表官方日历 API。' : 'Uses the existing verified fetcher. No year-calendar operation was found in official OpenAPI; this is not an official calendar API.'}</dd>
      <dt>GitLab · Beta</dt>
      <dd>{zh ? '仅合成样例测试，未完成真实公开验证。官方日历仅涵盖过去 12 个月；旧年份可能没有数据。' : 'Synthetic fixture tests only; no live public qualification. The official calendar covers the past 12 months; older years may be unavailable.'}</dd>
    </dl>
    <p>{zh ? '未知不是零。各来源保留独立单位与覆盖范围；缺失历史不能补回。' : 'Unknown is not zero. Sources retain separate units and coverage; missing history cannot be recovered.'}</p>
  </details>;
}
