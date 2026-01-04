CREATE TABLE `activity_log` (
	`id` text PRIMARY KEY NOT NULL,
	`correlation_id` text,
	`type` text NOT NULL,
	`stage` text,
	`level` text NOT NULL,
	`message` text NOT NULL,
	`duration_ms` integer,
	`metadata` text,
	`expense_id` text,
	`source` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON UPDATE no action ON DELETE no action
);
