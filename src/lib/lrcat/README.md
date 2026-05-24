# `src/lib/lrcat/`

Shared types, schemas, and helpers for the Lightroom Catalog Analyzer.

- `types.ts` — `InsightBlob`, `AnalysisFilter`, block-level types
- `insight-blob.schema.ts` — Zod schema for validating a full `InsightBlob`
- `insight-blob-blocks.schema.ts` — Zod schemas for individual insight blocks
- `share-blob.ts` — encode/decode InsightBlob to/from a compressed share payload
- `share-storage.ts` — URL-share localStorage helpers (recent shares list)
- `fetch-share.ts` — server-side helper to fetch a shared blob by ID
- `regions/` — offline nearest-centroid reverse geocoder (GPS cluster → region label)
- `schema-snapshots/` — `CREATE TABLE` dumps from LrC catalogs (v9 + v14) — source of truth for aggregator queries
- `test-fixtures/` — synthetic `.lrcat` builder for aggregator unit tests

Spec: `docs/superpowers/specs/2026-05-23-lightroom-catalog-analyzer-design.md`
