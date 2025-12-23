-- Migration to remove category and notes from expenses
-- SQLite doesn't support DROP COLUMN, so we must recreate the table

PRAGMA foreign_keys=OFF;

CREATE TABLE `expenses_new` (
	`id` text PRIMARY KEY NOT NULL,
	`image_key` text NOT NULL,
	`image_hash` text,
	`receipt_hash` text,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`captured_at` integer NOT NULL,
	`total` real,
	`tax` real,
	`merchant` text,
	`date` text,
	`items` text,
	`raw_extraction` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

INSERT INTO `expenses_new` (id, image_key, image_hash, receipt_hash, schema_version, status, captured_at, total, tax, merchant, date, items, raw_extraction, created_at, updated_at)
SELECT id, image_key, image_hash, receipt_hash, schema_version, status, captured_at, total, tax, merchant, date, items, raw_extraction, created_at, updated_at FROM `expenses`;

DROP TABLE `expenses`;

ALTER TABLE `expenses_new` RENAME TO `expenses`;

PRAGMA foreign_keys=ON;
