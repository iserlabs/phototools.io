# `src/lib/lrcat/`

Shared types, schema snapshots, and test fixtures for the Lightroom Catalog Analyzer.

- `types.ts` — `InsightBlob`, `AnalysisFilter`, block-level types
- `schema-snapshots/` — `CREATE TABLE` dumps from Lightroom Classic catalogs (v9 + v14) — source of truth for aggregator queries
- `test-fixtures/` — synthetic `.lrcat` files used by aggregator unit tests
- `share-storage.ts` — added in Plan 3 (URL-share localStorage helpers)

Spec: `docs/superpowers/specs/2026-05-23-lightroom-catalog-analyzer-design.md`
