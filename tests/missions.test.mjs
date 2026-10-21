import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MISSIONS, MISSION_TOPICS, MISSION_MAX_ROUNDS, adaptMissionDifficulty, createMissionPreferences, getMissionBrief, getMissionTemplate, initialMissionDifficulty, missionRetryEvidence, normaliseMissionPreferences, recommendMissions } from "../lib/missions.ts";
import { getMissionSolution } from "../lib/mission-solutions.ts";

const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
const feedback = (adaptation = "same", state = "in_progress") => ({ strengths: ["A clear reason"], improvements: [], phrases: [], retryPrompt: "Make the reason concrete.", outcome: { state, label: "Keep going", evidence: "A reason was given." }, adaptation, nextChallenge: "What is the trade-off?" });
function run(language = "en", templateId = "roleplay-investor", updatedAt = 1, change = {}) {
  return { id: `${language}-${templateId}-${updatedAt}`, templateId, language, level: "C1", difficulty: 2, status: "active", phase: "challenge", round: 1, currentChallenge: "Explain your plan.", opening: "Explain your plan.", turns: [], createdAt: updatedAt, updatedAt, ...change };
}
function turn(round, attempt, answer, adaptation = "same") {
  return { id: `${round}-${attempt}`, round, attempt, answer, inputMode: "text", characterReply: "What about the cost?", feedback: feedback(adaptation) };
}

test("the three core mission kinds contain distinct bilingual scenarios across all interests", () => {
  assert.equal(new Set(MISSIONS.map(item => item.id)).size, MISSIONS.length);
  assert.ok(MISSIONS.length >= 9);
  assert.deepEqual(new Set(MISSIONS.map(item => item.topic)), new Set(MISSION_TOPICS));
  for (const kind of ["debate", "roleplay", "mystery"]) {
    const missions = MISSIONS.filter(item => item.kind === kind);
    assert.ok(missions.length >= 3);
    assert.equal(new Set(missions.map(item => item.brief.en)).size, missions.length);
    assert.equal(new Set(missions.map(item => item.opening.de)).size, missions.length);
  }
  for (const mission of MISSIONS) {
    assert.equal(mission.maxRounds, MISSION_MAX_ROUNDS);
    for (const field of ["title", "teaser", "brief", "role", "opening", "stakes"]) {
      assert.ok(mission[field].en.trim().length > 4);
      assert.ok(mission[field].de.trim().length > 4);
      assert.notEqual(mission[field].en, mission[field].de);
    }
    assert.equal(Object.hasOwn(mission, "solution"), false);
    assert.equal(Object.hasOwn(mission, "solutionId"), false);
  }
});

test("every mission has bounded localized briefs at A1–C2 and every adaptive tier", () => {
  for (const mission of MISSIONS) for (const language of ["en", "de"]) for (const level of levels) for (const difficulty of [1, 2, 3]) {
    const brief = getMissionBrief(mission.id, language, level, difficulty);
    assert.equal(brief.id, mission.id);
    assert.equal(brief.level, level);
    assert.equal(brief.difficulty, difficulty);
    assert.ok(brief.opening && brief.languageInstructions);
    assert.ok(JSON.stringify(brief).length < 12000);
    assert.ok(!Object.hasOwn(brief, "solution"));
    if (mission.kind === "mystery") {
      assert.ok(brief.evidence.length >= 3);
      assert.ok(brief.evidence.some(item => item.audio));
      assert.ok(brief.evidence.every(item => item.text && item.title));
    }
  }
  assert.throws(() => getMissionBrief("missing", "en", "C1"));
  assert.throws(() => getMissionBrief(MISSIONS[0], "fr", "C1"));
  assert.throws(() => getMissionBrief(MISSIONS[0], "en", "D1"));
  assert.throws(() => getMissionBrief(MISSIONS[0], "en", "C1", 4));
});

test("beginner support changes the language task while advanced difficulty adds pragmatic demands", () => {
  const a1 = getMissionBrief("roleplay-investor", "en", "A1", 1);
  const c2 = getMissionBrief("roleplay-investor", "en", "C2", 3);
  assert.notEqual(a1.opening, c2.opening);
  assert.ok(a1.opening.length < c2.opening.length);
  assert.match(a1.languageInstructions, /sentence starter|short everyday/i);
  assert.match(c2.languageInstructions, /ambiguous|pragmatic|register/);
  assert.match(c2.languageInstructions, /not simply rarer words|rather than ornamental rare words/);
  const de = getMissionBrief("debate-ai-classroom", "de", "C1", 2);
  assert.match(de.languageInstructions, /German/);
  assert.match(de.languageInstructions, /tatsächlichen Einwand/);
  for (const mission of MISSIONS.filter(item => item.kind === "mystery")) {
    const basic = getMissionBrief(mission.id, "en", "A1");
    const advanced = getMissionBrief(mission.id, "en", "C2");
    assert.ok(basic.evidence.reduce((sum, item) => sum + item.text.length, 0) < advanced.evidence.reduce((sum, item) => sum + item.text.length, 0));
  }
});

test("mystery evidence and hidden interpretations are separate from the public catalog", () => {
  const source = readFileSync(new URL("../lib/missions.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /from\s+["'][^"']*mission-solutions/);
  for (const mission of MISSIONS.filter(item => item.kind === "mystery")) {
    assert.match(mission.brief.en, /fictional/);
    const solution = getMissionSolution(mission.id);
    assert.ok(solution.length > 300);
    assert.notEqual(solution, JSON.stringify(mission));
    assert.equal(mission.evidence.length, new Set(mission.evidence.map(item => item.id)).size);
  }
  assert.match(getMissionSolution("roleplay-investor"), /actual responses|actual objections|responses support/);
  assert.match(getMissionSolution("roleplay-salary"), /agreement|walk-away/);
});

test("daily recommendations are stable, small, and rotate without requiring a repeated scenario", () => {
  const preferences = createMissionPreferences();
  const first = recommendMissions("en", preferences, [], "2026-10-21");
  assert.equal(first.length, 3);
  assert.equal(new Set(first.map(item => item.kind)).size, 3);
  assert.deepEqual(recommendMissions("en", preferences, [], "2026-10-21"), first);
  const signatures = new Set(Array.from({ length: 10 }, (_, index) => recommendMissions("en", preferences, [], `2026-10-${String(10 + index).padStart(2, "0")}`).map(item => item.id).join("|")));
  assert.ok(signatures.size > 3);
  const history = first.map((item, index) => run("en", item.id, 100 + index));
  const next = recommendMissions("en", preferences, history, "2026-10-21");
  assert.ok(next.every(item => !first.some(old => old.id === item.id)));
  assert.equal(new Set(next.map(item => item.kind)).size, 3);
});

test("topics and dismissed missions are respected, including an honest empty state", () => {
  const preferences = { likedTopics: ["volleyball"], dislikedTopics: ["technology", "business"], rejectedTemplateIds: ["mystery-final"] };
  const result = recommendMissions("de", preferences, [], "2026-10-21");
  assert.equal(result.length, 3);
  assert.ok(result.every(item => !preferences.dislikedTopics.includes(item.topic) && !preferences.rejectedTemplateIds.includes(item.id)));
  assert.equal(result[0].topic, "volleyball");
  assert.deepEqual(recommendMissions("en", { ...createMissionPreferences(), dislikedTopics: [...MISSION_TOPICS] }, [], "2026-10-21"), []);
  assert.deepEqual(recommendMissions("en", { ...createMissionPreferences(), rejectedTemplateIds: MISSIONS.map(item => item.id) }, [], "2026-10-21"), []);
  assert.deepEqual(recommendMissions("en", createMissionPreferences(), [], "2026-10-21", 0), []);
});

test("recommendations use only the selected language's history", () => {
  const preferences = createMissionPreferences();
  const baseline = recommendMissions("en", preferences, [], "2026-10-21");
  const german = MISSIONS.map((item, index) => run("de", item.id, 1000 + index));
  assert.deepEqual(recommendMissions("en", preferences, german, "2026-10-21"), baseline);
  const english = baseline.map((item, index) => run("en", item.id, 2000 + index));
  assert.ok(recommendMissions("en", preferences, english, "2026-10-21").every(item => !baseline.some(old => old.id === item.id)));
});

test("malformed preference data is repaired without sharing mutable language defaults", () => {
  const one = createMissionPreferences(), two = createMissionPreferences();
  one.likedTopics.push("volleyball");
  assert.deepEqual(two.likedTopics, []);
  assert.deepEqual(normaliseMissionPreferences(null), two);
  const fixed = normaliseMissionPreferences({ likedTopics: ["technology", "technology", "bad", "volleyball"], dislikedTopics: ["technology", "technology"], rejectedTemplateIds: [MISSIONS[0].id, MISSIONS[0].id, "missing", 2] });
  assert.deepEqual(fixed.likedTopics, ["volleyball"]);
  assert.deepEqual(fixed.dislikedTopics, ["technology"]);
  assert.deepEqual(fixed.rejectedTemplateIds, [MISSIONS[0].id]);
});

test("adaptive tiers offer scaffolding first, stay bounded, and never reassign CEFR", () => {
  for (const current of [1, 2, 3]) {
    assert.equal(adaptMissionDifficulty(current, "same"), current);
    assert.ok(adaptMissionDifficulty(current, "harder") <= 3);
    assert.ok(adaptMissionDifficulty(current, "scaffold") >= 1);
    assert.equal(adaptMissionDifficulty(current, "harder", "difficult"), Math.max(1, current - 1));
  }
  for (const level of levels) assert.equal(initialMissionDifficulty(level, [], "en"), 2);
  const completeOnly = run("en", "roleplay-investor", 3, { status: "complete", completedAt: 3, outcome: feedback("same", "success").outcome });
  assert.equal(initialMissionDifficulty("C1", [completeOnly], "en"), 2);
  const strong = [1, 2].map(time => run("en", "roleplay-investor", time, { status: "complete", completedAt: time, outcome: feedback("harder", "success").outcome, turns: [turn(1, 1, "first"), turn(1, 2, "specific improved reply", "harder")] }));
  assert.equal(initialMissionDifficulty("C1", strong, "en"), 3);
  assert.equal(initialMissionDifficulty("C1", strong, "de"), 2);
  assert.equal(strong[0].level, "C1");
  const difficult = run("en", "roleplay-investor", 5, { status: "complete", completedAt: 5, difficulty: 2, outcome: feedback("scaffold", "not_yet").outcome, turns: [turn(1, 1, "I am stuck", "scaffold")] });
  assert.equal(initialMissionDifficulty("C1", [...strong, difficult], "en"), 1);
});

test("original/retry comparison pairs real attempts from the same round only", () => {
  const original = turn(1, 1, "We need money.");
  const retry = turn(1, 2, "We need €6,000 to test demand with three paying clubs.");
  const evidence = missionRetryEvidence(run("en", "roleplay-investor", 1, { turns: [original, retry, turn(2, 2, "An orphan retry"), turn(3, 1, "An unretired original")] }));
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].original.answer, original.answer);
  assert.equal(evidence[0].retry.answer, retry.answer);
  assert.deepEqual(missionRetryEvidence(run()), []);
});
