ALTER TABLE `expenses` ADD `currency` text DEFAULT 'AUD' NOT NULL;--> statement-breakpoint
ALTER TABLE `expenses` ADD `original_total` real;--> statement-breakpoint
ALTER TABLE `expenses` ADD `exchange_rate` real;