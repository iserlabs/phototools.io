// biome-ignore-all format: vendored canon — fleet repos' Biome configs differ (line width); formatted in iserlabs/hub
// biome-ignore-all lint: vendored canon from iserlabs/hub — linted and tested there
// Managed by iserlabs/hub (managed/autofix-prove.mjs). Do NOT edit here.
// The proof (spec §2): hazard → typecheck → build → tests → red-on-base. Zero dependencies.
// The workflow runs this from a copy in $RUNNER_TEMP next to a copy of autofix-check.mjs.
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  checkChanges,
  checkTestIntegrity,
  TEST_FILE,
} from "./autofix-check.mjs";

/**
 * @typedef {{ code: number, out: string }} ExecResult
 * @typedef {(cmd: string, args: string[], opts: { cwd: string, env?: Record<string, string>, timeoutMs?: number }) => ExecResult} Exec
 * @typedef {{ type?: string, value?: string }} Signature
 * @typedef {{
 *   proven: boolean,
 *   strength: "strong"|"behavioral"|"none",
 *   stage: "hazard"|"typecheck"|"build"|"tests"|"integrity"|"unsupported-runner"|"red-on-base"|"green"|"done"|"prove-error",
 *   evidence: string,
 *   unverifiableBuild: boolean,
 *   candidate: boolean,
 * }} ProveResult
 */

export const EVIDENCE_MAX = 4000;
export const SIGNATURES_UNAVAILABLE =
  "Sentry signatures unavailable — cannot accept a behavioral proof; this fix goes to review";

export function tail(text, max = EVIDENCE_MAX) {
  const s = String(text ?? "");
  return s.length > max ? `…${s.slice(-max)}` : s;
}

/** Whitespace collapsed, numbers → #, quoted tokens → '*' (minified bundles mangle identifiers). */
export function normalise(text) {
  return String(text)
    .replace(/(['"`])(?:(?!\1)[^\n])*\1/g, "'*'")
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ")
    .trim();
}

const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The exception type must appear as a whole identifier — `Error` must not match
 * `AssertionError` (every failed `expect` would otherwise "reproduce" a plain Error). */
export function matchesSignature(message, sig) {
  if (!sig?.type) return false;
  const m = normalise(message);
  const type = new RegExp(
    `(^|[^\\w$])${escapeRegExp(normalise(sig.type))}([^\\w$]|$)`,
  );
  if (!type.test(m)) return false;
  return sig.value ? m.includes(normalise(sig.value)) : true;
}

/** A missing-export/missing-module failure is not a reproduction of a production bug —
 * it means the new test exercises code that doesn't exist on base yet. Under Vite's SSR
 * transform (unlike Node's native ESM loader) a missing named export doesn't throw at
 * import time; it resolves to `undefined` and surfaces as a plain runtime "is not a
 * function" assertion failure, so this can't be caught by the file-level suite-error path
 * above and has to be matched from the failure message text instead. */
const MISSING_IMPORT = [
  // Real shape: "(0 , __vite_ssr_import_1__.safeLen) is not a function" — the destructured
  // import call wraps the reference in `(0 , ...)`, so a `)` may sit before "is not a".
  /__vite_ssr_import_\d+__\.[\w$]+\)? is not a (function|constructor)/,
  /does not provide an export named/,
  /Cannot find module/,
  /Failed to (load|resolve)/,
];

/** Grades the base-commit run of the new tests (Vitest JSON reporter, Jest-compatible shape). */
export function gradeBaseRun(report, signatures) {
  const files = report?.testResults ?? [];
  const failed = files
    .flatMap((f) => f.assertionResults ?? [])
    .filter((c) => c.status === "failed");
  if (failed.length === 0) {
    const broken = files.find((f) => f.status === "failed" && f.message);
    if (broken)
      return {
        kind: "suite-error",
        detail: `the test file failed to load on base (not a reproduction) — test through code that exists on the base commit:\n${tail(broken.message, 1500)}`,
      };
    return {
      kind: "no-failure",
      detail:
        "the new test passes on the base commit — it does not reproduce the bug",
    };
  }
  const messages = failed.flatMap((c) => c.failureMessages ?? []);
  const hit = (signatures ?? []).find((s) =>
    messages.some((m) => matchesSignature(m, s)),
  );
  if (hit)
    return { kind: "strong", detail: `reproduces ${hit.type}: ${hit.value}` };
  const missingImport = messages.find((m) =>
    MISSING_IMPORT.some((re) => re.test(m)),
  );
  if (missingImport)
    return {
      kind: "suite-error",
      detail: `the test file failed to load on base (not a reproduction) — test through code that exists on the base commit:\n${tail(missingImport, 1500)}`,
    };
  return { kind: "behavioral", detail: tail(messages.join("\n"), 1500) };
}

/** Added/modified test files from `git status --porcelain` (renames → new path; deletions skipped). */
export function testFilesFrom(status) {
  const out = [];
  for (const raw of String(status).split("\n")) {
    if (!raw.trim()) continue;
    const code = raw.slice(0, 2);
    if (code.includes("D")) continue;
    let path = raw.slice(3);
    const arrow = path.indexOf(" -> ");
    if (arrow !== -1) path = path.slice(arrow + 4);
    path = path.replace(/^"|"$/g, "");
    if (TEST_FILE.test(path)) out.push(path);
  }
  return out;
}

/** No tokens reach agent-written code: only what a build/test needs. */
export function cleanEnv() {
  const keep = [
    "PATH",
    "HOME",
    "LANG",
    "TMPDIR",
    "COREPACK_HOME",
    "npm_config_cache",
  ];
  const env = { CI: "1" };
  for (const k of keep) if (process.env[k]) env[k] = process.env[k];
  return env;
}

/**
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ cwd: string, env?: Record<string, string>, timeoutMs?: number }} opts
 * @returns {ExecResult}
 */
export function realExec(
  cmd,
  args,
  { cwd, env, timeoutMs = 15 * 60_000 } = {},
) {
  const r = spawnSync(cmd, args, {
    cwd,
    env: env ?? cleanEnv(),
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: timeoutMs,
  });
  if (r.error && r.error.code !== "ETIMEDOUT") throw r.error;
  return { code: r.status ?? 1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

function detectPm(cwd) {
  if (existsSync(join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(cwd, "yarn.lock"))) return "yarn";
  return "npm";
}

const fail = (r, stage, evidence) => ({
  ...r,
  proven: false,
  stage,
  evidence: tail(evidence),
});

function runVitest(exec, dir, files) {
  const out = join(
    mkdtempSync(join(tmpdir(), "autofix-vitest-")),
    "report.json",
  );
  const bin = join(dir, "node_modules", ".bin", "vitest");
  const r = exec(
    bin,
    ["run", ...files, "--reporter=json", `--outputFile=${out}`],
    { cwd: dir, env: cleanEnv() },
  );
  if (!existsSync(out))
    return { error: `vitest produced no report:\n${tail(r.out, 1500)}` };
  try {
    return { report: JSON.parse(readFileSync(out, "utf8")) };
  } finally {
    rmSync(dirname(out), { recursive: true, force: true });
  }
}

/** Agent-written `.git/hooks` must never run: they would inherit whatever env git gets. */
const NO_HOOKS = ["-c", "core.hooksPath=/dev/null"];

/**
 * Runs `fn` with a `GIT_INDEX_FILE` pointed at a scratch copy of the repo's real index, so
 * `git add -A` (needed to get a `--cached` diff with rename detection) never mutates the
 * agent's actual staging area — including when `fn` throws (Review Focus 5: a crash leaves
 * the agent's tree exactly as it was).
 */
function withScratchIndex(exec, cwd, fn) {
  const gitDir = exec("git", [...NO_HOOKS, "rev-parse", "--git-dir"], {
    cwd,
    env: cleanEnv(),
  }).out.trim();
  const scratchDir = mkdtempSync(join(tmpdir(), "autofix-index-"));
  const scratch = join(scratchDir, "index");
  const real = join(resolve(cwd, gitDir), "index");
  if (existsSync(real)) cpSync(real, scratch);
  const env = { ...cleanEnv(), GIT_INDEX_FILE: scratch };
  try {
    return fn(env);
  } finally {
    rmSync(scratchDir, { recursive: true, force: true });
  }
}

/** A detached worktree at `base` that shares the candidate's node_modules; always removed. */
function withBaseTree(exec, cwd, base, fn) {
  const wt = mkdtempSync(join(tmpdir(), "autofix-base-"));
  const git = (args) =>
    exec("git", [...NO_HOOKS, ...args], { cwd, env: cleanEnv() });
  try {
    const add = git(["worktree", "add", "--detach", wt, base]);
    if (add.code !== 0)
      throw new Error(`git worktree add failed: ${tail(add.out, 500)}`);
    if (
      existsSync(join(cwd, "node_modules")) &&
      !existsSync(join(wt, "node_modules"))
    )
      symlinkSync(join(cwd, "node_modules"), join(wt, "node_modules"), "dir");
    return fn(wt);
  } finally {
    git(["worktree", "remove", "--force", wt]);
    rmSync(wt, { recursive: true, force: true });
    git(["worktree", "prune"]);
  }
}

/**
 * `signaturesUnavailable`: the hub could not say which exception production raised, so a
 * behavioral proof (a red test that may not be the production bug) is never accepted.
 * @param {{ cwd: string, base: string, signatures?: Signature[], signaturesUnavailable?: boolean, fast?: boolean, repeatGreen?: number, exec?: Exec }} opts
 * @returns {ProveResult}
 */
export function prove({
  cwd,
  base,
  signatures = [],
  signaturesUnavailable = false,
  fast = false,
  repeatGreen = 1,
  exec = realExec,
}) {
  const pkg = JSON.parse(readFileSync(join(cwd, "package.json"), "utf8"));
  const s = pkg.scripts ?? {};
  const pick = (...n) => n.find((x) => s[x]) ?? null;
  const pm = detectPm(cwd);
  const typecheck = pick("typecheck", "type-check", "check");
  const build = s.build ? "build" : null;
  const test = s.test ? "test" : null;
  let r = {
    proven: false,
    strength: "none",
    stage: "hazard",
    evidence: "",
    unverifiableBuild: false,
    candidate: false,
  };

  // 1. hazard — staged in a scratch index (see withScratchIndex) so prove() never touches
  // the agent's real staging area, success or crash.
  const { status, diff } = withScratchIndex(exec, cwd, (env) => {
    exec("git", [...NO_HOOKS, "add", "-A", "--", ".", ":!.autofix"], {
      cwd,
      env,
    });
    const st = exec(
      "git",
      [...NO_HOOKS, "status", "--porcelain", "--", ".", ":!.autofix"],
      { cwd, env },
    ).out;
    const df = exec(
      "git",
      [...NO_HOOKS, "diff", "--cached", "--binary", "--", ".", ":!.autofix"],
      { cwd, env },
    ).out;
    return { status: st, diff: df };
  });
  if (!status.trim()) return fail(r, "hazard", "no changes");
  const hz = checkChanges({ status, diff });
  if (!hz.ok) return fail(r, "hazard", hz.reasons.join("\n"));
  if (!test && !typecheck)
    return fail(
      r,
      "tests",
      "no test or typecheck script — refusing to treat this as verified",
    );

  // 2. typecheck
  if (typecheck) {
    const t = exec(pm, ["run", typecheck], { cwd, env: cleanEnv() });
    if (t.code !== 0) return fail(r, "typecheck", t.out);
  }
  // 3. build (skipped in --fast)
  if (!fast && build) {
    const b = exec(pm, ["run", build], { cwd, env: cleanEnv() });
    if (b.code !== 0) {
      const onBase = withBaseTree(exec, cwd, base, (wt) =>
        exec(pm, ["run", build], { cwd: wt, env: cleanEnv() }),
      );
      if (onBase.code === 0) return fail(r, "build", b.out);
      r = { ...r, unverifiableBuild: true };
    }
  }
  // 4. tests
  if (test) {
    const t = exec(pm, ["run", test], { cwd, env: cleanEnv() });
    if (t.code !== 0) return fail(r, "tests", t.out);
  }
  r = { ...r, candidate: true };

  // 5. red-on-base
  const integ = checkTestIntegrity({ status, diff });
  if (!integ.ok)
    return fail(
      r,
      "integrity",
      `changing existing test expectations needs a human:\n${integ.reasons.join("\n")}`,
    );
  if (!/\bvitest\b/.test(s.test ?? ""))
    return fail(
      r,
      "unsupported-runner",
      `test script is "${s.test ?? ""}" — the proof supports Vitest only`,
    );
  const files = testFilesFrom(status);
  if (files.length === 0)
    return fail(
      r,
      "red-on-base",
      "the diff adds no test — add one that reproduces the reported error through code that exists on the base commit",
    );

  const red = withBaseTree(exec, cwd, base, (wt) => {
    for (const f of files) {
      mkdirSync(dirname(join(wt, f)), { recursive: true });
      cpSync(join(cwd, f), join(wt, f));
    }
    return runVitest(exec, wt, files);
  });
  if (red.error) return fail(r, "red-on-base", red.error);
  const grade = gradeBaseRun(red.report, signatures);
  const typed = signatures.filter((x) => x.type);
  if (grade.kind !== "strong" && grade.kind !== "behavioral")
    return fail(r, "red-on-base", grade.detail);
  if (grade.kind === "behavioral" && signaturesUnavailable)
    return fail(
      r,
      "red-on-base",
      `${SIGNATURES_UNAVAILABLE}\nGot:\n${grade.detail}`,
    );
  if (grade.kind === "behavioral" && typed.length > 0)
    return fail(
      r,
      "red-on-base",
      `the new test fails on base, but does not reproduce the production error. Reproduce one of:\n${typed.map((x) => `- ${x.type}: ${x.value}`).join("\n")}\nGot:\n${grade.detail}`,
    );

  for (let i = 0; i < repeatGreen; i++) {
    const green = runVitest(exec, cwd, files);
    const failedCount = green.report?.numFailedTests ?? 1;
    if (green.error || failedCount > 0)
      return fail(
        r,
        "green",
        green.error ?? "the new test does not pass reliably with the fix",
      );
  }
  return {
    ...r,
    proven: true,
    strength: grade.kind,
    stage: "done",
    evidence: grade.detail,
  };
}

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
if (isEntryModule()) {
  const args = process.argv.slice(2);
  const val = (k) => {
    const i = args.indexOf(k);
    return i === -1 ? null : args[i + 1];
  };
  // A stale --out from a previous round must never be read as this round's verdict —
  // delete it before anything else can fail, so a crash below can't leave it in place.
  const out = val("--out");
  if (out && existsSync(out)) rmSync(out, { force: true });
  let result;
  try {
    // The workflow writes the JSON string "unavailable" (or nothing) when the hub could not
    // read Sentry; anything that is not an array is treated as unavailable (fail closed).
    const sigFile = val("--signatures");
    const parsed =
      sigFile === null
        ? []
        : existsSync(sigFile)
          ? JSON.parse(readFileSync(sigFile, "utf8"))
          : null;
    const signaturesUnavailable = !Array.isArray(parsed);
    result = prove({
      cwd: process.cwd(),
      base: val("--base") ?? "HEAD",
      signatures: signaturesUnavailable ? [] : parsed,
      signaturesUnavailable,
      fast: args.includes("--fast"),
      repeatGreen: Number(val("--repeat-green") ?? 1) || 1,
    });
  } catch (e) {
    // Spec §5: a mid-stage crash counts as "not proven", never a missing/stale verdict.
    result = {
      proven: false,
      strength: "none",
      stage: "prove-error",
      evidence: `prove error: ${e?.message ?? e}`,
      unverifiableBuild: false,
      candidate: false,
    };
  }
  if (out) writeFileSync(out, JSON.stringify(result));
  console.log(
    `autofix-prove: ${result.proven ? `PROVEN (${result.strength})` : `not proven — stage ${result.stage}`}`,
  );
  if (!result.proven) console.log(result.evidence);
  process.exit(0);
}
