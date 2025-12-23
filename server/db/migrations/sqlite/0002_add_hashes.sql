ALTER TABLE `expenses` ADD `image_hash` text;
ALTER TABLE `expenses` ADD `receipt_hash` text;
CREATE INDEX `idx_image_hash` ON `expenses` (`image_hash`);
CREATE INDEX `idx_receipt_hash` ON `expenses` (`receipt_hash`);
