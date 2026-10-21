import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const modules = new Map();
function load(filename) {
  const absolute = path.resolve(root, filename);
  if (modules.has(absolute)) return modules.get(absolute).exports;
  const module = { exports: {} }; modules.set(absolute, module);
  const compiled = ts.transpileModule(fs.readFileSync(absolute, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const localRequire = name => {
    if (name.startsWith("@/") || name.startsWith(".")) {
      const base = name.startsWith("@/") ? path.resolve(root, name.slice(2)) : path.resolve(path.dirname(absolute), name);
      const candidate = [".ts", ".tsx"].map(extension => base + extension).find(file => fs.existsSync(file));
      if (candidate) return load(candidate);
    }
    return require(name);
  };
  vm.runInThisContext(`(function(require,module,exports){${compiled}\n})`, { filename: absolute })(localRequire, module, module.exports);
  return module.exports;
}
const { validMissionRun, mergeMissionRuns, missionRequestFingerprint, keepMissionRequestId } = load("hooks/use-missions.ts");
const { missionDraftKey, missionRoundPair } = load("app/components/mission-session.tsx");
const feedback = { strengths: ["A clear claim."], improvements: [{ dimension: "precision", original: "very good", improved: "effective for beginners", why: "State the effect." }], phrases: [{ expression: "on balance", meaning: "after considering both sides", example: "On balance, I support the policy." }], retryPrompt: "Add a reason.", outcome: { state: "partial", label: "Needs evidence", evidence: "No example yet." }, adaptation: "same", nextChallenge: "What about access?" };
const turn = (attempt, round = 1) => ({ id: `round${round}-attempt${attempt}`, round, attempt, answer: attempt === 1 ? "It is very good." : "It is effective for beginners because feedback is immediate.", inputMode: "text", characterReply: "Who benefits?", feedback });
const run = (language = "en", updatedAt = 100) => ({ id: `${language}-run`, templateId: "ai-on-campus", language, level: "C1", difficulty: 2, status: "active", phase: "challenge", round: 1, currentChallenge: "Defend your view.", opening: "What is your view?", turns: [], createdAt: 1, updatedAt });

test("mission cache validates both languages and rejects malformed feedback", () => {
  for (const language of ["en", "de"]) assert.ok(validMissionRun({ ...run(language), turns: [turn(1), turn(2)] }));
  assert.equal(validMissionRun({ ...run(), difficulty: "2" }), false);
  assert.equal(validMissionRun({ ...run(), updatedAt: Infinity }), false);
  assert.equal(validMissionRun({ ...run(), turns: [{ ...turn(1), feedback: { ...feedback, strengths: [{ fabricated: true }] } }] }), false);
  assert.equal(validMissionRun({ ...run(), summary: {} }), false);
});

test("late cache/network responses cannot replace newer run evidence or another language", () => {
  const latest = { ...run("en", 300), turns: [turn(1), turn(2)], phase: "retry" };
  const previous = [latest, run("de", 200)];
  const merged = mergeMissionRuns(previous, [run("en", 100)]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].phase, "retry");
  assert.equal(merged[0].turns.length, 2);
  assert.equal(merged.find(item => item.language === "de").updatedAt, 200);
});

test("idempotency fingerprints identify exact learner intent and revision without storing the answer", () => {
  const request = { action: "respond", runId: "en-1", answer: "I disagree because access matters.", inputMode: "text", expectedUpdatedAt: 100 };
  const stable = missionRequestFingerprint(request);
  assert.equal(stable, missionRequestFingerprint({ expectedUpdatedAt: 100, inputMode: "text", answer: request.answer, runId: "en-1", action: "respond" }));
  assert.notEqual(stable, missionRequestFingerprint({ ...request, expectedUpdatedAt: 200 }));
  assert.notEqual(stable, missionRequestFingerprint({ ...request, answer: "I agree because feedback is useful." }));
  assert.notEqual(stable, missionRequestFingerprint({ ...request, runId: "de-1" }));
  assert.equal(stable.includes("disagree"), false);
});

test("known failed request IDs can be retried; unknown delivery keeps the idempotency protection", () => {
  for (const code of ["usage_limit", "mission_busy", "request_expired", "configuration_required", "ai_rate_limited", "ai_budget_exhausted", "ai_timeout", "invalid_ai_response", "sign_in_required"]) assert.equal(keepMissionRequestId(code), false, code);
  for (const code of ["connection_error", "request_pending", "mission_unavailable"]) assert.equal(keepMissionRequestId(code), true, code);
});

test("draft keys separate first attempt, retry, round and language-specific run", () => {
  const first = missionDraftKey(run());
  assert.notEqual(first, missionDraftKey({ ...run(), phase: "feedback" }));
  assert.notEqual(first, missionDraftKey({ ...run(), round: 2 }));
  assert.notEqual(first, missionDraftKey(run("de")));
  assert.equal(first, missionDraftKey(run()));
});

test("comparisons use recorded first and retry answers from the selected round", () => {
  const evidence = { turns: [turn(1), turn(2), turn(1, 2)] };
  assert.match(missionRoundPair(evidence, 1).original.answer, /very good/);
  assert.match(missionRoundPair(evidence, 1).retry.answer, /immediate/);
  assert.equal(missionRoundPair(evidence, 2).retry, undefined);
});
