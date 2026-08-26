#!/usr/bin/env bash
# Vercel Ignored Build Step. Exit 1 => BUILD. Exit 0 => SKIP (no Build CPU Minutes).
# Bias: when uncertain, BUILD. Canonical copy lives in @iserlabs/web-kit; vendored per repo.
set -u

# 0) Refs that must never deploy (data/artifact branches, e.g. hub's fleet-data).
#    Comma- or space-separated exact ref names; wins over every other rule.
if [ -n "${SKIP_DEPLOY_REFS:-}" ] && [ -n "${VERCEL_GIT_COMMIT_REF:-}" ]; then
  for _ref in $(printf '%s' "$SKIP_DEPLOY_REFS" | tr ',' ' '); do
    if [ "$_ref" = "$VERCEL_GIT_COMMIT_REF" ]; then
      echo "skip: ref '$_ref' never deploys"; exit 0
    fi
  done
fi

# 1) Kill automatic preview builds unless this project opts to keep them.
if [ "${VERCEL_ENV:-}" = "preview" ] && [ "${KEEP_PREVIEWS:-}" != "1" ]; then
  echo "skip: automatic preview build"; exit 0
fi

# 2) Explicit override for intentional no-code rebuilds (env-var change, redeploy).
if [ "${FORCE_BUILD:-}" = "1" ] || git log -1 --pretty=%B 2>/dev/null | grep -qi '\[build\]'; then
  echo "build: forced"; exit 1
fi

# 3) Diff base. Shallow clones may lack the parent => fail-safe to BUILD.
BASE="${VERCEL_GIT_PREVIOUS_SHA:-}"
[ -z "$BASE" ] && BASE="$(git rev-parse HEAD^ 2>/dev/null || true)"
[ -z "$BASE" ] && { echo "build: no diff base (fail-safe)"; exit 1; }

CHANGED="$(git diff --name-only "$BASE" HEAD 2>/dev/null || true)"
[ -z "$CHANGED" ] && { echo "build: empty/failed diff (fail-safe)"; exit 1; }

# 4) Inert allow-list ONLY. Never list content dirs (src/content/**, app pages, public/**).
DEPLOYABLE="$(printf '%s\n' "$CHANGED" \
  | grep -vE '(^|/)(README|CLAUDE|AGENTS)\.md$|^docs/|^\.github/|^scripts/ci/|\.(test|spec)\.[jt]sx?$|^\.editorconfig$|^\.vscode/' \
  || true)"
[ -z "$DEPLOYABLE" ] && { echo "skip: only inert paths changed"; exit 0; }

echo "build: deployable changes present"; exit 1
