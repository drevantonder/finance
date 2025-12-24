CREATE TABLE `authorized_users` (
	`email` text PRIMARY KEY NOT NULL,
	`name` text,
	`picture_url` text,
	`last_login_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
