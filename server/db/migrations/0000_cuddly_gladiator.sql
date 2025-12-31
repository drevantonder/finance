CREATE TABLE `sessions` (
	`id` text PRIMARY KEY DEFAULT 'default' NOT NULL,
	`config` text NOT NULL,
	`updated_at` integer NOT NULL
);
