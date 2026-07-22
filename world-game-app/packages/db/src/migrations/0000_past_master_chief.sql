CREATE TABLE `scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_name` text NOT NULL,
	`winnings` integer NOT NULL,
	`difficulty` text NOT NULL,
	`questions_answered` integer NOT NULL,
	`correct_answers` integer NOT NULL,
	`won` integer NOT NULL,
	`created_at` integer NOT NULL
);
