CREATE TABLE `todos` (
	`id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`is_complete` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
