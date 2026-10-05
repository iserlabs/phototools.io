// biome-ignore-all format: vendored canon — fleet repos' Biome configs differ (line width); formatted in iserlabs/hub
// biome-ignore-all lint: vendored canon from iserlabs/hub — linted and tested there
// Managed by iserlabs/hub (managed/autofix-check.mjs). Do NOT edit here.
// The workflow's hazard stop (spec §4.3): blocked paths, 200-line ceiling, no suppression.
// Zero dependencies so every fleet repo can run it. The workflow runs this from a copy in
// $RUNNER_TEMP, never the working-tree file the agent could have edited.
import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const DIFF_CEILING = 200;

export const BLOCKED = [
  /(^|\/)\.env(\.|$)/,
  /(^|\/)\.envrc$/,
  /(^|\/)package\.json$/,
  /(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|bun\.lockb|bun\.lock)$/,
  /(^|\/)(\.npmrc|\.yarnrc(\.yml)?|pnpm-workspace\.yaml|npm-shrinkwrap\.json)$/,
  /auth|payment|billing|stripe|webhook|migrations|drizzle|prisma/i,
  /(^|\/)(proxy|middleware)\.(ts|js|mts|mjs)$/,
  /(^|\/)vercel\.json$/,
  /^\.github\//,
  /^scripts\/ci\//,
  /^managed\//,
  /^\.autofix\//,
  /^\.claude\//,
  /(^|\/)\.gitattributes$/,
  /(^|\/)\.gitmodules$/,
  /(^|\/)(CLAUDE|AGENTS)\.md$/,
  /(^|\/)next\.config\.(js|mjs|ts|mts)$/,
  /(^|\/)astro\.config\.(js|mjs|ts|mts)$/,
];

/** Human-readable label per BLOCKED entry, same order — the prompt's rule 2 must mention each. */
export const BLOCKED_LABELS = [
  ".env*",
  ".envrc",
  "package.json",
  "lockfiles",
  ".npmrc, .yarnrc*, pnpm-workspace.yaml, npm-shrinkwrap.json",
  "auth, payment, billing, stripe, webhook, migrations, drizzle, prisma",
  "proxy.ts / middleware.ts",
  "vercel.json",
  ".github/",
  "scripts/ci/",
  "managed/",
  ".autofix/",
  ".claude/",
  ".gitattributes",
  ".gitmodules",
  "CLAUDE.md / AGENTS.md",
  "next.config.*",
  "astro.config.*",
];

/** Deleting one of these is itself a suppression: it silences a whole reporting pipeline. */
const DELETED_ERROR_REPORTING_FILE =
  /(^|\/)(instrumentation(-client)?\.(ts|js)|sentry\.(server|edge|client)\.config\.(ts|js))$/;

const SUPPRESSION_ADDED = [
  [/\bignoreErrors\b/, "ignoreErrors"],
  [/\bbeforeSend\b/, "beforeSend"],
  [/@ts-ignore/, "@ts-ignore"],
  [/@ts-expect-error/, "@ts-expect-error"],
  [/@ts-nocheck/, "@ts-nocheck"],
  [/biome-ignore/, "biome-ignore"],
  [/eslint-disable/, "eslint-disable"],
  [/\benabled\s*:\s*false\b/, "enabled: false"],
  [/sampleRate:\s*0(\.0+)?(?![\d.])/, "sampleRate: 0"],
];

const SECRET_PATTERNS = [
  [/sk-ant-[A-Za-z0-9_-]{20,}/, "Anthropic API key"],
  [/ghp_[A-Za-z0-9]{30,}/, "GitHub personal access token"],
  [/github_pat_[A-Za-z0-9_]{30,}/, "GitHub fine-grained PAT"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key block"],
  [/AKIA[0-9A-Z]{16}/, "AWS access key ID"],
];

const CAPTURE = /\b(capture(Exception|RequestError|Message|Event))\b/;
const SENTRY_INIT = /\bSentry\.init\b/;

const EMPTY_CATCH_PATTERNS = [
  /catch\s*(\([^)]*\))?\s*\{\s*\}/,
  /\.catch\s*\(\s*(\(\s*\w*\s*\)|\w+)\s*=>\s*\{\s*\}\s*\)/,
  /\.catch\s*\(\s*function\s*\([^)]*\)\s*\{\s*\}\s*\)/,
];

/**
 * Strip comments so a comment-only catch body (`catch { /* ok *\/ }`, `catch {//swallow }`)
 * reads as empty. A `//` only starts a line comment when it's at the start of the line or
 * preceded by whitespace or one of `{ ; , (`, so a URL's `//` (e.g. `"https://x"`, preceded
 * by `:`) is left alone.
 */
function stripComments(text) {
  const noBlocks = text.replace(/\/\*[\s\S]*?\*\//g, "");
  return noBlocks.replace(/(^|[\s{;,(])\/\/.*$/gm, "$1");
}

/**
 * Entries from `git status --porcelain`. A rename (`R  a -> b`) yields both sides: the
 * old path is `removed: true` (its name no longer exists — a rename of an error-reporting
 * config file counts the same as deleting it), the new path is `removed: false`. A plain
 * status is `removed: true` only when its code contains `D`.
 */
function statusEntries(status) {
  const out = [];
  for (const raw of status.split("\n")) {
    if (!raw.trim()) continue;
    const code = raw.slice(0, 2);
    const rest = raw.slice(3);
    const strip = (p) => p.replace(/^"|"$/g, "");
    const arrow = rest.indexOf(" -> ");
    if (arrow !== -1) {
      out.push({ code, path: strip(rest.slice(0, arrow)), removed: true });
      out.push({ code, path: strip(rest.slice(arrow + 4)), removed: false });
    } else {
      out.push({ code, path: strip(rest), removed: code.includes("D") });
    }
  }
  return out;
}

function addedAndRemoved(diff) {
  const added = [];
  const removed = [];
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++") || line.startsWith("---")) continue;
    if (line.startsWith("+")) added.push(line.slice(1));
    else if (line.startsWith("-")) removed.push(line.slice(1));
  }
  return { added, removed };
}

const BINARY_MARKERS = [/^GIT binary patch/, /^Binary files /];
const DIFF_GIT_HEADER = /^diff --git a\/.+ b\/(.+)$/;

/**
 * Binary hunks (`--binary`'s `GIT binary patch`, or the plain `Binary files ... differ`
 * a non---binary diff shows) bypass every line-based check above, since there is no
 * meaningful "added"/"removed" text to scan. Treat any binary hunk as its own hazard.
 */
function binaryChangePaths(diff) {
  const paths = [];
  let current = null;
  for (const line of diff.split("\n")) {
    const header = line.match(DIFF_GIT_HEADER);
    if (header) {
      current = header[1];
      continue;
    }
    if (BINARY_MARKERS.some((re) => re.test(line))) paths.push(current);
  }
  return paths;
}

/**
 * Symlinks (mode 120000) and gitlinks/submodules (mode 160000) carry no reviewable text: a
 * symlink can point a harmless-looking path at a blocked file, and a gitlink swaps in
 * arbitrary code by commit SHA. Git shows the mode on the `new/old/deleted file mode`,
 * `old/new mode` (mode change), or `index a..b <mode>` header lines.
 */
const SPECIAL_MODE_LINES = [
  /^(new|old|deleted)( file)? mode (120000|160000)$/,
  /^index [0-9a-f]+\.\.[0-9a-f]+ (120000|160000)$/,
];

function specialModePaths(diff) {
  const paths = new Set();
  let current = null;
  for (const line of diff.split("\n")) {
    const header = line.match(DIFF_GIT_HEADER);
    if (header) {
      current = header[1];
      continue;
    }
    if (SPECIAL_MODE_LINES.some((re) => re.test(line))) paths.add(current);
  }
  return [...paths];
}

/** Files the proof treats as tests. */
export const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;
const ASSERTION =
  /\b(expect|assert)\b|\.(toBe|toEqual|toStrictEqual|toThrow|toMatch|toContain|toHaveBeenCalled)\w*\(/;
const WEAKENER =
  /\.(skip|only|todo)\s*\(|\.(skipIf|runIf)\s*\(|\bx(it|test|describe)\s*\(|\bf(it|describe)\s*\(/;
const SNAPSHOT_ASSERT =
  /\.toMatch(Inline)?Snapshot\s*\(|\.toMatchFileSnapshot\s*\(/;
const SNAPSHOT_FILE = /(^|\/)__snapshots__\/|\.snap$/;
const IN_SOURCE = /import\.meta\.vitest/;

/** Per-file added/removed lines from a unified diff. */
function perFile(diff) {
  const files = new Map();
  let cur = null;
  for (const line of diff.split("\n")) {
    const h = line.match(DIFF_GIT_HEADER);
    if (h) {
      cur = { added: [], removed: [] };
      files.set(h[1], cur);
      continue;
    }
    if (!cur || line.startsWith("+++") || line.startsWith("---")) continue;
    if (line.startsWith("+")) cur.added.push(line.slice(1));
    else if (line.startsWith("-")) cur.removed.push(line.slice(1));
  }
  return files;
}

/**
 * Spec §2.1: the diff may only ADD tests. Violations do not make the change hazardous —
 * they make it unprovable, so the run goes to the PR path instead of `main`.
 */
export function checkTestIntegrity({ status, diff }) {
  const reasons = [];
  const isNew = new Map(
    statusEntries(status).map((e) => [e.path, /A|\?/.test(e.code)]),
  );
  for (const [path, { added, removed }] of perFile(diff)) {
    if (SNAPSHOT_FILE.test(path)) reasons.push(`snapshot changed: ${path}`);
    if (added.some((l) => IN_SOURCE.test(l)))
      reasons.push(`in-source test: ${path}`);
    if (!TEST_FILE.test(path)) continue;
    if (!isNew.get(path) && removed.some((l) => ASSERTION.test(l)))
      reasons.push(`existing assertion changed: ${path}`);
    if (added.some((l) => WEAKENER.test(l)))
      reasons.push(`skip/only/todo added: ${path}`);
    if (added.some((l) => SNAPSHOT_ASSERT.test(l)))
      reasons.push(`snapshot assertion added: ${path}`);
  }
  return { ok: reasons.length === 0, reasons };
}

function hasEmptyCatch(added) {
  const text = stripComments(added.join("\n"));
  return EMPTY_CATCH_PATTERNS.some((re) => re.test(text));
}

export function checkChanges({ status, diff }) {
  const reasons = [];
  const entries = statusEntries(status);
  const files = entries.map((e) => e.path);
  for (const { path, removed: isRemoved } of entries) {
    const hit = BLOCKED.find((re) => re.test(path));
    if (hit) {
      reasons.push(`blocked path: ${path} (${hit.source})`);
    }
    if (isRemoved && DELETED_ERROR_REPORTING_FILE.test(path)) {
      reasons.push(`removed error reporting: ${path} deleted`);
    }
  }
  for (const p of binaryChangePaths(diff)) {
    reasons.push(p ? `binary change: ${p}` : "binary change");
  }
  for (const p of specialModePaths(diff)) {
    const what = "symlink or submodule change";
    reasons.push(p ? `${what}: ${p}` : what);
  }
  const { added, removed } = addedAndRemoved(diff);
  const changedLines = added.length + removed.length;
  if (changedLines > DIFF_CEILING) {
    const n = changedLines;
    reasons.push(`${n} changed lines exceeds the ceiling of ${DIFF_CEILING}`);
  }
  for (const [re, label] of SUPPRESSION_ADDED) {
    if (added.some((l) => re.test(l))) {
      reasons.push(`suppression added: ${label}`);
    }
  }
  if (hasEmptyCatch(added)) {
    reasons.push("suppression added: empty catch block");
  }
  for (const [re, label] of SECRET_PATTERNS) {
    if (added.some((l) => re.test(l))) {
      reasons.push(`secret-like content added: ${label}`);
    }
  }
  const removedCaptures = removed.filter((l) => CAPTURE.test(l)).length;
  const addedCaptures = added.filter((l) => CAPTURE.test(l)).length;
  if (removedCaptures > addedCaptures) {
    const n = removedCaptures - addedCaptures;
    reasons.push(`removed error reporting: ${n} capture call(s) deleted`);
  }
  const removedInit = removed.some((l) => SENTRY_INIT.test(l));
  const addedInit = added.some((l) => SENTRY_INIT.test(l));
  if (removedInit && !addedInit) {
    reasons.push("removed error reporting: Sentry.init");
  }
  return { ok: reasons.length === 0, reasons, changedLines, files };
}

// Filename-independent: the workflow runs a copy from $RUNNER_TEMP, and a name-based guard
// would let a renamed copy load, check nothing, and exit 0. Node realpaths the entry module
// (so `import.meta.url` is symlink-free, e.g. /private/var vs /var on macOS) — compare
// against the realpath of argv[1] too. Importing (tests) never matches.
function isEntryModule() {
  const entry = process.argv[1];
  if (!entry) return false;
  let real;
  try {
    real = realpathSync(resolve(entry));
  } catch {
    real = resolve(entry);
  }
  return import.meta.url === pathToFileURL(real).href;
}
const invokedDirectly = isEntryModule();
if (invokedDirectly) {
  const args = process.argv.slice(2);
  const integrity = args.includes("--integrity");
  const [statusFile, diffFile] = args.filter((a) => a !== "--integrity");
  const input = {
    status: readFileSync(statusFile, "utf8"),
    diff: readFileSync(diffFile, "utf8"),
  };
  const result = checkChanges(input);
  console.log(
    `autofix-check: ${result.files.length} file(s), ${result.changedLines} changed line(s)`,
  );
  for (const r of result.reasons) console.log(`  ✗ ${r}`);
  if (!result.ok) process.exit(1);
  if (integrity) {
    const ti = checkTestIntegrity(input);
    for (const r of ti.reasons) console.log(`  ⚠ integrity: ${r}`);
    if (!ti.ok) process.exit(3);
  }
  process.exit(0);
}
