# 公开用户名 → 独立天际线

选择 **GitHub**、**Gitee** 或 **GitLab（Beta）**，输入公开用户名与年份，点击 **获取日历 → 生成天际线**。预览并调整配色与形态，再在导出页下载 STL 或 Core 3MF。每个来源独立拥有斜面基座、标志位、可编辑 ID 和年份；切换模型并分别导出。无需登录或 CLI。

示例工作室仅展示合成代码托管日历，不代表真实账号。成功获取日历后会移除示例。GitHub/Gitee 已有公开请求验证记录；GitLab 仍为 Beta，仅通过合成样例测试，日历范围为过去 12 个月，未完成真实公开验证。未知不等于零。

默认刻字采用当前来源的公开用户名，没有时使用 `skyline-demo`；字体为 VibeSkyline Grid。GitHub/Gitee 默认使用官方标志，所有者已接受品牌政策风险；GitLab 保留空白标牌。形态页支持关闭当前来源或全部官方标志，以及自带 SVG。[商标来源与运营开关](../licenses/TRADEMARKS.md)。

尺寸单位为 mm，材料组自由，不预设打印机或槽位上限。耗材映射由切片软件负责。**尚未切片或实物打印，打印时间与清料废料未知。**

## 维护者本地运行

使用 Node >=22.15、pnpm 10，分支为 `feat/m6-code-sources-only`：

```sh
pnpm install --frozen-lockfile
pnpm dev
```

打开 `http://127.0.0.1:5173`，开发服务包含受限日历中继。本里程碑没有公网部署地址。[中继配置](CALENDAR_RELAY.md) · [隐私](PRIVACY.md) · [M6 说明](../M6_NOTES.md)。
