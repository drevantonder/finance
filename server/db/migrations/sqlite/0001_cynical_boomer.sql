CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`image_key` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`captured_at` integer NOT NULL,
	`total` real,
	`tax` real,
	`merchant` text,
	`date` text,
	`items` text,
	`category` text,
	`notes` text,
	`raw_extraction` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
