CREATE TABLE `client_mappings` (
	`clockify_client_id` text PRIMARY KEY NOT NULL,
	`rf_client_id` text NOT NULL,
	`rf_client_label` text,
	`clockify_client_name` text,
	`updated_at` text NOT NULL
);
