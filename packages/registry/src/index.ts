import type { AdapterManifest } from "@vibeskyline/contracts";
export const capabilityMap = {
  verified: "qualified",
  "fixture-tested": "beta",
  "in-progress": "beta",
  manual: "manual-only",
  unsupported: "unavailable",
} as const;
export const registry: AdapterManifest[] = [
  "github",
  "gitee",
  "gitlab",
  "codex",
  "claude",
  "gemini",
  "deepseek",
  "qwen",
  "kimi",
  "doubao",
  "glm",
  "minimax",
  "trae",
  "codebuddy",
  "lingma",
  "cursor",
  "copilot",
  "antigravity",
].map((id) => {
  const live = ["github", "gitee"].includes(id);
  const native = ["codex", "claude", "gemini"].includes(id);
  const implemented = live || native || id === "gitlab" || id === "cursor";
  const status = live ? "verified" : id === "cursor" ? "manual" : implemented ? "fixture-tested" : "unsupported";
  return {
    id, brand:id, status, capability:capabilityMap[status],
    methods: id==='cursor' ? ['file','manual'] : native ? id==='gemini'?['file']:['local','file'] : implemented ? ['public-http'] : [],
    metric: ['github','gitee','gitlab'].includes(id) ? 'contributions' : 'tokens',
    reason: live ? 'Public calendar fetcher verified with real requests; upstream availability and history are not guaranteed.' : id==='cursor' ? 'Dashboard CSV only; supported columns fixture-tested, no account access.' : id === 'gitlab' ? 'Beta: synthetic fixtures only; official calendar covers the past 12 months; no live qualification.' : implemented ? 'Public format reference and synthetic golden tests; no real user logs inspected.' : 'No implemented adapter; original identity asset only.',
    evidence: [live || id === 'gitlab' ? 'docs/M3_ONLINE_REPORT.md' : implemented ? 'docs/ADAPTER_FORMATS.md' : 'docs/ROADMAP.md'],
    producerVersions: implemented ? [] : [],
    runtimes: implemented ? ['node','browser'] : [],
  };
});
export const themes = [
  {
    id: "porcelain",
    name: "Porcelain Atelier",
    zh: "白瓷工作室",
    base: "#EFECE6",
    ink: "#23262B",
    colors: ["#2F5D8C", "#D96B43", "#3A7D6B", "#7C5EA8", "#C89B3C", "#B84A62"],
  },
  {
    id: "obsidian",
    name: "Obsidian Desk",
    zh: "黑曜桌面",
    base: "#181C22",
    ink: "#D6DCE5",
    colors: ["#4CC9F0", "#F77F00", "#52B788", "#B583FF", "#F4D35E", "#FF5D8F"],
  },
  {
    id: "cinnabar",
    name: "Cinnabar & Xuan",
    zh: "朱砂宣纸",
    base: "#F2EAE0",
    ink: "#2B2523",
    colors: ["#9E2A2B", "#2F4858", "#C88D32", "#4A6B5D", "#6C4675", "#B85D3B"],
  },
  {
    id: "celadon",
    name: "Celadon & Ink",
    zh: "青瓷墨韵",
    base: "#1B2428",
    ink: "#D8C39E",
    colors: ["#7FB3A8", "#D8A46F", "#5D8AA8", "#C46D5E", "#A3B18A", "#E0C097"],
  },
  {
    id: "mono",
    name: "Monochrome Architectural",
    zh: "建筑单色",
    base: "#D6D4CE",
    ink: "#41454A",
    colors: Array(6).fill("#41454A") as string[],
  },
  {
    id: "brand",
    name: "Brand Palette",
    zh: "品牌配色",
    base: "#F4F1EA",
    ink: "#222222",
    colors: ["#343A40", "#E5734A", "#418E7A", "#8B71BD", "#DDA83B", "#537FC4"],
  },
];
