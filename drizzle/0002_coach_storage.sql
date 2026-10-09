CREATE TABLE IF NOT EXISTS coach_settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS coach_chunks (id TEXT PRIMARY KEY NOT NULL, expression TEXT NOT NULL, meaning TEXT NOT NULL, example TEXT NOT NULL, context TEXT NOT NULL, language TEXT NOT NULL, level TEXT NOT NULL, mastery INTEGER NOT NULL DEFAULT 0, last_reviewed INTEGER, due_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS coach_sessions (id TEXT PRIMARY KEY NOT NULL, language TEXT NOT NULL, skill TEXT NOT NULL, seconds INTEGER NOT NULL, date TEXT NOT NULL, completed_at INTEGER NOT NULL, rating TEXT, activity_id TEXT);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS coach_drafts (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS coach_operations (id TEXT PRIMARY KEY NOT NULL, created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS coach_chunks_language_due ON coach_chunks (language, due_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS coach_sessions_language_date ON coach_sessions (language, date);
