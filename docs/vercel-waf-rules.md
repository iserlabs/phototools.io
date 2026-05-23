# Vercel WAF rate-limit rules — Lightroom Catalog Analyzer share

These rate-limit rules are configured manually in the Vercel dashboard
(**Project → Firewall → Custom Rules**). They are documented here so the
configuration is reproducible and reviewable in version control. There is no
first-class `vercel.json` declaration for WAF *rate-limit* rules at this time;
enter them by hand and keep this file in sync.

Rate-limit action: **Rate Limit** → when exceeded, **Deny (429)**.
Window: rolling **1 hour**. Keyed by **IP address**.

| # | Name | Match (path + method) | Limit | Rationale |
|---|------|----------------------|-------|-----------|
| 1 | `lrcat-share-create` | `POST` and path equals `/api/share` | **10 / hour / IP** | Share creation is expensive (Blob write); 10/hr is generous for a human, hostile to scripted abuse. |
| 2 | `lrcat-share-read` | `GET` and path starts with `/api/share/` | **200 / hour / IP** | Recipients + the creator's management view; 200/hr absorbs legitimate traffic. |
| 3 | `lrcat-share-og` | `GET` and path matches `/*/lightroom-catalog-analyzer/r/*/opengraph-image*` | **2000 / hour / IP** | Social platforms (Slack, Discord, X, iMessage, WhatsApp, LinkedIn) fetch OG images aggressively and from rotating IPs; this rule is intentionally far more permissive than #2. |

## Configuration steps (per rule)

1. Vercel dashboard → the `photo-tools` project → **Firewall** tab → **Custom Rules** → **New Rule**.
2. Set the **Name** from the table.
3. **If** → add conditions:
   - **Request Path** — operator + value from the Match column. For rule #3 use the **matches (glob)** operator with `/*/lightroom-catalog-analyzer/r/*/opengraph-image*`.
   - **Request Method** — equals `POST` (rule 1) or `GET` (rules 2–3).
4. **Then** → **Rate Limit**:
   - **Requests**: 10 / 200 / 2000 respectively.
   - **Window**: `1 hour`.
   - **Keyed by**: `IP Address`.
   - **Action when exceeded**: `Deny` with status `429`.
5. Save and **Deploy** the firewall config (WAF changes deploy independently of code).

## Notes

- Rules are evaluated top-to-bottom; order #1 → #2 → #3 so the most specific
  (OG) glob isn't shadowed by the broader `/api/share/` prefix. The OG path is
  under `/lightroom-catalog-analyzer/r/…`, not `/api/share/…`, so they don't
  overlap — but keep the documented order for clarity.
- The 429 from rule #1 is surfaced to the user by `share-client.ts`
  (`ShareError('rate-limited')` → the disclosure modal shows
  `share.errors.rate-limited`).
- If WAF custom rules ever gain `vercel.json` support, migrate these into the
  repo and delete the manual steps — until then this file is the source of truth.

## Environment variables

| Var | Where | Set via |
|-----|-------|---------|
| `BLOB_READ_WRITE_TOKEN` | Production + Preview | Auto-provisioned when you add a Blob store to the project (Storage tab → Create → Blob). No manual entry. |
| `CRON_SECRET` | Production + Preview | `vercel env add CRON_SECRET production` then `vercel env add CRON_SECRET preview`. Generate a long random value (`openssl rand -hex 32`). Vercel's cron scheduler sends it as `Authorization: Bearer <value>` to `/api/cron/expire-shares`. |
