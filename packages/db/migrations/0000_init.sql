CREATE TABLE `encrypted_secrets` (
	`token_type` text PRIMARY KEY NOT NULL,
	`iv` blob NOT NULL,
	`ciphertext` blob NOT NULL,
	`key_version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invoice_mappings` (
	`clockify_invoice_id` text PRIMARY KEY NOT NULL,
	`rf_invoice_id` text NOT NULL,
	`rf_request_id` text,
	`payment_link` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invoice_runs` (
	`clockify_invoice_id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`rf_attachment_hash` text,
	`rf_invoice_id` text,
	`rf_request_id` text,
	`payment_link` text,
	`error_message` text,
	`updated_at` text NOT NULL
);
