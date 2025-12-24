CREATE TABLE `inbox_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`inbox_item_id` text NOT NULL,
	`filename` text,
	`mime_type` text NOT NULL,
	`storage_key` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`inbox_item_id`) REFERENCES `inbox_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `inbox_items` (
	`id` text PRIMARY KEY NOT NULL,
	`from_address` text NOT NULL,
	`to_address` text,
	`envelope_from` text,
	`subject` text,
	`text_body` text,
	`html_body` text,
	`received_at` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`verified` integer DEFAULT false NOT NULL,
	`error_message` text,
	`expense_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON UPDATE no action ON DELETE no action
);
