# Privacy / 隐私

The M6 website has no accounts, telemetry, analytics or activity-file import. It does not scan directories or read local usage logs. Selected fonts and SVGs are processed locally in the browser, never uploaded, and held only for the page session.

An explicit public-calendar request sends the username and year to the configured restricted relay and selected GitHub/Gitee/GitLab origin. No browser access token is used. Relay operators and upstream sources see the username, year and network address. The relay caches public calendars for up to one hour; responses prohibit shared HTTP caching. No arbitrary URL proxy is provided.

Exports contain geometry, colors, material groups, volumes and engineering measurements. Activity records and identity metadata are excluded by default, but engraved names and calendar-derived shapes remain visible. Inspect before sharing.

中文：本版本没有账号、遥测、活动文件导入或目录扫描。自选字体与 SVG 仅在浏览器内处理，不上传，关闭页面即清除。公开日历请求将用户名与年份发送至配置的受限中继及所选平台；运营方与平台可见用户名、年份和网络地址，不使用浏览器令牌。导出默认不含活动明细或身份元数据，但模型上的名称与日历形状仍可见，分享前请检查。

Internal protocol and CLI parser packages remain in the repository, outside the website workflow. Their tests use synthetic fixtures only.
