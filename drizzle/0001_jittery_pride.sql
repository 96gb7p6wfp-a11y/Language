CREATE TABLE `writing_drafts` (
	`task_id` text PRIMARY KEY NOT NULL,
	`draft` text DEFAULT '' NOT NULL,
	`checklist` text DEFAULT '[]' NOT NULL,
	`elapsed_seconds` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
