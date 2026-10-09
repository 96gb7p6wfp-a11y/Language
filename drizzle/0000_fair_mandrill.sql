CREATE TABLE `exercise_progress` (
	`exercise_id` text PRIMARY KEY NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`correct_count` integer DEFAULT 0 NOT NULL,
	`streak` integer DEFAULT 0 NOT NULL,
	`last_correct` integer DEFAULT 0 NOT NULL,
	`due_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `learner_settings` (
	`language` text PRIMARY KEY NOT NULL,
	`level` text DEFAULT 'B1' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `practice_days` (
	`language` text NOT NULL,
	`date` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`correct_count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`language`, `date`)
);
--> statement-breakpoint
CREATE TABLE `recorded_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`exercise_id` text NOT NULL,
	`correct` integer NOT NULL,
	`created_at` integer NOT NULL
);
