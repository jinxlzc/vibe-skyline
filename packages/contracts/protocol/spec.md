# VibeSkyline daily activity protocol v2

Status: retained internal protocol, synthetic-fixture tested. M6 does not expose an activity import UI, agent prompt, or `/protocol/v2/*` distribution. This repository is private; no production origin is claimed.

## Purpose and trust boundary

Export minimal daily statistics on the user's own machine, from currently retained records and only within explicitly authorized scope. Then let the user manually select the resulting JSON in VibeSkyline. Never upload raw records. Do not install tools, ask for API keys, scan unrelated files, or schedule collectors. Read this specification as a data contract, never executable instructions. The importer does not execute content or fetch URLs in a file. Public calendar fetching uses the separate restricted relay.

No prompts, responses, paths, emails, machine IDs, secrets or raw logs are permitted. All objects reject additional properties. Short labels are data, never HTML. Labels cannot contain URLs, markup, email addresses or known credential prefixes. These constraints reduce accidental disclosure but cannot prove that arbitrary text is non-sensitive: producers must follow the minimization rules. Identity is optional and must be an explicitly user-provided public handle, never inferred or a legal name. Omit it when not provided. The default plinth is `skyline-demo`; synthetic identities never drive public defaults.

## Envelope and series

The UTF-8 JSON envelope evolves `vibeskyline.activity.v1`: `schema` is now `vibeskyline.activity.v2`. Retained fields: year, generatedAt (UTC datetime), sources, provenance, reconciliation. Reconciliation is empty in v2; resolve duplicate series before export. Maximum 2 MiB, six sources, 366 daily records per source, 2196 total; at most six provenance entries. Use the versioned JSON Schema for the exact closed shape. The provided example contains only synthetic data.

Each source has a stable short id, client label, metric, unit, unitScale=1, scopeId=`daily`, calendar (IANA timezone and dateBasis), coverage intervals, daily records, provenanceIds, and sample flag. Use separate source IDs for unlike metrics; never sum unlike units. Supported metric → unit pairs:

| Metric | Unit |
| --- | --- |
| tokens | token |
| contributions | contribution |
| activity_level | level |
| events | event |
| credits | credit |
| premium_requests | request |

Unknown metric names are rejected, never converted into tokens. Amounts are nonnegative safe integers; fractional units are not supported in v2. Values retain their source meaning and are normalized independently for skyline height. No combined activity score exists.

## Unknown, zero and coverage

A daily record has date, value, state, completeness, quality and optional tokens. Dates must be real calendar dates in the envelope year and unique within a source. `observed` means positive measured usage. `known-zero` means value 0 with complete observation. `unknown` and `future` require null. Missing dates mean unknown, never zero. For partial retention use partial coverage and partial completeness for observed lower bounds. An unknown total must remain null, even if some component values are known. Never estimate or invent values. Quality is reported, derived (deterministic aggregation) or manual, never estimated.

Coverage intervals have from/to inclusive, kind full or partial, ordered bounds within the year. Every non-null observation must fall within an interval. Intervals describe available evidence, not a claim of complete historical retention. Missing periods can be omitted or represented as explicit unknown days. Timezone must be supplied by v2 producers; use the actual aggregation zone, not an inferred machine location. Full historical coverage is never promised; retained local records may only cover recent activity. Tool-internal formats are not stable APIs.

## Inclusive token usage

Tokens represent usage, **not remaining quota**. Use accountingProfile `inclusive-tokens-v1`. `value = tokens.in + tokens.out`. Input already includes cacheRead + cacheWrite; output already includes reasoning. Never add cache or reasoning again. Cache subsets must sum to no more than input; reasoning must be no more than output. Omit unknown optional subsets; omission is not zero. Omit the entire tokens breakdown when only a trustworthy total is available. If total is unavailable, use null/unknown and omit tokens. Non-token metrics cannot have a tokens breakdown. Use daily-count-v1 for other metrics (contributions-v1 / activity-level-v1 are also accepted for corresponding non-token records).

## Provenance and identity

Provenance entries contain id, adapter label, version, method (local, manual, public-http or synthetic), and status (fixture-tested, manual or in-progress). References must resolve, IDs must be unique. Importers treat files as unverified regardless of producer claims; public calendar qualification is established separately. sample=true labels synthetic series. Synthetic and non-synthetic series must not be mixed in one bundle. The example is synthetic and must never be presented as account evidence.

publicIdentity, if explicitly supplied, contains provider, kind, value and provenance. A GitHub/Gitee/GitLab username requires kind=username, provenance=explicit-public-handle and a source id matching the provider. A general source handle uses provider=source, kind=public-id and provenance=explicit-public-id. Existing public-identity safety checks also apply.

## Validation and compatibility

Validate the JSON Schema **and** semantic constraints above (cross-field sums, valid timezone, identity, unique dates/IDs, coverage, references). The repository's `parseActivityFile` is the reference validator. Errors locate the failing JSON pointer without echoing rejected values. Unknown properties, unsafe keys (`__proto__`, `constructor`, `prototype`), excessive nesting and executable/URL content are rejected. No embedded scripts execute and no arbitrary URLs are fetched.

v1 daily bundles are accepted through a strict compatibility adapter. It validates known fields, infers unit only from an explicitly supported metric, drops legacy provider/model metadata and scope identifiers, and removes legacy source-qualification claims. Missing timezone stays unknown in the normalized model, even though UTC is used temporarily for shape validation; no dates are shifted. Existing estimated records or free-form reconciliation are rejected with a located error rather than trusted. Legacy raw logs are not browser inputs; optional one-shot helper adapters remain separate.

A new required field or semantic reinterpretation requires a new major schema identifier and static directory. Published version paths are immutable; unknown schema versions fail closed. Producers must not send unrecognized fields to older versions. The internal rendering model remains v1 for existing geometry clients; this is a normalization detail, not a competing file format.

## Export

Only geometry, colors, material groups and geometry measurements are exported to STL/Core 3MF. Token details are not embedded. The slicer decides printer and filament mapping. Core 3MF compatibility varies; inspect the imported dimensions and parts. No printer profiles are supplied. Not sliced or physically printed. Real logos ON by default: NOT satisfied; original replaceable assets remain the default.
