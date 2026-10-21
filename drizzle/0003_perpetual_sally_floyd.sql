CREATE TABLE IF NOT EXISTS `mission_preferences` (
	`user_id` text NOT NULL,
	`language` text NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `language`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `mission_requests` (
	`user_id` text NOT NULL,
	`request_id` text NOT NULL,
	`run_id` text NOT NULL,
	`kind` text NOT NULL,
	`fingerprint` text NOT NULL,
	`status` text NOT NULL,
	`result` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `request_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `mission_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`language` text NOT NULL,
	`template_id` text NOT NULL,
	`state` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`locked_by` text,
	`locked_until` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `mission_runs_user_updated` ON `mission_runs` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `mission_usage` (
	`request_key` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`kind` text NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `mission_usage_user_day` ON `mission_usage` (`user_id`,`day`,`kind`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `mission_usage_created` ON `mission_usage` (`created_at`);