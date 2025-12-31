CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`color` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `logs` (
	`id` text PRIMARY KEY NOT NULL,
	`level` text NOT NULL,
	`message` text NOT NULL,
	`details` text,
	`source` text NOT NULL,
	`ip` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `expenses` ADD `image_hash` text;--> statement-breakpoint
ALTER TABLE `expenses` ADD `receipt_hash` text;--> statement-breakpoint
ALTER TABLE `expenses` ADD `schema_version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `expenses` DROP COLUMN `category`;--> statement-breakpoint
ALTER TABLE `expenses` DROP COLUMN `notes`;