// Reproduce the browser/Node-safe string module from byte-identical vendored SVGs.
import { readFile, writeFile } from 'node:fs/promises';
const svg = await readFile(new URL('../packages/logos/assets/github-invertocat.svg', import.meta.url), 'utf8');
await writeFile(new URL('../packages/logos/src/bundled-svg.json', import.meta.url), JSON.stringify({github:svg,gitee:await readFile(new URL('../packages/logos/assets/gitee-white.svg', import.meta.url), 'utf8')}, null, 2)+'\n');
