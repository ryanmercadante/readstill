CREATE TABLE `positions` (
	`reading_id` text PRIMARY KEY NOT NULL,
	`chapter_id` text NOT NULL,
	`block_id` text NOT NULL,
	`word_index` integer NOT NULL,
	`finished` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`reading_id`) REFERENCES `readings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `readings` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`added_at` integer NOT NULL,
	`document` text NOT NULL
);
