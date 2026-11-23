import { z } from "zod";
import manifestEntries from "../manifest.json" with {type:"json"};
import bundledSVG from "./bundled-svg.json" with {type:"json"};
import { compileLocalSVG } from "./compiler";
export const LogoManifest = z.object({
  brand: z.string(),
  sourceUrl: z.string().url().nullable(),
  revision: z.string().nullable(),
  licenseStatus: z.enum(["unchecked", "approved", "rejected", "owner-accepted-risk"]),
  license: z.string().nullable(),
  sha256: z.string().nullable(),
  review: z
    .object({
      reviewedAt: z.string(),
      conclusion: z.enum(["can-redistribute", "restricted", "unclear"]),
      scope: z.string(),
      officialSources: z.array(z.string().url()),
      reason: z.string(),
      vendored: z.boolean(),
    })
    .optional(),
  placeholder: z.string(),
  assetPath: z.string().optional(),
  retrievedAt: z.string().optional(),
  trademarkOwner: z.string().optional(),
});
export function mayVendor(input: unknown) {
  const m = LogoManifest.parse(input);
  return (
    m.licenseStatus === "approved" && !!m.license && !!m.sha256 && !!m.sourceUrl
  );
}
// This product opt-in is deliberately separate from mayVendor's license-grant check.
// Only exact, reviewed bundled bytes may use it. No runtime downloads or inferred grants.
export async function compileOfficialLogo(manifest: unknown, svg: string) {
  const m = LogoManifest.parse(manifest);
  const pinned = manifestEntries.find(entry => entry.brand === m.brand);
  if (!pinned || !m.review?.vendored || m.licenseStatus !== "owner-accepted-risk" ||
      !Object.hasOwn(bundledSVG, m.brand)) throw Error("Official logo not bundled for this source");
  if (m.sha256 !== pinned.sha256 || m.sourceUrl !== pinned.sourceUrl ||
      svg !== bundledSVG[m.brand as keyof typeof bundledSVG])
    throw Error("Official logo hash-pinned bytes or provenance mismatch");
  const tile = await compileLocalSVG(svg, {seatMm:12.5});
  return {...tile, measurements:{...tile.measurements, provenance:{
    kind:"official" as const, brand:m.brand, sourceUrl:m.sourceUrl, sha256:m.sha256,
    licenseStatus:m.licenseStatus,
  }}};
}

export async function compileSourceLogo(source: string, mode: "brand" | "neutral" | "none", options: {
  localSVG?: string; officialEnabled?: boolean; disabledSources?: readonly string[];
} = {}) {
  if (mode !== "brand") return undefined;
  if (options.localSVG) return compileLocalSVG(options.localSVG, {seatMm:12.5});
  if (options.officialEnabled === false || options.disabledSources?.includes(source)) return undefined;
  const manifest = manifestEntries.find(m => m.brand === source);
  if (!manifest?.review.vendored || !Object.hasOwn(bundledSVG, source)) return undefined;
  return compileOfficialLogo(manifest, bundledSVG[source as keyof typeof bundledSVG]);
}
export const placeholderNotice = "Replaceable asset (official logo not included)";
export { compileLocalSVG } from "./compiler";
