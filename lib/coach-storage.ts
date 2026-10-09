import type { Chunk, CoachOperation } from "./coach";

export type CoachStatement = { sql: string; bindings: (string | number | null)[] };
function statement(sql: string) { return { bind: (...bindings: (string | number | null)[]): CoachStatement => ({ sql, bindings }) }; }

export const coachSchemaStatements = [
  "CREATE TABLE IF NOT EXISTS coach_settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS coach_chunks (id TEXT PRIMARY KEY NOT NULL, expression TEXT NOT NULL, meaning TEXT NOT NULL, example TEXT NOT NULL, context TEXT NOT NULL, language TEXT NOT NULL, level TEXT NOT NULL, mastery INTEGER NOT NULL DEFAULT 0, last_reviewed INTEGER, due_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS coach_sessions (id TEXT PRIMARY KEY NOT NULL, language TEXT NOT NULL, skill TEXT NOT NULL, seconds INTEGER NOT NULL, date TEXT NOT NULL, completed_at INTEGER NOT NULL, rating TEXT, activity_id TEXT)",
  "CREATE TABLE IF NOT EXISTS coach_drafts (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS coach_operations (id TEXT PRIMARY KEY NOT NULL, created_at INTEGER NOT NULL)",
  "CREATE INDEX IF NOT EXISTS coach_chunks_language_due ON coach_chunks (language, due_at)",
  "CREATE INDEX IF NOT EXISTS coach_sessions_language_date ON coach_sessions (language, date)",
];


function settingStatements(operation: CoachOperation, entries: [string, unknown][]): CoachStatement[] {
  const values = entries.map(() => "(?,?,?)").join(",");
  const bindings = entries.flatMap(([key, value]) => [key, JSON.stringify(value), operation.createdAt]);
  return [statement(`INSERT INTO coach_settings (key,value,updated_at) SELECT column1,column2,column3 FROM (VALUES ${values}) WHERE changes()=1 ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at WHERE coach_settings.updated_at<excluded.updated_at`).bind(...bindings)];
}

export function coachMutationStatements(operation: CoachOperation): CoachStatement[] {
  const now = operation.createdAt;
  switch (operation.kind) {
    case "preferences": {
      const statements = settingStatements(operation, Object.entries(operation.patch).map(([key, value]) => [`${operation.language}.${key}`, value]));
      if (operation.patch.currentLevel) statements.push(statement("INSERT INTO learner_settings (language,level) SELECT ?,json_extract(value,'$') FROM coach_settings WHERE key=? AND changes()>0 ON CONFLICT(language) DO UPDATE SET level=excluded.level").bind(operation.language, `${operation.language}.currentLevel`));
      return statements;
    }
    case "chunk": {
      const chunk: Chunk = operation.chunk;
      return [statement("INSERT INTO coach_chunks (id,expression,meaning,example,context,language,level,mastery,last_reviewed,due_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE changes()=1 ON CONFLICT(id) DO UPDATE SET expression=excluded.expression,meaning=excluded.meaning,example=excluded.example,context=excluded.context,level=excluded.level,updated_at=excluded.updated_at WHERE coach_chunks.updated_at<excluded.updated_at").bind(chunk.id, chunk.expression, chunk.meaning, chunk.example, chunk.context, chunk.language, chunk.level, chunk.mastery, chunk.lastReviewed, chunk.dueAt, now)];
    }
    case "review": {
      const mastery = operation.rating === "difficult" ? "MAX(0,mastery-1)" : `MIN(5,mastery+${operation.rating === "easy" ? 2 : 1})`;
      const due = operation.rating === "difficult" ? "?+600000" : `?+CASE ${mastery} WHEN 0 THEN 0 WHEN 1 THEN 86400000 WHEN 2 THEN 259200000 WHEN 3 THEN 604800000 WHEN 4 THEN 1209600000 ELSE 2592000000 END`;
      return [statement(`UPDATE coach_chunks SET mastery=${mastery},last_reviewed=?,due_at=${due},updated_at=? WHERE id=? AND updated_at<? AND changes()=1`).bind(now, now, now, operation.chunkId, now)];
    }
    case "session": {
      const session = operation.session;
      return [statement("INSERT INTO coach_sessions (id,language,skill,seconds,date,completed_at,rating,activity_id) SELECT ?,?,?,?,?,?,?,? WHERE changes()=1 ON CONFLICT(id) DO NOTHING").bind(session.id, session.language, session.skill, session.seconds, session.date, session.completedAt, session.rating ?? null, session.activityId ?? null)];
    }
    case "draft": return [statement("INSERT INTO coach_drafts (key,value,updated_at) SELECT ?,?,? WHERE changes()=1 ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at WHERE coach_drafts.updated_at<excluded.updated_at").bind(operation.key, operation.value, now)];
    case "onboarded": return settingStatements(operation, [["onboarded", true]]);
    case "theme": return settingStatements(operation, [["theme", operation.theme]]);
  }
}

export function coachOperationStatements(operation: CoachOperation): CoachStatement[] {
  return [statement("INSERT INTO coach_operations (id,created_at) VALUES (?,?) ON CONFLICT(id) DO NOTHING").bind(operation.id, operation.createdAt), ...coachMutationStatements(operation)];
}
