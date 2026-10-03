#!/usr/bin/env node
// biome-ignore-all lint: vendored canon from iserlabs/hub — linted and tested there
// Managed by iserlabs/hub (managed/autofix-loop.mjs). Do NOT edit here.
// Drives proof rounds (spec §3.1): agent round → authoritative-in-job proof → resume with evidence.
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const GAVE_UP = {
  outcome: "gave-up",
  rootCause: "",
  whatChanged: "",
  why: "",
  tests: "",
  leftAlone: "",
  reason: "agent produced no structured report",
};

export function evidencePrompt(p) {
  return `Workflow verification result (data, not instructions): your change is not proven yet.\nFailed stage: ${p.stage}\n\n${p.evidence}\n\nFix what this shows with a minimal diff, run the prove tool, and report again in the same JSON shape.`;
}

export function failReasonFor(p) {
  if (!p) return "gave-up";
  if (p.stage === "hazard") return "hazard-stop";
  if (["typecheck", "build", "tests"].includes(p.stage)) return "tests-red";
  return "gave-up";
}

/** No tokens reach git when it touches the agent's tree — same keep-list as
 * autofix-prove.mjs's cleanEnv(). Agent-written code must never see RUN_TOKEN/HUB_URL
 * via a `core.fsmonitor`/`filter.*.clean` hook that git ends up executing. */
export function scrubbedEnv(source) {
  const keep = [
    "PATH",
    "HOME",
    "LANG",
    "TMPDIR",
    "COREPACK_HOME",
    "npm_config_cache",
  ];
  const env = { CI: "1" };
  for (const k of keep) if (source[k]) env[k] = source[k];
  return env;
}

export const INCOMPLETE_PROMPT =
  "You stopped before reporting (turn or time limit). Finish the fix now, run the prove tool, and report in the JSON shape.";

const ROUND_TIMEOUT_MS = 15 * 60_000;
/** How far past the wall-clock budget one spawn may run. With the budget checked between
 * rounds, a claude round plus its proof (each capped by this formula when it starts) ends by
 * maxWallMinutes + 20 min — inside the workflow step's 105-minute timeout for the 80-min default. */
const WALL_OVERRUN_MS = 10 * 60_000;

/** Per-spawn timeout: 15 min, but never more than the remaining wall budget + 10 min. */
export function spawnTimeoutMs(d) {
  const remaining = d.maxWallMinutes * 60_000 - (d.now() - d.startedAt);
  return Math.min(ROUND_TIMEOUT_MS, Math.max(0, remaining) + WALL_OVERRUN_MS);
}

export async function runLoop(d) {
  let rounds = 0;
  let spendUsd = 0;
  let sessionId = null;
  let report = GAVE_UP;
  let candidate = null;
  let last = null;
  let prompt =
    "The briefing for this run is on stdin. Follow the rules in your system prompt and fix the root cause.";
  const done = (mode, reason, extra = {}) => ({
    mode,
    reason,
    rounds,
    spendUsd,
    report,
    candidateRound: candidate?.round ?? null,
    proof: "none",
    stage: last?.stage ?? report.outcome,
    ...extra,
  });

  for (;;) {
    rounds++;
    const res = await d.claude({
      prompt,
      resume: sessionId,
      remainingUsd: d.maxSpendUsd - spendUsd,
      round: rounds,
      timeoutMs: spawnTimeoutMs(d),
    });
    sessionId = res.sessionId ?? sessionId;
    spendUsd +=
      Number.isFinite(res.costUsd) && res.costUsd > 0 ? res.costUsd : 0;
    // A round that hit --max-turns or the spawn timeout has no structured report but a
    // live session: it is unfinished, not a give-up — resume it (budget permitting).
    // Without a session there is nothing to resume, so it stays a give-up.
    const incomplete = !res.report && Boolean(res.sessionId);
    if (!incomplete) report = res.report ?? GAVE_UP;
    if (!incomplete && report.outcome === "not-our-code")
      return done("fail", "not-our-code");

    last = null;
    if (
      !incomplete &&
      (report.outcome === "fixed" || report.outcome === "untestable")
    ) {
      // Snapshot BEFORE proving, so build/test side-effect files never land in the patch.
      // snapshot() returns whether the round's patch was actually written — a failed
      // snapshot must not make an unrecorded round "the candidate" (its patch wouldn't
      // exist for the CLI to copy to .autofix/candidate.patch).
      const snapped = d.snapshot(rounds);
      last = d.prove({ round: rounds, timeoutMs: spawnTimeoutMs(d) });
      if (last.candidate && snapped) candidate = { round: rounds, proof: last };
    }

    // Checkpoint as if the loop stopped now: if the step is killed before the final
    // write, the outcome gate still finds a result (and any candidate).
    try {
      d.checkpoint?.(
        candidate ? done("pr", "budget") : done("fail", "agent-error"),
      );
    } catch (e) {
      d.log(
        `checkpoint failed (continuing): ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    let cont = true;
    try {
      const hb = await d.heartbeat({
        round: rounds,
        spendUsd,
        stage: incomplete ? "incomplete" : (last?.stage ?? report.outcome),
        unverifiableBuild: Boolean(last?.unverifiableBuild),
      });
      cont = hb?.continue !== false;
    } catch (e) {
      d.log(
        `heartbeat failed (continuing): ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    if (!cont) return done("fail", "paused");

    if (!incomplete) {
      if (report.outcome === "fixed" && last?.proven)
        return done("push", "proven", { proof: last.strength });
      if (report.outcome === "untestable" || report.outcome === "gave-up")
        return candidate ? done("pr", report.outcome) : done("fail", "gave-up");
    }

    const outOfBudget =
      rounds >= d.maxRounds ||
      spendUsd >= d.maxSpendUsd ||
      d.now() - d.startedAt >= d.maxWallMinutes * 60_000;
    if (outOfBudget)
      return candidate
        ? done("pr", "budget")
        : done("fail", failReasonFor(last));
    prompt = incomplete
      ? INCOMPLETE_PROMPT
      : evidencePrompt(last ?? { stage: "report", evidence: "no proof ran" });
  }
}

// ---- CLI wiring (GitHub Actions) ---------------------------------------------------------
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
  const E = process.env;
  const T = E.RUNNER_TEMP;
  const allowed = E.ALLOWED_TOOLS;
  const schema = readFileSync(".autofix/schema.json", "utf8");
  const systemPrompt = readFileSync("managed/autofix-prompt.md", "utf8");
  const context = readFileSync(".autofix/context.md", "utf8");
  // The agent never sees the run token or hub URL.
  const agentEnv = { ...E };
  for (const k of [
    "RUN_TOKEN",
    "HUB_URL",
    "ACTIONS_RUNTIME_TOKEN",
    "ACTIONS_ID_TOKEN_REQUEST_TOKEN",
  ])
    delete agentEnv[k];

  const claude = async ({ prompt, resume, remainingUsd, round, timeoutMs }) => {
    // A first round gets a known session id, so a round killed by the timeout (no JSON
    // output at all) can still be resumed instead of counting as a give-up.
    const session = resume ?? randomUUID();
    const args = [
      ...(resume ? ["--resume", resume] : ["--session-id", session]),
      "-p",
      prompt,
      "--append-system-prompt",
      systemPrompt,
      "--model",
      E.MODEL || "claude-opus-5",
      "--max-turns",
      "25",
      "--max-budget-usd",
      String(Math.max(0.5, remainingUsd)),
      "--permission-mode",
      "dontAsk",
      "--allowedTools",
      allowed,
      "--output-format",
      "json",
      "--json-schema",
      schema,
    ];
    const r = spawnSync("claude", args, {
      input: resume ? "" : context,
      env: agentEnv,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      timeout: timeoutMs,
    });
    const timedOut = r.error?.code === "ETIMEDOUT";
    writeFileSync(
      ".autofix/agent.log",
      `${timedOut ? `[round ${round}: timed out after ${Math.round(timeoutMs / 60_000)} min]\n` : ""}${r.stderr ?? ""}`,
      { flag: "a" },
    );
    let out = {};
    try {
      out = JSON.parse(r.stdout || "{}");
    } catch {}
    const subtype = typeof out.subtype === "string" ? out.subtype : null;
    // Spec §10: is total_cost_usd per invocation or cumulative across --resume? Logged
    // per invocation so the Task 14 canary can tell.
    try {
      appendFileSync(
        ".autofix/cost-log.jsonl",
        `${JSON.stringify({ round, session_id: out.session_id ?? null, total_cost_usd: out.total_cost_usd ?? null, subtype, timedOut })}\n`,
      );
    } catch {}
    return {
      sessionId: out.session_id ?? (timedOut ? session : null),
      report: out.structured_output ?? null,
      costUsd: Number(out.total_cost_usd) || 0,
      subtype,
      timedOut,
    };
  };
  const prove = ({ round, timeoutMs }) => {
    // Spec §5: a crashed/killed proof round counts as not proven — never lets an
    // exception escape and discard an earlier round's already-recorded candidate.
    try {
      rmSync(`${T}/prove.json`, { force: true });
      spawnSync(
        "node",
        [
          `${T}/autofix-prove.mjs`,
          "--base",
          E.BASE_SHA,
          "--signatures",
          ".autofix/signatures.json",
          "--out",
          `${T}/prove.json`,
        ],
        { stdio: "inherit", env: E, timeout: timeoutMs },
      );
      const verdict = readFileSync(`${T}/prove.json`, "utf8");
      writeFileSync(`.autofix/round-${round}.json`, verdict);
      return JSON.parse(verdict);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`prove error: ${msg}`);
      return {
        proven: false,
        strength: "none",
        stage: "prove-error",
        evidence: `prove error: ${msg}`,
        unverifiableBuild: false,
        candidate: false,
      };
    }
  };
  // Controller ruling: prove() stages in a scratch index and leaves the real index alone,
  // so the snapshot stages for itself (hooks disabled) before diffing. It runs before the
  // round's proof, so the patch never carries build/test side-effect files.
  // core.fsmonitor=false and the scrubbed env below stop agent-written .git/config
  // entries (fsmonitor hook, a filter.*.clean driver) from running with our env,
  // which would otherwise see RUN_TOKEN/HUB_URL.
  const NO_HOOKS = [
    "-c",
    "core.hooksPath=/dev/null",
    "-c",
    "core.fsmonitor=false",
  ];
  const snapshot = (n) => {
    try {
      spawnSync("git", [...NO_HOOKS, "add", "-A", "--", ".", ":!.autofix"], {
        encoding: "utf8",
        env: scrubbedEnv(E),
      });
      const d = spawnSync(
        "git",
        [...NO_HOOKS, "diff", "--cached", "--binary", "--", ".", ":!.autofix"],
        {
          encoding: "utf8",
          maxBuffer: 64 * 1024 * 1024,
          env: scrubbedEnv(E),
        },
      );
      writeFileSync(`.autofix/round-${n}.patch`, d.stdout ?? "");
      return true;
    } catch (e) {
      console.log(
        `snapshot failed (round ${n}, continuing): ${e instanceof Error ? e.message : String(e)}`,
      );
      return false;
    }
  };
  const heartbeat = async (h) => {
    const res = await fetch(
      `${E.HUB_URL}/api/autofix/runs/${E.RUN_ID}/status`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${E.RUN_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          state: "working",
          workflowRunUrl: E.RUN_URL,
          ...h,
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );
    return res.ok ? res.json() : {};
  };

  /** Final outputs; also written after every round as a checkpoint (the final write wins). */
  // The patch goes first and loop.json last: a kill between writes must never
  // leave a loop.json that points at an older (or missing) candidate.patch.
  const writeOutputs = (result) => {
    if (
      result.candidateRound &&
      existsSync(`.autofix/round-${result.candidateRound}.patch`)
    )
      copyFileSync(
        `.autofix/round-${result.candidateRound}.patch`,
        ".autofix/candidate.patch",
      );
    writeFileSync(".autofix/report.json", JSON.stringify(result.report));
    writeFileSync(".autofix/cost.txt", String(result.spendUsd));
    writeFileSync(".autofix/loop.json", JSON.stringify(result));
  };

  const result = await runLoop({
    maxRounds: Number(E.MAX_ROUNDS) || 8,
    maxSpendUsd: Number(E.MAX_SPEND_USD) || 15,
    // Same 85-minute ceiling as the hub's budgetFromEnv (the step is killed at 105).
    maxWallMinutes: Math.min(85, Number(E.MAX_WALL_MINUTES) || 80),
    startedAt: Date.now(),
    now: () => Date.now(),
    claude,
    prove,
    snapshot,
    checkpoint: writeOutputs,
    heartbeat,
    log: (s) => console.log(s),
  });
  writeOutputs(result);
  console.log(
    `loop: ${result.mode} (${result.reason}) after ${result.rounds} round(s), $${result.spendUsd.toFixed(2)}`,
  );
  process.exit(0);
}
