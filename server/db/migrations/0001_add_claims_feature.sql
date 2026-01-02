CREATE TABLE `claims` (
	`id` text PRIMARY KEY NOT NULL,
	`financial_year` text NOT NULL,
	`claim_date` text NOT NULL,
	`total_amount` real NOT NULL,
	`mfb_amount` real NOT NULL,
	`mmr_amount` real NOT NULL,
	`gst_amount` real NOT NULL,
	`expense_count` integer NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `expense_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`expense_id` text NOT NULL,
	`claim_id` text,
	`ptc_category` text,
	`mfb_percent` integer DEFAULT 100 NOT NULL,
	`mfb_amount` real,
	`mmr_amount` real,
	`gst_amount` real,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`claimed_at` integer,
	FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`claim_id`) REFERENCES `claims`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `categories` ADD `mfb_category` text;--> statement-breakpoint
ALTER TABLE `categories` ADD `default_mfb_percent` integer DEFAULT 100;