import { env } from "cloudflare:workers";
import { coachOperationStatements, coachSchemaStatements } from "../lib/coach-storage";
import { createCoachState, isCoachState, LEVELS } from "../lib/coach";
import type { CoachOperation, CoachState, LearningSession } from "../lib/coach";
import type { Language, Level } from "../lib/curriculum";

function database() { if (!env.DB) throw new Error("Coach database unavailable"); return env.DB as D1Database; }

/** Additive fallback for installations whose deployment predates migration 0002. */
let schemaSetup: Promise<void> | undefined;
async function ensureCoachTables() {
  schemaSetup ??= database().batch(coachSchemaStatements.map(sql => database().prepare(sql))).then(() => {}).catch(error => { schemaSetup = undefined; throw error; });
  await schemaSetup;
}

export async function readCoach(): Promise<CoachState> {
  await ensureCoachTables();
  const db = database();
  const [settings, legacy, chunks, sessions, drafts] = await Promise.all([
    db.prepare("SELECT key,value FROM coach_settings").all<{ key: string; value: string }>(),
    db.prepare("SELECT language,level FROM learner_settings").all<{ language: Language; level: Level }>(),
    db.prepare("SELECT * FROM coach_chunks ORDER BY updated_at DESC").all<{ id: string; expression: string; meaning: string; example: string; context: string; language: Language; level: Level; mastery: number; last_reviewed: number | null; due_at: number; updated_at: number }>(),
    db.prepare("SELECT * FROM coach_sessions ORDER BY completed_at DESC").all<{ id: string; language: Language; skill: LearningSession["skill"]; seconds: number; date: string; completed_at: number; rating: LearningSession["rating"] | null; activity_id: string | null }>(),
    db.prepare("SELECT key,value FROM coach_drafts").all<{ key: string; value: string }>(),
  ]);
  const levels = Object.fromEntries(legacy.results.filter(setting => (setting.language === "en" || setting.language === "de") && LEVELS.includes(setting.level)).map(setting => [setting.language, setting.level]));
  const state = createCoachState(levels);
  for (const setting of settings.results) {
    const value: unknown = JSON.parse(setting.value);
    if (setting.key === "theme" && (value === "system" || value === "light" || value === "dark")) state.theme = value;
    else if (setting.key === "onboarded" && typeof value === "boolean") state.onboarded = value;
    else {
      const [language, field] = setting.key.split(".");
      if ((language === "en" || language === "de") && ["goal", "targetLevel", "dailyMinutes", "currentLevel"].includes(field)) Object.assign(state.preferences[language], { [field]: value });
    }
  }
  state.chunks = chunks.results.map(row => ({ id: row.id, expression: row.expression, meaning: row.meaning, example: row.example, context: row.context, language: row.language, level: row.level, mastery: row.mastery, lastReviewed: row.last_reviewed, dueAt: row.due_at, updatedAt: row.updated_at }));
  state.sessions = sessions.results.map(row => ({ id: row.id, language: row.language, skill: row.skill, seconds: row.seconds, date: row.date, completedAt: row.completed_at, ...(row.rating ? { rating: row.rating } : {}), ...(row.activity_id ? { activityId: row.activity_id } : {}) }));
  state.drafts = Object.fromEntries(drafts.results.map(row => [row.key, row.value]));
  if (!isCoachState(state)) throw new Error("Stored coach data is invalid");
  return state;
}


export async function applyCoachOperations(operations: CoachOperation[]): Promise<{ state: CoachState; acknowledged: string[] }> {
  await ensureCoachTables();
  const db = database();
  // D1 batch is transactional. Each mutation observes changes() from its ledger insert.
  // Replayed IDs therefore skip both the setting and its associated side effect.
  const statements = operations.flatMap(coachOperationStatements).map(statement => db.prepare(statement.sql).bind(...statement.bindings));
  if (statements.length) await db.batch(statements);
  return { state: await readCoach(), acknowledged: operations.map(operation => operation.id) };
}
