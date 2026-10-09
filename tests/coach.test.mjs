import test from "node:test";
import assert from "node:assert/strict";
import { applyCoachOperation, createCoachState, isCoachOperation, isCoachState, LEVELS, makePlan, readCoachCache, rebaseCoachState, reviewSchedule } from "../lib/coach.ts";

const chunk = (language = "en") => ({ id: `${language}-chunk`, expression: language === "en" ? "put into perspective" : "in Betracht ziehen", meaning: "consider in context", example: "It puts things into perspective.", context: "reading", language, level: "C1", mastery: 0, lastReviewed: null, dueAt: 100, updatedAt: 100 });
const session = (language, skill, seconds, id = `${language}-${skill}`) => ({ id, language, skill, seconds, date: "2026-10-08", completedAt: 1000 });

 test("every language and A1–C2 level gets an exact, small daily plan", () => {
  for (const language of ["en", "de"]) for (const level of LEVELS) for (const minutes of [20, 45, 60, 90]) for (let day = 5; day <= 11; day++) {
    const plan = makePlan(language, level, minutes, `2026-10-${String(day).padStart(2, "0")}`);
    assert.equal(plan.length, minutes === 20 ? 2 : 4);
    assert.equal(plan.reduce((sum, activity) => sum + activity.minutes, 0), minutes);
    assert.equal(new Set(plan.map(activity => activity.skill)).size, plan.length);
    assert.ok(plan.every(activity => activity.minutes > 0 && activity.id.startsWith(`${language}:`) && activity.title && activity.instruction));
    assert.ok(plan.filter(activity => activity.skill === "listen" || activity.skill === "read").reduce((sum, activity) => sum + activity.minutes, 0) / minutes >= .69);
    assert.equal(plan.some(activity => activity.skill === "exam"), false);
  }
});

test("short sessions prioritise input and output", () => {
  const plan = makePlan("en", "C2", 20, "2026-10-09", "ielts");
  assert.deepEqual(plan.map(activity => activity.minutes), [15, 5]);
  assert.ok(["listen", "read"].includes(plan[0].skill));
  assert.ok(["speak", "write"].includes(plan[1].skill));
});

test("weekly rotation includes chunks, grammar, pronunciation and both output skills", () => {
  const plans = Array.from({ length: 7 }, (_, index) => makePlan("en", "C1", 60, `2026-10-${String(5 + index).padStart(2, "0")}`));
  assert.deepEqual(new Set(plans.flatMap(plan => plan.map(item => item.skill))), new Set(["listen", "read", "speak", "write", "chunks", "grammar", "pronunciation"]));
  assert.notDeepEqual(plans[0].map(item => item.skill), plans[1].map(item => item.skill));
  assert.ok(makePlan("en", "C1", 60, "2026-10-10", "ielts").some(activity => activity.skill === "exam"));
  assert.ok(makePlan("de", "C2", 60, "2026-10-10", "School").some(activity => activity.skill === "exam"));
});

test("activity gaps adapt only the selected language", () => {
  const regular = makePlan("en", "C1", 60, "2026-10-09");
  const german = [session("de", "listen", 7200), session("de", "speak", 7200)];
  assert.deepEqual(makePlan("en", "C1", 60, "2026-10-09", "near-native", german), regular);
  const english = [session("en", "listen", 7200), session("en", "speak", 7200)];
  const adaptive = makePlan("en", "C1", 60, "2026-10-09", "near-native", english);
  assert.equal(adaptive[0].skill, "read");
  assert.equal(adaptive[2].skill, "write");
  assert.equal(adaptive.reduce((sum, item) => sum + item.minutes, 0), 60);
});

test("completing today's activities does not reshuffle the daily plan", () => {
  const prior = [session("en", "speak", 25 * 60)];
  const before = makePlan("en", "C1", 60, "2026-10-09", "near-native", prior);
  const today = { ...session("en", "write", 12 * 60), date: "2026-10-09" };
  assert.deepEqual(makePlan("en", "C1", 60, "2026-10-09", "near-native", [...prior, today]), before);
});

test("C1/C2 prompts cover nuance and precision rather than only harder words", () => {
  const advanced = makePlan("en", "C2", 60, "2026-10-09");
  assert.match(advanced.find(item => item.skill === "listen").instruction, /implied meaning/);
  assert.match(advanced.find(item => item.skill === "speak").instruction, /counterargument/);
  const de = makePlan("de", "C1", 60, "2026-10-08");
  assert.match(de.find(item => item.skill === "write").instruction, /präzise/);
  assert.notDeepEqual(advanced, makePlan("en", "A1", 60, "2026-10-09"));
});

test("legacy levels become independent coach settings without losing defaults", () => {
  const state = createCoachState({ en: "C1", de: "A2" });
  assert.equal(state.preferences.en.currentLevel, "C1");
  assert.equal(state.preferences.de.currentLevel, "A2");
  const changed = applyCoachOperation(state, { id: "pref", createdAt: 10, kind: "preferences", language: "en", patch: { dailyMinutes: 20, targetLevel: "C2" } });
  assert.equal(changed.preferences.en.dailyMinutes, 20);
  assert.equal(changed.preferences.de.dailyMinutes, 60);
  assert.equal(state.preferences.en.dailyMinutes, 60);
});

test("chunk review follows spaced intervals and replay does not increase mastery", () => {
  let state = { ...createCoachState(), chunks: [chunk()] };
  const review = { id: "review", createdAt: 200, kind: "review", chunkId: "en-chunk", rating: "okay" };
  state = applyCoachOperation(state, review);
  assert.equal(state.chunks[0].mastery, 1);
  assert.equal(state.chunks[0].dueAt, 200 + 86400000);
  assert.deepEqual(applyCoachOperation(state, review), state);
  const difficult = reviewSchedule(state.chunks[0], "difficult", 300);
  assert.equal(difficult.mastery, 0);
  assert.equal(difficult.dueAt, 300 + 600000);
  assert.equal(reviewSchedule({ ...chunk(), mastery: 4 }, "easy", 400).dueAt, 400 + 30 * 86400000);
});

test("enriching a saved chunk preserves its review history", () => {
  const previous = { ...chunk(), mastery: 4, lastReviewed: 200, dueAt: 300, updatedAt: 200 };
  const state = { ...createCoachState(), chunks: [previous] };
  const updated = applyCoachOperation(state, { id: "chunk-op", createdAt: 400, kind: "chunk", chunk: { ...chunk(), meaning: "a richer meaning", updatedAt: 400 } });
  assert.equal(updated.chunks[0].meaning, "a richer meaning");
  assert.equal(updated.chunks[0].mastery, 4);
  assert.equal(updated.chunks[0].lastReviewed, 200);
});

test("rebase preserves server history and independent offline changes", () => {
  const server = { ...createCoachState(), chunks: [chunk("de")], sessions: [session("de", "write", 900)], drafts: { "de-writing": "Mein Text" } };
  const pending = [
    { id: "chunk-op", createdAt: 100, kind: "chunk", chunk: chunk() },
    { id: "session-op", createdAt: 1000, kind: "session", session: session("en", "speak", 120) },
    { id: "draft-op", createdAt: 1001, kind: "draft", key: "en-writing", value: "My text" },
  ];
  const merged = rebaseCoachState(server, pending);
  assert.equal(merged.chunks.length, 2);
  assert.equal(merged.sessions.length, 2);
  assert.deepEqual(merged.drafts, { "de-writing": "Mein Text", "en-writing": "My text" });
  assert.deepEqual(rebaseCoachState(server, []), server);
  assert.equal(rebaseCoachState(merged, pending).sessions.length, 2);
});

test("atomic browser cache round trip retains unsent operations", () => {
  const state = createCoachState();
  const pending = [{ id: "theme-op", createdAt: 100, kind: "theme", theme: "dark" }];
  const cached = { state: rebaseCoachState(state, pending), pending };
  assert.deepEqual(readCoachCache(JSON.stringify(cached)), cached);
  assert.deepEqual(readCoachCache(JSON.stringify(state)), { state, pending: [] });
  assert.equal(readCoachCache("not JSON"), null);
  assert.equal(readCoachCache('{"state":{}}'), null);
});

test("state and mutation validation rejects bad levels, languages and excessive text", () => {
  assert.ok(isCoachState(createCoachState()));
  assert.equal(isCoachState({ ...createCoachState(), preferences: { en: {}, de: {} } }), false);
  assert.ok(isCoachOperation({ id: "valid", createdAt: 100, kind: "preferences", language: "de", patch: { currentLevel: "A1" } }));
  assert.equal(isCoachOperation({ id: "invalid", createdAt: 100, kind: "preferences", language: "fr", patch: { currentLevel: "A1" } }), false);
  assert.equal(isCoachOperation({ id: "invalid", createdAt: 100, kind: "draft", key: "x", value: "x".repeat(40001) }), false);
  assert.equal(isCoachOperation({ id: "invalid", createdAt: 100, kind: "draft", key: "__proto__", value: "x" }), false);
  assert.throws(() => makePlan("en", "C1", 60, "invalid"));
  assert.throws(() => makePlan("en", "C1", 5, "2026-10-09"));
});
