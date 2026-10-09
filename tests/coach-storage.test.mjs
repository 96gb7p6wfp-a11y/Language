import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { coachOperationStatements, coachSchemaStatements } from "../lib/coach-storage.ts";

function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("../drizzle/0000_fair_mandrill.sql", import.meta.url), "utf8"));
  db.exec(readFileSync(new URL("../drizzle/0001_jittery_pride.sql", import.meta.url), "utf8"));
  for (const sql of coachSchemaStatements) db.exec(sql);
  return db;
}
function apply(db, ...operations) {
  db.exec("BEGIN");
  try {
    for (const operation of operations) for (const statement of coachOperationStatements(operation)) db.prepare(statement.sql).run(...statement.bindings);
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}
const chunk = { id: "chunk-one", expression: "face the consequences", meaning: "accept a result", example: "We will face the consequences.", context: "reading", language: "en", level: "C1", mastery: 0, lastReviewed: null, dueAt: 100, updatedAt: 100 };

test("additive migration and repeated fallback preserve existing progress and writing", () => {
  const db = setup();
  db.prepare("INSERT INTO learner_settings VALUES (?,?)").run("de", "C2");
  db.prepare("INSERT INTO exercise_progress VALUES (?,?,?,?,?,?,?)").run("en-C1-g0", 4, 3, 2, 1, 900, 100);
  db.prepare("INSERT INTO writing_drafts VALUES (?,?,?,?,?)").run("ielts-task", "Existing essay", "[true]", 500, 100);
  db.exec(readFileSync(new URL("../drizzle/0002_coach_storage.sql", import.meta.url), "utf8"));
  for (const sql of coachSchemaStatements) db.exec(sql);
  assert.equal(db.prepare("SELECT level FROM learner_settings WHERE language='de'").get().level, "C2");
  assert.equal(db.prepare("SELECT attempts FROM exercise_progress").get().attempts, 4);
  assert.equal(db.prepare("SELECT draft FROM writing_drafts").get().draft, "Existing essay");
  db.close();
});

test("retrying a session operation records it exactly once", () => {
  const db = setup();
  const operation = { id: "session-op", createdAt: 100, kind: "session", session: { id: "session-one", language: "de", skill: "speak", seconds: 300, date: "2026-10-09", completedAt: 100, rating: "okay" } };
  apply(db, operation);
  apply(db, operation);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM coach_sessions").get().count, 1);
  assert.equal(db.prepare("SELECT SUM(seconds) AS seconds FROM coach_sessions").get().seconds, 300);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM coach_operations").get().count, 1);
  db.close();
});

test("chunk reviews are spaced and idempotent on SQLite", () => {
  const db = setup();
  apply(db, { id: "save-chunk", createdAt: 100, kind: "chunk", chunk });
  const review = { id: "review-one", createdAt: 200, kind: "review", chunkId: chunk.id, rating: "easy" };
  apply(db, review, review);
  const result = db.prepare("SELECT * FROM coach_chunks").get();
  assert.equal(result.mastery, 2);
  assert.equal(result.last_reviewed, 200);
  assert.equal(result.due_at, 200 + 3 * 86400000);
  apply(db, { id: "review-two", createdAt: 300, kind: "review", chunkId: chunk.id, rating: "difficult" });
  assert.equal(db.prepare("SELECT mastery,due_at FROM coach_chunks").get().mastery, 1);
  assert.equal(db.prepare("SELECT mastery,due_at FROM coach_chunks").get().due_at, 600300);
  db.close();
});

test("new chunk details retain spaced-review state", () => {
  const db = setup();
  apply(db, { id: "save-chunk", createdAt: 100, kind: "chunk", chunk }, { id: "review-one", createdAt: 200, kind: "review", chunkId: chunk.id, rating: "easy" });
  apply(db, { id: "save-details", createdAt: 300, kind: "chunk", chunk: { ...chunk, meaning: "deal with the result", updatedAt: 300 } });
  const result = db.prepare("SELECT * FROM coach_chunks").get();
  assert.equal(result.meaning, "deal with the result");
  assert.equal(result.mastery, 2);
  assert.equal(result.last_reviewed, 200);
  db.close();
});

test("preference writes are per field, per language, and retain legacy current levels", () => {
  const db = setup();
  const english = { id: "en-prefs", createdAt: 200, kind: "preferences", language: "en", patch: { goal: "near-native", currentLevel: "C1", targetLevel: "C2", dailyMinutes: 60 } };
  apply(db, english, { id: "de-prefs", createdAt: 300, kind: "preferences", language: "de", patch: { currentLevel: "A1", dailyMinutes: 20 } });
  apply(db, english);
  assert.equal(db.prepare("SELECT level FROM learner_settings WHERE language='en'").get().level, "C1");
  assert.equal(db.prepare("SELECT level FROM learner_settings WHERE language='de'").get().level, "A1");
  assert.equal(JSON.parse(db.prepare("SELECT value FROM coach_settings WHERE key='de.dailyMinutes'").get().value), 20);
  assert.equal(JSON.parse(db.prepare("SELECT value FROM coach_settings WHERE key='en.dailyMinutes'").get().value), 60);
  // An older multi-field operation may add another preference, but must not regress the level.
  apply(db, { id: "old-offline-prefs", createdAt: 100, kind: "preferences", language: "en", patch: { currentLevel: "B1", dailyMinutes: 45, goal: "School" } });
  assert.equal(db.prepare("SELECT level FROM learner_settings WHERE language='en'").get().level, "C1");
  apply(db, { id: "later-level", createdAt: 400, kind: "preferences", language: "en", patch: { currentLevel: "C2" } });
  apply(db, { id: "old-new-field", createdAt: 350, kind: "preferences", language: "en", patch: { currentLevel: "B2", targetLevel: "C2" } });
  assert.equal(db.prepare("SELECT level FROM learner_settings WHERE language='en'").get().level, "C2");
  db.close();
});

test("out-of-order and duplicate draft operations cannot overwrite newer text", () => {
  const db = setup();
  const newer = { id: "new-draft", createdAt: 300, kind: "draft", key: "en-write", value: "My completed argument." };
  const older = { id: "old-draft", createdAt: 200, kind: "draft", key: "en-write", value: "My" };
  apply(db, newer, older, newer);
  apply(db, { id: "de-draft", createdAt: 400, kind: "draft", key: "de-write", value: "Meine Argumentation." });
  assert.equal(db.prepare("SELECT value FROM coach_drafts WHERE key='en-write'").get().value, newer.value);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM coach_drafts").get().count, 2);
  db.close();
});

test("theme and onboarding persist without overwriting other settings", () => {
  const db = setup();
  apply(db, { id: "theme", createdAt: 100, kind: "theme", theme: "dark" }, { id: "onboard", createdAt: 200, kind: "onboarded" });
  assert.equal(JSON.parse(db.prepare("SELECT value FROM coach_settings WHERE key='theme'").get().value), "dark");
  assert.equal(JSON.parse(db.prepare("SELECT value FROM coach_settings WHERE key='onboarded'").get().value), true);
  db.close();
});
